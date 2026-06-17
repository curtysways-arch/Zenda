'use client';

import { useState, useEffect } from 'react';
import { 
    DollarSign, 
    Calendar, 
    ArrowLeft, 
    TrendingUp, 
    ChevronRight, 
    Search,
    Filter,
    ArrowDownCircle,
    ArrowUpCircle,
    Clock,
    User,
    Sparkles,
    Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

export default function RecaudadoPage() {
    const router = useRouter();
    const [filter, setFilter] = useState<'day' | 'week' | 'month'>('month');
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const fetchFinance = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/finance?filter=${filter}`);
            if (res.ok) {
                const d = await res.json();
                setData(d);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFinance();
    }, [filter]);

    return (
        <div className="flex flex-col min-h-screen bg-slate-50 animate-in fade-in duration-500 pb-32">
            {/* 🔝 NAVIGATION BAR */}
            <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-100 px-4 py-4 flex items-center justify-between">
                <button 
                    onClick={() => router.back()}
                    className="size-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 active:scale-90 transition-all"
                >
                    <ArrowLeft size={20} />
                </button>
                <div className="text-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none italic">Finanzas Pro</p>
                    <p className="text-xs font-black text-slate-900 mt-1 uppercase italic">Ingresos Recaudados</p>
                </div>
                <div className="size-10" /> {/* Spacer */}
            </div>

            <div className="p-5 space-y-8">
                {/* 🎚️ FILTER SELECTOR */}
                <div className="flex bg-white p-2 rounded-[2rem] border border-slate-100 shadow-sm gap-1">
                    {(['day', 'week', 'month'] as const).map((f) => (
                        <button 
                            key={f}
                            onClick={() => setFilter(f)}
                            className={cn(
                                "flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all",
                                filter === f ? "bg-slate-900 text-white shadow-lg" : "text-slate-400"
                            )}
                        >
                            {f === 'day' ? 'Hoy' : f === 'week' ? 'Semana' : 'Mes'}
                        </button>
                    ))}
                </div>

                {/* 💰 TOTAL CARD */}
                <div className="bg-slate-900 rounded-[3rem] p-10 text-white relative overflow-hidden shadow-2xl">
                    <div className="absolute -top-10 -right-10 w-48 h-48 bg-emerald-500/10 rounded-full blur-[60px]" />
                    <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-blue-500/10 rounded-full blur-[60px]" />
                    
                    <div className="relative z-10 text-center space-y-2">
                        <div className="size-14 rounded-2xl bg-white/10 flex items-center justify-center mx-auto mb-6">
                            <DollarSign size={32} className="text-emerald-400" />
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40 italic">Total Recaudado</p>
                        <h2 className="text-7xl font-black italic tracking-tighter leading-none !text-white mt-4 drop-shadow-xl">
                            ${data?.total || 0}
                        </h2>
                        {loading && (
                            <div className="flex items-center justify-center gap-2 mt-4">
                                <Loader2 size={12} className="animate-spin text-emerald-400" />
                                <span className="text-[8px] font-black uppercase tracking-widest text-white/30">Actualizando...</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* 📋 PAYMENTS LIST */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 italic">Desglose de Ingresos</h3>
                        <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest bg-white px-3 py-1 rounded-full border border-slate-100 shadow-sm">
                            {data?.payments?.length || 0} Tránsitos
                        </span>
                    </div>

                    <div className="space-y-3">
                        {loading ? (
                            Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="h-24 bg-white rounded-[2rem] border border-slate-100 animate-pulse" />
                            ))
                        ) : data?.payments?.length > 0 ? (
                            data.payments.map((pago: any) => (
                                <div 
                                    key={pago.id}
                                    className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm flex items-center justify-between group active:scale-[0.98] transition-all"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={cn(
                                            "size-12 rounded-2xl flex items-center justify-center text-emerald-600 font-black italic",
                                            pago.metodo === 'EFECTIVO' ? "bg-emerald-50" : "bg-blue-50 text-blue-600"
                                        )}>
                                            {pago.metodo === 'EFECTIVO' ? '$' : 'T'}
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-slate-900 uppercase italic leading-none mb-1">
                                                {pago.appointment?.cliente?.nombre || 'Cliente'}
                                            </p>
                                            <div className="flex items-center gap-2 text-[9px] font-black text-slate-300 uppercase tracking-widest italic">
                                                <span>{format(new Date(pago.fecha), 'd MMM, HH:mm', { locale: es })}</span>
                                                <div className="size-1 rounded-full bg-slate-200" />
                                                <span className="text-emerald-500/60">{pago.metodo}</span>
                                            </div>
                                            <p className="text-[8px] font-bold text-slate-400 mt-1 uppercase">
                                                {pago.appointment?.service?.nombre || 'Servicio'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-2xl font-black text-slate-900 italic tracking-tighter leading-none">${pago.monto}</p>
                                        {pago.referencia && (
                                            <p className="text-[8px] font-black text-slate-300 mt-1 uppercase tracking-tighter">REF: {pago.referencia}</p>
                                        )}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-20 bg-white border-2 border-dashed border-slate-100 rounded-[3rem] text-center space-y-4">
                                <div className="size-16 rounded-full bg-slate-50 flex items-center justify-center mx-auto text-slate-200">
                                    <Clock size={32} />
                                </div>
                                <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">No hay ingresos registrados en este periodo</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* 📈 INSIGHTS CARD */}
                <div className="p-8 rounded-[3rem] bg-emerald-50 border border-emerald-100 text-emerald-800 space-y-4">
                    <TrendingUp size={24} className="text-emerald-500" />
                    <h4 className="text-lg font-black uppercase italic tracking-tighter leading-tight">Tu negocio crece</h4>
                    <p className="text-[9px] font-bold uppercase tracking-widest leading-relaxed opacity-70">
                        {filter === 'month' ? 'Este mes has superado el promedio de ingresos semanales. Mantén el ritmo.' : 
                         filter === 'week' ? 'La semana está siendo productiva. Tienes 4 citas pendientes por cobrar.' :
                         'Hoy es un buen día para registrar todos tus ingresos en efectivo.'}
                    </p>
                </div>
            </div>
        </div>
    );
}
