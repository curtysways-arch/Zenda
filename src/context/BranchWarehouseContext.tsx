'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export interface BranchItem {
  id: string;
  name: string;
  code?: string | null;
  isDefault: boolean;
  active: boolean;
}

export interface WarehouseItem {
  id: string;
  name: string;
  code?: string | null;
  branchId?: string | null;
  type?: string | null;
  isDefault: boolean;
  active: boolean;
  branch?: BranchItem | null;
}

interface BranchWarehouseContextType {
  currentBranchId: string;
  currentWarehouseId: string | null;
  currentBranch: BranchItem | null;
  currentWarehouse: WarehouseItem | null;
  branches: BranchItem[];
  warehouses: WarehouseItem[];
  isConsolidated: boolean;
  setCurrentBranchId: (branchId: string) => void;
  setCurrentWarehouseId: (warehouseId: string | null) => void;
  refreshData: () => Promise<void>;
  loading: boolean;
}

const BranchWarehouseContext = createContext<BranchWarehouseContextType | undefined>(undefined);

export function BranchWarehouseProvider({ children }: { children: React.ReactNode }) {
  const [branches, setBranches] = useState<BranchItem[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseItem[]>([]);
  const [currentBranchId, setCurrentBranchIdState] = useState<string>('');
  const [currentWarehouseId, setCurrentWarehouseIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchBranches = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/sucursales');
      if (res.ok) {
        const data = await res.json();
        return (data.branches || []) as BranchItem[];
      }
    } catch (e) {
      console.error('[BranchWarehouseContext] Error al cargar sucursales:', e);
    }
    return [];
  }, []);

  const fetchWarehouses = useCallback(async (branchId?: string) => {
    try {
      const url = branchId && branchId !== 'ALL'
        ? `/api/admin/bodegas?branchId=${branchId}&excludeVirtual=true`
        : `/api/admin/bodegas?excludeVirtual=true`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        return (data.warehouses || []) as WarehouseItem[];
      }
    } catch (e) {
      console.error('[BranchWarehouseContext] Error al cargar bodegas:', e);
    }
    return [];
  }, []);

  const refreshData = useCallback(async () => {
    setLoading(true);
    const loadedBranches = await fetchBranches();
    setBranches(loadedBranches);

    const savedBranch = typeof window !== 'undefined' ? localStorage.getItem('citiox_current_branch_id') : null;
    let selectedBranch = savedBranch || '';

    if (!selectedBranch || (!loadedBranches.some(b => b.id === selectedBranch) && selectedBranch !== 'ALL')) {
      const def = loadedBranches.find(b => b.isDefault) || loadedBranches[0];
      selectedBranch = def ? def.id : 'ALL';
    }

    setCurrentBranchIdState(selectedBranch);

    const loadedWarehouses = await fetchWarehouses(selectedBranch);
    setWarehouses(loadedWarehouses);

    const savedWarehouse = typeof window !== 'undefined' ? localStorage.getItem('citiox_current_warehouse_id') : null;
    let selectedWh: string | null = null;

    if (savedWarehouse && loadedWarehouses.some(w => w.id === savedWarehouse)) {
      selectedWh = savedWarehouse;
    } else if (loadedWarehouses.length > 0) {
      const defWh = loadedWarehouses.find(w => w.isDefault) || loadedWarehouses[0];
      selectedWh = defWh ? defWh.id : null;
    }

    setCurrentWarehouseIdState(selectedWh);
    setLoading(false);
  }, [fetchBranches, fetchWarehouses]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const setCurrentBranchId = (branchId: string) => {
    setCurrentBranchIdState(branchId);
    if (typeof window !== 'undefined') {
      localStorage.setItem('citiox_current_branch_id', branchId);
      document.cookie = `citiox_branch_id=${branchId}; path=/; max-age=2592000; SameSite=Lax`;
    }

    // Al cambiar la sucursal, recargar las bodegas correspondientes
    fetchWarehouses(branchId).then((whs) => {
      setWarehouses(whs);
      const defWh = whs.find(w => w.isDefault) || whs[0];
      const newWhId = defWh ? defWh.id : null;
      setCurrentWarehouseIdState(newWhId);
      if (typeof window !== 'undefined') {
        if (newWhId) {
          localStorage.setItem('citiox_current_warehouse_id', newWhId);
          document.cookie = `citiox_warehouse_id=${newWhId}; path=/; max-age=2592000; SameSite=Lax`;
        } else {
          localStorage.removeItem('citiox_current_warehouse_id');
          document.cookie = `citiox_warehouse_id=; path=/; max-age=0; SameSite=Lax`;
        }
        window.dispatchEvent(new CustomEvent('citiox-branch-warehouse-changed', {
          detail: { branchId, warehouseId: newWhId }
        }));
      }
    });
  };

  const setCurrentWarehouseId = (warehouseId: string | null) => {
    setCurrentWarehouseIdState(warehouseId);
    if (typeof window !== 'undefined') {
      if (warehouseId) {
        localStorage.setItem('citiox_current_warehouse_id', warehouseId);
        document.cookie = `citiox_warehouse_id=${warehouseId}; path=/; max-age=2592000; SameSite=Lax`;
      } else {
        localStorage.removeItem('citiox_current_warehouse_id');
        document.cookie = `citiox_warehouse_id=; path=/; max-age=0; SameSite=Lax`;
      }
      window.dispatchEvent(new CustomEvent('citiox-branch-warehouse-changed', {
        detail: { branchId: currentBranchId, warehouseId }
      }));
    }
  };

  const currentBranch = branches.find(b => b.id === currentBranchId) || null;
  const currentWarehouse = warehouses.find(w => w.id === currentWarehouseId) || null;
  const isConsolidated = currentBranchId === 'ALL';

  return (
    <BranchWarehouseContext.Provider
      value={{
        currentBranchId,
        currentWarehouseId,
        currentBranch,
        currentWarehouse,
        branches,
        warehouses,
        isConsolidated,
        setCurrentBranchId,
        setCurrentWarehouseId,
        refreshData,
        loading
      }}
    >
      {children}
    </BranchWarehouseContext.Provider>
  );
}

export function useBranchWarehouse() {
  const context = useContext(BranchWarehouseContext);
  if (!context) {
    throw new Error('useBranchWarehouse debe ser usado dentro de un BranchWarehouseProvider');
  }
  return context;
}
