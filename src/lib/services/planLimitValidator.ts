import prisma from '../prisma';
import { featureService } from './featureService';
import { EntitlementsService } from '@/core/entitlements/EntitlementsService';

export const planLimitValidator = {
    /**
     * Valida si un negocio puede crear un nuevo servicio / producto.
     */
    async canCreateField(businessId: string): Promise<{ allowed: boolean; message?: string }> {
        const ent = await EntitlementsService.resolve(businessId);
        const currentCount = await prisma.producto.count({ where: { negocioId: businessId } }).catch(() => 0);
        if (currentCount >= ent.limits.products) {
            return {
                allowed: false,
                message: `Has alcanzado el límite de ${ent.limits.products} productos permitido por tu plan.`
            };
        }
        return { allowed: true };
    },

    /**
     * Valida si un negocio puede crear un nuevo profesional (Staff).
     */
    async canCreateStaff(businessId: string): Promise<{ allowed: boolean; message?: string }> {
        const res = await EntitlementsService.checkProfessionalLimit(businessId);
        return {
            allowed: res.allowed,
            message: res.message
        };
    },

    /**
     * Valida si un negocio puede crear una nueva reserva (Cita).
     */
    async canCreateReservation(businessId: string): Promise<{ allowed: boolean; message?: string; exceeded?: boolean }> {
        const res = await EntitlementsService.checkAppointmentLimit(businessId);
        return {
            allowed: true, // Permitir registro en BD pero marcar exceeded si sobrepasa cuota
            exceeded: !res.allowed,
            message: res.message
        };
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
     */
    async canCreateLocation(businessId: string): Promise<{ allowed: boolean; message?: string }> {
        const res = await EntitlementsService.checkBranchLimit(businessId);
        return {
            allowed: res.allowed,
            message: res.message
        };
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
    },

    /**
     * Valida si el módulo de Comunicaciones y Notificaciones Masivas está habilitado.
     */
    async canAccessCommunications(businessId: string): Promise<{ allowed: boolean; message?: string }> {
        const canAccess = await featureService.canUseFeature(businessId, 'communications_module');
        if (!canAccess) {
            return {
                allowed: false,
                message: "Tu plan actual no incluye el módulo de Comunicaciones y Notificaciones Masivas. Actualiza tu plan para enviar anuncios masivos por WhatsApp y Push."
            };
        }
        return { allowed: true };
    },

    /**
     * Valida si el módulo Club de Fidelización (Puntos/Niveles/Premios) está habilitado.
     */
    async canAccessLoyalty(businessId: string): Promise<{ allowed: boolean; message?: string }> {
        const canAccess = await featureService.canUseFeature(businessId, 'loyalty_module');
        if (!canAccess) {
            return {
                allowed: false,
                message: "Tu plan actual no incluye el Club de Fidelización. Actualiza tu plan para activar misiones, diamantes, niveles y recompensas."
            };
        }
        return { allowed: true };
    }
};
