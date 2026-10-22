'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Truck, Search, RefreshCw, Lock, Unlock, X, Building2, Phone, FileText, ExternalLink,
  CheckCircle2, Clock, AlertTriangle, PackageCheck, Bike, Car, Footprints, ShieldAlert, Mail, IdCard, MapPin,
} from 'lucide-react';

type Status = 'ACTIVO' | 'EN_REVISION' | 'INVITADO' | 'PAUSADO' | 'RECHAZADO' | 'BLOQUEADO';
type LocalGroup = 'ACTIVO' | 'POR_REVISAR' | 'INVITADO' | 'PAUSADO' | 'RECHAZADO' | 'BLOQUEADO';

interface Driver {
  key: string;
  name: string;
  phone: string;
  email: string;
  documento: string;
  tipoVehiculo: string;
  vehiculo: string;
  placa: string;
  ciudad: string;
  selfieUrl: string | null;
  status: Status;
  motivoBloqueo: string | null;
  disponibleRed: boolean;
  creadoEn: string;
  entregas: number;
  docsCount: number;
  documentos: Record<string, string | null>;
  negocios: {
    resourceId: string;
    negocioId: string;
    nombre: string;
    slug: string | null;
    logoUrl: string | null;
    estado: LocalGroup;
    origen: string;
    entregas: number;
    desde: string;
  }[];
}

const STATUS: Record<Status, { label: string; cls: string; dot: string }> = {
  ACTIVO: { label: 'Activo', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200', dot: 'bg-emerald-500' },
  EN_REVISION: { label: 'En revisión', cls: 'bg-amber-50 text-amber-700 ring-amber-200', dot: 'bg-amber-500' },
  INVITADO: { label: 'Invitado', cls: 'bg-sky-50 text-sky-700 ring-sky-200', dot: 'bg-sky-500' },
  PAUSADO: { label: 'Pausado', cls: 'bg-slate-100 text-slate-600 ring-slate-200', dot: 'bg-slate-400' },
  RECHAZADO: { label: 'Por corregir', cls: 'bg-orange-50 text-orange-700 ring-orange-200', dot: 'bg-orange-500' },
  BLOQUEADO: { label: 'Bloqueado', cls: 'bg-rose-50 text-rose-700 ring-rose-200', dot: 'bg-rose-500' },
};

const LOCAL: Record<LocalGroup, string> = {
  ACTIVO: 'Activo',
  POR_REVISAR: 'Por revisar',
  INVITADO: 'Invitado',
  PAUSADO: 'Pausado',
  RECHAZADO: 'Por corregir',
  BLOQUEADO: 'Bloqueado',
};

const FILTERS: { key: 'ALL' | Status; label: string }[] = [
  { key: 'ALL', label: 'Todos' },
  { key: 'ACTIVO', label: 'Activos' },
  { key: 'EN_REVISION', label: 'En revisión' },
  { key: 'INVITADO', label: 'Invitados' },
  { key: 'BLOQUEADO', label: 'Bloqueados' },
];

const DOCS: { key: string; label: string }[] = [
  { key: 'selfieUrl', label: 'Foto de perfil' },
  { key: 'cedulaFrenteUrl', label: 'Cédula (frente)' },
  { key: 'cedulaReversoUrl', label: 'Cédula (reverso)' },
  { key: 'licenciaUrl', label: 'Licencia' },
  { key: 'matriculaUrl', label: 'Matrícula' },
  { key: 'fotoVehiculoUrl', label: 'Vehículo' },
];

const VEHICLE: Record<string, { label: string; Icon: any }> = {
  MOTO: { label: 'Moto', Icon: Bike },
  BICICLETA: { label: 'Bicicleta', Icon: Bike },
  AUTO: { label: 'Auto', Icon: Car },
  CAMIONETA: { label: 'Camioneta', Icon: Truck },
  A_PIE: { label: 'A pie', Icon: Footprints },
};

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function Avatar({ d, size = 'w-9 h-9' }: { d: Driver; size?: string }) {
  const [err, setErr] = useState(false);
  if (d.selfieUrl && !err) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={d.selfieUrl} alt="" onError={() => setErr(true)} className={`${size} rounded-full object-cover bg-slate-100 shrink-0`} />;
  }
  const initials = d.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  return <div className={`${size} rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center shrink-0`}>{initials}</div>;
}

