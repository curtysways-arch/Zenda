import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');

  // Default manifest configuration
  const defaultManifest = {
    name: "CitiOx",
    short_name: "CitiOx",
    description: "Plataforma Inteligente de Reservas y Gestión de Negocios",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#06b6d4",
    icons: [
      {
        src: "/logo-citiox.png",
        sizes: "192x192",
        type: "image/png"
      },
      {
        src: "/logo-citiox.png",
        sizes: "512x512",
        type: "image/png"
      }
    ]
  };

  if (!slug) {
    return NextResponse.json(defaultManifest);
  }

  if (slug === 'driver') {
    return NextResponse.json({
      name: "Citiox Driver",
      short_name: "Citiox Driver",
      description: "Aplicación y Portal Oficial del Repartidor Citiox",
      start_url: "/driver?source=pwa",
      id: "/driver-pwa",
      scope: "/driver",
      display: "standalone",
      orientation: "portrait",
      background_color: "#0f172a",
      theme_color: "#2563eb",
      icons: [
        {
          src: "/icons/driver-icon-192x192.png",
          sizes: "192x192",
          type: "image/png",
          purpose: "any"
        },
        {
          src: "/icons/driver-icon-512x512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "any"
        },
        {
          src: "/icons/driver-icon-maskable-512x512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "maskable"
        }
      ]
    });
  }

  try {
    // Fetch business data from database
    const business = await prisma.negocio.findUnique({
      where: { slug },
      select: {
        nombre: true,
        slug: true,
        logoUrl: true,
        colorPrimario: true,
      }
    });

    if (!business) {
        return NextResponse.json(defaultManifest);
    }

    // Customize manifest
    const dynamicManifest = {
      ...defaultManifest,
      id: `/${business.slug}`,
      name: business.nombre,
      short_name: business.nombre.length > 12 ? business.nombre.substring(0, 10) + "..." : business.nombre,
      start_url: `/${business.slug}?source=pwa`,
      scope: `/${business.slug}`,
      display: "standalone",
      theme_color: business.colorPrimario || defaultManifest.theme_color,
      background_color: "#ffffff",
      icons: (business.logoUrl && !business.logoUrl.includes('unsplash')) ? [
        {
          src: business.logoUrl,
          sizes: "any",
          purpose: "any maskable"
        }
      ] : defaultManifest.icons
    };

    return NextResponse.json(dynamicManifest);
  } catch (error) {
    console.error('Error generating dynamic manifest:', error);
    return NextResponse.json(defaultManifest);
  }
}
