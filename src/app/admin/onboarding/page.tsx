'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    Check, ArrowRight, ArrowLeft, Store, Palette, Sparkles, Clock, Gift, Loader2,
    MapPin, Copy, ExternalLink, LayoutDashboard, MessageCircle, Plus, Users, QrCode, LogOut,
} from 'lucide-react';
import ImageUploader from '@/components/ui/ImageUploader';
import { signOut } from 'next-auth/react';

// ── Configuración por tipo de negocio ─────────────────────────────────
type Family = 'spa' | 'barberia' | 'dental' | 'servicios' | 'gym' | 'canchas' | 'restaurante' | 'tienda' | 'lavanderia';

function familyOf(tipo: string): Family {
    const t = (tipo || '').toUpperCase();
    if (['SPA', 'CENTRO_ESTETICA', 'ESTETICA', 'BELLEZA'].includes(t)) return 'spa';
    if (['BARBERIA', 'PELUQUERIA', 'SALON'].includes(t)) return 'barberia';
    if (['ODONTOLOGIA', 'DENTAL', 'DENTISTA', 'CLINICA'].includes(t)) return 'dental';
    if (['GIMNASIO', 'GYM', 'FITNESS'].includes(t)) return 'gym';
    if (['CANCHAS', 'SPORTS_COURTS', 'PADEL'].includes(t)) return 'canchas';
    if (['RESTAURANTE', 'GASTRONOMIA', 'BAR', 'CAFETERIA', 'PINCHOS'].includes(t)) return 'restaurante';
    if (['TIENDA', 'ECOMMERCE', 'PRODUCTOS', 'COMERCIO'].includes(t)) return 'tienda';
    if (['LAVANDERIA', 'SHOE_CARE', 'LAVADO'].includes(t)) return 'lavanderia';
    return 'servicios';
}

const TIPO_OPTIONS = [
    { id: 'SPA', label: 'Spa y estética' },
    { id: 'BARBERIA', label: 'Barbería y salón' },
    { id: 'ODONTOLOGIA', label: 'Clínica dental' },
    { id: 'SERVICIOS', label: 'Citas y servicios' },
    { id: 'GIMNASIO', label: 'Gimnasio' },
    { id: 'SPORTS_COURTS', label: 'Canchas deportivas' },
    { id: 'RESTAURANTE', label: 'Restaurante o café' },
    { id: 'TIENDA', label: 'Tienda' },
    { id: 'LAVANDERIA', label: 'Lavandería y calzado' },
];

interface FamilyCfg {
    item: string;          // "servicio", "producto", "cancha"…
    itemTitle: string;     // título del paso
    showDuration: boolean;
    durationLabel: string;
    durations: number[];
    suggestions: { nombre: string; precio: string; duracion?: number }[];
    descripcion: string;   // sugerencia de descripción del negocio
    color: string;
    cta: string;           // botón de la página pública
}

