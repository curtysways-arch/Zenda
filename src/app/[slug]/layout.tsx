import { getNegocioBySlug } from '@/lib/services';
import { generateTheme } from '@/lib/themeGenerator';
import { notFound } from 'next/navigation';
import PublicMobileNav from '@/components/public/PublicMobileNav';
import PublicDesktopNav from '@/components/public/PublicDesktopNav';
import prisma from '@/lib/prisma';
import { featureService } from '@/lib/services/featureService';
import { cache } from 'react';

export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';

const getNegocioCached = cache(async (slug: string) => {
    return await getNegocioBySlug(slug);
});

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const { slug } = await params;
    const negocio = await getNegocioCached(slug);

    if (!negocio) {
        return {
            manifest: `/api/pwa/manifest?slug=${slug}`
        };
    }

    const title = `${negocio.nombre} | CitiOx`;
    const description = negocio.heroSubtitulo || "Gestiona citas, clientes y servicios con CitiOx.";
    const ogImage = negocio.bannerUrl || negocio.logoUrl || '/icon.png';
    const cacheBuster = negocio.updatedAt ? new Date(negocio.updatedAt).getTime() : Date.now();

    return {
        metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://citiox.com'),
        title,
        description,
        icons: {
            icon: negocio.logoUrl ? `${negocio.logoUrl}?v=${cacheBuster}` : "/icon.png"
        },
        openGraph: {
            title,
            description,
            images: [ogImage]
        },
        twitter: {
            card: 'summary_large_image',
            title,
            description,
            images: [ogImage]
        },
        manifest: `/api/pwa/manifest?slug=${slug}`
    };
}

