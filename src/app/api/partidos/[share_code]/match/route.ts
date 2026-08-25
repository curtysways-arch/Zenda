import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { getServerSession } from "next-auth";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ share_code: string }> }
) {
    try {
        const { share_code } = await params;
        const match = await (prisma as any).sharedMatch.findUnique({
            where: { share_code },
            include: {
                players: true,
                games: true,
            }
        });
        return NextResponse.json(match);
    } catch (e) { return NextResponse.json({ error: "No encontrado" }, { status: 404 }); }
}

export async function PUT(
    req: Request,
    { params }: { params: Promise<{ share_code: string }> }
) {
    try {
        const { share_code } = await params;
        const body = await req.json();
        const { estado_partido, equipo_a_nombre, equipo_b_nombre, equipo_a_goles, equipo_b_goles } = body;

        const partido = await (prisma as any).sharedMatch.findUnique({
            where: { share_code },
            include: { reserva: { include: { cliente: true } } }
        });

        if (!partido) return NextResponse.json({ error: "Partido no encontrado" }, { status: 404 });

        const updateData: any = {};
        if (estado_partido !== undefined) updateData.estado_partido = estado_partido;
        if (equipo_a_nombre !== undefined) updateData.equipo_a_nombre = equipo_a_nombre;
        if (equipo_b_nombre !== undefined) updateData.equipo_b_nombre = equipo_b_nombre;
        if (equipo_a_goles !== undefined) updateData.equipo_a_goles = Math.max(0, parseInt(equipo_a_goles));
        if (equipo_b_goles !== undefined) updateData.equipo_b_goles = Math.max(0, parseInt(equipo_b_goles));

        await (prisma as any).sharedMatch.update({
            where: { id: partido.id },
            data: updateData
        });

        return NextResponse.json({ success: true });
    } catch (error) { return NextResponse.json({ error: 'Error del servidor' }, { status: 500 }); }
}

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ share_code: string }> }
) {
    try {
        const { share_code } = await params;
        const body = await req.json();
        const { playerId, ya_pago, status } = body;

        const partido = await (prisma as any).sharedMatch.findUnique({
            where: { share_code },
            include: { reserva: { include: { cliente: true } } }
        });

        if (!partido) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

        const updateData: any = {};
        if (ya_pago !== undefined) updateData.ya_pago = ya_pago;
        if (status !== undefined) updateData.status = status;

        await (prisma as any).sharedMatchPlayer.update({
            where: { id: playerId },
            data: updateData
        });

        return NextResponse.json({ success: true });
    } catch (e) { return NextResponse.json({ error: "Error" }, { status: 500 }); }
}

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ share_code: string }> }
) {
    try {
        const { share_code } = await params;
        const body = await req.json();
        const { playerId } = body;

        const partido = await (prisma as any).sharedMatch.findUnique({
            where: { share_code },
            include: { reserva: { include: { cliente: true } } }
        });

        if (!partido) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

        await (prisma as any).sharedMatchPlayer.delete({
            where: { id: playerId }
        });

        return NextResponse.json({ success: true });
    } catch (e) { return NextResponse.json({ error: "Error" }, { status: 500 }); }
}
