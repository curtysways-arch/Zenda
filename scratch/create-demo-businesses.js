const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

// Cargar .env manualmente si existe
try {
    const envPath = path.join(__dirname, '../.env');
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        envContent.split(/\r?\n/).forEach(line => {
            const match = line.match(/^\s*([^#=]+)\s*=\s*(.*)$/);
            if (match) {
                const key = match[1].trim();
                let val = match[2].trim();
                if (val.startsWith('"') && val.endsWith('"')) {
                    val = val.substring(1, val.length - 1);
                } else if (val.startsWith("'") && val.endsWith("'")) {
                    val = val.substring(1, val.length - 1);
                }
                process.env[key] = val;
            }
        });
    }
} catch (e) {
    console.error('Error al cargar .env:', e);
}

function createPrismaClient() {
    const dbUrl = process.env.DATABASE_URL || 'file:./dev.db';

    if (dbUrl.startsWith('postgresql://') || dbUrl.startsWith('postgres://')) {
        const { Pool } = require('pg');
        const { PrismaPg } = require('@prisma/adapter-pg');
        const pool = new Pool({ connectionString: dbUrl });
        const adapter = new PrismaPg(pool);
        return new PrismaClient({ adapter });
    } else {
        const { createClient } = require('@libsql/client');
        const { PrismaLibSql } = require('@prisma/adapter-libsql');
        
        let resolvedUrl = dbUrl;
        if (!dbUrl.startsWith('file://')) {
            const rawPath = dbUrl.replace(/^file:(\.\/)?/, '');
            const isAbsolute = rawPath.startsWith('/') || rawPath.startsWith('\\') || /^[a-zA-Z]:/.test(rawPath);
            const absPath = isAbsolute ? rawPath : `${process.cwd()}/${rawPath}`;
            const normalized = absPath.split(/[/\\]/).join('/');
            const prefix = normalized.match(/^[a-zA-Z]:/) ? '/' : '';
            resolvedUrl = `file://${prefix}${normalized}`;
        }
        
        const client = createClient({ url: resolvedUrl });
        const adapter = new PrismaLibSql(client);
        return new PrismaClient({ adapter });
    }
}

const prisma = createPrismaClient();

// Datos de los 5 negocios demo
const DEMO_BUSINESSES = [
    {
        slug: "barber-co",
        nombre: "Barber & Co - Classic Grooming",
        tipoNegocio: "Barbería",
        propietario: "Sebastián Castro",
        email: "contacto@barberco.demo",
        colorPrimario: "#b45309",
        colorSecundario: "#1e1b4b",
        heroTitulo: "Corte y Estilo Tradicional",
        heroSubtitulo: "El arte del buen vestir y el cuidado masculino en un solo lugar.",
        logoUrl: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=150&h=150&fit=crop",
        bannerUrl: "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=1200&h=400&fit=crop",
        servicios: [
            { id: "srv-barb-1", nombre: "Corte Clásico de Cabello", duracion: 30, precio: 20 },
            { id: "srv-barb-2", nombre: "Corte + Afeitado de Barba", duracion: 50, precio: 35 },
            { id: "srv-barb-3", nombre: "Perfilado y Diseño de Barba", duracion: 20, precio: 15 }
        ],
        profesionales: [
            { id: "stf-barb-1", name: "Sebastián Castro", role: "Barbero Máster", services: ["srv-barb-1", "srv-barb-2", "srv-barb-3"] },
            { id: "stf-barb-2", name: "Mateo Ruiz", role: "Especialista en Barba", services: ["srv-barb-2", "srv-barb-3"] }
        ],
        promociones: [
            { id: "prm-barb-1", titulo: "Jueves de Barba", descripcion: "15% de descuento en afeitado completo y perfilado.", precioPromo: 30, precioAnterior: 35, imagenUrl: "https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=600&h=400&fit=crop" }
        ],
        resultados: [
            { id: "res-barb-1", title: "Cambio de Look Clásico", description: "Corte fade moderno con peinado estructurado antes/después.", beforeImage: "https://images.unsplash.com/photo-1598524414115-5348b94b88f3?w=500&h=500&fit=crop", afterImage: "https://images.unsplash.com/photo-1605497746444-ac9da58d7ad5?w=500&h=500&fit=crop", serviceId: "srv-barb-1", staffId: "stf-barb-1" }
        ],
        paginas: [
            { id: "pg-barb-1", title: "Nuestra Historia", content: "Barber & Co nació con la visión de revivir el ritual clásico del barbero. Nos enfocamos en el detalle, el trato personalizado y el café de cortesía." },
            { id: "pg-barb-2", title: "Nuestros Productos", content: "Usamos solo pomadas de cera natural, aceites hidratantes para barba sin siliconas y tónicos revitalizantes importados." }
        ]
    },
    {
        slug: "aura-spa",
        nombre: "Aura Wellness & Spa",
        tipoNegocio: "Spa / Centro Estético",
        propietario: "Ana Valenzuela",
        email: "bienestar@auraspa.demo",
        colorPrimario: "#0d9488",
        colorSecundario: "#111827",
        heroTitulo: "Tu Refugio de Serenidad",
        heroSubtitulo: "Tratamientos diseñados para armonizar tu cuerpo, mente y alma.",
        logoUrl: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=150&h=150&fit=crop",
        bannerUrl: "https://images.unsplash.com/photo-1560750588-73207b1ef5b8?w=1200&h=400&fit=crop",
        servicios: [
            { id: "srv-spa-1", nombre: "Limpieza Facial Profunda", duracion: 60, precio: 45 },
            { id: "srv-spa-2", nombre: "Masaje Relajante Corporal", duracion: 60, precio: 60 },
            { id: "srv-spa-3", nombre: "Hidratación Facial con Colágeno", duracion: 45, precio: 40 }
        ],
        profesionales: [
            { id: "stf-spa-1", name: "Ana Valenzuela", role: "Cosmiatra", services: ["srv-spa-1", "srv-spa-3"] },
            { id: "stf-spa-2", name: "Lucía Méndez", role: "Terapeuta Corporal", services: ["srv-spa-2"] }
        ],
        promociones: [
            { id: "prm-spa-1", titulo: "Relax Absoluto", descripcion: "Masaje Relajante de 60m + Limpieza Facial Profunda.", precioPromo: 80, precioAnterior: 105, imagenUrl: "https://images.unsplash.com/photo-1515377905703-c4788e51af15?w=600&h=400&fit=crop" }
        ],
        resultados: [
            { id: "res-spa-1", title: "Limpieza e Hidratación Aura", description: "Piel notablemente más limpia y luminosa después de una sesión de colágeno.", beforeImage: "https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?w=500&h=500&fit=crop", afterImage: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=500&h=500&fit=crop", serviceId: "srv-spa-1", staffId: "stf-spa-1" }
        ],
        paginas: [
            { id: "pg-spa-1", title: "Filosofía Aura", content: "Creemos que la belleza viene de adentro. Aura Wellness ofrece un espacio de desconexión del ajetreo diario con tratamientos holísticos." },
            { id: "pg-spa-2", title: "Políticas de Spa", content: "Por respeto a todos los clientes, solicitamos llegar 10 minutos antes. Las cancelaciones deben hacerse con 12 horas de anticipación." }
        ]
    },
    {
        slug: "bella-nails",
        nombre: "Bella Nails & Lash Studio",
        tipoNegocio: "Centro de Uñas",
        propietario: "Valeria Ramos",
        email: "citas@bellanails.demo",
        colorPrimario: "#db2777",
        colorSecundario: "#1e1b4b",
        heroTitulo: "Arte y Belleza en tus Manos",
        heroSubtitulo: "Manicura, pedicura y extensiones de pestañas con acabados impecables.",
        logoUrl: "https://images.unsplash.com/photo-1604654894610-df63bc536371?w=150&h=150&fit=crop",
        bannerUrl: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=1200&h=400&fit=crop",
        servicios: [
            { id: "srv-nails-1", nombre: "Manicura Express con Gel", duracion: 40, precio: 22 },
            { id: "srv-nails-2", nombre: "Pedicura Spa Exfoliante", duracion: 60, precio: 35 },
            { id: "srv-nails-3", nombre: "Uñas Acrílicas Esculpidas", duracion: 90, precio: 55 }
        ],
        profesionales: [
            { id: "stf-nails-1", name: "Valeria Ramos", role: "Manicurista Senior", services: ["srv-nails-1", "srv-nails-2", "srv-nails-3"] },
            { id: "stf-nails-2", name: "Camila Soto", role: "Lash Artist", services: ["srv-nails-1"] }
        ],
        promociones: [
            { id: "prm-nails-1", titulo: "Combo Bella", descripcion: "Manicura Express con Gel + Pedicura Spa Exfoliante.", precioPromo: 45, precioAnterior: 57, imagenUrl: "https://images.unsplash.com/photo-1519014816548-bf5fe059798b?w=600&h=400&fit=crop" }
        ],
        resultados: [
            { id: "res-nails-1", title: "Diseño Acrílico Esculpido", description: "Uñas esculpidas con pedrería fina y esmaltado permanente premium.", beforeImage: "https://images.unsplash.com/photo-1519014816548-bf5fe059798b?w=500&h=500&fit=crop", afterImage: "https://images.unsplash.com/photo-1604654894610-df63bc536371?w=500&h=500&fit=crop", serviceId: "srv-nails-3", staffId: "stf-nails-1" }
        ],
        paginas: [
            { id: "pg-nails-1", title: "Higiene y Protocolos", content: "Todos nuestros instrumentos son esterilizados en autoclave de grado médico. Tu salud y bienestar son lo primero." }
        ]
    },
    {
        slug: "vortex-fitness",
        nombre: "Vortex Fitness Club",
        tipoNegocio: "Gimnasio",
        propietario: "Martín Silva",
        email: "admin@vortexfit.demo",
        colorPrimario: "#ea580c",
        colorSecundario: "#0f172a",
        heroTitulo: "Alcanza tu Máximo Potencial",
        heroSubtitulo: "Entrenamiento personalizado, asesoría de nutrición y clases de alto rendimiento.",
        logoUrl: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=150&h=150&fit=crop",
        bannerUrl: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=1200&h=400&fit=crop",
        servicios: [
            { id: "srv-fit-1", nombre: "Sesión de Personal Trainer", duracion: 60, precio: 30 },
            { id: "srv-fit-2", nombre: "Evaluación Corporal y Dieta", duracion: 45, precio: 45 },
            { id: "srv-fit-3", nombre: "Pase Diario de Entrenamiento", duracion: 120, precio: 10 }
        ],
        profesionales: [
            { id: "stf-fit-1", name: "Martín Silva", role: "Entrenador Certificado", services: ["srv-fit-1", "srv-fit-3"] },
            { id: "stf-fit-2", name: "Clara Benítez", role: "Nutricionista Deportiva", services: ["srv-fit-2"] }
        ],
        promociones: [
            { id: "prm-fit-1", titulo: "Plan Fit Inicial", descripcion: "1 Sesión de Personal Trainer + Evaluación Corporal Completa.", precioPromo: 60, precioAnterior: 75, imagenUrl: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=600&h=400&fit=crop" }
        ],
        resultados: [
            { id: "res-fit-1", title: "Transformación en 90 días", description: "Cambio notable en composición muscular y pérdida de grasa bajo asesoría.", beforeImage: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=500&h=500&fit=crop", afterImage: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=500&h=500&fit=crop", serviceId: "srv-fit-1", staffId: "stf-fit-1" }
        ],
        paginas: [
            { id: "pg-fit-1", title: "Nuestra Filosofía", content: "En Vortex no vendemos membresías; creamos hábitos de vida. Entrena duro, aliméntate bien y alcanza tus objetivos de salud." }
        ]
    },
    {
        slug: "dental-chip",
        nombre: "Dental Chip - Clínica Dental",
        tipoNegocio: "Odontología",
        propietario: "Dr. Alejandro Ríos",
        email: "sonrisas@dentalchip.demo",
        colorPrimario: "#0284c7",
        colorSecundario: "#0f172a",
        heroTitulo: "Sonrisas Saludables y Radiantes",
        heroSubtitulo: "Odontología general, estética y blanqueamientos con la última tecnología.",
        logoUrl: "https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=150&h=150&fit=crop",
        bannerUrl: "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=1200&h=400&fit=crop",
        servicios: [
            { id: "srv-dent-1", nombre: "Limpieza Dental Profiláctica", duracion: 45, precio: 35 },
            { id: "srv-dent-2", nombre: "Consulta Odontológica General", duracion: 30, precio: 20 },
            { id: "srv-dent-3", nombre: "Blanqueamiento Dental Laser", duracion: 60, precio: 120 }
        ],
        profesionales: [
            { id: "stf-dent-1", name: "Dr. Alejandro Ríos", role: "Cirujano Dentista", services: ["srv-dent-1", "srv-dent-2", "srv-dent-3"] },
            { id: "stf-dent-2", name: "Dra. Sofía Vargas", role: "Ortodoncista", services: ["srv-dent-1", "srv-dent-2"] }
        ],
        promociones: [
            { id: "prm-dent-1", titulo: "Sonrisa Radiante", descripcion: "Blanqueamiento Dental Laser + Limpieza Dental Completa.", precioPromo: 130, precioAnterior: 155, imagenUrl: "https://images.unsplash.com/photo-1475503572774-15a45e5d60b9?w=600&h=400&fit=crop" }
        ],
        resultados: [
            { id: "res-dent-1", title: "Blanqueamiento Dental Laser", description: "Sonrisa 4 tonos más blanca tras una única sesión laser no invasiva.", beforeImage: "https://images.unsplash.com/photo-1606811971618-4486d14f3f99?w=500&h=500&fit=crop", afterImage: "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=500&h=500&fit=crop", serviceId: "srv-dent-3", staffId: "stf-dent-1" }
        ],
        paginas: [
            { id: "pg-dent-1", title: "Tecnología Dental", content: "Contamos con radiografía digital de mínima radiación, odontología laser sin dolor y escáner intraoral 3D para ortodoncia invisible." }
        ]
    }
];

async function main() {
    const passwordHash = await bcrypt.hash("ZendaDemo2026!", 10);
    console.log("🚀 Iniciando generación de los 5 Negocios Demo...");

    // Obtener plan Pro si existe en la base de datos, o crear uno temporal.
    let planPro = await prisma.plan.findFirst({
        where: { name: { contains: "Pro" } }
    });

    if (!planPro) {
        planPro = await prisma.plan.findFirst();
    }

    const planId = planPro ? planPro.id : "plan-pro-id-ficticio";

    for (const data of DEMO_BUSINESSES) {
        console.log(`\n--------------------------------------------`);
        console.log(`📦 Procesando: ${data.nombre} (${data.slug})`);

        // 1. Borrar negocio existente en cascada para recrearlo limpio
        const negocioExistente = await prisma.negocio.findUnique({
            where: { slug: data.slug }
        });

        if (negocioExistente) {
            console.log(`🧹 Negocio existente detectado. Borrando completo...`);
            const nId = negocioExistente.id;

            // Borrado en cascada manual debido a restricciones de BD
            await prisma.appointment.deleteMany({ where: { negocioId: nId } });
            await prisma.cliente.deleteMany({ where: { negocioId: nId } });
            await prisma.staffSchedule.deleteMany({ where: { staff: { businessId: nId } } });
            await prisma.resultado.deleteMany({ where: { businessId: nId } });
            
            // Desconectar servicios de staff antes de borrar
            await prisma.staff.updateMany({
                where: { businessId: nId },
                data: { imageMediaId: null }
            });
            await prisma.staff.deleteMany({ where: { businessId: nId } });
            await prisma.service.deleteMany({ where: { negocioId: nId } });
            await prisma.promotion.deleteMany({ where: { businessId: nId } });
            await prisma.page.deleteMany({ where: { businessId: nId } });
            await prisma.imagen.deleteMany({ where: { negocioId: nId } });
            await prisma.suscripcion.deleteMany({ where: { negocioId: nId } });
            await prisma.usuario.deleteMany({ where: { negocioId: nId } });
            await prisma.negocio.delete({ where: { id: nId } });
            console.log(`✅ Borrado exitoso.`);
        }

        // 2. Crear Negocio
        const negocioId = `demo-id-${data.slug}`;
        const finalConfig = {
            wizardCompleted: true,
            setupCompleted: true,
            createdBySuperAdmin: true,
            tipoNegocio: data.tipoNegocio,
            bannerUrl: data.bannerUrl
        };

        const nuevoNegocio = await prisma.negocio.create({
            data: {
                id: negocioId,
                nombre: data.nombre,
                slug: data.slug,
                whatsapp: "51999999999",
                propietario: data.propietario,
                emailContacto: data.email,
                direccion: "Av. Principal 123",
                ciudad: "Lima",
                horarioApertura: "08:00",
                horarioCierre: "20:00",
                precioHora: 0,
                logoUrl: data.logoUrl,
                estado: "ACTIVO",
                colorPrimario: data.colorPrimario,
                colorSecundario: data.colorSecundario,
                heroTitulo: data.heroTitulo,
                heroSubtitulo: data.heroSubtitulo,
                isDemo: true,
                configuracion: finalConfig,
                updatedAt: new Date()
            }
        });

        // 3. Crear Usuario Admin
        await prisma.usuario.create({
            data: {
                id: `usr-id-${data.slug}`,
                nombre: data.propietario,
                email: data.email,
                password: passwordHash,
                role: "ADMIN",
                negocioId: negocioId,
                updatedAt: new Date()
            }
        });

        // 4. Crear Suscripción Demo (Excluida)
        await prisma.suscripcion.create({
            data: {
                id: `sub-id-${data.slug}`,
                negocioId: negocioId,
                planId: planId,
                estado: "active",
                fechaInicio: new Date(),
                fechaFin: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 año
                isFounder: false,
                updatedAt: new Date()
            }
        });

        // 5. Crear Banner Imagen
        await prisma.imagen.create({
            data: {
                id: `img-banner-${data.slug}`,
                url: data.bannerUrl,
                tipo: "BANNER",
                esBanner: true,
                negocioId: negocioId,
                createdAt: new Date()
            }
        });

        // 6. Crear Servicios
        const srvIdMap = new Map();
        for (const s of data.servicios) {
            const serv = await prisma.service.create({
                data: {
                    id: `srv-id-${data.slug}-${s.id}`,
                    nombre: s.nombre,
                    duracion: s.duracion,
                    precio: s.precio,
                    negocioId: negocioId,
                    extraInfo: { categoryId: null, tipo: null },
                    updatedAt: new Date()
                }
            });
            srvIdMap.set(s.id, serv.id);
        }

        // 7. Crear Especialistas (Staff)
        const stfIdMap = new Map();
        for (const p of data.profesionales) {
            const mappedServices = p.services.map(sid => srvIdMap.get(sid)).filter(Boolean);
            const staff = await prisma.staff.create({
                data: {
                    id: `stf-id-${data.slug}-${p.id}`,
                    businessId: negocioId,
                    name: p.name,
                    role: p.role,
                    active: true,
                    workingHours: {},
                    updatedAt: new Date(),
                    Service: {
                        connect: mappedServices.map(sid => ({ id: sid }))
                    }
                }
            });
            stfIdMap.set(p.id, staff.id);

            // Generar Horarios (StaffSchedule)
            for (let day = 1; day <= 6; day++) {
                await prisma.staffSchedule.create({
                    data: {
                        id: `sch-id-${data.slug}-${p.id}-${day}`,
                        staffId: staff.id,
                        dayOfWeek: day,
                        startTime: "08:00",
                        endTime: "20:00",
                        active: true,
                        breaks: "[]"
                    }
                });
            }
        }

        // 8. Crear Promociones
        for (const pr of data.promociones) {
            await prisma.promotion.create({
                data: {
                    id: `prm-id-${data.slug}-${pr.id}`,
                    businessId: negocioId,
                    titulo: pr.titulo,
                    descripcion: pr.descripcion,
                    precioPromo: pr.precioPromo,
                    precioAnterior: pr.precioAnterior,
                    imagenUrl: pr.imagenUrl,
                    fechaInicio: new Date(),
                    fechaFin: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 días
                    estado: "publicado",
                    updatedAt: new Date()
                }
            });
        }

        // 9. Crear Galería / Resultados Antes/Después
        for (const r of data.resultados) {
            await prisma.resultado.create({
                data: {
                    id: `res-id-${data.slug}-${r.id}`,
                    businessId: negocioId,
                    title: r.title,
                    description: r.description,
                    beforeImage: r.beforeImage,
                    afterImage: r.afterImage,
                    type: "BEFORE_AFTER",
                    staffId: stfIdMap.get(r.staffId) || null,
                    serviceId: srvIdMap.get(r.serviceId) || null,
                    published: true,
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            });
        }

        // 10. Crear Páginas
        for (const pg of data.paginas) {
            await prisma.page.create({
                data: {
                    id: `pg-id-${data.slug}-${pg.id}`,
                    businessId: negocioId,
                    title: pg.title,
                    slug: pg.title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "-"),
                    content: pg.content,
                    status: "PUBLISHED",
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            });
        }

        // 11. Crear Citas y Clientes Ficticios para Actividad
        const clientDemoId = `cli-id-${data.slug}-demo`;
        await prisma.cliente.create({
            data: {
                id: clientDemoId,
                nombre: "Sofía Martínez",
                telefono: "51987654321",
                email: "sofia@gmail.com",
                negocioId: negocioId,
                updatedAt: new Date()
            }
        });

        // Crear una cita confirmada para hoy y una para mañana
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);

        const firstServiceId = srvIdMap.values().next().value;
        const firstStaffId = stfIdMap.values().next().value;

        if (firstServiceId && firstStaffId) {
            await prisma.appointment.create({
                data: {
                    id: `apt-id-${data.slug}-1`,
                    fecha: tomorrow,
                    horaInicio: "10:00",
                    horaFin: "11:00",
                    duracion: 60,
                    estado: "confirmed",
                    pagoEstado: "PENDIENTE",
                    total: 30,
                    clienteId: clientDemoId,
                    serviceId: firstServiceId,
                    staffId: firstStaffId,
                    negocioId: negocioId,
                    updatedAt: new Date()
                }
            });
            console.log(`📅 Cita de simulación generada.`);
        }

        console.log(`✅ Negocio ${data.nombre} configurado por completo.`);
    }

    console.log("\n✨ ¡PROCESO DE GENERACIÓN DE NEGOCIOS DEMO FINALIZADO CON ÉXITO!");
    await prisma.$disconnect();
}

main().catch(async (e) => {
    console.error("❌ Error durante la generación:", e);
    await prisma.$disconnect();
    process.exit(1);
});