function Badge({ s }: { s: Status }) {
  const c = STATUS[s];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold ring-1 ${c.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}

const isPdf = (u: string) => /\.pdf($|\?)/i.test(u);

export default function SuperAdminRepartidoresPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<'ALL' | Status>('ALL');
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [blockFor, setBlockFor] = useState<Driver | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/superadmin/drivers', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo cargar');
      setDrivers(data.drivers || []);
      setStats(data.stats || null);
    } catch (e: any) {
      setError(e.message || 'No se pudo cargar la lista de repartidores.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const list = useMemo(() => {
    const t = norm(q.trim());
    const digits = q.replace(/\D/g, '');
    return drivers.filter((d) => {
      if (filter !== 'ALL' && d.status !== filter) return false;
      if (!t) return true;
      return (
        norm(d.name).includes(t) ||
        (digits.length >= 3 && d.phone.replace(/\D/g, '').includes(digits)) ||
        norm(d.documento).includes(t) ||
        norm(d.placa).includes(t) ||
        d.negocios.some((n) => norm(n.nombre).includes(t))
      );
    });
  }, [drivers, q, filter]);

  const open = drivers.find((d) => d.key === openKey) || null;

  const toggleBlock = async () => {
    if (!blockFor) return;
    const blocking = blockFor.status !== 'BLOQUEADO';
    setBusy(true);
    try {
      const res = await fetch('/api/superadmin/drivers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'TOGGLE_GLOBAL_BLOCK',
          driverPhone: blockFor.phone,
          globalStatus: blocking ? 'BLOQUEADO' : 'ACTIVO',
          motivo: reason,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo actualizar');
      setBlockFor(null);
      setReason('');
      await load();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  };

  const countFor = (k: 'ALL' | Status) => (k === 'ALL' ? stats?.total ?? drivers.length : stats?.[k] ?? 0);

  return (
    <div className="space-y-4">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Truck className="w-5 h-5 text-indigo-600" /> Repartidores
          </h1>
          <p className="text-sm text-slate-500">
            Red de repartidores de Citiox. Cada negocio invita y aprueba a los suyos; aquí ves a todos y puedes bloquear a alguien en toda la red.
          </p>
        </div>
        <button
          onClick={load}
          className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Actualizar
        </button>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Repartidores', value: stats?.total ?? '—', Icon: Truck, tone: 'text-indigo-600 bg-indigo-50' },
          { label: 'Activos', value: stats?.ACTIVO ?? '—', Icon: CheckCircle2, tone: 'text-emerald-600 bg-emerald-50' },
          { label: 'Esperan revisión', value: stats?.EN_REVISION ?? '—', Icon: Clock, tone: 'text-amber-600 bg-amber-50' },
          { label: 'Entregas completadas', value: stats?.entregas ?? '—', Icon: PackageCheck, tone: 'text-sky-600 bg-sky-50' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-3 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${s.tone}`}>
              <s.Icon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-lg font-bold text-slate-900 leading-tight">{s.value}</p>
              <p className="text-xs text-slate-500 truncate">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nombre, teléfono, cédula, placa o negocio"
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-sm outline-none focus:border-indigo-400 focus:bg-white"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filter === f.key ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {f.label} <span className="opacity-60">{countFor(f.key)}</span>
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-sm text-rose-700">{error}</div>
      )}

      {/* Lista */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading && !drivers.length ? (
          <div className="p-10 text-center text-sm text-slate-400">Cargando repartidores…</div>
        ) : list.length === 0 ? (
          <div className="p-10 text-center">
            <Truck className="w-8 h-8 mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-semibold text-slate-700">
              {drivers.length ? 'Ningún repartidor coincide con la búsqueda' : 'Todavía no hay repartidores en la red'}
            </p>
            {!drivers.length && (
              <p className="text-xs text-slate-500 mt-1">Aparecerán aquí cuando los negocios inviten a sus repartidores desde su panel.</p>
            )}
          </div>
        ) : (
          <>
            {/* Escritorio */}
            <table className="hidden md:table w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="text-left font-semibold px-4 py-2.5">Repartidor</th>
                  <th className="text-left font-semibold px-3 py-2.5">Vehículo</th>
                  <th className="text-left font-semibold px-3 py-2.5">Negocios</th>
                  <th className="text-right font-semibold px-3 py-2.5">Entregas</th>
                  <th className="text-left font-semibold px-3 py-2.5">Estado</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {list.map((d) => {
                  const V = VEHICLE[d.tipoVehiculo] || VEHICLE.MOTO;
                  return (
                    <tr key={d.key} className="hover:bg-slate-50/70 cursor-pointer" onClick={() => setOpenKey(d.key)}>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <Avatar d={d} />
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900 truncate">{d.name}</p>
                            <p className="text-xs text-slate-500">{d.phone || 'Sin teléfono'}{d.ciudad ? ` · ${d.ciudad}` : ''}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-slate-600">
                        <span className="inline-flex items-center gap-1.5"><V.Icon className="w-3.5 h-3.5 text-slate-400" />{V.label}</span>
                        {d.placa && <span className="ml-1.5 text-xs font-mono text-slate-500">{d.placa}</span>}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex flex-wrap gap-1 max-w-[260px]">
                          {d.negocios.slice(0, 2).map((n) => (
                            <span
                              key={n.resourceId}
                              title={LOCAL[n.estado]}
                              className={`px-1.5 py-0.5 rounded text-[11px] font-medium truncate max-w-[120px] ${
                                n.estado === 'ACTIVO' ? 'bg-slate-100 text-slate-700' : 'bg-amber-50 text-amber-700'
                              }`}
                            >
                              {n.nombre}
                            </span>
                          ))}
                          {d.negocios.length > 2 && <span className="text-[11px] text-slate-500">+{d.negocios.length - 2}</span>}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-right font-semibold text-slate-700">{d.entregas}</td>
                      <td className="px-3 py-2.5"><Badge s={d.status} /></td>
                      <td className="px-4 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="inline-flex gap-1.5">
                          <button
                            onClick={() => setOpenKey(d.key)}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200"
                          >
                            Ver
                          </button>
                          <button
                            onClick={() => { setBlockFor(d); setReason(''); }}
                            title={d.status === 'BLOQUEADO' ? 'Desbloquear' : 'Bloquear en toda la red'}
                            className={`p-1.5 rounded-lg ${
                              d.status === 'BLOQUEADO' ? 'text-emerald-600 hover:bg-emerald-50' : 'text-rose-600 hover:bg-rose-50'
                            }`}
                          >
                            {d.status === 'BLOQUEADO' ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Móvil */}
            <div className="md:hidden divide-y divide-slate-100">
              {list.map((d) => (
                <button key={d.key} onClick={() => setOpenKey(d.key)} className="w-full text-left p-3 flex items-center gap-3 hover:bg-slate-50">
                  <Avatar d={d} size="w-10 h-10" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-sm text-slate-900 truncate">{d.name}</p>
                      <Badge s={d.status} />
                    </div>
                    <p className="text-xs text-slate-500 truncate">
                      {d.phone} · {d.negocios.length} {d.negocios.length === 1 ? 'negocio' : 'negocios'} · {d.entregas} entregas
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Detalle */}
      {mounted && open && createPortal(
        <div className="fixed inset-0 z-[9999] flex justify-end">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setOpenKey(null)} />
          <aside className="relative w-full max-w-lg h-full bg-white shadow-2xl flex flex-col">
            <header className="p-4 border-b border-slate-200 flex items-start gap-3">
              <Avatar d={open} size="w-12 h-12" />
              <div className="flex-1 min-w-0">
                <h2 className="font-bold text-slate-900 truncate">{open.name}</h2>
                <div className="mt-1 flex items-center gap-2 flex-wrap">
                  <Badge s={open.status} />
                  {!open.disponibleRed && <span className="text-[11px] text-slate-500">No acepta nuevos negocios</span>}
                </div>
              </div>
              <button onClick={() => setOpenKey(null)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500" aria-label="Cerrar">
                <X className="w-5 h-5" />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              {open.status === 'BLOQUEADO' && open.motivoBloqueo && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-sm text-rose-800">
                  <p className="font-semibold flex items-center gap-1.5"><ShieldAlert className="w-4 h-4" /> Bloqueado en toda la red</p>
                  <p className="text-xs mt-0.5">{open.motivoBloqueo}</p>
                </div>
              )}

              <section className="grid grid-cols-2 gap-2 text-sm">
                {[
                  { Icon: Phone, label: 'Teléfono', value: open.phone },
                  { Icon: IdCard, label: 'Cédula', value: open.documento },
                  { Icon: Mail, label: 'Correo', value: open.email },
                  { Icon: MapPin, label: 'Ciudad', value: open.ciudad },
                  { Icon: (VEHICLE[open.tipoVehiculo] || VEHICLE.MOTO).Icon, label: 'Vehículo', value: [(VEHICLE[open.tipoVehiculo] || VEHICLE.MOTO).label, open.vehiculo].filter(Boolean).join(' · ') },
                  { Icon: FileText, label: 'Placa', value: open.placa },
                ].map((f) => (
                  <div key={f.label} className="p-2.5 rounded-lg bg-slate-50">
                    <p className="text-[11px] text-slate-500 flex items-center gap-1"><f.Icon className="w-3 h-3" /> {f.label}</p>
                    <p className="font-medium text-slate-800 truncate">{f.value || '—'}</p>
                  </div>
                ))}
              </section>

              <section>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                  Documentos <span className="normal-case font-normal">({open.docsCount} de {DOCS.length})</span>
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {DOCS.map((doc) => {
                    const url = open.documentos[doc.key];
                    return url ? (
                      <a
                        key={doc.key}
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="group rounded-lg border border-slate-200 overflow-hidden hover:border-indigo-300"
                      >
                        {isPdf(url) ? (
                          <div className="aspect-[4/3] bg-slate-50 flex items-center justify-center text-slate-400"><FileText className="w-6 h-6" /></div>
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={url} alt={doc.label} className="aspect-[4/3] w-full object-cover bg-slate-100" />
                        )}
                        <p className="px-2 py-1 text-[11px] font-medium text-slate-600 flex items-center justify-between">
                          {doc.label}
                          <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100" />
                        </p>
                      </a>
                    ) : (
                      <div key={doc.key} className="rounded-lg border border-dashed border-slate-200">
                        <div className="aspect-[4/3] flex items-center justify-center text-[11px] text-slate-400">Sin archivo</div>
                        <p className="px-2 py-1 text-[11px] text-slate-400">{doc.label}</p>
                      </div>
                    );
                  })}
                </div>
              </section>

              <section>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                  Negocios ({open.negocios.length})
                </h3>
                <div className="space-y-1.5">
                  {open.negocios.map((n) => (
                    <div key={n.resourceId} className="flex items-center gap-2.5 p-2 rounded-lg border border-slate-200">
                      {n.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={n.logoUrl} alt="" className="w-8 h-8 rounded-md object-cover bg-slate-100" />
                      ) : (
                        <div className="w-8 h-8 rounded-md bg-slate-100 flex items-center justify-center"><Building2 className="w-4 h-4 text-slate-400" /></div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{n.nombre}</p>
                        <p className="text-[11px] text-slate-500">
                          {n.origen === 'RED_CITIOX' ? 'Llegó por la red Citiox' : 'Invitado por el negocio'} · desde {new Date(n.desde).toLocaleDateString('es-EC', { day: 'numeric', month: 'short', year: 'numeric' })} · {n.entregas} entregas
                        </p>
                      </div>
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                        n.estado === 'ACTIVO' ? 'bg-emerald-50 text-emerald-700' : n.estado === 'BLOQUEADO' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'
                      }`}>
                        {LOCAL[n.estado]}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <footer className="p-4 border-t border-slate-200">
              <button
                onClick={() => { setBlockFor(open); setReason(''); }}
                className={`w-full py-2.5 rounded-lg text-sm font-semibold inline-flex items-center justify-center gap-2 ${
                  open.status === 'BLOQUEADO'
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                    : 'bg-white border border-rose-200 text-rose-700 hover:bg-rose-50'
                }`}
              >
                {open.status === 'BLOQUEADO' ? <><Unlock className="w-4 h-4" /> Desbloquear</> : <><Lock className="w-4 h-4" /> Bloquear en toda la red</>}
              </button>
            </footer>
          </aside>
        </div>,
        document.body
      )}

      {/* Confirmar bloqueo / desbloqueo */}
      {mounted && blockFor && createPortal(
        <div className="fixed inset-0 z-[10000] bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-5 space-y-4">
            {blockFor.status === 'BLOQUEADO' ? (
              <>
                <div>
                  <h3 className="font-bold text-slate-900">¿Desbloquear a {blockFor.name.split(' ')[0]}?</h3>
                  <p className="text-sm text-slate-500 mt-1">
                    Vuelve al estado que tenía en cada negocio antes del bloqueo. No se aprueba en negocios donde no estaba aprobado.
                  </p>
                </div>
              </>
            ) : (
              <>
                <div>
                  <h3 className="font-bold text-slate-900 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600" /> Bloquear a {blockFor.name.split(' ')[0]}
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">
                    Dejará de recibir pedidos en sus {blockFor.negocios.length} {blockFor.negocios.length === 1 ? 'negocio' : 'negocios'} y no aparecerá como recomendado. Podrá entrar a su app y ver el motivo.
                  </p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600">Motivo (lo verá el repartidor)</label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                    autoFocus
                    placeholder="Ej.: documentos alterados, reclamos graves de clientes…"
                    className="mt-1 w-full p-2.5 rounded-lg border border-slate-200 text-sm outline-none focus:border-rose-400"
                  />
                </div>
              </>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => setBlockFor(null)}
                className="flex-1 py-2 rounded-lg border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={toggleBlock}
                disabled={busy || (blockFor.status !== 'BLOQUEADO' && !reason.trim())}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50 ${
                  blockFor.status === 'BLOQUEADO' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {busy ? 'Guardando…' : blockFor.status === 'BLOQUEADO' ? 'Desbloquear' : 'Bloquear'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
