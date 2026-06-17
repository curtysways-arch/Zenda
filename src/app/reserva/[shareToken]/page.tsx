import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { 
    Calendar, 
    Clock, 
    MapPin, 
    Trophy, 
    User, 
    CheckCircle2,
    DollarSign,
    ChevronLeft,
    CalendarCheck,
    Zap,
    Phone,
    ArrowRight
} from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function PublicReservationPage({
    params
}: {
    params: Promise<{ shareToken: string }>
}) {
    const { shareToken } = await params;

    const reserva = await prisma.reserva.findUnique({
        where: { shareToken },
        include: {
            negocio: true,
            cancha: true,
            cliente: true
        }
    });

    if (!reserva) {
        notFound();
    }

    const { negocio, cancha, cliente } = reserva;
    const fechaLegible = format(new Date(reserva.fecha), "EEEE d 'de' MMMM", { locale: es });
    
    // Color principal del negocio o default emerald
    const primaryColor = (negocio as any).colorPrimario || '#10b981';
    const secondaryColor = (negocio as any).colorSecundario || '#0f172a';

    return (
        <main className="min-h-screen bg-[#020617] text-slate-200 font-sans selection:bg-emerald-500/30 selection:text-emerald-400 pb-20 overflow-hidden">
            {/* Fondo Decorativo */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[600px] bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.08)_0%,transparent_70%)] pointer-events-none" />
            
            <div className="max-w-xl mx-auto px-6 pt-10 relative z-10 space-y-10">
                
                {/* Header / Logo del Negocio */}
                <div className="flex flex-col items-center gap-6 animate-in fade-in slide-in-from-top-4 duration-700">
                    <Link href={`/${negocio.slug}`} className="group relative">
                        {negocio.logoUrl ? (
                            <img 
                                src={negocio.logoUrl} 
                                alt={negocio.nombre} 
                                className="h-20 w-20 rounded-[2rem] object-cover bg-white/5 p-1 border border-white/10 shadow-2xl transition-transform group-hover:scale-105"
                            />
                        ) : (
                            <div className="size-20 rounded-[2rem] bg-emerald-500 flex items-center justify-center shadow-2xl border border-emerald-400/20 group-hover:scale-105 transition-transform">
                                <Trophy size={32} className="text-white" />
                            </div>
                        )}
                        <div className="absolute -bottom-2 -right-2 bg-emerald-500 p-2 rounded-xl shadow-xl border-2 border-[#020617]">
                            <CheckCircle2 size={14} className="text-white" />
                        </div>
                    </Link>
                    <div className="text-center space-y-1">
                        <h1 className="text-2xl font-black tracking-tighter text-white uppercase italic leading-none">{negocio.nombre}</h1>
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500/60 italic">Reserva Confirmada • ID: {reserva.id.slice(-6).toUpperCase()}</p>
                    </div>
                </div>

                {/* Card Principal de Reserva */}
                <div className="bg-white/5 backdrop-blur-3xl rounded-[3.5rem] border border-white/10 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
                    
                    {/* Header de la Card */}
                    <div className="p-10 border-b border-white/5 space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="size-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20">
                                <CalendarCheck size={28} strokeWidth={2.5} />
                            </div>
                            <div className="space-y-1">
                                <h2 className="text-4xl font-black text-white tracking-tighter uppercase italic leading-none">Detalles del <span className="text-emerald-500">Turno</span></h2>
                                <p className="text-[10px] font-black text-white/30 uppercase tracking-widest italic">Verifica la información de tu reserva</p>
                            </div>
                        </div>

                        {/* Info Grid */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white/[0.03] rounded-3xl p-6 border border-white/5 group hover:bg-white/[0.05] transition-colors">
                                <div className="flex items-center gap-2 mb-3 opacity-40">
                                    <Calendar size={14} />
                                    <span className="text-[8px] font-black uppercase tracking-widest">Fecha</span>
                                </div>
                                <p className="text-lg font-black text-white uppercase italic tracking-tighter leading-none">{fechaLegible}</p>
                            </div>
                            <div className="bg-white/[0.03] rounded-3xl p-6 border border-white/5 group hover:bg-white/[0.05] transition-colors">
                                <div className="flex items-center gap-2 mb-3 opacity-40">
                                    <Clock size={14} />
                                    <span className="text-[8px] font-black uppercase tracking-widest">Horario</span>
                                </div>
                                <p className="text-lg font-black text-white uppercase italic tracking-tighter leading-none">{reserva.horaInicio} - {reserva.horaFin}</p>
                            </div>
                        </div>
                    </div>

                    {/* Cuerpo de la Card */}
                    <div className="p-10 space-y-10">
                        
                        {/* Cancha y Ubicación */}
                        <div className="space-y-8">
                            <div className="flex items-start gap-5">
                                <div className="size-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500 border border-blue-500/20 shrink-0">
                                    <Zap size={24} fill="currentColor" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-white/30 uppercase tracking-widest block italic">Lugar</label>
                                    <h3 className="text-2xl font-black text-white uppercase tracking-tighter italic leading-none">{cancha.nombre}</h3>
                                    <p className="text-sm font-medium text-white/60">{cancha.tipo || 'Cancha de Fútbol'}</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-5">
                                <div className="size-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/20 shrink-0">
                                    <User size={24} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-white/30 uppercase tracking-widest block italic">A nombre de</label>
                                    <h3 className="text-2xl font-black text-white uppercase tracking-tighter italic leading-none">{cliente.nombre}</h3>
                                </div>
                            </div>
                        </div>

                        {/* Total y Pago */}
                        {negocio.mostrarPrecios !== false && (
                            <div className="bg-emerald-500/5 rounded-[2.5rem] p-8 border border-emerald-500/10 flex items-center justify-between group overflow-hidden relative">
                                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 via-emerald-500/5 to-emerald-500/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                                <div className="space-y-1 relative z-10">
                                    <label className="text-[10px] font-black text-emerald-500/60 uppercase tracking-widest block italic">Valor del Turno</label>
                                    <p className="text-5xl font-black text-emerald-500 tracking-tighter italic leading-none">${Number(reserva.total).toLocaleString('es-ES')}</p>
                                </div>
                                <div className="relative z-10 text-right">
                                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-500/20 scale-90 md:scale-100">
                                        <span className="text-[10px] font-black uppercase tracking-widest italic">Confirmado</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer de la Card / CTA */}
                    <div className="p-4 bg-white/5 border-t border-white/5">
                        <Link 
                            href={`https://wa.me/${negocio.telefono?.replace(/\D/g, '')}`}
                            target="_blank"
                            className="w-full py-6 flex items-center justify-center gap-3 text-[11px] font-black uppercase tracking-[0.3em] text-white/40 hover:text-white transition-all group"
                        >
                            <Phone size={16} className="group-hover:text-emerald-500 transition-colors" />
                            Contacto del Complejo
                            <ArrowRight size={16} className="group-hover:translate-x-2 transition-transform opacity-0 group-hover:opacity-100" />
                        </Link>
                    </div>
                </div>

                {/* Botones de Acción Secundarios */}
                <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-500">
                    <Link 
                        href={`/${negocio.slug}`}
                        className="w-full py-8 bg-white text-slate-900 rounded-[2.5rem] text-[11px] font-black uppercase tracking-[0.4em] hover:bg-slate-100 transition-all text-center flex items-center justify-center gap-4 shadow-2xl italic group"
                    >
                        Ver Más Canchas
                        <ChevronLeft size={20} className="rotate-180 group-hover:translate-x-2 transition-transform" />
                    </Link>
                    <p className="text-center text-white/20 text-[9px] font-black uppercase tracking-[0.5em] italic">Potenciado por Antigravity Cancha</p>
                </div>

            </div>
        </main>
    );
}
