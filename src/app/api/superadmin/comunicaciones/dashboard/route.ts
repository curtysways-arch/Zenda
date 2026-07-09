import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { subDays, startOfDay, endOfDay } from "date-fns";

async function getSuperAdminSession() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  const roles = (session?.user as any)?.roles || [];
  const isSA = role === 'SUPERADMIN' || role === 'SUPER_ADMIN' || roles.includes('SUPERADMIN');
  if (!session || !isSA) {
    return null;
  }
  return session;
}

export async function GET() {
  const session = await getSuperAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const now = new Date();
    const startToday = startOfDay(now);
    const endToday = endOfDay(now);

    // 1. Estadísticas rápidas
    const [
      mensajesHoy,
      pushEnviados,
      pushEntregados,
      pushFallidos,
      programados,
      borradores,
      agregados,
    ] = await Promise.all([
      prisma.globalCommunicationRecipient.count({
        where: { createdAt: { gte: startToday, lte: endToday } },
      }),
      prisma.globalCommunicationRecipient.count({
        where: { canal: "PUSH" },
      }),
      prisma.globalCommunicationRecipient.count({
        where: { canal: "PUSH", estado: { in: ["ENTREGADO", "LEIDO", "CLIC", "CONVERTIDO"] } },
      }),
      prisma.globalCommunicationRecipient.count({
        where: { canal: "PUSH", estado: "ERROR" },
      }),
      prisma.globalCommunication.count({
        where: { estado: "PROGRAMADO" },
      }),
      prisma.globalCommunication.count({
        where: { estado: "BORRADOR" },
      }),
      prisma.globalCommunicationAnalytics.aggregate({
        _sum: {
          enviados: true,
          entregados: true,
          clicks: true,
          conversiones: true,
          negociosAlcanzados: true,
          clientesAlcanzados: true,
        },
      }),
    ]);

    const stats = {
      mensajesHoy,
      pushEnviados,
      pushEntregados,
      pushFallidos,
      programados,
      borradores,
      negociosAlcanzados: agregados._sum.negociosAlcanzados || 0,
      clientesAlcanzados: agregados._sum.clientesAlcanzados || 0,
      conversiones: agregados._sum.conversiones || 0,
      clicks: agregados._sum.clicks || 0,
      ctr: agregados._sum.enviados ? ((agregados._sum.clicks || 0) / agregados._sum.enviados) * 100 : 0,
    };

    // 2. Gráfico por canal
    const canals = ["APP", "PUSH", "WHATSAPP", "EMAIL", "BANNER", "POPUP"];
    const canalStats = await Promise.all(
      canals.map(async canal => {
        const count = await prisma.globalCommunicationRecipient.count({
          where: { canal },
        });
        return { label: canal, value: count };
      })
    );

    // 3. Gráfico de evolución semanal (últimos 7 días)
    const ultimos7Dias = Array.from({ length: 7 }, (_, i) => subDays(now, i)).reverse();
    const evolGrafico = await Promise.all(
      ultimos7Dias.map(async date => {
        const start = startOfDay(date);
        const end = endOfDay(date);
        const count = await prisma.globalCommunicationRecipient.count({
          where: { createdAt: { gte: start, lte: end } },
        });
        return {
          fecha: date.toLocaleDateString("es-ES", { day: "2-digit", month: "short" }),
          valor: count,
        };
      })
    );

    return NextResponse.json({
      stats,
      canalStats,
      evolGrafico,
    });
  } catch (error: any) {
    console.error("Dashboard Analytics Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
