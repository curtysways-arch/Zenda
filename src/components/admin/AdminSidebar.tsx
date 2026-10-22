'use client';
// src/components/admin/AdminSidebar.tsx
// Menú lateral del panel de negocio.
// - El tipo de negocio se resuelve con businessTypeHelper (misma lógica que el menú móvil).
// - Secciones con nombres en lenguaje del dueño; las secundarias se pueden plegar.
// - Las funciones bloqueadas por plan se agrupan en una sola entrada "Más funciones".

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useConfirm } from '@/components/admin/ConfirmContext';
import {
  LayoutDashboard, CalendarDays, Dribbble, Sparkles, Settings, Users, LogOut,
  MessageSquare, Building2, BarChart3, Trophy, Tags, Lock, Layout, Package,
  GraduationCap, Contact, Scissors, Store, ShieldCheck, Utensils,
  Truck, Wallet, CreditCard, ClipboardList, Bike, LucideIcon, X, FileSpreadsheet,
  Globe, ExternalLink, Scan, CalendarCheck, Target,
  Coffee, ChefHat, Calculator, Warehouse, FileText, ShoppingBag, Receipt, Smile,
  ChevronDown, Image as ImageIcon, Gem,
  Palette, Search, Eye
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useSession, signOut } from 'next-auth/react';
import BranchWarehouseSelector from '@/components/admin/BranchWarehouseSelector';
import { ToothIcon } from '@/components/icons/ToothIcon';
import {
  normalizeBusinessConfig,
  isDentalBusiness,
  isGymBusiness,
  isLaundryOrShoeCareBusiness,
  isRestaurantBusiness,
  isSportsCourtsBusiness,
  isCafeteriaBusiness,
  isAppointmentServiceBusiness,
  getBusinessVerticalSignals,
} from '@/lib/businessTypeHelper';

function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}

