import { getNegocioBySlug } from '@/lib/services';
import { generateTheme, hexToRgb } from '@/lib/themeGenerator';
import { notFound } from 'next/navigation';
import PublicMobileNav from '@/components/public/PublicMobileNav';
import PublicDesktopNav from '@/components/public/PublicDesktopNav';
import LoyaltyCelebration from '@/components/public/LoyaltyCelebration';
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

    const config = negocio.configuracion ? (typeof negocio.configuracion === 'string' ? JSON.parse(negocio.configuracion) : negocio.configuracion) as any : null;
    
    // Autodetección de modo avanzado/simplificado para retrocompatibilidad
    let modoAvanzado = false;
    if (config?.modoAvanzadoColores !== undefined) {
        modoAvanzado = !!config.modoAvanzadoColores;
    } else {
        const hasCustomNeutral = (negocio as any).colorNeutral && (negocio as any).colorNeutral !== '#FFF5F5' && (negocio as any).colorNeutral !== '#ffffff';
        const hasCustomTerciario = (negocio as any).colorTerciario && (negocio as any).colorTerciario !== '#7B68EE';
        const hasCustomTexto = (negocio as any).colorTexto && (negocio as any).colorTexto !== '#ffffff' && (negocio as any).colorTexto !== '#1e293b' && (negocio as any).colorTexto !== '#0f172a';
        
        if (hasCustomNeutral || hasCustomTerciario || hasCustomTexto) {
            modoAvanzado = true;
        }
    }

    let primaryInput = (negocio as any).colorPrimario && (negocio as any).colorPrimario !== '#1dc95c' ? (negocio as any).colorPrimario : '#db2777';

    let theme;
    if (modoAvanzado) {
        theme = generateTheme(
            primaryInput,
            (negocio as any).colorSecundario || undefined,
            (negocio as any).colorNeutral || undefined
        );
        if ((negocio as any).colorTerciario) theme.accentColor = (negocio as any).colorTerciario;
        if ((negocio as any).colorTexto) theme.textPrimary = (negocio as any).colorTexto;
        if ((negocio as any).colorSubTexto) theme.textSecondary = (negocio as any).colorSubTexto;
    } else {
        theme = generateTheme(
            primaryInput,
            (negocio as any).colorSecundario || undefined
        );
    }

    // Calcular colores para la barra superior (Header)
    const headerBgInput = modoAvanzado 
        ? (config?.colorHeader || (negocio as any).colorNeutral || theme.surfaceColor || '#ffffff')
        : (theme.surfaceColor || '#ffffff');
        
    const headerBgRgb = hexToRgb(headerBgInput) || { r: 255, g: 255, b: 255 };
    const headerBgLuma = (0.2126 * headerBgRgb.r + 0.7152 * headerBgRgb.g + 0.0722 * headerBgRgb.b) / 255;
    
    // Contraste para textos en la barra superior
    const headerTextInput = headerBgLuma < 0.5 ? '#ffffff' : '#0f172a';
    const headerTextSecondaryInput = headerBgLuma < 0.5 ? '#cbd5e1' : '#475569';
    const headerBorderInput = headerBgLuma < 0.5 ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';

    return (
        <>
            <style dangerouslySetInnerHTML={{
                __html: `                :root {
                    --primary: ${theme.primaryColor};
                    --primary-light: ${theme.primaryLight};
                    --primary-dark: ${theme.primaryDark};
                    --primary-hover: ${theme.primaryHover};
                    --primary-bg: ${theme.primaryBg};
                    --secondary: ${theme.secondaryColor};
                    --secondary-hover: ${theme.secondaryHover};
                    --accent: ${theme.accentColor};
                    --background: ${theme.backgroundColor};
                    --surface: ${theme.surfaceColor};
                    --surface-secondary: ${theme.surfaceSecondary};
                    --border: ${theme.borderColor};
                    --text-primary: ${theme.textPrimary};
                    --text-secondary: ${theme.textSecondary};
                    --text-disabled: ${theme.textDisabled};
                    --text-on-primary: ${theme.textOnPrimary};
                    --text-on-surface: ${theme.textOnSurface};
                    --text-on-surface-secondary: ${theme.textOnSurfaceSecondary};
                    
                    /* Variables de Barra Superior (Header) */
                    --header-bg: ${headerBgInput};
                    --header-text: ${headerTextInput};
                    --header-text-secondary: ${headerTextSecondaryInput};
                    --header-border: ${headerBorderInput};
                    
                    /* Estados fijos */
                    --success: ${theme.successColor};
                    --warning: ${theme.warningColor};
                    --error: ${theme.errorColor};
                    --info: ${theme.infoColor};
                    --shadow: ${theme.shadowColor};
                    
                    /* Navegación móvil dinámica */
                    --nav-bg: ${theme.primaryDark};
                    --nav-active: ${theme.textOnPrimary};
                    --nav-inactive: ${theme.textOnPrimary}80;
                    --nav-border: ${theme.primaryDark};
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
                    background-color: var(--primary-hover) !important;
                }
                .bg-pink-500:active, .bg-emerald-500:active, .bg-indigo-500:active, .bg-blue-500:active, .bg-primary:active {
                    background-color: var(--primary-hover) !important;
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
                    background-color: var(--primary-bg) !important;
                    color: var(--primary) !important;
                }

                /* Textos de Color Primario / Marca */
                .text-pink-500, .text-emerald-500, .text-indigo-500, .text-blue-500, .text-indigo-600 {
                    color: var(--primary) !important;
                }
                .text-pink-600, .text-emerald-600, .text-indigo-600, .text-blue-600, .text-indigo-700 {
                    color: var(--primary-dark) !important;
                }

                /* Textos de Color Secundario o Neutrales */
                .text-slate-900, .text-slate-950, .text-slate-800, .text-slate-850, .text-slate-700,
                .text-gray-900, .text-gray-950, .text-gray-800, .text-gray-850, .text-gray-700 {
                    color: var(--text-primary) !important;
                }
                .text-slate-400, .text-slate-500, .text-slate-650, .text-slate-600,
                .text-gray-400, .text-gray-500, .text-gray-650, .text-gray-600 {
                    color: var(--text-secondary) !important;
                }
                .text-slate-300, .text-gray-300 {
                    color: var(--text-disabled) !important;
                }

                /* Superficies y Fondos Suaves */
                .bg-white, .bg-card, .bg-slate-50, .bg-slate-100\/50, .bg-slate-50\/50, .bg-surface, .bg-card-dynamic, [class*="bg-[#FFF"] {
                    background-color: var(--surface) !important;
                }
                .bg-slate-100, .bg-slate-200, .bg-slate-100\/80 {
                    background-color: var(--surface-secondary) !important;
                }
                .bg-pink-50, .bg-emerald-50, .bg-indigo-50, .bg-blue-50 {
                    background-color: var(--surface) !important;
                }

                /* Forzar contraste en textos slate/gray cuando están dentro de tarjetas o superficies con fondo claro */
                .bg-white .text-slate-900, .bg-white .text-slate-950, .bg-white .text-slate-800, .bg-white .text-slate-850, .bg-white .text-slate-700,
                .bg-white .text-gray-900, .bg-white .text-gray-950, .bg-white .text-gray-800, .bg-white .text-gray-850, .bg-white .text-gray-700,
                .bg-white .text-header-dynamic,
                .bg-card .text-slate-900, .bg-card .text-slate-950, .bg-card .text-slate-800, .bg-card .text-slate-850, .bg-card .text-slate-700,
                .bg-card .text-gray-900, .bg-card .text-gray-950, .bg-card .text-gray-800, .bg-card .text-gray-850, .bg-card .text-gray-700,
                .bg-card .text-header-dynamic,
                .bg-slate-50 .text-slate-900, .bg-slate-50 .text-slate-950, .bg-slate-50 .text-slate-800, .bg-slate-50 .text-slate-850, .bg-slate-50 .text-slate-700,
                .bg-slate-50 .text-gray-900, .bg-slate-50 .text-gray-950, .bg-slate-50 .text-gray-800, .bg-slate-50 .text-gray-850, .bg-slate-50 .text-gray-700,
                .bg-slate-50 .text-header-dynamic,
                .bg-pink-50 .text-slate-900, .bg-emerald-50 .text-slate-900, .bg-indigo-50 .text-slate-900, .bg-blue-50 .text-slate-900,
                .bg-surface .text-slate-900, .bg-surface .text-slate-950, .bg-surface .text-slate-800, .bg-surface .text-slate-850, .bg-surface .text-slate-700,
                .bg-surface .text-gray-900, .bg-surface .text-gray-950, .bg-surface .text-gray-800, .bg-surface .text-gray-850, .bg-surface .text-gray-700,
                .bg-surface .text-header-dynamic,
                .bg-card-dynamic .text-slate-900, .bg-card-dynamic .text-slate-950, .bg-card-dynamic .text-slate-800, .bg-card-dynamic .text-slate-850, .bg-card-dynamic .text-slate-700,
                .bg-card-dynamic .text-gray-900, .bg-card-dynamic .text-gray-950, .bg-card-dynamic .text-gray-800, .bg-card-dynamic .text-gray-850, .bg-card-dynamic .text-gray-700,
                .bg-card-dynamic .text-header-dynamic,
                [class*="bg-[#FFF"] .text-slate-900, [class*="bg-[#FFF"] .text-slate-950, [class*="bg-[#FFF"] .text-slate-800, [class*="bg-[#FFF"] .text-slate-850, [class*="bg-[#FFF"] .text-slate-700,
                [class*="bg-[#FFF"] .text-gray-900, [class*="bg-[#FFF"] .text-gray-950, [class*="bg-[#FFF"] .text-gray-800, [class*="bg-[#FFF"] .text-gray-850, [class*="bg-[#FFF"] .text-gray-700,
                [class*="bg-[#FFF"] .text-header-dynamic {
                    color: var(--text-on-surface) !important;
                }

                .bg-white .text-slate-400, .bg-white .text-slate-500, .bg-white .text-slate-600,
                .bg-white .text-gray-400, .bg-white .text-gray-500, .bg-white .text-gray-650, .bg-white .text-gray-600,
                .bg-card .text-slate-400, .bg-card .text-slate-500, .bg-card .text-slate-600,
                .bg-card .text-gray-400, .bg-card .text-gray-500, .bg-card .text-gray-650, .bg-card .text-gray-600,
                .bg-slate-50 .text-slate-400, .bg-slate-50 .text-slate-500, .bg-slate-50 .text-slate-600,
                .bg-slate-50 .text-gray-400, .bg-slate-50 .text-gray-500, .bg-slate-50 .text-gray-650, .bg-slate-50 .text-gray-600,
                .bg-pink-50 .text-slate-400, .bg-emerald-50 .text-slate-400, .bg-indigo-50 .text-slate-400, .bg-blue-50 .text-slate-400,
                .bg-surface .text-slate-400, .bg-surface .text-slate-500, .bg-surface .text-slate-600,
                .bg-surface .text-gray-400, .bg-surface .text-gray-500, .bg-surface .text-gray-650, .bg-surface .text-gray-600,
                .bg-card-dynamic .text-slate-400, .bg-card-dynamic .text-slate-500, .bg-card-dynamic .text-slate-600,
                .bg-card-dynamic .text-gray-400, .bg-card-dynamic .text-gray-500, .bg-card-dynamic .text-gray-650, .bg-card-dynamic .text-gray-600,
                [class*="bg-[#FFF"] .text-slate-400, [class*="bg-[#FFF"] .text-slate-500, [class*="bg-[#FFF"] .text-slate-600,
                [class*="bg-[#FFF"] .text-gray-400, [class*="bg-[#FFF"] .text-gray-500, [class*="bg-[#FFF"] .text-gray-650, [class*="bg-[#FFF"] .text-gray-600 {
                    color: var(--text-on-surface-secondary) !important;
                }

                .bg-white .text-slate-300, .bg-slate-50 .text-slate-300, .bg-surface .text-slate-300, .bg-card .text-slate-300, .bg-card-dynamic .text-slate-300, [class*="bg-[#FFF"] .text-slate-300,
                .bg-white .text-gray-300, .bg-slate-50 .text-gray-300, .bg-surface .text-gray-300, .bg-card .text-gray-300, .bg-card-dynamic .text-gray-300 {
                    color: var(--text-on-surface-secondary) !important;
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

                /* Estilos globales dinámicos de Barra Superior (Header) */
                header {
                    background-color: var(--header-bg) !important;
                    background-image: none !important;
                    border-color: var(--header-border) !important;
                }
                header h1, header h2, header h3, header h5, header h6, header span {
                    color: var(--header-text) !important;
                }
                header p, header span.text-gray-400, header span.text-slate-400, header .text-slate-400, header .text-gray-400 {
                    color: var(--header-text-secondary) !important;
                }
                header .text-gray-700, header .text-slate-700, header .text-slate-900, header .text-gray-900 {
                    color: var(--header-text) !important;
                }
                header .bg-white, header .bg-gray-50, header .bg-slate-50, header .bg-slate-50\/50, header .bg-slate-100 {
                    background-color: var(--header-bg) !important;
                    border-color: var(--header-border) !important;
                }

                /* Transiciones de Color */
                .transition-colors {
                    transition-property: color, background-color, border-color, text-decoration-color, fill, stroke;
                    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
                    transition-duration: 300ms;
                }

                /* Ajuste de márgenes laterales de página a un máximo de 5px en pantallas móviles */
                @media (max-w: 768px) {
                    .max-w-md.mx-auto.px-2\\.5,
                    .max-w-md.mx-auto.px-4,
                    .max-w-md.mx-auto.px-5,
                    .max-w-md.mx-auto.px-6,
                    div.max-w-md.mx-auto.px-2\\.5,
                    div.max-w-md.mx-auto.px-4,
                    div.max-w-md.mx-auto.px-5 {
                        padding-left: 5px !important;
                        padding-right: 5px !important;
                    }
                    
                    section.px-6, 
                    section.px-5,
                    section.px-4,
                    div.px-6.mb-6,
                    div.px-6.mt-6,
                    div.px-6.mb-4,
                    header.px-6, 
                    header.px-5,
                    header.px-4,
                    header.px-2.5,
                    div.sticky.px-2.5,
                    div.px-2.5.sticky,
                    div.px-2.5.pt-4.pb-3.sticky {
                        padding-left: 5px !important;
                        padding-right: 5px !important;
                    }
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
                    tipoNegocio={negocio.tipoNegocio || 'RESERVA'}
                />
                <div className="flex-1">
                    {children}
                </div>
                <LoyaltyCelebration slug={slug} primaryColor={primaryInput} />
                <PublicMobileNav 
                    slug={slug} 
                    hasActiveCourses={hasActiveCourses} 
                    tipoNegocio={negocio.tipoNegocio || 'RESERVA'}
                />
            </div>
        </>
    );
}

