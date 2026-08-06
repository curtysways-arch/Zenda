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
  Truck, Wallet, LucideIcon
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

export default function AdminSidebar({ primaryColor = '#0ea5e9' }: { primaryColor?: string }) {
  const { confirm } = useConfirm();
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = (session?.user as any)?.role || 'STAFF';

  const [isOpen, setIsOpen] = useState(false);
  const [pendingOrders, setPendingOrders] = useState(0);
  const [pendingAppointments, setPendingAppointments] = useState(0);
  const [capabilities, setCapabilities] = useState<Record<string, boolean>>({});

  // Cargar capacidades activas del negocio dinámicamente
  useEffect(() => {
    async function loadBusinessContext() {
      try {
        const res = await fetch('/api/negocio');
        if (res.ok) {
          const data = await res.json();
          let cfg: any = {};
          if (typeof data.configuracion === 'string') {
            try { cfg = JSON.parse(data.configuracion); } catch { cfg = {}; }
          } else {
            cfg = data.configuracion || {};
          }
          const caps = cfg.activeCapabilities || cfg.capabilities || {};
          
          // Mapeo automático de fallback para negocios legacy
          const normalizedCaps: Record<string, boolean> = {
            orders: Boolean(caps.orders || data.tipoNegocio === 'PRODUCTOS' || data.tipoNegocio === 'RESTAURANT'),
            catalog: Boolean(caps.catalog || caps.products || data.tipoNegocio === 'PRODUCTOS' || data.tipoNegocio === 'RESTAURANT'),
            tables: Boolean(caps.tables),
            kitchen: Boolean(caps.kitchen),
            delivery: Boolean(caps.delivery),
            dispatch: Boolean(caps.dispatch || caps.delivery || caps.orders || data.tipoNegocio === 'PRODUCTOS' || data.tipoNegocio === 'RESTAURANT'),
            appointments: Boolean(caps.appointments || data.tipoNegocio === 'RESERVA' || data.tipoNegocio === 'SPA'),
            courts: Boolean(caps.courts || data.tipoNegocio === 'SPORTS_COURTS'),
            services: Boolean(caps.services || data.tipoNegocio === 'SHOE_CARE' || data.tipoNegocio === 'ordenes-servicio'),
            promotions: Boolean(caps.promotions !== false),
            courses: Boolean(caps.courses),
            loyalty: Boolean(caps.loyalty)
          };
          setCapabilities(normalizedCaps);
        }
      } catch (err) {
        console.error("Error cargando capabilities del negocio", err);
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
      items.push({ name: 'Pedidos', href: '/admin/pedidos', icon: Package, section: 'GESTIÓN OPERATIVA', badge: pendingOrders > 0 ? pendingOrders : undefined });
    }
    if (capabilities.dispatch) {
      items.push({ name: 'Despacho', href: '/admin/despacho', icon: Truck, section: 'GESTIÓN OPERATIVA' });
    }
    if (capabilities.tables) {
      items.push({ name: 'Mesas', href: '/admin/mesas', icon: Layout, section: 'GESTIÓN OPERATIVA' });
    }
    if (capabilities.kitchen) {
      items.push({ name: 'Cocina KDS', href: '/admin/cocina', icon: Utensils, section: 'GESTIÓN OPERATIVA' });
    }
    if (capabilities.delivery) {
      items.push({ name: 'Logística & Delivery', href: '/admin/logistica', icon: Truck, section: 'GESTIÓN OPERATIVA' });
    }
    if (capabilities.appointments) {
      items.push({ name: 'Agenda / Citas', href: '/admin/citas', icon: CalendarDays, section: 'GESTIÓN OPERATIVA' });
    }
    if (capabilities.courts) {
      items.push({ name: 'Mis Canchas', href: '/admin/canchas', icon: Dribbble, section: 'GESTIÓN OPERATIVA' });
    }

    // Catalog Capabilities
    if (capabilities.catalog) {
      items.push({ name: 'Productos', href: '/admin/productos', icon: Sparkles, section: 'CATÁLOGO', roles: ['ADMIN', 'ADMIN_NEGOCIO', 'SUPERADMIN'] });
      items.push({ name: 'Categorías', href: '/admin/categorias', icon: Tags, section: 'CATÁLOGO', roles: ['ADMIN', 'ADMIN_NEGOCIO', 'SUPERADMIN'] });
    }
    if (capabilities.services) {
      items.push({ name: 'Servicios', href: '/admin/servicios', icon: Scissors, section: 'CATÁLOGO', roles: ['ADMIN', 'ADMIN_NEGOCIO', 'SUPERADMIN'] });
    }

    // Marketing Capabilities (Universal)
    if (capabilities.promotions) {
      items.push({ name: 'Promociones', href: '/admin/promociones', icon: Tags, section: 'MARKETING', roles: ['ADMIN', 'ADMIN_NEGOCIO', 'SUPERADMIN'] });
    }
    if (capabilities.courses) {
      items.push({ name: 'Cursos & Academia', href: '/admin/cursos', icon: GraduationCap, section: 'MARKETING' });
    }
    if (capabilities.loyalty) {
      items.push({ name: 'Club de Beneficios', href: '/admin/misiones', icon: Trophy, section: 'MARKETING' });
    }
    items.push({ name: 'Páginas', href: '/admin/paginas', icon: Layout, section: 'MARKETING' });

    // Administration (Universal for all Citiox businesses)
    items.push({ name: 'Clientes', href: '/admin/clientes', icon: Contact, section: 'ADMINISTRACIÓN', roles: ['ADMIN', 'ADMIN_NEGOCIO', 'SUPERADMIN'] });
    items.push({ name: 'Personal & Equipo', href: '/admin/usuarios', icon: Users, section: 'ADMINISTRACIÓN', roles: ['ADMIN', 'ADMIN_NEGOCIO', 'SUPERADMIN'] });
    items.push({ name: 'Reportes', href: '/admin/reportes', icon: BarChart3, section: 'ADMINISTRACIÓN', roles: ['ADMIN', 'ADMIN_NEGOCIO', 'SUPERADMIN'] });

    // Settings & Configuration (Universal)
    items.push({ name: 'Configuración', href: '/admin/config', icon: Settings, section: 'CONFIGURACIÓN', roles: ['ADMIN', 'ADMIN_NEGOCIO', 'SUPERADMIN'] });
    items.push({ name: 'Perfil de Negocio', href: '/admin/perfil', icon: Building2, section: 'CONFIGURACIÓN', roles: ['ADMIN', 'ADMIN_NEGOCIO', 'SUPERADMIN'] });
    items.push({ name: 'Mi Plan', href: '/admin/plan', icon: Package, section: 'CONFIGURACIÓN', roles: ['ADMIN', 'ADMIN_NEGOCIO', 'SUPERADMIN'] });
    items.push({ name: 'Super Panel', href: '/superadmin', icon: ShieldCheck, section: 'CONFIGURACIÓN', roles: ['SUPERADMIN'] });

    return items.filter(item => !item.roles || item.roles.some(r => r === role || (role === 'ADMIN_NEGOCIO' && r === 'ADMIN')));
  }

  const menuItems = buildDynamicMenu();

  // Group by section
  const sections = Array.from(new Set(menuItems.map(i => i.section)));

  const handleLogout = async () => {
    const isOk = await confirm('¿Seguro quieres cerrar sesión del panel de administrador?', {
      title: 'Cerrar Sesión',
      confirmText: 'Cerrar Sesión',
      type: 'danger'
    });
    if (!isOk) return;
    await signOut({ callbackUrl: '/login' });
  };

  return (
    <>
      {isOpen && <div className="md:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setIsOpen(false)} />}
      <aside className={cn(
        "fixed md:sticky top-0 left-0 z-[100] h-[100dvh] w-72 bg-white border-r border-slate-200 flex flex-col transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]",
        isOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full md:translate-x-0"
      )}>
        <div className="p-6 border-b border-slate-100 hidden md:block relative overflow-hidden group">
          <div className="flex items-center gap-3 relative z-10">
            <div className="size-10 rounded-xl flex items-center justify-center text-white shadow-md transition-all flex items-center justify-center" style={{ backgroundColor: primaryColor }}>
              <ZendaLogo size={20} />
            </div>
            <div>
              <h2 className="font-black text-slate-900 uppercase tracking-tighter leading-none italic text-lg">
                Citi<span style={{ color: primaryColor }}>Ox</span>
              </h2>
              <p className="text-[11px] font-semibold text-slate-400 mt-0.5">Core Runtime Admin</p>
            </div>
          </div>
        </div>

        {/* Dynamic Navigation Links */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-6">
          {sections.map(section => (
            <div key={section}>
              <p className="px-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">{section}</p>
              <div className="space-y-1">
                {menuItems.filter(i => i.section === section).map(item => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link key={item.href} href={item.href} onClick={() => setIsOpen(false)}
                      className={cn(
                        "flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all group",
                        isActive ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                      )}>
                      <div className="flex items-center gap-3">
                        <Icon className={cn("size-4 transition-transform group-hover:scale-110", isActive ? "text-white" : "text-slate-400 group-hover:text-slate-600")} />
                        <span>{item.name}</span>
                      </div>
                      {item.badge !== undefined && (
                        <span className="bg-amber-500 text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded-full">{item.badge}</span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer Logout */}
        <div className="p-4 border-t border-slate-100">
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 transition-all">
            <LogOut className="size-4" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>
    </>
  );
}
