import { NextResponse } from 'next/server';
import { getEffectiveAdminSession } from '@/lib/delegatedAuth';
import prisma from '@/lib/prisma';
import { RecipeEngine } from '@/core/recipes/RecipeEngine';

export async function GET() {
  try {
    const session = await getEffectiveAdminSession();
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const businessId = (session.user as any).negocioId;
    if (!businessId) return NextResponse.json({ error: 'Negocio no especificado' }, { status: 400 });

    const recipes = await (prisma as any).recipe.findMany({
      where: { businessId, active: true },
      include: {
        producto: true,
        items: {
          include: { ingredient: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    return NextResponse.json({ success: true, recipes });
  } catch (e: any) {
    console.error('[API_RECETAS_GET]', e);
    return NextResponse.json({ error: e?.message || 'Error al obtener recetas' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getEffectiveAdminSession();
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const businessId = (session.user as any).negocioId;
    const body = await req.json();
    const { productId, name, yieldQuantity, yieldUnit, prepTimeMin, extraCost, notes, ingredients } = body;

    if (!productId || !name || !yieldQuantity || !ingredients || ingredients.length === 0) {
      return NextResponse.json({ error: 'Faltan datos obligatorios para la receta' }, { status: 400 });
    }

    const recipe = await RecipeEngine.upsertRecipe({
      businessId,
      productId,
      name,
      yieldQuantity: Number(yieldQuantity),
      yieldUnit,
      prepTimeMin: Number(prepTimeMin) || 0,
      extraCost: Number(extraCost) || 0,
      notes,
      ingredients
    });

    return NextResponse.json({ success: true, recipe });
  } catch (e: any) {
    console.error('[API_RECETAS_POST]', e);
    return NextResponse.json({ error: e?.message || 'Error al guardar receta' }, { status: 400 });
  }
}
