'use client';

import { useEffect, useState, use } from 'react';
import {
  Loader2, Check, ShieldCheck, AlertTriangle, Bike, Car, Footprints, Truck, Camera, ArrowRight, ArrowLeft, Clock, UploadCloud, FileText, X,
} from 'lucide-react';

type Mode = 'REGISTRO' | 'CORREGIR' | 'UNIRSE' | 'EN_REVISION' | 'APROBADO';

interface InviteData {
  mode: Mode;
  negocio: { id: string; nombre: string; logoUrl?: string | null; colorPrimario?: string | null; ciudad?: string | null };
  expiresAt: string;
  telefono: string;
  motivoRechazo: string | null;
  repartidor: { nombre: string; tipoVehiculo: string; datos: Record<string, string> | null; documentosEnArchivo: string[] };
}

const VEHICLES = [
  { id: 'MOTO', label: 'Moto', icon: Bike },
  { id: 'AUTO', label: 'Auto', icon: Car },
  { id: 'BICICLETA', label: 'Bicicleta', icon: Bike },
  { id: 'A_PIE', label: 'A pie', icon: Footprints },
  { id: 'CAMION', label: 'Camioneta', icon: Truck },
];

const EMPTY = {
  name: '', documento: '', fechaNacimiento: '', direccion: '', email: '', contactoEmergencia: '',
  tipoVehiculo: 'MOTO', marca: '', modelo: '', color: '', placa: '', anio: '',
  selfieUrl: '', cedulaFrenteUrl: '', cedulaReversoUrl: '', licenciaUrl: '', matriculaUrl: '', fotoVehiculoUrl: '',
};

const inputCls = 'w-full !px-3 !py-2.5 !text-[15px] !rounded-lg !border !border-slate-200 !bg-white text-slate-900 placeholder:text-slate-400 focus:!border-slate-900 outline-none';

