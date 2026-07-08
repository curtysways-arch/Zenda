import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { notificationService } from '@/lib/notifications';
import { NotificationService } from '@/lib/notifications/notificationService';
import { whatsappService } from "@/lib/whatsapp";
import { randomBytes } from 'crypto';
import crypto from 'crypto';
import { SignJWT } from 'jose';
import { planLimitValidator } from '@/lib/services/planLimitValidator';
import { checkDemoRestriction } from '@/lib/demo-protection';
import { sendWhatsAppMessage } from '@/lib/whatsapp-client';


export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { slug, fecha, horaInicio, duracion, serviceId, clienteNombre, clienteTelefono, comentarios } = body;

        const dur = parseInt(duracion) || 1;
        const [h, m] = horaInicio.split(':').map(Number);
        const horaFin = `${(h + dur).toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;

        // 1. Buscar el negocio y la cancha
        const negocio = await prisma.negocio.findUnique({
            where: { slug },
            include: {
                Service: {
                    where: { id: serviceId }
                }
            }
        });

        if (!negocio || negocio.Service.length === 0) {
            return NextResponse.json({ error: 'Negocio o cancha no encontrada' }, { status: 404 });
        }

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

        const service = negocio.Service[0];

        const reservationReceived = new Date(fecha);
        if (isNaN(reservationReceived.getTime())) {
            return NextResponse.json({ error: 'Fecha inválida' }, { status: 400 });
        }

        // Normalizar fecha a 00:00:00 UTC para consistencia en búsquedas
        const reservationDate = new Date(Date.UTC(
            reservationReceived.getUTCFullYear(),
            reservationReceived.getUTCMonth(),
            reservationReceived.getUTCDate(),
            0, 0, 0, 0
        ));

        // 2. Validar disponibilidad real (Reservas y Bloqueos) con transacción para evitar condiciones de carrera
        const result = await prisma.$transaction(async (tx: any) => {
            const now = new Date();

            // Validar que NO exista ninguna reserva que se cruce
            // Se asume que cualquier reserva (pendiente, confirmada, expirada) bloquea el horario si no ha sido RECHAZADA
            const reservaExistente = await tx.appointment.findFirst({
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

            // Validar bloqueos
            const bloqueoExistente = await tx.bloqueo.findFirst({
                where: {
                    serviceId: serviceId,
                    fecha: reservationDate,
                    AND: [
                        { horaInicio: { lt: horaFin } },
                        { horaFin: { gt: horaInicio } }
                    ]
                }
            });

            if (bloqueoExistente) {
                return { error: `Este horario está inhabilitado: ${bloqueoExistente.motivo}` };
            }

            // Validar horarios de CURSOS
            const diaSemana = reservationDate.getDay(); // 0-6
            const cursoSchedule = await tx.courseSchedule.findFirst({
                where: {
                    serviceId: serviceId,
                    day_of_week: diaSemana,
                    AND: [
                        { start_time: { lt: horaFin } },
                        { end_time: { gt: horaInicio } }
                    ]
                },
                include: {
                    Course: {
                        select: { name: true }
                    }
                }
            });

            if (cursoSchedule) {
                return { error: `Este horario está reservado para el curso: ${cursoSchedule.Course.name}` };
            }

            // 3. Lógica de Usuario Automática (Reserva Asistida)
            let usuarioId = null;
            const isBusiness = body.is_business_creation === true;

            if (isBusiness) {
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
                            status: 'unverified',
                            auth_method: 'phone',
                            negocioId: negocio.id,
                            updatedAt: new Date()
                        }
                    });
                }
                usuarioId = usuario.id;
            }

            // 4. Crear o actualizar cliente (Mantener compatibilidad)
            const cliente = await tx.cliente.upsert({
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

            // 5. Calcular total
            const precioBaseHora = Number(service.precio || negocio.precioHora || 0);
            let precioFinalHora = precioBaseHora;

            // Validar promoción activa (Manual)
            const promo = await tx.promotion.findFirst({
                where: {
                    businessId: negocio.id,
                    estado: 'activa',
                    fechaInicio: { lte: reservationDate },
                    fechaFin: { gte: reservationDate },
                    PromotionToService: { some: { B: service.id } }
                },
                orderBy: { createdAt: 'desc' }
            });

            if (promo) {
                precioFinalHora = Number(promo.precioPromo);
            }

            // Validar Descuento Automático ("Horarios Muertos")
            let automaticDiscountPercent = 0;
            const autoDiscounts = await tx.automaticDiscount.findMany({
                where: {
                    businessId: negocio.id,
                    OR: [
                        { serviceId: service.id },
                        { serviceId: null }
                    ]
                }
            });

            // Prioridad: Específica > General
            const autoDiscount = autoDiscounts.find(d => d.serviceId === service.id) || autoDiscounts.find(d => d.serviceId === null);

            if (autoDiscount && autoDiscount.enabled) {
                const dayOfWeek = reservationDate.getDay().toString();
                const activeDays = (autoDiscount.daysOfWeek || "").split(',');

                if (activeDays.includes(dayOfWeek) &&
                    horaInicio >= autoDiscount.startTime &&
                    horaInicio <= autoDiscount.endTime) {

                    const slotDateTime = new Date(reservationDate);
                    const [h_start, m_start] = horaInicio.split(':').map(Number);
                    slotDateTime.setHours(h_start, m_start, 0, 0);

                    const diffHours = (slotDateTime.getTime() - Date.now()) / (1000 * 60 * 60);

                    if (diffHours >= 0 && diffHours <= autoDiscount.hoursBefore) {
                        automaticDiscountPercent = autoDiscount.discountPercentage;
                    }
                }
            }

            const totalBase = precioFinalHora * dur;
            const totalConDescuento = totalBase * (1 - automaticDiscountPercent / 100);
            const descuentoMonto = totalBase - totalConDescuento;

            // 5. Crear la reserva
            const timeoutConfig = await tx.configuracion.findUnique({
                where: {
                    clave_negocioId: {
                        clave: 'BOOKING_TIMEOUT',
                        negocioId: negocio.id
                    }
                }
            });
            const timeoutMinutesRaw = timeoutConfig ? parseInt(timeoutConfig.valor) : 10;
            const timeoutMinutes = isNaN(timeoutMinutesRaw) ? 10 : timeoutMinutesRaw;
            const expiresAt = timeoutMinutes > 0
                ? new Date(Date.now() + timeoutMinutes * 60 * 1000)
                : null;

            const estadoInicial = isBusiness ? 'confirmed' : (timeoutMinutes === 0 ? 'confirmed' : 'pending');

            const dataToCreate: any = {
                id: crypto.randomUUID(),
                fecha: reservationDate,
                horaInicio,
                horaFin,
                duracion: dur,
                total: totalConDescuento,
                precioOriginal: totalBase,
                descuentoAplicado: descuentoMonto,
                clienteId: cliente.id,
                negocioId: negocio.id,
                serviceId: service.id,
                comentarios: comentarios || '',
                estado: estadoInicial,
                created_by_business: isBusiness,
                shareToken: isBusiness ? randomBytes(16).toString('hex') : null,
                usuarioId: usuarioId,
                expiresAt: estadoInicial === 'confirmed' ? null : expiresAt,
                updatedAt: new Date()
            };

            const reserva = await tx.appointment.create({
                data: dataToCreate
            });

            // INCREMENTAR CONTADOR DE CITAS (Monetización)
            await tx.negocio.update({
                where: { id: negocio.id },
                data: { appointmentsUsed: { increment: 1 } }
            });

            return { success: true, reserva, shareCode: null };
        });

        if (result.error) {
            return NextResponse.json({ error: result.error }, { status: 400 });
        }

        const reserva = result.reserva;

        // 6. Notificaciones - Bloques INDEPENDIENTES para que un fallo no bloquee al otro

        // 6a. WhatsApp al negocio
        try {
            const fullReserva = await prisma.appointment.findUnique({
                where: { id: reserva.id },
                include: { service: true, cliente: true }
            });
            if (fullReserva) {
                await whatsappService.notifyNewReserva(fullReserva);
            }
        } catch (waErr) {
            console.error('❌ Error WA notifyNewReserva:', waErr);
        }

        // 6b. OTP / Magic Link por WhatsApp al cliente
        try {
            const code = Math.floor(100000 + Math.random() * 900000).toString();
            const otpExpiry = new Date(Date.now() + 15 * 60 * 1000);
            
            await prisma.otpCode.create({
                data: { 
                    id: crypto.randomUUID(),
                    telefono: clienteTelefono, 
                    businessId: negocio.id, 
                    code, 
                    expires_at: otpExpiry
                }
            });

            const encodedTel = encodeURIComponent(clienteTelefono);
            const magicLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/${negocio.slug}/mis-reservas?otp=${code}&tel=${encodedTel}`;
            const fechaLegible = new Date(fecha).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
            
            const mensajeCliente = `👋 ¡Hola ${clienteNombre}!\n\nHemos recibido tu solicitud de reserva en *${negocio.nombre}*.\n\n🏟 *Servicio:* ${service.nombre}\n📅 *Fecha:* ${fechaLegible}\n⏰ *Hora:* ${horaInicio} - ${horaFin}\n\n⚠️ *Estado:* Pendiente de confirmación.\n\n🔗 ${magicLink}\n\nCódigo: *${code}*`;
            
            // Usar whatsappService que maneja la normalización internamente
            await whatsappService.sendWhatsApp(clienteTelefono, mensajeCliente, true, 'solicitud_cliente');
        } catch (otpErr) {
            console.error('❌ Error OTP/WA cliente:', otpErr);
        }

        // 6c. Guardar y despachar notificación para administradores del negocio (Centro de Actividad + Push FCM)
        try {
            await NotificationService.createNotification({
                negocioId: negocio.id,
                tipo: 'RESERVA',
                categoria: 'RESERVAS',
                titulo: '🔔 Nueva Reserva',
                descripcion: `${clienteNombre} - ${service.nombre} a las ${horaInicio} (${dur}h)`,
                prioridad: 'SUCCESS',
                priority: 'HIGH',
                recipientType: 'ALL',
                actionType: 'VER_RESERVA',
                actionPayload: { screen: 'appointment', appointmentId: reserva.id, url: '/admin/citas' },
                channels: ['APP', 'PUSH']
            });
        } catch (pushErr) {
            console.error('❌ Error creando notificación de reserva:', pushErr);
        }

        // 7. Generar token de dueño para el navegador actual (COMPLETO)
        const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || "default_otp_secret_key_change_me");
        const token = await new SignJWT({ 
            telefono: clienteTelefono,
            negocioId: negocio.id,
            slug: slug
        })
            .setProtectedHeader({ alg: 'HS256' })
            .setExpirationTime('30d')
            .sign(secret);

        const response = NextResponse.json({ 
            success: true, 
            reserva, 
            shareCode: result.shareCode,
            shareToken: reserva.shareToken 
        });
        
        if (!body.is_business_creation) {
            response.cookies.set('customer_token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 30 * 24 * 60 * 60 // 30 días
            });
        }

        return response;
    } catch (error: any) {
        console.error('Error creando reserva (DETALLADO) :', error);
        return NextResponse.json({
            error: 'Internal Server Error',
            details: error.message
        }, { status: 500 });
    }
}
