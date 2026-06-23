import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { planService } from "@/lib/services/planService";
import crypto from "crypto";

async function isSuperAdmin() {
    const session = await getServerSession(authOptions);
    // DEBUG: Permitimos acceso total temporalmente local
    return true;
}

export async function POST(req: Request) {
    if (!await isSuperAdmin()) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const {
            nombre,
            slug,
            whatsapp,
            direccion,
            ciudad,
            propietario,
            emailContacto,
            horarioApertura,
            horarioCierre,
            precioHora,
            logoUrl,
            adminEmail,
            adminPassword,
            adminNombre,
            plan_id,
            
            // Campos extendidos del Wizard
            tipoNegocio,
            colorPrimario,
            colorSecundario,
            heroTitulo,
            heroSubtitulo,
            bannerUrl,
            bannerUrls, // Múltiples fotos de portada
            diasAtencion, // Array de números [1, 2, 3, 4, 5, 6] (1=Lunes, 7=Domingo)
            servicios, // Array: { id, nombre, duracion, precio, imageMediaId }
            profesionales, // Array: { name, role, imageMediaId, servicesIds }
            crearDemo // Booleano
        } = body;

        // Validaciones básicas
        if (!nombre || !slug || (!adminEmail && !emailContacto) || !adminPassword) {
            return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 });
        }

        // Verificar si el slug ya existe
        const existingNegocio = await prisma.negocio.findUnique({ where: { slug } });
        if (existingNegocio) {
            return NextResponse.json({ error: "El slug ya está registrado" }, { status: 400 });
        }

        // Verificar si el email ya existe
        const finalEmail = adminEmail || emailContacto;
        const existingUser = await prisma.usuario.findUnique({ where: { email: finalEmail } });
        if (existingUser) {
            return NextResponse.json({ error: "El correo electrónico del administrador ya está registrado" }, { status: 400 });
        }

        const hashedPassword = await bcrypt.hash(adminPassword, 10);
        const businessId = crypto.randomUUID();

        // Determinar banners principales para la configuración
        const primaryBanner = (Array.isArray(bannerUrls) && bannerUrls.length > 0)
            ? bannerUrls[0]
            : (bannerUrl || (crearDemo ? "https://images.unsplash.com/photo-1560750588-73207b1ef5b8?w=1200&h=400&fit=crop" : null));

        // 1. Configuración del JSON
        const configuracionJson = {
            wizardCompleted: true,
            setupCompleted: true,
            createdBySuperAdmin: true,
            tipoNegocio: tipoNegocio || "Otro",
            bannerUrl: primaryBanner
        };

        // Procesar transaccionalmente
        const result = await prisma.$transaction(async (tx) => {
            // A. Crear Negocio
            const nuevoNegocio = await (tx.negocio as any).create({
                data: {
                    id: businessId,
                    nombre,
                    slug,
                    whatsapp: whatsapp || null,
                    propietario: propietario || null,
                    emailContacto: emailContacto || null,
                    direccion: direccion || null,
                    ciudad: cityMapper(ciudad),
                    horarioApertura: horarioApertura || "08:00",
                    horarioCierre: horarioCierre || "22:00",
                    precioHora: parseFloat(precioHora?.toString()) || 0,
                    logoUrl: logoUrl || (crearDemo ? "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=150&h=150&fit=crop" : null),
                    estado: 'ACTIVO',
                    colorPrimario: colorPrimario || '#1dc95c',
                    colorSecundario: colorSecundario || '#112117',
                    heroTitulo: heroTitulo || `Bienvenido a ${nombre}`,
                    heroSubtitulo: heroSubtitulo || "Reserva tu cita de forma online en sencillos pasos.",
                    configuracion: configuracionJson,
                    updatedAt: new Date()
                }
            });

            // B. Crear Usuario Admin
            const nuevoUsuario = await tx.usuario.create({
                data: {
                    id: crypto.randomUUID(),
                    nombre: adminNombre || propietario || nombre,
                    email: finalEmail,
                    password: hashedPassword,
                    role: 'ADMIN',
                    negocioId: businessId,
                    updatedAt: new Date()
                }
            });

            // C. Guardar Banners en Tabla Imagen
            let finalBanners: string[] = [];
            if (Array.isArray(bannerUrls) && bannerUrls.length > 0) {
                finalBanners = bannerUrls.filter(u => u && u.trim() !== '');
            } else if (bannerUrl) {
                finalBanners = [bannerUrl];
            } else if (crearDemo) {
                finalBanners = ["https://images.unsplash.com/photo-1560750588-73207b1ef5b8?w=1200&h=400&fit=crop"];
            }

            for (const url of finalBanners) {
                await (tx.imagen as any).create({
                    data: {
                        id: crypto.randomUUID(),
                        url: url,
                        tipo: "BANNER",
                        esBanner: true,
                        negocioId: businessId,
                        createdAt: new Date()
                    }
                });
            }

            // D. Crear Servicios
            let serviciosCreados: any[] = [];
            const serviciosInput = servicios && Array.isArray(servicios) ? servicios : [];

            // Si es demo y no hay servicios, usar servicios sugeridos según categoría
            let finalServiciosInput = [...serviciosInput];
            if (crearDemo && finalServiciosInput.length === 0) {
                const suggs: Record<string, Array<{nombre: string, duracion: number, precio: number}>> = {
                    "Spa / Centro Estético": [
                        { nombre: "Limpieza Facial Profunda", duracion: 60, precio: 45 },
                        { nombre: "Masaje Relajante Corporal", duracion: 60, precio: 50 },
                        { nombre: "Hidratación Facial con Colágeno", duracion: 45, precio: 35 }
                    ],
                    "Barbería": [
                        { nombre: "Corte Clásico de Cabello", duracion: 30, precio: 15 },
                        { nombre: "Corte + Afeitado de Barba", duracion: 50, precio: 25 },
                        { nombre: "Perfilado y Diseño de Barba", duracion: 20, precio: 10 }
                    ],
                    "Salón de Belleza": [
                        { nombre: "Corte de Dama y Estilo", duracion: 45, precio: 30 },
                        { nombre: "Tinte Completo e Hidratación", duracion: 90, precio: 65 },
                        { nombre: "Lavado y Secado Profesional", duracion: 30, precio: 20 }
                    ],
                    "Centro de Uñas": [
                        { nombre: "Manicura Express con Gel", duracion: 40, precio: 18 },
                        { nombre: "Pedicura Spa Exfoliante", duracion: 60, precio: 28 },
                        { nombre: "Uñas Acrílicas Esculpidas", duracion: 90, precio: 45 }
                    ]
                };
                
                const categoria = tipoNegocio || "Spa / Centro Estético";
                const listaDemo = suggs[categoria] || [
                    { nombre: "Servicio Premium A", duracion: 45, precio: 30 },
                    { nombre: "Servicio de Relajación B", duracion: 60, precio: 45 },
                    { nombre: "Evaluación Personalizada", duracion: 30, precio: 20 }
                ];

                finalServiciosInput = listaDemo.map(s => ({
                    id: crypto.randomUUID(),
                    nombre: s.nombre,
                    duracion: s.duracion,
                    precio: s.precio,
                    imageMediaId: undefined
                }));
            }

            for (const s of finalServiciosInput) {
                const sId = s.id || crypto.randomUUID();
                const serv = await (tx.service as any).create({
                    data: {
                        id: sId,
                        nombre: s.nombre,
                        duracion: parseInt(s.duracion?.toString()) || 30,
                        precio: parseFloat(s.precio?.toString()) || 0,
                        negocioId: businessId,
                        imageMediaId: s.imageMediaId || null,
                        extraInfo: { categoryId: null, tipo: null },
                        updatedAt: new Date()
                    }
                });
                serviciosCreados.push(serv);
            }

            // E. Crear Profesionales
            const profesionalesInput = profesionales && Array.isArray(profesionales) ? profesionales : [];
            let finalProfesionalesInput = [...profesionalesInput];

            if (crearDemo && finalProfesionalesInput.length === 0) {
                finalProfesionalesInput = [{
                    name: "Carlos Gómez",
                    role: "Especialista Principal",
                    imageMediaId: undefined,
                    servicesIds: serviciosCreados.map(s => s.id)
                }];
            }

            const activeDays = (diasAtencion && Array.isArray(diasAtencion) && diasAtencion.length > 0)
                ? diasAtencion
                : [1, 2, 3, 4, 5, 6]; // L-S por defecto

            for (const p of finalProfesionalesInput) {
                const staffId = crypto.randomUUID();
                const matchedServices = serviciosCreados.filter(s => 
                    p.servicesIds && Array.isArray(p.servicesIds) && p.servicesIds.includes(s.id)
                );

                await (tx.staff as any).create({
                    data: {
                        id: staffId,
                        businessId: businessId,
                        name: p.name,
                        role: p.role || "Especialista",
                        active: true,
                        imageMediaId: p.imageMediaId || null,
                        workingHours: {},
                        updatedAt: new Date(),
                        // Relacionar servicios en tabla pivot de Prisma
                        Service: {
                            connect: matchedServices.map(s => ({ id: s.id }))
                        }
                    }
                });

                // F. Generar Horarios (StaffSchedule)
                for (const day of activeDays) {
                    await (tx.staffSchedule as any).create({
                        data: {
                            id: crypto.randomUUID(),
                            staffId: staffId,
                            dayOfWeek: parseInt(day.toString()),
                            startTime: horarioApertura || "08:00",
                            endTime: horarioCierre || "22:00",
                            active: true,
                            breaks: "[]"
                        }
                    });
                }

                // G. Crear citas demo en el calendario
                if (crearDemo && serviciosCreados.length > 0) {
                    // Crear Cliente Demo
                    const clientDemoId = crypto.randomUUID();
                    await (tx.cliente as any).create({
                        data: {
                            id: clientDemoId,
                            nombre: "Sofía Martínez",
                            telefono: "987654321",
                            email: "sofia@gmail.com",
                            negocioId: businessId,
                            updatedAt: new Date()
                        }
                    });

                    // Generar 3 fechas ficticias
                    const dates = [
                        { hours: 10, offset: 1, state: 'confirmed' }, // Mañana
                        { hours: 14, offset: 2, state: 'confirmed' }, // Pasado mañana
                        { hours: 16, offset: 3, state: 'pending' }   // En 3 días
                    ];

                    for (let i = 0; i < Math.min(dates.length, serviciosCreados.length); i++) {
                        const dConfig = dates[i];
                        const dateObj = new Date();
                        dateObj.setDate(dateObj.getDate() + dConfig.offset);
                        dateObj.setHours(0, 0, 0, 0);

                        const serv = serviciosCreados[i];
                        const durationMin = serv.duracion || 60;
                        const hrIni = `${dConfig.hours.toString().padStart(2, '0')}:00`;
                        const hrFin = `${(dConfig.hours + Math.ceil(durationMin/60)).toString().padStart(2, '0')}:${(durationMin % 60).toString().padStart(2, '0')}`;

                        await (tx.appointment as any).create({
                            data: {
                                id: crypto.randomUUID(),
                                fecha: dateObj,
                                horaInicio: hrIni,
                                horaFin: hrFin,
                                duracion: durationMin,
                                estado: dConfig.state,
                                pagoEstado: 'PENDIENTE',
                                total: serv.precio,
                                clienteId: clientDemoId,
                                serviceId: serv.id,
                                staffId: staffId,
                                negocioId: businessId,
                                updatedAt: new Date()
                            }
                        });
                    }
                }
            }

            return { nuevoNegocio, nuevoUsuario };
        });

        // H. Asignar el plan PRO Trial por 14 días
        try {
            // Si el Superadmin seleccionó un plan_id, usar ese, sino el planService asignará el plan PRO Trial por defecto.
            if (plan_id) {
                await planService.assignPlanToBusiness(result.nuevoNegocio.id, plan_id);
            } else {
                await planService.assignDefaultPlan(result.nuevoNegocio.id);
            }
        } catch (planError) {
            console.error("Error al asignar plan por defecto:", planError);
        }

        return NextResponse.json(result.nuevoNegocio);
    } catch (error: any) {
        console.error("Error creating business:", error);
        return NextResponse.json({ error: "Error al crear el negocio: " + error.message }, { status: 500 });
    }
}

function cityMapper(city: any) {
    if (!city) return null;
    return city.toString();
}

