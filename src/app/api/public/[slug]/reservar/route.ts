import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { notificationService } from '@/lib/notifications';
import { whatsappService } from "@/lib/whatsapp";
import { NotificationService } from '@/lib/notifications/notificationService';
import crypto from 'crypto';
import { SignJWT } from 'jose';
import { planLimitValidator } from '@/lib/services/planLimitValidator';
import { checkDemoRestriction } from '@/lib/demo-protection';
import { sendWhatsAppMessage } from '@/lib/whatsapp-client';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export async function POST(
    req: Request,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const { slug } = await params;
        const body = await req.json();
        
        // Mapear campos del frontend (BookingClient / BookingModal) a los nombres internos
        const clienteNombre = body.clienteNombre || body.nombreCliente || 'Cliente';
        const clienteTelefono = body.clienteTelefono || body.telefonoCliente;
        const horaInicio = body.horaInicio;
        const fecha = body.fecha;
        const serviceId = body.serviceId || body.canchaId;
        const staffId = body.staffId;
        const comentarios = body.comentarios || '';
        const duracionBody = body.duracion; // puede ser en horas (1, 1.5) o indefinido
        const couponCode = body.couponCode?.trim().toUpperCase() || null;
        const rewardId = body.rewardId || null;

        if (!clienteTelefono || !horaInicio || !fecha || !serviceId) {
            return NextResponse.json({ error: 'Faltan datos obligatorios' }, { status: 400 });
        }

        // 1. Buscar el negocio y el servicio
        const negocio = await (prisma as any).negocio.findUnique({
            where: { slug },
            include: {
                Service: {
                    where: { id: serviceId }
                }
            }
        });

        if (!negocio || negocio.Service.length === 0) {
            return NextResponse.json({ error: 'Negocio o servicio no encontrado' }, { status: 404 });
        }

        const service = negocio.Service[0];
        
        // Calcular duración base del servicio (en minutos)
        let totalDuracionMinutos = service.duracion || 60; // fallback 1h

        // Sumar duración de servicios extra si los hay
        if (Array.isArray(body.extraServices)) {
            body.extraServices.forEach((s: any) => {
                const extraDur = Number(s.duracion) || 0;
                // Si la duración extra viene en horas (ej: 0.5), convertir a minutos
                totalDuracionMinutos += extraDur < 10 ? extraDur * 60 : extraDur;
            });
        }
        
        const durEnHoras = totalDuracionMinutos / 60;
        
        const [h, m] = horaInicio.split(':').map(Number);
        const totalMinFin = h * 60 + m + totalDuracionMinutos;
        const horaFin = `${Math.floor(totalMinFin / 60).toString().padStart(2, '0')}:${(totalMinFin % 60).toString().padStart(2, '0')}`;

        // PROTECCIÓN MODO DEMO
        const demoCheck = await checkDemoRestriction(negocio.id);
        if (demoCheck.restricted) {
            return demoCheck.response;
        }

        // VALIDAR LÍMITES DEL PLAN
        const planValidation = await planLimitValidator.canCreateReservation(negocio.id);
        if (!planValidation.allowed) {
            return NextResponse.json({ error: planValidation.message }, { status: 403 });
        }

        const reservationReceived = new Date(fecha);
        if (isNaN(reservationReceived.getTime())) {
            return NextResponse.json({ error: 'Fecha de reserva inválida' }, { status: 400 });
        }

        const reservationDate = new Date(Date.UTC(
            reservationReceived.getUTCFullYear(),
            reservationReceived.getUTCMonth(),
            reservationReceived.getUTCDate(),
            0, 0, 0, 0
        ));

        let referralIncentive = "";

        // 2. Transacción para crear reserva
        const result = await prisma.$transaction(async (tx: any) => {
            // Validar que NO exista ninguna reserva que se cruce
            const reservaExistente = await tx.Appointment.findFirst({
                where: {
                    serviceId: serviceId,
                    fecha: reservationDate,
                    estado: { notIn: ['rejected', 'RECHAZADA', 'cancelled', 'CANCELADA', 'expired', 'EXPIRADA'] },
                    AND: [
                        { horaInicio: { lt: horaFin } },
                        { horaFin: { gt: horaInicio } }
                    ]
                }
            });

            if (reservaExistente) {
                return { error: 'Este horario ya está reservado o pendiente de confirmación.' };
            }

            // Crear cliente
            const cliente = await tx.Cliente.upsert({
                where: {
                    telefono_negocioId: {
                        telefono: clienteTelefono,
                        negocioId: negocio.id
                    }
                },
                update: { 
                    nombre: clienteNombre,
                    updatedAt: new Date()
                },
                create: {
                    id: crypto.randomUUID(),
                    nombre: clienteNombre,
                    telefono: clienteTelefono,
                    negocioId: negocio.id,
                    updatedAt: new Date()
                }
            });

            // 👤 Crear o buscar el Usuario para referidos y sesiones
            let usuario = await tx.usuario.findFirst({
                where: {
                    OR: [
                        { phone: clienteTelefono },
                        { phone: clienteTelefono.replace(/\D/g, '') }
                    ]
                }
            });

            if (!usuario) {
                usuario = await tx.usuario.create({
                    data: {
                        id: crypto.randomUUID(),
                        nombre: clienteNombre,
                        phone: clienteTelefono.replace(/\D/g, '') || clienteTelefono,
                        role: 'USER',
                        negocioId: negocio.id,
                        updatedAt: new Date()
                    }
                });
            }

            // Configuración de Expiración
            const timeoutConfig = await tx.Configuracion.findUnique({
                where: {
                    clave_negocioId: {
                        clave: 'BOOKING_TIMEOUT',
                        negocioId: negocio.id
                    }
                }
            });
            const timeoutMinutes = timeoutConfig ? parseInt(timeoutConfig.valor) : 10;
            const expiresAt = timeoutMinutes > 0 
                ? new Date(Date.now() + timeoutMinutes * 60 * 1000) 
                : null;
            const estadoInicial = timeoutMinutes === 0 ? 'confirmed' : 'pending';

            // Verificar existencia del staff y obtener su nombre para el respaldo
            let finalStaffId = null;
            let professionalDetail = "";
            if (staffId && staffId !== "") {
                const staffExists = await tx.Staff.findFirst({
                    where: { id: staffId, businessId: negocio.id }
                });
                if (staffExists) {
                    finalStaffId = staffId;
                    professionalDetail = `\nProfesional seleccionado: ${staffExists.name}`;
                }
            }

            // Preparamos un comentario que incluya los servicios extra y el profesional
            let comentariosFinales = (comentarios || "") + professionalDetail;
            if (Array.isArray(body.extraServices) && body.extraServices.length > 0) {
                const nombresExtra = body.extraServices.map((s: any) => s.nombre).join(", ");
                comentariosFinales += `\nServicios extra: ${nombresExtra}`;
            }

            // Validar y aplicar cupón si se envió
            let totalFinal = parseFloat(String(body.precioTotal || 0));
            let couponApplied: any = null;
            let isClientCoupon = false;

            if (couponCode) {
                if (couponCode.startsWith('CTX-')) {
                    // Buscar cupón individual del cliente
                    const clientCoupon = await tx.clientCoupon.findFirst({
                        where: { negocioId: negocio.id, codigo: couponCode, clienteId: cliente.id },
                        include: { Coupon: true }
                    });

                    if (clientCoupon && clientCoupon.estado === 'DISPONIBLE') {
                        const now = new Date();
                        const vigente = !clientCoupon.fechaExpiracion || now <= clientCoupon.fechaExpiracion;
                        const aplicaServicio = !clientCoupon.Coupon.servicioId || clientCoupon.Coupon.servicioId === serviceId;

                        if (vigente && aplicaServicio) {
                            let descuento = 0;
                            if (clientCoupon.tipo === 'PORCENTAJE') {
                                descuento = (totalFinal * clientCoupon.descuento) / 100;
                            } else if (clientCoupon.tipo === 'FIJO') {
                                descuento = Math.min(clientCoupon.descuento, totalFinal);
                            }
                            totalFinal = Math.max(0, totalFinal - descuento);
                            couponApplied = clientCoupon;
                            isClientCoupon = true;
                        }
                    }
                } else {
                    // Buscar cupón genérico del catálogo
                    const coupon = await tx.Coupon.findUnique({
                        where: { negocioId_codigo: { negocioId: negocio.id, codigo: couponCode } },
                    });

                    if (coupon && coupon.activa) {
                        const now = new Date();
                        const vigente = (!coupon.fechaInicio || now >= coupon.fechaInicio) &&
                                       (!coupon.fechaFin || now <= coupon.fechaFin);
                        const sinLimite = coupon.maxUsos === null || coupon.usosActuales < coupon.maxUsos;
                        const aplicaServicio = !coupon.servicioId || coupon.servicioId === serviceId;

                        if (vigente && sinLimite && aplicaServicio) {
                            let descuento = 0;
                            if (coupon.tipo === 'PORCENTAJE') {
                                descuento = (totalFinal * coupon.valor) / 100;
                            } else if (coupon.tipo === 'FIJO') {
                                descuento = Math.min(coupon.valor, totalFinal);
                            }
                            totalFinal = Math.max(0, totalFinal - descuento);
                            couponApplied = coupon;

                            // Incrementar contador de usos globales
                            await tx.Coupon.update({
                                where: { id: coupon.id },
                                data: { usosActuales: { increment: 1 } },
                            });
                        }
                    }
                }
            }

            // Validar y aplicar premio de servicio gratis (gratuidad) si se envió
            let appliedRewardRecord: any = null;
            let appliedRewardType: 'PUNTOS' | 'REFERIDO' | null = null;

            if (rewardId) {
                // 1. Buscar en LoyaltyRedemption (canje por puntos)
                const loyaltyRewardRedemption = await (tx as any).loyaltyRedemption.findFirst({
                    where: { id: rewardId, userId: usuario.id, negocioId: negocio.id, estado: 'DISPONIBLE' },
                    include: { Reward: true }
                });

                if (loyaltyRewardRedemption && loyaltyRewardRedemption.Reward.tipo === 'SERVICIO_GRATIS' && loyaltyRewardRedemption.Reward.serviceId === serviceId) {
                    appliedRewardRecord = loyaltyRewardRedemption;
                    appliedRewardType = 'PUNTOS';
                    totalFinal = 0;
                } else {
                    // 2. Buscar en ReferralReward (premio de campaña/referidos)
                    const referralCampaignReward = await tx.referralReward.findFirst({
                        where: { id: rewardId, userId: usuario.id, negocioId: negocio.id, estado: 'DISPONIBLE' },
                        include: { Campaign: true }
                    });

                    if (referralCampaignReward && referralCampaignReward.Campaign.rewardType === 'SERVICIO_GRATIS' && referralCampaignReward.Campaign.serviceId === serviceId) {
                        appliedRewardRecord = referralCampaignReward;
                        appliedRewardType = 'REFERIDO';
                        totalFinal = 0;
                    }
                }
            }

            const dataToCreate: any = {
                fecha: reservationDate,
                horaInicio: String(horaInicio),
                horaFin: String(horaFin),
                duracion: Math.ceil(totalDuracionMinutos),
                total: totalFinal,
                comentarios: comentariosFinales + 
                    (couponApplied ? `\n🎟️ Cupón aplicado: ${couponApplied.codigo}` : '') +
                    (appliedRewardRecord ? `\n🏆 Premio aplicado: Servicio Gratis` : ''),
                estado: estadoInicial,
                expiresAt: expiresAt,
                cliente: { connect: { id: cliente.id } },
                negocio: { connect: { id: negocio.id } },
                service: { connect: { id: service.id } },
                usuario: { connect: { id: usuario.id } }
            };

            if (finalStaffId) {
                dataToCreate.staff = { connect: { id: finalStaffId } };
            }

            const reserva = await tx.Appointment.create({
                data: {
                    ...dataToCreate,
                    id: crypto.randomUUID(),
                    updatedAt: new Date()
                }
            });

            // Si se aplicó una recompensa de servicio gratis, actualizar su estado a RESERVADO y vincular la reserva
            if (appliedRewardRecord && appliedRewardType) {
                if (appliedRewardType === 'PUNTOS') {
                    await (tx as any).loyaltyRedemption.update({
                        where: { id: appliedRewardRecord.id },
                        data: {
                            estado: 'RESERVADO',
                            appointmentId: reserva.id,
                            updatedAt: new Date()
                        }
                    });
                } else if (appliedRewardType === 'REFERIDO') {
                    await tx.referralReward.update({
                        where: { id: appliedRewardRecord.id },
                        data: {
                            estado: 'RESERVADO',
                            appointmentId: reserva.id,
                            updatedAt: new Date()
                        }
                    });
                }
            }

            // Si se aplicó un cupón individual de cliente, actualizar su estado en base a la reserva
            if (couponApplied && isClientCoupon) {
                const isConfirmed = estadoInicial === 'confirmed';
                await tx.clientCoupon.update({
                    where: { id: couponApplied.id },
                    data: {
                        estado: isConfirmed ? 'USADO' : 'RESERVADO',
                        appointmentId: reserva.id,
                        fechaUso: isConfirmed ? new Date() : null
                    }
                });
            }

            // 🔗 Procesar código de referido: prioridad cookie → body (localStorage fallback)
            let referralCode = null;
            try {
                const { cookies } = require('next/headers');
                const cookieStore = await cookies();
                referralCode = cookieStore.get('referral_code')?.value;
            } catch (cookieErr) {
                console.error('[Referidos] Error al leer cookies:', cookieErr);
            }
            // Fallback: si el frontend envió el código desde localStorage
            if (!referralCode && body.referralCode) {
                referralCode = body.referralCode;
            }

            if (referralCode && usuario) {
                const cleanCode = referralCode.trim().toUpperCase();
                const codeRecord = await tx.referralCode.findUnique({
                    where: { codigo: cleanCode }
                });

                if (codeRecord && codeRecord.negocioId === negocio.id && codeRecord.userId !== usuario.id) {
                    // Obtener todas las campañas activas para este negocio
                    const activeCampaigns = await tx.referralCampaign.findMany({
                        where: {
                            negocioId: negocio.id,
                            activa: true,
                            fechaInicio: { lte: new Date() },
                            AND: [
                                {
                                    OR: [
                                        { estado: 'ACTIVA' },
                                        { estado: null }
                                    ]
                                },
                                {
                                    OR: [
                                        { fechaFin: null },
                                        { fechaFin: { gte: new Date() } }
                                    ]
                                }
                            ]
                        }
                    });

                    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '';
                    const userAgent = req.headers.get('user-agent') || '';

                    for (const campaign of activeCampaigns) {
                        // Verificar si ya existe un evento de referido pendiente para este cliente y campaña
                        const existingEvent = await tx.referralEvent.findFirst({
                            where: {
                                referredId: usuario.id,
                                negocioId: negocio.id,
                                campaignId: campaign.id,
                                estado: 'PENDIENTE'
                            }
                        });

                        if (!existingEvent) {
                            await tx.referralEvent.create({
                                data: {
                                    id: crypto.randomUUID(),
                                    campaignId: campaign.id,
                                    codeId: codeRecord.id,
                                    negocioId: negocio.id,
                                    referrerId: codeRecord.userId,
                                    referredId: usuario.id,
                                    appointmentId: reserva.id,
                                    estado: 'PENDIENTE',
                                    ipAddress,
                                    userAgent,
                                    updatedAt: new Date()
                                }
                            });
                            console.log(`[Referidos] Evento PENDIENTE creado para campaña ${campaign.nombre} (ID: ${campaign.id}) con cita ${reserva.id}`);
                            
                            // Guardamos el incentivo de la primera campaña de referidos
                            if (!referralIncentive) {
                                referralIncentive = campaign.valorIncentivo || "";
                            }
                        }
                    }
                }
            }

            return { success: true, reserva };
        });

        if (result.error) {
            return NextResponse.json({ 
                error: result.error,
                details: (result as any).message || null
            }, { status: 400 });
        }

        const reservaCreated = result.reserva;
        console.log(`[PUSH-AUDIT][PASO 0A] Reserva creada exitosamente. ID=${reservaCreated.id} Estado=${reservaCreated.estado} negocioId=${negocio.id}`);

        // 3. Notificaciones (Segundo plano relativo)
        
        // WhatsApp al negocio
        try {
            const fullReserva = await prisma.appointment.findUnique({
                where: { id: reservaCreated.id },
                include: { service: true, cliente: true }
            });
            if (fullReserva) await whatsappService.notifyNewReserva(fullReserva);
        } catch (e) { console.error('WA Business notify error:', e); }

        // WhatsApp al cliente (mensaje de pendiente) - SIEMPRE debe enviarse
        // Para evitar el desfase de zona horaria (UTC -> Local), extraemos el día exacto de la cadena
        const [year, month, day] = String(fecha).split('T')[0].split('-');
        const localDate = new Date(Number(year), Number(month) - 1, Number(day), 12, 0, 0); // Mediodía para evitar cualquier desfase
        const fechaLegible = format(localDate, "eeee d 'de' MMMM", { locale: es });
        let magicLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/${negocio.slug}/mis-reservas`;
        
        // Generar OTP (no bloqueante - si falla igual enviamos el WhatsApp)
        try {
            const code = Math.floor(100000 + Math.random() * 900000).toString();
            await (prisma as any).otpCode.create({
                data: { 
                    id: crypto.randomUUID(),
                    telefono: clienteTelefono, 
                    businessId: negocio.id, 
                    code, 
                    expires_at: new Date(Date.now() + 15 * 60 * 1000)
                }
            });
            const encodedTel = encodeURIComponent(clienteTelefono);
            magicLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/${negocio.slug}/mis-reservas?otp=${code}&tel=${encodedTel}`;
        } catch (otpErr) { 
            console.error('OTP creation error (no bloqueante):', otpErr); 
        }

        // Enviar WhatsApp al cliente SIEMPRE, independientemente del OTP
        try {
            const isConfirmed = reservaCreated.estado === 'confirmed';
            let mensajeCliente = isConfirmed
                ? `👋 ¡Hola ${clienteNombre}!\n\nTu reserva en *${negocio.nombre}* ha sido confirmada con éxito. ✅\n\n✨ *Servicio:* ${service.nombre}\n📅 *Fecha:* ${fechaLegible}\n⏰ *Hora:* ${horaInicio}\n\n🔗 Ver tus reservas: ${magicLink}`
                : `👋 ¡Hola ${clienteNombre}!\n\nHemos recibido tu solicitud de reserva en *${negocio.nombre}*.\n\n✨ *Servicio:* ${service.nombre}\n📅 *Fecha:* ${fechaLegible}\n⏰ *Hora:* ${horaInicio}\n\n⏳ *Estado:* Pendiente de confirmación. El negocio revisará tu solicitud y recibirás una respuesta pronto.\n\n🔗 Ver tus reservas: ${magicLink}`;
            
            if (referralIncentive) {
                mensajeCliente += `\n\n🎁 *¡Premio de Bienvenida!* Por venir recomendado/a, tienes de regalo:\n✨ *${referralIncentive}*\n👉 Solicítalo en tu cita.`;
            }

            console.log(`[WA CLIENTE] Enviando mensaje a ${clienteTelefono} (Estado: ${reservaCreated.estado})...`);
            await whatsappService.sendWhatsApp(clienteTelefono, mensajeCliente, true, isConfirmed ? 'confirmacion_cliente' : 'solicitud_cliente');
            console.log(`[WA CLIENTE] ✅ Mensaje enviado correctamente a ${clienteTelefono}`);
        } catch (waErr) { 
            console.error('❌ Error WA mensaje cliente:', waErr); 
        }

        // Guardar y despachar notificación para administradores del negocio (incluye Push FCM)
        try {
            console.log(`[PUSH-AUDIT][PASO 0B] Invocando NotificationService.createNotification() para el negocio (admins). channels=['APP','PUSH']`);
            await NotificationService.createNotification({
                negocioId: negocio.id,
                tipo: 'RESERVA',
                categoria: 'RESERVAS',
                titulo: '🔔 Nueva Reserva',
                descripcion: `${clienteNombre} - ${service.nombre} a las ${horaInicio}`,
                prioridad: 'SUCCESS',
                priority: 'HIGH',
                recipientType: 'ALL',
                actionType: 'VER_RESERVA',
                actionPayload: { screen: 'appointment', appointmentId: reservaCreated.id, url: '/admin/citas' },
                channels: ['APP', 'PUSH']
            });
        } catch (e) { 
            console.error('Error al crear notificación de negocio para nueva reserva:', e); 
        }

        // Disparar en el nuevo Centro de Actividad del cliente
        if (reservaCreated.usuarioId) {
            try {
                const isConfirmed = reservaCreated.estado === 'confirmed';
                await NotificationService.createNotification({
                    negocioId: negocio.id,
                    userId: reservaCreated.usuarioId,
                    tipo: 'RESERVA',
                    categoria: 'RESERVAS',
                    titulo: isConfirmed ? '📅 Cita Confirmada' : '⏳ Solicitud de Reserva Recibida',
                    descripcion: isConfirmed
                        ? `Tu cita para el servicio ${service.nombre} el día ${fechaLegible} a las ${horaInicio} hs ha sido confirmada automáticamente.`
                        : `Hemos recibido tu solicitud de reserva para el servicio ${service.nombre} el día ${fechaLegible} a las ${horaInicio} hs. Pendiente de confirmación.`,
                    icono: 'Calendar',
                    prioridad: 'INFO',
                    recipientType: 'USER',
                    actionType: 'VER_RESERVA',
                    actionPayload: { screen: 'appointment', appointmentId: reservaCreated.id }
                });
            } catch (notifyErr) {
                console.error('Error al crear notificación en base de datos para reserva:', notifyErr);
            }
        }

        // Generar customer_token para que el cliente pueda ver sus reservas
        const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || 'default_otp_secret_key_change_me');
        const customerToken = await new SignJWT({
            telefono: clienteTelefono,
            negocioId: negocio.id,
            slug: slug
        })
            .setProtectedHeader({ alg: 'HS256' })
            .setExpirationTime('30d')
            .sign(secret);

        const response = NextResponse.json({ success: true, id: reservaCreated.id });
        response.cookies.set('customer_token', customerToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 30 * 24 * 60 * 60, // 30 días
            path: '/'
        });
        response.cookies.set('cs', '1', {
            httpOnly: false,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 30 * 24 * 60 * 60,
            path: '/'
        });
        return response;


    } catch (error: any) {
        console.error('Error detallado en API Reserva Pública:', error);
        return NextResponse.json({ 
            error: 'Error en el servidor', 
            details: error.message,
            stack: error.stack 
        }, { status: 500 });
    }
}