const FAMILY: Record<Family, FamilyCfg> = {
    spa: { item: 'servicio', itemTitle: 'Tu primer servicio', showDuration: true, durationLabel: 'Duración', durations: [30, 45, 60, 90, 120],
        suggestions: [{ nombre: 'Masaje relajante', precio: '35', duracion: 60 }, { nombre: 'Limpieza facial', precio: '30', duracion: 50 }, { nombre: 'Manicure spa', precio: '15', duracion: 45 }],
        descripcion: 'Masajes, faciales y rituales para desconectarte.', color: '#db2777', cta: 'Reservar cita' },
    barberia: { item: 'servicio', itemTitle: 'Tu primer servicio', showDuration: true, durationLabel: 'Duración', durations: [20, 30, 45, 60, 90],
        suggestions: [{ nombre: 'Corte clásico', precio: '8', duracion: 30 }, { nombre: 'Corte + barba', precio: '12', duracion: 45 }, { nombre: 'Arreglo de barba', precio: '6', duracion: 20 }],
        descripcion: 'Cortes, barba y estilo con los mejores barberos.', color: '#0284c7', cta: 'Reservar turno' },
    dental: { item: 'tratamiento', itemTitle: 'Tu primer tratamiento', showDuration: true, durationLabel: 'Duración', durations: [30, 45, 60, 90],
        suggestions: [{ nombre: 'Consulta de valoración', precio: '15', duracion: 30 }, { nombre: 'Limpieza dental', precio: '30', duracion: 45 }, { nombre: 'Blanqueamiento', precio: '120', duracion: 60 }],
        descripcion: 'Cuidamos tu sonrisa con tecnología y calidez.', color: '#0d9488', cta: 'Agendar cita' },
    servicios: { item: 'servicio', itemTitle: 'Tu primer servicio', showDuration: true, durationLabel: 'Duración', durations: [15, 30, 45, 60, 90, 120],
        suggestions: [{ nombre: 'Consulta inicial', precio: '20', duracion: 30 }, { nombre: 'Asesoría completa', precio: '40', duracion: 60 }],
        descripcion: 'Agenda tu cita en línea en menos de un minuto.', color: '#2563eb', cta: 'Agendar cita' },
    gym: { item: 'clase', itemTitle: 'Tu primera clase o servicio', showDuration: true, durationLabel: 'Duración', durations: [30, 45, 60, 90],
        suggestions: [{ nombre: 'Clase funcional', precio: '5', duracion: 60 }, { nombre: 'Entrenamiento personal', precio: '15', duracion: 60 }],
        descripcion: 'Entrena con nosotros: clases, máquinas y entrenadores.', color: '#ea580c', cta: 'Ver planes' },
    canchas: { item: 'cancha', itemTitle: 'Tu primera cancha', showDuration: true, durationLabel: 'Turno', durations: [60, 90, 120],
        suggestions: [{ nombre: 'Cancha sintética fútbol 5', precio: '25', duracion: 60 }, { nombre: 'Cancha de pádel', precio: '20', duracion: 90 }],
        descripcion: 'Reserva tu cancha en segundos, de día o de noche.', color: '#059669', cta: 'Reservar cancha' },
    restaurante: { item: 'plato', itemTitle: 'Tu primer plato', showDuration: false, durationLabel: '', durations: [],
        suggestions: [{ nombre: 'Hamburguesa clásica', precio: '7.50' }, { nombre: 'Almuerzo del día', precio: '4.50' }, { nombre: 'Café americano', precio: '1.50' }],
        descripcion: 'Pide desde tu mesa o a domicilio, sin esperas.', color: '#c2410c', cta: 'Ver menú' },
    tienda: { item: 'producto', itemTitle: 'Tu primer producto', showDuration: false, durationLabel: '', durations: [],
        suggestions: [{ nombre: 'Producto estrella', precio: '20' }],
        descripcion: 'Compra en línea y recibe en tu puerta.', color: '#4f46e5', cta: 'Ver productos' },
    lavanderia: { item: 'servicio', itemTitle: 'Tu primer servicio', showDuration: false, durationLabel: '', durations: [],
        suggestions: [{ nombre: 'Lavado de zapatillas', precio: '7' }, { nombre: 'Lavado por kilo', precio: '1.50' }, { nombre: 'Lavado en seco (prenda)', precio: '4' }],
        descripcion: 'Retiramos, lavamos y entregamos. Sigue tu orden en línea.', color: '#7c3aed', cta: 'Pedir servicio' },
};

const COLORS = ['#0f172a', '#2563eb', '#0891b2', '#059669', '#65a30d', '#d97706', '#ea580c', '#dc2626', '#db2777', '#7c3aed'];

const DAYS = [
    { label: 'Lun', value: 1 }, { label: 'Mar', value: 2 }, { label: 'Mié', value: 3 }, { label: 'Jue', value: 4 },
    { label: 'Vie', value: 5 }, { label: 'Sáb', value: 6 }, { label: 'Dom', value: 0 },
];

const HOUR_PRESETS = [
    { label: 'Lun a Vie · 9:00–18:00', days: [1, 2, 3, 4, 5], open: '09:00', close: '18:00' },
    { label: 'Lun a Sáb · 9:00–19:00', days: [1, 2, 3, 4, 5, 6], open: '09:00', close: '19:00' },
    { label: 'Todos los días · 8:00–20:00', days: [1, 2, 3, 4, 5, 6, 0], open: '08:00', close: '20:00' },
];

type StepId = 'negocio' | 'marca' | 'item' | 'horario' | 'club';

const inputCls = 'w-full !px-3 !py-2.5 !text-sm !rounded-lg !border !border-slate-200 !bg-white text-slate-900 placeholder:text-slate-400 focus:!border-slate-900 outline-none';

