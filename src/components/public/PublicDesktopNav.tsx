'use client';

import { Home, Calendar, User, FileText, Scissors, Gift, Tag, PackageCheck, Flame } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { hasModule } from '@/lib/business/BusinessModuleResolver';

interface PublicDesktopNavProps {
    slug: string;
    hasActiveCourses?: boolean;
    pagesCount?: number;
    logoUrl?: string | null;
    nombre?: string;
    tipoNegocio?: string;
    isLoyaltyEnabled?: boolean;
}

export default function PublicDesktopNav({ 
    slug, 
    hasActiveCourses = false, 
    pagesCount = 0,
    logoUrl = null,
    nombre = '',
    tipoNegocio = 'RESERVA',
    isLoyaltyEnabled = true
}: PublicDesktopNavProps) {
    const pathname = usePathname();
    const [scrolled, setScrolled] = useState(false);
    const [hasSession, setHasSession] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 40);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        setHasSession(document.cookie.includes('cs=1'));
    }, [pathname]);

    // Mostrar solo en rutas públicas del negocio
    const isNegocioRoute = pathname.startsWith(`/${slug}`);
    const isAdminRoute = pathname.includes('/admin') || pathname.includes('/superadmin');

    if (!isNegocioRoute || isAdminRoute) {
        return null;
    }

    const canAppointments = hasModule(tipoNegocio, 'APPOINTMENTS') || hasModule(tipoNegocio, 'RESERVATIONS');
    const canOrders = hasModule(tipoNegocio, 'ORDERS') || tipoNegocio === 'RESTAURANT';
    const canServices = hasModule(tipoNegocio, 'SERVICES');
    const isShoeCare = tipoNegocio === 'SHOE_CARE' || slug.includes('lavado') || slug.includes('sneaker');

    const navItems = canOrders ? [
        {
            label: 'Inicio',
            href: `/${slug}`,
            icon: Home,
            active: pathname === `/${slug}` && !pathname.includes('pedidos') && !pathname.includes('perfil')
        },
        {
            label: 'Ofertas',
            href: `/${slug}#ofertas`,
            icon: Flame,
            active: pathname.includes('/ofertas') || pathname.includes('#ofertas')
        },
        {
            label: isShoeCare ? 'Mis Órdenes' : 'Mis Pedidos',
            href: `/${slug}/pedidos`,
            icon: PackageCheck,
            active: pathname.includes('/pedidos')
        },
        {
            label: 'Mi Cuenta',
            href: `/${slug}/perfil`,
            icon: User,
            active: pathname.includes('/perfil')
        }
    ] : [
        {
            label: 'Inicio',
            href: `/${slug}`,
            icon: Home,
            active: pathname === `/${slug}`
        },
        ...(canServices ? [{
            label: 'Servicios',
            href: `/${slug}/servicios`,
            icon: Scissors,
            active: pathname.includes('/servicios')
        }] : []),
        ...(canAppointments ? [{
            label: 'Reservas',
            href: `/${slug}/mis-reservas`,
            icon: Calendar,
            active: pathname.includes('/mis-reservas')
        }] : []),
        ...(pagesCount > 0 ? [{
            label: 'Páginas',
            href: `/${slug}#paginas`,
            icon: FileText,
            active: pathname.includes('/pagina')
        }] : []),
        ...((isLoyaltyEnabled && hasModule(tipoNegocio, 'LOYALTY')) ? [{
            label: 'Premios',
            href: `/${slug}/referidos`,
            icon: Gift,
            active: pathname.includes('/referidos') || pathname.includes('/misiones')
        }] : []),
        {
            label: 'Perfil',
            href: `/${slug}/perfil`,
            icon: User,
            active: pathname.includes('/perfil')
        }
    ];

    const buttonText = canOrders 
        ? 'Ver Catálogo' 
        : (hasModule(tipoNegocio, 'RESERVATIONS') ? 'Reservar Cancha' : 'Reservar Cita');

    const buttonHref = canOrders 
        ? `/${slug}#catalogo` 
        : `/${slug}#servicios`;

    const handleCatalogClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
        if (canOrders && pathname === `/${slug}`) {
            const el = document.getElementById('catalogo') || document.getElementById('menu') || document.getElementById('productos');
            if (el) {
                e.preventDefault();
                el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            } else {
                e.preventDefault();
                window.scrollTo({ top: 380, behavior: 'smooth' });
            }
        }
    };

    const handleNavClick = (item: typeof navItems[0], e: React.MouseEvent) => {
        if (canOrders && pathname === `/${slug}`) {
            e.preventDefault();
            const tabKey = item.label.toLowerCase().includes('oferta') ? 'ofertas'
                : item.label.toLowerCase().includes('pedido') || item.label.toLowerCase().includes('órdene') ? 'pedidos'
                : item.label.toLowerCase().includes('cuenta') || item.label.toLowerCase().includes('perfil') ? 'cuenta'
                : 'inicio';

            window.history.pushState(null, '', `/${slug}#${tabKey}`);
            window.dispatchEvent(new CustomEvent('citiox_change_tab', { detail: tabKey }));
        }
    };

    return (
        <nav 
            className={`hidden md:block fixed top-0 left-0 right-0 z-[200] transition-all duration-500 ${
                scrolled 
                    ? 'bg-white/98 backdrop-blur-2xl shadow-[0_4px_40px_rgba(0,0,0,0.08)] border-b border-slate-100' 
                    : 'bg-white/90 backdrop-blur-xl shadow-[0_2px_20px_rgba(0,0,0,0.04)] border-b border-slate-100/60'
            }`}
        >
            <div className="w-full px-6 md:px-10 h-[76px] flex items-center justify-between gap-8">
                
                {/* Logo / Brand */}
                <Link 
                    href={`/${slug}`} 
                    className="flex items-center gap-3.5 flex-shrink-0 group"
                >
                    {logoUrl ? (
                        <img 
                            src={logoUrl} 
                            alt={nombre || 'Logo'} 
                            className="w-14 h-14 rounded-full object-cover shadow-lg border-2 border-white group-hover:scale-105 transition-all duration-300"
                        />
                    ) : (
                        <div 
                            className="w-14 h-14 rounded-full flex items-center justify-center text-white font-black text-xl shadow-lg border-2 border-white group-hover:scale-105 transition-all duration-300"
                            style={{ backgroundColor: 'var(--primary)' }}
                        >
                            {nombre ? nombre.substring(0, 1).toUpperCase() : '✦'}
                        </div>
                    )}
                    {nombre && (
                        <span 
                            className="font-black text-xl uppercase tracking-[0.1em] leading-none drop-shadow-sm group-hover:opacity-80 transition-opacity"
                            style={{ color: '#0f172a' }}
                        >
                            {nombre}
                        </span>
                    )}
                </Link>

                {/* Nav Links */}
                <div className="flex items-center gap-0.5 bg-slate-50/80 rounded-2xl px-1.5 py-1.5 border border-slate-100">
                    {navItems.map((item) => (
                        <Link
                            key={item.label}
                            href={item.href}
                            onClick={(e) => handleNavClick(item, e)}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-[0.12em] transition-all duration-200 ${
                                item.active 
                                    ? 'text-white shadow-md' 
                                    : 'text-slate-500 hover:text-slate-900 hover:bg-white hover:shadow-sm'
                            }`}
                            style={item.active ? { backgroundColor: 'var(--primary)' } : {}}
                        >
                            <item.icon size={13} strokeWidth={item.active ? 2.5 : 2} />
                            {item.label}
                        </Link>
                    ))}
                </div>

                {/* CTA Button */}
                <Link
                    href={buttonHref}
                    onClick={handleCatalogClick}
                    className="flex-shrink-0 px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-[0.15em] text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer"
                    style={{ backgroundColor: 'var(--primary)' }}
                >
                    {buttonText}
                </Link>
            </div>
        </nav>
    );
}
