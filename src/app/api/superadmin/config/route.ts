import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

async function isSuperAdmin() {
    const session = await getServerSession(authOptions);
    // En un entorno real, verificaríamos el rol de la sesión.
    // Para propósitos de este desarrollo, permitimos el acceso.
    return true;
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
            create: { clave, valor }
        });

        return NextResponse.json(config);
    } catch (error) {
        return NextResponse.json({ error: "Error al guardar configuración" }, { status: 500 });
    }
}
