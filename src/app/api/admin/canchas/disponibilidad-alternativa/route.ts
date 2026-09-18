// src/app/api/admin/canchas/disponibilidad-alternativa/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getEffectiveAdminSession } from '@/lib/delegatedAuth';

export async function GET(req: Request) {
  try {
    const session = await getEffectiveAdminSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const dateStr = searchParams.get('date') || searchParams.get('fecha');
    const startTime = searchParams.get('startTime') || searchParams.get('horaInicio');
    const endTime = searchParams.get('endTime') || searchParams.get('horaFin');
    const excludeAppointmentId = searchParams.get('excludeAppointmentId') || '';

    if (!dateStr || !startTime || !endTime) {
      return NextResponse.json({ 
        error: 'Parámetros date/fecha, startTime/horaInicio y endTime/horaFin son requeridos' 
      }, { status: 400 });
    }

    // Resolver negocioId (con soporte para modo delegado / superadmin y reserva)
    let targetNegocioId = (session.user as any).negocioId;
    let targetBranchId: string | null = null;

    if (excludeAppointmentId) {
      const app = await prisma.appointment.findUnique({
        where: { id: excludeAppointmentId },
        select: { negocioId: true, branchId: true }
      });
      if (app) {
        targetNegocioId = app.negocioId;
        targetBranchId = app.branchId;
      }
    }

    if (!targetNegocioId) {
      return NextResponse.json({ error: 'Negocio no identificado' }, { status: 400 });
    }

    const cleanDateStr = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
    const [y, m, d] = cleanDateStr.split('-').map(Number);
    const fechaUTC = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));

    // 1. Obtener todas las canchas del negocio
    const canchas = await prisma.service.findMany({
      where: {
        negocioId: targetNegocioId,
        estaActivo: true
      },
      orderBy: { nombre: 'asc' }
    });

    // 2. Obtener reservas y bloqueos para esa fecha
    const appointments = await prisma.appointment.findMany({
      where: {
        negocioId: targetNegocioId,
        fecha: fechaUTC,
        id: excludeAppointmentId ? { not: excludeAppointmentId } : undefined,
        estado: { notIn: ['cancelled', 'CANCELADA', 'rejected', 'RECHAZADA', 'no_show', 'NO_SHOW'] },
        AND: [
          { horaInicio: { lt: endTime } },
          { horaFin: { gt: startTime } }
        ]
      },
      include: { cliente: { select: { nombre: true } } }
    });

    const bloqueos = await prisma.bloqueo.findMany({
      where: {
        negocioId: targetNegocioId,
        fecha: fechaUTC,
        AND: [
          { horaInicio: { lt: endTime } },
          { horaFin: { gt: startTime } }
        ]
      }
    });

    // 3. Evaluar disponibilidad por cancha
    const resultado = canchas.map((cancha) => {
      const appConflicto = appointments.find((a) => a.serviceId === cancha.id);
      const blkConflicto = bloqueos.find((b) => b.serviceId === cancha.id);

      let disponible = true;
      let motivoOcupado = '';

      if (appConflicto) {
        disponible = false;
        motivoOcupado = `Ocupada por ${appConflicto.cliente?.nombre || 'Reserva'} (${appConflicto.horaInicio} - ${appConflicto.horaFin})`;
      } else if (blkConflicto) {
        disponible = false;
        motivoOcupado = `Bloqueada por ${blkConflicto.motivo || 'Mantenimiento'} (${blkConflicto.horaInicio} - ${blkConflicto.horaFin})`;
      }

      let extra: any = {};
      try {
        extra = typeof cancha.extraInfo === 'string' ? JSON.parse(cancha.extraInfo) : (cancha.extraInfo || {});
      } catch (_) {}

      return {
        id: cancha.id,
        nombre: cancha.nombre,
        tipo: extra.tipo || 'Cancha',
        precio: cancha.precio || 0,
        precioHora: cancha.precio || 0,
        disponible,
        motivo: motivoOcupado,
        motivoOcupado
      };
    });

    return NextResponse.json({
      success: true,
      date: cleanDateStr,
      startTime,
      endTime,
      canchas: resultado
    });
  } catch (error: any) {
    console.error('Error verificando disponibilidad alternativa:', error);
    return NextResponse.json({ error: 'Error al consultar disponibilidad' }, { status: 500 });
  }
}
