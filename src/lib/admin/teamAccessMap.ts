/**
 * Qué permiso hace falta para cada sección del superadmin (páginas y API).
 *
 * Lo usa el middleware: antes cualquier usuario del equipo Citiox (Ventas, Soporte…)
 * entraba a TODO el superadmin. Ahora cada rol ve y hace solo lo que su rol permite.
 * El Propietario (jerarquía 1) y el superadmin original siguen teniendo acceso total.
 *
 * Sin dependencias de Node (corre en el middleware).
 */

type Rule = { prefix: string; read: string; write?: string; byMethod?: Partial<Record<string, string>> };

// Orden: de lo más específico a lo más general (gana el primer prefijo que coincide)
const API_RULES: Rule[] = [
  { prefix: '/api/superadmin/equipo', read: 'EQUIPO_VER', write: 'EQUIPO_EDITAR', byMethod: { POST: 'EQUIPO_CREAR', DELETE: 'EQUIPO_ELIMINAR' } },
  { prefix: '/api/superadmin/delegated-session', read: '', write: '' },
  { prefix: '/api/superadmin/upload', read: '', write: '' },
  { prefix: '/api/superadmin/businesses/provision', read: 'NEGOCIOS_CREAR', write: 'NEGOCIOS_CREAR' },
  { prefix: '/api/superadmin/businesses', read: 'NEGOCIOS_IMPERSONAR', write: 'NEGOCIOS_IMPERSONAR' },
  { prefix: '/api/superadmin/negocios', read: 'NEGOCIOS_VER', write: 'NEGOCIOS_EDITAR', byMethod: { POST: 'NEGOCIOS_CREAR', DELETE: 'NEGOCIOS_ELIMINAR' } },
  { prefix: '/api/superadmin/drivers', read: 'NEGOCIOS_VER', write: 'NEGOCIOS_SUSPENDER' },
  { prefix: '/api/superadmin/pricing-override', read: 'SUSCRIPCIONES_VER', write: 'PRECIOS_NEGOCIAR' },
  { prefix: '/api/superadmin/suscripciones', read: 'SUSCRIPCIONES_VER', write: 'SUSCRIPCIONES_GESTIONAR' },
  { prefix: '/api/superadmin/solicitudes', read: 'SOLICITUDES_VER', write: 'PAGOS_APROBAR' },
  { prefix: '/api/superadmin/pagos', read: 'PAGOS_VER', write: 'PAGOS_APROBAR' },
  { prefix: '/api/superadmin/cuentas-pago', read: 'PAGOS_VER', write: 'SISTEMA_CONFIG' },
  { prefix: '/api/superadmin/familias', read: 'PLANES_VER', write: 'PLANES_PRECIOS' },
  { prefix: '/api/superadmin/plan-families', read: 'PLANES_VER', write: 'PLANES_PRECIOS' },
  { prefix: '/api/superadmin/planes', read: 'PLANES_VER', write: 'PLANES_PRECIOS', byMethod: { DELETE: 'PLANES_ELIMINAR' } },
  { prefix: '/api/superadmin/addons', read: 'PLANES_VER', write: 'PLANES_PRECIOS' },
  { prefix: '/api/superadmin/tipos-negocio', read: 'PLANES_VER', write: 'SISTEMA_CONFIG' },
  { prefix: '/api/superadmin/comunicaciones', read: 'COMUNICACIONES_VER', write: 'COMUNICACIONES_CREAR' },
  { prefix: '/api/superadmin/whatsapp', read: 'WHATSAPP_CONFIG', write: 'WHATSAPP_CONFIG' },
  { prefix: '/api/superadmin/referrals', read: 'REFERIDOS_VER', write: 'REFERIDOS_GESTIONAR' },
  { prefix: '/api/superadmin/usuarios', read: 'NEGOCIOS_VER', write: 'NEGOCIOS_EDITAR' },
  { prefix: '/api/superadmin/config', read: 'SISTEMA_CONFIG', write: 'SISTEMA_CONFIG' },
  // Contenido de plataforma (plantillas, guías, misiones, niveles…)
  { prefix: '/api/superadmin', read: 'DASHBOARD_VER', write: 'SISTEMA_CONFIG' },
];

