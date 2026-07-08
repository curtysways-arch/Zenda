'use client';

import { useState, useEffect } from 'react';
import { Award, Sparkles, X, Trophy, Coins } from 'lucide-react';

interface LoyaltyCelebrationProps {
    slug: string;
    primaryColor: string;
}

export default function LoyaltyCelebration({ slug, primaryColor }: LoyaltyCelebrationProps) {
    const [celebrationData, setCelebrationData] = useState<{
        id: string;
        puntos: number;
        servicioNombre: string;
    } | null>(null);
    const [show, setShow] = useState(false);
    const [confetti, setConfetti] = useState<any[]>([]);

    useEffect(() => {
        const checkLoyaltyCelebrations = async () => {
            try {
                const res = await fetch(`/api/${slug}/referrals/me`);
                if (!res.ok) return;
                
                const data = await res.json();
                if (!data || !data.citasPuntosRecientes || data.citasPuntosRecientes.length === 0) return;

                // Leer acumulaciones ya celebradas
                const celebratedStr = localStorage.getItem(`celebrated_points_${slug}`);
                let celebratedIds: string[] = [];
                if (celebratedStr) {
                    try {
                        celebratedIds = JSON.parse(celebratedStr);
                    } catch (e) {
                        celebratedIds = [];
                    }
                }

                // Encontrar la primera acumulación reciente no celebrada
                const uncelebrated = data.citasPuntosRecientes.find(
                    (pt: any) => !celebratedIds.includes(pt.id)
                );

                if (uncelebrated) {
                    setCelebrationData({
                        id: uncelebrated.id,
                        puntos: uncelebrated.puntos,
                        servicioNombre: uncelebrated.servicioNombre
                    });
                    
                    // Generar confeti de colores
                    const confetiArray = Array.from({ length: 45 }).map((_, i) => ({
                        id: i,
                        x: Math.random() * 100, // porcentaje horizontal
                        y: -10 - Math.random() * 20, // porcentaje vertical inicial
                        size: 6 + Math.random() * 10, // tamaño en px
                        color: ['#ff007f', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', primaryColor][i % 6],
                        delay: Math.random() * 3, // retardo de animación
                        duration: 3 + Math.random() * 3, // duración de caída
                        shape: i % 3 === 0 ? 'circle' : (i % 3 === 1 ? 'square' : 'triangle')
                    }));
                    setConfetti(confetiArray);
                    setShow(true);
                }
            } catch (err) {
                console.error("Error al validar celebraciones de fidelización:", err);
            }
        };

        // Pequeño retardo para dar tiempo a la carga general de la app
        const timer = setTimeout(() => {
            checkLoyaltyCelebrations();
        }, 1500);

        return () => clearTimeout(timer);
    }, [slug, primaryColor]);

    const handleDismiss = () => {
        if (!celebrationData) return;
        
        // Registrar como celebrado
        const celebratedStr = localStorage.getItem(`celebrated_points_${slug}`);
        let celebratedIds: string[] = [];
        if (celebratedStr) {
            try {
                celebratedIds = JSON.parse(celebratedStr);
            } catch (e) {}
        }
        
        if (!celebratedIds.includes(celebrationData.id)) {
            celebratedIds.push(celebrationData.id);
            localStorage.setItem(`celebrated_points_${slug}`, JSON.stringify(celebratedIds));
        }

        setShow(false);
        setTimeout(() => {
            setCelebrationData(null);
            setConfetti([]);
        }, 400); // Dar tiempo a la animación de salida
    };

    if (!show || !celebrationData) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-300">
            
            {/* Animación Confeti */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
                {confetti.map((c) => (
                    <div 
                        key={c.id}
                        className={`absolute animate-fall ${
                            c.shape === 'circle' ? 'rounded-full' : (c.shape === 'square' ? '' : 'clip-triangle')
                        }`}
                        style={{
                            left: `${c.x}%`,
                            top: `${c.y}%`,
                            width: `${c.size}px`,
                            height: `${c.size}px`,
                            backgroundColor: c.color,
                            animationDelay: `${c.delay}s`,
                            animationDuration: `${c.duration}s`,
                            animationIterationCount: 'infinite',
                            transform: `rotate(${Math.random() * 360}deg)`
                        }}
                    />
                ))}
            </div>

            {/* Modal de lujo */}
            <div className="relative w-full max-w-[340px] bg-white rounded-[2.5rem] p-6 shadow-2xl text-center space-y-5 border border-slate-100/50 z-20 animate-in zoom-in-95 duration-300 relative overflow-hidden">
                
                {/* Efectos de brillo de fondo */}
                <div 
                    className="absolute -top-10 -left-10 size-32 rounded-full filter blur-[40px] opacity-25"
                    style={{ backgroundColor: primaryColor }}
                />
                <div 
                    className="absolute -bottom-10 -right-10 size-32 rounded-full filter blur-[40px] opacity-20"
                    style={{ backgroundColor: '#f59e0b' }}
                />

                {/* Botón cerrar */}
                <button 
                    onClick={handleDismiss}
                    className="absolute top-4 right-4 size-8 bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-full flex items-center justify-center text-slate-500 transition-colors"
                >
                    <X size={14} strokeWidth={2.5} />
                </button>

                {/* Cabecera animada / Monedas */}
                <div className="pt-6 relative flex flex-col items-center">
                    <div className="relative size-20 rounded-full bg-amber-50 border border-amber-100/30 flex items-center justify-center text-amber-500 shrink-0 shadow-inner animate-bounce">
                        <Coins size={36} className="text-amber-500 animate-pulse" />
                        <div className="absolute -top-1 -right-1 size-6 rounded-full bg-pink-500 text-white flex items-center justify-center shadow-md animate-pulse">
                            <Sparkles size={12} />
                        </div>
                    </div>
                </div>

                {/* Textos del Modal */}
                <div className="space-y-2">
                    <span 
                        className="inline-flex items-center gap-1 text-[8px] font-black tracking-widest uppercase px-3 py-1 rounded-full text-white shadow-sm"
                        style={{ backgroundColor: primaryColor }}
                    >
                        Visita Completada
                    </span>
                    <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                        ¡Gracias por tu visita!
                    </h3>
                    <div className="py-2.5 px-4 bg-slate-50 rounded-2xl border border-slate-100 inline-block w-full">
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Has acumulado</p>
                        <p className="text-3xl font-black text-amber-500 tracking-tight">
                            +{celebrationData.puntos} PTS
                        </p>
                        <p className="text-[9px] text-slate-500 font-semibold mt-1">
                            por realizarte: <strong className="text-slate-700 uppercase">{celebrationData.servicioNombre}</strong>
                        </p>
                    </div>
                </div>

                <p className="text-[10px] text-slate-400 font-semibold leading-relaxed px-2">
                    Tus puntos ya están sumados a tu balance y listos para canjearlos por espectaculares premios en la pestaña del Club.
                </p>

                {/* Botón Aceptar */}
                <button 
                    onClick={handleDismiss}
                    className="w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-white shadow-lg flex items-center justify-center gap-1.5 hover:brightness-105 active:scale-[0.99] transition-all"
                    style={{ backgroundColor: primaryColor }}
                >
                    ¡Genial, gracias!
                </button>
            </div>

            {/* Estilos CSS inline específicos para animar caída de confeti */}
            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes fall {
                    0% {
                        transform: translateY(0) rotate(0deg);
                        opacity: 1;
                    }
                    70% {
                        opacity: 1;
                    }
                    100% {
                        transform: translateY(110vh) rotate(720deg);
                        opacity: 0;
                    }
                }
                .animate-fall {
                    animation: fall linear infinite;
                }
                .clip-triangle {
                    clip-path: polygon(50% 0%, 0% 100%, 100% 100%);
                }
                `
            }} />
        </div>
    );
}
