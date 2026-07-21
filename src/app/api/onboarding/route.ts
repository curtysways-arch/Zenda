import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { whatsappService } from '@/lib/whatsapp';
import { TemplateService } from '@/lib/services/templateService';

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

        const negocioId = (session.user as any).negocioId;
        if (!negocioId) return NextResponse.json({ error: 'Negocio ID no encontrado' }, { status: 400 });

        const body = await req.json();
        const {
            nombre, descripcion, telefono, direccion, ciudad, // Step 1
            logoUrl, bannerUrl, colorPrimario, colorSecundario, // Step 2
            tipoNegocio, // Step 3
            servicioNombre, servicioDuracion, servicioPrecio, servicioDescripcion, servicioImageUrl, servicioImageMediaId, // Step 4
            horarioApertura, horarioCierre, // Step 5
            diasAtencion // Step 5 - Días de atención
        } = body;

        // Fetch current negocio to get current configuracion
        const currentNegocio = await prisma.negocio.findUnique({
            where: { id: negocioId },
            select: { configuracion: true, logoUrl: true, nombre: true, slug: true, whatsapp: true }
        });

        if (!currentNegocio) {
            return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 });
        }

        const currentConfig = (currentNegocio.configuracion as any) || {};

        // Update configuracion object
        const updatedConfig = {
            ...currentConfig,
            wizardCompleted: true,
            tipoNegocio: tipoNegocio || currentConfig.tipoNegocio,
            descripcionCorta: descripcion || currentConfig.descripcionCorta,
            diasAtencion: diasAtencion !== undefined ? diasAtencion : currentConfig.diasAtencion
        };

        // We use a transaction to do everything at once
        await prisma.$transaction(async (tx) => {
            // 1. Update Negocio details
            const dataToUpdate: any = {
                nombre: nombre || currentNegocio.nombre,
                configuracion: updatedConfig
            };

            if (telefono) dataToUpdate.whatsapp = telefono;
            if (direccion) dataToUpdate.direccion = direccion;
            if (ciudad) dataToUpdate.ciudad = ciudad;
            if (logoUrl) dataToUpdate.logoUrl = logoUrl;
            if (colorPrimario) dataToUpdate.colorPrimario = colorPrimario;
            if (colorSecundario) dataToUpdate.colorSecundario = colorSecundario;
            if (horarioApertura) dataToUpdate.horarioApertura = horarioApertura;
            if (horarioCierre) dataToUpdate.horarioCierre = horarioCierre;

            await tx.negocio.update({
                where: { id: negocioId },
                data: dataToUpdate
            });

            // 1.5. Instalar automáticamente la plantilla predeterminada del sector seleccionado
            if (tipoNegocio) {
                try {
                    await TemplateService.installDefaultTemplateForBusiness(negocioId, tipoNegocio, tx);
                } catch (templateErr: any) {
                    console.error('[Onboarding] Error al instalar plantilla automática:', templateErr.message);
                }
            }

            // 1.6. Sincronizar e instalar automáticamente todas las misiones globales centrales publicadas
            try {
                const publishedMissions = await tx.missionDefinition.findMany({
                    where: { status: 'PUBLISHED' }
                });
                for (const m of publishedMissions) {
                    const status = m.requiresBusinessReward ? 'PENDING_REWARD' : 'ACTIVE';
                    await tx.businessMission.create({
                        data: {
                            missionDefinitionId: m.id,
                            negocioId,
                            status,
                            publishedAt: status === 'ACTIVE' ? new Date() : null,
                        }
                    });
                }
                console.log(`[Onboarding] Auto-instaladas ${publishedMissions.length} misiones globales en el negocio.`);
            } catch (err: any) {
                console.error('[Onboarding] Error al auto-instalar misiones globales:', err.message);
            }

            // 2. Create first service if provided
            if (servicioNombre) {
                // Determine duration in minutes
                let duracionMinutos = parseInt(servicioDuracion);
                if (isNaN(duracionMinutos)) duracionMinutos = 60; // default 60 mins

                const price = parseFloat(servicioPrecio);
                const serviceId = `srv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

                const serviceData: any = {
                    id: serviceId,
                    negocioId: negocioId,
                    nombre: servicioNombre,
                    duracion: duracionMinutos,
                    precio: isNaN(price) ? 0 : price,
                    estaActivo: true,
                    updatedAt: new Date(),
                    extraInfo: servicioDescripcion ? { descripcion: servicioDescripcion } : null
                };

                // Link service image if provided via new Media system
                if (servicioImageMediaId) {
                    serviceData.imageMediaId = servicioImageMediaId;
                }

                await tx.service.create({ data: serviceData });

                // If image was provided via URL (legacy or new), also save as Imagen record
                if (servicioImageUrl && !servicioImageMediaId) {
                    await (tx as any).imagen.create({
                        data: {
                            id: `img_srv_${Date.now()}`,
                            url: servicioImageUrl,
                            tipo: 'SERVICE',
                            serviceId: serviceId,
                            esBanner: true,
                        }
                    });
                }
            }

            // Save banner both in configuracion and in Imagen table for public page
            if (bannerUrl) {
                // Update configuracion with bannerUrl
                await tx.negocio.update({
                    where: { id: negocioId },
                    data: { 
                        configuracion: { ...updatedConfig, bannerUrl } 
                    }
                });

                // Also save to Imagen table so the public page can pick it up
                // First check if banner already exists
                const existingBanner = await tx.imagen.findFirst({
                    where: { negocioId, esBanner: true }
                });

                if (existingBanner) {
                    // Update existing banner
                    await tx.imagen.update({
                        where: { id: existingBanner.id },
                        data: { url: bannerUrl }
                    });
                } else {
                    // Create new banner entry
                    await (tx as any).imagen.create({
                        data: {
                            id: `img_banner_${Date.now()}`,
                            url: bannerUrl,
                            tipo: 'NEGOCIO',
                            negocioId: negocioId,
                            esBanner: true,
                        }
                    });
                }
            }
        });

        // Enviar mensaje de WhatsApp automático con enlaces
        try {
            const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://citiox.com';
            const publicLink = `${appUrl}/${currentNegocio.slug || ''}`;
            const adminLink = `${appUrl}/login`;
            const targetPhone = telefono || currentNegocio.whatsapp;

            if (targetPhone) {
                const waMessage = `🎉 *¡Felicitaciones!* Has completado con éxito la configuración inicial de *${nombre || currentNegocio.nombre}* en *CitiOx*.\n\nAquí tienes tus accesos rápidos:\n\n🌐 *Página Pública (Clientes):*\n${publicLink}\n\n💻 *Panel de Control:* \n${adminLink}\n\n¡Listo para recibir citas! ⚡`;
                await whatsappService.sendWhatsApp(targetPhone, waMessage, true, 'general').catch(e => {
                    console.error('Error enviando WhatsApp de onboarding:', e);
                });
            }
        } catch (waErr) {
            console.error('Error en proceso de envío de WhatsApp onboarding:', waErr);
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error en /api/onboarding:', error);
        return NextResponse.json({
            error: 'Error al completar el onboarding',
            details: error.message
        }, { status: 500 });
    }
}
