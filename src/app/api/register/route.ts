import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { planService } from "@/lib/services/planService";
import { BranchService } from "@/core/branch/BranchService";
import crypto from "crypto";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const {
            nombre,         // Nombre del usuario
            email,          // Email del usuario
            password,       // Contraseña
            negocioNombre,  // Nombre del negocio
            ciudad,         // Ciudad
            telefono,       // Teléfono (opcional)
            tipoNegocio     // Tipo / Blueprint del negocio (opcional)
        } = body;

        // Validaciones básicas
        if (!nombre || !email || !password || !negocioNombre || !ciudad) {
            return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 });
        }

        if (password.length < 6) {
            return NextResponse.json({ error: "La contraseña debe tener al menos 6 caracteres" }, { status: 400 });
        }

        // Verificar si el email ya existe
        const existingEmail = await prisma.usuario.findUnique({ where: { email } });
        if (existingEmail) {
            return NextResponse.json({ error: "El email ya está registrado" }, { status: 400 });
        }

        // Generar slug básico a partir del nombre del negocio
        const baseSlug = negocioNombre
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, '')
            .replace(/[\s_]+/g, '-')
            .replace(/^-+|-+$/g, '');

        // Asegurar que el slug sea único
        let slug = baseSlug;
        let counter = 1;
        let slugExists = await prisma.negocio.findUnique({ where: { slug } });

        while (slugExists) {
            slug = `${baseSlug}-${counter}`;
            slugExists = await prisma.negocio.findUnique({ where: { slug } });
            counter++;
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const normalizedTipo = (tipoNegocio || 'GENERAL').toUpperCase().trim();
        
        let finalTipo = 'SERVICIOS';
        if (['LAVANDERIA', 'LAVADO', 'SHOE_CARE', 'LAUNDRY'].includes(normalizedTipo)) finalTipo = 'LAVANDERIA';
        else if (['ODONTOLOGIA', 'DENTISTA', 'DENTAL', 'CLINICA'].includes(normalizedTipo)) finalTipo = 'ODONTOLOGIA';
        else if (['RESTAURANTE', 'GASTRONOMIA', 'BAR', 'COMIDA'].includes(normalizedTipo)) finalTipo = 'RESTAURANTE';
        else if (['TIENDA', 'ECOMMERCE', 'PRODUCTOS', 'RETAIL'].includes(normalizedTipo)) finalTipo = 'TIENDA';
        else if (['CANCHAS', 'SPORTS_COURTS', 'PADEL', 'FUTBOL'].includes(normalizedTipo)) finalTipo = 'SPORTS_COURTS';
        else if (['BARBERIA', 'PELUQUERIA', 'SALON', 'BARBER'].includes(normalizedTipo)) finalTipo = 'BARBERIA';
        else if (['SPA', 'CENTRO_ESTETICA', 'ESTETICA', 'BELLEZA'].includes(normalizedTipo)) finalTipo = 'SPA';
        else if (['GIMNASIO', 'GYM', 'FITNESS', 'CROSSFIT'].includes(normalizedTipo)) finalTipo = 'GIMNASIO';
        else if (['SERVICIOS', 'RESERVA', 'GENERAL'].includes(normalizedTipo)) finalTipo = 'SERVICIOS';
        else finalTipo = normalizedTipo;

        const primaryColor = 
            finalTipo === 'RESTAURANTE' ? '#ea580c' :
            finalTipo === 'TIENDA' ? '#4f46e5' :
            finalTipo === 'SPORTS_COURTS' ? '#10b981' :
            finalTipo === 'LAVANDERIA' ? '#7C3AED' :
            finalTipo === 'ODONTOLOGIA' ? '#00c7b1' :
            finalTipo === 'BARBERIA' ? '#0284c7' :
            finalTipo === 'SPA' ? '#ec4899' :
            finalTipo === 'GIMNASIO' ? '#f97316' : '#2563eb';

        const configData: any = {
            blueprintId: finalTipo,
            tipoNegocio: finalTipo,
            wizardCompleted: false
        };

        if (finalTipo === 'LAVANDERIA') {
            configData.delivery = true;
            configData.loyalty_module = true;
            configData.activeCapabilities = {
                ecommerce: true,
                orders: true,
                catalog: true,
                products: true,
                inventory: true,
                service_orders: true,
                delivery: true
            };
        } else if (finalTipo === 'ODONTOLOGIA') {
            configData.activeCapabilities = {
                appointments: true,
                services: true,
                loyalty: true,
                coupons: true,
                catalog: false,
                ecommerce: false
            };
        } else if (finalTipo === 'RESTAURANTE') {
            configData.activeCapabilities = {
                catalog: true,
                orders: true,
                delivery: true,
                qr_tables: true,
                loyalty: true,
                coupons: true
            };
        } else if (finalTipo === 'TIENDA') {
            configData.activeCapabilities = {
                catalog: true,
                products: true,
                orders: true,
                delivery: true,
                ecommerce: true,
                loyalty: true,
                coupons: true
            };
        } else if (finalTipo === 'SPORTS_COURTS') {
            configData.activeCapabilities = {
                reservations: true,
                academy: true,
                loyalty: true,
                coupons: true
            };
        } else if (finalTipo === 'BARBERIA' || finalTipo === 'SPA') {
            configData.activeCapabilities = {
                appointments: true,
                services: true,
                specialists: true,
                loyalty: true,
                coupons: true
            };
        } else if (finalTipo === 'GIMNASIO') {
            configData.activeCapabilities = {
                memberships: true,
                access: true,
                attendance: true,
                loyalty: true,
                coupons: true
            };
        } else {
            configData.activeCapabilities = {
                appointments: true,
                services: true,
                loyalty: true,
                coupons: true
            };
        }

        // Crear Negocio y Usuario Admin en una transacción
        const result = await prisma.$transaction(async (tx) => {
            // 1. Crear el Negocio
            const nuevoNegocio = await (tx.negocio as any).create({
                data: {
                    id: crypto.randomUUID(),
                    nombre: negocioNombre,
                    slug: slug,
                    ciudad: ciudad,
                    tipoNegocio: finalTipo,
                    configuracion: configData,
                    whatsapp: telefono || null,
                    horarioApertura: "08:00",
                    horarioCierre: "22:00",
                    precioHora: 0,
                    estado: 'ACTIVO',
                    colorPrimario: primaryColor,
                    colorSecundario: '#112117',
                    updatedAt: new Date()
                }
            });

            // 2. Crear el Usuario
            const nuevoUsuario = await tx.usuario.create({
                data: {
                    id: crypto.randomUUID(),
                    nombre: nombre,
                    email: email,
                    password: hashedPassword,
                    role: 'ADMIN',
                    negocioId: nuevoNegocio.id,
                    updatedAt: new Date()
                }
            });

            return { nuevoNegocio, nuevoUsuario };
        });

        // 3. Asignar el plan seleccionado o por defecto (Trial)
        try {
            await planService.assignDefaultPlan(result.nuevoNegocio.id, body.planId || body.plan);
        } catch (planError) {
            console.error("⚠️ Error al asignar plan trial:", planError);
        }

        // 4. Crear Sucursal Matriz inicial, Caja Registradora y Acceso
        try {
            await BranchService.createBranch(result.nuevoNegocio.id, {
                name: 'Sucursal Matriz',
                code: 'SEDE-01',
                address: body.direccion || body.ciudad || null,
                city: body.ciudad || null,
                phone: body.telefono || null,
                isDefault: true
            });
        } catch (branchError) {
            console.error("⚠️ Error al crear sucursal matriz:", branchError);
        }

        // 5. Notificar al Super Admin por WhatsApp
        try {
            const { notifyAdminBusinessCreated } = await import('@/lib/adminNotificationHelper');
            await notifyAdminBusinessCreated({
                businessName: negocioNombre,
                slug: result.nuevoNegocio.slug,
                city: ciudad,
                businessType: normalizedTipo,
                userName: nombre,
                userEmail: email,
                userPhone: telefono || null
            });
        } catch (notifErr) {
            console.error("⚠️ Error enviando WhatsApp al admin por nuevo negocio:", notifErr);
        }

        return NextResponse.json({
            success: true,
            message: "Registro completado con éxito",
            negocioId: result.nuevoNegocio.id
        });

    } catch (error: any) {
        console.error("❌ Register API Error:", error);
        return NextResponse.json({ error: "Error en el servidor al procesar el registro" }, { status: 500 });
    }
}
