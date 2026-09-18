'use client';
// src/app/admin/sucursales/page.tsx
// Gestión Multi-Sucursal Canónica de Citiox con control estricto de límites por plan comercial.

import { useState, useEffect } from 'react';
import { 
  Store, Plus, MapPin, Phone, Mail, Building, 
  CheckCircle2, XCircle, AlertTriangle, Lock, 
  ChevronRight, RefreshCw, ShieldAlert, Sparkles, Check,
  Car, Bus, ShieldCheck, Accessibility, Clock, ExternalLink
} from 'lucide-react';
import Link from 'next/link';
import ImageUploader from '@/components/ui/ImageUploader';

interface BranchItem {
  id: string;
  name: string;
  code?: string | null;
  address?: string | null;
  city?: string | null;
  phone?: string | null;
  email?: string | null;
  mapUrl?: string | null;
  imagenUrl?: string | null;
  horario?: string | null;
  tieneParqueadero?: boolean;
  tieneTransporte?: boolean;
  tieneZonaSegura?: boolean;
  tieneAccesoFacil?: boolean;
  isDefault: boolean;
  active: boolean;
  settings?: any;
  cashRegisters?: Array<{ id: string; name: string; code?: string | null }>;
  _count?: { staff: number; branchAccess: number };
}

interface PlanLimitsInfo {
  active: number;
  limit: number;
  remaining: number;
  allowed: boolean;
  planName: string;
}

