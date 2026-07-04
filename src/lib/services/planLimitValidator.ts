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
     * Siempre permite la creación, pero determina si se ha superado el límite.
     */
    async canCreateReservation(businessId: string): Promise<{ allowed: boolean; message?: string; exceeded?: boolean }> {
        const maxMonthly = await featureService.getLimit(businessId, 'max_appointments_monthly');
        if (maxMonthly === 0) {
            return { allowed: true, exceeded: false };
        }

        if (maxMonthly >= 999999) return { allowed: true, exceeded: false };

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
                allowed: true, // Permitimos siempre la creación física de la cita
                exceeded: true,
                message: "Has alcanzado el límite mensual de citas. Actualiza tu plan para seguir recibiendo reservas."
            };
        }

        return { allowed: true, exceeded: false };
    },

    /**
     * Procesa una lista de citas para un negocio, marcando como "locked" y ofuscando
     * los datos del cliente para aquellas citas que excedan el límite mensual en su mes de creación.
     */
    async obfuscateOverLimitAppointments(businessId: string, appointments: any[]): Promise<any[]> {
        if (appointments.length === 0) return [];
        
        const maxMonthly = await featureService.getLimit(businessId, 'max_appointments_monthly');
        if (maxMonthly >= 999999) {
            return appointments.map(a => ({ ...a, isLocked: false }));
        }

        // Identificar qué meses/años están representados en las citas de la lista
        const yearMonths = new Set<string>();
        for (const app of appointments) {
            const date = app.createdAt ? new Date(app.createdAt) : new Date(app.fecha);
            const year = date.getFullYear();
            const month = date.getMonth(); // 0-11
            yearMonths.add(`${year}-${month}`);
        }

        // Para cada mes/año representado, traer las citas de ese mes para reconstruir el orden cronológico
        const lockedIds = new Set<string>();

        for (const ym of yearMonths) {
            const [year, month] = ym.split('-').map(Number);
            const startOfYM = new Date(year, month, 1);
            const endOfYM = new Date(year, month + 1, 0, 23, 59, 59, 999);

            const allMonthApps = await prisma.appointment.findMany({
                where: {
                    negocioId: businessId,
                    createdAt: {
                        gte: startOfYM,
                        lte: endOfYM
                    }
                },
                select: {
                    id: true,
                    createdAt: true,
                    fecha: true
                },
                orderBy: {
                    createdAt: 'asc'
                }
            });

            // Ordenar de forma estable en memoria
            allMonthApps.sort((a, b) => {
                const timeA = a.createdAt ? new Date(a.createdAt).getTime() : new Date(a.fecha).getTime();
                const timeB = b.createdAt ? new Date(b.createdAt).getTime() : new Date(b.fecha).getTime();
                if (timeA === timeB) return a.id.localeCompare(b.id);
                return timeA - timeB;
            });

            // A partir del índice maxMonthly se marcan como bloqueadas
            for (let i = maxMonthly; i < allMonthApps.length; i++) {
                lockedIds.add(allMonthApps[i].id);
            }
        }

        // Retornar las citas con información ofuscada
        return appointments.map(app => {
            const isLocked = lockedIds.has(app.id);
            if (isLocked) {
                return {
                    ...app,
                    isLocked: true,
                    comentarios: 'Detalles ocultos. Actualiza tu plan para desbloquear.',
                    cliente: app.cliente ? {
                        ...app.cliente,
                        nombre: 'Cita Bloqueada (Plan Excedido)',
                        telefono: '*** *** ***',
                        email: '***@***.***'
                    } : null
                };
            }
            return {
                ...app,
                isLocked: false
            };
        });
    },

    /**
     * Procesa una lista de clientes para un negocio, ofuscando sus datos
     * si todos sus appointments en el sistema están bloqueados (superaron el límite).
     */
    async obfuscateOverLimitClients(businessId: string, clients: any[]): Promise<any[]> {
        if (clients.length === 0) return [];

        const maxMonthly = await featureService.getLimit(businessId, 'max_appointments_monthly');
        if (maxMonthly >= 999999) {
            return clients;
        }

        // Obtener citas del negocio
        const appointments = await prisma.appointment.findMany({
            where: { negocioId: businessId },
            select: { id: true, createdAt: true, fecha: true, clienteId: true }
        });

        const groups: Record<string, any[]> = {};
        for (const app of appointments) {
            const date = app.createdAt ? new Date(app.createdAt) : new Date(app.fecha);
            const key = `${date.getFullYear()}-${date.getMonth()}`;
            if (!groups[key]) groups[key] = [];
            groups[key].push(app);
        }

        const lockedIds = new Set<string>();
        for (const key of Object.keys(groups)) {
            groups[key].sort((a, b) => {
                const timeA = a.createdAt ? new Date(a.createdAt).getTime() : new Date(a.fecha).getTime();
                const timeB = b.createdAt ? new Date(b.createdAt).getTime() : new Date(b.fecha).getTime();
                if (timeA === timeB) return a.id.localeCompare(b.id);
                return timeA - timeB;
            });
            for (let i = maxMonthly; i < groups[key].length; i++) {
                lockedIds.add(groups[key][i].id);
            }
        }

        const clientUnlockedCount: Record<string, number> = {};
        for (const app of appointments) {
            if (!app.clienteId) continue;
            if (!lockedIds.has(app.id)) {
                clientUnlockedCount[app.clienteId] = (clientUnlockedCount[app.clienteId] || 0) + 1;
            }
        }

        return clients.map(c => {
            const hasUnlocked = (clientUnlockedCount[c.id] || 0) > 0;
            if (!hasUnlocked && c.totalReservas > 0) {
                return {
                    ...c,
                    nombre: 'Cliente Bloqueado (Plan Excedido)',
                    telefono: '*** *** ***',
                    email: '***@***.***',
                    isLocked: true
                };
            }
            return c;
        });
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
