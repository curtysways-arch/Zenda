'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, User, Clock, Loader2, CheckCircle2, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useRouter } from 'next/navigation';
import PhoneInput from './ui/PhoneInput';

interface BookingModalProps {
    isOpen: boolean;
    onClose: () => void;
    bookingData: {
        date: Date;
        hour: string;
        canchaId: string;
        slug: string;
        canchaNombre: string;
        precio: number;
        precioBase?: number;
        precioHora: number;
        duracion: number;
        pagosActivos?: boolean;
        pagoPorcentaje?: number;
        whatsapp?: string;
        staffId?: string;
        staffName?: string;
        servicios?: { id: string; nombre: string; duracion?: number; precioHora?: number; precio?: number }[];
    } | null;
}

export default function BookingModal({ isOpen, onClose, bookingData }: BookingModalProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [formData, setFormData] = useState({
        nombre: '',
        telefono: '',
        comentarios: '',
    });
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Bloquear scroll al abrir modal
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen]);

    useEffect(() => {
        if (isOpen) {
            const savedData = localStorage.getItem('customerInfo');
            if (savedData) {
                try {
                    const parsed = JSON.parse(savedData);
                    setFormData(prev => ({
                        ...prev,
                        nombre: parsed.nombre || '',
                        telefono: parsed.telefono || ''
                    }));
                } catch (e) {
                    console.error('Error parsing customer info', e);
                }
            }
        }
    }, [isOpen]);

    if (!isOpen || !bookingData || !mounted) return null;

    const precioTotal = Number(bookingData.precio);
    const duracionMin = Math.round(bookingData.duracion * 60);

    // Calcular hora de fin
    const [h, m] = bookingData.hour.split(':').map(Number);
    const totalMinutes = h * 60 + m + duracionMin;
    const horaFin = `${Math.floor(totalMinutes / 60).toString().padStart(2, '0')}:${(totalMinutes % 60).toString().padStart(2, '0')}`;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const serviciosExtras = bookingData.servicios && bookingData.servicios.length > 1
                ? bookingData.servicios.slice(1).map((s: any) => s.nombre).join(', ')
                : '';
            const comentarioFinal = [
                formData.comentarios,
                serviciosExtras ? `Servicios adicionales: ${serviciosExtras}` : ''
            ].filter(Boolean).join(' | ');

            const payload = {
                clienteNombre: formData.nombre,
                clienteTelefono: formData.telefono,
                comentarios: comentarioFinal,
                fecha: format(bookingData.date, 'yyyy-MM-dd'),
                horaInicio: bookingData.hour,
                duracion: bookingData.duracion,
                serviceId: bookingData.canchaId,
                staffId: bookingData.staffId,
                precioTotal: precioTotal,
                slug: bookingData.slug,
                estado: 'pendiente',
                referralCode: (typeof window !== 'undefined' ? localStorage.getItem('referral_code_backup') : null) || undefined,
            };

            const response = await fetch(`/api/public/${bookingData.slug}/reservar`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) throw new Error('Error al crear la reserva');
            
            const data = await response.json();
            
            // Guardar info para la próxima vez
            localStorage.setItem('customerInfo', JSON.stringify({
                nombre: formData.nombre,
                telefono: formData.telefono
            }));

            setSuccess(true);
            setTimeout(() => {
                onClose();
                router.push(`/${bookingData.slug}/confirmacion/${data.id}`);
            }, 1200);

        } catch (error) {
            console.error(error);
            alert('Error al procesar la reserva. Por favor intente nuevamente.');
        } finally {
            setLoading(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-300">
            {/* Modal Container */}
            <div className="bg-[#07090f] w-full h-[100dvh] sm:h-auto sm:max-h-[90dvh] max-w-lg shadow-2xl relative overflow-hidden sm:rounded-[2.5rem] flex flex-col border-t border-white/5 sm:border text-left">
                
                {/* Header Navbar */}
                <div className="flex items-center justify-between p-6 sm:px-8 pb-4 shrink-0 relative z-20 border-b border-white/5">
                    <button onClick={onClose} className="size-10 bg-white/5 rounded-2xl flex items-center justify-center text-white/50 hover:text-white transition-all border border-white/5 cursor-pointer">
                        <X size={20} />
                    </button>
                    <div className="px-4 py-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-500 text-[10px] font-black tracking-widest uppercase">
                        PASO FINAL
                    </div>
                </div>

                {/* Scrollable Form Content */}
                <div className="flex-1 overflow-y-auto px-6 sm:px-8 pt-4 pb-44 space-y-6 hide-scrollbar relative z-10">
                    {/* Header Texts */}
                    <div>
                        <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter leading-none mb-1">
                            CONFIRMAR RESERVA
                        </h2>
                        <p className="text-[10px] font-medium text-white/40 tracking-widest uppercase italic">
                            COMPLETA TU INFORMACIÓN PARA AGENDAR TU TURNO.
                        </p>
                    </div>

                    {/* Summary Card - ULTRA COMPACT */}
                    <div className="p-4 rounded-2xl bg-[#11141d] border border-white/5 shadow-inner space-y-3">
                        <div className="flex justify-between items-center border-b border-white/5 pb-2">
                            <div className="flex items-center gap-2">
                                <div className="size-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(29,201,92,0.6)]" />
                                <span className="text-xs font-black italic text-white uppercase truncate max-w-[200px]">
                                    {bookingData.canchaNombre}
                                </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-bold text-slate-400">{duracionMin} min</span>
                                <span className="text-sm font-black text-emerald-400">${precioTotal}</span>
                            </div>
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex flex-col">
                                <span className="flex items-center gap-1 text-[8px] font-black text-emerald-500/60 uppercase tracking-[0.2em]">
                                    <Calendar size={10} className="text-emerald-500" /> FECHA
                                </span>
                                <span className="text-[12px] font-black text-white italic uppercase">
                                    {format(bookingData.date, "EEEE d MMM", { locale: es })}
                                </span>
                            </div>
                            
                            <div className="w-px h-6 bg-white/5" />
                            
                            <div className="flex flex-col items-end text-right">
                                <span className="flex items-center gap-1 text-[8px] font-black text-emerald-500/60 uppercase tracking-[0.2em]">
                                    <Clock size={10} className="text-emerald-500" /> HORARIO
                                </span>
                                <span className="text-[12px] font-black text-white italic uppercase">
                                    {bookingData.hour} — {horaFin} HS
                                </span>
                            </div>
                        </div>

                        {bookingData.staffName && (
                            <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Especialista</span>
                                <span className="font-black text-white italic uppercase">{bookingData.staffName}</span>
                            </div>
                        )}
                    </div>

                    {/* Form Fields */}
                    <form onSubmit={handleSubmit} id="booking-modal-form" className="space-y-4">
                        {/* Nombre */}
                        <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em] ml-1">Nombre Completo</label>
                            <input
                                required
                                value={formData.nombre}
                                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                                placeholder="Escribe tu nombre"
                                className="w-full h-13 bg-white/5 border border-white/10 focus:border-emerald-500/50 rounded-2xl px-5 text-white font-bold text-sm focus:ring-2 focus:ring-emerald-500/20 transition-all outline-none"
                            />
                        </div>

                        {/* Telefono */}
                        <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em] ml-1">Celular de Contacto</label>
                            <PhoneInput
                                value={formData.telefono}
                                onChange={(val) => setFormData({ ...formData, telefono: val })}
                                placeholder="099 123 4567"
                                darkMode={true}
                            />
                        </div>

                        {/* Notas */}
                        <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em] ml-1">Notas (Opcional)</label>
                            <textarea
                                value={formData.comentarios}
                                rows={2}
                                onChange={(e) => setFormData({ ...formData, comentarios: e.target.value })}
                                placeholder="¿Algo que debamos saber?"
                                className="w-full bg-white/5 border border-white/10 focus:border-emerald-500/50 rounded-2xl p-4 text-white font-bold text-xs focus:ring-2 focus:ring-emerald-500/20 transition-all outline-none resize-none"
                            />
                        </div>
                    </form>
                </div>

                {/* Sticky Bottom Footer - Total and Button */}
                <div className="absolute bottom-0 left-0 right-0 bg-[#07090f]/95 backdrop-blur-xl border-t border-white/5 p-5 sm:px-8 shrink-0 flex flex-col gap-3 z-30 shadow-[0_-20px_40px_rgba(0,0,0,0.5)]">
                    <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                            <span className="text-[9px] font-black text-emerald-500/60 uppercase tracking-[0.2em] italic mb-0.5">TOTAL A PAGAR</span>
                            <span className="text-3xl font-black text-emerald-400 italic tracking-tighter leading-none">${precioTotal}</span>
                        </div>
                    </div>

                    <button
                        type="submit"
                        form="booking-modal-form"
                        disabled={loading || success}
                        className={`w-full h-15 rounded-2xl text-[12px] font-black text-white uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all shadow-xl cursor-pointer active:scale-[0.98] ${
                            success 
                                ? 'bg-emerald-500 shadow-emerald-500/20' 
                                : 'bg-emerald-500 hover:bg-emerald-400 shadow-emerald-500/20'
                        }`}
                    >
                        {loading ? (
                            <Loader2 size={20} className="animate-spin" />
                        ) : success ? (
                            <>
                                <span>RESERVA EXITOSA</span>
                                <CheckCircle2 size={20} />
                            </>
                        ) : (
                            <>
                                <span>CONFIRMAR RESERVA</span>
                                <CheckCircle2 size={20} />
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
