'use client';
// src/components/admin/BranchSelector.tsx
// Selector universal de sucursales con aislamiento y soporte para scope ALL en roles autorizados.

import { useState, useEffect, useRef } from 'react';
import { MapPin, Globe, ChevronDown, Check, Plus, Store } from 'lucide-react';
import Link from 'next/link';

interface BranchItem {
  id: string;
  name: string;
  isDefault: boolean;
  active: boolean;
}

interface BranchSelectorProps {
  primaryColor?: string;
  userRole?: string;
}

export default function BranchSelector({
  primaryColor = '#0ea5e9',
  userRole = 'STAFF'
}: BranchSelectorProps) {
  const [branches, setBranches] = useState<BranchItem[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const role = (userRole || '').toUpperCase();
  const isPrivileged = role === 'OWNER' || role === 'SUPERADMIN' || role === 'ADMIN';

  useEffect(() => {
    async function loadBranches() {
      try {
        const res = await fetch('/api/admin/sucursales');
        if (res.ok) {
          const data = await res.json();
          if (data.branches) {
            setBranches(data.branches);

            // Recuperar branch previa guardada en localStorage
            const savedBranch = localStorage.getItem('citiox_current_branch_id');
            const exists = data.branches.some((b: BranchItem) => b.id === savedBranch);

            if (savedBranch === 'ALL' && isPrivileged) {
              setSelectedBranchId('ALL');
            } else if (savedBranch && exists) {
              setSelectedBranchId(savedBranch);
            } else {
              // Seleccionar default o primera
              const def = data.branches.find((b: BranchItem) => b.isDefault) || data.branches[0];
              if (def) {
                setSelectedBranchId(def.id);
                localStorage.setItem('citiox_current_branch_id', def.id);
                document.cookie = `citiox_branch_id=${def.id}; path=/; max-age=2592000; SameSite=Lax`;
              }
            }
          }
        }
      } catch (err) {
        console.error('Error cargando sucursales:', err);
      } finally {
        setLoading(false);
      }
    }

    loadBranches();
  }, [isPrivileged]);

  // Cerrar dropdown al hacer click afuera
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectBranch = (branchId: string) => {
    setSelectedBranchId(branchId);
    setIsOpen(false);
    localStorage.setItem('citiox_current_branch_id', branchId);
    document.cookie = `citiox_branch_id=${branchId}; path=/; max-age=2592000; SameSite=Lax`;
    
    // Notificar a toda la aplicación del cambio de sede
    window.dispatchEvent(new CustomEvent('citiox-branch-changed', { detail: { branchId } }));
    
    // Si la ruta actual es sensible a contexto, refrescar
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="px-3 py-1.5 animate-pulse bg-slate-100 rounded-xl mx-3 my-2 h-9" />
    );
  }

  // Si solo hay 1 sucursal y el usuario no tiene permisos para 'ALL', mostrar badge fijo
  if (branches.length <= 1 && !isPrivileged) {
    const current = branches[0];
    return (
      <div className="mx-3 my-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center gap-2 text-xs font-semibold text-slate-700">
        <MapPin size={14} className="text-slate-400 shrink-0" />
        <span className="truncate">{current?.name || 'Sucursal Principal'}</span>
      </div>
    );
  }

  const currentBranch = branches.find(b => b.id === selectedBranchId);
  const displayName = selectedBranchId === 'ALL' 
    ? 'Todas las sedes' 
    : currentBranch?.name || 'Seleccionar sede';

  return (
    <div className="relative mx-3 my-2" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-white border border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/80 shadow-2xs transition-all text-xs font-semibold text-slate-800"
      >
        <div className="flex items-center gap-2 min-w-0">
          {selectedBranchId === 'ALL' ? (
            <Globe size={14} style={{ color: primaryColor }} className="shrink-0" />
          ) : (
            <MapPin size={14} style={{ color: primaryColor }} className="shrink-0" />
          )}
          <span className="truncate">{displayName}</span>
        </div>
        <ChevronDown size={14} className={`text-slate-400 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white rounded-xl border border-slate-200 shadow-lg py-1.5 overflow-hidden animate-in fade-in-50 zoom-in-95 duration-100">
          <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Sucursal de Operación
          </div>

          {/* Opción ALL solo para autorizados */}
          {isPrivileged && (
            <button
              type="button"
              onClick={() => handleSelectBranch('ALL')}
              className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left hover:bg-slate-50 transition-colors ${
                selectedBranchId === 'ALL' ? 'font-bold text-slate-900 bg-slate-50/70' : 'text-slate-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <Globe size={13} className="text-slate-400" />
                <span>🌐 Todas las sucursales (Consolidado)</span>
              </div>
              {selectedBranchId === 'ALL' && <Check size={14} style={{ color: primaryColor }} />}
            </button>
          )}

          {/* Listado de sucursales */}
          <div className="max-h-56 overflow-y-auto py-1">
            {branches.map(b => {
              const isSelected = selectedBranchId === b.id;
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => handleSelectBranch(b.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left hover:bg-slate-50 transition-colors ${
                    isSelected ? 'font-bold text-slate-900 bg-slate-50/70' : 'text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <MapPin size={13} className={isSelected ? 'text-slate-900' : 'text-slate-400'} />
                    <span className="truncate">{b.name}</span>
                    {b.isDefault && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-500 font-medium shrink-0">
                        Matriz
                      </span>
                    )}
                  </div>
                  {isSelected && <Check size={14} style={{ color: primaryColor }} />}
                </button>
              );
            })}
          </div>

          {/* Enlace para administrar sedes */}
          {isPrivileged && (
            <div className="pt-1.5 mt-1 border-t border-slate-100 px-1">
              <Link
                href="/admin/sucursales"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              >
                <Store size={13} className="text-slate-400" />
                <span>Gestionar Sedes & Límites</span>
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
