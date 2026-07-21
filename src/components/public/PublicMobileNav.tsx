'use client';

import { Home, Calendar, User, Gift, Sparkles, ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { clsx } from 'clsx';
import { useState, useEffect } from 'react';

interface PublicMobileNavProps {
    slug: string;
    hasActiveCourses?: boolean;
    tipoNegocio?: string;
}

/** Convierte un color hex a luminancia (0-255) */
function hexToLuma(hex: string): number {
    const clean = hex.replace('#', '');
    if (clean.length !== 6) return 128;
    const r = parseInt(clean.substring(0, 2), 16);
    const g = parseInt(clean.substring(2, 4), 16);
    const b = parseInt(clean.substring(4, 6), 16);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** 
 * Computa el ratio de contraste entre dos colores (WCAG).
 * Retorna un valor entre 1 y 21.
 */
function contrastRatio(hex1: string, hex2: string): number {
    const L1 = hexToLuma(hex1) / 255;
    const L2 = hexToLuma(hex2) / 255;
    const lighter = Math.max(L1, L2);
    const darker = Math.min(L1, L2);
    return (lighter + 0.05) / (darker + 0.05);
}

export default function PublicMobileNav({ slug, hasActiveCourses = false, tipoNegocio = 'RESERVA' }: PublicMobileNavProps) {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const activeTabParam = searchParams.get('tab');

    // Detectar sesión de forma reactiva en el cliente
    const [hasSession, setHasSession] = useState(false);

    useEffect(() => {
        const checkSession = async () => {
            // Primero intentar leer la cookie cs=1 directamente (más rápido)
            if (document.cookie.includes('cs=1')) {
                setHasSession(true);
                return;
            }
            // Si no hay cs=1, consultar el servidor para sincronizar
            // (usuarios con sesión anterior que no tienen cs aún)
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

    const tabs = [
        {
            label: 'Inicio',
            icon: Home,
            href: `/${slug}`,
            active: pathname === `/${slug}` && !pathname.includes('/servicios'),
            visible: true
        },
        {
            label: 'Agenda',
            icon: Calendar,
            href: `/${slug}/mis-reservas`,
            active: pathname.includes('/mis-reservas') && activeTabParam !== 'academia',
            visible: hasSession && tipoNegocio !== 'PRODUCTOS'
        },
        {
            label: tipoNegocio === 'PRODUCTOS' ? 'Tienda' : 'Servicios',
            icon: tipoNegocio === 'PRODUCTOS' ? ShoppingBag : Sparkles,
            href: tipoNegocio === 'PRODUCTOS' ? `/${slug}` : `/${slug}/servicios`,
            active: tipoNegocio === 'PRODUCTOS' 
                ? pathname === `/${slug}` 
                : pathname.includes('/servicios'),
            isCentral: true,
            visible: true
        },
        {
            label: 'Premios',
            icon: Gift,
            href: `/${slug}/misiones`,
            active: pathname.includes('/referidos') || pathname.includes('/misiones'),
            visible: tipoNegocio !== 'PRODUCTOS'
        },
        {
            label: 'Perfil',
            icon: User,
            href: `/${slug}/perfil`,
            active: pathname.includes('/perfil'),
            visible: hasSession
        },
    ].filter(t => t.visible);

    return (
        <nav
            className="fixed bottom-0 left-0 right-0 z-[150] h-[72px] pb-safe border-t pointer-events-auto md:hidden shadow-[0_-4px_25px_rgba(0,0,0,0.15)]"
            style={{
                backgroundColor: 'var(--nav-bg)',
                borderColor: 'var(--nav-border)',
            }}
        >
            <div className="flex items-center justify-around h-full px-2">
                {tabs.map((tab) => {
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
                                        backgroundColor: 'var(--nav-active)',
                                        borderColor: 'rgba(255,255,255,0.25)',
                                        boxShadow: '0 4px 14px rgba(0, 0, 0, 0.3)'
                                    }}
                                >
                                    <CentralIcon size={24} style={{ color: 'var(--nav-bg)' }} fill={tab.label === 'Tienda' ? 'none' : 'currentColor'} />
                                </div>
                                <span 
                                    className="text-[9px] font-black uppercase tracking-widest leading-none mt-1.5"
                                    style={{ color: 'var(--nav-active)' }}
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
                            style={{ color: tab.active ? 'var(--nav-active)' : 'var(--nav-inactive)' }}
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
                                    color: tab.active ? 'var(--nav-active)' : 'var(--nav-inactive)',
                                    fontWeight: tab.active ? 900 : 600,
                                }}
                            >
                                {tab.label}
                            </span>

                            {tab.active && (
                                <div
                                    className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-b-full"
                                    style={{
                                        backgroundColor: 'var(--nav-active)',
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
