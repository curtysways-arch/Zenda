import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import crypto from "crypto";

export const dynamic = 'force-dynamic';

/**
 * GET /api/superadmin/coupon-templates
 * Lista todas las plantillas de cupones globales.
 *
 * POST /api/superadmin/coupon-templates
 * Crea una nueva plantilla de cupón global.
 * Body: { nombre, descripcion, config, activo }
 */

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const soloActivos = searchParams.get('activo') === 'true';

        const templates = await prisma.couponTemplate.findMany({
            where: soloActivos ? { activo: true } : undefined,
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json(templates);

    } catch (error: any) {
        console.error("[GET /api/superadmin/coupon-templates] Error:", error);
        return NextResponse.json({ error: "Internal Error", details: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { nombre, descripcion, config, activo } = body;

        if (!nombre || !descripcion || !config) {
            return NextResponse.json({ error: "nombre, descripcion y config son obligatorios" }, { status: 400 });
        }

        const template = await prisma.couponTemplate.create({
            data: {
                id: crypto.randomUUID(),
                nombre,
                descripcion,
                config,
                activo: activo !== undefined ? activo : true,
            },
        });

        return NextResponse.json(template, { status: 201 });

    } catch (error: any) {
        console.error("[POST /api/superadmin/coupon-templates] Error:", error);
        return NextResponse.json({ error: "Internal Error", details: error.message }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    try {
        const body = await req.json();
        const { id, nombre, descripcion, config, activo } = body;

        if (!id) return NextResponse.json({ error: "id es obligatorio" }, { status: 400 });

        const template = await prisma.couponTemplate.update({
            where: { id },
            data: {
                ...(nombre !== undefined && { nombre }),
                ...(descripcion !== undefined && { descripcion }),
                ...(config !== undefined && { config }),
                ...(activo !== undefined && { activo }),
            },
        });

        return NextResponse.json(template);

    } catch (error: any) {
        console.error("[PUT /api/superadmin/coupon-templates] Error:", error);
        return NextResponse.json({ error: "Internal Error", details: error.message }, { status: 500 });
    }
}
