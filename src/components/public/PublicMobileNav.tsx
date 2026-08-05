'use client';

import { Home, Calendar, User, Gift, Sparkles, PackageCheck, GraduationCap } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';
import { useState, useEffect } from 'react';
import { hasModule } from '@/lib/business/BusinessModuleResolver';

interface PublicMobileNavProps {
    slug: string;
    hasActiveCourses?: boolean;
    tipoNegocio?: string;
    isLoyaltyEnabled?: boolean;
}

export default function PublicMobileNav({ slug, hasActiveCourses = false, tipoNegocio = 'RESERVA', isLoyaltyEnabled = true }: PublicMobileNavProps) {
    const pathname = usePathname();
    const [activeTabParam, setActiveTabParam] = useState<string | null>(null);
    const [hasSession, setHasSession] = useState<boolean>(false);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            setActiveTabParam(params.get('tab'));
            const phone = localStorage.getItem(`${slug}_client_phone`) || localStorage.getItem('user_phone');
            if (phone) {
                setHasSession(true);
                return;
            }
        }
        const checkSession = async () => {
            if (document.cookie.includes('cs=1') || document.cookie.includes('customer_token')) {
                setHasSession(true);
                return;
            }
            try {
                const res = await fetch(`/api/${slug}/auth/session`, { credentials: 'include' });
                const data = await res.json();
                setHasSession(data.active === true);
            } catch {
                setHasSession(false);
            }
        };
        checkSession();
    }, [pathname, slug]);

    // Visibilidad ampliada: Mostrar en la landing, cursos, reservas y servicios
    const isVisible =
        pathname === `/${slug}` ||
        pathname.includes('/cursos') ||
        pathname.includes('/mis-reservas') ||
        pathname.includes('/pedidos') ||
        pathname.includes('/perfil') ||
        pathname.includes('/referidos') ||
        pathname.includes('/misiones') ||
        pathname.includes('/cancha/') ||
        pathname.includes('/servicio/') ||
        pathname.includes('/promo/') ||
        pathname.includes('/servicios');

    const isEnrolmentDetail = pathname.includes('/cursos/inscripcion/');

    if (!isVisible || isEnrolmentDetail || pathname.includes('/admin') || pathname.includes('/superadmin')) {
        return null;
    }

    const canAppointments = hasModule(tipoNegocio, 'APPOINTMENTS') || hasModule(tipoNegocio, 'RESERVATIONS');
    const canOrders = hasModule(tipoNegocio, 'ORDERS');
    const isShoeCare = tipoNegocio === 'SHOE_CARE' || slug.includes('lavado') || slug.includes('sneaker');

    const tabs = [];

    // 1. Tab Inicio
    tabs.push({
        label: 'Inicio',
        icon: Home,
        href: `/${slug}`,
        active: pathname === `/${slug}` && !pathname.includes('/servicios'),
        visible: true
    });

    // 2. Tab Secundario: "Mis Citas" (RESERVA) vs "Mis Pedidos / Órdenes" (PRODUCTOS / SHOE_CARE) vs "Reservas" (SPORTS_COURTS)
    if (canAppointments) {
        tabs.push({
            label: 'Mis Citas',
            icon: Calendar,
            href: `/${slug}/mis-reservas`,
            active: pathname.includes('/mis-reservas') && activeTabParam !== 'academia',
            visible: true
        });
    } else if (canOrders) {
        tabs.push({
            label: isShoeCare ? 'Mis Órdenes' : 'Mis Pedidos',
            icon: PackageCheck,
            href: `/${slug}/pedidos`,
            active: pathname.includes('/pedidos'),
            visible: true
        });
    }

    // Tab opcional Academia para canchas/deportes
    if (hasModule(tipoNegocio, 'ACADEMIA') || hasActiveCourses) {
        tabs.push({
            label: 'Academia',
            icon: GraduationCap,
            href: `/${slug}/mis-reservas?tab=academia`,
            active: pathname.includes('/cursos') || (pathname.includes('/mis-reservas') && activeTabParam === 'academia'),
            visible: true
        });
    }

    // 3. Tab Central: Servicios / Catálogo
    tabs.push({
        label: hasModule(tipoNegocio, 'SERVICES') ? 'Servicios' : 'Catálogo',
        icon: Sparkles,
        href: `/${slug}#servicios`,
        active: pathname.includes('/servicios'),
        isCentral: true,
        visible: true
    });

    // 4. Tab Premios (Loyalty)
    if (hasModule(tipoNegocio, 'LOYALTY')) {
        tabs.push({
            label: 'Premios',
            icon: Gift,
            href: `/${slug}/misiones`,
            active: pathname.includes('/referidos') || pathname.includes('/misiones'),
            visible: isLoyaltyEnabled
        });
    }

    // 5. Tab Perfil
    tabs.push({
        label: 'Perfil',
        icon: User,
        href: `/${slug}/perfil`,
        active: pathname.includes('/perfil'),
        visible: true
    });

    const visibleTabs = tabs.filter(t => t.visible);

    return (
        <nav 
            className="fixed bottom-0 left-0 right-0 z-[9999] h-[72px] pb-safe border-t pointer-events-auto bg-white shadow-[0_-4px_25px_rgba(0,0,0,0.15)] transition-colors duration-300"
            style={{
                backgroundColor: '#ffffff',
                borderColor: '#e2e8f0'
            }}
        >
            <div className="flex items-center justify-around h-full px-2">
                {visibleTabs.map((tab) => {
                    if (tab.isCentral) {
                        const CentralIcon = tab.icon;
                        return (
                            <Link
                                key={tab.label}
                                href={tab.href}
                                className="relative flex flex-col items-center justify-center flex-1 h-full -translate-y-4 pointer-events-auto"
                            >
                                <div 
                                    className="size-14 rounded-full flex items-center justify-center shadow-lg border-2 active:scale-95 transition-transform"
                                    style={{
                                        backgroundColor: 'var(--primary, #7c3aed)',
                                        borderColor: 'rgba(255,255,255,0.35)',
                                        boxShadow: '0 4px 14px rgba(0, 0, 0, 0.3)'
                                    }}
                                >
                                    <CentralIcon size={24} style={{ color: 'var(--text-on-primary, #ffffff)' }} />
                                </div>
                                <span 
                                    className="text-[9px] font-black uppercase tracking-widest leading-none mt-1.5"
                                    style={{ color: 'var(--primary, #7c3aed)' }}
                                >
                                    {tab.label}
                                </span>
                            </Link>
                        );
                    }
                    return (
                        <Link
                            key={tab.label}
                            href={tab.href}
                            style={{ color: tab.active ? 'var(--primary, #7c3aed)' : '#64748b' }}
                            className={clsx(
                                'flex flex-col items-center justify-center transition-all relative flex-1 h-full',
                                !tab.active && 'hover:opacity-100 transition-opacity'
                            )}
                        >
                            <div
                                className={clsx(
                                    'relative transition-all duration-300 flex items-center justify-center p-1 rounded-xl',
                                    tab.active ? 'scale-110' : 'scale-100'
                                )}
                            >
                                <tab.icon
                                    size={22}
                                    strokeWidth={tab.active ? 2.5 : 1.5}
                                    fill={tab.active ? 'currentColor' : 'none'}
                                />
                            </div>
                            <span
                                className="text-[9px] font-bold uppercase tracking-widest leading-none mt-1.5"
                                style={{ 
                                    color: tab.active ? 'var(--primary, #7c3aed)' : '#64748b',
                                    fontWeight: tab.active ? 900 : 600,
                                }}
                            >
                                {tab.label}
                            </span>

                            {tab.active && (
                                <div
                                    className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-b-full"
                                    style={{
                                        backgroundColor: 'var(--primary, #7c3aed)',
                                        opacity: 0.9,
                                    }}
                                />
                            )}
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
