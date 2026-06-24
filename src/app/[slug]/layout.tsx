import { getNegocioBySlug } from '@/lib/services';
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

    let primaryColor = (negocio as any).colorPrimario && (negocio as any).colorPrimario !== '#1dc95c' ? (negocio as any).colorPrimario : '#1dc95c';
    let secondaryColor = (negocio as any).colorSecundario && (negocio as any).colorSecundario !== '#112117' ? (negocio as any).colorSecundario : '#112117';
    let tertiaryColor = (negocio as any).colorTerciario || primaryColor;
    let neutralColor = (negocio as any).colorNeutral || '#ffffff';
    let textColor = '#000000';
    let subTextColor = '#475569';

    if (canUseCustomColors) {
        primaryColor = (negocio as any).colorPrimario && (negocio as any).colorPrimario !== '#1dc95c' ? (negocio as any).colorPrimario : '#db2777'; // pink-600
        secondaryColor = (negocio as any).colorSecundario && (negocio as any).colorSecundario !== '#112117' ? (negocio as any).colorSecundario : '#020617'; // slate-950
        tertiaryColor = (negocio as any).colorTerciario || primaryColor; 
        neutralColor = (negocio as any).colorNeutral || '#FFF5F5';
        
        // Calcular textColor dinámicamente si no está configurado para evitar texto blanco sobre fondo blanco
        const rawTextColor = (negocio as any).colorTexto;
        textColor = rawTextColor
            ? rawTextColor
            : (() => {
                const hex = neutralColor.replace('#', '');
                if (hex.length !== 6) return '#1e293b';
                const r = parseInt(hex.substring(0, 2), 16);
                const g = parseInt(hex.substring(2, 4), 16);
                const b = parseInt(hex.substring(4, 6), 16);
                const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
                return luma < 140 ? '#f8fafc' : '#1e293b';
            })();
            
        subTextColor = (negocio as any).colorSubTexto || '#475569';
    }

    const isSecLight = isLightColor(secondaryColor);
    const navInactiveColor = isSecLight ? 'rgba(15, 23, 42, 0.5)' : 'rgba(255, 255, 255, 0.6)';
    const navBorderColor = isSecLight ? 'rgba(15, 23, 42, 0.08)' : 'rgba(255, 255, 255, 0.08)';

    // Calcular el color del ítem activo con contraste garantizado sobre el fondo secundario
    const primaryContrast = contrastRatioHex(primaryColor, secondaryColor);
    const navActiveColor = primaryContrast >= 3.5
        ? primaryColor
        : isSecLight ? '#0f172a' : '#ffffff';

    const isNeutralLight = isLightColor(neutralColor);
    const cardBgColor = isNeutralLight ? '#ffffff' : 'rgba(255, 255, 255, 0.04)';
    const cardBorderColor = isNeutralLight ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.08)';


    return (
        <>
            <style dangerouslySetInnerHTML={{
                __html: `
                :root {
                    --primary: ${primaryColor};
                    --primary-rgb: ${hexToRgb(primaryColor)};
                    --secondary: ${secondaryColor};
                    --secondary-rgb: ${hexToRgb(secondaryColor)};
                    --tertiary: ${tertiaryColor};
                    --tertiary-rgb: ${hexToRgb(tertiaryColor)};
                    --neutral: ${neutralColor};
                    --neutral-rgb: ${hexToRgb(neutralColor)};
                    --text-header: ${textColor};
                    --text-header-rgb: ${hexToRgb(textColor)};
                    --text-secondary: ${subTextColor};
                    --text-secondary-rgb: ${hexToRgb(subTextColor)};
                    --card-bg: ${cardBgColor};
                    --card-border: ${cardBorderColor};
                    
                    /* Navegación móvil dinámica */
                    --nav-inactive: ${navInactiveColor};
                    --nav-border: ${navBorderColor};
                    --nav-active: ${navActiveColor};
                }

                /* Forzar el color de texto dinámico en los encabezados y textos principales */
                .text-header-dynamic {
                    color: var(--text-header) !important;
                }

                /* Clase dinámica para tarjetas adaptativas al color de fondo */
                .bg-card-dynamic {
                    background-color: var(--card-bg) !important;
                    border: 1px solid var(--card-border) !important;
                }
                
                /* Dynamic utility classes for Tertiary */
                .text-tertiary { color: var(--tertiary) !important; }
                .bg-tertiary { background-color: var(--tertiary) !important; }
                .border-tertiary { border-color: var(--tertiary) !important; }
                
                /* Dynamic utility classes for Neutral */
                .text-neutral-custom { color: var(--neutral) !important; }
                .bg-neutral-custom { background-color: var(--neutral) !important; }
                .border-neutral-custom { border-color: var(--neutral) !important; }

                /* Interceptar colores de Tailwind y redirigirlos al branding */
                .text-emerald-300, .text-emerald-400, .text-indigo-400, .text-blue-400 { color: rgba(var(--primary-rgb), 0.85) !important; }
                .text-emerald-500, .text-indigo-500, .text-blue-500, .text-indigo-600 { color: var(--primary) !important; }
                .text-emerald-600, .text-indigo-700 { color: var(--primary) !important; filter: brightness(0.9); }

                /* Interceptar colores de Tailwind neutros para descripciones y subtítulos */
                .text-slate-400 { color: rgba(var(--text-secondary-rgb), 0.8) !important; }
                .text-slate-500, .text-slate-600 { color: var(--text-secondary) !important; }
                .text-slate-700 { color: var(--text-secondary) !important; filter: brightness(0.85); }

                .bg-emerald-50, .bg-indigo-50, .bg-blue-50, .bg-slate-50  { background-color: rgba(var(--primary-rgb), 0.05) !important; }
                .bg-emerald-100, .bg-indigo-100, .bg-slate-100 { background-color: rgba(var(--primary-rgb), 0.1)  !important; }
                .bg-emerald-500, .bg-indigo-500, .bg-blue-500, .bg-slate-500 { background-color: var(--primary) !important; }
                .bg-emerald-600, .bg-indigo-600, .bg-slate-600 { background-color: var(--primary) !important; filter: brightness(0.9); }

                .border-emerald-100, .border-indigo-100, .border-blue-100, .border-slate-100 { border-color: rgba(var(--primary-rgb), 0.1) !important; }
                .border-emerald-500, .border-indigo-500, .border-slate-500 { border-color: rgba(var(--primary-rgb), 0.4) !important; }

                /* Fill */
                .fill-emerald-400, .fill-emerald-500, .fill-indigo-500 { fill: var(--primary) !important; }

                /* Selection */
                ::selection { background-color: var(--primary); color: #fff; }

                /* Transitions */
                .transition-colors { transition-property: color, background-color, border-color, text-decoration-color, fill, stroke; transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1); transition-duration: 300ms; }
                `
            }} />
            <div className="flex flex-col min-h-screen" style={{ backgroundColor: 'var(--neutral)' }}>
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

function hexToRgb(hex: string) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return '29, 201, 92'; // Default emerald
    return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`;
}

function isLightColor(hex: string) {
    const rgbStr = hexToRgb(hex);
    const rgb = rgbStr.split(',').map(Number);
    if (rgb.length !== 3) return true;
    const luma = 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
    return luma > 140;
}

function contrastRatioHex(hex1: string, hex2: string): number {
    const luma1 = (() => {
        const rgb = hexToRgb(hex1).split(',').map(Number);
        return rgb.length === 3 ? (0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]) / 255 : 0.5;
    })();
    const luma2 = (() => {
        const rgb = hexToRgb(hex2).split(',').map(Number);
        return rgb.length === 3 ? (0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]) / 255 : 0.5;
    })();
    const lighter = Math.max(luma1, luma2);
    const darker = Math.min(luma1, luma2);
    return (lighter + 0.05) / (darker + 0.05);
}

