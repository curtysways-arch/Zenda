/**
 * admin-permissions.ts — Helper central de permisos RBAC para AdminUser
 *
 * Uso:
 *   import { hasPermission, canAccessBusiness, requirePermission } from "@/lib/admin-permissions";
 *
 *   // En Server Actions / API Routes:
 *   const session = await getServerSession(authOptions);
 *   if (!hasPermission(session, 'NEGOCIOS_VER')) return 403;
 *
 *   // Verificar acceso a un negocio específico:
 *   if (!canAccessBusiness(session, negocioId)) return 403;
 */

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type AdminSession = {
    user: {
        id: string;
        email: string;
        name: string;
        role: string;
        isAdminUser?: boolean;
        adminRolNombre?: string | null;
        adminRolJerarquia?: number | null;
        permisos?: string[];
        scope?: string | null;
        estado?: string | null;
        negocioId?: string | null;
    }
};

// ─── Verificadores de Permiso ─────────────────────────────────────────────────

/**
 * Verifica si la sesión tiene un permiso específico.
 * El Propietario (jerarquía 1) siempre tiene todos los permisos.
 */
export function hasPermission(session: AdminSession | null, permiso: string): boolean {
    if (!session?.user) return false;

    // Compatibilidad backward: rol SUPERADMIN legacy tiene acceso total
    if ((session.user as any).role === 'SUPERADMIN' && !session.user.isAdminUser) return true;

    if (!session.user.isAdminUser) return false;

    // Propietario tiene acceso a todo
    if (session.user.adminRolJerarquia === 1) return true;

    // Verificar en la lista de permisos del token
    return session.user.permisos?.includes(permiso) ?? false;
}

/**
 * Verifica múltiples permisos (AND — debe tener TODOS).
 */
export function hasAllPermissions(session: AdminSession | null, permisos: string[]): boolean {
    return permisos.every(p => hasPermission(session, p));
}

/**
 * Verifica múltiples permisos (OR — debe tener AL MENOS UNO).
 */
export function hasAnyPermission(session: AdminSession | null, permisos: string[]): boolean {
    return permisos.some(p => hasPermission(session, p));
}

/**
 * Verifica si el AdminUser puede acceder a un negocio específico según su scope.
 * - GLOBAL: puede ver todos los negocios
 * - NEGOCIOS_ASIGNADOS: solo los negocios en AdminUserNegocio
 * - PERSONAL: solo puede gestionar sus propias acciones
 */
export async function canAccessBusiness(session: AdminSession | null, negocioId: string): Promise<boolean> {
    if (!session?.user?.isAdminUser) return false;

    // Propietario accede a todo
    if (session.user.adminRolJerarquia === 1) return true;

    // Scope GLOBAL: acceso a todos
    if (session.user.scope === 'GLOBAL') return true;

    // Scope NEGOCIOS_ASIGNADOS: verificar en cartera asignada
    if (session.user.scope === 'NEGOCIOS_ASIGNADOS') {
        const asignacion = await prisma.adminUserNegocio.findFirst({
            where: {
                adminUserId: session.user.id,
                negocioId,
            }
        });
        return !!asignacion;
    }

    return false;
}

/**
 * Verifica si el usuario tiene el scope mínimo requerido.
 * Jerarquía de scope: GLOBAL > REGIONAL > NEGOCIOS_ASIGNADOS > PERSONAL
 */
export function hasScope(session: AdminSession | null, scopeRequerido: string): boolean {
    if (!session?.user?.isAdminUser) return false;
    if (session.user.adminRolJerarquia === 1) return true;

    const scopeOrder: Record<string, number> = {
        'GLOBAL': 1,
        'REGIONAL': 2,
        'NEGOCIOS_ASIGNADOS': 3,
        'PERSONAL': 4,
    };

    const userScopeLevel = scopeOrder[session.user.scope || 'PERSONAL'] ?? 4;
    const requiredLevel = scopeOrder[scopeRequerido] ?? 4;

    return userScopeLevel <= requiredLevel;
}

/**
 * Verifica si el AdminUser tiene jerarquía suficiente para actuar sobre otro rol.
 * No puede gestionar roles de igual o mayor jerarquía (menor número = más poder).
 */
export function canManageRoleByHierarchy(session: AdminSession | null, targetJerarquia: number): boolean {
    if (!session?.user?.isAdminUser) return false;
    const myJerarquia = session.user.adminRolJerarquia ?? 999;
    return myJerarquia < targetJerarquia;
}

// ─── Helpers para API Routes ──────────────────────────────────────────────────

/**
 * Obtiene la sesión del AdminUser y valida que tenga un permiso específico.
 * Retorna { session, error } — si error != null, retornarlo en la API Route.
 *
 * @example
 * const { session, error } = await requirePermission('NEGOCIOS_VER');
 * if (error) return error;
 */
