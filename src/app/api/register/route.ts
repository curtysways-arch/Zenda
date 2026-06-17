import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { planService } from "@/lib/services/planService";
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
            telefono        // Teléfono (opcional)
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

        // Crear Negocio y Usuario Admin en una transacción
        const result = await prisma.$transaction(async (tx) => {
            // 1. Crear el Negocio
            const nuevoNegocio = await (tx.negocio as any).create({
                data: {
                    id: crypto.randomUUID(),
                    nombre: negocioNombre,
                    slug: slug,
                    ciudad: ciudad,
                    whatsapp: telefono || null,
                    horarioApertura: "08:00",
                    horarioCierre: "22:00",
                    precioHora: 0,
                    estado: 'ACTIVO',
                    colorPrimario: '#1dc95c',
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

        // 3. Asignar el plan por defecto (Trial)
        try {
            await planService.assignDefaultPlan(result.nuevoNegocio.id);
        } catch (planError) {
            console.error("⚠️ Error al asignar plan trial:", planError);
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
