'use client';

import { Home, Calendar, User, FileText, Scissors, Menu, X, Gift, Tag } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

interface PublicDesktopNavProps {
    slug: string;
    hasActiveCourses?: boolean;
    pagesCount?: number;
    logoUrl?: string | null;
    nombre?: string;
}

export default function PublicDesktopNav({ 
    slug, 
    hasActiveCourses = false, 
    pagesCount = 0,
    logoUrl = null,
    nombre = ''
}: PublicDesktopNavProps) {
    const pathname = usePathname();
    const [scrolled, setScrolled] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
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

    const navItems = [
        {
            label: 'Inicio',
            href: `/${slug}`,
            icon: Home,
            active: pathname === `/${slug}`
        },
        {
            label: 'Servicios',
            href: `/${slug}/servicios`,
            icon: Scissors,
            active: pathname.includes('/servicios')
        },
        {
            label: 'Reservas',
            href: `/${slug}/mis-reservas`,
            icon: Calendar,
            active: pathname.includes('/mis-reservas')
        },
        ...(pagesCount > 0 ? [{
            label: 'Páginas',
            href: `/${slug}#paginas`,
            icon: FileText,
            active: pathname.includes('/pagina')
        }] : []),
        {
            label: 'Premios',
            href: `/${slug}/referidos`,
            icon: Gift,
            active: pathname.includes('/referidos') || pathname.includes('/misiones')
        },
        ...(hasSession ? [{
            label: 'Mis Cupones',
            href: `/${slug}/mis-cupones`,
            icon: Tag,
            active: pathname.includes('/mis-cupones')
        }] : []),
        {
            label: 'Perfil',
            href: `/${slug}/perfil`,
            icon: User,
            active: pathname.includes('/perfil')
        }
    ];

    return (
        <nav 
            className={`hidden md:block fixed top-0 left-0 right-0 z-[200] transition-all duration-500 ${
                scrolled 
                    ? 'bg-white/98 backdrop-blur-2xl shadow-[0_4px_40px_rgba(0,0,0,0.08)] border-b border-slate-100' 
                    : 'bg-white/90 backdrop-blur-xl shadow-[0_2px_20px_rgba(0,0,0,0.04)] border-b border-slate-100/60'
            }`}
        >
            <div className="w-full px-6 md:px-10 h-[76px] flex items-center justify-between gap-8">
                
                {/* Logo / Brand — mismo estilo que móvil */}
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
                    href={`/${slug}#servicios`}
                    className="flex-shrink-0 px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-[0.15em] text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-200"
                    style={{ backgroundColor: 'var(--primary)' }}
                >
                    Reservar Cita
                </Link>
            </div>
        </nav>
    );
}
