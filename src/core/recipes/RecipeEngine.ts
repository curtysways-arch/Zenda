import prisma from '@/lib/prisma';

export interface CreateRecipeInput {
  businessId: string;
  productId: string;
  name: string;
  yieldQuantity: number;
  yieldUnit?: string;
  prepTimeMin?: number;
  estimatedLoss?: number;
  extraCost?: number;
  notes?: string;
  ingredients: Array<{
    ingredientId: string;
    quantity: number;
    unit?: string;
    estimatedCost?: number;
  }>;
}

export class RecipeEngine {
  /**
   * Valida que no exista ciclo recursivo (ej: A contiene B, y B contiene A)
   */
  public static async checkForCycles(targetProductId: string, ingredientIds: string[]): Promise<boolean> {
    if (ingredientIds.includes(targetProductId)) {
      return true; // Auto-referencia directa
    }

    // Búsqueda en profundidad (DFS) en recetas existentes de los ingredientes
    const visited = new Set<string>();

    async function checkRecursive(currentId: string): Promise<boolean> {
      if (currentId === targetProductId) return true;
      if (visited.has(currentId)) return false;
      visited.add(currentId);

      const recipes = await (prisma as any).recipe.findMany({
        where: { productId: currentId, active: true },
        include: { items: true }
      });

      for (const r of recipes) {
        for (const item of r.items) {
          if (item.ingredientId === targetProductId) return true;
          const hasCycle = await checkRecursive(item.ingredientId);
          if (hasCycle) return true;
        }
      }
      return false;
    }

    for (const ingId of ingredientIds) {
      if (await checkRecursive(ingId)) return true;
    }

    return false;
  }

  /**
   * Crea o actualiza una receta de elaboración con versionamiento
   */
  public static async upsertRecipe(input: CreateRecipeInput) {
    const { businessId, productId, name, yieldQuantity, ingredients } = input;

    if (!ingredients || ingredients.length === 0) {
      throw new Error('La receta debe tener al menos un ingrediente.');
    }

    if (yieldQuantity <= 0) {
      throw new Error('El rendimiento de la receta debe ser mayor a 0.');
    }

    const ingredientIds = ingredients.map(i => i.ingredientId);
    const hasCycle = await this.checkForCycles(productId, ingredientIds);
    if (hasCycle) {
      throw new Error('Se detectó una dependencia circular o recursiva en los ingredientes de la receta.');
    }

    // Verificar si ya existe una receta activa previa para incrementar versión
    const existing = await (prisma as any).recipe.findFirst({
      where: { businessId, productId, active: true },
      orderBy: { version: 'desc' }
    });

    const version = existing ? existing.version + 1 : 1;

    // Si existía una versión anterior, la marcamos como histórica
    if (existing) {
      await (prisma as any).recipe.update({
        where: { id: existing.id },
        data: { active: false }
      });
    }

    // Calcular costo estimado de ingredientes
    const processedItems = await Promise.all(
      ingredients.map(async it => {
        let cost = it.estimatedCost;
        if (cost === undefined || cost === 0) {
          const prod = await (prisma as any).producto.findUnique({
            where: { id: it.ingredientId },
            select: { costoUnitario: true }
          });
          cost = prod?.costoUnitario || 0;
        }
        return {
          ingredientId: it.ingredientId,
          quantity: it.quantity,
          unit: it.unit || 'UNIDAD',
          estimatedCost: cost
        };
      })
    );

    const recipe = await (prisma as any).recipe.create({
      data: {
        businessId,
        productId,
        name,
        yieldQuantity,
        yieldUnit: input.yieldUnit || 'UNIDAD',
        prepTimeMin: input.prepTimeMin || 0,
        estimatedLoss: input.estimatedLoss || 0,
        extraCost: input.extraCost || 0,
        version,
        active: true,
        notes: input.notes || null,
        items: {
          create: processedItems
        }
      },
      include: {
        producto: true,
        items: {
          include: {
            ingredient: true
          }
        }
      }
    });

    return recipe;
  }

  /**
   * Escala una receta para una cantidad objetivo a producir
   */
  public static scaleRecipe(recipe: any, targetQuantity: number) {
    if (recipe.yieldQuantity <= 0) return recipe;
    const factor = targetQuantity / recipe.yieldQuantity;

    const scaledIngredients = (recipe.items || []).map((item: any) => {
      const scaledQty = item.quantity * factor;
      const totalCost = scaledQty * (item.estimatedCost || 0);
      return {
        ...item,
        scaledQuantity: scaledQty,
        totalEstimatedCost: totalCost
      };
    });

    const ingredientsCost = scaledIngredients.reduce((acc: number, it: any) => acc + (it.totalEstimatedCost || 0), 0);
    const scaledExtraCost = (recipe.extraCost || 0) * factor;
    const totalBatchCost = ingredientsCost + scaledExtraCost;
    const unitEstimatedCost = targetQuantity > 0 ? totalBatchCost / targetQuantity : 0;

    return {
      targetQuantity,
      scaleFactor: factor,
      ingredients: scaledIngredients,
      ingredientsCost,
      extraCost: scaledExtraCost,
      totalBatchCost,
      unitEstimatedCost
    };
  }
}
