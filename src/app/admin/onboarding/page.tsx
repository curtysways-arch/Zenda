'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
    Check, ChevronRight, Store, Image as ImageIcon, Briefcase, 
    Clock, Sparkles, AlertTriangle, ArrowRight, Upload
} from 'lucide-react';
import ImageUploader from '@/components/ui/ImageUploader';
import Link from 'next/link';
import { signOut } from 'next-auth/react';

export default function OnboardingWizard() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    
    // State data
    const [data, setData] = useState({
        nombre: '',
        descripcion: '',
        telefono: '',
        direccion: '',
        ciudad: '',
        logoUrl: '',
        logoMediaId: '',
        bannerUrl: '',
        bannerMediaId: '',
        tipoNegocio: '',
        servicioNombre: '',
        servicioDuracion: '60',
        servicioPrecio: '',
        servicioDescripcion: '',
        servicioImageUrl: '',
        servicioImageMediaId: '',
        horarioApertura: '09:00',
        horarioCierre: '18:00',
        slug: '',
        diasAtencion: [1, 2, 3, 4, 5, 6, 0] as number[],
        colorPrimario: '#ec4899',
        colorSecundario: '#112117'
    });

    // Load initial data
    useEffect(() => {
        const fetchNegocio = async () => {
            try {
                const res = await fetch('/api/negocio');
                if (res.ok) {
                    const negocioData = await res.json();
                    
                    // Si ya lo completó, lo mandamos al panel
                    if (negocioData.configuracion?.wizardCompleted) {
                        router.push('/admin');
                        return;
                    }
                    
                    setData(prev => ({
                        ...prev,
                        nombre: negocioData.nombre || '',
                        telefono: negocioData.whatsapp || '',
                        direccion: negocioData.direccion || '',
                        ciudad: negocioData.ciudad || '',
                        logoUrl: negocioData.logoUrl || '',
                        bannerUrl: negocioData.configuracion?.bannerUrl || '',
                        horarioApertura: negocioData.horarioApertura || '09:00',
                        horarioCierre: negocioData.horarioCierre || '18:00',
                        slug: negocioData.slug || '',
                        diasAtencion: negocioData.configuracion?.diasAtencion || [1, 2, 3, 4, 5, 6, 0],
                        colorPrimario: negocioData.colorPrimario || '#ec4899',
                        colorSecundario: negocioData.colorSecundario || '#112117'
                    }));
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchNegocio();
    }, [router]);

    const handleNext = () => setStep(s => Math.min(s + 1, 6));
    const handlePrev = () => setStep(s => Math.max(s - 1, 1));

    const handleSubmit = async () => {
        setSaving(true);
        try {
            const res = await fetch('/api/onboarding', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (res.ok) {
                setStep(6); // Go to success
            } else {
                alert('Hubo un error al guardar. Intenta nuevamente.');
            }
        } catch (e) {
            alert('Error de red. Revisa tu conexión.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
            </div>
        );
    }

    const steps = [
        { id: 1, title: 'Información', icon: <Store size={18} /> },
        { id: 2, title: 'Visual', icon: <ImageIcon size={18} /> },
        { id: 3, title: 'Tipo', icon: <Briefcase size={18} /> },
        { id: 4, title: 'Servicio', icon: <Sparkles size={18} /> },
        { id: 5, title: 'Horarios', icon: <Clock size={18} /> }
    ];

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col relative z-50">
            {/* Header / Progress */}
            {step < 6 && (
                <div className="bg-white border-b border-slate-200 sticky top-0 z-10 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center justify-between w-full sm:w-auto shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="relative w-9 h-9 bg-white rounded-xl border border-slate-100 shadow-md flex items-center justify-center p-1 overflow-hidden shrink-0">
                                <img src="/logo-citiox.png" alt="CitiOx" className="w-full h-full object-contain" />
                            </div>
                            <div>
                                <h1 className="font-black tracking-tight bg-gradient-to-r from-cyan-500 via-sky-500 to-purple-600 bg-clip-text text-transparent text-lg italic leading-none">
                                    CitiOx
                                </h1>
                                <span className="text-[7px] font-black uppercase tracking-[0.2em] leading-none text-slate-400">Configuración</span>
                            </div>
                        </div>
                        
                        <button 
                            onClick={async () => {
                                await signOut({ callbackUrl: '/login' });
                            }}
                            className="sm:hidden px-3 py-1.5 border border-slate-200 rounded-xl text-[9px] font-black text-rose-500 hover:bg-rose-50 uppercase tracking-widest active:scale-95 transition-all outline-none"
                        >
                            Salir
                        </button>
                    </div>
                    
                    <div className="flex-1 max-w-xl w-full flex items-center gap-4">
                        <div className="flex-1">
                            <div className="flex justify-between mb-2">
                                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                                    Paso {step} de 5
                                </span>
                                <span className="text-[10px] font-black uppercase text-cyan-500 tracking-widest">
                                    {Math.round((step / 5) * 100)}% Completado
                                </span>
                            </div>
                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-gradient-to-r from-cyan-500 via-sky-400 to-purple-500 transition-all duration-500 rounded-full"
                                    style={{ width: `${(step / 5) * 100}%` }}
                                />
                            </div>
                        </div>

                        <button 
                            onClick={async () => {
                                await signOut({ callbackUrl: '/login' });
                            }}
                            className="hidden sm:block px-4 py-2.5 border border-slate-200 hover:border-rose-100 rounded-xl text-[10px] font-black text-rose-500 hover:bg-rose-50 uppercase tracking-widest active:scale-95 transition-all outline-none"
                        >
                            Cerrar Sesión
                        </button>
                    </div>
                </div>
            )}

            {/* Main Content */}
            <main className="flex-1 max-w-3xl w-full mx-auto p-6 md:p-12">
                {step === 1 && (
                    <StepInfo data={data} setData={setData} onNext={handleNext} />
                )}
                {step === 2 && (
                    <StepVisual data={data} setData={setData} onNext={handleNext} onPrev={handlePrev} />
                )}
                {step === 3 && (
                    <StepType data={data} setData={setData} onNext={handleNext} onPrev={handlePrev} />
                )}
                {step === 4 && (
                    <StepService data={data} setData={setData} onNext={handleNext} onPrev={handlePrev} />
                )}
                {step === 5 && (
                    <StepHours data={data} setData={setData} onPrev={handlePrev} onSubmit={handleSubmit} saving={saving} />
                )}
                {step === 6 && (
                    <StepSuccess data={data} />
                )}
            </main>
        </div>
    );
}

// -- STEPS COMPONENTS --

function StepInfo({ data, setData, onNext }: any) {
    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter italic">Información del Negocio</h2>
                <p className="text-slate-500 font-medium">Cuéntanos lo básico para que tus clientes te encuentren.</p>
            </div>
            
            <div className="space-y-6 bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm">
                <div>
                    <label className="text-[11px] font-black uppercase text-slate-400 tracking-widest block mb-2">Nombre del Negocio</label>
                    <input 
                        type="text" 
                        className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-cyan-500 font-bold !text-slate-900 placeholder:!text-slate-400"
                        placeholder="Ej. Spa Bella"
                        value={data.nombre}
                        onChange={e => setData({...data, nombre: e.target.value})}
                    />
                </div>
                <div>
                    <label className="text-[11px] font-black uppercase text-slate-400 tracking-widest block mb-2">Descripción Corta</label>
                    <textarea 
                        className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-cyan-500 font-bold !text-slate-900 placeholder:!text-slate-400 resize-none h-24"
                        placeholder="El mejor lugar para relajarse..."
                        value={data.descripcion}
                        onChange={e => setData({...data, descripcion: e.target.value})}
                    />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-[11px] font-black uppercase text-slate-400 tracking-widest block mb-2">Teléfono (WhatsApp)</label>
                        <input 
                            type="text" 
                            className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-cyan-500 font-bold !text-slate-900 placeholder:!text-slate-400"
                            placeholder="+123456789"
                            value={data.telefono}
                            onChange={e => setData({...data, telefono: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="text-[11px] font-black uppercase text-slate-400 tracking-widest block mb-2">Ciudad</label>
                        <input 
                            type="text" 
                            className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-cyan-500 font-bold !text-slate-900 placeholder:!text-slate-400"
                            placeholder="Ej. Madrid"
                            value={data.ciudad}
                            onChange={e => setData({...data, ciudad: e.target.value})}
                        />
                    </div>
                </div>
                <div>
                    <label className="text-[11px] font-black uppercase text-slate-400 tracking-widest block mb-2">Dirección (Opcional)</label>
                    <input 
                        type="text" 
                        className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-cyan-500 font-bold !text-slate-900 placeholder:!text-slate-400"
                        placeholder="Calle Principal 123"
                        value={data.direccion}
                        onChange={e => setData({...data, direccion: e.target.value})}
                    />
                </div>
            </div>

            <div className="flex justify-end">
                <button 
                    onClick={onNext}
                    disabled={!data.nombre}
                    className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-purple-600 text-white rounded-2xl font-black uppercase tracking-widest hover:brightness-110 disabled:opacity-50 disabled:brightness-100 transition-all flex items-center gap-2 shadow-lg shadow-cyan-500/20"
                >
                    Continuar <ArrowRight size={18} />
                </button>
            </div>
        </div>
    );
}

function StepVisual({ data, setData, onNext, onPrev }: any) {
    const PRESETS_COLOR_PRINCIPAL = [
        { name: "Cian (CitiOx)", hex: "#06b6d4" },
        { name: "Violeta Premium", hex: "#7C3AED" },
        { name: "Azul Real", hex: "#2563EB" },
        { name: "Rosa Cita", hex: "#EC4899" },
        { name: "Terracota", hex: "#D97706" },
        { name: "Dark Onyx", hex: "#1E293B" }
    ];

    const PRESETS_COLOR_SECUNDARIO = [
        { name: "Hojas Oscuro", hex: "#112117" },
        { name: "Berenjena Oscuro", hex: "#1a102f" },
        { name: "Océano Profundo", hex: "#0b1528" },
        { name: "Medianoche", hex: "#020617" },
        { name: "Gris Carbón", hex: "#1e1e24" }
    ];

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter italic">Identidad Visual</h2>
                <p className="text-slate-500 font-medium">Sube tu logo, banner y define tus colores de marca para personalizar la página de tus clientes.</p>
            </div>

            <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                        <label className="text-[11px] font-black uppercase text-slate-400 tracking-widest block mb-4">Logo del Negocio</label>
                        <ImageUploader 
                            category="logo"
                            currentUrl={data.logoUrl}
                            onUploadSuccess={(media) => setData({...data, logoUrl: media.url, logoMediaId: media.id})}
                            onRemove={() => setData({...data, logoUrl: '', logoMediaId: ''})}
                            label="Sube tu logo (1:1 recomendado)"
                            aspect="square"
                        />
                    </div>

                    <div>
                        <label className="text-[11px] font-black uppercase text-slate-400 tracking-widest block mb-4">Banner Principal</label>
                        <ImageUploader 
                            category="banner"
                            currentUrl={data.bannerUrl}
                            onUploadSuccess={(media) => setData({...data, bannerUrl: media.url, bannerMediaId: media.id})}
                            onRemove={() => setData({...data, bannerUrl: '', bannerMediaId: ''})}
                            label="Sube tu banner (16:9 recomendado)"
                            aspect="landscape"
                        />
                    </div>
                </div>

                {/* Selección de colores corporativos */}
                <div className="border-t border-slate-100 pt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Color Primario */}
                    <div className="space-y-3 text-left">
                        <label className="text-[11px] font-black uppercase text-slate-400 tracking-widest block">Color Principal (Marca/Botones)</label>
                        <div className="flex gap-3">
                            <input 
                                type="color" 
                                value={data.colorPrimario || '#ec4899'} 
                                onChange={(e) => setData({ ...data, colorPrimario: e.target.value })} 
                                className="w-16 h-12 bg-transparent border-0 outline-none rounded-xl cursor-pointer shrink-0"
                            />
                            <input 
                                type="text" 
                                value={data.colorPrimario || '#ec4899'} 
                                onChange={(e) => setData({ ...data, colorPrimario: e.target.value })} 
                                className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs uppercase font-bold text-slate-900"
                            />
                        </div>
                        {/* Presets */}
                        <div className="flex flex-wrap gap-2 pt-1">
                            {PRESETS_COLOR_PRINCIPAL.map(p => (
                                <button 
                                    key={p.hex} 
                                    type="button"
                                    onClick={() => setData({ ...data, colorPrimario: p.hex })}
                                    className="size-6 rounded-full border border-white/10 relative" 
                                    style={{ backgroundColor: p.hex }}
                                    title={p.name}
                                >
                                    {data.colorPrimario === p.hex && (
                                        <div className="absolute inset-0 m-auto size-2 rounded-full bg-white shadow-sm" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Color Secundario */}
                    <div className="space-y-3 text-left">
                        <label className="text-[11px] font-black uppercase text-slate-400 tracking-widest block">Color Secundario (Barra inferior móvil)</label>
                        <div className="flex gap-3">
                            <input 
                                type="color" 
                                value={data.colorSecundario || '#112117'} 
                                onChange={(e) => setData({ ...data, colorSecundario: e.target.value })} 
                                className="w-16 h-12 bg-transparent border-0 outline-none rounded-xl cursor-pointer shrink-0"
                            />
                            <input 
                                type="text" 
                                value={data.colorSecundario || '#112117'} 
                                onChange={(e) => setData({ ...data, colorSecundario: e.target.value })} 
                                className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs uppercase font-bold text-slate-900"
                            />
                        </div>
                        {/* Presets */}
                        <div className="flex flex-wrap gap-2 pt-1">
                            {PRESETS_COLOR_SECUNDARIO.map(p => (
                                <button 
                                    key={p.hex} 
                                    type="button"
                                    onClick={() => setData({ ...data, colorSecundario: p.hex })}
                                    className="size-6 rounded-full border border-white/10 relative" 
                                    style={{ backgroundColor: p.hex }}
                                    title={p.name}
                                >
                                    {data.colorSecundario === p.hex && (
                                        <div className="absolute inset-0 m-auto size-2 rounded-full bg-white shadow-sm" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex justify-between">
                <button onClick={onPrev} className="px-8 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase tracking-widest hover:bg-slate-200 transition-all">Volver</button>
                <button 
                    onClick={onNext}
                    className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-purple-600 text-white rounded-2xl font-black uppercase tracking-widest hover:brightness-110 transition-all flex items-center gap-2 shadow-lg shadow-cyan-500/20"
                >
                    Continuar <ArrowRight size={18} />
                </button>
            </div>
        </div>
    );
}

function StepType({ data, setData, onNext, onPrev }: any) {
    const tipos = [
        'Spa', 'Barbería', 'Centro estético', 'Clínica', 
        'Gimnasio', 'Academia', 'Salón de belleza', 'Masajes', 'Otro'
    ];

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter italic">Tipo de Negocio</h2>
                <p className="text-slate-500 font-medium">Esto nos ayudará a personalizar tu experiencia y configurar tu sistema.</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {tipos.map(t => (
                    <button
                        key={t}
                        onClick={() => setData({...data, tipoNegocio: t})}
                        className={`p-6 rounded-[2rem] border-2 text-center font-black uppercase tracking-tighter italic transition-all duration-300 ${
                            data.tipoNegocio === t 
                            ? 'border-cyan-500 bg-cyan-50/50 text-cyan-700 shadow-md scale-105'
                            : 'border-slate-100 bg-white text-slate-400 hover:border-slate-300'
                        }`}
                    >
                        {t}
                    </button>
                ))}
            </div>

            <div className="flex justify-between mt-8">
                <button onClick={onPrev} className="px-8 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase tracking-widest hover:bg-slate-200 transition-all">Volver</button>
                <button 
                    onClick={onNext}
                    disabled={!data.tipoNegocio}
                    className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-purple-600 text-white rounded-2xl font-black uppercase tracking-widest hover:brightness-110 disabled:opacity-50 disabled:brightness-100 transition-all flex items-center gap-2 shadow-lg shadow-cyan-500/20"
                >
                    Continuar <ArrowRight size={18} />
                </button>
            </div>
        </div>
    );
}

function StepService({ data, setData, onNext, onPrev }: any) {
    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter italic">Tu Primer Servicio</h2>
                <p className="text-slate-500 font-medium">Puedes crearlo ahora o dejarlo para más tarde.</p>
            </div>

            <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm space-y-6">
                <div>
                    <label className="text-[11px] font-black uppercase text-slate-400 tracking-widest block mb-2">Nombre del Servicio</label>
                    <input 
                        type="text" 
                        className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-cyan-500 font-bold !text-slate-900 placeholder:!text-slate-400"
                        placeholder="Ej. Masaje Relajante"
                        value={data.servicioNombre}
                        onChange={e => setData({...data, servicioNombre: e.target.value})}
                    />
                </div>
                
                <div className="grid grid-cols-2 gap-6">
                    <div>
                        <label className="text-[11px] font-black uppercase text-slate-400 tracking-widest block mb-2">Duración (minutos)</label>
                        <select 
                            className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-cyan-500 font-bold !text-slate-900"
                            value={data.servicioDuracion}
                            onChange={e => setData({...data, servicioDuracion: e.target.value})}
                        >
                            <option value="15">15 min</option>
                            <option value="30">30 min</option>
                            <option value="45">45 min</option>
                            <option value="60">60 min</option>
                            <option value="90">90 min</option>
                            <option value="120">120 min</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-[11px] font-black uppercase text-slate-400 tracking-widest block mb-2">Precio ($)</label>
                        <input 
                            type="number" 
                            className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-cyan-500 font-bold !text-slate-900 placeholder:!text-slate-400"
                            placeholder="0.00"
                            value={data.servicioPrecio}
                            onChange={e => setData({...data, servicioPrecio: e.target.value})}
                        />
                    </div>
                </div>

                <div>
                    <label className="text-[11px] font-black uppercase text-slate-400 tracking-widest block mb-2">Descripción Corta</label>
                    <textarea 
                        className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-cyan-500 font-bold !text-slate-900 placeholder:!text-slate-400 resize-none h-20"
                        placeholder="Detalles del servicio..."
                        value={data.servicioDescripcion}
                        onChange={e => setData({...data, servicioDescripcion: e.target.value})}
                    />
                </div>

                {data.servicioNombre && (
                    <div className="border-t border-slate-100 pt-6">
                        <label className="text-[11px] font-black uppercase text-slate-400 tracking-widest block mb-4">Imagen del Servicio (Opcional)</label>
                        <ImageUploader
                            category="service"
                            currentUrl={data.servicioImageUrl}
                            onUploadSuccess={(media) => setData({...data, servicioImageUrl: media.url, servicioImageMediaId: media.id})}
                            onRemove={() => setData({...data, servicioImageUrl: '', servicioImageMediaId: ''})}
                            label="Sube una foto del servicio (16:9 recomendado)"
                            aspect="landscape"
                        />
                    </div>
                )}

                {!data.servicioNombre && (
                    <div className="bg-amber-50 p-4 rounded-xl flex items-start gap-3 border border-amber-100">
                        <AlertTriangle className="text-amber-500 shrink-0" size={20} />
                        <p className="text-[11px] text-amber-700 font-bold leading-tight">
                            No tienes servicios creados todavía. Puedes crearlos más tarde en el panel de control.
                        </p>
                    </div>
                )}
            </div>

            <div className="flex justify-between mt-8">
                <button onClick={onPrev} className="px-8 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase tracking-widest hover:bg-slate-200 transition-all">Volver</button>
                <button 
                    onClick={onNext}
                    className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-purple-600 text-white rounded-2xl font-black uppercase tracking-widest hover:brightness-110 transition-all flex items-center gap-2 shadow-lg shadow-cyan-500/20"
                >
                    {data.servicioNombre ? 'Crear y Continuar' : 'Omitir y Continuar'} <ArrowRight size={18} />
                </button>
            </div>
        </div>
    );
}

function StepHours({ data, setData, onPrev, onSubmit, saving }: any) {
    const DIAS_SEMANA = [
        { label: 'Lun', value: 1 },
        { label: 'Mar', value: 2 },
        { label: 'Mié', value: 3 },
        { label: 'Jue', value: 4 },
        { label: 'Vie', value: 5 },
        { label: 'Sáb', value: 6 },
        { label: 'Dom', value: 0 }
    ];

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter italic">Horarios de Atención</h2>
                <p className="text-slate-500 font-medium">Define tu horario general y los días de apertura.</p>
            </div>

            <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm space-y-8">
                <div className="flex items-center gap-4 bg-slate-50 p-6 rounded-2xl">
                    <Clock size={32} className="text-cyan-500" />
                    <div>
                        <p className="font-black text-slate-800 uppercase italic tracking-tighter">Configuración Horaria</p>
                        <p className="text-xs text-slate-500 font-medium">Estos horarios y días se aplicarán por defecto para las reservas de tus clientes.</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-8">
                    <div>
                        <label className="text-[11px] font-black uppercase text-slate-400 tracking-widest block mb-4">Hora de Apertura</label>
                        <input 
                            type="time" 
                            className="w-full px-6 py-5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-cyan-500 font-black text-2xl !text-slate-900 text-center"
                            value={data.horarioApertura}
                            onChange={e => setData({...data, horarioApertura: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="text-[11px] font-black uppercase text-slate-400 tracking-widest block mb-4">Hora de Cierre</label>
                        <input 
                            type="time" 
                            className="w-full px-6 py-5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-cyan-500 font-black text-2xl !text-slate-900 text-center"
                            value={data.horarioCierre}
                            onChange={e => setData({...data, horarioCierre: e.target.value})}
                        />
                    </div>
                </div>

                <div className="space-y-4 border-t border-slate-100 pt-6">
                    <label className="text-[11px] font-black uppercase text-slate-400 tracking-widest block">Días de Atención</label>
                    <p className="text-xs text-slate-500 font-medium">Selecciona los días en que tu negocio estará abierto para recibir reservas.</p>
                    <div className="grid grid-cols-7 gap-2">
                        {DIAS_SEMANA.map((dia) => {
                            const isActive = data.diasAtencion.includes(dia.value);
                            return (
                                <button
                                    key={dia.value}
                                    type="button"
                                    onClick={() => {
                                        let nuevosDias;
                                        if (isActive) {
                                            if (data.diasAtencion.length > 1) {
                                                nuevosDias = data.diasAtencion.filter((d: number) => d !== dia.value);
                                            } else {
                                                nuevosDias = data.diasAtencion;
                                            }
                                        } else {
                                            nuevosDias = [...data.diasAtencion, dia.value];
                                        }
                                        setData({ ...data, diasAtencion: nuevosDias });
                                    }}
                                    className={`py-3.5 px-1 rounded-2xl border-2 text-xs font-black tracking-tight text-center transition-all ${
                                        isActive
                                            ? 'border-cyan-500 bg-cyan-50/50 text-cyan-600 font-black shadow-sm'
                                            : 'border-slate-100 bg-slate-50 text-slate-400 hover:border-slate-200'
                                    }`}
                                >
                                    {dia.label}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className="flex justify-between mt-8">
                <button onClick={onPrev} className="px-8 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase tracking-widest hover:bg-slate-200 transition-all" disabled={saving}>Volver</button>
                <button 
                    onClick={onSubmit}
                    disabled={saving}
                    className="px-8 py-4 bg-gradient-to-r from-cyan-500 via-sky-500 to-purple-600 text-white rounded-2xl font-black uppercase tracking-widest hover:brightness-110 disabled:opacity-50 transition-all flex items-center gap-2 shadow-xl shadow-cyan-500/20"
                >
                    {saving ? 'Guardando...' : 'Finalizar Configuración'} <Check size={18} />
                </button>
            </div>
        </div>
    );
}

function StepSuccess({ data }: any) {
    const [publicUrl, setPublicUrl] = useState('');
    const [adminUrl, setAdminUrl] = useState('');

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const slug = data.slug || data.nombre.toLowerCase().replace(/\s+/g, '-');
            setPublicUrl(`${window.location.origin}/${slug}`);
            setAdminUrl(`${window.location.origin}/login`);
        }
    }, [data]);

    // Calculo rápido de completitud
    let completed = 2; // info basica y tipo negocio y horarios son obligatorios en el form
    let total = 6;
    
    if (data.logoUrl) completed++;
    if (data.bannerUrl) completed++;
    if (data.servicioNombre) completed++;
    if (data.telefono) completed++; // whatsapp

    const percentage = Math.round((completed / total) * 100);

    const waMessageText = `🎉 *¡Felicitaciones!* Has completado con éxito la configuración inicial de *${data.nombre}* en *CitiOx*.\n\nAquí tienes tus accesos rápidos para consultarlos en cualquier momento:\n\n🌐 *Página Pública (Clientes):*\n${publicUrl}\n\n💻 *Panel de Control:* \n${adminUrl}\n\n¡Listo para recibir citas! ⚡`;

    return (
        <div className="space-y-8 animate-in zoom-in-95 duration-700 max-w-xl mx-auto text-center pt-10">
            <div className="size-32 bg-cyan-50 rounded-full flex items-center justify-center mx-auto mb-8 border-[8px] border-cyan-100">
                <Sparkles size={48} className="text-cyan-500" />
            </div>

            <h2 className="text-5xl font-black text-slate-900 uppercase tracking-tighter italic">🎉 Tu negocio ya está listo para comenzar.</h2>
            
            <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-xl space-y-6 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-slate-100">
                    <div className="h-full bg-gradient-to-r from-cyan-500 to-purple-500" style={{ width: `${percentage}%` }}></div>
                </div>

                <div className="text-center space-y-2">
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em]">Estado de Configuración</p>
                    <p className="text-4xl font-black text-slate-800 uppercase italic tracking-tighter">{percentage}% <span className="text-2xl text-slate-400">Completado</span></p>
                    <p className="text-sm font-medium text-slate-500 mt-2">Completa los elementos restantes para aprovechar todo el potencial de la plataforma.</p>
                </div>

                <div className="pt-6 grid gap-4">
                    <a 
                        href={publicUrl || '#'} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="w-full py-4 bg-cyan-50 text-cyan-600 rounded-2xl font-black uppercase tracking-widest hover:bg-cyan-100 transition-all flex items-center justify-center gap-2 border border-cyan-200"
                    >
                        Ver mi página pública
                    </a>
                    
                    {data.telefono && (
                        <a 
                            href={`https://api.whatsapp.com/send?phone=${data.telefono.replace(/\D/g, "")}&text=${encodeURIComponent(waMessageText)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 active:scale-95"
                        >
                            <svg className="size-4 fill-current shrink-0" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.968C16.69 1.97 14.221.945 11.602.945 6.166.945 1.742 5.315 1.738 10.745c-.002 1.706.452 3.374 1.312 4.844l-.995 3.635 3.725-.972zm12.39-7.234c-.33-.165-1.956-.965-2.256-1.074-.3-.11-.52-.165-.74.165-.22.33-.85 1.074-1.04 1.293-.19.22-.38.24-.71.075-.33-.165-1.393-.513-2.653-1.637-.98-.874-1.643-1.953-1.835-2.284-.19-.33-.02-.508.145-.672.15-.148.33-.385.495-.578.165-.19.22-.33.33-.55.11-.22.05-.412-.025-.577-.075-.165-.74-1.789-1.015-2.45-.27-.648-.54-.56-.74-.57l-.63-.01c-.22 0-.58.08-.88.412-.3.33-1.15 1.127-1.15 2.748 0 1.62 1.18 3.19 1.345 3.41.165.22 2.32 3.54 5.62 4.966.78.337 1.39.539 1.864.69.786.25 1.5.215 2.065.13.63-.095 1.956-.8 2.235-1.57.28-.77.28-1.43.195-1.57-.085-.14-.3-.22-.63-.385z"/></svg>
                            Guardar datos por WhatsApp
                        </a>
                    )}

                    <Link href="/admin" className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-black transition-all flex items-center justify-center gap-2 shadow-lg">
                        Ir al Panel de Control <ChevronRight size={18} />
                    </Link>
                </div>
            </div>
        </div>
    );
}
