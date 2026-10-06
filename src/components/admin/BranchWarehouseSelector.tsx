'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useBranchWarehouse } from '@/context/BranchWarehouseContext';
import { Store, Warehouse, Globe, ChevronDown, Check, Layers } from 'lucide-react';

interface BranchWarehouseSelectorProps {
  primaryColor?: string;
  userRole?: string;
  allowAllBranches?: boolean;
}

export default function BranchWarehouseSelector({
  primaryColor = '#0ea5e9',
  userRole = 'STAFF',
  allowAllBranches = true
}: BranchWarehouseSelectorProps) {
  const {
    currentBranchId,
    currentWarehouseId,
    currentBranch,
    currentWarehouse,
    branches,
    warehouses,
    isConsolidated,
    setCurrentBranchId,
    setCurrentWarehouseId,
    loading
  } = useBranchWarehouse();

  const [isBranchOpen, setIsBranchOpen] = useState(false);
  const [isWarehouseOpen, setIsWarehouseOpen] = useState(false);

  const branchDropdownRef = useRef<HTMLDivElement>(null);
  const warehouseDropdownRef = useRef<HTMLDivElement>(null);

  const role = (userRole || '').toUpperCase();
  const isPrivileged = role === 'OWNER' || role === 'SUPERADMIN' || role === 'ADMIN';

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (branchDropdownRef.current && !branchDropdownRef.current.contains(e.target as Node)) {
        setIsBranchOpen(false);
      }
      if (warehouseDropdownRef.current && !warehouseDropdownRef.current.contains(e.target as Node)) {
        setIsWarehouseOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 animate-pulse bg-slate-100 rounded-xl h-9 w-full" />
    );
  }

  return (
    <div className="flex flex-col gap-1.5 px-3 py-2 bg-slate-50 border-b border-slate-200/80">
      {/* ── SELECTOR DE SUCURSAL ── */}
      <div className="relative" ref={branchDropdownRef}>
        <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-0.5 flex items-center gap-1">
          <Store size={10} />
          <span>Sucursal de Operación</span>
        </div>
        <button
          type="button"
          onClick={() => {
            setIsBranchOpen(!isBranchOpen);
            setIsWarehouseOpen(false);
          }}
          className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-slate-300 text-slate-800 text-xs font-semibold transition-all shadow-2xs"
        >
          <div className="flex items-center gap-1.5 truncate">
            {isConsolidated ? (
              <>
                <Globe size={13} className="text-indigo-500 shrink-0" />
                <span className="truncate text-indigo-700">Todas las Sucursales</span>
              </>
            ) : (
              <>
                <Store size={13} className="text-slate-500 shrink-0" />
                <span className="truncate">{currentBranch?.name || 'Seleccionar sucursal'}</span>
              </>
            )}
          </div>
          <ChevronDown size={13} className="text-slate-400 shrink-0 ml-1" />
        </button>

        {isBranchOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1 max-h-56 overflow-y-auto">
            {isPrivileged && allowAllBranches && (
              <button
                type="button"
                onClick={() => {
                  setCurrentBranchId('ALL');
                  setIsBranchOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left hover:bg-slate-50 transition-colors ${
                  isConsolidated ? 'bg-indigo-50/70 font-bold text-indigo-700' : 'text-slate-700'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <Globe size={13} className="text-indigo-500 shrink-0" />
                  <span className="truncate">Todas las Sucursales (Consolidado)</span>
                </div>
                {isConsolidated && <Check size={13} className="text-indigo-600 shrink-0" />}
              </button>
            )}

            {branches.map((b) => {
              const isSelected = b.id === currentBranchId;
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => {
                    setCurrentBranchId(b.id);
                    setIsBranchOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left hover:bg-slate-50 transition-colors ${
                    isSelected ? 'bg-sky-50/70 font-bold text-sky-700' : 'text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <Store size={13} className="text-slate-400 shrink-0" />
                    <span className="truncate">{b.name}</span>
                    {b.code && (
                      <span className="text-[10px] text-slate-400 font-mono">[{b.code}]</span>
                    )}
                  </div>
                  {isSelected && <Check size={13} className="text-sky-600 shrink-0" />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── SELECTOR DE BODEGA FÍSICA ── */}
      <div className="relative" ref={warehouseDropdownRef}>
        <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-0.5 flex items-center gap-1">
          <Warehouse size={10} />
          <span>Bodega Física Activa</span>
        </div>
        <button
          type="button"
          disabled={isConsolidated}
          onClick={() => {
            if (!isConsolidated) {
              setIsWarehouseOpen(!isWarehouseOpen);
              setIsBranchOpen(false);
            }
          }}
          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold transition-all shadow-2xs ${
            isConsolidated
              ? 'opacity-60 cursor-not-allowed bg-slate-100 text-slate-400'
              : 'hover:border-slate-300 text-slate-800'
          }`}
        >
          <div className="flex items-center gap-1.5 truncate">
            <Warehouse size={13} className="text-amber-500 shrink-0" />
            <span className="truncate">
              {isConsolidated
                ? 'Consolidado corporativo'
                : currentWarehouse?.name || (warehouses.length === 0 ? 'Sin bodegas físicas' : 'Seleccionar bodega')}
            </span>
          </div>
          {!isConsolidated && <ChevronDown size={13} className="text-slate-400 shrink-0 ml-1" />}
        </button>

        {isWarehouseOpen && !isConsolidated && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1 max-h-56 overflow-y-auto">
            {warehouses.length === 0 ? (
              <div className="px-3 py-2 text-xs text-slate-400 italic text-center">
                No hay bodegas físicas configuradas para esta sucursal
              </div>
            ) : (
              warehouses.map((wh) => {
                const isSelected = wh.id === currentWarehouseId;
                return (
                  <button
                    key={wh.id}
                    type="button"
                    onClick={() => {
                      setCurrentWarehouseId(wh.id);
                      setIsWarehouseOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left hover:bg-slate-50 transition-colors ${
                      isSelected ? 'bg-amber-50/70 font-bold text-amber-800' : 'text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Warehouse size={13} className="text-amber-500 shrink-0" />
                      <span className="truncate">{wh.name}</span>
                      {wh.code && (
                        <span className="text-[10px] text-slate-400 font-mono">[{wh.code}]</span>
                      )}
                    </div>
                    {isSelected && <Check size={13} className="text-amber-600 shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
