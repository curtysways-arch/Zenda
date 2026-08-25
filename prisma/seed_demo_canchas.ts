import * as dotenv from 'dotenv';
import * as path from 'path';
import hasher from 'bcryptjs';
import crypto from 'crypto';

dotenv.config({ path: path.join(process.cwd(), '.env') });

import prisma from '../src/lib/prisma';

async function seedDemoCanchas() {
    console.log('🌱 Iniciando siembra del demo Canchas & Pádel Club...');

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
                nombre: 'PÁDEL CLUB CITIOX',
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
                    heroTitulo: 'Reserva tu Cancha en Segundos',
                    heroSubtitulo: 'Pádel, Fútbol Sintético y Tenis con Iluminación LED Pro',
                    bannerUrl: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=1200&h=400&fit=crop',
                    colorPrimario: '#10b981',
                    colorSecundario: '#047857'
                })
            },
            create: {
                id: businessId,
                nombre: 'PÁDEL CLUB CITIOX',
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
                    heroTitulo: 'Reserva tu Cancha en Segundos',
                    heroSubtitulo: 'Pádel, Fútbol Sintético y Tenis con Iluminación LED Pro',
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
                nombre: 'Admin Pádel Club',
                role: 'ADMIN',
                negocioId: negocio.id,
                password: hashedPassword,
                updatedAt: new Date()
            },
            create: {
                id: crypto.randomUUID(),
                nombre: 'Admin Pádel Club',
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

        // 5. Sembrar Canchas / Servicios por defecto
        const canchasDefecto = [
            {
                nombre: 'Cancha 01 - Pádel Cristal (Techada)',
                duracion: 60,
                precio: 25.00,
                tipo: 'PÁDEL'
            },
            {
                nombre: 'Cancha 02 - Pádel Panorámica',
                duracion: 60,
                precio: 25.00,
                tipo: 'PÁDEL'
            },
            {
                nombre: 'Cancha 03 - Fútbol 7 Sintético',
                duracion: 60,
                precio: 35.00,
                tipo: 'FÚTBOL'
            },
            {
                nombre: 'Cancha 04 - Tenis Polvo de Ladrillo',
                duracion: 60,
                precio: 20.00,
                tipo: 'TENIS'
            }
        ];

        for (const c of canchasDefecto) {
            const existe = await prisma.service.findFirst({
                where: { negocioId: negocio.id, nombre: c.nombre }
            });

            if (!existe) {
                await prisma.service.create({
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
            }
        }

        console.log('✨ Demo Canchas & Pádel Club sembrado exitosamente!');
    } catch (err) {
        console.error('❌ Error sembrando demo canchas:', err);
    } finally {
        await prisma.$disconnect();
    }
}

seedDemoCanchas();