export default function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [data, setData] = useState<InviteData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode | null>(null);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ ...EMPTY });
  const [uploading, setUploading] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/logistics/invitations/${token}`, { cache: 'no-store' });
        const d = await res.json();
        if (!res.ok) throw new Error(d.error || 'Invitación no válida');
        setData(d);
        setMode(d.mode);
        setForm((f) => ({ ...f, name: d.repartidor.nombre || '', tipoVehiculo: d.repartidor.tipoVehiculo || 'MOTO', ...(d.repartidor.datos || {}) }));
      } catch (e: any) {
        setError(e.message);
      }
    })();
  }, [token]);

  const color = data?.negocio.colorPrimario || '#0f172a';
  const motorizado = ['MOTO', 'AUTO', 'CAMION'].includes(form.tipoVehiculo);
  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const upload = async (field: string, file?: File | null) => {
    if (!file) return;
    setUploading(field);
    setFormError(null);
    try {
      const fd = new FormData();
      fd.append('token', token);
      fd.append('docType', field);
      fd.append('file', file);
      const res = await fetch('/api/logistics/invitations/upload', { method: 'POST', body: fd });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'No se pudo subir el archivo');
      setForm((f) => ({ ...f, [field]: d.url }));
    } catch (e: any) {
      setFormError(e.message);
    } finally {
      setUploading(null);
    }
  };

  const steps = ['Tus datos', 'Tu vehículo', 'Documentos'];
  const validateStep = (): string | null => {
    if (step === 0) {
      if (form.name.trim().length < 3) return 'Escribe tu nombre completo.';
      if (form.documento.trim().length < 6) return 'Escribe tu número de cédula.';
    }
    if (step === 1 && motorizado && !form.placa.trim()) return 'Escribe la placa de tu vehículo.';
    if (step === 2) {
      if (!form.selfieUrl) return 'Falta tu foto de perfil.';
      if (!form.cedulaFrenteUrl || !form.cedulaReversoUrl) return 'Faltan las fotos de tu cédula (frente y reverso).';
      if (motorizado && !form.licenciaUrl) return 'Falta la foto de tu licencia.';
      if (form.tipoVehiculo !== 'A_PIE' && !form.fotoVehiculoUrl) return 'Falta la foto de tu vehículo.';
    }
    return null;
  };

  const next = async () => {
    const err = validateStep();
    setFormError(err);
    if (err) return;
    if (step < 2) { setStep(step + 1); window.scrollTo({ top: 0 }); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/logistics/invitations/${token}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'No se pudo enviar');
      setMode('EN_REVISION');
    } catch (e: any) {
      setFormError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const respondJoin = async (action: 'confirmar' | 'rechazar') => {
    setSaving(true);
    setFormError(null);
    try {
      const res = await fetch(`/api/logistics/invitations/${token}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      if (action === 'confirmar') setMode('EN_REVISION');
      else setError('Rechazaste la invitación. Puedes cerrar esta página.');
    } catch (e: any) {
      setFormError(e.message || 'No se pudo completar.');
    } finally {
      setSaving(false);
    }
  };

  if (error) {
    return (
      <Shell>
        <div className="text-center py-10">
          <div className="size-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto"><AlertTriangle size={22} /></div>
          <p className="font-semibold text-slate-900 mt-3">{error}</p>
        </div>
      </Shell>
    );
  }
  if (!data || !mode) return <Shell><div className="py-16 flex justify-center"><Loader2 className="animate-spin text-slate-400" /></div></Shell>;

  const header = (
    <div className="flex items-center gap-3">
      <span className="size-12 rounded-xl overflow-hidden bg-white border border-slate-200 flex items-center justify-center font-bold text-lg shrink-0" style={{ color }}>
        {data.negocio.logoUrl ? <img src={data.negocio.logoUrl} alt="" className="w-full h-full object-cover" /> : data.negocio.nombre.charAt(0)}
      </span>
      <div className="min-w-0">
        <p className="text-xs text-slate-500">Equipo de repartidores</p>
        <p className="font-semibold text-slate-900 truncate">{data.negocio.nombre}</p>
      </div>
    </div>
  );

  if (mode === 'APROBADO' || mode === 'EN_REVISION') {
    const ok = mode === 'APROBADO';
    return (
      <Shell>
        {header}
        <div className="text-center py-8">
          <div className={`size-14 rounded-full flex items-center justify-center mx-auto ${ok ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>{ok ? <Check size={26} /> : <Clock size={26} />}</div>
          <h1 className="text-xl font-bold text-slate-900 mt-4">{ok ? '¡Ya eres parte del equipo!' : 'Recibimos tu registro'}</h1>
          <p className="text-sm text-slate-600 mt-2 max-w-xs mx-auto">
            {ok ? 'Entra a tu app de repartidor con tu número de celular para ver tus entregas.' : `${data.negocio.nombre} está revisando tus documentos. Te avisaremos por WhatsApp cuando te aprueben.`}
          </p>
          {ok && <a href="/driver" className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-white text-sm font-semibold" style={{ backgroundColor: color }}>Abrir mi app <ArrowRight size={15} /></a>}
        </div>
      </Shell>
    );
  }

  if (mode === 'UNIRSE') {
    return (
      <Shell>
        {header}
        <h1 className="text-xl font-bold text-slate-900 mt-6">Hola {form.name.split(' ')[0]}, te quieren en su equipo</h1>
        <p className="text-sm text-slate-600 mt-1.5">{data.negocio.nombre} quiere sumarte como repartidor{data.negocio.ciudad ? ` en ${data.negocio.ciudad}` : ''}.</p>
        <div className="mt-5 rounded-xl bg-emerald-50 border border-emerald-200 p-4">
          <p className="text-sm font-semibold text-emerald-900 flex items-center gap-1.5"><ShieldCheck size={16} /> Ya estás verificado en Citiox</p>
          <p className="text-sm text-emerald-900/80 mt-1">No tienes que subir nada otra vez. Compartiremos con este negocio los documentos que ya tienes registrados:</p>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {data.repartidor.documentosEnArchivo.map((d) => <li key={d} className="text-xs bg-white border border-emerald-200 text-emerald-800 px-2 py-0.5 rounded-full">{d}</li>)}
          </ul>
        </div>
        {formError && <p className="mt-3 text-sm text-rose-700">{formError}</p>}
        <div className="mt-6 space-y-2">
          <button type="button" onClick={() => respondJoin('confirmar')} disabled={saving} className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-lg text-white text-[15px] font-semibold disabled:opacity-60" style={{ backgroundColor: color }}>
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Sí, unirme al equipo
          </button>
          <button type="button" onClick={() => respondJoin('rechazar')} disabled={saving} className="w-full py-2.5 text-sm font-medium text-slate-500 hover:text-slate-900">No, gracias</button>
        </div>
      </Shell>
    );
  }

  // REGISTRO / CORREGIR
  return (
    <Shell>
      {header}
      <h1 className="text-xl font-bold text-slate-900 mt-6">{mode === 'CORREGIR' ? 'Corrige tu registro' : `Hola ${form.name.split(' ')[0] || ''}, regístrate como repartidor`}</h1>
      <p className="text-sm text-slate-600 mt-1">Toma unos 5 minutos. Ten a mano tu cédula{motorizado ? ', tu licencia' : ''} y tu vehículo.</p>

      {mode === 'CORREGIR' && data.motivoRechazo && (
        <div className="mt-4 rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-900">
          <p className="font-semibold">El negocio te pidió corregir:</p>
          <p>{data.motivoRechazo}</p>
        </div>
      )}

      {/* Progreso */}
      <ol className="mt-5 grid grid-cols-3 gap-2">
        {steps.map((s, i) => (
          <li key={s} className="text-xs">
            <span className={`block h-1.5 rounded-full ${i <= step ? '' : 'bg-slate-200'}`} style={i <= step ? { backgroundColor: color } : undefined} />
            <span className={`block mt-1.5 font-medium ${i === step ? 'text-slate-900' : 'text-slate-400'}`}>{i + 1}. {s}</span>
          </li>
        ))}
      </ol>

      <div className="mt-5 space-y-3.5">
        {step === 0 && (
          <>
            <Field label="Nombre completo"><input value={form.name} onChange={set('name')} className={inputCls} autoComplete="name" /></Field>
            <Field label="Número de cédula"><input value={form.documento} onChange={set('documento')} className={inputCls} inputMode="numeric" /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Fecha de nacimiento" optional><input type="date" value={form.fechaNacimiento} onChange={set('fechaNacimiento')} className={inputCls} /></Field>
              <Field label="Correo" optional><input type="email" value={form.email} onChange={set('email')} className={inputCls} /></Field>
            </div>
            <Field label="Dirección" optional><input value={form.direccion} onChange={set('direccion')} className={inputCls} placeholder="Barrio, calle principal" /></Field>
            <Field label="Contacto de emergencia" optional><input value={form.contactoEmergencia} onChange={set('contactoEmergencia')} className={inputCls} placeholder="Nombre y celular" /></Field>
          </>
        )}

        {step === 1 && (
          <>
            <Field label="¿En qué vas a repartir?">
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {VEHICLES.map((v) => (
                  <button key={v.id} type="button" onClick={() => setForm((f) => ({ ...f, tipoVehiculo: v.id }))} className={`flex flex-col items-center gap-1 py-2.5 rounded-lg border text-xs font-medium ${form.tipoVehiculo === v.id ? 'text-white border-transparent' : 'border-slate-200 text-slate-700 bg-white'}`} style={form.tipoVehiculo === v.id ? { backgroundColor: color } : undefined}>
                    <v.icon size={18} /> {v.label}
                  </button>
                ))}
              </div>
            </Field>
            {form.tipoVehiculo !== 'A_PIE' && (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Marca" optional><input value={form.marca} onChange={set('marca')} className={inputCls} placeholder="Ej: Honda" /></Field>
                <Field label="Modelo" optional><input value={form.modelo} onChange={set('modelo')} className={inputCls} placeholder="Ej: Navi 110" /></Field>
                <Field label="Color" optional><input value={form.color} onChange={set('color')} className={inputCls} /></Field>
                <Field label="Año" optional><input value={form.anio} onChange={set('anio')} className={inputCls} inputMode="numeric" maxLength={4} /></Field>
                {motorizado && <Field label="Placa"><input value={form.placa} onChange={(e) => setForm((f) => ({ ...f, placa: e.target.value.toUpperCase() }))} className={inputCls} placeholder="Ej: ABC-1234" /></Field>}
              </div>
            )}
          </>
        )}

        {step === 2 && (
          <>
            <p className="text-sm text-slate-600">Toma fotos claras, con buena luz y sin reflejos.</p>
            <div className="grid grid-cols-2 gap-3">
              <DocUpload label="Tu foto (selfie)" field="selfieUrl" value={form.selfieUrl} uploading={uploading} onFile={upload} capture="user" />
              <DocUpload label="Cédula (frente)" field="cedulaFrenteUrl" value={form.cedulaFrenteUrl} uploading={uploading} onFile={upload} />
              <DocUpload label="Cédula (reverso)" field="cedulaReversoUrl" value={form.cedulaReversoUrl} uploading={uploading} onFile={upload} />
              {motorizado && <DocUpload label="Licencia de conducir" field="licenciaUrl" value={form.licenciaUrl} uploading={uploading} onFile={upload} />}
              {form.tipoVehiculo !== 'A_PIE' && <DocUpload label="Foto del vehículo" field="fotoVehiculoUrl" value={form.fotoVehiculoUrl} uploading={uploading} onFile={upload} />}
              {motorizado && <DocUpload label="Matrícula (opcional)" field="matriculaUrl" value={form.matriculaUrl} uploading={uploading} onFile={upload} />}
            </div>
            <p className="text-xs text-slate-500">Tus documentos solo los ve el negocio que te invita y los negocios de Citiox con los que decidas trabajar.</p>
          </>
        )}
      </div>

      {formError && <p role="alert" className="mt-4 rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-sm text-rose-700">{formError}</p>}

      <div className="mt-6 flex gap-2">
        {step > 0 && (
          <button type="button" onClick={() => { setFormError(null); setStep(step - 1); }} className="inline-flex items-center gap-1.5 px-4 py-3 rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-700">
            <ArrowLeft size={15} /> Atrás
          </button>
        )}
        <button type="button" onClick={next} disabled={saving || Boolean(uploading)} className="flex-1 inline-flex items-center justify-center gap-2 py-3 rounded-lg text-white text-[15px] font-semibold disabled:opacity-60" style={{ backgroundColor: color }}>
          {saving && <Loader2 size={16} className="animate-spin" />}
          {step < 2 ? 'Continuar' : saving ? 'Enviando…' : 'Enviar mi registro'}
          {step < 2 && <ArrowRight size={16} />}
        </button>
      </div>
      <p className="text-xs text-slate-400 text-center mt-4">Este enlace vence el {new Date(data.expiresAt).toLocaleDateString('es-EC', { day: 'numeric', month: 'long' })}.</p>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen flex justify-center px-4 py-8 sm:py-12">
      <div className="w-full max-w-md">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm">{children}</div>
        <p className="text-center text-xs text-slate-400 mt-4 flex items-center justify-center gap-1.5">
          <img src="/citiox-icon.png" alt="" className="size-4 rounded object-contain" /> Con la tecnología de Citiox
        </p>
      </div>
    </main>
  );
}

function Field({ label, optional, children }: { label: string; optional?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-slate-700 mb-1">{label}{optional && <span className="text-slate-400 font-normal"> (opcional)</span>}</span>
      {children}
    </label>
  );
}

function DocUpload({ label, field, value, uploading, onFile, capture }: { label: string; field: string; value: string; uploading: string | null; onFile: (field: string, f?: File | null) => void; capture?: 'user' | 'environment' }) {
  const busy = uploading === field;
  const isPdf = value.toLowerCase().endsWith('.pdf');
  return (
    <label className={`relative block rounded-xl border-2 border-dashed overflow-hidden cursor-pointer aspect-[4/3] ${value ? 'border-emerald-400' : 'border-slate-300 hover:border-slate-400'} bg-slate-50`}>
      <input type="file" accept="image/*,application/pdf" capture={capture} className="sr-only" onChange={(e) => onFile(field, e.target.files?.[0])} disabled={busy} />
      {value && !isPdf ? <img src={value} alt="" className="absolute inset-0 w-full h-full object-cover" /> : null}
      <span className={`absolute inset-0 flex flex-col items-center justify-center gap-1 text-center px-2 ${value ? 'bg-gradient-to-t from-black/60 to-transparent justify-end pb-2 text-white' : 'text-slate-500'}`}>
        {busy ? <Loader2 size={20} className="animate-spin" /> : value ? (isPdf ? <FileText size={20} className="text-emerald-600" /> : null) : <Camera size={20} />}
        <span className="text-xs font-semibold flex items-center gap-1">{value && <Check size={12} />} {label}</span>
        {!value && !busy && <span className="text-[11px] text-slate-400 flex items-center gap-1"><UploadCloud size={11} /> Tomar o subir foto</span>}
        {value && <span className="text-[11px] opacity-80">Toca para cambiar</span>}
      </span>
    </label>
  );
}