const ZendaLogo = ({ size = 24, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <rect x="3" y="5" width="18" height="15" rx="3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M3 9.5H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M8 3V6.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M16 3V6.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M9.5 13.5L11.5 15.5L15 11.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

interface MenuItem {
  name: string;
  href: string;
  icon: LucideIcon | any;
  section: SectionKey;
  badge?: number;
  roles?: string[];
  isLocked?: boolean;
  lockedBadge?: string;
  /** Etiqueta "Nuevo" para funciones recién lanzadas */
  isNew?: boolean;
}

// ── Secciones del menú ──────────────────────────────────────────────
type SectionKey =
  | 'INICIO'
  | 'DIA_A_DIA'
  | 'CATALOGO'
  | 'INVENTARIO'
  | 'CLIENTES_EQUIPO'
  | 'ATRAER'
  | 'DINERO'
  | 'MI_PAGINA'
  | 'MI_NEGOCIO';

const SECTION_META: Record<SectionKey, { title: string; collapsible: boolean; defaultOpen: boolean }> = {
  INICIO: { title: '', collapsible: false, defaultOpen: true },
  DIA_A_DIA: { title: 'Día a día', collapsible: false, defaultOpen: true },
  CATALOGO: { title: 'Catálogo', collapsible: false, defaultOpen: true },
  INVENTARIO: { title: 'Inventario y producción', collapsible: true, defaultOpen: false },
  CLIENTES_EQUIPO: { title: 'Clientes y equipo', collapsible: false, defaultOpen: true },
  ATRAER: { title: 'Atraer clientes', collapsible: true, defaultOpen: false },
  DINERO: { title: 'Dinero', collapsible: false, defaultOpen: true },
  MI_PAGINA: { title: 'Mi página', collapsible: false, defaultOpen: true },
  MI_NEGOCIO: { title: 'Configuración', collapsible: true, defaultOpen: false },
};

// "Mi página" va arriba: es lo que más buscan los dueños después de la agenda.
const SECTION_ORDER: SectionKey[] = ['INICIO', 'DIA_A_DIA', 'MI_PAGINA', 'CATALOGO', 'INVENTARIO', 'CLIENTES_EQUIPO', 'ATRAER', 'DINERO', 'MI_NEGOCIO'];

const ADMIN_ROLES = ['ADMIN', 'ADMIN_NEGOCIO', 'SUPERADMIN'];
const STORAGE_KEY = 'citiox.sidebar.sections.v2';

// ── Permisos por módulo (usuarios con allowedModules, ej. tablet de cocina) ──
function genericModuleMatch(cleanCode: string, href: string): boolean {
  if (cleanCode === 'cocina' || cleanCode === 'kitchen') return href === '/admin/cocina';
  if (cleanCode === 'mesas' || cleanCode === 'tables') return href === '/admin/mesas';
  if (cleanCode === 'pedidos' || cleanCode === 'pedidos-online' || cleanCode === 'delivery') return href.includes('/pedidos');
  if (cleanCode === 'caja' || cleanCode === 'cash') return href === '/admin/caja';
  if (cleanCode === 'ventas' || cleanCode === 'pos') return href === '/admin/ventas' || href === '/admin/pos';
  if (cleanCode === 'recetas' || cleanCode === 'recipes') return href === '/admin/recetas';
  if (cleanCode === 'produccion' || cleanCode === 'production') return href === '/admin/produccion';
  if (cleanCode === 'costos' || cleanCode === 'costing') return href === '/admin/costos';
  if (cleanCode === 'compras' || cleanCode === 'purchases') return href === '/admin/compras';
  if (cleanCode === 'cuentas-por-pagar' || cleanCode === 'cxp' || cleanCode === 'payables') return href === '/admin/cuentas-por-pagar';
  if (cleanCode === 'proveedores' || cleanCode === 'suppliers') return href === '/admin/proveedores';
  if (cleanCode === 'bodegas' || cleanCode === 'warehouses') return href === '/admin/bodegas';
  if (cleanCode === 'transferencias' || cleanCode === 'transfers') return href === '/admin/transferencias';
  if (cleanCode === 'facturacion' || cleanCode === 'billing') return href === '/admin/facturacion';
  if (cleanCode === 'nomina' || cleanCode === 'payroll') return href === '/admin/nomina';
  if (cleanCode === 'despacho' || cleanCode === 'dispatch') return href === '/admin/despacho';
  if (cleanCode === 'logistica' || cleanCode === 'repartidores' || cleanCode === 'drivers') return href === '/admin/repartidores';
  if (cleanCode === 'productos' || cleanCode === 'products') return href === '/admin/productos' || href === '/admin/categorias';
  if (cleanCode === 'inventario' || cleanCode === 'inventory') return href === '/admin/inventario';
  if (cleanCode === 'citas' || cleanCode === 'appointments' || cleanCode === 'reservas') return href === '/admin/citas';
  if (cleanCode === 'servicios' || cleanCode === 'services') return href === '/admin/servicios';
  if (cleanCode === 'staff' || cleanCode === 'especialistas') return href === '/admin/staff' || href === '/admin/usuarios';
  if (cleanCode === 'canchas' || cleanCode === 'courts') return href === '/admin/canchas';
  if (cleanCode === 'bloqueos') return href === '/admin/bloqueos';
  if (cleanCode === 'clientes' || cleanCode === 'customers') return href === '/admin/clientes' || href === '/admin/socios';
  if (cleanCode === 'socios' || cleanCode === 'members') return href === '/admin/socios';
  if (cleanCode === 'membresias' || cleanCode === 'memberships') return href === '/admin/membresias' || href === '/admin/membresias/planes';
  if (cleanCode === 'accesos' || cleanCode === 'access') return href === '/admin/accesos';
  if (cleanCode === 'asistencias' || cleanCode === 'attendance') return href === '/admin/asistencias';
  if (cleanCode === 'usuarios') return href === '/admin/usuarios';
  if (cleanCode === 'reportes' || cleanCode === 'reports') return href === '/admin/reportes';
  if (cleanCode === 'comunicacion' || cleanCode === 'comunicaciones' || cleanCode === 'communications') return href === '/admin/comunicacion';
  if (cleanCode === 'ordenes-servicio' || cleanCode === 'ordenes' || cleanCode === 'service-orders') return href === '/admin/ordenes-servicio';
  if (cleanCode === 'recepciones' || cleanCode === 'reception') return href === '/admin/recepciones';
  if (cleanCode === 'misiones' || cleanCode === 'beneficios') return href === '/admin/misiones';
  if (cleanCode === 'misiones-citiox' || cleanCode === 'citiox') return href === '/admin/misiones-citiox';
  if (cleanCode === 'resultados' || cleanCode === 'results' || cleanCode === 'casos') return href === '/admin/resultados';
  if (cleanCode === 'config' || cleanCode === 'settings') return href.startsWith('/admin/config') || href === '/admin/sucursales' || href === '/admin/metodos-pago' || href === '/admin/perfil';
  return href.includes(cleanCode);
}

function dentalModuleMatch(cleanCode: string, href: string): boolean {
  // "historia-clinica" ahora está dentro de la ficha del paciente: quien tenga ese permiso ve Pacientes.
  if (cleanCode === 'pacientes' || cleanCode === 'patients' || cleanCode === 'historia-clinica' || cleanCode === 'clinical_records') return href === '/admin/pacientes';
  if (cleanCode === 'citas' || cleanCode === 'agenda' || cleanCode === 'appointments') return href === '/admin/citas';
  if (cleanCode === 'staff' || cleanCode === 'doctores' || cleanCode === 'especialistas') return href === '/admin/staff';
  if (cleanCode === 'tratamientos' || cleanCode === 'treatments') return href === '/admin/tratamientos';
  if (cleanCode === 'documentos' || cleanCode === 'documents') return href === '/admin/documentos';
  if (cleanCode === 'resultados' || cleanCode === 'results' || cleanCode === 'casos') return href === '/admin/resultados';
  if (cleanCode === 'servicios' || cleanCode === 'services') return href === '/admin/servicios';
  if (cleanCode === 'productos' || cleanCode === 'products') return href === '/admin/productos' || href === '/admin/inventario' || href === '/admin/categorias';
  if (cleanCode === 'usuarios' || cleanCode === 'personal') return href === '/admin/usuarios';
  if (cleanCode === 'caja' || cleanCode === 'cash') return href === '/admin/caja';
  if (cleanCode === 'reportes' || cleanCode === 'reports') return href === '/admin/reportes';
  if (cleanCode === 'misiones' || cleanCode === 'beneficios') return href === '/admin/misiones';
  if (cleanCode === 'misiones-citiox' || cleanCode === 'citiox') return href === '/admin/misiones-citiox';
  if (cleanCode === 'config' || cleanCode === 'settings') return href.startsWith('/admin/config') || href === '/admin/sucursales' || href === '/admin/metodos-pago' || href === '/admin/perfil';
  return href.includes(cleanCode);
}

function gymModuleMatch(cleanCode: string, href: string): boolean {
  if (cleanCode === 'accesos' || cleanCode === 'access') return href === '/admin/accesos';
  if (cleanCode === 'asistencias' || cleanCode === 'attendance') return href === '/admin/asistencias';
  if (cleanCode === 'clases' || cleanCode === 'classes') return href === '/admin/clases';
  if (cleanCode === 'socios' || cleanCode === 'members') return href === '/admin/socios';
  if (cleanCode === 'membresias' || cleanCode === 'memberships') return href.startsWith('/admin/membresias');
  if (cleanCode === 'staff' || cleanCode === 'entrenadores' || cleanCode === 'coaches') return href === '/admin/staff';
  if (cleanCode === 'usuarios' || cleanCode === 'personal') return href === '/admin/usuarios';
  if (cleanCode === 'caja' || cleanCode === 'cash') return href === '/admin/caja';
  if (cleanCode === 'ventas' || cleanCode === 'pos') return href === '/admin/ventas';
  if (cleanCode === 'misiones' || cleanCode === 'beneficios') return href === '/admin/misiones';
  if (cleanCode === 'misiones-citiox' || cleanCode === 'citiox') return href === '/admin/misiones-citiox';
  if (cleanCode === 'reportes' || cleanCode === 'reports') return href === '/admin/reportes';
  if (cleanCode === 'config' || cleanCode === 'settings') return href.startsWith('/admin/config') || href === '/admin/sucursales' || href === '/admin/metodos-pago' || href === '/admin/perfil';
  return href.includes(cleanCode);
}

// ── Vertical + capacidades efectivas ─────────────────────────────────
function resolveVertical(data: any, effectiveCaps: Record<string, any> = {}) {
  const cfgCaps = (() => { const c = normalizeBusinessConfig(data?.configuracion); return c.activeCapabilities || c.capabilities || {}; })();
  const isDental = isDentalBusiness(data);
  // Un negocio con membresías activas se gestiona con el menú de gimnasio (comportamiento previo)
  const isGym = !isDental && (isGymBusiness(data) || Boolean(effectiveCaps.MEMBERSHIPS ?? cfgCaps.memberships));
  const isShoeCare = !isDental && !isGym && isLaundryOrShoeCareBusiness(data);
  const isCafeteria = !isDental && !isGym && !isShoeCare && isCafeteriaBusiness(data);
  const isRestaurant = !isDental && !isGym && !isShoeCare && !isCafeteria && isRestaurantBusiness(data);
  const isCourts = !isDental && !isGym && !isShoeCare && !isCafeteria && !isRestaurant && isSportsCourtsBusiness(data);
  const { tipoUpper } = getBusinessVerticalSignals(data);
  const isPinchos = tipoUpper === 'PINCHOS' || (data?.slug || '').toUpperCase() === 'PINCHOS';
  const isServiceBiz = !isRestaurant && !isPinchos && !isCourts && !isGym && !isShoeCare && !isCafeteria && isAppointmentServiceBusiness(data);
  const isStore = !isRestaurant && !isPinchos && !isCourts && !isGym && !isShoeCare && !isCafeteria && !isServiceBiz;
  return { isDental, isGym, isShoeCare, isCafeteria, isRestaurant, isCourts, isPinchos, isServiceBiz, isStore, tipoUpper };
}

function computeCapabilities(data: any, effectiveCaps: Record<string, any>): Record<string, boolean> {
  const cfg = normalizeBusinessConfig(data?.configuracion);
  const caps = cfg.activeCapabilities || cfg.capabilities || {};
  const v = resolveVertical(data, effectiveCaps);
  const { isDental, isRestaurant, isPinchos, isCourts: isCanchas, isShoeCare, isCafeteria, isServiceBiz, isStore, tipoUpper } = v;
  const hasEcommerce = Boolean(effectiveCaps.ECOMMERCE ?? effectiveCaps.ecommerce ?? caps.ecommerce ?? (caps.orders && !isDental && !isServiceBiz));

  return {
    orders: Boolean((effectiveCaps.ORDERS ?? effectiveCaps.orders) ?? (hasEcommerce || (isServiceBiz || isShoeCare ? Boolean(caps.orders === true || caps.ecommerce) : (isRestaurant || isPinchos || isStore || isCafeteria)))),
    catalog: Boolean(isDental ? Boolean(effectiveCaps.ECOMMERCE || effectiveCaps.PRODUCTS || caps.ecommerce || caps.catalog || data?.tieneTienda) : ((effectiveCaps.PRODUCTS ?? effectiveCaps.products) ?? (hasEcommerce || (isServiceBiz || isShoeCare ? Boolean(caps.catalog === true || caps.products || caps.ecommerce) : (isRestaurant || isPinchos || isStore || isCafeteria))))),
    tables: Boolean((effectiveCaps.TABLES ?? effectiveCaps.tables) || caps.tables),
    kitchen: Boolean((effectiveCaps.KITCHEN ?? effectiveCaps.kitchen) || isRestaurant || isPinchos || caps.kitchen),
    delivery: Boolean((effectiveCaps.DELIVERY ?? effectiveCaps.delivery) ?? (isServiceBiz || isShoeCare ? caps.delivery === true : (isRestaurant || isPinchos || isStore || isCafeteria))),
    dispatch: Boolean(effectiveCaps.DISPATCH ?? effectiveCaps.dispatch ?? caps.dispatch ?? isRestaurant),
    appointments: !isRestaurant && !isStore && !isShoeCare && !isCafeteria && Boolean(effectiveCaps.APPOINTMENTS ?? effectiveCaps.appointments ?? (isServiceBiz || isCanchas || tipoUpper === 'RESERVA')),
    courts: !isServiceBiz && !isRestaurant && !isStore && !isCafeteria && Boolean(effectiveCaps.COURTS ?? effectiveCaps.courts ?? caps.courts ?? isCanchas),
    services: !isRestaurant && !isStore && !isCanchas && !isCafeteria && Boolean(isServiceBiz || isShoeCare || effectiveCaps.SERVICES || effectiveCaps.services || caps.services),
    promotions: Boolean(effectiveCaps.PROMOTIONS ?? effectiveCaps.promotions ?? caps.promotions ?? caps.PROMOTIONS),
    courses: !isRestaurant && !isPinchos && !isCafeteria && Boolean(effectiveCaps.COURSES ?? effectiveCaps.courses ?? caps.courses),
    loyalty: Boolean(effectiveCaps.LOYALTY ?? effectiveCaps.loyalty ?? caps.loyalty ?? (isPinchos || isCafeteria)),
    inventory: Boolean((effectiveCaps.INVENTORY ?? effectiveCaps.inventory) ?? (hasEcommerce || caps.inventory || isCafeteria)),
    communications: Boolean(
      (effectiveCaps.COMMUNICATION_CENTER ?? effectiveCaps.communications) ||
      (effectiveCaps.WHATSAPP_CAMPAIGNS ?? effectiveCaps.whatsapp_campaigns) ||
      caps.communication_center || caps.communications || caps.whatsapp_campaigns
    ),
    payments: Boolean(effectiveCaps.PAYMENTS ?? effectiveCaps.payments ?? !isServiceBiz),
    pos: Boolean(effectiveCaps.POS ?? effectiveCaps.pos ?? caps.pos ?? (isCafeteria || isRestaurant)),
    recipes: Boolean(effectiveCaps.RECIPES ?? effectiveCaps.recipes ?? caps.recipes ?? isCafeteria),
    production: Boolean(effectiveCaps.PRODUCTION ?? effectiveCaps.production ?? caps.production ?? isCafeteria),
    costing: Boolean(effectiveCaps.COSTING ?? effectiveCaps.costing ?? caps.costing ?? isCafeteria),
    purchases: Boolean(effectiveCaps.PURCHASES ?? effectiveCaps.purchases ?? caps.purchases ?? isCafeteria),
    multi_warehouse: Boolean(effectiveCaps.MULTI_WAREHOUSE ?? effectiveCaps.multi_warehouse ?? caps.multi_warehouse),
    electronic_billing: Boolean(effectiveCaps.ELECTRONIC_BILLING ?? effectiveCaps.electronic_billing ?? caps.electronic_billing ?? isCafeteria),
    payroll: Boolean(effectiveCaps.PAYROLL ?? effectiveCaps.payroll ?? caps.payroll),
    clinical_records: Boolean(effectiveCaps.CLINICAL_RECORDS ?? effectiveCaps.clinical_records ?? caps.clinical_records ?? caps.CLINICAL_RECORDS),
    memberships: Boolean(effectiveCaps.MEMBERSHIPS ?? caps.memberships),
  };
}

// Ítems comunes de "Mi negocio" (ajustes)
function settingsItems(opts: { payments: boolean; profileLabel?: string }): MenuItem[] {
  const items: MenuItem[] = [
    // Mi página: cómo se ve la página pública
    { name: 'Diseño', href: '/admin/diseno', icon: Palette, section: 'MI_PAGINA', roles: ADMIN_ROLES, isNew: true },
    { name: 'Portada y fotos', href: '/admin/hero-destacados', icon: ImageIcon, section: 'MI_PAGINA', roles: ADMIN_ROLES },
    { name: 'Páginas extra', href: '/admin/paginas', icon: Layout, section: 'MI_PAGINA', roles: ADMIN_ROLES },
    // Configuración
    { name: opts.profileLabel || 'Datos del negocio', href: '/admin/perfil', icon: Building2, section: 'MI_NEGOCIO', roles: ADMIN_ROLES },
    { name: 'Ajustes generales', href: '/admin/config', icon: Settings, section: 'MI_NEGOCIO', roles: ADMIN_ROLES },
    { name: 'Sucursales', href: '/admin/sucursales', icon: Store, section: 'MI_NEGOCIO', roles: [...ADMIN_ROLES, 'OWNER'] },
  ];
  if (opts.payments) {
    items.push({ name: 'Métodos de pago', href: '/admin/metodos-pago', icon: CreditCard, section: 'MI_NEGOCIO', roles: ADMIN_ROLES });
  }
  items.push({ name: 'Mi plan', href: '/admin/plan', icon: Gem, section: 'MI_NEGOCIO', roles: ADMIN_ROLES });
  items.push({ name: 'Super Panel', href: '/superadmin', icon: ShieldCheck, section: 'MI_NEGOCIO', roles: ['SUPERADMIN'] });
  return items;
}

export default function AdminSidebar({
  primaryColor = '#0ea5e9',
  initialBusinessName,
  initialSlug,
  initialBusiness,
}: {
  primaryColor?: string;
  initialBusinessName?: string;
  initialSlug?: string;
  /** Negocio cargado en el servidor (tipoNegocio, configuracion, slug, nombre) para pintar el menú correcto desde el primer render. */
  initialBusiness?: any;
}) {
  const { confirm } = useConfirm();
  const pathname = usePathname() || '';
  const { data: session } = useSession();
  const userObj = session?.user as any;
  const role = userObj?.isDelegated ? 'SUPERADMIN' : (userObj?.role || 'STAFF');
  const isRealSuperAdmin = Boolean(
    role === 'SUPERADMIN' ||
    role === 'SUPER_ADMIN' ||
    userObj?.isAdminUser === true ||
    userObj?.isDelegated === true ||
    userObj?.role === 'SUPERADMIN' ||
    userObj?.role === 'SUPER_ADMIN'
  );

  const [isOpen, setIsOpen] = useState(false);
  const [biz, setBiz] = useState<any>(initialBusiness || null);
  const [effectiveCaps, setEffectiveCaps] = useState<Record<string, any>>({});
  const [entitlementsLoaded, setEntitlementsLoaded] = useState(false);
  const [pendingOrders, setPendingOrders] = useState(0);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const [showLocked, setShowLocked] = useState(false);
  const [query, setQuery] = useState('');

  const businessName = biz?.nombre || initialBusinessName || '';
  const businessSlug = biz?.slug || initialSlug || userObj?.slug || '';

  // Abrir/cerrar en móvil
  useEffect(() => {
    const handleToggle = () => setIsOpen(prev => !prev);
    const handleClose = () => setIsOpen(false);
    window.addEventListener('toggle-admin-sidebar', handleToggle);
    window.addEventListener('close-admin-sidebar', handleClose);
    return () => {
      window.removeEventListener('toggle-admin-sidebar', handleToggle);
      window.removeEventListener('close-admin-sidebar', handleClose);
    };
  }, []);

  useEffect(() => {
    setIsOpen(false);
    setQuery('');
  }, [pathname]);

  // Recordar secciones plegadas (solo comodidad local)
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setOpenSections(JSON.parse(raw));
    } catch { /* sin almacenamiento disponible */ }
  }, []);

  const toggleSection = (key: SectionKey) => {
    setOpenSections(prev => {
      const current = prev[key] ?? SECTION_META[key].defaultOpen;
      const next = { ...prev, [key]: !current };
      try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  };

  // Negocio + entitlements
  useEffect(() => {
    async function loadBusinessContext() {
      try {
        const [resNeg, resEnt] = await Promise.all([
          fetch('/api/negocio'),
          fetch('/api/admin/entitlements')
        ]);
        if (resEnt.ok) {
          const entData = await resEnt.json();
          if (entData.success && entData.entitlements?.capabilities) {
            setEffectiveCaps(entData.entitlements.capabilities);
          }
        }
        if (resNeg.ok) {
          const data = await resNeg.json();
          if (data && (data.nombre || data.slug)) setBiz(data);
        }
      } catch (err) {
        console.error('Error cargando contexto del negocio en sidebar:', err);
      } finally {
        setEntitlementsLoaded(true);
      }
    }
    loadBusinessContext();
  }, []);

  useEffect(() => {
    async function fetchBadges() {
      try {
        const resP = await fetch('/api/admin/pedidos/pending-count');
        if (resP.ok) {
          const d = await resP.json();
          setPendingOrders(d.count || 0);
        }
      } catch (_) {}
    }
    fetchBadges();
  }, [pathname]);

  const vertical = useMemo(() => resolveVertical(biz, effectiveCaps), [biz, effectiveCaps]);
  const capabilities = useMemo(() => computeCapabilities(biz, effectiveCaps), [biz, effectiveCaps]);
  const allowedModules: string[] | null = userObj?.allowedModules || null;

  function buildMenu(): { items: MenuItem[]; matcher: (code: string, href: string) => boolean } {
    const { isDental, isGym, isShoeCare, isCafeteria, isRestaurant } = vertical;
    const lockLabel = 'Pro';

    // ── ODONTOLOGÍA ──
    if (isDental) {
      const clinicalLocked = !capabilities.clinical_records && !isRealSuperAdmin;
      const items: MenuItem[] = [
        { name: 'Inicio', href: '/admin', icon: LayoutDashboard, section: 'INICIO' },
        { name: 'Agenda', href: '/admin/citas', icon: CalendarDays, section: 'DIA_A_DIA' },
        // La historia clínica, el odontograma y las consultas viven dentro de la ficha de cada paciente.
        { name: 'Pacientes', href: '/admin/pacientes', icon: Contact, section: 'DIA_A_DIA' },
        { name: 'Planes de tratamiento', href: '/admin/tratamientos', icon: ClipboardList, section: 'DIA_A_DIA', isLocked: clinicalLocked, lockedBadge: 'Crecimiento' },
        { name: 'Radiografías y archivos', href: '/admin/documentos', icon: ImageIcon, section: 'DIA_A_DIA', isLocked: clinicalLocked, lockedBadge: 'Crecimiento' },

        { name: 'Servicios y precios', href: '/admin/servicios', icon: ToothIcon, section: 'CATALOGO', roles: ADMIN_ROLES },
        ...(capabilities.catalog ? [
          { name: 'Productos', href: '/admin/productos', icon: Sparkles, section: 'CATALOGO' as SectionKey, roles: ADMIN_ROLES },
          { name: 'Inventario', href: '/admin/inventario', icon: Package, section: 'CATALOGO' as SectionKey, roles: ADMIN_ROLES },
          { name: 'Categorías', href: '/admin/categorias', icon: Tags, section: 'CATALOGO' as SectionKey, roles: ADMIN_ROLES },
        ] : []),

        { name: 'Doctores', href: '/admin/staff', icon: Users, section: 'CLIENTES_EQUIPO' },
        { name: 'Usuarios y permisos', href: '/admin/usuarios', icon: ShieldCheck, section: 'CLIENTES_EQUIPO', roles: ADMIN_ROLES },

        { name: 'Promociones', href: '/admin/promociones', icon: Tags, section: 'ATRAER', roles: ADMIN_ROLES },
        { name: 'Mensajes y campañas', href: '/admin/comunicacion', icon: MessageSquare, section: 'ATRAER', roles: ADMIN_ROLES },
        { name: 'Club de beneficios', href: '/admin/misiones', icon: Trophy, section: 'ATRAER' },
        { name: 'Gana días gratis', href: '/admin/misiones-citiox', icon: Target, section: 'INICIO' },
        { name: 'Antes y después', href: '/admin/resultados', icon: Sparkles, section: 'MI_PAGINA', roles: [...ADMIN_ROLES, 'RECEPCIONISTA', 'DENTISTA'] },

        { name: 'Caja', href: '/admin/caja', icon: Wallet, section: 'DINERO', roles: ADMIN_ROLES },
        { name: 'Reportes', href: '/admin/reportes', icon: BarChart3, section: 'DINERO', roles: ADMIN_ROLES },

        ...settingsItems({ payments: true, profileLabel: 'Datos de la clínica' }),
      ];
      return { items, matcher: dentalModuleMatch };
    }

    // ── GIMNASIO ──
    if (isGym) {
      const items: MenuItem[] = [
        { name: 'Inicio', href: '/admin', icon: LayoutDashboard, section: 'INICIO' },
        { name: 'Control de acceso', href: '/admin/accesos', icon: Scan, section: 'DIA_A_DIA' },
        { name: 'Asistencias', href: '/admin/asistencias', icon: CalendarCheck, section: 'DIA_A_DIA' },
        { name: 'Clases y horarios', href: '/admin/clases', icon: CalendarDays, section: 'DIA_A_DIA' },
        { name: 'Membresías', href: '/admin/membresias', icon: CreditCard, section: 'DIA_A_DIA', roles: ADMIN_ROLES },

        { name: 'Planes y tarifas', href: '/admin/membresias/planes', icon: Tags, section: 'CATALOGO', roles: ADMIN_ROLES },

        { name: 'Socios', href: '/admin/socios', icon: Contact, section: 'CLIENTES_EQUIPO', roles: ADMIN_ROLES },
        { name: 'Entrenadores', href: '/admin/staff', icon: Users, section: 'CLIENTES_EQUIPO', roles: ADMIN_ROLES },
        { name: 'Usuarios y permisos', href: '/admin/usuarios', icon: ShieldCheck, section: 'CLIENTES_EQUIPO', roles: ADMIN_ROLES },

        { name: 'Promociones', href: '/admin/promociones', icon: Tags, section: 'ATRAER', roles: ADMIN_ROLES },
        { name: 'Mensajes y campañas', href: '/admin/comunicacion', icon: MessageSquare, section: 'ATRAER', roles: ADMIN_ROLES },
        { name: 'Club de beneficios', href: '/admin/misiones', icon: Trophy, section: 'ATRAER' },
        { name: 'Gana días gratis', href: '/admin/misiones-citiox', icon: Target, section: 'INICIO' },
        { name: 'Conoce el gimnasio', href: '/admin/marketing/conoce-el-gym', icon: Building2, section: 'ATRAER', roles: ADMIN_ROLES },

        { name: 'Caja', href: '/admin/caja', icon: Wallet, section: 'DINERO', roles: ADMIN_ROLES },
        { name: 'Reportes', href: '/admin/reportes', icon: BarChart3, section: 'DINERO', roles: ADMIN_ROLES },

        ...settingsItems({ payments: true, profileLabel: 'Datos del gimnasio' }),
      ];
      return { items, matcher: gymModuleMatch };
    }

    // ── RESTO DE VERTICALES ──
    const items: MenuItem[] = [
      { name: 'Inicio', href: '/admin', icon: LayoutDashboard, section: 'INICIO' }
    ];

    // Día a día
    if (capabilities.pos || isCafeteria || isRestaurant) {
      items.push({ name: 'Punto de venta', href: '/admin/pos', icon: Coffee, section: 'DIA_A_DIA' });
    }
    if (capabilities.orders) {
      items.push({ name: 'Pedidos online', href: '/admin/pedidos-online', icon: Bike, section: 'DIA_A_DIA', badge: pendingOrders > 0 ? pendingOrders : undefined });
      items.push({ name: 'Historial de ventas', href: '/admin/ventas', icon: Store, section: 'DIA_A_DIA' });
    }
    if (isShoeCare || capabilities.shoe_care || capabilities.service_orders) {
      items.push({ name: 'Órdenes de servicio', href: '/admin/ordenes-servicio', icon: ClipboardList, section: 'DIA_A_DIA' });
      items.push({ name: 'Recepción de prendas', href: '/admin/recepciones', icon: ShoppingBag, section: 'DIA_A_DIA' });
    }
    if (capabilities.dispatch) {
      items.push({ name: 'Despacho', href: '/admin/despacho', icon: ClipboardList, section: 'DIA_A_DIA' });
    }
    if (capabilities.tables && isRestaurant) {
      items.push({ name: 'Mesas', href: '/admin/mesas', icon: Layout, section: 'DIA_A_DIA' });
    }
    if (capabilities.kitchen) {
      items.push({ name: 'Cocina', href: '/admin/cocina', icon: Utensils, section: 'DIA_A_DIA' });
    } else if (isRestaurant && capabilities.orders) {
      items.push({ name: 'Cocina', href: '/admin/cocina', icon: Utensils, section: 'DIA_A_DIA', isLocked: true, lockedBadge: lockLabel });
    }
    if (capabilities.memberships || capabilities.access || capabilities.attendance) {
      items.push({ name: 'Control de acceso', href: '/admin/accesos', icon: Scan, section: 'DIA_A_DIA' });
      items.push({ name: 'Asistencias', href: '/admin/asistencias', icon: CalendarCheck, section: 'DIA_A_DIA' });
      items.push({ name: 'Clases y horarios', href: '/admin/clases', icon: CalendarDays, section: 'DIA_A_DIA' });
      items.push({ name: 'Membresías', href: '/admin/membresias', icon: CreditCard, section: 'DIA_A_DIA' });
    }
    if (capabilities.appointments && !isShoeCare) {
      items.push({ name: capabilities.courts ? 'Reservas' : 'Agenda', href: '/admin/citas', icon: CalendarDays, section: 'DIA_A_DIA' });
    }
    if (capabilities.courts || (capabilities.appointments && !isShoeCare)) {
      items.push({ name: 'Bloquear horarios', href: '/admin/bloqueos', icon: Lock, section: 'DIA_A_DIA' });
    }

    // Catálogo
    if (capabilities.courts) {
      items.push({ name: 'Canchas', href: '/admin/canchas', icon: Dribbble, section: 'CATALOGO' });
    }
    if (capabilities.services && !capabilities.courts) {
      items.push({ name: 'Servicios', href: '/admin/servicios', icon: Scissors, section: 'CATALOGO', roles: ADMIN_ROLES });
    }
    if (!capabilities.catalog && !capabilities.orders && !capabilities.courts && !capabilities.memberships) {
      // Spa, barbería, consultorio…: la venta de productos (con delivery) se activa como add-on
      items.push({ name: 'Venta de productos', href: '/admin/plan#addons', icon: Sparkles, section: 'CATALOGO', roles: ADMIN_ROLES, isLocked: true, lockedBadge: 'Add-on' });
    }
    if (capabilities.catalog) {
      items.push({ name: 'Productos', href: '/admin/productos', icon: Sparkles, section: 'CATALOGO', roles: ADMIN_ROLES });
      items.push({ name: 'Categorías', href: '/admin/categorias', icon: Tags, section: 'CATALOGO', roles: ADMIN_ROLES });
      items.push({ name: 'Inventario', href: '/admin/inventario', icon: Package, section: 'CATALOGO', roles: ADMIN_ROLES });
    }

    // Inventario y producción (cafeterías, manufactura)
    if (capabilities.recipes || isCafeteria) {
      items.push({ name: 'Recetas', href: '/admin/recetas', icon: ChefHat, section: 'INVENTARIO', roles: ADMIN_ROLES });
    }
    if (capabilities.production || isCafeteria) {
      items.push({ name: 'Producción', href: '/admin/produccion', icon: Package, section: 'INVENTARIO', roles: ADMIN_ROLES });
    }
    if (capabilities.costing || isCafeteria) {
      items.push({ name: 'Costos y márgenes', href: '/admin/costos', icon: Calculator, section: 'INVENTARIO', roles: ADMIN_ROLES });
    }
    if (capabilities.purchases || isCafeteria) {
      items.push({ name: 'Compras', href: '/admin/compras', icon: ShoppingBag, section: 'INVENTARIO', roles: ADMIN_ROLES });
      items.push({ name: 'Proveedores', href: '/admin/proveedores', icon: Users, section: 'INVENTARIO', roles: ADMIN_ROLES });
      items.push({ name: 'Cuentas por pagar', href: '/admin/cuentas-por-pagar', icon: Receipt, section: 'INVENTARIO', roles: ADMIN_ROLES });
    }
    if (capabilities.multi_warehouse || isCafeteria) {
      items.push({ name: 'Bodegas', href: '/admin/bodegas', icon: Warehouse, section: 'INVENTARIO', roles: ADMIN_ROLES });
    }
    if (capabilities.multi_warehouse || isCafeteria || capabilities.purchases) {
      items.push({ name: 'Transferencias', href: '/admin/transferencias', icon: Truck, section: 'INVENTARIO', roles: ADMIN_ROLES });
    }

    // Clientes y equipo
    items.push({ name: capabilities.courts ? 'Clientes y jugadores' : 'Clientes', href: '/admin/clientes', icon: Contact, section: 'CLIENTES_EQUIPO', roles: ADMIN_ROLES });
    if (capabilities.appointments && !capabilities.courts && !isShoeCare) {
      items.push({ name: 'Profesionales', href: '/admin/staff', icon: Users, section: 'CLIENTES_EQUIPO', roles: ADMIN_ROLES });
    }
    if (capabilities.delivery) {
      items.push({ name: 'Repartidores', href: '/admin/repartidores', icon: Truck, section: 'CLIENTES_EQUIPO', roles: ADMIN_ROLES });
    } else if (capabilities.orders) {
      items.push({ name: 'Repartidores', href: '/admin/repartidores', icon: Truck, section: 'CLIENTES_EQUIPO', roles: ADMIN_ROLES, isLocked: true, lockedBadge: 'Add-on' });
    }
    items.push({ name: 'Usuarios y permisos', href: '/admin/usuarios', icon: ShieldCheck, section: 'CLIENTES_EQUIPO', roles: ADMIN_ROLES });
    if (capabilities.payroll) {
      items.push({ name: 'Nómina e IESS', href: '/admin/nomina', icon: Users, section: 'CLIENTES_EQUIPO', roles: ADMIN_ROLES });
    }

    // Atraer clientes
    items.push({ name: 'Promociones', href: '/admin/promociones', icon: Tags, section: 'ATRAER', roles: ADMIN_ROLES, isLocked: !capabilities.promotions, lockedBadge: lockLabel });
    items.push({ name: 'Mensajes y campañas', href: '/admin/comunicacion', icon: MessageSquare, section: 'ATRAER', roles: ADMIN_ROLES, isLocked: !capabilities.communications, lockedBadge: lockLabel });
    items.push({ name: 'Club de beneficios', href: '/admin/misiones', icon: Trophy, section: 'ATRAER', isLocked: !capabilities.loyalty, lockedBadge: lockLabel });
    items.push({ name: 'Gana días gratis', href: '/admin/misiones-citiox', icon: Target, section: 'INICIO' });
    if (capabilities.courses) {
      items.push({ name: 'Cursos y academia', href: '/admin/cursos', icon: GraduationCap, section: 'ATRAER' });
    } else if (!isRestaurant) {
      items.push({ name: 'Cursos y academia', href: '/admin/cursos', icon: GraduationCap, section: 'ATRAER', isLocked: true, lockedBadge: capabilities.courts ? 'Academia' : lockLabel });
    }
    if (!isRestaurant && !isCafeteria && !vertical.isStore) {
      items.push({ name: 'Antes y después', href: '/admin/resultados', icon: Smile, section: 'MI_PAGINA', roles: [...ADMIN_ROLES, 'RECEPCIONISTA'] });
    }

    // Dinero
    items.push({ name: 'Caja', href: '/admin/caja', icon: Wallet, section: 'DINERO' });
    items.push({ name: 'Reportes', href: '/admin/reportes', icon: BarChart3, section: 'DINERO', roles: ADMIN_ROLES });
    if (capabilities.electronic_billing || isCafeteria) {
      items.push({ name: 'Facturación SRI', href: '/admin/facturacion', icon: FileText, section: 'DINERO', roles: ADMIN_ROLES });
    }

    items.push(...settingsItems({ payments: capabilities.payments }));
    return { items, matcher: genericModuleMatch };
  }

  const { items: rawItems, matcher } = buildMenu();

  const menuItems = rawItems.filter(item => {
    if (item.href === '/superadmin') return isRealSuperAdmin;

    if (!isRealSuperAdmin && allowedModules && Array.isArray(allowedModules) && allowedModules.length > 0 && !allowedModules.includes('*')) {
      if (item.href === '/admin') return allowedModules.length > 1;
      const isModuleAllowed = allowedModules.some(modCode => {
        if (!modCode || typeof modCode !== 'string') return false;
        return matcher(modCode.toLowerCase().trim(), item.href);
      });
      if (!isModuleAllowed) return false;
    }

    if (!item.roles) return true;
    if (isRealSuperAdmin) return true;
    return item.roles.some(r => r === role || r === 'ADMIN' || r === 'ADMIN_NEGOCIO');
  });

  const unlockedItems = menuItems.filter(i => !i.isLocked);
  const lockedItems = menuItems.filter(i => i.isLocked);

  // Ítem activo = el href más largo que coincide con la ruta actual
  const activeHref = useMemo(() => {
    let best = '';
    for (const item of menuItems) {
      const matches = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href + '/')) || (item.href !== '/admin' && pathname === item.href);
      if (matches && item.href.length > best.length) best = item.href;
    }
    return best;
  }, [menuItems, pathname]);

  const grouped = SECTION_ORDER
    .map(key => ({
      key,
      items: unlockedItems
        .filter(i => i.section === key)
        // En "Mi página", el diseño primero y "Antes y después" al final
        .sort((x, y) => (x.href === '/admin/resultados' ? 1 : 0) - (y.href === '/admin/resultados' ? 1 : 0)),
    }))
    .filter(g => g.items.length > 0);

  // Búsqueda en el menú (ignora tildes y mayúsculas)
  const normalize = (t: string) => t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const q = normalize(query.trim());
  const searchResults = q
    ? menuItems.filter(i => normalize(i.name).includes(q) || normalize(SECTION_META[i.section].title).includes(q))
    : [];

  const isSectionOpen = (key: SectionKey, items: MenuItem[]) => {
    const meta = SECTION_META[key];
    if (!meta.collapsible) return true;
    if (items.some(i => i.href === activeHref)) return true;
    return openSections[key] ?? meta.defaultOpen;
  };

  const handleLogout = async () => {
    const isConfirmed = await confirm('¿Seguro que quieres salir del panel?', {
      title: '¿Cerrar sesión?',
      confirmText: 'Cerrar sesión',
      cancelText: 'Cancelar',
      type: 'danger',
    });
    if (isConfirmed) {
      signOut({ callbackUrl: '/login' });
    }
  };

  const renderItem = (item: MenuItem) => {
    const Icon = item.icon;
    const isActive = item.href === activeHref;
    return (
      <Link
        key={`${item.section}-${item.href}-${item.name}`}
        href={item.href}
        onClick={() => setIsOpen(false)}
        aria-current={isActive ? 'page' : undefined}
        className={cn(
          "flex items-center justify-between px-3 py-1.5 rounded-lg text-sm transition-colors group relative",
          isActive
            ? "bg-slate-100 text-slate-900 font-semibold"
            : "text-slate-600 font-medium hover:text-slate-900 hover:bg-slate-50"
        )}
      >
        <div className="flex items-center gap-3 min-w-0">
          <Icon
            className={cn("w-4 h-4 shrink-0", isActive ? "" : "text-slate-400 group-hover:text-slate-600")}
            style={{ color: isActive ? primaryColor : undefined }}
          />
          <span className="truncate">{item.name}</span>
        </div>

        {item.isLocked ? (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-xs font-medium shrink-0">
            <Lock size={11} />
            {item.lockedBadge || 'Pro'}
          </span>
        ) : item.isNew && !isActive ? (
          <span className="px-1.5 py-px rounded text-[9px] font-bold uppercase tracking-wide text-white shrink-0 ml-1" style={{ backgroundColor: primaryColor }}>
            Nuevo
          </span>
        ) : (
          item.badge !== undefined && item.badge > 0 && (
            <span
              style={{ backgroundColor: primaryColor }}
              className="min-w-5 px-1.5 py-0.5 rounded-full text-xs font-semibold text-white text-center"
            >
              {item.badge}
            </span>
          )
        )}

        {isActive && (
          <span
            style={{ backgroundColor: primaryColor }}
            className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full"
          />
        )}
      </Link>
    );
  };

  return (
    <>
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="md:hidden fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[190]"
        />
      )}

      <aside
        className={cn(
          "fixed top-0 left-0 bottom-0 w-72 md:w-64 bg-white border-r border-slate-200/80 z-[200] md:z-40 flex flex-col transition-transform duration-300 ease-in-out md:translate-x-0 shadow-2xl md:shadow-none",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
        aria-label="Menú del panel"
      >
        {/* Cabecera */}
        <div className="h-14 px-4 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div
              style={{ backgroundColor: primaryColor }}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0"
            >
              <ZendaLogo size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-semibold text-slate-900 truncate">
                {businessName || 'Tu negocio'}
              </h2>
              <p className="text-xs text-slate-500 truncate">Panel de administración</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="md:hidden size-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 shrink-0 ml-1.5"
            aria-label="Cerrar menú"
          >
            <X size={18} />
          </button>
        </div>

        <BranchWarehouseSelector primaryColor={primaryColor} userRole={role} />

        {/* Mi página pública: ver y cambiar diseño */}
        {businessSlug && (
          <div className="px-3 pt-2.5 shrink-0">
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-2">
              <div className="flex items-center gap-2.5 px-0.5">
                <div className="size-7 rounded-lg text-white flex items-center justify-center shrink-0" style={{ backgroundColor: primaryColor }}>
                  <Globe size={14} />
                </div>
                <div className="min-w-0">
                  <span className="block text-sm font-semibold text-slate-900 leading-tight">Mi página</span>
                  <span className="block text-xs text-slate-500 truncate">citiox.com/{businessSlug}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-1.5 mt-2">
                <a
                  href={`/${businessSlug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                  title="Abrir la página que ven tus clientes"
                >
                  <Eye size={13} /> Ver
                </a>
                {!(role === 'STAFF' || role === 'PROFESIONAL') ? (
                  <Link
                    href="/admin/diseno"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    <Palette size={13} /> Diseño
                  </Link>
                ) : (
                  <a
                    href={`/${businessSlug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    <ExternalLink size={13} /> Abrir
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Buscar en el menú */}
        {entitlementsLoaded && menuItems.length > 10 && (
          <div className="px-3 pt-2.5 shrink-0">
            <label className="relative block">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Escape') setQuery(''); }}
                placeholder="Buscar en el menú"
                aria-label="Buscar en el menú"
                className="w-full !pl-9 !pr-3 !py-1.5 !text-sm !rounded-lg !border !border-slate-200 !bg-white focus:!border-slate-400 outline-none"
              />
            </label>
          </div>
        )}

        {/* Navegación */}
        <nav className="flex-1 overflow-y-auto px-3 py-2.5 space-y-3 scrollbar-thin scrollbar-thumb-slate-200">
          {!entitlementsLoaded ? (
            <div className="space-y-2 px-1" aria-hidden>
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-8 rounded-lg bg-slate-100 animate-pulse" />
              ))}
            </div>
          ) : q ? (
            <div className="space-y-0.5">
              {searchResults.length > 0 ? (
                searchResults.map(renderItem)
              ) : (
                <p className="px-3 py-6 text-sm text-slate-500 text-center">No encontramos “{query}” en el menú.</p>
              )}
            </div>
          ) : (
            <>
              {grouped.map(({ key, items }) => {
                const meta = SECTION_META[key];
                const open = isSectionOpen(key, items);
                return (
                  <div key={key} className="space-y-0.5">
                    {meta.title && (
                      meta.collapsible ? (
                        <button
                          type="button"
                          onClick={() => toggleSection(key)}
                          aria-expanded={open}
                          className="w-full flex items-center justify-between px-3 py-1 text-xs font-semibold text-slate-500 hover:text-slate-800 rounded-md"
                        >
                          <span>{meta.title}</span>
                          <ChevronDown size={14} className={cn("transition-transform", open ? "rotate-180" : "")} />
                        </button>
                      ) : (
                        <h3 className="px-3 py-1 text-xs font-semibold text-slate-500">{meta.title}</h3>
                      )
                    )}
                    {open && items.map(renderItem)}
                  </div>
                );
              })}

              {lockedItems.length > 0 && (
                <div className="space-y-0.5 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowLocked(v => !v)}
                    aria-expanded={showLocked}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50"
                  >
                    <span className="flex items-center gap-3">
                      <Sparkles className="w-4 h-4" style={{ color: primaryColor }} />
                      Más funciones
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="text-xs text-slate-400">{lockedItems.length}</span>
                      <ChevronDown size={14} className={cn("text-slate-400 transition-transform", showLocked ? "rotate-180" : "")} />
                    </span>
                  </button>
                  {showLocked && (
                    <>
                      {lockedItems.map(renderItem)}
                      <Link
                        href="/admin/plan"
                        className="block mx-3 mt-1 text-xs font-semibold hover:underline"
                        style={{ color: primaryColor }}
                      >
                        Ver planes y precios →
                      </Link>
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </nav>

        {/* Usuario + salir */}
        <div className="p-2.5 border-t border-slate-100 shrink-0">
          <div className="flex items-center justify-between gap-2 p-1.5 rounded-xl bg-slate-50">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-slate-700 font-semibold text-sm shrink-0 border border-slate-200">
                {(session?.user?.name || 'A')[0].toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">
                  {session?.user?.name || 'Administrador'}
                </p>
                <p className="text-xs text-slate-500 truncate">{roleLabel(role)}</p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-white transition-colors"
              title="Cerrar sesión"
              aria-label="Cerrar sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

function roleLabel(role: string): string {
  const map: Record<string, string> = {
    SUPERADMIN: 'Super administrador',
    SUPER_ADMIN: 'Super administrador',
    ADMIN: 'Administrador',
    ADMIN_NEGOCIO: 'Dueño / administrador',
    OWNER: 'Dueño',
    STAFF: 'Equipo',
    RECEPCIONISTA: 'Recepción',
    DENTISTA: 'Doctor',
  };
  return map[role] || role;
}

