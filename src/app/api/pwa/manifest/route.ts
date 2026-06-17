import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');

  // Default manifest configuration
  const defaultManifest = {
    name: "Cancha SaaS",
    short_name: "Cancha",
    description: "Plataforma de Reservas de Canchas",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [
      {
        src: "/icons/icon-192x192.png",
        sizes: "192x192",
        type: "image/png"
      },
      {
        src: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png"
      }
    ]
  };

  if (!slug) {
    return NextResponse.json(defaultManifest);
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
      name: business.nombre,
      short_name: business.nombre.length > 12 ? business.nombre.substring(0, 10) + "..." : business.nombre,
      start_url: `/${business.slug}?source=pwa`,
      scope: `/`,
      display: "standalone",
      theme_color: business.colorPrimario || defaultManifest.theme_color,
      background_color: "#ffffff",
      icons: business.logoUrl ? [
        {
          src: business.logoUrl,
          sizes: "any",
          type: "image/png",
          purpose: "any maskable"
        },
        {
          src: business.logoUrl,
          sizes: "192x192",
          type: "image/png"
        },
        {
          src: business.logoUrl,
          sizes: "512x512",
          type: "image/png"
        }
      ] : defaultManifest.icons
    };

    return NextResponse.json(dynamicManifest);
  } catch (error) {
    console.error('Error generating dynamic manifest:', error);
    return NextResponse.json(defaultManifest);
  }
}
