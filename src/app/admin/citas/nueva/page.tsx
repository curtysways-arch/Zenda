'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
    Calendar, 
    Clock, 
    User, 
    Phone, 
    MapPin, 
    ChevronLeft, 
    CheckCircle2, 
    Plus,
    Save,
    Loader2,
    DollarSign,
    MessageSquare,
    Zap,
    CreditCard
} from 'lucide-react';
import { clsx } from 'clsx';

function ReservaNuevaForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { data: session } = useSession();
    
    const [loading, setLoading] = useState(false);
    const [services, setServices] = useState<any[]>([]);
    const [staff, setStaff] = useState<any[]>([]);
    const [clientes, setClientes] = useState<any[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [successData, setSuccessData] = useState<{
        reservaId: string;
        shareToken: string;
        clienteNombre: string;
        clienteTelefono: string;
    } | null>(null);

    const [formData, setFormData] = useState({
        fecha: searchParams.get('fecha') || format(new Date(), 'yyyy-MM-dd'),
        horaInicio: searchParams.get('hora') || '08:00',
        duracion: '1',
        serviceId: '',
        staffId: '',
        clienteNombre: '',
        clienteTelefono: '',
        comentarios: '',
    });

    const [codigoPais, setCodigoPais] = useState('+593');

    const actualizarTelefonoDesdeSugerencia = (telefono: string) => {
        if (telefono.startsWith('+')) {
            const codigosComunes = ['+593', '+54', '+57', '+51', '+56', '+52', '+58', '+1', '+34'];
            const codigoEncontrado = codigosComunes.find(c => telefono.startsWith(c));
            if (codigoEncontrado) {
                setCodigoPais(codigoEncontrado);
                setFormData(prev => ({ ...prev, clienteTelefono: telefono.replace(codigoEncontrado, '') }));
                return;
            }
        }
        setFormData(prev => ({ ...prev, clienteTelefono: telefono }));
    };

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [resServices, resStaff, resClientes] = await Promise.all([
                    fetch('/api/services'),
                    fetch('/api/staff'),
                    fetch('/api/clientes')
                ]);
                
                const dataServices = await resServices.json();
                const dataStaff = await resStaff.json();
                const dataClientes = await resClientes.json();
                
                const safeServices = Array.isArray(dataServices) ? dataServices : [];
                const safeStaff = Array.isArray(dataStaff) ? dataStaff : [];
                const safeClientes = Array.isArray(dataClientes) ? dataClientes : [];

                setServices(safeServices);
                setStaff(safeStaff);
                setClientes(safeClientes);
                
                if (safeServices.length > 0) {
                    setFormData(prev => ({ 
                        ...prev, 
                        serviceId: safeServices[0].id
                    }));
                }
                if (safeStaff.length > 0) {
                    setFormData(prev => ({ 
                        ...prev, 
                        staffId: safeStaff[0].id
                    }));
                }
            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        
        try {
            const slug = (session?.user as any)?.slug || 'demo';

            // Formatear el teléfono completo con el código de país seleccionado
            let telefonoCompleto = formData.clienteTelefono.trim();
            if (!telefonoCompleto.startsWith('+')) {
                const numeroLimpio = telefonoCompleto.replace(/^0+/, '');
                telefonoCompleto = `${codigoPais}${numeroLimpio}`;
            }
            const res = await fetch('/api/appointments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    ...formData, 
                    clienteTelefono: telefonoCompleto,
                    canchaId: formData.serviceId,
                    serviceId: formData.serviceId,
                    slug,
                    is_business_creation: true 
                })
            });

            if (res.ok) {
                const data = await res.json();
                setSuccessData({
                    reservaId: data.reserva?.id || data.appointment?.id,
                    shareToken: data.shareToken,
                    clienteNombre: formData.clienteNombre,
                    clienteTelefono: telefonoCompleto
                });
                router.refresh();
            } else {
                const err = await res.json();
                alert(err.error || 'Error al crear reserva');
            }
        } catch (error) {
            console.error('Error submitting:', error);
            alert('Error de conexión');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (successData) {
        const shareUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/reserva/${successData.shareToken}`;
        const waMessage = `¡Hola ${successData.clienteNombre}! Tu reserva ha sido creada correctamente. Podés ver los detalles aquí: ${shareUrl}`;
        const waUrl = `https://wa.me/${successData.clienteTelefono.replace(/\D/g, '')}?text=${encodeURIComponent(waMessage)}`;

        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="max-w-xl w-full bg-white rounded-[3.5rem] p-10 md:p-14 border border-slate-200 shadow-2xl text-center space-y-10 animate-in zoom-in-95 duration-500">
                    <div className="size-24 rounded-full flex items-center justify-center mx-auto shadow-inner" style={{ backgroundColor: 'color-mix(in srgb, var(--primary-color), transparent 90%)', color: 'var(--primary-color)' }}>
                        <CheckCircle2 size={48} strokeWidth={3} />
                    </div>
                    
                    <div className="space-y-4">
                        <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">
                            Reserva <span style={{ color: 'var(--primary-color)' }}>Exitosa</span>
                        </h2>
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs italic leading-relaxed">
                            La reserva se ha registrado correctamente.<br/>Ya puedes compartirla con el cliente.
                        </p>
                    </div>

                    <div className="grid gap-4">
                        <a 
                            href={waUrl}
                            target="_blank"
                            className="w-full py-6 text-white rounded-[2rem] text-[11px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 shadow-xl italic transform active:scale-95"
                            style={{ backgroundColor: '#25D366' }}
                        >
                            <MessageSquare size={18} fill="currentColor" />
                            Enviar por WhatsApp
                        </a>
                        <button 
                            onClick={() => {
                                navigator.clipboard.writeText(shareUrl);
                                alert('Link copiado al portapapeles');
                            }}
                            className="w-full py-6 bg-slate-900 text-white rounded-[2rem] text-[11px] font-black uppercase tracking-[0.2em] hover:bg-black transition-all flex items-center justify-center gap-3 shadow-xl italic transform active:scale-95"
                        >
                            Copiar Link de Reserva
                        </button>
                        <button 
                            onClick={() => router.push(`/admin/citas/${successData.reservaId}`)}
                            className="w-full py-6 bg-white border border-slate-200 text-slate-500 rounded-[2rem] text-[11px] font-black uppercase tracking-[0.2em] hover:bg-slate-50 hover:text-slate-900 transition-all italic"
                        >
                            Ver Detalles Internos
                        </button>
                    </div>

                    <button 
                        onClick={() => router.push('/admin')}
                        className="text-[10px] font-black text-slate-300 uppercase tracking-widest hover:text-slate-900 transition-colors italic group flex items-center justify-center gap-2 mx-auto"
                    >
                        <ChevronLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
                        Volver al Panel Principal
                    </button>
                </div>
            </div>
        );
    }

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
            <div className="size-20 border-4 border-slate-200 rounded-full animate-spin" style={{ borderTopColor: 'var(--primary-color)' }} />
            <p className="mt-8 text-slate-400 font-black uppercase tracking-[0.4em] text-[10px] italic">Preparando la agenda...</p>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 pb-40 pt-10 px-4 md:px-0">
            <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
                
                {/* Header Premium */}
                <div className="flex items-center justify-between">
                    <button type="button" onClick={() => router.back()} className="flex items-center gap-2 text-slate-400 hover:text-slate-900 transition-colors group">
                        <ChevronLeft className="group-hover:-translate-x-1 transition-transform" />
                        <span className="text-[10px] font-black uppercase tracking-widest italic">Cancelar y Volver</span>
                    </button>
                    <div className="flex items-center gap-3 bg-white px-6 py-3 rounded-2xl border border-slate-200 shadow-sm">
                        <div className="size-2 rounded-full animate-pulse" style={{ backgroundColor: 'var(--primary-color)' }} />
                        <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest italic">Nueva Entrada Manual</span>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="bg-white rounded-[3.5rem] p-8 md:p-14 border border-slate-200 shadow-xl space-y-16">
                    
                    {/* Título y Sección Principal */}
                    <div className="space-y-4 text-center md:text-left">
                        <h1 className="text-5xl md:text-7xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">
                            Agendar <span style={{ color: 'var(--primary-color)' }}>Cita</span>
                        </h1>
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs italic">Completa los datos del cliente para bloquear el slot.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
                        
                        {/* Columna Izquierda: Datos del Cliente */}
                        <div className="space-y-10">
                            <div className="flex items-center gap-4 px-2">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'color-mix(in srgb, var(--primary-color), transparent 90%)', color: 'var(--primary-color)' }}>
                                    <User size={20} strokeWidth={3} />
                                </div>
                                <h3 className="text-xl font-black text-slate-800 tracking-tighter uppercase italic">Cliente Destino</h3>
                            </div>

                            <div className="space-y-8">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic leading-none block px-2">Nombre Completo</label>
                                    <input 
                                        type="text"
                                        required
                                        value={formData.clienteNombre}
                                        onChange={(e) => {
                                            setFormData({ ...formData, clienteNombre: e.target.value });
                                            // Autocompletado interactivo
                                            const match = clientes.find(c => c.nombre.toLowerCase() === e.target.value.toLowerCase());
                                            if (match) actualizarTelefonoDesdeSugerencia(match.telefono);
                                        }}
                                        className="w-full bg-slate-50 border border-slate-200 h-16 px-6 rounded-2xl text-slate-900 font-black uppercase italic tracking-tight focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 transition-all outline-none"
                                        placeholder="EJ: JUAN PÉREZ"
                                    />
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic leading-none block px-2">Teléfono de Contacto</label>
                                    <div className="flex bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden focus-within:border-slate-900 focus-within:ring-2 focus-within:ring-slate-900/10 transition-all">
                                        <div className="flex items-center gap-2 px-4 border-r border-slate-200 bg-slate-100/50">
                                            <Phone size={16} className="text-slate-400 shrink-0" />
                                            <select
                                                value={codigoPais}
                                                onChange={(e) => setCodigoPais(e.target.value)}
                                                className="bg-transparent border-none outline-none text-[10px] font-black text-slate-600 tracking-tighter cursor-pointer focus:ring-0 p-0 pr-4 select-none min-w-[70px]"
                                                style={{ border: 'none', outline: 'none', boxShadow: 'none' }}
                                            >
                                                <option value="+593">EC (+593)</option>
                                                <option value="+54">AR (+54)</option>
                                                <option value="+57">CO (+57)</option>
                                                <option value="+51">PE (+51)</option>
                                                <option value="+56">CL (+56)</option>
                                                <option value="+52">MX (+52)</option>
                                                <option value="+58">VE (+58)</option>
                                                <option value="+1">US (+1)</option>
                                                <option value="+34">ES (+34)</option>
                                            </select>
                                        </div>
                                        <input 
                                            type="tel"
                                            required
                                            value={formData.clienteTelefono}
                                            onChange={(e) => setFormData({ ...formData, clienteTelefono: e.target.value })}
                                            className="flex-1 bg-transparent h-16 px-6 text-slate-900 font-black uppercase italic tracking-tight outline-none"
                                            placeholder="099 887 7665"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic leading-none block px-2">Sugerencias (Auto-completado)</label>
                                    <div className="flex flex-wrap gap-2">
                                        {clientes
                                            .filter(c => c.nombre.toLowerCase().includes(formData.clienteNombre.toLowerCase()))
                                            .slice(0, 3)
                                            .map(c => (
                                                <button 
                                                    key={c.id}
                                                    type="button"
                                                    onClick={() => {
                                                        setFormData(prev => ({ ...prev, clienteNombre: c.nombre }));
                                                        actualizarTelefonoDesdeSugerencia(c.telefono);
                                                    }}
                                                    className="px-4 py-2 bg-slate-100 hover:bg-slate-900 hover:text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border border-transparent hover:border-slate-900"
                                                >
                                                    {c.nombre}
                                                </button>
                                            ))
                                        }
                                        {formData.clienteNombre.trim().length > 0 && !clientes.some(c => c.nombre.toLowerCase() === formData.clienteNombre.trim().toLowerCase()) && (
                                            <span className="px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border border-slate-200" style={{ backgroundColor: 'color-mix(in srgb, var(--primary-color), transparent 95%)', color: 'var(--primary-color)' }}>
                                                NUEVO CLIENTE
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Columna Derecha: Detalles del Turno */}
                        <div className="space-y-10">
                            <div className="flex items-center gap-4 px-2">
                                <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-600">
                                    <Calendar size={20} strokeWidth={3} />
                                </div>
                                <h3 className="text-xl font-black text-slate-800 tracking-tighter uppercase italic">Configuración</h3>
                            </div>

                            <div className="space-y-8">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic leading-none block px-2">Fecha</label>
                                        <input 
                                            type="date"
                                            required
                                            value={formData.fecha}
                                            onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                                            className="w-full bg-slate-50 border border-slate-200 h-16 px-6 rounded-2xl text-xs font-black uppercase italic tracking-tight focus:border-blue-500 transition-all outline-none"
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic leading-none block px-2">Hora Inicio</label>
                                        <input 
                                            type="time"
                                            required
                                            value={formData.horaInicio}
                                            onChange={(e) => setFormData({ ...formData, horaInicio: e.target.value })}
                                            className="w-full bg-slate-50 border border-slate-200 h-16 px-6 rounded-2xl text-xs font-black uppercase italic tracking-tight focus:border-blue-500 transition-all outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic leading-none block px-2">Servicio</label>
                                    <div className="relative">
                                        <select 
                                            required
                                            value={formData.serviceId}
                                            onChange={(e) => setFormData({ ...formData, serviceId: e.target.value })}
                                            className="w-full bg-slate-50 border border-slate-200 h-16 px-6 rounded-2xl text-xs font-black uppercase italic tracking-tight focus:border-blue-500 transition-all outline-none appearance-none"
                                        >
                                            <option value="" disabled>Seleccionar servicio...</option>
                                            {services.map(c => (
                                                <option key={c.id} value={c.id}>{c.nombre}</option>
                                            ))}
                                        </select>
                                        <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                            <Zap size={18} />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic leading-none block px-2">Especialista</label>
                                    <div className="relative">
                                        <select 
                                            required
                                            value={formData.staffId}
                                            onChange={(e) => setFormData({ ...formData, staffId: e.target.value })}
                                            className="w-full bg-slate-50 border border-slate-200 h-16 px-6 rounded-2xl text-xs font-black uppercase italic tracking-tight focus:border-blue-500 transition-all outline-none appearance-none"
                                        >
                                            <option value="" disabled>Seleccionar especialista...</option>
                                            {staff.map(c => (
                                                <option key={c.id} value={c.id}>{c.name}</option>
                                            ))}
                                        </select>
                                        <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                            <User size={18} />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic leading-none block px-2">Tiempo Asignado</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {[
                                            { label: '30 MIN', value: '0.5' },
                                            { label: '45 MIN', value: '0.75' },
                                            { label: '1 HORA', value: '1' },
                                            { label: '1.5 HORAS', value: '1.5' },
                                            { label: '2 HORAS', value: '2' },
                                            { label: '3 HORAS', value: '3' },
                                        ].map(d => (
                                            <button 
                                                key={d.value}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, duracion: d.value })}
                                                className={clsx(
                                                    "py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border",
                                                    formData.duracion === d.value ? "bg-slate-900 text-white border-slate-900 shadow-lg" : "bg-white text-slate-400 border-slate-200 hover:bg-slate-50"
                                                )}
                                            >
                                                {d.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Comentarios */}
                    <div className="pt-10 border-t border-slate-100">
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic leading-none block px-2">Notas Internas / Comentarios</label>
                            <textarea 
                                value={formData.comentarios}
                                onChange={(e) => setFormData({ ...formData, comentarios: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-200 p-8 rounded-[2.5rem] text-slate-700 font-bold text-xs uppercase italic tracking-widest focus:border-emerald-500 transition-all outline-none min-h-[120px] resize-none"
                                placeholder="NOTAS PARA EL STAFF..."
                            />
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="flex flex-col md:flex-row gap-4 pt-4">
                        <button 
                            type="button"
                            onClick={() => router.back()}
                            className="flex-1 py-4 bg-slate-50 text-slate-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 border border-slate-200 transition-all"
                        >
                            Descartar
                        </button>
                        <button 
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-[2] py-4 bg-slate-900 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] hover:bg-black transition-all shadow-xl hover:shadow-2xl active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50"
                        >
                            {isSubmitting ? (
                                <Loader2 size={18} className="animate-spin" />
                            ) : (
                                <><Save size={18} /> Confirmar Cita</>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function NuevaReservaPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Cargando...</div>}>
            <ReservaNuevaForm />
        </Suspense>
    );
}
