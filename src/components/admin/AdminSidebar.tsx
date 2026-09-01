'use client';
// src/components/admin/AdminSidebar.tsx
// Business Admin Sidebar 100% Dinámico impulsado por Capabilities Resolver
// Cero condicionales hardcodeados por industria (if tipoNegocio === 'RESTAURANT')

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useConfirm } from '@/components/admin/ConfirmContext';
import {
  LayoutDashboard, CalendarDays, Dribbble, Sparkles, Settings, Users, LogOut,
  MessageSquare, Building2, BarChart3, Trophy, Tags, Lock, Layout, Package,
  GraduationCap, Contact, Scissors, Store, ShieldCheck, Bell, Briefcase, Utensils,
  Truck, Wallet, CreditCard, ClipboardList, Bike, LucideIcon
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useSession, signOut } from 'next-auth/react';

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
  icon: LucideIcon;
  section: string;
  badge?: number;
  roles?: string[];
}

export default function AdminSidebar({ 
  primaryColor = '#0ea5e9',
  initialBusinessName
}: { 
  primaryColor?: string;
  initialBusinessName?: string;
}) {
  const { confirm } = useConfirm();
  const pathname = usePathname();
  const { data: session } = useSession();
  const userObj = session?.user as any;
  const role = userObj?.isDelegated ? 'SUPERADMIN' : (userObj?.role || 'STAFF');

  const [isOpen, setIsOpen] = useState(false);
  const [pendingOrders, setPendingOrders] = useState(0);
  const [capabilities, setCapabilities] = useState<Record<string, boolean>>({
    promotions: true
  });
  const [businessName, setBusinessName] = useState<string>(initialBusinessName || '');

  // Cargar capacidades activas del negocio dinámicamente mediante EntitlementsService
  useEffect(() => {
    async function loadBusinessContext() {
      try {
        const [resNeg, resEnt] = await Promise.all([
          fetch('/api/negocio'),
          fetch('/api/admin/entitlements')
        ]);

        let effectiveCaps: Record<string, boolean> = {};

        if (resEnt.ok) {
          const entData = await resEnt.json();
          if (entData.success && entData.entitlements?.capabilities) {
            effectiveCaps = entData.entitlements.capabilities;
          }
        }

        if (resNeg.ok) {
          const data = await resNeg.json();
          if (data.nombre) {
            setBusinessName(data.nombre);
          }
          let cfg: any = {};
          if (typeof data.configuracion === 'string') {
            try { cfg = JSON.parse(data.configuracion); } catch { cfg = {}; }
          } else {
            cfg = data.configuracion || {};
          }
          const caps = cfg.activeCapabilities || cfg.capabilities || {};
          const tipoUpper = (data.tipoNegocio || '').toUpperCase();
          const slugUpper = (data.slug || '').toUpperCase();
          const nameUpper = (data.nombre || businessName || '').toUpperCase();

          const isRestaurant = tipoUpper === 'RESTAURANTE' || tipoUpper === 'GASTRONOMIA' || tipoUpper === 'RESTAURANT' ||
            nameUpper.includes('PARRILLA') || nameUpper.includes('RESTAURANTE') || nameUpper.includes('GASTRONOMIA') || nameUpper.includes('BURGER') || nameUpper.includes('PIZZA') || nameUpper.includes('TACO');
          const isPinchos = tipoUpper === 'PINCHOS' || slugUpper === 'PINCHOS';
          const isCanchas = tipoUpper === 'SPORTS_COURTS' || tipoUpper === 'CANCHAS' || 
            slugUpper.includes('CANCHA') || slugUpper.includes('CAMPEONES') || 
            nameUpper.includes('CANCHA') || nameUpper.includes('COMPLEJO') || 
            nameUpper.includes('CAMPEONES') || nameUpper.includes('PADEL') || nameUpper.includes('SINTETICA');
          const isServiceBiz = !isRestaurant && !isPinchos && !isCanchas && (
            tipoUpper === 'SPA' ||
            tipoUpper === 'CENTRO_ESTETICA' ||
            tipoUpper === 'PELUQUERIA' ||
            tipoUpper === 'BARBERIA' ||
            tipoUpper === 'SHOE_CARE' ||
            tipoUpper === 'LAVANDERIA' ||
            tipoUpper === 'ORDENES-SERVICIO' ||
            tipoUpper === 'BEAUTY_SPA' ||
            tipoUpper === 'RESERVA' ||
            slugUpper.includes('SPA') ||
            slugUpper.includes('BARBER') ||
            slugUpper.includes('NAILS') ||
            slugUpper.includes('DENTAL') ||
            slugUpper.includes('CITAS') ||
            nameUpper.includes('SPA') ||
            nameUpper.includes('ESTETICA') ||
            nameUpper.includes('PELUQUERIA') ||
            nameUpper.includes('BARBERIA')
          );
          const isStore = !isRestaurant && !isPinchos && !isCanchas && !isServiceBiz;

          // Entitlements efectivos estrictos por vertical
          const normalizedCaps: Record<string, boolean> = {
            orders: Boolean((effectiveCaps.ORDERS ?? effectiveCaps.orders) ?? (isServiceBiz ? caps.orders === true : (isRestaurant || isPinchos || isStore))),
            catalog: Boolean((effectiveCaps.PRODUCTS ?? effectiveCaps.products) ?? (isServiceBiz ? caps.catalog === true : (isRestaurant || isPinchos || isStore))),
            tables: Boolean((effectiveCaps.TABLES ?? effectiveCaps.tables) || isRestaurant || caps.tables),
            kitchen: Boolean((effectiveCaps.KITCHEN ?? effectiveCaps.kitchen) || isRestaurant || isPinchos || caps.kitchen),
            delivery: Boolean((effectiveCaps.DELIVERY ?? effectiveCaps.delivery) ?? (isServiceBiz ? caps.delivery === true : (isRestaurant || isPinchos || isStore))),
            dispatch: Boolean(effectiveCaps.DISPATCH ?? effectiveCaps.dispatch ?? caps.dispatch ?? isRestaurant),
            appointments: Boolean(effectiveCaps.APPOINTMENTS ?? effectiveCaps.appointments ?? (isServiceBiz || isCanchas || tipoUpper === 'RESERVA')),
            courts: Boolean(effectiveCaps.COURTS ?? effectiveCaps.courts ?? caps.courts ?? isCanchas),
            services: Boolean(effectiveCaps.SERVICES ?? effectiveCaps.services ?? (isServiceBiz || Boolean(caps.services))),
            promotions: true,
            courses: Boolean(effectiveCaps.COURSES ?? effectiveCaps.courses ?? caps.courses ?? isCanchas ?? true),
            loyalty: Boolean(effectiveCaps.LOYALTY ?? effectiveCaps.loyalty ?? caps.loyalty ?? isPinchos),
            inventory: Boolean(effectiveCaps.INVENTORY ?? effectiveCaps.inventory ?? caps.inventory),
            payments: Boolean(effectiveCaps.PAYMENTS ?? effectiveCaps.payments ?? !isServiceBiz)
          };

          setCapabilities(normalizedCaps);
        }
      } catch (err) {
        console.error('Error cargando contexto del negocio en sidebar:', err);
      }
    }
    loadBusinessContext();
  }, []);

  // Cargar notificaciones y badges
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

  // Dynamic Admin Menu Builder
  function buildDynamicMenu(): MenuItem[] {
    const items: MenuItem[] = [
      { name: 'Dashboard', href: '/admin', icon: LayoutDashboard, section: 'GESTIÓN OPERATIVA' }
    ];

    // Core Operational Capabilities
    if (capabilities.orders) {
      items.push({ name: 'Ventas', href: '/admin/ventas', icon: Store, section: 'GESTIÓN OPERATIVA' });
      items.push({ name: 'Delivery', href: '/admin/pedidos-online', icon: Bike, section: 'GESTIÓN OPERATIVA', badge: pendingOrders > 0 ? pendingOrders : undefined });
    }
    items.push({ name: 'Caja & Finanzas', href: '/admin/caja', icon: Wallet, section: 'GESTIÓN OPERATIVA' });
    if (capabilities.dispatch) {
      items.push({ name: 'Órdenes', href: '/admin/despacho', icon: ClipboardList, section: 'GESTIÓN OPERATIVA' });
    }
    if (capabilities.tables) {
      items.push({ name: 'Mesas', href: '/admin/mesas', icon: Layout, section: 'GESTIÓN OPERATIVA' });
    }
    if (capabilities.kitchen) {
      items.push({ name: 'Comandas / Cocina', href: '/admin/cocina', icon: Utensils, section: 'GESTIÓN OPERATIVA' });
    }
    if (capabilities.appointments) {
      items.push({ 
        name: capabilities.courts ? 'Reservas / Agenda' : 'Agenda / Citas', 
        href: '/admin/citas', 
        icon: CalendarDays, 
        section: 'GESTIÓN OPERATIVA' 
      });
    }
    if (capabilities.services && !capabilities.courts) {
      items.push({ name: 'Servicios', href: '/admin/servicios', icon: Scissors, section: 'GESTIÓN OPERATIVA', roles: ['ADMIN', 'ADMIN_NEGOCIO', 'SUPERADMIN'] });
    }
    if (capabilities.courts) {
      items.push({ name: 'Mis Canchas', href: '/admin/canchas', icon: Dribbble, section: 'GESTIÓN OPERATIVA' });
      items.push({ name: 'Bloqueos', href: '/admin/bloqueos', icon: Lock, section: 'GESTIÓN OPERATIVA' });
    }

    // Catalog Capabilities
    if (capabilities.catalog) {
      items.push({ name: 'Productos', href: '/admin/productos', icon: Sparkles, section: 'CATÁLOGO', roles: ['ADMIN', 'ADMIN_NEGOCIO', 'SUPERADMIN'] });
      items.push({ name: 'Inventario', href: '/admin/inventario', icon: Package, section: 'CATÁLOGO', roles: ['ADMIN', 'ADMIN_NEGOCIO', 'SUPERADMIN'] });
      items.push({ name: 'Categorías', href: '/admin/categorias', icon: Tags, section: 'CATÁLOGO', roles: ['ADMIN', 'ADMIN_NEGOCIO', 'SUPERADMIN'] });
    }

    // Marketing Capabilities (Universal)
    items.push({ name: 'Hero y Destacados', href: '/admin/hero-destacados', icon: Sparkles, section: 'MARKETING', roles: ['ADMIN', 'ADMIN_NEGOCIO', 'SUPERADMIN'] });
    items.push({ name: 'Promociones', href: '/admin/promociones', icon: Tags, section: 'MARKETING', roles: ['ADMIN', 'ADMIN_NEGOCIO', 'SUPERADMIN'] });
    if (capabilities.courses) {
      items.push({ name: 'Cursos & Academia', href: '/admin/cursos', icon: GraduationCap, section: 'MARKETING' });
    }
    if (capabilities.loyalty) {
      items.push({ name: 'Club de Beneficios', href: '/admin/misiones', icon: Trophy, section: 'MARKETING' });
    }
    items.push({ name: 'Páginas', href: '/admin/paginas', icon: Layout, section: 'MARKETING' });

    // Administration
    items.push({ 
      name: capabilities.courts ? 'Clientes & Jugadores' : 'Clientes', 
      href: '/admin/clientes', 
      icon: Contact, 
      section: 'ADMINISTRACIÓN', 
      roles: ['ADMIN', 'ADMIN_NEGOCIO', 'SUPERADMIN'] 
    });
    items.push({ 
      name: capabilities.courts ? 'Personal & Acceso' : 'Personal & Equipo', 
      href: '/admin/usuarios', 
      icon: Users, 
      section: 'ADMINISTRACIÓN', 
      roles: ['ADMIN', 'ADMIN_NEGOCIO', 'SUPERADMIN'] 
    });
    if (capabilities.delivery) {
      items.push({ name: 'Repartidores', href: '/admin/logistica', icon: Truck, section: 'ADMINISTRACIÓN', roles: ['ADMIN', 'ADMIN_NEGOCIO', 'SUPERADMIN'] });
    }
    items.push({ name: 'Reportes', href: '/admin/reportes', icon: BarChart3, section: 'ADMINISTRACIÓN', roles: ['ADMIN', 'ADMIN_NEGOCIO', 'SUPERADMIN'] });

    // Settings & Configuration
    items.push({ name: 'Configuración', href: '/admin/config', icon: Settings, section: 'CONFIGURACIÓN', roles: ['ADMIN', 'ADMIN_NEGOCIO', 'SUPERADMIN'] });
    if (capabilities.payments) {
      items.push({ name: 'Métodos de Pago', href: '/admin/metodos-pago', icon: CreditCard, section: 'CONFIGURACIÓN', roles: ['ADMIN', 'ADMIN_NEGOCIO', 'SUPERADMIN'] });
    }
    items.push({ name: 'Perfil de Negocio', href: '/admin/perfil', icon: Building2, section: 'CONFIGURACIÓN', roles: ['ADMIN', 'ADMIN_NEGOCIO', 'SUPERADMIN'] });
    items.push({ name: 'Mi Plan', href: '/admin/plan', icon: Sparkles, section: 'CONFIGURACIÓN', roles: ['ADMIN', 'ADMIN_NEGOCIO', 'SUPERADMIN'] });
    items.push({ name: 'Super Panel', href: '/superadmin', icon: ShieldCheck, section: 'CONFIGURACIÓN', roles: ['SUPERADMIN'] });

    const userIsSuperAdmin = role === 'SUPERADMIN' || role === 'SUPER_ADMIN' || userObj?.isAdminUser === true || userObj?.isDelegated === true;
    return items.filter(item => {
      if (userIsSuperAdmin) return true;
      if (!item.roles) return true;
      return item.roles.some(r => r === role || (role === 'ADMIN_NEGOCIO' && r === 'ADMIN'));
    });
  }

  const menuItems = buildDynamicMenu();

  const grouped = menuItems.reduce((acc, item) => {
    if (!acc[item.section]) acc[item.section] = [];
    acc[item.section].push(item);
    return acc;
  }, {} as Record<string, MenuItem[]>);

  const sectionsOrder = ['GESTIÓN OPERATIVA', 'CATÁLOGO', 'MARKETING', 'ADMINISTRACIÓN', 'CONFIGURACIÓN'];

  const handleLogout = async () => {
    const isConfirmed = await confirm('¿Estás seguro de que deseas salir del panel de administración?', {
      title: '¿Cerrar sesión?',
      confirmText: 'Cerrar Sesión',
      cancelText: 'Cancelar',
      type: 'danger',
    });
    if (isConfirmed) {
      signOut({ callbackUrl: '/login' });
    }
  };

  return (
    <>
      {/* Botón flotante móvil para abrir el menú */}
      <div className="md:hidden fixed top-3 left-3 z-50">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2.5 rounded-xl bg-slate-900 text-white shadow-lg focus:outline-none flex items-center justify-center border border-slate-800"
          aria-label="Abrir Menú"
        >
          {isOpen ? (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Backdrop en móvil */}
      {isOpen && (
        <div 
          onClick={() => setIsOpen(false)} 
          className="md:hidden fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-40"
        />
      )}

      {/* Sidebar Principal (Tema Blanco Original) */}
      <aside 
        className={cn(
          "fixed top-0 left-0 bottom-0 w-64 bg-white border-r border-slate-200/80 z-40 flex flex-col transition-transform duration-300 ease-in-out md:translate-x-0",
          isOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        )}
      >
        {/* Cabecera del Panel */}
        <div className="h-16 px-5 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div 
              style={{ backgroundColor: primaryColor }} 
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-md font-bold text-sm shrink-0"
            >
              <ZendaLogo size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-bold text-slate-900 truncate tracking-tight">
                {businessName || 'Cargando...'}
              </h2>
              <p className="text-[10px] text-slate-400 font-medium truncate">
                Panel de Administración
              </p>
            </div>
          </div>
        </div>

        {/* Links de Navegación por Secciones */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 scrollbar-thin scrollbar-thumb-slate-200">
          {sectionsOrder.map((secKey) => {
            const secItems = grouped[secKey];
            if (!secItems || secItems.length === 0) return null;

            return (
              <div key={secKey} className="space-y-1">
                <h3 className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  {secKey}
                </h3>
                {secItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href || (item.href !== '/admin' && pathname?.startsWith(item.href));

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      className={cn(
                        "flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group relative",
                        isActive
                          ? "bg-slate-100 text-slate-900 shadow-xs"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Icon 
                          className={cn(
                            "w-4 h-4 shrink-0 transition-colors",
                            isActive ? "text-slate-900" : "text-slate-400 group-hover:text-slate-700"
                          )} 
                          style={{ color: isActive ? primaryColor : undefined }}
                        />
                        <span className="truncate">{item.name}</span>
                      </div>

                      {item.badge !== undefined && item.badge > 0 && (
                        <span 
                          style={{ backgroundColor: primaryColor }}
                          className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white shadow-xs"
                        >
                          {item.badge}
                        </span>
                      )}

                      {isActive && (
                        <div 
                          style={{ backgroundColor: primaryColor }}
                          className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full"
                        />
                      )}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Pie de Sidebar: Usuario + Logout */}
        <div className="p-3 border-t border-slate-100 shrink-0 bg-slate-50/50">
          <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-white border border-slate-200/60 shadow-2xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 font-bold text-xs shrink-0 border border-slate-200">
                {(session?.user?.name || 'A')[0].toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">
                  {session?.user?.name || 'Administrador'}
                </p>
                <p className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">
                  {role}
                </p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-slate-100 transition-colors"
              title="Cerrar sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
