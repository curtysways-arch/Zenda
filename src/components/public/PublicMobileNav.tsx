'use client';

import { Home, Calendar, GraduationCap, User, Compass } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { clsx } from 'clsx';

interface PublicMobileNavProps {
    slug: string;
    hasActiveCourses?: boolean;
}

export default function PublicMobileNav({ slug, hasActiveCourses = false }: PublicMobileNavProps) {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const activeTabParam = searchParams.get('tab');

    // Visibilidad ampliada: Mostrar en la landing, cursos y reservas
    const isVisible = pathname === `/${slug}` || pathname.includes('/cursos') || pathname.includes('/mis-reservas') || pathname.includes('/perfil') || pathname.includes('/cancha/') || pathname.includes('/servicio/') || pathname.includes('/promo/');
    
    const isEnrolmentDetail = pathname.includes('/cursos/inscripcion/');

    if (!isVisible || isEnrolmentDetail || pathname.includes('/admin') || pathname.includes('/superadmin')) {
        return null;
    }

    const tabs = [
        {
            label: 'Inicio',
            icon: Home,
            href: `/${slug}`,
            active: pathname === `/${slug}`
        },
        {
            label: 'Reservas',
            icon: Calendar,
            href: `/${slug}/mis-reservas`,
            active: pathname.includes('/mis-reservas') && activeTabParam !== 'academia'
        },
        {
            label: 'Perfil',
            icon: User,
            href: `/${slug}/perfil`,
            active: pathname.includes('/perfil')
        }
    ];

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-[150] h-[72px] pb-safe border-t pointer-events-auto md:hidden shadow-[0_-4px_25px_rgba(0,0,0,0.08)]" 
             style={{ 
                 backgroundColor: 'var(--secondary)', 
                 borderColor: 'var(--nav-border)' 
             }}>
            <div className="flex items-center justify-around h-full px-2">
                {tabs.map((tab) => (
                    <Link 
                        key={tab.label} 
                        href={tab.href}
                        style={{ color: tab.active ? 'var(--primary)' : 'var(--nav-inactive)' }}
                        className={clsx(
                            "flex flex-col items-center justify-center transition-all relative flex-1 h-full",
                            !tab.active && "hover:opacity-100 transition-opacity"
                        )}
                    >
                        <div className={clsx(
                            "relative transition-all duration-300 flex items-center justify-center p-1 rounded-xl",
                            tab.active ? "scale-105" : "scale-100"
                        )}>
                            <tab.icon size={22} strokeWidth={tab.active ? 2.5 : 2} fill={tab.active ? "currentColor" : "none"} />
                            {tab.active && (
                                <div className="absolute inset-0 blur-lg opacity-10 -z-10" style={{ backgroundColor: 'var(--primary)' }} />
                            )}
                        </div>
                        <span className="text-[9px] font-bold uppercase tracking-widest leading-none mt-1.5">{tab.label}</span>
                        
                        {tab.active && (
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 rounded-b-full shadow-[0_0_12px_var(--primary)]" 
                                 style={{ backgroundColor: 'var(--primary)' }} />
                        )}
                    </Link>
                ))}
            </div>
        </nav>
    );
}
