import { NextResponse } from 'next/server';
import { getEffectiveAdminSession } from '@/lib/delegatedAuth';
import prisma from '@/lib/prisma';
import {
  toDecimal,
  decimalSub,
  decimalGt,
  decimalLte,
  decimalIsZero,
  roundQty,
  roundMoney,
  serializeDecimal,
  toVisualNumber
} from '@/lib/math/decimal';

export async function GET(req: Request) {
  const session = await getEffectiveAdminSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const negocioId = (session.user as any).negocioId;
  if (!negocioId) {
    return NextResponse.json({ error: 'No tienes un negocio asociado' }, { status: 400 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const filter = searchParams.get('filter') || 'all'; // all, low_stock, out_of_stock, variants, simple
    const search = (searchParams.get('search') || '').toLowerCase().trim();
    const branchId = searchParams.get('branchId');
    const warehouseId = searchParams.get('warehouseId');

    // Obtener todos los productos del negocio
    const productos = await (prisma as any).producto.findMany({
      where: { negocioId },
      include: {
        categoria: true,
        variantes: true
      },
      orderBy: { nombre: 'asc' }
    });

    // Cargar existencias físicas de WarehouseStock si se especificó bodega o sucursal
    let warehouseStocksMap = new Map<string, any>();
    if (warehouseId) {
      const wStocks = await (prisma as any).warehouseStock.findMany({
        where: { warehouseId }
      });
      for (const ws of wStocks) {
        const key = ws.variantId ? `var_${ws.variantId}` : `prod_${ws.productId}`;
        warehouseStocksMap.set(key, ws);
      }
    } else if (branchId && branchId !== 'ALL') {
      const wStocks = await (prisma as any).warehouseStock.findMany({
        where: {
          warehouse: { branchId, active: true, type: { notIn: ['TRANSIT', 'SCRAP_WASTE'] } }
        }
      });
      for (const ws of wStocks) {
        const key = ws.variantId ? `var_${ws.variantId}` : `prod_${ws.productId}`;
        const existing = warehouseStocksMap.get(key);
        if (existing) {
          existing.quantity = decimalSub(toDecimal(existing.quantity), toDecimal(ws.quantity).times(-1)); // sum
        } else {
          warehouseStocksMap.set(key, { ...ws, quantity: toDecimal(ws.quantity) });
        }
      }
    }

    // Cargar BranchInventory si se especificó sucursal
    let branchInventoryMap = new Map<string, any>();
    if (branchId && branchId !== 'ALL') {
      const bInvs = await (prisma as any).branchInventory.findMany({
        where: { branchId }
      });
      for (const bi of bInvs) {
        const key = bi.variantId ? `var_${bi.variantId}` : `prod_${bi.productId}`;
        branchInventoryMap.set(key, bi);
      }
    }

    const inventoryItems: any[] = [];

    for (const prod of productos) {
      if (prod.tieneVariantes) {
        for (const v of prod.variantes || []) {
          const key = `var_${v.id}`;
          const ws = warehouseStocksMap.get(key);
          const bi = branchInventoryMap.get(key);

          // Stock físico específico si hay warehouse/branch, sino stock consolidado de la variante
          const physicalStockDec = ws ? toDecimal(ws.quantity) : (bi ? toDecimal(bi.stock) : toDecimal(v.stock ?? 0));
          const branchStockDec = bi ? toDecimal(bi.stock) : toDecimal(v.stock ?? 0);
          const corporatePmpDec = toDecimal(v.costoPromedio ?? prod.costoPromedio ?? 0);
          const branchPmpDec = bi ? toDecimal(bi.costoPromedio ?? 0) : corporatePmpDec;
          const activeCostDec = branchId && branchId !== 'ALL' ? branchPmpDec : corporatePmpDec;
          const vPrecioDec = toDecimal(v.precio ?? prod.precio ?? 0);
          const totalValDec = roundMoney(physicalStockDec.times(activeCostDec));

          let costStatus = 'PENDING_VALUATION';
          if (activeCostDec.gt(0)) {
            costStatus = 'CERTIFIED';
          } else if (physicalStockDec.isZero()) {
            costStatus = 'NOT_APPLICABLE';
          }

          inventoryItems.push({
            id: v.id,
            productId: prod.id,
            variantId: v.id,
            nombreProducto: prod.nombre,
            nombreVariante: v.nombre,
            nombreCompleto: `${prod.nombre} (${v.nombre})`,
            sku: v.sku || prod.sku || 'Sin SKU',
            categoria: prod.categoria?.nombre || 'Sin Categoría',
            precio: serializeDecimal(vPrecioDec, 2) || '0.00',
            precioNumero: toVisualNumber(vPrecioDec),
            stock: serializeDecimal(physicalStockDec, 4) || '0.0000',
            stockNumero: toVisualNumber(physicalStockDec),
            physicalStock: serializeDecimal(physicalStockDec, 4) || '0.0000',
            physicalStockNumero: toVisualNumber(physicalStockDec),
            branchStock: serializeDecimal(branchStockDec, 4) || '0.0000',
            branchStockNumero: toVisualNumber(branchStockDec),
            costoPromedio: serializeDecimal(activeCostDec, 6) || '0.000000',
            costoPromedioNumero: toVisualNumber(activeCostDec),
            costoCorporativo: serializeDecimal(corporatePmpDec, 6) || '0.000000',
            costoCorporativoNumero: toVisualNumber(corporatePmpDec),
            costStatus,
            totalValue: serializeDecimal(totalValDec, 2) || '0.00',
            totalValueNumero: toVisualNumber(totalValDec),
            isVariant: true,
            activo: v.activo && prod.activo,
            lastUpdated: v.updatedAt || prod.updatedAt
          });
        }
      } else {
        const key = `prod_${prod.id}`;
        const ws = warehouseStocksMap.get(key);
        const bi = branchInventoryMap.get(key);

        const physicalStockDec = ws ? toDecimal(ws.quantity) : (bi ? toDecimal(bi.stock) : toDecimal(prod.stock ?? 0));
        const branchStockDec = bi ? toDecimal(bi.stock) : toDecimal(prod.stock ?? 0);
        const corporatePmpDec = toDecimal(prod.costoPromedio ?? 0);
        const branchPmpDec = bi ? toDecimal(bi.costoPromedio ?? 0) : corporatePmpDec;
        const activeCostDec = branchId && branchId !== 'ALL' ? branchPmpDec : corporatePmpDec;
        const pPrecioDec = toDecimal(prod.precio ?? 0);
        const totalValDec = roundMoney(physicalStockDec.times(activeCostDec));

        let costStatus = 'PENDING_VALUATION';
        if (activeCostDec.gt(0)) {
          costStatus = 'CERTIFIED';
        } else if (physicalStockDec.isZero()) {
          costStatus = 'NOT_APPLICABLE';
        }

        inventoryItems.push({
          id: prod.id,
          productId: prod.id,
          variantId: null,
          nombreProducto: prod.nombre,
          nombreVariante: 'Producto Simple',
          nombreCompleto: prod.nombre,
          sku: prod.sku || 'Sin SKU',
          categoria: prod.categoria?.nombre || 'Sin Categoría',
          precio: serializeDecimal(pPrecioDec, 2) || '0.00',
          precioNumero: toVisualNumber(pPrecioDec),
          stock: serializeDecimal(physicalStockDec, 4) || '0.0000',
          stockNumero: toVisualNumber(physicalStockDec),
          physicalStock: serializeDecimal(physicalStockDec, 4) || '0.0000',
          physicalStockNumero: toVisualNumber(physicalStockDec),
          branchStock: serializeDecimal(branchStockDec, 4) || '0.0000',
          branchStockNumero: toVisualNumber(branchStockDec),
          costoPromedio: serializeDecimal(activeCostDec, 6) || '0.000000',
          costoPromedioNumero: toVisualNumber(activeCostDec),
          costoCorporativo: serializeDecimal(corporatePmpDec, 6) || '0.000000',
          costoCorporativoNumero: toVisualNumber(corporatePmpDec),
          costStatus,
          totalValue: serializeDecimal(totalValDec, 2) || '0.00',
          totalValueNumero: toVisualNumber(totalValDec),
          isVariant: false,
          activo: prod.activo,
          lastUpdated: prod.updatedAt
        });
      }
    }

    // Filtrado
    let filtered = inventoryItems;

    if (search) {
      filtered = filtered.filter(item =>
        item.nombreCompleto.toLowerCase().includes(search) ||
        item.sku.toLowerCase().includes(search) ||
        item.categoria.toLowerCase().includes(search)
      );
    }

    if (filter === 'low_stock') {
      filtered = filtered.filter(item => decimalGt(item.stock, 0) && decimalLte(item.stock, 3));
    } else if (filter === 'out_of_stock') {
      filtered = filtered.filter(item => decimalIsZero(item.stock));
    } else if (filter === 'variants') {
      filtered = filtered.filter(item => item.isVariant);
    } else if (filter === 'simple') {
      filtered = filtered.filter(item => !item.isVariant);
    }

    // Valorización total del inventario filtrado
    const totalInventoryValue = filtered.reduce((acc, it) => acc + (it.totalValueNumero || 0), 0);

    return NextResponse.json({
      items: filtered,
      context: {
        branchId: branchId || 'ALL',
        warehouseId: warehouseId || null
      },
      summary: {
        totalItems: inventoryItems.length,
        outOfStock: inventoryItems.filter(i => decimalIsZero(i.stock)).length,
        lowStock: inventoryItems.filter(i => decimalGt(i.stock, 0) && decimalLte(i.stock, 3)).length,
        normalStock: inventoryItems.filter(i => decimalGt(i.stock, 3)).length,
        totalInventoryValue: totalInventoryValue.toFixed(2)
      }
    });
  } catch (e: any) {
    console.error('[API_INVENTARIO_GET]', e);
    return NextResponse.json({ error: e?.message || 'Error al obtener inventario' }, { status: 500 });
  }
}

// POST: Ajuste de stock manual con historial de trazabilidad
export async function POST(req: Request) {
  const session = await getEffectiveAdminSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const negocioId = (session.user as any).negocioId;
  const usuarioNombre = session.user.name || session.user.email || 'Admin';

  try {
    const body = await req.json();
    const { variantId, productId, tipoMovimiento, cantidad, motivo, branchId, warehouseId, costoUnitario } = body;

    if ((!variantId && !productId) || !tipoMovimiento || cantidad === undefined || !motivo) {
      return NextResponse.json({ error: 'Datos incompletos para el ajuste de inventario' }, { status: 400 });
    }

    const cantDec = roundQty(cantidad);

    const { InventoryEngine } = await import('@/core/inventory/InventoryEngine');

    // Resolver sucursal y bodega física para el ajuste (prohibir bodegas virtuales)
    let targetBranchId = branchId;
    let targetWarehouseId = warehouseId;

    if (targetWarehouseId) {
      const wh = await (prisma as any).warehouse.findFirst({
        where: { id: targetWarehouseId, businessId: negocioId, active: true }
      });
      if (!wh) {
        return NextResponse.json({ error: 'La bodega seleccionada no existe o está inactiva' }, { status: 400 });
      }
      if (wh.type === 'TRANSIT' || wh.type === 'SCRAP_WASTE') {
        return NextResponse.json({ error: 'Operación no permitida: no se admiten ajustes manuales sobre bodegas virtuales del sistema (tránsito o merma).' }, { status: 400 });
      }
      targetBranchId = wh.branchId || targetBranchId;
    } else if (targetBranchId) {
      const defWh = await (prisma as any).warehouse.findFirst({
        where: { businessId: negocioId, branchId: targetBranchId, isDefault: true, active: true, type: { notIn: ['TRANSIT', 'SCRAP_WASTE'] } }
      });
      if (defWh) {
        targetWarehouseId = defWh.id;
      } else {
        const anyWh = await (prisma as any).warehouse.findFirst({
          where: { businessId: negocioId, branchId: targetBranchId, active: true, type: { notIn: ['TRANSIT', 'SCRAP_WASTE'] } }
        });
        if (anyWh) targetWarehouseId = anyWh.id;
      }
    } else {
      const defWh = await (prisma as any).warehouse.findFirst({
        where: { businessId: negocioId, isDefault: true, active: true, type: { notIn: ['TRANSIT', 'SCRAP_WASTE'] } }
      });
      if (defWh) {
        targetWarehouseId = defWh.id;
        targetBranchId = defWh.branchId;
      } else {
        const anyWh = await (prisma as any).warehouse.findFirst({
          where: { businessId: negocioId, active: true, type: { notIn: ['TRANSIT', 'SCRAP_WASTE'] } }
        });
        if (anyWh) {
          targetWarehouseId = anyWh.id;
          targetBranchId = anyWh.branchId;
        }
      }
    }

    if (!targetWarehouseId || !targetBranchId) {
      return NextResponse.json({
        error: 'La sucursal no tiene una bodega física de inventario configurada. Configure una bodega antes de realizar esta operación.'
      }, { status: 400 });
    }

    let resultItem: any = null;

    if (variantId) {
      // Validar variante y tenant
      const variante = await (prisma as any).productoVariante.findUnique({
        where: { id: variantId },
        include: { producto: true }
      });

      if (!variante || variante.producto.negocioId !== negocioId) {
        return NextResponse.json({ error: 'Variante no encontrada o no pertenece al negocio' }, { status: 403 });
      }

      let delta = toDecimal(0);
      let movType: any = 'AJUSTE';

      if (tipoMovimiento === 'ENTRADA') {
        delta = cantDec.abs();
        movType = 'ENTRADA';
      } else if (tipoMovimiento === 'SALIDA') {
        delta = cantDec.abs().times(-1);
        movType = 'SALIDA';
      } else if (tipoMovimiento === 'AJUSTE_ABSOLUTO') {
        // Regla C3.4: El ajuste absoluto debe calcularse contra WarehouseStock.quantity (verdad física), nunca contra Producto.stock
        const wStock = await (prisma as any).warehouseStock.findFirst({
          where: {
            warehouseId: targetWarehouseId,
            productId: variante.productoId,
            variantId: variante.id
          }
        });
        const stockFisicoActual = toDecimal(wStock?.quantity ?? 0);
        delta = decimalSub(cantDec, stockFisicoActual);
        movType = 'AJUSTE';
      }

      if (!delta.isZero()) {
        await InventoryEngine.recordMovement({
          businessId: negocioId,
          warehouseId: targetWarehouseId,
          branchId: targetBranchId,
          productId: variante.productoId,
          variantId: variante.id,
          quantity: delta,
          type: movType,
          unitCost: costoUnitario !== undefined && costoUnitario !== null ? toDecimal(costoUnitario) : undefined,
          reason: motivo,
          createdBy: usuarioNombre
        });
      }

      resultItem = await (prisma as any).productoVariante.findUnique({
        where: { id: variantId }
      });
    } else {
      // Producto simple
      const producto = await (prisma as any).producto.findUnique({ where: { id: productId } });

      if (!producto || producto.negocioId !== negocioId) {
        return NextResponse.json({ error: 'Producto no encontrado o no pertenece al negocio' }, { status: 403 });
      }

      let delta = toDecimal(0);
      let movType: any = 'AJUSTE';

      if (tipoMovimiento === 'ENTRADA') {
        delta = cantDec.abs();
        movType = 'ENTRADA';
      } else if (tipoMovimiento === 'SALIDA') {
        delta = cantDec.abs().times(-1);
        movType = 'SALIDA';
      } else if (tipoMovimiento === 'AJUSTE_ABSOLUTO') {
        // Regla C3.4: El ajuste absoluto debe calcularse contra WarehouseStock.quantity (verdad física), nunca contra Producto.stock
        const wStock = await (prisma as any).warehouseStock.findFirst({
          where: {
            warehouseId: targetWarehouseId,
            productId: producto.id,
            variantId: null
          }
        });
        const stockFisicoActual = toDecimal(wStock?.quantity ?? 0);
        delta = decimalSub(cantDec, stockFisicoActual);
        movType = 'AJUSTE';
      }

      if (!delta.isZero()) {
        await InventoryEngine.recordMovement({
          businessId: negocioId,
          warehouseId: targetWarehouseId,
          branchId: targetBranchId,
          productId: producto.id,
          quantity: delta,
          type: movType,
          unitCost: costoUnitario !== undefined && costoUnitario !== null ? toDecimal(costoUnitario) : undefined,
          reason: motivo,
          createdBy: usuarioNombre
        });
      }

      resultItem = await (prisma as any).producto.findUnique({
        where: { id: productId }
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Ajuste de inventario procesado correctamente',
      item: {
        ...resultItem,
        stock: serializeDecimal(resultItem?.stock, 4),
        precio: serializeDecimal(resultItem?.precio, 2)
      }
    });
  } catch (e: any) {
    console.error('[API_INVENTARIO_POST]', e);
    return NextResponse.json({ error: e?.message || 'Error al procesar ajuste de inventario' }, { status: 500 });
  }
}
