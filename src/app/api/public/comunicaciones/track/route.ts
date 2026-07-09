import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { communicationId, action } = body; // action: 'CLICK' | 'CONVERSION'

    if (!communicationId || !action) {
      return NextResponse.json({ error: "Campos requeridos faltantes" }, { status: 400 });
    }

    const userEmail = session.user.email || "";
    const user = await prisma.usuario.findFirst({
      where: { email: userEmail },
    });

    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    // 1. Intentar actualizar el recipient específico del usuario
    const recipient = await prisma.globalCommunicationRecipient.findFirst({
      where: {
        communicationId,
        userId: user.id,
      },
    });

    if (recipient) {
      await prisma.globalCommunicationRecipient.update({
        where: { id: recipient.id },
        data: {
          estado: "LEIDO",
          fechaClic: action === "CLICK" ? new Date() : recipient.fechaClic,
          fechaConversion: action === "CONVERSION" ? new Date() : recipient.fechaConversion,
        },
      });
    }

    // 2. Incrementar la estadística consolidada de la campaña
    const analytics = await prisma.globalCommunicationAnalytics.findFirst({
      where: { communicationId },
    });

    if (analytics) {
      await prisma.globalCommunicationAnalytics.update({
        where: { id: analytics.id },
        data: {
          clicks: action === "CLICK" ? { increment: 1 } : undefined,
          conversiones: action === "CONVERSION" ? { increment: 1 } : undefined,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Track Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
