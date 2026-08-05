// src/modules/sports-courts/services/courtBookingService.ts
// Servicio Adaptador para el Módulo SPORTS_COURTS sobre BookingEngine (v1.0.0)

import prisma from '@/lib/prisma';
import { OperableResource } from '@/core/resources/types';

export interface CourtBookingRule {
  slotGranularityMinutes: number; // 60, 90, 120 min
  enableNightLightingFee: boolean;
  nightLightingStartHour: number; // Ej: 18 (18:00 hs)
  nightLightingFeeAmount: number; // Ej: 5000 COP adicionados
}

export class CourtBookingService {
  /**
   * Obtiene la lista de Canchas del negocio como OperableResources
   */
  static async getCourts(negocioId: string): Promise<OperableResource[]> {
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
    }));
  }

  /**
   * Obtiene los turnos reservables y ocupados para una fecha dada en las canchas
   */
  static async getCourtAppointments(negocioId: string, dateStr: string) {
    // Parse fecha UTC start/end
    const dateObj = new Date(dateStr);
    const startOfDay = new Date(Date.UTC(dateObj.getUTCFullYear(), dateObj.getUTCMonth(), dateObj.getUTCDate(), 0, 0, 0));
    const endOfDay = new Date(Date.UTC(dateObj.getUTCFullYear(), dateObj.getUTCMonth(), dateObj.getUTCDate(), 23, 59, 59));

    const appointments = await prisma.appointment.findMany({
      where: {
        negocioId,
        fecha: {
          gte: startOfDay,
          lte: endOfDay,
        },
        estado: { in: ['pending', 'confirmed', 'completed'] },
      },
      include: {
        cliente: { select: { nombre: true, telefono: true } },
        service: { select: { nombre: true } },
        staff: { select: { id: true, name: true } },
      },
      orderBy: { horaInicio: 'asc' },
    });

    return appointments.map((app) => ({
      id: app.id,
      resourceId: app.staffId || '',
      clientName: app.cliente?.nombre || 'Jugador',
      serviceName: app.service?.nombre || 'Turno Cancha',
      startTime: app.horaInicio,
      endTime: app.horaFin,
      status: (app.estado as any) || 'confirmed',
      price: app.total || 0,
      hasNightLighting: parseInt(app.horaInicio.split(':')[0], 10) >= 18,
    }));
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