export default function SucursalesAdminPage() {
  const [branches, setBranches] = useState<BranchItem[]>([]);
  const [limits, setLimits] = useState<PlanLimitsInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<BranchItem | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    address: '',
    city: '',
    phone: '',
    email: '',
    mapUrl: '',
    horario: '',
    imagenUrl: '',
    tieneParqueadero: false,
    tieneTransporte: false,
    tieneZonaSegura: false,
    tieneAccesoFacil: false,
    isDefault: false
  });

  const loadData = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await fetch('/api/admin/sucursales?includeInactive=true');
      if (!res.ok) {
        throw new Error('No se pudieron cargar las sucursales');
      }
      const data = await res.json();
      setBranches(data.branches || []);
      setLimits(data.limits || null);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al obtener sucursales');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenCreate = () => {
    if (limits && !limits.allowed && limits.limit !== -1) {
      setErrorMsg(`Has alcanzado el límite de ${limits.limit} sucursales activas permitidas en tu plan.`);
      return;
    }
    setEditingBranch(null);
    setFormData({
      name: '',
      code: '',
      address: '',
      city: '',
      phone: '',
      email: '',
      mapUrl: '',
      horario: '',
      imagenUrl: '',
      tieneParqueadero: false,
      tieneTransporte: false,
      tieneZonaSegura: false,
      tieneAccesoFacil: false,
      isDefault: branches.length === 0
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (b: BranchItem) => {
    setEditingBranch(b);
    const settings = ((b as any).settings && typeof (b as any).settings === 'object') ? (b as any).settings : {};
    setFormData({
      name: b.name,
      code: b.code || '',
      address: b.address || '',
      city: b.city || settings.city || '',
      phone: b.phone || '',
      email: b.email || settings.email || '',
      mapUrl: b.mapUrl || settings.mapUrl || '',
      horario: b.horario || settings.horario || '',
      imagenUrl: b.imagenUrl || settings.imagenUrl || '',
      tieneParqueadero: b.tieneParqueadero ?? settings.tieneParqueadero ?? false,
      tieneTransporte: b.tieneTransporte ?? settings.tieneTransporte ?? false,
      tieneZonaSegura: b.tieneZonaSegura ?? settings.tieneZonaSegura ?? false,
      tieneAccesoFacil: b.tieneAccesoFacil ?? settings.tieneAccesoFacil ?? false,
      isDefault: b.isDefault || (b as any).isMain || false
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setErrorMsg('El nombre de la sucursal es obligatorio');
      return;
    }

    try {
      setSaving(true);
      setErrorMsg(null);

      const url = '/api/admin/sucursales';
      const method = editingBranch ? 'PUT' : 'POST';
      const payload = editingBranch 
        ? { branchId: editingBranch.id, ...formData }
        : formData;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al guardar la sucursal');
      }

      setSuccessMsg(editingBranch ? 'Sucursal actualizada con éxito' : 'Sucursal creada con éxito');
      setIsModalOpen(false);
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error en la operación');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (b: BranchItem) => {
    try {
      setSaving(true);
      setErrorMsg(null);

      const res = await fetch('/api/admin/sucursales', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branchId: b.id,
          active: !b.active
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'No se pudo cambiar el estado de la sucursal');
      }

      setSuccessMsg(`Sucursal "${b.name}" ${!b.active ? 'activada' : 'desactivada'} exitosamente`);
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al cambiar estado');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Encabezado Principal */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Store className="w-7 h-7 text-indigo-600" />
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Gestión de Sucursales
            </h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Administra tus sedes físicas, cajas registradoras y límites operativos de tu negocio.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
            title="Recargar"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleOpenCreate}
            disabled={limits ? (!limits.allowed && limits.limit !== -1) : false}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold text-sm shadow-sm transition-all cursor-pointer"
          >
            <Plus size={16} />
            <span>Nueva Sucursal</span>
          </button>
        </div>
      </div>

      {/* Banner de Estado de Plan y Límites */}
      {limits && (
        <div className={`p-5 rounded-2xl border transition-all ${
          !limits.allowed && limits.limit !== -1
            ? 'bg-amber-50/70 border-amber-200 text-amber-900'
            : 'bg-white border-slate-200/80 shadow-xs'
        }`}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                  Plan {limits.planName}
                </span>
                {!limits.allowed && limits.limit !== -1 && (
                  <span className="flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                    <AlertTriangle size={12} /> Límite alcanzado
                  </span>
                )}
              </div>
              <p className="text-sm font-semibold text-slate-800">
                Uso actual: <span className="font-black text-indigo-600">{limits.active}</span> de{' '}
                <span className="font-black">{limits.limit === -1 || limits.limit >= 999 ? 'Ilimitadas' : limits.limit}</span> sucursales activas utilizadas.
              </p>
            </div>

            {(!limits.allowed && limits.limit !== -1) ? (
              <Link
                href="/admin/plan"
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shrink-0 transition-colors shadow-xs"
              >
                <Sparkles size={14} />
                <span>Ampliar Sucursales / Add-on</span>
              </Link>
            ) : (
              <div className="text-xs text-slate-400 font-medium">
                {limits.remaining > 0 ? `Tienes ${limits.remaining} sucursal(es) disponible(s) para activar.` : 'Cupo completo.'}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Alertas de Notificación */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert size={16} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-red-500 hover:text-red-800 font-bold">×</button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-500 hover:text-emerald-800 font-bold">×</button>
        </div>
      )}

      {/* Grilla de Sucursales */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-44 rounded-2xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : branches.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 p-8 space-y-4">
          <Store className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">No hay sucursales registradas</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Configura tu sede principal para habilitar la operación multi-sucursal y los puntos de venta.
          </p>
          <button
            onClick={handleOpenCreate}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs"
          >
            Crear Sucursal Matriz
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {branches.map((b) => (
            <div
              key={b.id}
              className={`rounded-2xl border bg-white overflow-hidden transition-all shadow-xs relative flex flex-col justify-between ${
                !b.active ? 'opacity-70 bg-slate-50/50 border-dashed border-slate-300' : 'border-slate-200/80 hover:border-slate-300 hover:shadow-md'
              }`}
            >
              {/* Fachada si existe */}
              {b.imagenUrl ? (
                <div className="w-full h-36 relative overflow-hidden bg-slate-100 border-b border-slate-100">
                  <img 
                    src={b.imagenUrl} 
                    alt={b.name}
                    className="w-full h-full object-cover"
                  />
                  {b.isDefault && (
                    <span className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-md bg-indigo-600/90 backdrop-blur-xs text-white font-black text-[10px] shadow-sm">
                      Matriz
                    </span>
                  )}
                </div>
              ) : null}

              <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-900 text-base">
                          {b.name}
                        </h3>
                        {!b.imagenUrl && b.isDefault && (
                          <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-extrabold text-[10px] border border-indigo-200">
                            Matriz
                          </span>
                        )}
                      </div>
                      {b.code && (
                        <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                          CÓDIGO: {b.code}
                        </p>
                      )}
                    </div>

                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      b.active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500 border border-slate-200'
                    }`}>
                      {b.active ? 'Activa' : 'Inactiva'}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-600">
                    {b.address && (
                      <div className="flex items-center gap-2 truncate">
                        <MapPin size={13} className="text-slate-400 shrink-0" />
                        <span className="truncate">{b.address}{b.city ? `, ${b.city}` : ''}</span>
                      </div>
                    )}
                    {b.phone && (
                      <div className="flex items-center gap-2 truncate">
                        <Phone size={13} className="text-slate-400 shrink-0" />
                        <span className="truncate">{b.phone}</span>
                      </div>
                    )}
                    {b.horario && (
                      <div className="flex items-center gap-2 truncate text-slate-500 font-medium">
                        <Clock size={13} className="text-slate-400 shrink-0" />
                        <span className="truncate">{b.horario}</span>
                      </div>
                    )}
                    {b.email && (
                      <div className="flex items-center gap-2 truncate">
                        <Mail size={13} className="text-slate-400 shrink-0" />
                        <span className="truncate">{b.email}</span>
                      </div>
                    )}
                    {b.mapUrl && (
                      <div className="pt-0.5">
                        <a 
                          href={b.mapUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold"
                        >
                          <ExternalLink size={11} /> Ver en Google Maps
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Chips de características de la sucursal */}
                  {(b.tieneParqueadero || b.tieneTransporte || b.tieneZonaSegura || b.tieneAccesoFacil) && (
                    <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-100">
                      {b.tieneParqueadero && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-pink-50 text-pink-600 text-[10px] font-bold">
                          <Car size={10} /> Parqueadero
                        </span>
                      )}
                      {b.tieneTransporte && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-bold">
                          <Bus size={10} /> Transporte
                        </span>
                      )}
                      {b.tieneZonaSegura && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-bold">
                          <ShieldCheck size={10} /> Segura
                        </span>
                      )}
                      {b.tieneAccesoFacil && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 text-[10px] font-bold">
                          <Accessibility size={10} /> Acceso Fácil
                        </span>
                      )}
                    </div>
                  )}

                  {b.cashRegisters && b.cashRegisters.length > 0 && (
                    <div className="pt-2 border-t border-slate-100">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                        Puntos de Cobro / Cajas
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {b.cashRegisters.map((cr) => (
                          <span key={cr.id} className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-medium">
                            {cr.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Botones de acción */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(b)}
                    className="text-xs font-bold text-slate-700 hover:text-indigo-600 transition-colors"
                  >
                    Editar Datos
                  </button>

                  {!b.isDefault && (
                    <button
                      type="button"
                      onClick={() => handleToggleActive(b)}
                      disabled={saving}
                      className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors ${
                        b.active
                          ? 'text-red-600 hover:bg-red-50'
                          : 'text-emerald-700 hover:bg-emerald-50'
                      }`}
                    >
                      {b.active ? 'Desactivar' : 'Activar Sede'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Crear / Editar Sucursal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-2xl max-h-[92vh] flex flex-col bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <h3 className="font-bold text-slate-900 text-base">
                {editingBranch ? 'Editar Sucursal' : 'Nueva Sucursal'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nombre de la Sucursal *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Sede Norte / Sucursal Centro"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Código Interno
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. SEDE-02"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Ciudad
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Quito / Guayaquil"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Dirección
                </label>
                <input
                  type="text"
                  placeholder="Ej. Av. Amazonas y República"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Teléfono de Contacto
                  </label>
                  <input
                    type="text"
                    placeholder="099 123 4567"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Horario de Atención
                  </label>
                  <input
                    type="text"
                    placeholder="Lun - Dom 8:00 AM - 11:00 PM"
                    value={formData.horario}
                    onChange={(e) => setFormData({ ...formData, horario: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Email de la Sucursal
                  </label>
                  <input
                    type="email"
                    placeholder="norte@minegocio.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Link Google Maps (o iframe embed)
                  </label>
                  <input
                    type="text"
                    placeholder="https://maps.app.goo.gl/... o iframe"
                    value={formData.mapUrl}
                    onChange={(e) => setFormData({ ...formData, mapUrl: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Imagen de la Fachada */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Imagen de la Fachada / Local (Opcional)
                </label>
                <ImageUploader 
                  category="page"
                  currentUrl={formData.imagenUrl}
                  onUploadSuccess={(media) => setFormData({ ...formData, imagenUrl: media.url })}
                  onRemove={() => setFormData({ ...formData, imagenUrl: '' })}
                  label="Subir foto de la sucursal"
                  aspect="landscape"
                />
              </div>

              {/* CARACTERÍSTICAS DE LA UBICACIÓN */}
              <div className="space-y-3 pt-2">
                <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider block">
                  Características de la Ubicación
                </label>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Toggle Parqueadero */}
                  <div className="flex items-center justify-between p-3.5 bg-white rounded-2xl border border-slate-200 shadow-xs">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-pink-50 text-pink-500 rounded-xl border border-pink-100/60">
                        <Car size={16} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800">Parqueadero Disponible</p>
                        <p className="text-[10px] text-slate-400 font-medium">Estacionamiento propio o convenio</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, tieneParqueadero: !formData.tieneParqueadero })}
                      className={`w-11 h-6 rounded-full transition-all duration-300 relative border border-transparent ${formData.tieneParqueadero ? 'bg-pink-500' : 'bg-gray-200'}`}
                    >
                      <div className={`absolute top-0.5 w-4.5 h-4.5 bg-white rounded-full transition-all duration-300 shadow-xs ${formData.tieneParqueadero ? 'left-5.5' : 'left-0.5'}`} />
                    </button>
                  </div>

                  {/* Toggle Transporte */}
                  <div className="flex items-center justify-between p-3.5 bg-white rounded-2xl border border-slate-200 shadow-xs">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-indigo-50 text-indigo-500 rounded-xl border border-indigo-100/60">
                        <Bus size={16} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800">Transporte Cercano</p>
                        <p className="text-[10px] text-slate-400 font-medium">Paradas de bus o metro a pocos metros</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, tieneTransporte: !formData.tieneTransporte })}
                      className={`w-11 h-6 rounded-full transition-all duration-300 relative border border-transparent ${formData.tieneTransporte ? 'bg-pink-500' : 'bg-gray-200'}`}
                    >
                      <div className={`absolute top-0.5 w-4.5 h-4.5 bg-white rounded-full transition-all duration-300 shadow-xs ${formData.tieneTransporte ? 'left-5.5' : 'left-0.5'}`} />
                    </button>
                  </div>

                  {/* Toggle Zona Segura */}
                  <div className="flex items-center justify-between p-3.5 bg-white rounded-2xl border border-slate-200 shadow-xs">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-50 text-emerald-500 rounded-xl border border-emerald-100/60">
                        <ShieldCheck size={16} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800">Zona Segura</p>
                        <p className="text-[10px] text-slate-400 font-medium">Sector vigilado, seguro y bien iluminado</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, tieneZonaSegura: !formData.tieneZonaSegura })}
                      className={`w-11 h-6 rounded-full transition-all duration-300 relative border border-transparent ${formData.tieneZonaSegura ? 'bg-pink-500' : 'bg-gray-200'}`}
                    >
                      <div className={`absolute top-0.5 w-4.5 h-4.5 bg-white rounded-full transition-all duration-300 shadow-xs ${formData.tieneZonaSegura ? 'left-5.5' : 'left-0.5'}`} />
                    </button>
                  </div>

                  {/* Toggle Acceso Fácil */}
                  <div className="flex items-center justify-between p-3.5 bg-white rounded-2xl border border-slate-200 shadow-xs">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-amber-50 text-amber-500 rounded-xl border border-amber-100/60">
                        <Accessibility size={16} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800">Acceso Fácil</p>
                        <p className="text-[10px] text-slate-400 font-medium">Rampas de acceso, planta baja o ascensor</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, tieneAccesoFacil: !formData.tieneAccesoFacil })}
                      className={`w-11 h-6 rounded-full transition-all duration-300 relative border border-transparent ${formData.tieneAccesoFacil ? 'bg-pink-500' : 'bg-gray-200'}`}
                    >
                      <div className={`absolute top-0.5 w-4.5 h-4.5 bg-white rounded-full transition-all duration-300 shadow-xs ${formData.tieneAccesoFacil ? 'left-5.5' : 'left-0.5'}`} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isDefault}
                    onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-xs font-medium text-slate-700">
                    Establecer como Sucursal Principal / Matriz del negocio
                  </span>
                </label>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white text-xs font-bold shadow-xs transition-colors"
                >
                  {saving ? 'Guardando...' : editingBranch ? 'Actualizar Sucursal' : 'Crear Sucursal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
