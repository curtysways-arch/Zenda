"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Clock, ArrowUpRight, Calendar } from 'lucide-react';

interface NextAppointmentBannerProps {
    appointment: any;
    slug: string;
    primaryColor: string;
}

export default function NextAppointmentBanner({ appointment, slug, primaryColor }: NextAppointmentBannerProps) {
    const [timeLeft, setTimeLeft] = useState<string>('');
    const [dayLabel, setDayLabel] = useState<string>('');

    useEffect(() => {
        const calculateTime = () => {
            const now = new Date();
            
            let dateStr = "";
            if (typeof appointment.fecha === 'string') {
                dateStr = appointment.fecha.split('T')[0];
            } else {
                dateStr = new Date(appointment.fecha).toISOString().split('T')[0];
            }
            
            const [year, month, day] = dateStr.split('-').map(Number);
            const [hours, minutes] = appointment.horaInicio.split(':').map(Number);
            
            const appDate = new Date(year, month - 1, day, hours, minutes, 0);
            const appDay = new Date(year, month - 1, day);
            const today = new Date();
            today.setHours(0,0,0,0);
            
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            if (appDay.getTime() === today.getTime()) {
                setDayLabel('Hoy');
            } else if (appDay.getTime() === tomorrow.getTime()) {
                setDayLabel('Mañana');
            } else {
                setDayLabel(appDay.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }));
            }

            const diff = appDate.getTime() - now.getTime();

            if (diff <= 0) {
                if (Math.abs(diff) < 3600000) {
                    setTimeLeft('¡ES AHORA!');
                } else {
                    setTimeLeft('FINALIZADA');
                }
                return;
            }

            const totalSeconds = Math.floor(diff / 1000);
            const d = Math.floor(totalSeconds / (3600 * 24));
            const h = Math.floor((totalSeconds % (3600 * 24)) / 3600);
            const m = Math.floor((totalSeconds % 3600) / 60);
            const s = totalSeconds % 60;

            if (d > 0) {
                setTimeLeft(`${d}d ${h}h ${m}m`);
            } else {
                setTimeLeft(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
            }
        };

        calculateTime();
        const timer = setInterval(calculateTime, 1000);
        return () => clearInterval(timer);
    }, [appointment]);

    return (
        <div className="fixed top-[80px] left-6 right-6 z-[45] animate-in slide-in-from-top-full duration-700">
            <Link 
                href={`/${slug}/mis-reservas?reservaId=${appointment.id}`}
                className="block overflow-hidden rounded-[2rem] shadow-2xl group border border-white/20 relative transition-all active:scale-[0.98]"
                style={{ backgroundColor: primaryColor }}
            >
                {/* Animated background highlights */}
                <div className="absolute inset-0 bg-gradient-to-r from-black/20 to-transparent" />
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full blur-3xl -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-1000" />
                
                <div className="relative z-10 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="size-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/30 shadow-inner group-hover:rotate-12 transition-transform">
                            <Clock size={20} className={timeLeft === '¡ES AHORA!' ? 'animate-pulse' : 'animate-in fade-in duration-1000'} />
                        </div>
                        <div className="flex flex-col">
                            <div className="flex items-center gap-2 text-white/70 leading-none mb-2">
                                <span className="text-[8px] font-black uppercase tracking-[0.3em]">{timeLeft.includes(':') ? 'Empieza en' : 'Faltan'}</span>
                                <div className="size-1 bg-white/40 rounded-full" />
                                <span className="text-[12px] font-black text-white tabular-nums tracking-widest animate-pulse">
                                    {timeLeft}
                                </span>
                            </div>
                            
                            <div className="flex flex-col gap-1.5">
                                <h4 className="text-[13px] font-black text-white leading-none uppercase italic tracking-tighter">
                                    {appointment.service?.nombre}
                                </h4>
                                
                                {appointment.extraServices && Array.isArray(appointment.extraServices) && appointment.extraServices.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                        {appointment.extraServices.map((extra: any, i: number) => (
                                            <div key={i} className="flex items-center gap-1.5 bg-black/20 px-2 py-0.5 rounded-md">
                                                <div className="size-1 bg-emerald-400 rounded-full" />
                                                <span className="text-[8px] font-black text-emerald-400 uppercase tracking-widest">
                                                    {extra.nombre}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                
                                {appointment.staff?.name && (
                                    <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-1.5 mt-0.5">
                                        {appointment.staff.name}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <div className="text-right flex flex-col items-end">
                            <p className="text-[8px] font-black text-white leading-none tracking-tighter bg-white/20 px-2 py-1 rounded-lg border border-white/10">{appointment.horaInicio}</p>
                            <p className="text-[7px] font-black text-white/50 uppercase tracking-widest leading-none mt-1.5">{dayLabel}</p>
                        </div>
                        <div className="size-9 rounded-full bg-white text-slate-900 flex items-center justify-center shadow-lg group-hover:translate-x-1 transition-all duration-300">
                            <ArrowUpRight size={18} />
                        </div>
                    </div>
                </div>
            </Link>
        </div>
    );
}
