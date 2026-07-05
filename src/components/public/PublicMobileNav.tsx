'use client';

import { Home, Calendar, User, Gift, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { clsx } from 'clsx';

interface PublicMobileNavProps {
    slug: string;
    hasActiveCourses?: boolean;
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

export default function PublicMobileNav({ slug, hasActiveCourses = false }: PublicMobileNavProps) {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const activeTabParam = searchParams.get('tab');

    // Visibilidad ampliada: Mostrar en la landing, cursos, reservas y servicios
    const isVisible =
        pathname === `/${slug}` ||
        pathname.includes('/cursos') ||
        pathname.includes('/mis-reservas') ||
        pathname.includes('/perfil') ||
        pathname.includes('/referidos') ||
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
        },
        {
            label: 'Mis citas',
            icon: Calendar,
            href: `/${slug}/mis-reservas`,
            active: pathname.includes('/mis-reservas') && activeTabParam !== 'academia',
        },
        {
            label: 'Servicios',
            icon: Sparkles,
            href: `/${slug}/servicios`,
            active: pathname.includes('/servicios'),
            isCentral: true,
        },
        {
            label: 'Premios',
            icon: Gift,
            href: `/${slug}/referidos`,
            active: pathname.includes('/referidos'),
        },
        {
            label: 'Perfil',
            icon: User,
            href: `/${slug}/perfil`,
            active: pathname.includes('/perfil'),
        },
    ];

    return (
        <nav
            className="fixed bottom-0 left-0 right-0 z-[150] h-[72px] pb-safe border-t pointer-events-auto md:hidden shadow-[0_-4px_25px_rgba(0,0,0,0.08)]"
            style={{
                backgroundColor: 'var(--secondary)',
                borderColor: 'var(--nav-border)',
            }}
        >
            <div className="flex items-center justify-around h-full px-2">
                {tabs.map((tab) => {
                    if (tab.isCentral) {
                        return (
                            <Link
                                key={tab.label}
                                href={tab.href}
                                className="relative flex flex-col items-center justify-center flex-1 h-full -translate-y-4 pointer-events-auto"
                            >
                                <div 
                                    className="size-14 rounded-full flex items-center justify-center shadow-lg border-4 border-white active:scale-95 transition-transform"
                                    style={{
                                        backgroundColor: 'var(--nav-active)',
                                        boxShadow: '0 4px 14px rgba(0, 0, 0, 0.15)'
                                    }}
                                >
                                    <Sparkles size={24} className="text-white" fill="white" />
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
                                    tab.active ? 'scale-105' : 'scale-100'
                                )}
                            >
                                <tab.icon
                                    size={22}
                                    strokeWidth={tab.active ? 2.5 : 2}
                                    fill={tab.active ? 'currentColor' : 'none'}
                                />
                                {tab.active && (
                                    <div
                                        className="absolute inset-0 blur-lg opacity-20 -z-10"
                                        style={{ backgroundColor: 'var(--nav-active)' }}
                                    />
                                )}
                            </div>
                            <span className="text-[9px] font-bold uppercase tracking-widest leading-none mt-1.5">
                                {tab.label}
                            </span>

                            {tab.active && (
                                <div
                                    className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 rounded-b-full"
                                    style={{
                                        backgroundColor: 'var(--nav-active)',
                                        boxShadow: '0 0 12px var(--nav-active)',
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
