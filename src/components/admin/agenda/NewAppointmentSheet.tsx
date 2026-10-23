'use client';
/**
 * Nueva cita desde el celular, en una sola hoja:
 * cliente (busca uno que ya vino o escribe uno nuevo) → servicio → profesional → día → hora libre → nota.
 */
import { useEffect, useMemo, useState } from 'react';
import { addDays, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Search, Check, Loader2, MessageCircle, AlertTriangle, UserRound, X, Plus } from 'lucide-react';
import { Cita, Sheet, field, inkOn, hora12, keyToDate, localKey, money, toMin, waLink } from './agendaShared';
import { DayPicker, SlotGrid, slotsDelDia } from './AppointmentManager';

type Svc = { id: string; nombre: string; precio: number; duracion: number };
type Cli = { id: string; nombre: string; telefono: string };

export default function NewAppointmentSheet({ primaryColor, slug, dia: diaInicial, allCitas, horario, negocioNombre, onClose, onCreated }: {
  primaryColor: string; slug: string; dia?: string; allCitas: Cita[];
  horario?: { apertura?: string | null; cierre?: string | null }; negocioNombre?: string;
  onClose: () => void; onCreated: (mensaje: string) => void;
}) {
  const ink = inkOn(primaryColor);
  const [services, setServices] = useState<Svc[]>([]);
  const [staff, setStaff] = useState<{ id: string; name: string }[]>([]);
  const [clientes, setClientes] = useState<Cli[]>([]);
  const [loading, setLoading] = useState(true);

  const [q, setQ] = useState('');
  const [cliente, setCliente] = useState<Cli | null>(null);
  const [nuevo, setNuevo] = useState({ nombre: '', telefono: '' });
  const [modoNuevo, setModoNuevo] = useState(false);
  const [serviceId, setServiceId] = useState('');
  const [staffId, setStaffId] = useState('');
  const hoy = localKey(new Date());
  // Si ya cerró el local por hoy, arranca en mañana para no mostrar un día sin horas.
  const yaCerro = (() => { const n = new Date(); return n.getHours() * 60 + n.getMinutes() >= toMin(horario?.cierre || '20:00') - 30; })();
  const primerDia = yaCerro ? localKey(addDays(new Date(), 1)) : hoy;
  const [dia, setDia] = useState(diaInicial && diaInicial >= primerDia ? diaInicial : primerDia);
  const [hora, setHora] = useState('');
  const [nota, setNota] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [hecho, setHecho] = useState<{ nombre: string; telefono: string; link: string | null; resumen: string } | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/services').then((r) => (r.ok ? r.json() : [])).catch(() => []),
      fetch('/api/staff').then((r) => (r.ok ? r.json() : [])).catch(() => []),
      fetch('/api/clientes').then((r) => (r.ok ? r.json() : [])).catch(() => []),
    ]).then(([s, st, cl]) => {
      const svcs: Svc[] = (Array.isArray(s) ? s : []).filter((x: any) => x.estaActivo !== false && x.activo !== false)
        .map((x: any) => ({ id: x.id, nombre: x.nombre, precio: Number(x.precio) || 0, duracion: Number(x.duracion) || 60 }));
      setServices(svcs);
      if (svcs.length === 1) setServiceId(svcs[0].id);
      setStaff((Array.isArray(st) ? st : []).filter((x: any) => x.active !== false).map((x: any) => ({ id: x.id, name: x.name || x.nombre })));
      setClientes((Array.isArray(cl) ? cl : []).filter((c: any) => c.telefono && !c.isLocked && c.lockReason !== 'PLAN_LIMIT').map((c: any) => ({ id: c.id, nombre: c.nombre, telefono: c.telefono })));
    }).finally(() => setLoading(false));
  }, []);

  const svc = services.find((s) => s.id === serviceId);
  const duracion = svc?.duracion || 60;
  const sugerencias = useMemo(() => {
    const t = q.trim().toLowerCase();
    const d = t.replace(/\D/g, '');
    if (t.length < 2) return [];
    return clientes.filter((c) => c.nombre.toLowerCase().includes(t) || (d.length >= 3 && c.telefono.replace(/\D/g, '').includes(d))).slice(0, 5);
  }, [q, clientes]);
  const slots = useMemo(() => (svc ? slotsDelDia({ dia, duracion, citas: allCitas, serviceId: svc.id, staffId: staffId || null, apertura: horario?.apertura, cierre: horario?.cierre }) : []),
    [svc, dia, duracion, allCitas, staffId, horario]);

  const nombreFinal = cliente ? cliente.nombre : nuevo.nombre.trim();
  const telFinal = (() => {
    if (cliente) return cliente.telefono;
    const raw = nuevo.telefono.trim();
    if (!raw) return '';
    if (raw.startsWith('+')) return raw.replace(/[^\d+]/g, '');
    return `+593${raw.replace(/\D/g, '').replace(/^0+/, '')}`;
  })();

  const listo = Boolean(nombreFinal && telFinal.replace(/\D/g, '').length >= 9 && svc && hora);
  const falta = !nombreFinal ? 'Elige o escribe el cliente' : telFinal.replace(/\D/g, '').length < 9 ? 'Falta el celular del cliente' : !svc ? 'Elige el servicio' : !hora ? 'Elige la hora' : '';

  const crear = async () => {
    if (!listo || !svc) return setError(falta);
    setBusy(true); setError('');
    try {
      const res = await fetch('/api/appointments', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug, fecha: dia, horaInicio: hora, duracion: '1', duracionMinutos: duracion,
          serviceId: svc.id, canchaId: svc.id, staffId: staffId || undefined,
          clienteNombre: nombreFinal, clienteTelefono: telFinal, comentarios: nota.trim(), is_business_creation: true,
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || 'No se pudo crear la cita.');
      const token = d.shareToken || d.reserva?.shareToken;
      const resumen = `${svc.nombre} · ${format(keyToDate(dia), "EEEE d 'de' MMMM", { locale: es })} a las ${hora12(hora)}`;
      setHecho({ nombre: nombreFinal, telefono: telFinal, link: token ? `${window.location.origin}/reserva/${token}` : null, resumen });
      onCreated(`Cita creada para ${nombreFinal.split(' ')[0]}.`);
    } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  };

  const chip = (sel: boolean) => (sel ? { borderColor: primaryColor, backgroundColor: `color-mix(in srgb, ${primaryColor} 10%, white)`, color: '#0f172a' } : { borderColor: '#e2e8f0', color: '#475569' });

  if (hecho) {
    const wa = waLink(hecho.telefono, `Hola ${hecho.nombre.split(' ')[0]} 👋 Tu cita en ${negocioNombre || 'nuestro local'} quedó agendada: ${hecho.resumen}.${hecho.link ? ` Detalles: ${hecho.link}` : ''}`);
    return (
      <Sheet title="Cita agendada" onClose={onClose}>
        <div className="py-2 text-center">
          <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-green-100 text-green-700"><Check size={28} strokeWidth={2.5} /></span>
          <p className="mt-3 text-lg font-bold text-slate-900">{hecho.nombre}</p>
          <p className="mx-auto mt-1 max-w-[30ch] text-balance text-[15px] text-slate-600">{hecho.resumen}</p>
          <div className="mt-6 space-y-2">
            {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#25D366] py-4 text-[15px] font-bold text-white"><MessageCircle size={18} /> Enviar confirmación por WhatsApp</a>}
            <button type="button" onClick={onClose} className="w-full rounded-2xl border border-slate-200 py-3.5 text-[15px] font-semibold text-slate-800">Listo</button>
          </div>
        </div>
      </Sheet>
    );
  }

  return (
    <Sheet title="Nueva cita" onClose={onClose}
      footer={
        <div>
          {error && <p role="alert" className="mb-2 flex items-center gap-2 text-sm text-rose-700"><AlertTriangle size={15} /> {error}</p>}
          <button type="button" disabled={busy} onClick={crear} className="flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-[15px] font-bold transition disabled:opacity-60"
            style={listo ? { backgroundColor: primaryColor, color: ink } : { backgroundColor: '#f1f5f9', color: '#64748b' }}>
            {busy ? <Loader2 size={18} className="animate-spin" /> : listo ? <Check size={18} /> : null}
            {listo ? `Agendar · ${hora12(hora)}${svc?.precio ? ` · ${money(svc.precio)}` : ''}` : falta}
          </button>
        </div>
      }>
      {loading ? (
        <div className="space-y-3 py-2">{[0, 1, 2].map((i) => <div key={i} className="h-16 animate-pulse rounded-2xl bg-slate-100" />)}</div>
      ) : (
        <div className="space-y-6">
          {/* Cliente */}
          <section>
            <p className="mb-2 text-sm font-semibold text-slate-900">Cliente</p>
            {cliente ? (
              <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3">
                <span className="flex size-10 items-center justify-center rounded-full bg-white font-bold text-slate-700 ring-1 ring-slate-200">{cliente.nombre.charAt(0).toUpperCase()}</span>
                <div className="min-w-0 flex-1"><p className="truncate font-semibold text-slate-900">{cliente.nombre}</p><p className="text-sm text-slate-500">{cliente.telefono}</p></div>
                <button type="button" onClick={() => { setCliente(null); setQ(''); }} className="rounded-full p-2 text-slate-400 hover:bg-white" aria-label="Cambiar cliente"><X size={18} /></button>
              </div>
            ) : modoNuevo ? (
              <div className="space-y-2">
                <input value={nuevo.nombre} onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })} placeholder="Nombre y apellido" className={field} autoFocus />
                <input value={nuevo.telefono} onChange={(e) => setNuevo({ ...nuevo, telefono: e.target.value })} placeholder="Celular (ej. 0991234567)" inputMode="tel" className={field} />
                <button type="button" onClick={() => setModoNuevo(false)} className="text-sm font-medium text-slate-500">Buscar un cliente que ya vino</button>
              </div>
            ) : (
              <div>
                <div className="relative">
                  <Search size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre o celular" className={`${field} pl-11`} />
                </div>
                {sugerencias.length > 0 && (
                  <ul className="mt-2 divide-y divide-slate-100 overflow-hidden rounded-2xl ring-1 ring-slate-200">
                    {sugerencias.map((c) => (
                      <li key={c.id}><button type="button" onClick={() => setCliente(c)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50">
                        <UserRound size={17} className="text-slate-400" /><span className="min-w-0 flex-1 truncate font-medium text-slate-900">{c.nombre}</span><span className="text-sm text-slate-500">{c.telefono}</span>
                      </button></li>
                    ))}
                  </ul>
                )}
                <button type="button" onClick={() => { setModoNuevo(true); const digits = q.replace(/\D/g, ''); setNuevo(digits.length >= 6 ? { nombre: '', telefono: q } : { nombre: q, telefono: '' }); }}
                  className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold" style={{ color: primaryColor }}>
                  <Plus size={15} /> Cliente nuevo{q.trim() && !/\d{6,}/.test(q) ? `: “${q.trim()}”` : ''}
                </button>
              </div>
            )}
          </section>

          {/* Servicio */}
          <section>
            <p className="mb-2 text-sm font-semibold text-slate-900">Servicio</p>
            {services.length === 0 ? <p className="rounded-2xl bg-amber-50 p-3 text-sm text-amber-900">Aún no tienes servicios activos.</p> : (
              <div className="grid grid-cols-2 gap-2">
                {services.map((s) => (
                  <button key={s.id} type="button" onClick={() => { setServiceId(s.id); setHora(''); }} aria-pressed={serviceId === s.id}
                    className="rounded-2xl border p-3 text-left transition" style={chip(serviceId === s.id)}>
                    <span className="line-clamp-2 block text-sm font-semibold leading-snug text-slate-900">{s.nombre}</span>
                    <span className="mt-1 block text-xs text-slate-500">{s.duracion} min{s.precio ? ` · ${money(s.precio)}` : ''}</span>
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* Profesional */}
          {staff.length > 0 && (
            <section>
              <p className="mb-2 text-sm font-semibold text-slate-900">Profesional</p>
              <div className="flex flex-wrap gap-2">
                {[{ id: '', name: 'Cualquiera' }, ...staff].map((s) => (
                  <button key={s.id || 'any'} type="button" onClick={() => { setStaffId(s.id); setHora(''); }} aria-pressed={staffId === s.id}
                    className="rounded-full border px-3.5 py-2 text-sm font-medium" style={chip(staffId === s.id)}>{s.name}</button>
                ))}
              </div>
            </section>
          )}

          {/* Día y hora */}
          <section>
            <p className="mb-2 text-sm font-semibold text-slate-900">Día</p>
            <DayPicker value={dia} onChange={(k) => { setDia(k); setHora(''); }} primaryColor={primaryColor} citas={allCitas} />
          </section>
          <section>
            <p className="mb-2 text-sm font-semibold text-slate-900">Hora {svc && <span className="font-normal text-slate-500">· dura {duracion} min</span>}</p>
            {svc ? <SlotGrid slots={slots} value={hora} onChange={setHora} primaryColor={primaryColor} /> : <p className="rounded-2xl bg-slate-50 p-4 text-center text-sm text-slate-500">Elige primero el servicio para ver las horas libres.</p>}
          </section>

          {/* Nota */}
          <section>
            <p className="mb-2 text-sm font-semibold text-slate-900">Nota <span className="font-normal text-slate-500">(opcional)</span></p>
            <textarea value={nota} onChange={(e) => setNota(e.target.value)} rows={2} placeholder="Ej. prefiere aceite sin aroma" className={`${field} resize-none text-[15px]`} />
          </section>
        </div>
      )}
    </Sheet>
  );
}