export async function requirePermission(permiso: string): Promise<{
    session: AdminSession | null;
    error: NextResponse | null;
}> {
    const session = await getServerSession(authOptions) as AdminSession | null;

    // Compatibilidad backward: usuarios SUPERADMIN del sistema anterior tienen acceso total
    const isLegacySuperAdmin = (session?.user as any)?.role === 'SUPERADMIN' && !session?.user?.isAdminUser;

    if (!session?.user?.isAdminUser && !isLegacySuperAdmin) {
        return {
            session: null,
            error: NextResponse.json({ error: "No autorizado. Se requiere cuenta de equipo." }, { status: 401 }),
        };
    }

    if (!hasPermission(session, permiso)) {
        return {
            session,
            error: NextResponse.json({
                error: "Permiso insuficiente.",
                permiso,
                mensaje: `Tu rol (${session!.user.adminRolNombre}) no tiene el permiso: ${permiso}`
            }, { status: 403 }),
        };
    }

    return { session, error: null };
}

/**
 * Registra una acción en el log de auditoría del sistema.
 */
export async function logAuditAction(params: {
    adminUserId: string;
    accion: string;
    modulo: string;
    descripcion?: string;
    targetId?: string;
    targetType?: string;
    datos?: Record<string, any>;
    ipAddress?: string;
    resultado?: string;
}) {
    try {
        await prisma.adminAuditLog.create({
            data: {
                adminUserId: params.adminUserId,
                accion: params.accion,
                modulo: params.modulo,
                descripcion: params.descripcion,
                targetId: params.targetId,
                targetType: params.targetType,
                datosAntes: params.datos ? JSON.stringify(params.datos) : null,
                ipAddress: params.ipAddress,
                resultado: params.resultado || 'EXITOSO',
            }
        });
    } catch (e) {
        console.error("Error al registrar auditoría:", e);
    }
}

// ─── Módulos del SaaS ─────────────────────────────────────────────────────────

/**
 * Definición canónica de los módulos del SaaS con sus permisos.
 * Usada en la UI de la matriz de permisos.
 */
export const MODULES_DEFINITION = [
    {
        modulo: 'Dashboard',
        icono: 'LayoutDashboard',
        permisos: ['DASHBOARD_VER'],
    },
    {
        modulo: 'Negocios',
        icono: 'Building2',
        permisos: ['NEGOCIOS_VER', 'NEGOCIOS_CREAR', 'NEGOCIOS_EDITAR', 'NEGOCIOS_SUSPENDER', 'NEGOCIOS_ELIMINAR', 'NEGOCIOS_EXPORTAR', 'NEGOCIOS_IMPERSONAR'],
    },
    {
        modulo: 'Planes',
        icono: 'Layers',
        permisos: ['PLANES_VER', 'PLANES_CREAR', 'PLANES_EDITAR', 'PLANES_ELIMINAR', 'PLANES_PRECIOS'],
    },
    {
        modulo: 'Facturación',
        icono: 'Receipt',
        permisos: ['PAGOS_VER', 'PAGOS_APROBAR', 'PAGOS_REEMBOLSAR'],
    },
    {
        modulo: 'Suscripciones',
        icono: 'CreditCard',
        permisos: ['SUSCRIPCIONES_VER', 'SUSCRIPCIONES_GESTIONAR'],
    },
    {
        modulo: 'Comunicaciones',
        icono: 'MessageSquare',
        permisos: ['COMUNICACIONES_VER', 'COMUNICACIONES_CREAR', 'COMUNICACIONES_ENVIAR', 'WHATSAPP_CONFIG', 'NOTIFICACIONES_ENVIAR'],
    },
    {
        modulo: 'Analytics',
        icono: 'BarChart3',
        permisos: ['ANALYTICS_VER', 'ANALYTICS_EXPORTAR'],
    },
    {
        modulo: 'Referidos',
        icono: 'Users',
        permisos: ['REFERIDOS_VER', 'REFERIDOS_GESTIONAR'],
    },
    {
        modulo: 'Solicitudes',
        icono: 'ClipboardList',
        permisos: ['SOLICITUDES_VER', 'SOLICITUDES_GESTIONAR'],
    },
    {
        modulo: 'Sistema',
        icono: 'Settings2',
        permisos: ['SISTEMA_LOGS', 'SISTEMA_CONFIG', 'SISTEMA_VPS'],
    },
    {
        modulo: 'Equipo',
        icono: 'UserCog',
        permisos: ['EQUIPO_VER', 'EQUIPO_CREAR', 'EQUIPO_EDITAR', 'EQUIPO_ELIMINAR', 'EQUIPO_ROLES', 'EQUIPO_IMPERSONAR'],
    },
] as const;
