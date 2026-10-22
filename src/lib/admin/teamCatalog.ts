/**
 * Catálogo de permisos y roles del equipo Citiox (antes solo existía en prisma/seed-admin.ts).
 * ensureTeamCatalog() crea lo que falte sin tocar lo que el dueño ya personalizó.
 */
import prisma from '@/lib/prisma';

export const TEAM_PERMISSIONS = [
    // Dashboard
    { modulo: 'Dashboard', accion: 'Ver', codigo: 'DASHBOARD_VER', nombre: 'Ver Dashboard', critico: false },

    // Negocios
    { modulo: 'Negocios', accion: 'Ver', codigo: 'NEGOCIOS_VER', nombre: 'Ver Negocios', critico: false },
    { modulo: 'Negocios', accion: 'Crear', codigo: 'NEGOCIOS_CREAR', nombre: 'Crear Negocios', critico: false },
    { modulo: 'Negocios', accion: 'Editar', codigo: 'NEGOCIOS_EDITAR', nombre: 'Editar Negocios', critico: false },
    { modulo: 'Negocios', accion: 'Suspender', codigo: 'NEGOCIOS_SUSPENDER', nombre: 'Suspender Negocios', critico: true },
    { modulo: 'Negocios', accion: 'Eliminar', codigo: 'NEGOCIOS_ELIMINAR', nombre: 'Eliminar Negocios', critico: true },
    { modulo: 'Negocios', accion: 'Exportar', codigo: 'NEGOCIOS_EXPORTAR', nombre: 'Exportar datos de Negocios', critico: false },
    { modulo: 'Negocios', accion: 'Impersonar', codigo: 'NEGOCIOS_IMPERSONAR', nombre: 'Impersonar como dueño del negocio', critico: true },

    // Planes
    { modulo: 'Planes', accion: 'Ver', codigo: 'PLANES_VER', nombre: 'Ver Planes', critico: false },
    { modulo: 'Planes', accion: 'Crear', codigo: 'PLANES_CREAR', nombre: 'Crear Planes', critico: false },
    { modulo: 'Planes', accion: 'Editar', codigo: 'PLANES_EDITAR', nombre: 'Editar Planes', critico: false },
    { modulo: 'Planes', accion: 'Eliminar', codigo: 'PLANES_ELIMINAR', nombre: 'Eliminar Planes', critico: true },
    { modulo: 'Planes', accion: 'Cambiar Precios', codigo: 'PLANES_PRECIOS', nombre: 'Cambiar Precios de Planes', critico: true },

    // Facturación
    { modulo: 'Facturación', accion: 'Ver', codigo: 'PAGOS_VER', nombre: 'Ver Pagos', critico: false },
    { modulo: 'Facturación', accion: 'Aprobar', codigo: 'PAGOS_APROBAR', nombre: 'Aprobar Comprobantes de Pago', critico: true },
    { modulo: 'Facturación', accion: 'Reembolsar', codigo: 'PAGOS_REEMBOLSAR', nombre: 'Realizar Reembolsos', critico: true },

    // Suscripciones
    { modulo: 'Suscripciones', accion: 'Ver', codigo: 'SUSCRIPCIONES_VER', nombre: 'Ver Suscripciones', critico: false },
    { modulo: 'Suscripciones', accion: 'Gestionar', codigo: 'SUSCRIPCIONES_GESTIONAR', nombre: 'Gestionar Suscripciones', critico: true },

    // Comunicaciones
    { modulo: 'Comunicaciones', accion: 'Ver', codigo: 'COMUNICACIONES_VER', nombre: 'Ver Campañas', critico: false },
    { modulo: 'Comunicaciones', accion: 'Crear', codigo: 'COMUNICACIONES_CREAR', nombre: 'Crear Campañas', critico: false },
    { modulo: 'Comunicaciones', accion: 'Enviar', codigo: 'COMUNICACIONES_ENVIAR', nombre: 'Enviar Campañas Globales', critico: true },
    { modulo: 'Comunicaciones', accion: 'WhatsApp', codigo: 'WHATSAPP_CONFIG', nombre: 'Configurar WhatsApp API', critico: true },
    { modulo: 'Comunicaciones', accion: 'Notificaciones', codigo: 'NOTIFICACIONES_ENVIAR', nombre: 'Enviar Push Notifications', critico: false },

    // Analytics
    { modulo: 'Analytics', accion: 'Ver', codigo: 'ANALYTICS_VER', nombre: 'Ver Métricas y Reportes', critico: false },
    { modulo: 'Analytics', accion: 'Exportar', codigo: 'ANALYTICS_EXPORTAR', nombre: 'Exportar Reportes', critico: false },

    // Referidos
    { modulo: 'Referidos', accion: 'Ver', codigo: 'REFERIDOS_VER', nombre: 'Ver Programa de Referidos', critico: false },
    { modulo: 'Referidos', accion: 'Gestionar', codigo: 'REFERIDOS_GESTIONAR', nombre: 'Gestionar Referidos', critico: false },

    // Solicitudes
    { modulo: 'Solicitudes', accion: 'Ver', codigo: 'SOLICITUDES_VER', nombre: 'Ver Solicitudes de Planes', critico: false },
    { modulo: 'Solicitudes', accion: 'Gestionar', codigo: 'SOLICITUDES_GESTIONAR', nombre: 'Aprobar/Rechazar Solicitudes', critico: true },

    // Sistema
    { modulo: 'Sistema', accion: 'Logs', codigo: 'SISTEMA_LOGS', nombre: 'Ver Auditoría y Logs del Sistema', critico: false },
    { modulo: 'Sistema', accion: 'Config', codigo: 'SISTEMA_CONFIG', nombre: 'Modificar Configuración del SaaS', critico: true },
    { modulo: 'Sistema', accion: 'VPS', codigo: 'SISTEMA_VPS', nombre: 'Acceso VPS y Backups', critico: true },

    // Equipo
    { modulo: 'Equipo', accion: 'Ver', codigo: 'EQUIPO_VER', nombre: 'Ver Usuarios del Equipo', critico: false },
    { modulo: 'Equipo', accion: 'Crear', codigo: 'EQUIPO_CREAR', nombre: 'Crear Usuarios del Equipo', critico: true },
    { modulo: 'Equipo', accion: 'Editar', codigo: 'EQUIPO_EDITAR', nombre: 'Editar Usuarios del Equipo', critico: true },
    { modulo: 'Equipo', accion: 'Eliminar', codigo: 'EQUIPO_ELIMINAR', nombre: 'Eliminar Usuarios del Equipo', critico: true },
    { modulo: 'Equipo', accion: 'Roles', codigo: 'EQUIPO_ROLES', nombre: 'Gestionar Roles y Permisos', critico: true },
    { modulo: 'Equipo', accion: 'Impersonar', codigo: 'EQUIPO_IMPERSONAR', nombre: 'Impersonar miembros del equipo', critico: true },
    { modulo: 'Suscripciones', accion: 'Negociar precio', codigo: 'PRECIOS_NEGOCIAR', nombre: 'Aplicar precios especiales (sobre el mínimo para vendedores)', critico: true },
];

