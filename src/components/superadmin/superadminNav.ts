import { requiredTeamPermission, tokenHasPermission } from '@/lib/admin/teamAccessMap';
import {
    LayoutDashboard,
    Building2,
    CreditCard,
    Package,
    BarChart3,
    ShieldCheck,
    Settings,
    MessageCircle,
    Bell,
    Smartphone,
    Banknote,
    Gift,
    UserCog,
    Megaphone,
    Trophy,
    Award,
    Calendar,
    Briefcase,
    Tag,
    Sliders,
    Truck,
    BookOpen,
    Layout,
    Shapes,
    type LucideIcon,
} from 'lucide-react';

export type SuperadminBadgeKey = 'solicitudes' | 'pagos';

export type SuperadminNavItem = {
    name: string;
    href: string;
    icon: LucideIcon;
    badge?: SuperadminBadgeKey;
};

export type SuperadminNavGroup = {
    title: string;
    items: SuperadminNavItem[];
};

/** Menú del superadmin agrupado por tarea, compartido por la barra lateral y el menú móvil. */
export const SUPERADMIN_NAV: SuperadminNavGroup[] = [
    {
        title: 'General',
        items: [
            { name: 'Inicio', href: '/superadmin', icon: LayoutDashboard },
            { name: 'Métricas', href: '/superadmin/metricas', icon: BarChart3 },
        ],
    },
    {
        title: 'Negocios',
        items: [
            { name: 'Negocios', href: '/superadmin/negocios', icon: Building2 },
            { name: 'Solicitudes', href: '/superadmin/solicitudes', icon: Bell, badge: 'solicitudes' },
            { name: 'Tipos de negocio', href: '/superadmin/tipos-negocio', icon: Shapes },
            { name: 'Citiox Studio', href: '/superadmin/citiox-studio', icon: Briefcase },
            { name: 'Plantillas', href: '/superadmin/plantillas', icon: Layout },
            { name: 'Repartidores', href: '/superadmin/repartidores', icon: Truck },
        ],
    },
    {
        title: 'Cobros',
        items: [
            { name: 'Pagos', href: '/superadmin/pagos', icon: Banknote, badge: 'pagos' },
            { name: 'Suscripciones', href: '/superadmin/suscripciones', icon: CreditCard },
            { name: 'Planes', href: '/superadmin/planes', icon: Package },
            { name: 'Complementos', href: '/superadmin/addons', icon: Sliders },
        ],
    },
    {
        title: 'Crecimiento',
        items: [
            { name: 'Comunicaciones', href: '/superadmin/comunicaciones', icon: Megaphone },
            { name: 'WhatsApp', href: '/superadmin/whatsapp', icon: MessageCircle },
            { name: 'Referidos', href: '/superadmin/referidos', icon: Gift },
            { name: 'Misiones', href: '/superadmin/misiones-globales', icon: Trophy },
            { name: 'Niveles', href: '/superadmin/niveles', icon: Award },
            { name: 'Temporadas', href: '/superadmin/temporadas', icon: Calendar },
            { name: 'Cupones', href: '/superadmin/coupon-templates', icon: Tag },
        ],
    },
    {
        title: 'Sistema',
        items: [
            { name: 'Equipo', href: '/superadmin/equipo', icon: UserCog },
            { name: 'Administradores', href: '/superadmin/administradores', icon: ShieldCheck },
            { name: 'Vista previa de la app', href: '/superadmin/pwa', icon: Smartphone },
            { name: 'Guías de ayuda', href: '/superadmin/guias', icon: BookOpen },
            { name: 'Configuración', href: '/superadmin/configuracion', icon: Settings },
        ],
    },
];

export function isNavActive(pathname: string | null, href: string) {
    if (!pathname) return false;
    if (href === '/superadmin') return pathname === '/superadmin';
    return pathname === href || pathname.startsWith(href + '/');
}

/** Contadores de pendientes (solicitudes nuevas y pagos por verificar). */
export async function fetchSuperadminCounts(): Promise<Record<SuperadminBadgeKey, number>> {
    const counts: Record<SuperadminBadgeKey, number> = { solicitudes: 0, pagos: 0 };
    try {
        const [s, p] = await Promise.all([
            fetch('/api/superadmin/solicitudes/count'),
            fetch('/api/superadmin/pagos/count'),
        ]);
        if (s.ok) counts.solicitudes = (await s.json()).count || 0;
        if (p.ok) counts.pagos = (await p.json()).count || 0;
    } catch (error) {
        console.error('Error al cargar pendientes del superadmin:', error);
    }
    return counts;
}


/**
 * Menú según el rol del usuario del equipo: cada quien ve solo las secciones que puede abrir
 * (mismas reglas que el middleware, ver lib/admin/teamAccessMap).
 */
export function filterNavFor(user: any): typeof SUPERADMIN_NAV {
    if (!user) return SUPERADMIN_NAV;
    return SUPERADMIN_NAV
        .map((group) => ({
            ...group,
            items: group.items.filter((item) => {
                const perm = requiredTeamPermission(item.href.split('?')[0], 'GET');
                return perm === null || tokenHasPermission(user, perm);
            }),
        }))
        .filter((group) => group.items.length > 0);
}
