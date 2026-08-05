import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    // Consulta raw directa
    const rawPages = await prisma.$queryRawUnsafe(`SELECT id, businessId, title, slug, status, LENGTH(contentHtml) as contentLen FROM Page ORDER BY updatedAt DESC`) as any[];
    
    const negocios = await prisma.$queryRawUnsafe(`SELECT id, nombre, slug, tipoNegocio FROM Negocio`) as any[];

    return NextResponse.json({
      negocioLavado: negocios.find((n: any) => n.slug === 'lavado'),
      totalPages: rawPages.length,
      pages: rawPages,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
