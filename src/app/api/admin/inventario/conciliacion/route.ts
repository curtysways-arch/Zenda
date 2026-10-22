import { NextResponse } from 'next/server';
import { getEffectiveAdminSession } from '@/lib/delegatedAuth';
import { InventoryReconciliationService, ReconciliationStatus } from '@/core/inventory/InventoryReconciliationService';

export async function GET(req: Request) {
  try {
    const session = await getEffectiveAdminSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const user = session.user as any;
    const isSuperAdmin = user.role === 'SUPERADMIN' || user.isSuperAdmin === true;
    const userNegocioId = user.negocioId;

    const { searchParams } = new URL(req.url);
    const requestedBusinessId = searchParams.get('businessId') || undefined;

    // Aislamiento multitenant: los administradores estándar están estrictamente acotados a su propio negocio
    let effectiveBusinessId: string | undefined = userNegocioId;
    if (isSuperAdmin && requestedBusinessId) {
      effectiveBusinessId = requestedBusinessId;
    } else if (isSuperAdmin && requestedBusinessId === 'ALL') {
      effectiveBusinessId = undefined;
    } else if (!isSuperAdmin && !userNegocioId) {
      return NextResponse.json({ error: 'Usuario no tiene un negocio asociado' }, { status: 403 });
    }

    const estadoParam = searchParams.get('estado') as (ReconciliationStatus | 'ALL') || 'ALL';
    const search = searchParams.get('search') || undefined;
    const branchId = searchParams.get('branchId') || undefined;
    const warehouseId = searchParams.get('warehouseId') || undefined;
    const format = searchParams.get('format') || 'json';

    const report = await InventoryReconciliationService.getReconciliationReport({
      businessId: effectiveBusinessId,
      branchId,
      warehouseId,
      estado: estadoParam,
      search
    });

    if (format === 'csv') {
      // Exportación en memoria como CSV sin mutar la base de datos
      const headers = [
        'ID Producto',
        'Nombre',
        'SKU',
        'Negocio',
        'Stock Producto',
        'Stock Bodegas',
        'Stock Sucursales',
        'Dif Prod-Bodega',
        'Dif Bodega-Sucursal',
        'Estado Conciliación',
        'Unidad Base',
        'Estado UOM',
        'Costo PMP',
        'Estado Costo',
        'Movimientos Kardex',
        'Motivos'
      ];

      const csvRows = [headers.join(',')];
      for (const item of report.items) {
        const row = [
          `"${item.productId}"`,
          `"${item.nombre.replace(/"/g, '""')}"`,
          `"${item.sku || ''}"`,
          `"${item.negocioNombre.replace(/"/g, '""')}"`,
          item.stockProducto ?? 'N/A',
          item.stockBodegasTotal,
          item.stockSucursalesTotal,
          item.difProdBodega,
          item.difBodegaSucursal,
          item.estado,
          `"${item.unidadMedidaBase || 'N/A'}"`,
          item.uomStatus,
          item.costIsUnknown ? 'DESCONOCIDO' : item.costoPromedio || 'N/A',
          item.costStatus,
          item.kardex.movementCount,
          `"${item.motivos.join('; ').replace(/"/g, '""')}"`
        ];
        csvRows.push(row.join(','));
      }

      const csvContent = '\uFEFF' + csvRows.join('\r\n'); // UTF-8 BOM
      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="conciliacion_inventario_${new Date().toISOString().slice(0, 10)}.csv"`
        }
      });
    }

    return NextResponse.json({
      success: true,
      data: report.items,
      summary: report.summary
    });
  } catch (error: any) {
    console.error('Error en API de conciliación:', error);
    return NextResponse.json(
      { error: 'Error interno al consultar la conciliación de inventario', details: error.message },
      { status: 500 }
    );
  }
}