export const TEAM_ROLES: any[] = [
    {
        nombre: 'Propietario',
        descripcion: 'Acceso total al sistema. No puede ser eliminado.',
        color: '#ec4899',
        icono: 'Crown',
        jerarquia: 1,
        allPermissions: true,
    },
    {
        nombre: 'Director',
        descripcion: 'Acceso amplio a la mayoría de módulos del SaaS.',
        color: '#8b5cf6',
        icono: 'Shield',
        jerarquia: 10,
        allPermissions: false,
        permissions: [
            'DASHBOARD_VER', 'NEGOCIOS_VER', 'NEGOCIOS_CREAR', 'NEGOCIOS_EDITAR',
            'PLANES_VER', 'PAGOS_VER', 'SUSCRIPCIONES_VER', 'ANALYTICS_VER',
            'ANALYTICS_EXPORTAR', 'REFERIDOS_VER', 'SOLICITUDES_VER',
            'SOLICITUDES_GESTIONAR', 'COMUNICACIONES_VER', 'EQUIPO_VER',
        ],
    },
    {
        nombre: 'Ventas',
        descripcion: 'Gestión de negocios y prospección de clientes.',
        color: '#10b981',
        icono: 'TrendingUp',
        jerarquia: 50,
        allPermissions: false,
        permissions: [
            'DASHBOARD_VER', 'NEGOCIOS_VER', 'NEGOCIOS_CREAR', 'NEGOCIOS_EDITAR',
            'PLANES_VER', 'SUSCRIPCIONES_VER', 'SOLICITUDES_VER', 'PRECIOS_NEGOCIAR', 'NEGOCIOS_IMPERSONAR',
        ],
    },
    {
        nombre: 'Soporte',
        descripcion: 'Atención al cliente y resolución de tickets.',
        color: '#6366f1',
        icono: 'Headphones',
        jerarquia: 60,
        allPermissions: false,
        permissions: [
            'DASHBOARD_VER', 'NEGOCIOS_VER', 'NEGOCIOS_EDITAR',
            'PAGOS_VER', 'SUSCRIPCIONES_VER',
        ],
    },
    {
        nombre: 'Marketing',
        descripcion: 'Campañas, notificaciones y crecimiento de usuarios.',
        color: '#f59e0b',
        icono: 'Megaphone',
        jerarquia: 70,
        allPermissions: false,
        permissions: [
            'DASHBOARD_VER', 'COMUNICACIONES_VER', 'COMUNICACIONES_CREAR',
            'COMUNICACIONES_ENVIAR', 'NOTIFICACIONES_ENVIAR', 'ANALYTICS_VER',
            'REFERIDOS_VER', 'REFERIDOS_GESTIONAR',
        ],
    },
    {
        nombre: 'Finanzas',
        descripcion: 'Revisión y aprobación de pagos y suscripciones.',
        color: '#3b82f6',
        icono: 'DollarSign',
        jerarquia: 80,
        allPermissions: false,
        permissions: [
            'DASHBOARD_VER', 'PAGOS_VER', 'PAGOS_APROBAR', 'SUSCRIPCIONES_VER',
            'ANALYTICS_VER', 'ANALYTICS_EXPORTAR',
        ],
    },
    {
        nombre: 'Operador',
        descripcion: 'Acceso básico de lectura al panel.',
        color: '#64748b',
        icono: 'User',
        jerarquia: 999,
        allPermissions: false,
        permissions: ['DASHBOARD_VER', 'NEGOCIOS_VER'],
    },
];

