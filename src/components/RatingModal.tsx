'use client';

import { useState } from 'react';
import { Star, X, MessageSquare, Send, CheckCircle2, Sparkles, Heart } from 'lucide-react';
import { clsx } from 'clsx';

interface RatingModalProps {
    isOpen: boolean;
    onClose: () => void;
    appointmentId: string;
    raterRole: 'client' | 'professional';
    targetName: string;
    onSuccess?: () => void;
}

export default function RatingModal({ 
    isOpen, 
    onClose, 
    appointmentId, 
    raterRole, 
    targetName,
    onSuccess 
}: RatingModalProps) {
    const [stars, setStars] = useState(0);
    const [hover, setHover] = useState(0);
    const [comment, setComment] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async () => {
        if (stars === 0) {
            setError('Por favor selecciona una calificación');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const res = await fetch(`/api/appointments/${appointmentId}/ratings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    stars,
                    comment,
                    raterRole
                })
            });

            const data = await res.json();

            if (res.ok) {
                setSubmitted(true);
                if (onSuccess) onSuccess();
                setTimeout(() => {
                    onClose();
                    // Reset state after closing
                    setTimeout(() => {
                        setSubmitted(false);
                        setStars(0);
                        setComment('');
                    }, 500);
                }, 2500);
            } else {
                setError(data.error || 'Error al enviar la calificación');
                console.error('Rating Error:', data);
            }
        } catch (e) {
            setError('Error de conexión con el servidor');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 sm:p-6">
            {/* Backdrop con blur más intenso */}
            <div 
                className="absolute inset-0 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-500" 
                onClick={onClose} 
            />
            
            <div className="relative bg-white w-full max-w-md rounded-[3rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.3)] overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-10 duration-500 border border-slate-100">
                {/* Decorative top bar con gradiente animado */}
                <div className="h-2 w-full bg-gradient-to-r from-emerald-400 via-teal-500 to-emerald-600 bg-[length:200%_100%] animate-pulse" />
                
                <button 
                    onClick={onClose}
                    className="absolute top-6 right-6 p-2 text-slate-300 hover:text-slate-900 transition-all rounded-full hover:bg-slate-100 active:scale-90 z-20"
                >
                    <X size={20} />
                </button>

                <div className="p-8 md:p-12 space-y-10">
                    {!submitted ? (
                        <>
                            <div className="space-y-4 text-center">
                                <div className="relative inline-flex">
                                    <div className="size-20 bg-emerald-50 rounded-[2rem] flex items-center justify-center text-emerald-500 shadow-inner rotate-3 hover:rotate-0 transition-transform duration-500">
                                        <Heart size={36} fill="currentColor" className="opacity-20 absolute" />
                                        <Sparkles size={32} className="relative z-10" />
                                    </div>
                                    <div className="absolute -top-1 -right-1 size-6 bg-amber-400 rounded-full border-4 border-white shadow-sm animate-bounce" />
                                </div>
                                
                                <div className="space-y-2">
                                    <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase italic leading-none">
                                        {raterRole === 'client' 
                                            ? `¿Qué tal estuvo tu servicio?` 
                                            : `Califica a tu cliente`}
                                    </h2>
                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.25em] italic">
                                        Tu valoración para <span className="text-emerald-600 font-black">{targetName}</span>
                                    </p>
                                </div>
                            </div>

                            <div className="flex justify-center gap-1.5 py-2">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                        key={star}
                                        type="button"
                                        className="p-1 transition-all active:scale-75 hover:scale-125"
                                        onClick={() => setStars(star)}
                                        onMouseEnter={() => setHover(star)}
                                        onMouseLeave={() => setHover(0)}
                                    >
                                        <Star
                                            size={48}
                                            className={clsx(
                                                "transition-all duration-300",
                                                (hover || stars) >= star 
                                                    ? "text-amber-400 fill-amber-400 filter drop-shadow-[0_0_12px_rgba(251,191,36,0.5)]" 
                                                    : "text-slate-100 fill-slate-50"
                                            )}
                                            strokeWidth={1.5}
                                        />
                                    </button>
                                ))}
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between px-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic flex items-center gap-2">
                                        <MessageSquare size={14} className="text-emerald-500" /> Comparte tu experiencia
                                    </label>
                                    <span className={clsx(
                                        "text-[9px] font-bold uppercase tracking-widest transition-colors",
                                        comment.length > 180 ? "text-rose-400" : "text-slate-300"
                                    )}>
                                        {comment.length}/200
                                    </span>
                                </div>
                                <textarea
                                    value={comment}
                                    onChange={(e) => setComment(e.target.value.slice(0, 200))}
                                    className="w-full bg-slate-50 border-2 border-slate-50 text-slate-700 text-sm font-medium rounded-[2rem] p-6 focus:outline-none focus:border-emerald-500/20 focus:bg-white focus:ring-8 focus:ring-emerald-500/5 transition-all min-h-[120px] resize-none placeholder:text-slate-300 italic shadow-inner"
                                    placeholder="Escribe algo opcional..."
                                />
                            </div>

                            {error && (
                                <div className="bg-rose-50 border border-rose-100 p-5 rounded-[1.5rem] animate-in slide-in-from-top-2 duration-300">
                                    <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest text-center flex items-center justify-center gap-2">
                                        <X size={14} /> {error}
                                    </p>
                                </div>
                            )}

                            <div className="flex gap-4 pt-2">
                                <button
                                    onClick={onClose}
                                    className="flex-1 py-6 bg-slate-50 text-slate-400 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 hover:text-slate-600 transition-all active:scale-95"
                                >
                                    Omitir
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={loading || stars === 0}
                                    className={clsx(
                                        "flex-[2] py-6 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 shadow-2xl active:scale-95 group",
                                        stars > 0 
                                            ? "bg-slate-900 text-white hover:bg-emerald-600 shadow-emerald-200" 
                                            : "bg-slate-100 text-slate-300 shadow-none cursor-not-allowed"
                                    )}
                                >
                                    {loading ? (
                                        <div className="size-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            Enviar Valoración
                                            <Send size={14} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                                        </>
                                    )}
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="py-16 text-center space-y-8 animate-in zoom-in-95 duration-700">
                            <div className="relative inline-flex">
                                <div className="size-24 bg-emerald-50 text-emerald-500 rounded-[2.5rem] flex items-center justify-center shadow-inner border border-emerald-100 rotate-12">
                                    <CheckCircle2 size={48} strokeWidth={2.5} className="animate-in zoom-in duration-500" />
                                </div>
                                <div className="absolute -top-4 -right-4">
                                    <Sparkles className="text-amber-400 animate-pulse" size={32} />
                                </div>
                            </div>
                            
                            <div className="space-y-3">
                                <h2 className="text-4xl font-black text-slate-900 tracking-tight uppercase italic leading-none">¡Gracias!</h2>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] italic">Tu opinión es muy valiosa para nosotros</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
