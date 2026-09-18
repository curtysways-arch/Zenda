// src/modules/sports-courts/services/courtBookingService.ts
// Servicio Adaptador para el Módulo SPORTS_COURTS sobre BookingEngine (v2.0.0)

import prisma from '@/lib/prisma';
import { OperableResource } from '@/core/resources/types';

export interface CourtBookingRule {
  slotGranularityMinutes: number; // 60, 90, 120 min
  enableNightLightingFee: boolean;
  nightLightingStartHour: number; // Ej: 18 (18:00 hs)
  nightLightingFeeAmount: number; // Suplemento de iluminación
}

export class CourtBookingService {
  /**
   * Obtiene la lista de Canchas reales del negocio como OperableResources
   * Consulta primero la tabla Service (con map "Cancha").
   * Si no hubiera canchas en Service, recurre a Staff como respaldo.
   */
  static async getCourts(negocioId: string): Promise<OperableResource[]> {
    const services = await prisma.service.findMany({
      where: {
        negocioId,
        estaActivo: true,
      },
      orderBy: { nombre: 'asc' },
    });

    if (services.length > 0) {
      return services.map((s) => {
        let extra: any = {};
        if (typeof s.extraInfo === 'string') {
          try { extra = JSON.parse(s.extraInfo); } catch { extra = {}; }
        } else if (s.extraInfo && typeof s.extraInfo === 'object') {
          extra = s.extraInfo;
        }

        return {
          id: s.id,
          negocioId: s.negocioId,
          name: s.nombre,
          resourceType: 'INFRASTRUCTURE',
          category: extra.tipo || 'Cancha',
          avatar: null,
          capacity: extra.capacidad || 10,
          active: s.estaActivo,
          metadata: {
            precioHora: s.precio || 0,
            duracion: s.duracion || 60,
            features: extra.features || []
          }
        };
      });
    }

    // Fallback: Si no hay Services, busca en Staff
    const staffList = await prisma.staff.findMany({
      where: {
        businessId: negocioId,
        active: true,
      },
      orderBy: { name: 'asc' },
    });

    return staffList.map((s) => ({
      id: s.id,
      negocioId: s.businessId,
      name: s.name,
      resourceType: 'INFRASTRUCTURE',
      category: s.role || 'Cancha',
      avatar: s.avatar,
      active: s.active,
      metadata: { precioHora: 0 }
    }));
  }