const PAGE_RULES: { prefix: string; perm: string }[] = [
  { prefix: '/superadmin/equipo', perm: 'EQUIPO_VER' },
  { prefix: '/superadmin/administradores', perm: 'EQUIPO_VER' },
  { prefix: '/superadmin/negocios', perm: 'NEGOCIOS_VER' },
  { prefix: '/superadmin/repartidores', perm: 'NEGOCIOS_VER' },
  { prefix: '/superadmin/suscripciones', perm: 'SUSCRIPCIONES_VER' },
  { prefix: '/superadmin/solicitudes', perm: 'SOLICITUDES_VER' },
  { prefix: '/superadmin/pagos', perm: 'PAGOS_VER' },
  { prefix: '/superadmin/planes', perm: 'PLANES_VER' },
  { prefix: '/superadmin/familias', perm: 'PLANES_VER' },
  { prefix: '/superadmin/addons', perm: 'PLANES_VER' },
  { prefix: '/superadmin/tipos-negocio', perm: 'SISTEMA_CONFIG' },
  { prefix: '/superadmin/comunicaciones', perm: 'COMUNICACIONES_VER' },
  { prefix: '/superadmin/whatsapp', perm: 'WHATSAPP_CONFIG' },
  { prefix: '/superadmin/metricas', perm: 'ANALYTICS_VER' },
  { prefix: '/superadmin/referidos', perm: 'REFERIDOS_VER' },
  { prefix: '/superadmin/configuracion', perm: 'SISTEMA_CONFIG' },
  { prefix: '/superadmin/pwa', perm: 'SISTEMA_CONFIG' },
  { prefix: '/superadmin/citiox-studio', perm: 'SISTEMA_CONFIG' },
  { prefix: '/superadmin/plantillas', perm: 'SISTEMA_CONFIG' },
  { prefix: '/superadmin/guias', perm: 'SISTEMA_CONFIG' },
  { prefix: '/superadmin/misiones-globales', perm: 'SISTEMA_CONFIG' },
  { prefix: '/superadmin/mission-editor', perm: 'SISTEMA_CONFIG' },
  { prefix: '/superadmin/niveles', perm: 'SISTEMA_CONFIG' },
  { prefix: '/superadmin/temporadas', perm: 'SISTEMA_CONFIG' },
  { prefix: '/superadmin/coupon-templates', perm: 'SISTEMA_CONFIG' },
  { prefix: '/superadmin', perm: 'DASHBOARD_VER' },
];

function matches(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(prefix + '/');
}

/** Permiso requerido ('' = cualquier usuario del equipo, null = ruta no gobernada). */
export function requiredTeamPermission(pathname: string, method: string = 'GET'): string | null {
  const m = method.toUpperCase();
  if (pathname.startsWith('/api/')) {
    const rule = API_RULES.find((r) => matches(pathname, r.prefix));
    if (!rule) return null;
    if (rule.byMethod?.[m]) return rule.byMethod[m]!;
    return m === 'GET' || m === 'HEAD' ? rule.read : rule.write ?? rule.read;
  }
  const page = PAGE_RULES.find((r) => matches(pathname, r.prefix));
  return page ? page.perm : null;
}

/** ¿Es el dueño de la plataforma (acceso total)? */
export function isPlatformOwner(token: any) {
  if (!token) return false;
  if (token.platformOwner === true) return true; // marcado en la sesión antes del acceso delegado
  const roles: string[] = Array.isArray(token.roles) ? token.roles : [];
  const legacy = ['SUPERADMIN', 'SUPER_ADMIN'].includes(token.role) || roles.some((r) => ['SUPERADMIN', 'SUPER_ADMIN'].includes(r));
  if (legacy && !token.isAdminUser) return true;
  return token.isAdminUser === true && Number(token.adminRolJerarquia) === 1;
}

export function tokenHasPermission(token: any, perm: string) {
  if (isPlatformOwner(token)) return true;
  if (!token?.isAdminUser) return false;
  if (!perm) return true;
  return Array.isArray(token.permisos) && token.permisos.includes(perm);
}

/** Primera sección del superadmin a la que el usuario puede entrar (para redirigirlo). */
export function firstAllowedPage(token: any): string | null {
  const order = [
    ['/superadmin', 'DASHBOARD_VER'],
    ['/superadmin/negocios', 'NEGOCIOS_VER'],
    ['/superadmin/solicitudes', 'SOLICITUDES_VER'],
    ['/superadmin/pagos', 'PAGOS_VER'],
    ['/superadmin/comunicaciones', 'COMUNICACIONES_VER'],
  ];
  const hit = order.find(([, p]) => tokenHasPermission(token, p));
  return hit ? hit[0] : null;
}
