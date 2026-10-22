'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Package,
  Layers,
  Search,
  Filter,
  Download,
  RefreshCw,
  Eye,
  X,
  FileText,
  Warehouse,
  GitBranch,
  History,
  Lock,
  ArrowLeft
} from 'lucide-react';
import { ProductReconciliationItem, ReconciliationSummary, ReconciliationStatus } from '@/core/inventory/InventoryReconciliationService';

export default function ConciliacionInventarioPage() {
  const [items, setItems] = useState<ProductReconciliationItem[]>([]);
  const [summary, setSummary] = useState<ReconciliationSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [estadoFilter, setEstadoFilter] = useState<ReconciliationStatus | 'ALL'>('ALL');
  const [search, setSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<ProductReconciliationItem | null>(null);

  const fetchReconciliation = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (estadoFilter !== 'ALL') params.set('estado', estadoFilter);
      if (search.trim()) params.set('search', search.trim());

      const res = await fetch(`/api/admin/inventario/conciliacion?${params.toString()}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al cargar reporte de conciliación');
      }

      const json = await res.json();
      setItems(json.data || []);
      setSummary(json.summary || null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReconciliation();
  }, [estadoFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchReconciliation();
  };

  const handleDownloadCsv = () => {
    const params = new URLSearchParams();
    if (estadoFilter !== 'ALL') params.set('estado', estadoFilter);
    if (search.trim()) params.set('search', search.trim());
    params.set('format', 'csv');
    window.open(`/api/admin/inventario/conciliacion?${params.toString()}`, '_blank');
  };

  const getStatusBadge = (estado: ReconciliationStatus) => {
    switch (estado) {
      case 'OK':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Conciliado OK
          </span>
        );
      case 'DISCREPANCIA':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <AlertTriangle className="w-3.5 h-3.5" />
            Discrepancia
          </span>
        );
      case 'SIN_BODEGA':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            <Warehouse className="w-3.5 h-3.5" />
            Sin Bodega
          </span>
        );
      case 'SIN_KARDEX':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <History className="w-3.5 h-3.5" />
            Sin Kardex
          </span>
        );
      case 'PENDIENTE_AUDITORIA':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <ShieldAlert className="w-3.5 h-3.5" />
            Pendiente Auditoría
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8 space-y-6">
      {/* Cabecera */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-3">
            <Link
              href="/admin/inventario"
              className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 transition-colors"
              title="Volver a Inventario"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Layers className="w-7 h-7 text-indigo-600" />
              Conciliación Asistida de Inventario
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-200 text-slate-700 border border-slate-300">
              <Lock className="w-3 h-3 text-slate-500" />
              Solo Lectura
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Auditoría diagnóstica de existencias en 3 capas (Producto, Bodegas, Sucursales), Kardex y valoración PMP sin alteración de datos.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchReconciliation}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 shadow-sm transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
          <button
            onClick={handleDownloadCsv}
            disabled={loading || items.length === 0}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm transition-all disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            Exportar CSV
          </button>
        </div>
      </div>

      {/* Banner de Advertencia de Modo Seguro */}
      <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg shadow-sm flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-800 space-y-1">
          <p className="font-semibold text-amber-900">
            Fase 2F: Herramienta de Auditoría Estrictamente Diagnóstica
          </p>
          <p>
            Esta vista no realiza ajustes, no crea movimientos ni altera el saldo de ningún producto o bodega. Los productos marcados como «Sin Bodega» o «Pendiente de Auditoría» reflejan inconsistencias históricas que deben ser revisadas antes de aplicar cualquier acción administrativa.
          </p>
        </div>
      </div>

      {/* Tarjetas de Resumen Diagnóstico */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <div
            onClick={() => setEstadoFilter('ALL')}
            className={`cursor-pointer p-4 rounded-xl border transition-all ${
              estadoFilter === 'ALL'
                ? 'bg-indigo-50 border-indigo-300 ring-2 ring-indigo-500/20 shadow-sm'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="text-xs font-medium text-slate-500">Total Auditados</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{summary.totalProductos}</div>
            <div className="text-xs text-slate-400 mt-0.5">Productos activos</div>
          </div>

          <div
            onClick={() => setEstadoFilter('OK')}
            className={`cursor-pointer p-4 rounded-xl border transition-all ${
              estadoFilter === 'OK'
                ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-500/20 shadow-sm'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="text-xs font-medium text-emerald-600 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> OK
            </div>
            <div className="text-2xl font-bold text-emerald-700 mt-1">{summary.porEstado.OK}</div>
            <div className="text-xs text-emerald-600/70 mt-0.5">Saldos alineados</div>
          </div>

          <div
            onClick={() => setEstadoFilter('DISCREPANCIA')}
            className={`cursor-pointer p-4 rounded-xl border transition-all ${
              estadoFilter === 'DISCREPANCIA'
                ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-500/20 shadow-sm'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="text-xs font-medium text-amber-600 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" /> Discrepancia
            </div>
            <div className="text-2xl font-bold text-amber-700 mt-1">{summary.porEstado.DISCREPANCIA}</div>
            <div className="text-xs text-amber-600/70 mt-0.5">Descuadre numérico</div>
          </div>

          <div
            onClick={() => setEstadoFilter('SIN_BODEGA')}
            className={`cursor-pointer p-4 rounded-xl border transition-all ${
              estadoFilter === 'SIN_BODEGA'
                ? 'bg-purple-50 border-purple-300 ring-2 ring-purple-500/20 shadow-sm'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="text-xs font-medium text-purple-600 flex items-center gap-1">
              <Warehouse className="w-3.5 h-3.5" /> Sin Bodega
            </div>
            <div className="text-2xl font-bold text-purple-700 mt-1">{summary.porEstado.SIN_BODEGA}</div>
            <div className="text-xs text-purple-600/70 mt-0.5">Saldo sin bodega</div>
          </div>

          <div
            onClick={() => setEstadoFilter('SIN_KARDEX')}
            className={`cursor-pointer p-4 rounded-xl border transition-all ${
              estadoFilter === 'SIN_KARDEX'
                ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-500/20 shadow-sm'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="text-xs font-medium text-blue-600 flex items-center gap-1">
              <History className="w-3.5 h-3.5" /> Sin Kardex
            </div>
            <div className="text-2xl font-bold text-blue-700 mt-1">{summary.porEstado.SIN_KARDEX}</div>
            <div className="text-xs text-blue-600/70 mt-0.5">Sin movimientos</div>
          </div>

          <div
            onClick={() => setEstadoFilter('PENDIENTE_AUDITORIA')}
            className={`cursor-pointer p-4 rounded-xl border transition-all ${
              estadoFilter === 'PENDIENTE_AUDITORIA'
                ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-500/20 shadow-sm'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="text-xs font-medium text-rose-600 flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5" /> Pendientes
            </div>
            <div className="text-2xl font-bold text-rose-700 mt-1">{summary.porEstado.PENDIENTE_AUDITORIA}</div>
            <div className="text-xs text-rose-600/70 mt-0.5">Saldo negativo/crítico</div>
          </div>
        </div>
      )}

      {/* Filtros y Buscador */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o SKU..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
          />
        </form>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Estado:
          </span>
          <select
            value={estadoFilter}
            onChange={(e) => setEstadoFilter(e.target.value as any)}
            className="text-sm py-2 px-3 rounded-lg border border-slate-300 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">Todos los estados</option>
            <option value="OK">Conciliado OK</option>
            <option value="DISCREPANCIA">Discrepancias</option>
            <option value="SIN_BODEGA">Sin Bodega</option>
            <option value="SIN_KARDEX">Sin Kardex</option>
            <option value="PENDIENTE_AUDITORIA">Pendientes de Auditoría</option>
          </select>
        </div>
      </div>

      {/* Tabla de Resultados */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Producto</th>
                <th className="py-3 px-4 text-right">P. Stock</th>
                <th className="py-3 px-4 text-right">Bodegas</th>
                <th className="py-3 px-4 text-right">Sucursales</th>
                <th className="py-3 px-4 text-center">Estado</th>
                <th className="py-3 px-4 text-center">UOM</th>
                <th className="py-3 px-4 text-right">Costo Promedio</th>
                <th className="py-3 px-4 text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                    Cargando auditoría de inventario...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No se encontraron productos para los criterios seleccionados.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.productId} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-900">{item.nombre}</div>
                      <div className="text-xs text-slate-400">
                        {item.sku ? `SKU: ${item.sku}` : 'Sin SKU'} • {item.negocioNombre}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-800">
                      {item.stockProducto ?? <span className="text-slate-400">NULL</span>}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-800">
                      {item.stockBodegasTotal}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-800">
                      {item.stockSucursalesTotal}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {getStatusBadge(item.estado)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {item.uomReviewRequired ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                          Revisar UOM
                        </span>
                      ) : (
                        <span className="font-mono text-xs text-slate-600">
                          {item.unidadMedidaBase}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {item.costIsUnknown ? (
                        <span className="text-xs text-slate-400 ">Desconocido</span>
                      ) : (
                        <span className="font-mono text-xs font-semibold text-slate-700">
                          ${item.costoPromedio}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => setSelectedProduct(item)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Detalle
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Detalle de Producto en Modo Solo Lectura */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 flex items-start justify-between bg-slate-50">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-slate-900">{selectedProduct.nombre}</h3>
                  {getStatusBadge(selectedProduct.estado)}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  ID: <span className="font-mono">{selectedProduct.productId}</span> • Negocio: {selectedProduct.negocioNombre}
                </p>
              </div>
              <button
                onClick={() => setSelectedProduct(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6 overflow-y-auto">
              {/* Diagnóstico Explícito */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Diagnóstico del Sistema
                </div>
                <ul className="text-xs text-slate-700 space-y-1 list-disc list-inside">
                  {selectedProduct.motivos.map((m, idx) => (
                    <li key={idx} className="leading-relaxed">{m}</li>
                  ))}
                </ul>
              </div>

              {/* Comparativa de Saldos */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
                  Comparación Numérica entre Capas
                </h4>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 rounded-lg border border-slate-200 bg-white">
                    <div className="text-xs text-slate-400">Producto.stock</div>
                    <div className="text-lg font-bold font-mono text-slate-800 mt-1">
                      {selectedProduct.stockProducto ?? 'NULL'}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">Tipo: {selectedProduct.stockProductoType}</div>
                  </div>
                  <div className="p-3 rounded-lg border border-slate-200 bg-white">
                    <div className="text-xs text-slate-400">Suma Bodegas</div>
                    <div className="text-lg font-bold font-mono text-slate-800 mt-1">
                      {selectedProduct.stockBodegasTotal}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">{selectedProduct.bodegas.length} bodegas</div>
                  </div>
                  <div className="p-3 rounded-lg border border-slate-200 bg-white">
                    <div className="text-xs text-slate-400">Suma Sucursales</div>
                    <div className="text-lg font-bold font-mono text-slate-800 mt-1">
                      {selectedProduct.stockSucursalesTotal}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">{selectedProduct.sucursales.length} sucursales</div>
                  </div>
                </div>
              </div>

              {/* Desglose de Bodegas */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                  <Warehouse className="w-4 h-4 text-slate-400" />
                  Existencias por Bodega ({selectedProduct.bodegas.length})
                </h4>
                {selectedProduct.bodegas.length === 0 ? (
                  <div className="text-xs text-amber-700 bg-amber-50 p-3 rounded-lg border border-amber-200">
                    ⚠️ Este producto no tiene ningún registro en WarehouseStock.
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-lg overflow-hidden text-xs">
                    <table className="w-full">
                      <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                        <tr>
                          <th className="py-2 px-3 text-left">Bodega</th>
                          <th className="py-2 px-3 text-left">Sucursal Asignada</th>
                          <th className="py-2 px-3 text-right">Cantidad</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedProduct.bodegas.map((b) => (
                          <tr key={b.warehouseId}>
                            <td className="py-2 px-3 font-medium text-slate-800">{b.warehouseNombre}</td>
                            <td className="py-2 px-3 text-slate-500">{b.branchNombre || 'Sin Sucursal'}</td>
                            <td className="py-2 px-3 text-right font-mono font-semibold text-slate-800">{b.quantity}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Información de UOM y Costeo */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1.5">
                  <div className="text-xs font-semibold text-slate-600">Unidad de Medida (UOM)</div>
                  <div className="text-xs text-slate-700">
                    Base: <span className="font-semibold">{selectedProduct.unidadMedidaBase || 'Sin asignar'}</span>
                  </div>
                  <div className="text-xs text-slate-700">
                    Estado: <span className="font-semibold text-amber-700">{selectedProduct.uomStatus}</span>
                  </div>
                  <div className="text-xs text-slate-500">
                    Densidad: {selectedProduct.densidadGPerMl ? `${selectedProduct.densidadGPerMl} g/ml` : 'No configurada'}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1.5">
                  <div className="text-xs font-semibold text-slate-600">Valoración y Costo PMP</div>
                  <div className="text-xs text-slate-700">
                    Costo: <span className="font-semibold">{selectedProduct.costLabel}</span>
                  </div>
                  <div className="text-xs text-slate-700">
                    Estado Costo: <span className="font-semibold text-slate-700">{selectedProduct.costStatus}</span>
                  </div>
                  <div className="text-xs text-slate-500">
                    Origen: {selectedProduct.costSource || 'Sin registro previo'}
                  </div>
                </div>
              </div>

              {/* Resumen Kardex */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                  <History className="w-4 h-4 text-slate-400" />
                  Kardex de Movimientos
                </h4>
                <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200 flex justify-between items-center">
                  <div>
                    Movimientos registrados: <span className="font-bold text-slate-800">{selectedProduct.kardex.movementCount}</span>
                    {selectedProduct.kardex.lastMovementType && (
                      <span className="text-slate-500 ml-2">(Último: {selectedProduct.kardex.lastMovementType})</span>
                    )}
                  </div>
                  <div>
                    Saldo acumulado: <span className="font-mono font-bold text-slate-800">{selectedProduct.kardex.saldoKardex ?? 'N/A'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                onClick={() => setSelectedProduct(null)}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-slate-200 text-slate-700 hover:bg-slate-300 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
