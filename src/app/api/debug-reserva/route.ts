import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "No id" });
    const res = await prisma.appointment.findUnique({
        where: { id },
        include: { cliente: true }
    });
    return NextResponse.json(res);
}