export default async function NegocioLayout({
    children,
    params
}: {
    children: React.ReactNode;
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    const negocio = await getNegocioCached(slug);

    if (!negocio) {
        notFound();
    }

    // Verificar si hay cursos activos para este negocio
    const hasActiveCourses = await prisma.course.count({
        where: { businessId: negocio.id, status: 'active' }
    }) > 0;

    const publishedPagesCount = await prisma.page.count({
        where: { businessId: negocio.id, status: 'published' }
    });

    const canUseCustomColors = await featureService.canUseFeature(negocio.id, 'custom_colors');

    let primaryInput = (negocio as any).colorPrimario && (negocio as any).colorPrimario !== '#1dc95c' ? (negocio as any).colorPrimario : '#db2777';

    // Verificar si el Modo de Marca está activo (por config o por flag "logo" en colorPrimario)
    const config = negocio.configuracion ? (typeof negocio.configuracion === 'string' ? JSON.parse(negocio.configuracion) : negocio.configuracion) as any : null;
    const modoMarca = config?.modoMarca || config?.autodetectarColorLogo || (negocio as any).colorPrimario === 'logo' || (negocio as any).colorPrimario === 'AUTO';

    if (modoMarca && negocio.logoUrl) {
        const { getLogoDominantColor } = await import('@/lib/logoColorExtractor');
        const logoColor = await getLogoDominantColor(negocio.logoUrl);
        if (logoColor) {
            primaryInput = logoColor;
        }
    }

    const theme = generateTheme(
        primaryInput,
        (negocio as any).colorSecundario || undefined,
        (negocio as any).colorNeutral || undefined
    );

    return (
        <>
            <style dangerouslySetInnerHTML={{
                __html: `
                :root {
                    --primary: ${theme.primaryColor};
                    --primary-light: ${theme.primaryLight};
                    --primary-dark: ${theme.primaryDark};
                    --secondary: ${theme.secondaryColor};
                    --accent: ${theme.accentColor};
                    --background: ${theme.backgroundColor};
                    --surface: ${theme.surfaceColor};
                    --surface-secondary: ${theme.surfaceSecondary};
                    --border: ${theme.borderColor};
                    --text-primary: ${theme.textPrimary};
                    --text-secondary: ${theme.textSecondary};
                    --text-disabled: ${theme.textDisabled};
                    --text-on-primary: ${theme.textOnPrimary};
                    
                    /* Estados fijos */
                    --success: ${theme.successColor};
                    --warning: ${theme.warningColor};
                    --error: ${theme.errorColor};
                    --shadow: ${theme.shadowColor};
                    
                    /* Navegación móvil dinámica */
                    --nav-inactive: var(--text-secondary);
                    --nav-border: var(--border);
                    --nav-active: var(--primary);
                }

                /* Forzar el color de texto dinámico en los encabezados y textos principales */
                .text-header-dynamic {
                    color: var(--text-primary) !important;
                }

                /* Clase dinámica para tarjetas adaptativas al color de fondo */
                .bg-card-dynamic {
                    background-color: var(--surface) !important;
                    border: 1px solid var(--border) !important;
                }
                
                /* Dynamic utility classes for Tertiary */
                .text-tertiary { color: var(--accent) !important; }
                .bg-tertiary { background-color: var(--accent) !important; }
                .border-tertiary { border-color: var(--accent) !important; }
                
                /* Dynamic utility classes for Neutral */
                .text-neutral-custom { color: var(--background) !important; }
                .bg-neutral-custom { background-color: var(--background) !important; }
                .border-neutral-custom { border-color: var(--background) !important; }

                /* Interceptores dinámicos del branding sobre clases de Tailwind */
                
                /* Botones principales y fondos de color de marca */
                .bg-pink-500, .bg-emerald-500, .bg-indigo-500, .bg-blue-500, .bg-slate-900:not(.text-white), .bg-primary {
                    background-color: var(--primary) !important;
                    color: var(--text-on-primary) !important;
                }
                .bg-pink-500:hover, .bg-emerald-500:hover, .bg-indigo-500:hover, .bg-blue-500:hover, .bg-primary:hover {
                    background-color: var(--primary-dark) !important;
                }
                .bg-pink-500:active, .bg-emerald-500:active, .bg-indigo-500:active, .bg-blue-500:active, .bg-primary:active {
                    background-color: var(--primary-dark) !important;
                }
                .bg-pink-500:disabled, .bg-emerald-500:disabled, .bg-indigo-500:disabled, .bg-primary:disabled {
                    background-color: var(--surface-secondary) !important;
                    color: var(--text-disabled) !important;
                    border-color: transparent !important;
                }

                /* Botones secundarios (borde e icono en color de marca) */
                .border-pink-500, .border-emerald-500, .border-indigo-500, .border-primary {
                    border-color: var(--primary) !important;
                    color: var(--primary) !important;
                }
                .border-pink-500:hover, .border-emerald-500:hover, .border-indigo-500:hover {
                    background-color: var(--primary-light) !important;
                    color: var(--text-on-primary) !important;
                }

                /* Textos de Color Primario / Marca */
                .text-pink-500, .text-emerald-500, .text-indigo-500, .text-blue-500, .text-indigo-600 {
                    color: var(--primary) !important;
                }
                .text-pink-600, .text-emerald-600, .text-indigo-600, .text-blue-600, .text-indigo-700 {
                    color: var(--primary-dark) !important;
                }

                /* Textos de Color Secundario o Neutrales */
                .text-slate-900, .text-slate-950, .text-slate-800, .text-slate-850, .text-slate-700 {
                    color: var(--text-primary) !important;
                }
                .text-slate-400, .text-slate-500, .text-slate-650, .text-slate-600 {
                    color: var(--text-secondary) !important;
                }
                .text-slate-300 {
                    color: var(--text-disabled) !important;
                }

                /* Superficies y Fondos Suaves */
                .bg-white, .bg-card, .bg-slate-50, .bg-slate-100\/50, .bg-slate-50\/50 {
                    background-color: var(--surface) !important;
                }
                .bg-slate-100, .bg-slate-200, .bg-slate-100\/80 {
                    background-color: var(--surface-secondary) !important;
                }
                .bg-pink-50, .bg-emerald-50, .bg-indigo-50, .bg-blue-50 {
                    background-color: var(--surface) !important;
                }

                /* Bordes de Contenedores y Divisores */
                .border-slate-100, .border-slate-200, .border-slate-150, .border-slate-100\/80, .border-slate-100\/50 {
                    border-color: var(--border) !important;
                }
                .border-pink-100, .border-emerald-100, .border-indigo-100, .border-blue-100 {
                    border-color: var(--border) !important;
                }

                /* Estados fijos */
                .text-green-500, .text-emerald-500.state-success { color: var(--success) !important; }
                .text-amber-500, .text-yellow-500.state-warning { color: var(--warning) !important; }
                .text-red-500, .text-rose-500.state-error { color: var(--error) !important; }

                /* Sombras Inteligentes y Opacidad */
                .shadow-sm, .shadow-md, .shadow-lg, .shadow-xl {
                    box-shadow: 0 4px 20px 0 var(--shadow) !important;
                }

                /* Rellenos e Iconos SVG */
                .fill-emerald-400, .fill-emerald-500, .fill-indigo-500, .fill-pink-500 {
                    fill: var(--primary) !important;
                }

                /* Selección de Texto */
                ::selection {
                    background-color: var(--primary);
                    color: var(--text-on-primary);
                }

                /* Transiciones de Color */
                .transition-colors {
                    transition-property: color, background-color, border-color, text-decoration-color, fill, stroke;
                    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
                    transition-duration: 300ms;
                }
                `
            }} />
            <div className="flex flex-col min-h-screen" style={{ backgroundColor: 'var(--background)' }}>
                <PublicDesktopNav 
                    slug={slug} 
                    hasActiveCourses={hasActiveCourses} 
                    pagesCount={publishedPagesCount} 
                    logoUrl={negocio.logoUrl} 
                    nombre={negocio.nombre} 
                />
                <div className="flex-1">
                    {children}
                </div>
                <PublicMobileNav slug={slug} hasActiveCourses={hasActiveCourses} />
            </div>
        </>
    );
}

