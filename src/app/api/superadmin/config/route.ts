import { NextResponse } from "next/server";
import { getTeamContext } from "@/lib/admin/teamGuard";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import crypto from 'crypto';

async function isSuperAdmin() {
    // Usuario del equipo Citiox; el permiso de cada acción lo valida el middleware (lib/admin/teamAccessMap)
    return Boolean(await getTeamContext());
}

export async function GET() {
    if (!await isSuperAdmin()) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    try {
        const configs = await prisma.globalConfig.findMany();
        return NextResponse.json(configs);
    } catch (error) {
        return NextResponse.json({ error: "Error al obtener configuración" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    if (!await isSuperAdmin()) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { clave, valor } = body;

        if (!clave || valor === undefined) {
            return NextResponse.json({ error: "Faltan campos" }, { status: 400 });
        }

        const config = await prisma.globalConfig.upsert({
            where: { clave },
            update: { valor },
            create: {
                id: crypto.randomUUID(),
                clave,
                valor
            }
        });

        return NextResponse.json(config);
    } catch (error) {
        return NextResponse.json({ error: "Error al guardar configuración" }, { status: 500 });
    }
}
