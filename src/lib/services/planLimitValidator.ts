import prisma from '../prisma';
import { featureService } from './featureService';

export const planLimitValidator = {
    /**
     * Valida si un negocio puede crear un nuevo servicio.
     */
    async canCreateField(businessId: string): Promise<{ allowed: boolean; message?: string }> {
        const maxServices = await featureService.getLimit(businessId, 'max_services');
        if (maxServices === 0) {
            return { allowed: false, message: "No se encontró el plan del negocio." };
        }

        const currentCount = await prisma.service.count({ where: { negocioId: businessId } });
        if (currentCount >= maxServices) {
            return {
                allowed: false,
                message: "Has alcanzado el número máximo de servicios permitido por tu plan."
            };
        }

        return { allowed: true };
    },

    /**
     * Valida si un negocio puede crear un nuevo profesional (Staff).
     * Usa featureService.getLimit para obtener el max_staff dinámicamente.
     */
    async canCreateStaff(businessId: string): Promise<{ allowed: boolean; message?: string }> {
        const maxStaff = await featureService.getLimit(businessId, 'max_staff');
        if (maxStaff === 0) {
            return { allowed: false, message: "No se encontró el plan del negocio." };
        }

        const currentCount = await prisma.staff.count({ where: { businessId } });
        if (currentCount >= maxStaff) {
            return {
                allowed: false,
                message: "Tu plan actual no permite más profesionales. Actualiza tu plan para ampliar tu equipo."
            };
        }

        return { allowed: true };
    },

    /**
     * Valida si un negocio puede crear una nueva reserva (Cita).
     * Basado en límite mensual dinámico.
     */
    async canCreateReservation(businessId: string): Promise<{ allowed: boolean; message?: string }> {
        const maxMonthly = await featureService.getLimit(businessId, 'max_appointments_monthly');
        if (maxMonthly === 0) {
            return { allowed: false, message: "No se encontró el plan del negocio." };
        }

        // Si es ilimitado (ej: 999999), permitimos siempre
        if (maxMonthly >= 999999) return { allowed: true };

        // Contar citas del mes actual
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

        const reservationsCount = await prisma.appointment.count({
            where: {
                negocioId: businessId,
                createdAt: {
                    gte: startOfMonth,
                    lte: endOfMonth
                }
            }
        });

        if (reservationsCount >= maxMonthly) {
            return {
                allowed: false,
                message: "Has alcanzado el límite mensual de citas. Actualiza tu plan para seguir recibiendo reservas."
            };
        }

        return { allowed: true };
    },

    /**
     * Valida si el módulo de portafolio de trabajos está habilitado.
     * Usa featureService.canUseFeature en lugar de lógica propia.
     */
    async canAccessTournaments(businessId: string): Promise<{ allowed: boolean; message?: string }> {
        const canAccess = await featureService.canUseFeature(businessId, 'tournaments_module');
        if (!canAccess) {
            return {
                allowed: false,
                message: "Tu plan actual no incluye el módulo de portafolio de trabajos. Actualiza a un plan PRO para desbloquearlo."
            };
        }
        return { allowed: true };
    },

    /**
     * Valida si un negocio puede crear una nueva sede.
     * Usa featureService.getLimit para el límite dinámico.
     */
    async canCreateLocation(businessId: string): Promise<{ allowed: boolean; message?: string }> {
        const maxLocations = await featureService.getLimit(businessId, 'max_locations');
        if (maxLocations === 0) {
            return { allowed: false, message: "No se encontró el plan del negocio." };
        }

        const currentCount = await prisma.ubicacion.count({ where: { negocioId: businessId } });
        if (currentCount >= maxLocations) {
            return {
                allowed: false,
                message: "Tu plan actual no permite más sedes."
            };
        }

        return { allowed: true };
    },

    /**
     * Valida si el módulo de promociones está habilitado.
     * Usa featureService.canUseFeature.
     */
    async canAccessAutomaticDiscounts(businessId: string): Promise<{ allowed: boolean; message?: string }> {
        const canAccess = await featureService.canUseFeature(businessId, 'automatic_discounts');
        if (!canAccess) {
            return {
                allowed: false,
                message: "Tu plan actual no incluye el módulo de promociones. Actualiza a un plan PRO para habilitar descuentos automáticos."
            };
        }
        return { allowed: true };
    },

    /**
     * Valida si el módulo de Cursos y Academia está habilitado.
     * Usa featureService.canUseFeature.
     */
    async canAccessCourses(businessId: string): Promise<{ allowed: boolean; message?: string }> {
        const canAccess = await featureService.canUseFeature(businessId, 'courses_module');
        if (!canAccess) {
            return {
                allowed: false,
                message: "Tu plan actual no incluye el módulo de Academia. Actualiza a un plan BUSINESS para habilitarlo."
            };
        }
        return { allowed: true };
    }
};