// ── Asistente ──────────────────────────────────────────────────────────
export default function OnboardingWizard() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [done, setDone] = useState(false);
    const [stepIndex, setStepIndex] = useState(0);
    const [hasType, setHasType] = useState(true);
    const [activarClub, setActivarClub] = useState(true);
    const [clubResult, setClubResult] = useState<'ok' | 'fail' | null>(null);

    const [data, setData] = useState({
        nombre: '', descripcion: '', telefono: '', direccion: '', ciudad: '',
        logoUrl: '', logoMediaId: '', bannerUrl: '', bannerMediaId: '',
        tipoNegocio: '',
        servicioNombre: '', servicioDuracion: '60', servicioPrecio: '', servicioDescripcion: '', servicioImageUrl: '', servicioImageMediaId: '',
        horarioApertura: '09:00', horarioCierre: '18:00', slug: '',
        diasAtencion: [1, 2, 3, 4, 5, 6] as number[],
        colorPrimario: '#2563eb', colorSecundario: '#0f172a',
    });
    const upd = (patch: Partial<typeof data>) => setData((d) => ({ ...d, ...patch }));

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch('/api/negocio');
                if (res.ok) {
                    const n = await res.json();
                    if (n.configuracion?.wizardCompleted) { router.push('/admin'); return; }
                    const rawTipo = (n.tipoNegocio || n.configuracion?.tipoNegocio || n.configuracion?.blueprintId || '').toUpperCase();
                    const known = Boolean(rawTipo && rawTipo !== 'GENERAL' && rawTipo !== 'OTRO');
                    setHasType(known);
                    const cfg = FAMILY[familyOf(rawTipo)];
                    setData((d) => ({
                        ...d,
                        nombre: n.nombre || '',
                        tipoNegocio: rawTipo,
                        telefono: n.whatsapp || '',
                        direccion: n.direccion || '',
                        ciudad: n.ciudad || '',
                        logoUrl: n.logoUrl || '',
                        bannerUrl: n.configuracion?.bannerUrl || '',
                        horarioApertura: n.horarioApertura || '09:00',
                        horarioCierre: n.horarioCierre || '18:00',
                        slug: n.slug || '',
                        diasAtencion: Array.isArray(n.configuracion?.diasAtencion) ? n.configuracion.diasAtencion : [1, 2, 3, 4, 5, 6],
                        colorPrimario: n.colorPrimario || cfg.color,
                        colorSecundario: n.colorSecundario || '#0f172a',
                        servicioDuracion: String(cfg.suggestions[0]?.duracion || 60),
                    }));
                }
            } catch { /* sin conexión */ }
            finally { setLoading(false); }
        })();
    }, [router]);

    const family = familyOf(data.tipoNegocio);
    const cfg = FAMILY[family];

    const steps: { id: StepId; label: string; icon: React.ElementType }[] = useMemo(() => [
        { id: 'negocio', label: 'Negocio', icon: Store },
        { id: 'marca', label: 'Marca', icon: Palette },
        { id: 'item', label: cfg.item.charAt(0).toUpperCase() + cfg.item.slice(1), icon: Sparkles },
        { id: 'horario', label: 'Horario', icon: Clock },
        { id: 'club', label: 'Club', icon: Gift },
    ], [cfg.item]);
    const step = steps[stepIndex].id;
    const isLast = stepIndex === steps.length - 1;

    const validate = (): string | null => {
        if (step === 'negocio') {
            if (data.nombre.trim().length < 2) return 'Escribe el nombre de tu negocio.';
            if (!hasType && !data.tipoNegocio) return 'Elige el tipo de negocio.';
        }
        if (step === 'item' && data.servicioNombre && !data.servicioPrecio) return `Escribe el precio de tu ${cfg.item} o déjalo para después.`;
        if (step === 'horario') {
            if (!data.diasAtencion.length) return 'Elige al menos un día de atención.';
            if (data.horarioCierre <= data.horarioApertura) return 'La hora de cierre debe ser después de la de apertura.';
        }
        return null;
    };

    const next = async () => {
        const err = validate();
        setError(err);
        if (err) return;
        if (!isLast) { setStepIndex((i) => i + 1); return; }
        await finish();
    };

    const finish = async () => {
        setSaving(true);
        setError(null);
        try {
            const res = await fetch('/api/onboarding', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...data,
                    servicioDuracion: cfg.showDuration ? data.servicioDuracion : '60',
                }),
            });
            if (!res.ok) throw new Error();
            if (activarClub) {
                const c = await fetch('/api/admin/club/quick-start', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }).catch(() => null);
                setClubResult(c && c.ok ? 'ok' : 'fail');
            }
            setDone(true);
        } catch {
            setError('No pudimos guardar. Revisa tu conexión e intenta otra vez.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-slate-400" size={28} /></div>;
    }

    if (done) return <Success data={data} cfg={cfg} clubResult={clubResult} />;

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            {/* Barra superior */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-4">
                    <div className="flex items-center gap-2 shrink-0">
                        <img src="/citiox-icon.png" alt="" className="size-7 rounded-md object-contain" />
                        <span className="font-semibold text-slate-900 hidden sm:inline">Configura tu negocio</span>
                    </div>
                    <ol className="flex-1 flex items-center justify-center gap-1 sm:gap-2 overflow-x-auto [scrollbar-width:none]" aria-label="Pasos">
                        {steps.map((s, i) => {
                            const state = i < stepIndex ? 'done' : i === stepIndex ? 'current' : 'todo';
                            return (
                                <li key={s.id} className="flex items-center gap-1 sm:gap-2 shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => i < stepIndex && setStepIndex(i)}
                                        disabled={i > stepIndex}
                                        aria-current={state === 'current' ? 'step' : undefined}
                                        className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium ${state === 'current' ? 'text-slate-900' : state === 'done' ? 'text-slate-600 hover:bg-slate-100' : 'text-slate-400'}`}
                                    >
                                        <span className={`size-5 rounded-full flex items-center justify-center text-[11px] font-semibold ${state === 'done' ? 'bg-emerald-500 text-white' : state === 'current' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                            {state === 'done' ? <Check size={11} /> : i + 1}
                                        </span>
                                        <span className="hidden md:inline">{s.label}</span>
                                    </button>
                                    {i < steps.length - 1 && <span className="w-3 sm:w-6 h-px bg-slate-200" />}
                                </li>
                            );
                        })}
                    </ol>
                    <button type="button" onClick={() => signOut({ callbackUrl: '/login' })} className="shrink-0 p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100" title="Salir" aria-label="Salir">
                        <LogOut size={16} />
                    </button>
                </div>
            </header>

            <div className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 lg:py-10 grid lg:grid-cols-[minmax(0,1fr)_320px] gap-8 items-start">
                {/* Paso actual */}
                <main className="bg-white border border-slate-200 rounded-xl p-5 sm:p-7">
                    <p className="text-xs font-medium text-slate-500">Paso {stepIndex + 1} de {steps.length}</p>

                    {step === 'negocio' && (
                        <StepShell title="Cuéntanos de tu negocio" subtitle="Esto aparecerá en tu página para que tus clientes te encuentren.">
                            <div className="grid sm:grid-cols-2 gap-3">
                                <Field label="Nombre del negocio">
                                    <input value={data.nombre} onChange={(e) => upd({ nombre: e.target.value })} className={inputCls} placeholder="Ej: Aura Spa" />
                                </Field>
                                {!hasType ? (
                                    <Field label="Tipo de negocio">
                                        <select value={data.tipoNegocio} onChange={(e) => upd({ tipoNegocio: e.target.value, colorPrimario: FAMILY[familyOf(e.target.value)].color })} className={inputCls}>
                                            <option value="">Elige uno…</option>
                                            {TIPO_OPTIONS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                                        </select>
                                    </Field>
                                ) : (
                                    <Field label="WhatsApp del negocio" hint="Aquí te llegan las reservas.">
                                        <input value={data.telefono} onChange={(e) => upd({ telefono: e.target.value })} className={inputCls} placeholder="Ej: 0991234567" inputMode="tel" />
                                    </Field>
                                )}
                                {!hasType && (
                                    <Field label="WhatsApp del negocio" hint="Aquí te llegan las reservas.">
                                        <input value={data.telefono} onChange={(e) => upd({ telefono: e.target.value })} className={inputCls} placeholder="Ej: 0991234567" inputMode="tel" />
                                    </Field>
                                )}
                                <Field label="Ciudad">
                                    <input value={data.ciudad} onChange={(e) => upd({ ciudad: e.target.value })} className={inputCls} placeholder="Ej: Quito" />
                                </Field>
                                <Field label="Dirección" hint="Opcional. Se muestra con un mapa.">
                                    <input value={data.direccion} onChange={(e) => upd({ direccion: e.target.value })} className={inputCls} placeholder="Ej: Av. Amazonas N24-03" />
                                </Field>
                            </div>
                            <Field label="Frase de presentación" hint="Una línea que diga qué ofreces.">
                                <textarea value={data.descripcion} onChange={(e) => upd({ descripcion: e.target.value.slice(0, 140) })} rows={2} className={`${inputCls} resize-none`} placeholder={cfg.descripcion} />
                            </Field>
                            {!data.descripcion && (
                                <button type="button" onClick={() => upd({ descripcion: cfg.descripcion })} className="text-xs font-medium text-slate-600 hover:text-slate-900 -mt-2 inline-flex items-center gap-1">
                                    <Sparkles size={12} /> Usar sugerencia: “{cfg.descripcion}”
                                </button>
                            )}
                        </StepShell>
                    )}

                    {step === 'marca' && (
                        <StepShell title="Dale tu estilo" subtitle="Tu logo y tu color hacen que la página se sienta tuya. Puedes cambiarlos cuando quieras.">
                            <div className="grid sm:grid-cols-[9rem_minmax(0,1fr)] gap-5">
                                <Field label="Logo">
                                    <div className="w-36">
                                        <ImageUploader
                                            category="logo"
                                            currentUrl={data.logoUrl}
                                            onUploadSuccess={(m) => upd({ logoUrl: m.url, logoMediaId: m.id })}
                                            onRemove={() => upd({ logoUrl: '', logoMediaId: '' })}
                                            label="Subir logo"
                                            aspect="square"
                                        />
                                    </div>
                                </Field>
                                <div className="space-y-4">
                                    <Field label="Color de tu marca">
                                        <div className="flex flex-wrap items-center gap-2">
                                            {COLORS.map((c) => (
                                                <button key={c} type="button" onClick={() => upd({ colorPrimario: c })} className="size-8 rounded-full flex items-center justify-center ring-offset-2 transition" style={{ backgroundColor: c, boxShadow: data.colorPrimario === c ? `0 0 0 2px #fff, 0 0 0 4px ${c}` : undefined }} aria-label={`Color ${c}`}>
                                                    {data.colorPrimario === c && <Check size={14} className="text-white" />}
                                                </button>
                                            ))}
                                            <label className="relative size-8 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center cursor-pointer text-slate-400 hover:border-slate-400" title="Otro color">
                                                <Plus size={14} />
                                                <input type="color" value={data.colorPrimario} onChange={(e) => upd({ colorPrimario: e.target.value })} className="absolute inset-0 opacity-0 cursor-pointer" />
                                            </label>
                                        </div>
                                    </Field>
                                    <Field label="Foto de portada" hint="Opcional. Si no subes una, usamos tu color.">
                                        <ImageUploader
                                            category="banner"
                                            currentUrl={data.bannerUrl}
                                            onUploadSuccess={(m) => upd({ bannerUrl: m.url, bannerMediaId: m.id })}
                                            onRemove={() => upd({ bannerUrl: '', bannerMediaId: '' })}
                                            label="Subir portada (horizontal)"
                                            aspect="landscape"
                                            compact
                                        />
                                    </Field>
                                </div>
                            </div>
                        </StepShell>
                    )}

                    {step === 'item' && (
                        <StepShell title={cfg.itemTitle} subtitle={`Con uno basta para empezar a recibir clientes. Luego agregas el resto.`}>
                            <div>
                                <p className="text-xs font-medium text-slate-500 mb-1.5">Toca una idea para llenarlo rápido</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {cfg.suggestions.map((s) => (
                                        <button key={s.nombre} type="button" onClick={() => upd({ servicioNombre: s.nombre, servicioPrecio: s.precio, ...(s.duracion ? { servicioDuracion: String(s.duracion) } : {}) })} className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium ${data.servicioNombre === s.nombre ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
                                            {s.nombre} · ${s.precio}{s.duracion ? ` · ${s.duracion} min` : ''}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className={`grid gap-3 ${cfg.showDuration ? 'sm:grid-cols-[minmax(0,1fr)_7rem_8rem]' : 'sm:grid-cols-[minmax(0,1fr)_8rem]'}`}>
                                <Field label="Nombre">
                                    <input value={data.servicioNombre} onChange={(e) => upd({ servicioNombre: e.target.value })} className={inputCls} placeholder={cfg.suggestions[0]?.nombre} />
                                </Field>
                                <Field label="Precio ($)">
                                    <input value={data.servicioPrecio} onChange={(e) => upd({ servicioPrecio: e.target.value.replace(/[^\d.]/g, '') })} className={inputCls} placeholder="0.00" inputMode="decimal" />
                                </Field>
                                {cfg.showDuration && (
                                    <Field label={cfg.durationLabel}>
                                        <select value={data.servicioDuracion} onChange={(e) => upd({ servicioDuracion: e.target.value })} className={inputCls}>
                                            {cfg.durations.map((d) => <option key={d} value={d}>{d < 60 ? `${d} min` : d % 60 ? `${Math.floor(d / 60)} h ${d % 60} min` : `${d / 60} h`}</option>)}
                                        </select>
                                    </Field>
                                )}
                            </div>
                            {data.servicioNombre && (
                                <Field label="Foto" hint="Opcional, pero las fotos venden mucho más.">
                                    <ImageUploader
                                        category="service"
                                        currentUrl={data.servicioImageUrl}
                                        onUploadSuccess={(m) => upd({ servicioImageUrl: m.url, servicioImageMediaId: m.id })}
                                        onRemove={() => upd({ servicioImageUrl: '', servicioImageMediaId: '' })}
                                        label="Subir foto"
                                        aspect="landscape"
                                        compact
                                    />
                                </Field>
                            )}
                            {data.servicioNombre && (
                                <button type="button" onClick={() => upd({ servicioNombre: '', servicioPrecio: '', servicioImageUrl: '', servicioImageMediaId: '' })} className="text-xs text-slate-500 hover:text-slate-800 underline">
                                    Prefiero agregarlo después
                                </button>
                            )}
                        </StepShell>
                    )}

                    {step === 'horario' && (
                        <StepShell title="¿Cuándo atiendes?" subtitle="Tus clientes solo podrán reservar en estos días y horas. Luego puedes poner horarios por profesional.">
                            <div className="flex flex-wrap gap-1.5">
                                {HOUR_PRESETS.map((p) => {
                                    const active = p.open === data.horarioApertura && p.close === data.horarioCierre && p.days.length === data.diasAtencion.length && p.days.every((d) => data.diasAtencion.includes(d));
                                    return (
                                        <button key={p.label} type="button" onClick={() => upd({ diasAtencion: p.days, horarioApertura: p.open, horarioCierre: p.close })} className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium ${active ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
                                            {p.label}
                                        </button>
                                    );
                                })}
                            </div>
                            <Field label="Días">
                                <div className="grid grid-cols-7 gap-1.5">
                                    {DAYS.map((d) => {
                                        const on = data.diasAtencion.includes(d.value);
                                        return (
                                            <button key={d.value} type="button" onClick={() => upd({ diasAtencion: on ? data.diasAtencion.filter((x) => x !== d.value) : [...data.diasAtencion, d.value] })} aria-pressed={on} className={`py-2 rounded-lg border text-xs font-semibold ${on ? 'text-white border-transparent' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`} style={on ? { backgroundColor: data.colorPrimario } : undefined}>
                                                {d.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </Field>
                            <div className="grid grid-cols-2 gap-3 max-w-sm">
                                <Field label="Abre">
                                    <input type="time" value={data.horarioApertura} onChange={(e) => upd({ horarioApertura: e.target.value })} className={inputCls} />
                                </Field>
                                <Field label="Cierra">
                                    <input type="time" value={data.horarioCierre} onChange={(e) => upd({ horarioCierre: e.target.value })} className={inputCls} />
                                </Field>
                            </div>
                        </StepShell>
                    )}

                    {step === 'club' && (
                        <StepShell title="Haz que tus clientes vuelvan" subtitle="Último paso. Activa tu club de beneficios: tus clientes suman puntos al reservar o comprar y los cambian por premios.">
                            <button type="button" onClick={() => setActivarClub((v) => !v)} aria-pressed={activarClub} className={`w-full text-left p-4 rounded-xl border-2 transition ${activarClub ? 'border-slate-900 bg-slate-50' : 'border-slate-200'}`}>
                                <span className="flex items-start gap-3">
                                    <span className="size-10 rounded-lg flex items-center justify-center shrink-0 text-white" style={{ backgroundColor: data.colorPrimario }}><Gift size={18} /></span>
                                    <span className="flex-1">
                                        <span className="flex items-center justify-between gap-2">
                                            <span className="font-semibold text-slate-900">Activar mi club de beneficios</span>
                                            <span className={`w-10 h-6 rounded-full relative transition shrink-0 ${activarClub ? '' : 'bg-slate-300'}`} style={activarClub ? { backgroundColor: data.colorPrimario } : undefined}>
                                                <span className={`absolute top-1 size-4 rounded-full bg-white transition-all ${activarClub ? 'left-5' : 'left-1'}`} />
                                            </span>
                                        </span>
                                        <span className="block text-sm text-slate-600 mt-1">Lo dejamos listo con lo típico de tu rubro:</span>
                                        <ul className="text-sm text-slate-600 mt-2 space-y-1">
                                            <li className="flex gap-2"><Check size={15} className="text-emerald-600 mt-0.5 shrink-0" /> 3 niveles: Bronce, Plata y Oro</li>
                                            <li className="flex gap-2"><Check size={15} className="text-emerald-600 mt-0.5 shrink-0" /> Puntos por visita, por compra y por invitar amigos</li>
                                            <li className="flex gap-2"><Check size={15} className="text-emerald-600 mt-0.5 shrink-0" /> 3 premios listos para canjear</li>
                                        </ul>
                                        <span className="block text-xs text-slate-500 mt-2">Puedes cambiar puntos y premios cuando quieras en “Club de beneficios”.</span>
                                    </span>
                                </span>
                            </button>
                        </StepShell>
                    )}

                    {error && <p role="alert" className="mt-4 rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-sm text-rose-700">{error}</p>}

                    <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between gap-2">
                        {stepIndex > 0 ? (
                            <button type="button" onClick={() => { setError(null); setStepIndex((i) => i - 1); }} className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50" disabled={saving}>
                                <ArrowLeft size={15} /> Atrás
                            </button>
                        ) : <span />}
                        <div className="flex items-center gap-2">
                            {(step === 'marca' || (step === 'item' && !data.servicioNombre)) && (
                                <button type="button" onClick={() => { setError(null); setStepIndex((i) => i + 1); }} className="px-3 py-2.5 text-sm font-medium text-slate-500 hover:text-slate-900">
                                    Saltar
                                </button>
                            )}
                            <button type="button" onClick={next} disabled={saving} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-white text-sm font-semibold hover:brightness-110 disabled:opacity-60" style={{ backgroundColor: '#0f172a' }}>
                                {saving && <Loader2 size={15} className="animate-spin" />}
                                {isLast ? (saving ? 'Creando tu página…' : 'Terminar y ver mi página') : 'Continuar'}
                                {!saving && <ArrowRight size={15} />}
                            </button>
                        </div>
                    </div>
                </main>

                {/* Vista previa en vivo */}
                <aside className="hidden lg:block sticky top-20">
                    <p className="text-xs font-medium text-slate-500 mb-2 text-center">Así se ve tu página</p>
                    <LivePreview data={data} cfg={cfg} />
                </aside>
            </div>
        </div>
    );
}

// ── Piezas ─────────────────────────────────────────────────────────────

function StepShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
    return (
        <section className="mt-1">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">{title}</h1>
            <p className="text-sm text-slate-500 mt-1">{subtitle}</p>
            <div className="mt-5 space-y-4">{children}</div>
        </section>
    );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
    return (
        <div className="block">
            <span className="block text-sm font-medium text-slate-700 mb-1">{label}</span>
            {children}
            {hint && <span className="block text-xs text-slate-500 mt-1">{hint}</span>}
        </div>
    );
}

function formatDays(days: number[]) {
    const order = [1, 2, 3, 4, 5, 6, 0];
    const names: Record<number, string> = { 1: 'Lun', 2: 'Mar', 3: 'Mié', 4: 'Jue', 5: 'Vie', 6: 'Sáb', 0: 'Dom' };
    const sorted = order.filter((d) => days.includes(d));
    if (sorted.length === 7) return 'Todos los días';
    const idx = sorted.map((d) => order.indexOf(d));
    const consecutive = idx.every((v, i) => i === 0 || v === idx[i - 1] + 1);
    if (consecutive && sorted.length > 2) return `${names[sorted[0]]} a ${names[sorted[sorted.length - 1]]}`;
    return sorted.map((d) => names[d]).join(', ');
}

function LivePreview({ data, cfg }: { data: any; cfg: FamilyCfg }) {
    const color = data.colorPrimario || '#0f172a';
    return (
        <div className="mx-auto w-[280px] rounded-[2rem] bg-slate-900 p-2 shadow-xl">
            <div className="rounded-[1.6rem] overflow-hidden bg-white h-[540px] flex flex-col">
                {/* Portada */}
                <div className="relative h-36 shrink-0" style={{ background: data.bannerUrl ? undefined : `linear-gradient(135deg, ${color}, ${color}bb)` }}>
                    {data.bannerUrl && <img src={data.bannerUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    <div className="absolute -bottom-6 left-4 size-14 rounded-xl bg-white shadow-md overflow-hidden flex items-center justify-center text-xl font-bold" style={{ color }}>
                        {data.logoUrl ? <img src={data.logoUrl} alt="" className="w-full h-full object-cover" /> : (data.nombre || 'N').charAt(0).toUpperCase()}
                    </div>
                </div>
                <div className="px-4 pt-8 pb-3">
                    <p className="font-bold text-slate-900 leading-tight truncate">{data.nombre || 'Tu negocio'}</p>
                    <p className="text-[11px] text-slate-500 leading-snug mt-0.5 line-clamp-2">{data.descripcion || cfg.descripcion}</p>
                    <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-500">
                        {data.ciudad && <span className="inline-flex items-center gap-0.5"><MapPin size={11} />{data.ciudad}</span>}
                        <span className="inline-flex items-center gap-0.5"><Clock size={11} />{formatDays(data.diasAtencion)} · {data.horarioApertura}–{data.horarioCierre}</span>
                    </div>
                    <div className="mt-3 w-full py-2 rounded-lg text-white text-xs font-semibold text-center" style={{ backgroundColor: color }}>{cfg.cta}</div>
                </div>
                <div className="px-4 flex-1 overflow-hidden">
                    <p className="text-[11px] font-semibold text-slate-900 mb-1.5">Destacados</p>
                    {data.servicioNombre ? (
                        <div className="flex gap-2.5 p-2 rounded-lg border border-slate-100">
                            <div className="size-12 rounded-md bg-slate-100 overflow-hidden shrink-0">
                                {data.servicioImageUrl && <img src={data.servicioImageUrl} alt="" className="w-full h-full object-cover" />}
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-xs font-semibold text-slate-900 truncate">{data.servicioNombre}</p>
                                <p className="text-[11px] text-slate-500">{cfg.showDuration ? `${data.servicioDuracion} min · ` : ''}<span className="font-semibold" style={{ color }}>${data.servicioPrecio || '0'}</span></p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {[0, 1].map((i) => <div key={i} className="h-14 rounded-lg bg-slate-50 border border-dashed border-slate-200" />)}
                        </div>
                    )}
                </div>
                <div className="h-11 border-t border-slate-100 flex items-center justify-around shrink-0" style={{ color }}>
                    {[0, 1, 2, 3].map((i) => <span key={i} className={`size-1.5 rounded-full ${i === 0 ? '' : 'opacity-30'}`} style={{ backgroundColor: color }} />)}
                </div>
            </div>
        </div>
    );
}

function Success({ data, cfg, clubResult }: { data: any; cfg: FamilyCfg; clubResult: 'ok' | 'fail' | null }) {
    const [origin, setOrigin] = useState('');
    const [copied, setCopied] = useState(false);
    useEffect(() => { setOrigin(window.location.origin); }, []);
    const url = `${origin}/${data.slug}`;
    const share = `¡Ya puedes reservar en ${data.nombre} desde tu celular! 👉 ${url}`;

    const copy = async () => {
        try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* ignore */ }
    };

    const nextSteps = [
        { href: '/admin/servicios', icon: Plus, title: `Agrega más ${cfg.item === 'producto' ? 'productos' : cfg.item === 'plato' ? 'platos' : cfg.item === 'cancha' ? 'canchas' : 'servicios'}`, text: 'Mientras más opciones, más reservas.' },
        { href: '/admin/staff', icon: Users, title: 'Suma a tu equipo', text: 'Cada profesional con su propia agenda.' },
        { href: '/admin/diseno', icon: Palette, title: 'Elige el diseño de tu página', text: 'Cambia el estilo en un clic.' },
        { href: '/admin', icon: QrCode, title: 'Imprime tu código QR', text: 'Ponlo en tu local para que reserven ahí mismo.' },
    ];

    return (
        <div className="min-h-screen bg-slate-50 flex items-start sm:items-center justify-center px-4 py-10">
            <div className="w-full max-w-4xl grid lg:grid-cols-[minmax(0,1fr)_300px] gap-8 items-center">
                <div>
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                        <Check size={13} /> Tu página ya está en línea
                    </span>
                    <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mt-3">¡{data.nombre} está listo para recibir clientes!</h1>
                    <p className="text-slate-500 mt-2">Comparte tu enlace por WhatsApp, Instagram o donde estén tus clientes.</p>

                    <div className="mt-5 flex items-center gap-2 bg-white border border-slate-200 rounded-lg p-1.5 pl-3">
                        <span className="flex-1 text-sm text-slate-800 truncate">{url.replace(/^https?:\/\//, '')}</span>
                        <button type="button" onClick={copy} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-slate-100 hover:bg-slate-200 text-sm font-semibold text-slate-800">
                            {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Copiado' : 'Copiar'}
                        </button>
                    </div>

                    <div className="mt-3 grid sm:grid-cols-3 gap-2">
                        <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-1.5 py-2.5 rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-800 hover:bg-slate-50">
                            <ExternalLink size={15} /> Ver mi página
                        </a>
                        <a href={`https://wa.me/?text=${encodeURIComponent(share)}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold">
                            <MessageCircle size={15} /> Compartir
                        </a>
                        <Link href="/admin" className="inline-flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold">
                            <LayoutDashboard size={15} /> Ir a mi panel
                        </Link>
                    </div>

                    {clubResult === 'ok' && <p className="text-sm text-emerald-700 mt-4 flex items-center gap-1.5"><Gift size={15} /> Tu club de beneficios ya está activo.</p>}
                    {clubResult === 'fail' && <p className="text-sm text-amber-700 mt-4">No pudimos activar el club ahora. Puedes hacerlo en un clic desde “Club de beneficios”.</p>}

                    <h2 className="text-sm font-semibold text-slate-900 mt-8 mb-2">Siguientes pasos recomendados</h2>
                    <ul className="grid sm:grid-cols-2 gap-2">
                        {nextSteps.map((s) => (
                            <li key={s.href + s.title}>
                                <Link href={s.href} className="flex gap-3 p-3 rounded-lg bg-white border border-slate-200 hover:border-slate-300 h-full">
                                    <span className="size-8 rounded-md bg-slate-100 text-slate-600 flex items-center justify-center shrink-0"><s.icon size={16} /></span>
                                    <span>
                                        <span className="block text-sm font-semibold text-slate-900">{s.title}</span>
                                        <span className="block text-xs text-slate-500">{s.text}</span>
                                    </span>
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>
                <div className="hidden lg:block">
                    <LivePreview data={data} cfg={cfg} />
                </div>
            </div>
        </div>
    );
}
