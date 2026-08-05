
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

        let roles = await (prisma as any).role.findMany({
            orderBy: { name: 'asc' }
        });

        if (!roles || roles.length === 0) {
            // Crear roles básicos del sistema si aún no existen
            const defaultNames = ['ADMIN', 'STAFF', 'RECEPCIONISTA'];
            roles = [];
            for (const name of defaultNames) {
                const created = await (prisma as any).role.upsert({
                    where: { name },
                    update: {},
                    create: { id: name.toLowerCase(), name }
                });
                roles.push(created);
            }
        }

        return NextResponse.json(roles);
    } catch (error) {
        console.error("Error fetching roles:", error);
        return NextResponse.json([
            { id: 'admin', name: 'ADMIN' },
            { id: 'staff', name: 'STAFF' },
            { id: 'recepcionista', name: 'RECEPCIONISTA' }
        ]);
    }
}