  /**
   * Obtiene los turnos reservados, pendientes y bloqueos para una fecha dada
   */
  static async getCourtAppointments(negocioId: string, dateStr: string) {
    const [year, month, day] = dateStr.split('-').map(Number);
    const startOfDay = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
    const endOfDay = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));

    // 1. Obtener Reservas (Appointment)
    const appointments = await prisma.appointment.findMany({
      where: {
        negocioId,
        fecha: {
          gte: startOfDay,
          lte: endOfDay,
        },
        estado: { notIn: ['cancelled', 'CANCELADA', 'rejected', 'RECHAZADA'] },
      },
      include: {
        cliente: { select: { id: true, nombre: true, telefono: true, email: true } },
        service: { select: { id: true, nombre: true, precio: true } },
        staff: { select: { id: true, name: true } },
      },
      orderBy: { horaInicio: 'asc' },
    });

    // 2. Obtener Bloqueos de Canchas (Mantenimiento, Clima, etc.)
    const bloqueos = await prisma.bloqueo.findMany({
      where: {
        negocioId,
        fecha: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        Service: { select: { id: true, nombre: true } },
      },
      orderBy: { horaInicio: 'asc' },
    });

    // Mapear reservas a formato unificado
    const appointmentItems = appointments.map((app) => {
      const total = app.total || 0;
      const pagado = app.pagoAnticipo || 0;
      const pendiente = Math.max(0, Math.round((total - pagado) * 100) / 100);

      return {
        id: app.id,
        resourceId: app.serviceId || app.staffId || '',
        canchaNombre: app.service?.nombre || app.staff?.name || 'Cancha',
        clientName: app.cliente?.nombre || 'Jugador',
        clientPhone: app.cliente?.telefono || '',
        serviceName: app.service?.nombre || 'Turno Cancha',
        startTime: app.horaInicio,
        endTime: app.horaFin,
        status: (app.estado as any) || 'confirmed',
        pagoEstado: app.pagoEstado || 'PENDIENTE',
        price: total,
        totalPagado: pagado,
        saldoPendiente: pendiente,
        hasNightLighting: parseInt(app.horaInicio.split(':')[0], 10) >= 18,
        isBlock: false,
        comentarios: app.comentarios || '',
        checkedInAt: app.checkedInAt ? app.checkedInAt.toISOString() : null,
        startedAt: app.startedAt ? app.startedAt.toISOString() : null,
        completedAt: app.completedAt ? app.completedAt.toISOString() : null,
        duracion: app.duracion || 1,
        fecha: dateStr,
      };
    });

    // Mapear bloqueos como ítems en la grilla
    const blockItems = bloqueos.map((blk) => ({
      id: blk.id,
      resourceId: blk.serviceId || '',
      canchaNombre: blk.Service?.nombre || 'Cancha',
      clientName: blk.motivo || 'Mantenimiento',
      clientPhone: '',
      serviceName: 'Bloqueo Operativo',
      startTime: blk.horaInicio,
      endTime: blk.horaFin,
      status: 'blocked' as const,
      pagoEstado: 'N/A',
      price: 0,
      hasNightLighting: false,
      isBlock: true,
      motivo: blk.motivo || 'Horario Inhabilitado',
    }));

    return [...appointmentItems, ...blockItems];
  }

  /**
   * Calcula estadísticas operativas del día
   */
  static async getDailyStats(negocioId: string, dateStr: string, courtsCount: number) {
    const [year, month, day] = dateStr.split('-').map(Number);
    const startOfDay = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
    const endOfDay = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));

    const allTodayAppointments = await prisma.appointment.findMany({
      where: {
        negocioId,
        fecha: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      select: {
        id: true,
        estado: true,
        pagoEstado: true,
        total: true,
        horaInicio: true,
        horaFin: true,
        serviceId: true,
      },
    });

    const confirmedOrPending = allTodayAppointments.filter(
      (a) => !['cancelled', 'CANCELADA', 'rejected', 'RECHAZADA'].includes(a.estado)
    );

    const totalReservas = confirmedOrPending.length;
    const pendientes = confirmedOrPending.filter(
      (a) => a.estado === 'pending' || a.estado === 'PENDIENTE'
    ).length;
    const ingresos = confirmedOrPending.reduce((acc, curr) => acc + (curr.total || 0), 0);

    const activeCourts = Math.max(courtsCount, 1);
    const totalSlotsDia = activeCourts * 16;
    const ocupacionPercent = totalSlotsDia > 0 
      ? Math.min(Math.round((totalReservas / totalSlotsDia) * 100), 100)
      : 0;

    const occupancyByHour: Record<string, number> = {};
    for (let h = 7; h < 23; h++) {
      const hh = h.toString().padStart(2, '0');
      const count = confirmedOrPending.filter((a) => {
        const startH = parseInt(a.horaInicio.split(':')[0], 10);
        const endH = parseInt(a.horaFin.split(':')[0], 10);
        return h >= startH && h < endH;
      }).length;
      occupancyByHour[hh] = count;
    }

    return {
      totalReservas,
      pendientes,
      ingresos,
      ocupacionPercent,
      occupancyByHour,
    };
  }

  /**
   * Calcula el precio total del turno de cancha según la hora e iluminación
   */
  static calculateCourtPrice(basePrice: number, startTime: string, rule: CourtBookingRule): number {
    const hour = parseInt(startTime.split(':')[0], 10);
    let totalPrice = basePrice;

    if (rule.enableNightLightingFee && hour >= rule.nightLightingStartHour) {
      totalPrice += rule.nightLightingFeeAmount;
    }

    return totalPrice;
  }
}
