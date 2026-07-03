'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, User, Phone, MessageSquare, Loader2, CheckCircle2, Calendar, Clock, Check } from 'lucide-react';
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
        pagosActivos: boolean;
        pagoPorcentaje: number;
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
                // Incluir el código de referido desde localStorage si existe (fallback sin cookie)
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
            }, 1500);

        } catch (error) {
            console.error(error);
            alert('Error al procesar la reserva. Por favor intente nuevamente.');
        } finally {
            setLoading(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[600] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-300">
            {/* Overlay */}
            <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={onClose} />
            
            {/* Modal Content - DARK THEME AS REQUESTED */}
            <div className="relative w-full max-w-xl bg-[#0c140f] h-[92vh] sm:h-auto sm:rounded-[3rem] shadow-2xl overflow-y-auto hide-scrollbar flex flex-col border-t sm:border border-white/5">
                
                {/* Header */}
                <div className="p-6 flex items-center justify-between sticky top-0 bg-[#0c140f] z-10">
                    <button onClick={onClose} className="p-3 rounded-full bg-white/5 text-gray-400 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                    <div className="px-4 py-1.5 rounded-full bg-pink-500/10 border border-pink-500/20">
                        <span className="text-[10px] font-black italic text-pink-500 uppercase tracking-widest">Paso Final</span>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="px-6 pb-24 space-y-8">
                    {/* Title */}
                    <div className="space-y-1">
                        <h2 className="text-4xl font-black italic tracking-tighter text-white uppercase leading-none">
                            CONFIRMAR<br/>CITA
                        </h2>
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mt-2">
                            Completa tu información para agendar tu turno.
                        </p>
                    </div>

                    {/* Booking Card Summary */}
                    <div className="bg-white/5 rounded-3xl p-5 border border-white/5 space-y-6">
                        <div className="flex justify-between items-center border-b border-white/5 pb-4">
                            <div className="flex items-center gap-3">
                                <div className="size-2 rounded-full bg-pink-500 shadow-[0_0_10px_rgba(236,72,153,0.5)]" />
                                <span className="text-sm font-black italic text-white uppercase truncate max-w-[180px]">
                                    {bookingData.canchaNombre}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-gray-400">{duracionMin} min</span>
                                <span className="text-sm font-black text-white">${precioTotal}</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2 text-pink-500">
                                    <Calendar size={14} />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Fecha</span>
                                </div>
                                <span className="text-sm font-black italic text-white uppercase">
                                    {format(bookingData.date, "EEEE d MMM", { locale: es })}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2 text-pink-500">
                                    <Clock size={14} />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Horario</span>
                                </div>
                                <span className="text-sm font-black italic text-white uppercase">
                                    {bookingData.hour} — {horaFin} HS
                                </span>
                            </div>
                            {bookingData.staffName && (
                                <div className="flex justify-between items-center text-gray-100">
                                    <div className="flex items-center gap-2 text-pink-500">
                                        <User size={14} />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Especialista</span>
                                    </div>
                                    <span className="text-sm font-black italic text-white uppercase">
                                        {bookingData.staffName}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Form Fields */}
                    <div className="space-y-6">
                        {/* Nombre */}
                        <div className="space-y-2.5">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nombre Completo</label>
                            <input
                                required
                                value={formData.nombre}
                                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                                placeholder="Escribe tu nombre"
                                className="w-full h-16 bg-white/5 border border-white/5 rounded-2xl px-6 text-white font-bold focus:ring-2 focus:ring-pink-500/30 transition-all outline-none"
                            />
                        </div>

                        {/* Telefono */}
                        <div className="space-y-2.5">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Celular de Contacto</label>
                            <PhoneInput
                                value={formData.telefono}
                                onChange={(val) => setFormData({ ...formData, telefono: val })}
                                className="h-16 bg-white/5 border border-white/5 rounded-2xl text-white font-bold"
                            />
                        </div>

                        {/* Notas */}
                        <div className="space-y-2.5">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Notas (Opcional)</label>
                            <textarea
                                value={formData.comentarios}
                                rows={3}
                                onChange={(e) => setFormData({ ...formData, comentarios: e.target.value })}
                                placeholder="¿Algo que debamos saber?"
                                className="w-full bg-white/5 border border-white/5 rounded-2xl p-6 text-white font-bold focus:ring-2 focus:ring-pink-500/30 transition-all outline-none resize-none"
                            />
                        </div>
                    </div>

                    {/* Static Footer (inside form scrolling area but before the fixed button) */}
                    <div className="pt-6 border-t border-white/5 flex justify-between items-end">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black italic text-emerald-500 uppercase tracking-widest mb-1">Total a Pagar</span>
                            <span className="text-4xl font-black italic text-pink-500 tracking-tighter">${precioTotal}</span>
                        </div>
                    </div>

                    {/* Fixed Submit Button at bottom */}
                    <div className="fixed bottom-0 left-0 right-0 p-6 bg-[#0c140f] sm:relative sm:p-0 sm:pt-4">
                        <button
                            type="submit"
                            disabled={loading || success}
                            className={`w-full h-18 text-white rounded-[2rem] font-black text-sm tracking-[0.2em] transition-all flex items-center justify-center gap-4 uppercase shadow-lg shadow-pink-500/20 active:scale-[0.98] ${
                                success ? 'bg-emerald-500' : 'bg-pink-500'
                            }`}
                        >
                            {loading ? (
                                <Loader2 size={24} className="animate-spin" />
                            ) : success ? (
                                <>
                                    <span>RESERVA EXITOSA</span>
                                    <CheckCircle2 size={24} />
                                </>
                            ) : (
                                <>
                                    <span>CONFIRMAR RESERVA</span>
                                    <Check size={24} strokeWidth={3} />
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
}