/** Permisos que se agregan a roles existentes (nuevas funciones del sistema). */
const ROLE_ADDITIONS: Record<string, string[]> = {
    // Ventas: aplicar precios (sobre el mínimo) y entrar a configurar los negocios de SU cartera
    Ventas: ['PRECIOS_NEGOCIAR', 'NEGOCIOS_IMPERSONAR'],
    Director: ['PRECIOS_NEGOCIAR'],
};

let ensured = false;
export async function ensureTeamCatalog() {
    if (ensured) return;
    try {
        for (const perm of TEAM_PERMISSIONS) {
            await prisma.adminPermission.upsert({
                where: { codigo: perm.codigo },
                update: {},
                create: { modulo: perm.modulo, accion: perm.accion, codigo: perm.codigo, nombre: perm.nombre, critico: perm.critico },
            });
        }
        const allPerms = await prisma.adminPermission.findMany();
        const byCode = new Map(allPerms.map((p) => [p.codigo, p.id]));

        for (const def of TEAM_ROLES) {
            let rol = await prisma.adminRole.findUnique({ where: { nombre: def.nombre } });
            const isNew = !rol;
            if (!rol) {
                rol = await prisma.adminRole.create({
                    data: { nombre: def.nombre, descripcion: def.descripcion, color: def.color, icono: def.icono, jerarquia: def.jerarquia },
                });
            }
            const codes: string[] = isNew
                ? (def.allPermissions ? allPerms.map((p) => p.codigo) : def.permissions || [])
                : ROLE_ADDITIONS[def.nombre] || [];
            for (const code of codes) {
                const permisoId = byCode.get(code);
                if (!permisoId) continue;
                await prisma.adminRolePermission.upsert({
                    where: { rolId_permisoId: { rolId: rol.id, permisoId } },
                    update: {},
                    create: { rolId: rol.id, permisoId },
                });
            }
        }
        ensured = true;
    } catch (e) {
        console.warn('[teamCatalog] No se pudo sincronizar roles/permisos:', e);
    }
}
