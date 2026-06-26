import prisma from '../prisma';
import { getBusinessTimeZone, getMonthRangeInTimeZone } from '@/lib/dateUtils';

export const subscriptionService = {
    /**
     * Verifica si el plan ha expirado y actualiza el estado si es necesario
     */
    async checkAndUpdateSubscriptionStatus(businessId: string) {
        const business = await (prisma.negocio as any).findUnique({
            where: { id: businessId },
            include: {
                Suscripcion: true
            }
        });

        if (!business || !business.Suscripcion) return null;

        const sub = business.Suscripcion;
        const now = new Date();
        const estadoLower = sub.estado.toLowerCase();

        if (
            (estadoLower === 'trial' || estadoLower === 'active' || estadoLower === 'activa') &&
            sub.fechaFin &&
            now > new Date(sub.fechaFin)
        ) {
            await (prisma.suscripcion as any).update({
                where: { id: sub.id },
                data: { estado: 'expired' }
            });
            return 'expired';
        }

        return sub.estado;
    },

    /**
     * Obtiene la información completa del plan y consumo actual para el panel admin
     */
    async getSubscriptionDashboardData(businessId: string) {
        const business = await (prisma.negocio as any).findUnique({
            where: { id: businessId },
            include: {
                Suscripcion: {
                    include: { Plan: true }
                },
                Service: true,
                Staff: true,
                Ubicacion: true
            }
        });

        if (!business || !business.Suscripcion || !business.Suscripcion.Plan) return null;

        const sub = business.Suscripcion;
        const plan = sub.Plan;

        // Contar citas del mes actual en la zona horaria del negocio
        const timeZone = getBusinessTimeZone(business.configuracion);
        const { startOfMonth, endOfMonth } = getMonthRangeInTimeZone(timeZone);

        const appointmentsThisMonth = await prisma.appointment.count({
            where: {
                negocioId: businessId,
                createdAt: {
                    gte: startOfMonth,
                    lte: endOfMonth
                }
            }
        });

        const maxStaff = (plan as any).maxStaff || 1;
        const maxAppointments = (plan as any).maxAppointmentsMonthly || (plan as any).max_reservations_per_month || 40;

        return {
            planName: (plan as any).name,
            planStatus: sub.estado,
            startDate: sub.fechaInicio,
            endDate: sub.fechaFin,
            lockedPrice: sub.lockedPrice,
            limits: {
                staff: {
                    used: business.Staff?.length || 0,
                    max: maxStaff,
                    percentage: ((business.Staff?.length || 0) / maxStaff) * 100
                },
                appointments: {
                    used: appointmentsThisMonth,
                    max: maxAppointments,
                    percentage: maxAppointments >= 999999 ? 0 : (appointmentsThisMonth / maxAppointments) * 100
                },
                services: {
                    used: business.Service?.length || 0,
                    max: (plan as any).max_fields || 100,
                    percentage: ((business.Service?.length || 0) / ((plan as any).max_fields || 100)) * 100
                },
                locations: {
                    used: business.Ubicacion?.length || 0,
                    max: (plan as any).max_locations,
                    percentage: ((business.Ubicacion?.length || 0) / (plan as any).max_locations) * 100
                }
            }
        };
    }
};
