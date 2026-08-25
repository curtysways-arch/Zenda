"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
    Calendar,
    ChevronLeft,
    Phone,
    Key,
    Loader2,
    Clock,
    CheckCircle2,
    XCircle,
    ArrowRight,
    Trophy,
    MessageCircle,
    Users,
    Settings,
    X,
    Search,
    Plus,
    MapPin,
    Hash,
    ExternalLink,
    AlertCircle,
    Copy,
    Navigation,
    Share2,
    Zap
} from "lucide-react";
import Link from "next/link";
import PhoneInput from "@/components/ui/PhoneInput";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

type TabType = 'reservas' | 'cursos';
type FilterType = 'proximas' | 'pasadas';

export default function CanchaMisReservas({ negocio: propNegocio }: { negocio?: any }) {
    const params = useParams();
    const slug = (params.slug as string) || 'demo-canchas';
    const router = useRouter();
    const searchParams = useSearchParams();

    const [step, setStep] = useState<'phone' | 'otp' | 'history'>('phone');
    const [activeTab, setActiveTab] = useState<TabType>('reservas');
    const [filter, setFilter] = useState<FilterType>('proximas');
    
    useEffect(() => {
        const tab = searchParams.get('tab');
        if (tab === 'academia' || tab === 'cursos') {
            setActiveTab('cursos');
        } else {
            setActiveTab('reservas');
        }
    }, [searchParams]);
    
    const [telefono, setTelefono] = useState("");
    const [code, setCode] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [countdown, setCountdown] = useState(0);
    const [reservas, setReservas] = useState<any[]>([]);
    const [cliente, setCliente] = useState<any>(null);
    const [negocio, setNegocio] = useState<any>(propNegocio || null);
    const [pendingModal, setPendingModal] = useState<any>(null);
    
    const otpInputRef = useRef<HTMLInputElement>(null);

    const { proximas, pasadas, resMasCercana, otrasProximas } = useMemo(() => {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const todayStr = `${year}-${month}-${day}`;

        const prox: any[] = [];
        const past: any[] = [];
        
        reservas.forEach(res => {
            const pureDatePart = typeof res.fecha === 'string' 
                ? res.fecha.split('T')[0] 
                : new Date(res.fecha).toISOString().split('T')[0];

            const isInvalidStatus = ['cancelled', 'rejected', 'expired'].includes(res.estado);
            const isTodayOrFuture = pureDatePart >= todayStr;

            if (isTodayOrFuture && !isInvalidStatus) {
                prox.push(res);
            } else {
                past.push(res);
            }
        });

        const sortedProx = [...prox].sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
        const sortedPast = [...past].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

        const masCercana = sortedProx.length > 0 ? sortedProx[0] : null;
        const otras = sortedProx.length > 1 ? sortedProx.slice(1) : [];

        return { proximas: sortedProx, pasadas: sortedPast, resMasCercana: masCercana, otrasProximas: otras };
    }, [reservas]);

    useEffect(() => {
        const checkSession = async () => {
            try {
              const res = await fetch(`/api/${slug}/reservas-cliente`);
              if (res.ok) {
                  const data = await res.json();
                  setReservas(data);
                  const resPerfil = await fetch(`/api/${slug}/perfil`);
                  if (resPerfil.ok) {
                      const dataPerfil = await resPerfil.json();
                      if (dataPerfil) setCliente(dataPerfil);
                  }
                  setStep('history');
              }
            } catch (err) {}
        };

        const fetchBusiness = async () => {
            if (propNegocio) return;
            try {
                const res = await fetch(`/api/public/negocio/${slug}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data) setNegocio(data);
                }
            } catch (e) {
                console.error("Error fetching business info:", e);
            }
        };

        checkSession();
        fetchBusiness();
    }, [slug, propNegocio]);

    useEffect(() => {
        let timer: any;
        if (countdown > 0) {
            timer = setInterval(() => setCountdown(prev => prev - 1), 1000);
        }
        return () => clearInterval(timer);
    }, [countdown]);
    
    useEffect(() => {
        if (step === 'otp') {
            otpInputRef.current?.focus();
        }
    }, [step]);

    const handleSendOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            const res = await fetch(`/api/${slug}/otp/send`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ telefono }),
            });
            const data = await res.json();
            if (res.ok) {
                setStep('otp');
                setCountdown(300);
            } else {
                setError(data.error);
            }
        } catch (err) {
            setError("Error de conexión. Intenta de nuevo.");
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            const res = await fetch(`/api/${slug}/otp/verify`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ telefono, code }),
            });
            if (res.ok) {
                await fetchHistory();
            } else {
                const data = await res.json();
                setError(data.error || "Código incorrecto");
                setLoading(false);
            }
        } catch (err) {
            setError("Error de conexión al verificar el código.");
            setLoading(false);
        }
    };

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const resReservas = await fetch(`/api/${slug}/reservas-cliente`);
            const dataReservas = await resReservas.json();
            const resPerfil = await fetch(`/api/${slug}/perfil`);
            const dataPerfil = resPerfil.ok ? await resPerfil.json() : null;
            if (resReservas.ok) {
                setReservas(dataReservas);
                setCliente(dataPerfil);
                setStep('history');
            } else {
                setStep('phone');
                setError(dataReservas.error || "No pudimos acceder a tu perfil.");
            }
        } catch (err) {
            setError("Error al conectar con tu cuenta de usuario.");
        } finally {
            setLoading(false);
        }
    };

    const handleManageReserva = (res: any) => {
        const lowerEstado = res.estado?.toLowerCase();
        if (lowerEstado === 'pendiente' || lowerEstado === 'pending') {
            setPendingModal(res);
            return;
        }

        if (res.sharedMatch?.share_code) {
            router.push(`/partido/${res.sharedMatch.share_code}`);
        } else {
            alert("Reserva confirmada. Puedes gestionarla llamando a recepción.");
        }
    };

    const getStatusStyles = (estado: string) => {
        const lowerEstado = estado?.toLowerCase();
        switch (lowerEstado) {
            case 'confirmed':
            case 'confirmada':
                return 'bg-emerald-500 text-white border-emerald-400';
            case 'pending':
            case 'pendiente':
                return 'bg-amber-500 text-slate-950 border-amber-400';
            default:
                return 'bg-rose-500 text-white border-rose-400';
        }
    };

    return (
        <div className="min-h-screen bg-[#07090f] text-white font-sans selection:bg-emerald-500/30 overflow-x-hidden">
            {/* Header Sticky */}
            <header className="fixed top-0 left-0 right-0 z-[100] bg-[#07090f]/80 backdrop-blur-xl border-b border-white/5 h-14 flex items-center px-4">
                <div className="max-w-xl mx-auto w-full flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <button onClick={() => router.back()} className="size-8 rounded-full p-0.5 bg-gradient-to-tr from-emerald-500 to-blue-500 active:scale-95 transition-all outline-none">
                            <div className="size-full rounded-full bg-[#07090f] flex items-center justify-center overflow-hidden">
                                <ChevronLeft size={16} strokeWidth={3} className="text-emerald-400 relative right-[1px]" />
                            </div>
                        </button>
                        <h1 className="text-xs font-black text-white uppercase italic tracking-widest">
                            {negocio?.nombre || 'MIS RESERVAS'}
                        </h1>
                    </div>
                </div>
            </header>

            <main className="max-w-xl mx-auto px-6 pt-24 pb-32">
                {step === 'phone' && (
                    <div className="space-y-8 animate-in fade-in duration-500 text-left">
                        <div className="space-y-2">
                            <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter">MIS RESERVAS</h2>
                            <p className="text-slate-400 text-xs font-bold">Ingresa tu número de WhatsApp para consultar tus partidos y reservas.</p>
                        </div>
                        <form onSubmit={handleSendOtp} className="space-y-4">
                            <PhoneInput value={telefono} onChange={setTelefono} />
                            {error && <p className="text-rose-400 text-xs font-bold">{error}</p>}
                            <button type="submit" disabled={loading || !telefono} className="w-full h-14 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-widest rounded-2xl active:scale-95 transition-all shadow-lg shadow-emerald-500/20">
                                {loading ? <Loader2 className="animate-spin mx-auto" /> : "CONTINUAR"}
                            </button>
                        </form>
                    </div>
                )}

                {step === 'otp' && (
                    <div className="space-y-8 animate-in fade-in duration-500 text-left">
                        <div className="space-y-2">
                            <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter">CÓDIGO DE VERIFICACIÓN</h2>
                            <p className="text-slate-400 text-xs font-bold">Enviamos un código de 6 dígitos a tu WhatsApp {telefono}.</p>
                        </div>
                        <form onSubmit={handleVerifyOtp} className="space-y-6">
                            <input ref={otpInputRef} type="text" maxLength={6} placeholder="000000" className="w-full h-16 bg-[#11141d] border border-white/10 rounded-2xl px-6 text-center text-3xl font-black italic tracking-widest text-white outline-none focus:border-emerald-500" value={code} onChange={(e) => setCode(e.target.value)} />
                            {error && <p className="text-rose-400 text-xs font-bold">{error}</p>}
                            <button type="submit" disabled={loading || code.length < 6} className="w-full h-14 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-widest rounded-2xl active:scale-95 transition-all shadow-lg shadow-emerald-500/20">
                                {loading ? <Loader2 className="animate-spin mx-auto" /> : "VERIFICAR CÓDIGO"}
                            </button>
                        </form>
                    </div>
                )}

                {step === 'history' && (
                    <div className="space-y-6 animate-in fade-in duration-500 text-left">
                        {/* Selector Dual: RESERVAS vs ACADEMIA */}
                        <div className="grid grid-cols-2 gap-2 bg-[#11141d] p-1.5 rounded-2xl border border-white/5">
                            <button onClick={() => setActiveTab('reservas')} className={cn("py-3 rounded-xl font-black text-xs uppercase tracking-widest italic transition-all", activeTab === 'reservas' ? "bg-emerald-500 text-slate-950 shadow-md" : "text-slate-400")}>
                                RESERVAS
                            </button>
                            <button onClick={() => setActiveTab('cursos')} className={cn("py-3 rounded-xl font-black text-xs uppercase tracking-widest italic transition-all", activeTab === 'cursos' ? "bg-emerald-500 text-slate-950 shadow-md" : "text-slate-400")}>
                                ACADEMIA
                            </button>
                        </div>

                        {activeTab === 'reservas' && (
                            <div className="space-y-6">
                                <div className="flex gap-2">
                                    <button onClick={() => setFilter('proximas')} className={cn("px-4 py-2 rounded-xl text-xs font-black uppercase italic border transition-all", filter === 'proximas' ? "text-emerald-400 border-emerald-500/40 bg-emerald-500/10" : "text-slate-500 border-transparent")}>
                                        PRÓXIMAS
                                    </button>
                                    <button onClick={() => setFilter('pasadas')} className={cn("px-4 py-2 rounded-xl text-xs font-black uppercase italic border transition-all", filter === 'pasadas' ? "text-emerald-400 border-emerald-500/40 bg-emerald-500/10" : "text-slate-500 border-transparent")}>
                                        PASADAS
                                    </button>
                                </div>

                                {filter === 'proximas' ? (
                                    <div className="space-y-4">
                                        {resMasCercana ? (
                                            <div onClick={() => handleManageReserva(resMasCercana)} className="bg-[#11141d] rounded-3xl p-6 border border-white/10 space-y-4 cursor-pointer hover:border-emerald-500/40 transition-all shadow-xl">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest italic">RESERVA PRÓXIMA</span>
                                                        <h4 className="text-xl font-black text-white uppercase italic mt-1">{resMasCercana.cancha?.nombre || 'Cancha Sports'}</h4>
                                                    </div>
                                                    <span className="text-xl font-black text-emerald-400">${resMasCercana.total}</span>
                                                </div>
                                                <div className="space-y-2 text-xs font-bold text-slate-300">
                                                    <div className="flex items-center gap-2"><Calendar size={14} className="text-emerald-400" /><span>{resMasCercana.fecha?.split('T')[0]}</span></div>
                                                    <div className="flex items-center gap-2"><Clock size={14} className="text-emerald-400" /><span>{resMasCercana.horaInicio} - {resMasCercana.horaFin}</span></div>
                                                </div>
                                                <button className="w-full py-3.5 bg-emerald-500 text-slate-950 rounded-2xl font-black text-xs uppercase tracking-widest italic flex items-center justify-center gap-2">
                                                    Gestionar Convocatoria <ArrowRight size={16} />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="py-16 text-center bg-[#11141d] rounded-3xl border border-dashed border-white/10 space-y-2">
                                                <Trophy size={36} className="mx-auto text-slate-600" />
                                                <p className="text-xs font-black text-slate-400 uppercase italic tracking-widest">Sin compromisos programados</p>
                                            </div>
                                        )}

                                        {otrasProximas.map(res => (
                                            <div key={res.id} onClick={() => handleManageReserva(res)} className="bg-[#11141d] rounded-2xl p-4 border border-white/5 flex items-center justify-between cursor-pointer hover:border-emerald-500/20">
                                                <div>
                                                    <h5 className="font-black text-white uppercase italic text-sm">{res.cancha?.nombre}</h5>
                                                    <p className="text-[10px] font-bold text-slate-400 mt-0.5">{res.fecha?.split('T')[0]} | {res.horaInicio}</p>
                                                </div>
                                                <span className="text-xs font-black text-emerald-400">${res.total}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {pasadas.map(res => (
                                            <div key={res.id} className="bg-[#11141d]/50 rounded-2xl p-4 border border-white/5 flex items-center justify-between opacity-70">
                                                <div>
                                                    <h5 className="font-black text-white uppercase italic text-sm">{res.cancha?.nombre}</h5>
                                                    <p className="text-[10px] font-bold text-slate-500 mt-0.5">{res.fecha?.split('T')[0]} | {res.horaInicio}</p>
                                                </div>
                                                <span className="text-xs font-black text-slate-400">${res.total}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'cursos' && (
                            <div className="space-y-4">
                                <div className="py-16 text-center bg-[#11141d] rounded-3xl border border-dashed border-white/10 space-y-2">
                                    <Trophy size={36} className="mx-auto text-emerald-500" />
                                    <p className="text-xs font-black text-white uppercase italic tracking-widest">Inscripciones de Academia</p>
                                    <p className="text-[10px] font-bold text-slate-400 max-w-xs mx-auto">Tus cursos de pádel, tenis y entrenamiento inscritos aparecerán aquí.</p>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </main>

            {/* Floating Action Button */}
            <Link href={`/${slug}`} className="fixed bottom-6 right-6 size-14 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-transform z-50">
                <Plus size={28} strokeWidth={3} />
            </Link>
        </div>
    );
}
