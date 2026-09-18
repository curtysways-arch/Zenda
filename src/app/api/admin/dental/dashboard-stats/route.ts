import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    let negocioId = (session.user as any).negocioId;
    if (!negocioId && session.user.email) {
      const u = await prisma.usuario.findUnique({ where: { email: session.user.email } });
      negocioId = u?.negocioId;
    }

    if (!negocioId) {
      return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 403 });
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const [citasHoyCount, pacientesTotal, tratamientosCount, proximasCitas, encountersHoyCount] = await Promise.all([
      prisma.appointment.count({
        where: {
          negocioId,
          fecha: { gte: todayStart, lte: todayEnd },
          estado: { notIn: ['cancelled', 'cancelada'] }
        }
      }),
      prisma.cliente.count({
        where: { negocioId }
      }),
      prisma.dentalTreatment.count({
        where: {
          negocioId,
          estado: { in: ['PLANIFICADO', 'PENDIENTE', 'EN_PROCESO'] }
        }
      }),
      prisma.appointment.findMany({
        where: {
          negocioId,
          fecha: { gte: todayStart },
          estado: { notIn: ['cancelled', 'cancelada'] }
        },
        include: {
          cliente: { select: { id: true, nombre: true, telefono: true } },
          service: { select: { id: true, nombre: true } },
          staff: { select: { id: true, name: true } }
        },
        orderBy: [{ fecha: 'asc' }, { horaInicio: 'asc' }],
        take: 6
      }),
      prisma.clinicalEncounter.count({
        where: {
          negocioId,
          fecha: { gte: todayStart, lte: todayEnd }
        }
      })
    ]);

    return NextResponse.json({
      success: true,
      stats: {
        citasHoy: citasHoyCount,
        pacientesTotal,
        consultasPendientes: Math.max(0, citasHoyCount - encountersHoyCount),
        tratamientosEnProceso: tratamientosCount
      },
      proximasCitas
    });
  } catch (err: any) {
    console.error('Error en dental dashboard-stats:', err);
    return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 });
  }
}
