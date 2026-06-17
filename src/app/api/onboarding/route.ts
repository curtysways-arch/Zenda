import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

        const negocioId = (session.user as any).negocioId;
        if (!negocioId) return NextResponse.json({ error: 'Negocio ID no encontrado' }, { status: 400 });

        const body = await req.json();
        const {
            nombre, descripcion, telefono, direccion, ciudad, // Step 1
            logoUrl, bannerUrl, // Step 2
            tipoNegocio, // Step 3
            servicioNombre, servicioDuracion, servicioPrecio, servicioDescripcion, servicioImageUrl, servicioImageMediaId, // Step 4
            horarioApertura, horarioCierre // Step 5
        } = body;

        // Fetch current negocio to get current configuracion
        const currentNegocio = await prisma.negocio.findUnique({
            where: { id: negocioId },
            select: { configuracion: true, logoUrl: true, nombre: true }
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
            descripcionCorta: descripcion || currentConfig.descripcionCorta
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
            if (horarioApertura) dataToUpdate.horarioApertura = horarioApertura;
            if (horarioCierre) dataToUpdate.horarioCierre = horarioCierre;

            await tx.negocio.update({
                where: { id: negocioId },
                data: dataToUpdate
            });

            // Note: Since Prisma's update might not handle some fields directly if the schema cache is stale,
            // but these fields (nombre, whatsapp, direccion, logoUrl, horarioApertura, horarioCierre, configuracion, ciudad) 
            // are mostly standard or JSON. ciudad might need raw update if it's not in schema.
            // Let's check if ciudad exists in schema. It does (line 284).

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

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error en /api/onboarding:', error);
        return NextResponse.json({
            error: 'Error al completar el onboarding',
            details: error.message
        }, { status: 500 });
    }
}
