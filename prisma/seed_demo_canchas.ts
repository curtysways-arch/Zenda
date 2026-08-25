import * as dotenv from 'dotenv';
import * as path from 'path';
import hasher from 'bcryptjs';
import crypto from 'crypto';

dotenv.config({ path: path.join(process.cwd(), '.env') });

import prisma from '../src/lib/prisma';

async function seedDemoCanchas() {
    console.log('🌱 Iniciando siembra enriquecida del demo Canchas...');

    try {
        await prisma.$connect();
        const businessId = 'demo-canchas-id-100';
        const slug = 'demo-canchas';

        // 1. Obtener un plan activo de la base de datos
        const plan = await (prisma as any).plan.findFirst({
            where: {
                OR: [
                    { name: { contains: 'Pro' } },
                    { name: { contains: 'Ilimitado' } }
                ]
            }
        }) || await (prisma as any).plan.findFirst();

        const planId = plan?.id || crypto.randomUUID();

        // 2. Crear o actualizar el Negocio Demo
        const negocio = await prisma.negocio.upsert({
            where: { slug },
            update: {
                nombre: 'CANCHA LOS CAMPEONES',
                tipoNegocio: 'SPORTS_COURTS',
                whatsapp: '+593991234567',
                direccion: 'Av. de los Granados y Eloy Alfaro, Quito',
                horarioApertura: '06:00',
                horarioCierre: '23:00',
                precioHora: 25.00,
                logoUrl: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=400&h=400&fit=crop',
                isDemo: false,
                updatedAt: new Date(),
                configuracion: JSON.stringify({
                    tipoNegocio: 'SPORTS_COURTS',
                    heroTitulo: 'Nuestras Canchas',
                    heroSubtitulo: 'Selecciona el escenario perfecto para tu próximo partido.',
                    bannerUrl: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=1200&h=400&fit=crop',
                    colorPrimario: '#10b981',
                    colorSecundario: '#047857'
                })
            },
            create: {
                id: businessId,
                nombre: 'CANCHA LOS CAMPEONES',
                slug,
                tipoNegocio: 'SPORTS_COURTS',
                whatsapp: '+593991234567',
                direccion: 'Av. de los Granados y Eloy Alfaro, Quito',
                horarioApertura: '06:00',
                horarioCierre: '23:00',
                precioHora: 25.00,
                logoUrl: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=400&h=400&fit=crop',
                isDemo: false,
                updatedAt: new Date(),
                configuracion: JSON.stringify({
                    tipoNegocio: 'SPORTS_COURTS',
                    heroTitulo: 'Nuestras Canchas',
                    heroSubtitulo: 'Selecciona el escenario perfecto para tu próximo partido.',
                    bannerUrl: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=1200&h=400&fit=crop',
                    colorPrimario: '#10b981',
                    colorSecundario: '#047857'
                })
            }
        });

        console.log('✅ Negocio Demo verificado:', negocio.nombre, `(Slug: ${negocio.slug})`);

        // 3. Crear o actualizar Administrador del Negocio
        const hashedPassword = await hasher.hash('canchas123', 10);
        const adminUser = await prisma.usuario.upsert({
            where: { email: 'canchas@citiox.com' },
            update: {
                nombre: 'Admin Cancha Los Campeones',
                role: 'ADMIN',
                negocioId: negocio.id,
                password: hashedPassword,
                updatedAt: new Date()
            },
            create: {
                id: crypto.randomUUID(),
                nombre: 'Admin Cancha Los Campeones',
                email: 'canchas@citiox.com',
                password: hashedPassword,
                role: 'ADMIN',
                negocioId: negocio.id,
                updatedAt: new Date()
            }
        });

        console.log('✅ Usuario Administrador verificado:', adminUser.email);

        // 4. Crear Suscripción Activa
        const existingSub = await (prisma as any).suscripcion.findFirst({
            where: { negocioId: negocio.id }
        });

        if (!existingSub) {
            await (prisma as any).suscripcion.create({
                data: {
                    id: crypto.randomUUID(),
                    negocioId: negocio.id,
                    plan_id: planId,
                    estado: 'ACTIVA',
                    fechaInicio: new Date(),
                    fechaFin: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
                }
            });
            console.log('✅ Suscripción Pro creada');
        }

        // 5. Sembrar Canchas / Servicios por defecto con Imágenes
        const canchasDefecto = [
            {
                nombre: 'CANCHA ELITE',
                duracion: 60,
                precio: 25.00,
                tipo: 'FÚTBOL 7',
                imagenUrl: 'https://images.unsplash.com/photo-1529900748604-07564a03e7a6?auto=format&fit=crop&q=80&w=800'
            },
            {
                nombre: 'CANCHA PREMIUM',
                duracion: 60,
                precio: 45.00,
                tipo: 'FÚTBOL 7',
                imagenUrl: 'https://images.unsplash.com/photo-1575361204480-aadea25e6e68?auto=format&fit=crop&q=80&w=800'
            },
            {
                nombre: 'CANCHA BASQUET',
                duracion: 60,
                precio: 35.00,
                tipo: 'BÁSQUET',
                imagenUrl: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&q=80&w=800'
            },
            {
                nombre: 'CANCHA 01 - PÁDEL CRISTAL',
                duracion: 60,
                precio: 25.00,
                tipo: 'PÁDEL',
                imagenUrl: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&q=80&w=800'
            },
            {
                nombre: 'CANCHA 02 - TENIS ARCILLA',
                duracion: 60,
                precio: 20.00,
                tipo: 'TENIS',
                imagenUrl: 'https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?auto=format&fit=crop&q=80&w=800'
            }
        ];

        for (const c of canchasDefecto) {
            let service = await prisma.service.findFirst({
                where: { negocioId: negocio.id, nombre: c.nombre }
            });

            if (!service) {
                service = await prisma.service.create({
                    data: {
                        id: crypto.randomUUID(),
                        negocioId: negocio.id,
                        nombre: c.nombre,
                        duracion: c.duracion,
                        precio: c.precio,
                        updatedAt: new Date()
                    }
                });
                console.log('🎾 Cancha creada:', c.nombre);
            } else {
                await prisma.service.update({
                    where: { id: service.id },
                    data: { precio: c.precio, duracion: c.duracion }
                });
                console.log('🎾 Cancha actualizada:', c.nombre);
            }

            // Asociar imagen a la cancha
            const imagenExiste = await prisma.imagen.findFirst({
                where: { serviceId: service.id }
            });

            if (!imagenExiste) {
                await prisma.imagen.create({
                    data: {
                        id: crypto.randomUUID(),
                        url: c.imagenUrl,
                        tipo: 'GALERIA',
                        negocioId: negocio.id,
                        serviceId: service.id
                    }
                });
            } else {
                await prisma.imagen.update({
                    where: { id: imagenExiste.id },
                    data: { url: c.imagenUrl }
                });
            }
        }

        console.log('✨ Demo Canchas & Pádel Club sembrado exitosamente con imágenes!');
    } catch (err) {
        console.error('❌ Error sembrando demo canchas:', err);
    } finally {
        await prisma.$disconnect();
    }
}

seedDemoCanchas();
