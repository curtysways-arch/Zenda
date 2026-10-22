import { NextResponse } from 'next/server';
import { getEffectiveAdminSession } from '@/lib/delegatedAuth';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getEffectiveAdminSession();
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const businessId = (session.user as any).negocioId;
    if (!businessId) return NextResponse.json({ error: 'Negocio no especificado' }, { status: 400 });

    const productos = await (prisma as any).producto.findMany({
      where: { negocioId: businessId },
      include: {
        recipes: {
          include: {
            items: true
          }
        }
      }
    });

    const catalog = (productos || []).map((p: any) => {
      const salePrice = Number(p.precio || 0);
      const unitCost = Number(p.costo || p.costoPromedio || 0);
      const grossMarginAmount = Math.max(0, salePrice - unitCost);
      const grossMarginPercentage = salePrice > 0 ? (grossMarginAmount / salePrice) * 100 : 0;
      const primaryRecipe = p.recipes?.[0] || null;

      return {
        productId: p.id,
        productName: p.nombre,
        hasRecipe: !!primaryRecipe,
        recipeName: primaryRecipe?.name || null,
        unitCost,
        salePrice,
        grossMarginAmount,
        grossMarginPercentage
      };
    });

    return NextResponse.json({ success: true, catalog });
  } catch (e: any) {
    console.error('[API_COSTOS_GET]', e);
    return NextResponse.json({ error: e?.message || 'Error al obtener análisis de costos' }, { status: 500 });
  }
}
