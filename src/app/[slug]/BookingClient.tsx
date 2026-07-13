'use client';

import { useState, useMemo, useEffect } from 'react';
import BookingCalendar from '@/components/BookingCalendar';
import { Check, Clock, Plus, Sparkles, User, Users, ChevronRight, ArrowLeft, Calendar, Loader2, Scissors } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useSession } from 'next-auth/react';
import PhoneInput from '@/components/ui/PhoneInput';
import { useRouter, useSearchParams } from 'next/navigation';

interface BookingClientProps {
    negocio: any;
    slug: string;
    staff?: any[];
    initialServiceId?: string;
    allServices?: any[];
}

export default function BookingClient({
    negocio,
    slug,
    staff = [],
    initialServiceId,
    allServices = [],
}: BookingClientProps) {
    const { data: session, status } = useSession();
    const router = useRouter();
    const searchParams = useSearchParams();
    
    // Parámetros externos (ej: desde Resultados)
    const urlServiceId = searchParams.get('serviceId');
    const urlStaffId = searchParams.get('staffId');

    // Vista: 'calendar' o 'checkout'
    const [view, setView] = useState<'calendar' | 'checkout'>('calendar');
    
    const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>(
        initialServiceId ? [initialServiceId] : (urlServiceId ? [urlServiceId] : (allServices.length > 0 ? [allServices[0].id] : []))
    );
    
    const availableStaff = useMemo(() => staff.filter(s => s.active !== false), [staff]);
    
    const [selectedStaffId, setSelectedStaffId] = useState<string | undefined>(
        urlStaffId && availableStaff.some(s => s.id === urlStaffId) ? urlStaffId : (availableStaff.length === 1 ? availableStaff[0].id : undefined)
    );
    
    const [selectedBooking, setSelectedBooking] = useState<any>(null);
    const [formData, setFormData] = useState({ nombre: '', telefono: '', comentarios: '' });
    const [loading, setLoading] = useState(false);

    // Estado de cupón de descuento
    const [couponCode, setCouponCode] = useState('');
    const [couponStatus, setCouponStatus] = useState<'idle' | 'checking' | 'valid' | 'invalid'>('idle');
    const [couponData, setCouponData] = useState<any>(null);
    const [couponError, setCouponError] = useState('');

    // Cupones de cliente
    const [clientCoupons, setClientCoupons] = useState<any[]>([]);
    const [isCustomCouponCode, setIsCustomCouponCode] = useState(false);
    const [showValidationErrors, setShowValidationErrors] = useState(false);
    const [shakeCalendar, setShakeCalendar] = useState(false);

    const handleValidateCoupon = async (codeToUse?: string) => {
        const activeCode = codeToUse || couponCode;
        if (!activeCode.trim()) return;
        setCouponStatus('checking');
        setCouponData(null);
        setCouponError('');
        try {
            const total = selectedBooking?.precio || 0;
            const serviceId = selectedBooking?.canchaId;
            const res = await fetch(`/api/public/${slug}/coupons/validate?code=${activeCode.trim().toUpperCase()}&serviceId=${serviceId}&total=${total}`);
            const data = await res.json();
            if (data.valid) {
                setCouponStatus('valid');
                setCouponData(data);
            } else {
                setCouponStatus('invalid');
                setCouponError(data.error || 'Cupón no válido');
            }
        } catch {
            setCouponStatus('invalid');
            setCouponError('Error al validar el cupón');
        }
    };

    const handleSelectClientCoupon = (code: string) => {
        if (code === 'custom') {
            setIsCustomCouponCode(true);
            setCouponCode('');
            setCouponStatus('idle');
            setCouponData(null);
        } else {
            setIsCustomCouponCode(false);
            setCouponCode(code);
            if (code) {
                handleValidateCoupon(code);
            } else {
                setCouponStatus('idle');
                setCouponData(null);
            }
        }
    };

    // Leer el color desde la variable CSS inyectada por el layout (evita flash de color)
    const primaryColor = negocio?.colorPrimario || 'var(--primary)';
    const showPrices = negocio?.mostrarPrecios !== false;

    const parsedConfig = useMemo(() => {
        if (!negocio?.configuracion) return {};
        if (typeof negocio.configuracion === 'string') {
            try {
                return JSON.parse(negocio.configuracion);
            } catch (e) {
                return {};
            }
        }
        return negocio.configuracion;
    }, [negocio?.configuracion]);

    const primaryService = useMemo(() => allServices.find((s: any) => s.id === initialServiceId), [allServices, initialServiceId]);
    const otherServices = useMemo(() => allServices.filter((s: any) => s.estaActivo !== false), [allServices]);

    useEffect(() => {
        const savedData = localStorage.getItem('customerInfo');
        if (savedData) {
            try {
                const parsed = JSON.parse(savedData);
                setFormData(prev => ({ ...prev, nombre: parsed.nombre || '', telefono: parsed.telefono || '' }));
            } catch (e) {}
        }
    }, []);

    useEffect(() => {
        if (view === 'checkout') {
            const fetchClientCoupons = async () => {
                try {
                    const res = await fetch(`/api/public/${slug}/client-coupons?estado=DISPONIBLE`);
                    if (res.ok) {
                        const data = await res.json();
                        setClientCoupons(Array.isArray(data) ? data : []);
                        // Reiniciar selección
                        setIsCustomCouponCode(false);
                    }
                } catch (e) {
                    console.error("Error fetching customer coupons:", e);
                }
            };
            fetchClientCoupons();
        }
    }, [view, slug]);

/**
 * MOTOR DE RESOLUCIÓN (ARQUITECTURA LIMPIA) - UNIFICADO CON CALENDARIO
 * Evalúa y selecciona la mejor promoción para un slot específico.
 */
const resolveSlotPromotion = (
    slotHour: string,
    selectedDate: Date | string,
    service: any,
    automaticDiscount: any
) => {
    if (!service) return { price: 0, hasPromotion: false, discountPercent: 0, labelText: '', source: null };

    // 1. Recolección de promociones (Soporte nombre/name)
    const manualPromos = [
        ...(service.promociones || []),
        ...(service.promocion ? [service.promocion] : []),
        ...(service.PromotionToService || []).map((rel: any) => rel.Promotion),
        ...(service.Promotion ? [service.Promotion] : [])
    ].filter(Boolean);

    const sName = String(service.nombre || service.name || '').toLowerCase();
    const isMassage = sName.includes('masaje') || sName.includes('massage') || sName.includes('therapy');

    const basePrice = Number(service.precioOriginal || service.precioHora || service.precio || 0);
    const selectedDateObj = new Date(selectedDate);
    const selectedDateStr = selectedDateObj.getFullYear() + '-' + 
                          String(selectedDateObj.getMonth() + 1).padStart(2, '0') + '-' + 
                          String(selectedDateObj.getDate()).padStart(2, '0');
    const hourNum = parseInt(slotHour.replace(':', ''), 10);

    const parseToDateStr = (val: any) => {
        if (!val) return null;
        try {
            const d = new Date(val);
            if (isNaN(d.getTime())) return null;
            return d.getFullYear() + '-' + 
                   String(d.getMonth() + 1).padStart(2, '0') + '-' + 
                   String(d.getDate()).padStart(2, '0');
        } catch (e) { return null; }
    };

    const evaluatedPromos = manualPromos
        .map(p => {
            const pPrice = Number(p.precioPromo || p.precioPromocion || 0);
            const discount = basePrice > 0 ? Math.round(((basePrice - pPrice) / basePrice) * 100) : 0;
            
            // No bloqueamos por porcentaje - las promos manuales son válidas cualquier sea su %

            // Verificamos estado y fechas de validez para todas las promociones
            const estado = String(p.estado || '').toLowerCase();
            if (estado !== '' && estado !== 'activa' && estado !== 'publicada') return null;
            
            const startStr = parseToDateStr(p.fechaInicio);
            const endStr = parseToDateStr(p.fechaFin);
            if (startStr && selectedDateStr < startStr) return null;
            if (endStr && selectedDateStr > endStr) return null;

            // Verificar días válidos de la semana (0 = Domingo, 1 = Lunes, etc.)
            const dayOfWeek = selectedDateObj.getDay();
            if (p.diasValidos && String(p.diasValidos).trim() !== '') {
                const validDays = String(p.diasValidos).split(',').map(Number);
                if (!validDays.includes(dayOfWeek)) return null;
            }

            // Mantener isTarget para el cálculo de prioridad
            const isTarget = discount === 20 || String(p.titulo || '').includes('20');

            if (p.horaInicioValida && p.horaFinValida && String(p.horaInicioValida).trim() !== '') {
                const sVal = parseInt(String(p.horaInicioValida).replace(':', ''), 10);
                const eVal = parseInt(String(p.horaFinValida).replace(':', ''), 10);
                if (eVal >= sVal) {
                    if (hourNum < sVal || hourNum > eVal) return null;
                } else {
                    if (hourNum < sVal && hourNum > eVal) return null;
                }
            }

            let label = `-${discount}%`;
            let hasPromo = discount > 0;
            if (p.tipoPromo === '2x1') {
                label = '2x1';
                hasPromo = true;
            } else if (p.tipoPromo === '3x1') {
                label = '3x1';
                hasPromo = true;
            }

            const priorityScore = (p.tipoPromo === '2x1' || p.tipoPromo === '3x1' ? 95 : discount) + (isTarget ? 20000 : 0);
            return { price: pPrice, hasPromotion: hasPromo, discountPercent: discount, labelText: label, source: 'manual' as const, priorityScore };
        })
        .filter(Boolean)
        .sort((a, b) => b!.priorityScore - a!.priorityScore);

    if (evaluatedPromos.length > 0) {
        const winner = evaluatedPromos[0]!;
        return { price: winner.price, hasPromotion: true, discountPercent: winner.discountPercent, labelText: winner.labelText, source: winner.source };
    }

    if (automaticDiscount && automaticDiscount.enabled) {
        const discount = Math.round(automaticDiscount.discountPercentage);
        if (discount > 0 && discount !== 67) {
            const dayOfWeek = selectedDateObj.getDay();
            const daysConfig = String(automaticDiscount.daysOfWeek || '');
            if (daysConfig.includes(String(dayOfWeek))) {
                const sVal = parseInt(automaticDiscount.startTime.replace(':', ''), 10);
                const eVal = parseInt(automaticDiscount.endTime.replace(':', ''), 10);
                if (hourNum >= sVal && hourNum <= eVal) {
                    const promoPrice = basePrice * (1 - (discount / 100));
                    return { price: promoPrice, hasPromotion: true, discountPercent: discount, labelText: `-${discount}%`, source: 'optimization' as const };
                }
            }
        }
    }

    return { price: basePrice, hasPromotion: false, discountPercent: 0, labelText: '', source: null };
};

    const totalDuracionMin = useMemo(() => selectedServiceIds.reduce((acc, id) => acc + (allServices.find((s: any) => s.id === id)?.duracion || 60), 0), [selectedServiceIds, allServices]);
    
    // Precio "estático" inicial (para el día de hoy)
    const totalPrecioInitial = useMemo(() => {
        const today = new Date();
        return selectedServiceIds.reduce((acc, id) => {
            const s = allServices.find((ser: any) => ser.id === id);
            if (!s) return acc;
            // Para el precio inicial (sin hora), evaluamos promociones manuales globales
            const res = resolveSlotPromotion("00:00", today, s, null);
            return acc + res.price;
        }, 0);
    }, [selectedServiceIds, allServices]);

    useEffect(() => {
        if (selectedBooking) {
            const precioRealParaFecha = selectedServiceIds.reduce((acc, id) => {
                const s = allServices.find((ser: any) => ser.id === id);
                if (!s) return acc;
                // Usar el motor unificado con la config de descuentos automáticos
                const res = resolveSlotPromotion(selectedBooking.hour, selectedBooking.date, s, negocio.automaticDiscount);
                return acc + res.price;
            }, 0);
            
            if (precioRealParaFecha !== selectedBooking.precio) {
                setSelectedBooking((prev: any) => ({
                    ...prev,
                    precio: precioRealParaFecha,
                    canchaNombre: selectedServiceIds.length > 1 ? allServices.find((s: any) => s.id === selectedServiceIds[0])?.nombre + ` +${selectedServiceIds.length - 1}` : allServices.find((s: any) => s.id === selectedServiceIds[0])?.nombre || 'SPA',
                }));
            }
        }
    }, [selectedServiceIds, allServices, selectedBooking?.date, selectedBooking?.hour, selectedBooking?.precio, selectedBooking?.discountPercentage]);

    const handleSelectSlot = (date: Date, hour: string, canchaId: string, duracion: number, discountPercentage: number = 0) => {
        if (!selectedStaffId) return;
        const staffMember = staff.find(s => s.id === selectedStaffId);
        
        let appliedPromoType: string | null = null;
        let appliedPromoPrice: number = 0;

        // Calcular precio final usando el motor unificado para cada servicio
        const precioRealParaFecha = selectedServiceIds.reduce((acc, id) => {
            const s = allServices.find((ser: any) => ser.id === id);
            if (!s) return acc;
            
            const res = resolveSlotPromotion(hour, date, s, negocio.automaticDiscount);

            // Detectar si hay promo manual aplicada
            if (res.hasPromotion && res.source === 'manual') {
                const manualPromos = [
                    ...(s.promociones || []),
                    ...(s.promocion ? [s.promocion] : []),
                    ...(s.PromotionToService || []).map((rel: any) => rel.Promotion),
                    ...(s.Promotion ? [s.Promotion] : [])
                ].filter(Boolean);
                
                const winningPromo = manualPromos.find(p => Number(p.precioPromo || p.precioPromocion || 0) === res.price);
                if (winningPromo) {
                    appliedPromoType = winningPromo.tipoPromo;
                    appliedPromoPrice = res.price;
                }
            }

            return acc + res.price;
        }, 0);

        setSelectedBooking({
            date, hour, canchaId: selectedServiceIds[0] || initialServiceId, staffId: selectedStaffId, staffName: staffMember?.name, duracion,
            canchaNombre: selectedServiceIds.length > 1 ? allServices.find((s: any) => s.id === selectedServiceIds[0])?.nombre + ` +${selectedServiceIds.length - 1}` : allServices.find((s: any) => s.id === selectedServiceIds[0])?.nombre || 'SPA',
            precio: precioRealParaFecha, slug, discountPercentage,
            tipoPromo: appliedPromoType,
            precioPromo: appliedPromoPrice
        });
    };

    const handleFinalConfirm = async () => {
        setShowValidationErrors(false);

        if (!formData.nombre || !formData.nombre.trim()) {
            setShowValidationErrors(true);
            const el = document.getElementById('checkout-nombre-input');
            el?.focus();
            el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }

        if (!formData.telefono || !formData.telefono.trim()) {
            setShowValidationErrors(true);
            const el = document.getElementById('checkout-phone-input');
            el?.focus();
            el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }

        if (!selectedBooking || selectedServiceIds.length === 0) {
            alert("Debe seleccionar al menos un servicio.");
            return;
        }
        setLoading(true);
        try {
            const [h, m] = selectedBooking.hour.split(':').map(Number);
            const totalMinutes = h * 60 + m + totalDuracionMin;
            const payload = {
                clienteNombre: formData.nombre || 'Cliente',
                clienteTelefono: formData.telefono,
                comentarios: formData.comentarios,
                fecha: format(selectedBooking.date, 'yyyy-MM-dd'),
                horaInicio: selectedBooking.hour,
                duracion: totalDuracionMin / 60,
                serviceId: selectedBooking.canchaId,
                staffId: selectedBooking.staffId,
                precioTotal: couponData ? couponData.totalConDescuento : selectedBooking.precio,
                couponCode: couponStatus === 'valid' ? couponCode.trim().toUpperCase() : undefined,
                extraServices: selectedServiceIds.slice(1).map(id => {
                    const s = allServices.find(ser => ser.id === id);
                    return { id: s?.id, nombre: s?.nombre, precio: s?.precio, duracion: s?.duracion };
                }),
                slug: slug,
                estado: 'pendiente'
            };
            const res = await fetch(`/api/public/${slug}/reservar`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            
            const data = await res.json();

            if (res.ok) {
                localStorage.setItem('customerInfo', JSON.stringify({ nombre: formData.nombre, telefono: formData.telefono }));
                
                const backupData = {
                    id: data.id,
                    fecha: selectedBooking.date,
                    horaInicio: selectedBooking.hour,
                    staff: staff.find((s: any) => s.id === selectedBooking.staffId),
                    service: allServices.find((s: any) => s.id === selectedBooking.canchaId)
                };
                localStorage.setItem(`last_appointment_${data.id}`, JSON.stringify(backupData));
                localStorage.setItem('last_appointment_latest', JSON.stringify(backupData));

                router.push(`/${slug}/confirmacion/${data.id}`);
            } else {
                // Muestra el error detallado y el código de Prisma
                alert("Error: " + (data.details || data.error || "Problema técnico") + (data.code ? " [Código: " + data.code + "]" : ""));
            }
        } catch (e: any) {
            console.error("Error confirmando reserva:", e);
            alert("Error de conexión. Verifica tu internet e inténtalo de nuevo.");
        } finally { setLoading(false); }
    };

    const isSelected = (id: string) => selectedServiceIds.includes(id);
    const toggleService = (id: string) => setSelectedServiceIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    const handleSelectStaff = (id: string) => { 
        setSelectedStaffId(id);
        setSelectedBooking(null); 
    };

    if (view === 'checkout') {
        const selectedMember = staff.find(s => s.id === selectedBooking?.staffId);
        return (
            <div className="fixed inset-0 z-[700] bg-white overflow-y-auto animate-in slide-in-from-right duration-500 text-left">
                <div className="sticky top-0 z-[710] bg-white/80 backdrop-blur-md px-6 py-5 flex items-center justify-between">
                    <button onClick={() => setView('calendar')} className="size-12 rounded-full bg-gray-50 flex items-center justify-center text-gray-500 hover:text-gray-900 border border-gray-100"><ArrowLeft size={24} /></button>
                    <div className="px-5 py-2.5 rounded-full border shadow-sm bg-white">
                        <span className="text-[11px] font-black italic uppercase tracking-widest leading-none block" style={{ color: primaryColor }}>Paso Final</span>
                    </div>
                </div>

                <div className="max-w-xl mx-auto px-6 pb-56 space-y-8 mt-4">
                    <div className="space-y-2">
                        <h2 className="text-4xl font-black italic tracking-tighter text-gray-900 uppercase leading-none">CONFIRMAR<br/>CITA</h2>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Completa tus datos para finalizar.</p>
                    </div>

                    <div className="bg-white rounded-[2.5rem] p-7 border border-gray-100 space-y-6 shadow-sm">
                        <div className="flex justify-between items-start border-b border-gray-50 pb-5">
                            <div className="space-y-3 flex-1">
                                {selectedServiceIds.map((id, idx) => {
                                    const s = allServices.find(ser => ser.id === id);
                                    return (
                                        <div key={id} className="flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-2">
                                                {idx === 0 ? <Scissors size={14} className="text-gray-400" /> : <Plus size={12} className="text-emerald-400" />}
                                                <span className="text-sm font-black italic text-gray-800 uppercase leading-tight">{s?.nombre}</span>
                                            </div>
                                            {showPrices && (
                                                <span className="text-sm font-bold text-gray-600">
                                                    ${resolveSlotPromotion(
                                                        selectedBooking?.hour || "00:00", 
                                                        selectedBooking?.date || new Date(), 
                                                        s, 
                                                        negocio.automaticDiscount
                                                    ).price.toFixed(2)}
                                                </span>
                                            )}
                                        </div>
                                    );
                                })}
                                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-dashed border-gray-100 italic">
                                    <Clock size={12} className="text-gray-400" />
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tiempo estimado: {totalDuracionMin} min</span>
                                </div>
                            </div>
                        </div>

                        {/* Fila del Descuento (si existe) */}
                        {selectedBooking && selectedBooking.discountPercentage > 0 && (
                            <div className="flex justify-between items-center pb-2">
                                <span className="text-[10px] font-black uppercase text-emerald-500 tracking-wider">Descuento aplicado</span>
                                <span className="text-xs font-black text-emerald-500">-{selectedBooking.discountPercentage}% OFF</span>
                            </div>
                        )}

                        {/* Fila del Total Separada */}
                        <div className="flex justify-between items-center pt-4 border-t-2 border-gray-50">
                            <span className="text-xs font-black uppercase text-gray-400 tracking-wider">
                                {selectedBooking?.tipoPromo === '2x1' ? 'Total a pagar (Promo 2x1)' : (selectedBooking?.tipoPromo === '3x1' ? 'Total a pagar (Promo 3x1)' : 'Total a pagar')}
                            </span>
                            {showPrices && (
                                <div className="flex items-baseline gap-2">
                                    {(selectedBooking?.tipoPromo === '2x1' || selectedBooking?.tipoPromo === '3x1') && (
                                        <span className="text-sm text-gray-400 line-through font-bold">
                                            ${((selectedBooking?.precio || 0) * (selectedBooking?.tipoPromo === '2x1' ? 2 : 3)).toFixed(2)}
                                        </span>
                                    )}
                                    <span className="text-2xl font-black text-gray-900 tracking-tighter">${selectedBooking?.precio.toFixed(2)}</span>
                                </div>
                            )}
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1 text-left">
                                <span className="text-[9px] font-black uppercase text-gray-400">Fecha</span>
                                <span className="text-xs font-black italic text-gray-900 uppercase">{selectedBooking && format(selectedBooking.date, "EEEE d MMM", { locale: es })}</span>
                            </div>
                            <div className="flex flex-col gap-1 text-right">
                                <span className="text-[9px] font-black uppercase text-gray-400">Horario de Inicio</span>
                                <span className="text-xs font-black italic text-gray-900 uppercase">{selectedBooking?.hour} HS</span>
                            </div>
                            {selectedBooking?.staffName && (
                                <div className="col-span-2 pt-2 flex items-center justify-between">
                                    <span className="text-[10px] font-black text-gray-400 uppercase">Especialista: <span className="text-gray-900 italic ml-1">{selectedBooking.staffName}</span></span>
                                    {(selectedMember?.imageMedia || selectedMember?.avatar) && <img src={(selectedMember.imageMedia as any)?.url ?? selectedMember.avatar} className="size-8 rounded-full border border-gray-100 object-cover" />}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-3 px-2">
                         <div className="size-2 rounded-full" style={{ backgroundColor: primaryColor }} />
                         <h3 className="text-[14px] font-black italic uppercase tracking-[0.2em]" style={{ color: primaryColor }}>Información de Contacto</h3>
                    </div>

                    <div className="rounded-[2.5rem] p-8 space-y-6 border border-gray-100/50" style={{ backgroundColor: `${primaryColor}15` }}>
                        
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Nombre Completo</label>
                            <div className={`rounded-2xl overflow-hidden border bg-white shadow-sm h-16 transition-all ${
                                showValidationErrors && (!formData.nombre || !formData.nombre.trim()) ? 'border-red-500 ring-2 ring-red-500/20' : 'border-gray-100'
                            }`}>
                                <input
                                    id="checkout-nombre-input"
                                    required
                                    value={formData.nombre}
                                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                                    placeholder="Escribe aquí..."
                                    className="w-full h-full bg-transparent px-6 font-black text-slate-900 placeholder:text-gray-300 outline-none transition-all"
                                    style={{ color: '#030712', '--tw-ring-color': `color-mix(in srgb, ${primaryColor}, transparent 95%)` } as any} 
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Celular de Contacto</label>
                            <div className={`rounded-2xl overflow-hidden border bg-white shadow-sm min-h-20 transition-all ${
                                showValidationErrors && (!formData.telefono || !formData.telefono.trim()) ? 'border-red-500 ring-2 ring-red-500/20' : 'border-gray-100'
                            }`}>
                                <PhoneInput 
                                    id="checkout-phone-input"
                                    value={formData.telefono} 
                                    onChange={(val) => { console.log("Updating tel:", val); setFormData({ ...formData, telefono: val }); }} 
                                    className="h-full" 
                                />
                            </div>
                        </div>

                        {/* ===== SECCIÓN DE CUPONES DEL CLIENTE / CATÁLOGO ===== */}
                        {clientCoupons.length > 0 && (
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">🎟️ Tus Cupones Disponibles</label>
                                <div className="rounded-2xl overflow-hidden border border-gray-100 bg-white shadow-sm h-14 relative flex items-center px-4">
                                    <select
                                        value={isCustomCouponCode ? "custom" : (couponStatus === 'valid' || couponStatus === 'checking' ? couponCode : "")}
                                        onChange={(e) => handleSelectClientCoupon(e.target.value)}
                                        className="w-full h-full bg-transparent font-black text-slate-800 text-xs uppercase tracking-wider outline-none cursor-pointer"
                                        style={{ color: '#1e293b' }}
                                    >
                                        <option value="">Selecciona uno de tus cupones...</option>
                                        {clientCoupons.map((coupon) => (
                                            <option key={coupon.id} value={coupon.codigo}>
                                                {coupon.nombre} ({coupon.codigo}) — Desc: {coupon.tipo === 'PORCENTAJE' ? `${coupon.descuento}%` : `$${coupon.descuento}`}
                                            </option>
                                        ))}
                                        <option value="custom">✏️ Ingresar otro código manualmente...</option>
                                    </select>
                                </div>
                                {clientCoupons.length > 0 && !isCustomCouponCode && couponStatus === 'valid' && couponData && (
                                    <p className="text-[10px] font-black text-green-600 ml-4 mt-2">
                                        ✅ {couponData.tipo === 'PORCENTAJE' ? `${couponData.valor}% OFF aplicado` : `$${couponData.valor} OFF aplicado`} — Ahorras ${couponData.descuento.toFixed(2)}
                                    </p>
                                )}
                                {clientCoupons.length > 0 && !isCustomCouponCode && couponStatus === 'invalid' && (
                                    <p className="text-[10px] font-black text-red-500 ml-4 mt-2">❌ {couponError}</p>
                                )}
                            </div>
                        )}

                        {(clientCoupons.length === 0 || isCustomCouponCode) && (
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">🎟️ Escribe tu Cupón</label>
                                <div className={`rounded-2xl overflow-hidden border bg-white shadow-sm flex h-14 transition-all ${
                                    couponStatus === 'valid' ? 'border-green-400' :
                                    couponStatus === 'invalid' ? 'border-red-300' :
                                    'border-gray-100'
                                }`}>
                                    <input
                                        value={couponCode}
                                        onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponStatus('idle'); setCouponData(null); }}
                                        onKeyDown={(e) => e.key === 'Enter' && handleValidateCoupon()}
                                        placeholder="Código de cupón..."
                                        className="flex-1 h-full bg-transparent px-5 font-black text-slate-900 placeholder:text-gray-300 outline-none uppercase tracking-widest text-[13px]"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => handleValidateCoupon()}
                                        disabled={!couponCode.trim() || couponStatus === 'checking'}
                                        className="px-4 text-[10px] font-black uppercase tracking-widest text-white rounded-r-2xl disabled:opacity-40 border-0 cursor-pointer transition-all"
                                        style={{ backgroundColor: primaryColor }}
                                    >
                                        {couponStatus === 'checking' ? '...' : 'Aplicar'}
                                    </button>
                                </div>
                                {couponStatus === 'valid' && couponData && (
                                    <p className="text-[10px] font-black text-green-600 ml-4">
                                        ✅ {couponData.tipo === 'PORCENTAJE' ? `${couponData.valor}% OFF aplicado` : `$${couponData.valor} OFF applied`} — Ahorras ${couponData.descuento.toFixed(2)}
                                    </p>
                                )}
                                {couponStatus === 'invalid' && (
                                    <p className="text-[10px] font-black text-red-500 ml-4">❌ {couponError}</p>
                                )}
                            </div>
                        )}

                        <div className="space-y-2 text-left">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Notas adicionales</label>
                            <div className="rounded-2xl overflow-hidden border border-gray-100 bg-white shadow-sm">
                                <textarea
                                    value={formData.comentarios}
                                    rows={3}
                                    onChange={(e) => setFormData({ ...formData, comentarios: e.target.value })}
                                    placeholder="¿Algún detalle para tu turno?"
                                    className="w-full bg-transparent p-6 font-black text-slate-900 placeholder:text-gray-300 outline-none resize-none transition-all"
                                    style={{ color: '#030712', '--tw-ring-color': `color-mix(in srgb, ${primaryColor}, transparent 95%)` } as any} 
                                />
                            </div>
                        </div>
                    </div>

                    <div className="fixed bottom-2 left-2 right-2 z-[720] max-w-lg mx-auto">
                        <div className="bg-white rounded-[3rem] p-5 shadow-[0_25px_60px_rgba(0,0,0,0.18)] border border-gray-100 flex flex-col gap-6">
                            <div className="flex justify-between items-end px-5 text-left">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black text-gray-400 uppercase mb-1.5">{selectedServiceIds.length > 1 ? 'Servicios' : 'Tu Turno'}</span>
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-2">
                                            <span className="text-4xl font-black text-gray-900 tracking-tighter leading-none">{selectedBooking?.hour}</span>
                                            <span className="text-[10px] text-gray-400 font-bold uppercase mt-2">HS</span>
                                        </div>
                                        <span className="text-[10px] font-black uppercase italic mt-1" style={{ color: primaryColor }}>
                                            {selectedBooking && format(selectedBooking.date, "EEE d 'de' MMM", { locale: es })}
                                        </span>
                                    </div>
                                </div>
                                {showPrices && (
                                    <div className="text-right flex flex-col">
                                        <span className="text-[10px] font-black text-gray-400 uppercase mb-1.5">Total a Pagar</span>
                                        {couponStatus === 'valid' && couponData ? (
                                            <div className="flex flex-col items-end">
                                                <span className="text-[12px] font-black text-gray-400 line-through leading-none">${selectedBooking?.precio.toFixed(2)}</span>
                                                <span className="text-4xl font-black tracking-tighter leading-none" style={{ color: primaryColor }}>${couponData.totalConDescuento.toFixed(2)}</span>
                                            </div>
                                        ) : (
                                            <span className="text-4xl font-black text-gray-950 tracking-tighter leading-none">${selectedBooking?.precio.toFixed(2)}</span>
                                        )}
                                    </div>
                                )}
                            </div>
                            <button 
                                type="button"
                                onClick={(e) => { e.preventDefault(); console.log("Clicked confirm"); handleFinalConfirm(); }} 
                                disabled={loading} 
                                className="w-full h-18 text-white rounded-[2rem] font-black text-[14px] tracking-[0.2em] transition-all flex items-center justify-center gap-4 uppercase disabled:opacity-50 disabled:cursor-not-allowed" 
                                style={{ backgroundColor: primaryColor }}
                            >
                                {loading ? <Loader2 className="animate-spin" /> : <><span>CONFIRMAR Y AGENDAR</span><Check size={20} strokeWidth={4} /></>}
                            </button>
                        </div>
                    </div>
                </div>

                {/* SUPER LOADING OVERLAY CLIENTE */}
                {loading && (
                    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-300">
                        <div className="relative flex flex-col items-center">
                            {/* Círculo exterior */}
                            <div className="size-24 rounded-full border-4 border-t-transparent animate-spin" style={{ borderColor: `${primaryColor}20`, borderTopColor: primaryColor }} />
                            {/* Círculo interior */}
                            <div className="absolute inset-0 size-24 rounded-full border-4 border-dashed animate-spin [animation-direction:reverse] [animation-duration:3s]" style={{ borderColor: `${primaryColor}10` }} />
                            
                            <div className="mt-8 space-y-3 text-center">
                                <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter animate-pulse">
                                    Reservando tu Turno
                                </h3>
                                <p className="text-[10px] font-black uppercase tracking-[0.3em] leading-none animate-pulse" style={{ color: primaryColor }}>
                                    Generando cita y notificaciones...
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-12 pb-56 relative text-left">
            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes shake-highlight {
                    0%, 100% { transform: translateX(0); }
                    15%, 45%, 75% { transform: translateX(-6px); }
                    30%, 60%, 90% { transform: translateX(6px); }
                }
                .animate-calendar-shake {
                    animation: shake-highlight 0.5s ease-in-out;
                }
            `}} />
            {/* --primary ya está definido por el layout server-side */}
            <div className="space-y-5 px-2">
                <div className="flex items-center gap-2 px-1">
                    <Sparkles size={12} style={{ color: primaryColor }} /> 
                    <h3 className="text-[11px] font-black tracking-widest text-gray-900 uppercase italic">1. Servicios</h3>
                </div>
                
                <div className="space-y-3">
                    {/* Servicios Seleccionados */}
                    {allServices.filter(s => isSelected(s.id)).map((service: any) => (
                        <div key={service.id} className="flex items-center justify-between p-5 rounded-[2rem] border border-gray-100 bg-white shadow-sm ring-1 ring-gray-100 animate-in zoom-in-95 duration-300">
                            <div className="flex items-center gap-4">
                                <button 
                                    onClick={() => toggleService(service.id)}
                                    className="size-12 rounded-2xl flex items-center justify-center text-white shadow-lg transition-transform active:scale-90" 
                                    style={{ backgroundColor: primaryColor }}
                                >
                                    <Check size={20} strokeWidth={3} />
                                </button>
                                <div>
                                    <p className="text-base font-black text-gray-900 leading-none">{service.nombre}</p>
                                    <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase">{service.duracion} min</p>
                                </div>
                            </div>
                            {showPrices && (
                                <span className="text-xl font-black text-gray-900">
                                    ${resolveSlotPromotion(
                                        selectedBooking?.hour || "00:00", 
                                        selectedBooking?.date || new Date(), 
                                        service, 
                                        negocio.automaticDiscount
                                    ).price.toFixed(2)}
                                </span>
                            )}
                        </div>
                    ))}
                </div>

                {/* Recomendados para añadir */}
                {otherServices.filter(s => !isSelected(s.id)).length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-100/50">
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 ml-2">¿Complementas tu experiencia?</p>
                        <div className="flex gap-3 overflow-x-auto pb-4 hide-scrollbar px-1">
                            {otherServices.filter(s => !isSelected(s.id)).map((s: any) => (
                                <button
                                    key={s.id}
                                    onClick={() => toggleService(s.id)}
                                    className="flex-shrink-0 w-36 aspect-[4/3] p-4 rounded-[2rem] border border-gray-100 bg-white hover:border-primary/30 transition-all flex flex-col justify-between text-left group shadow-sm"
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="size-8 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-white group-hover:shadow-sm transition-all"
                                             style={{ color: isSelected(s.id) ? 'white' : undefined, backgroundColor: isSelected(s.id) ? primaryColor : undefined }}>
                                             <Plus size={16} strokeWidth={3} style={{ color: isSelected(s.id) ? 'white' : undefined }} />
                                         </div>
                                        {showPrices && <span className="text-[11px] font-black text-gray-900">${s.precio}</span>}
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black leading-tight uppercase text-gray-900 line-clamp-2">{s.nombre}</p>
                                        <p className="text-[8px] font-bold text-gray-400 uppercase mt-1">{s.duracion} min</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
            {availableStaff.length > 0 ? (
                <div className="space-y-5">
                    <div className="flex items-center gap-2 px-3"><User size={12} style={{ color: primaryColor }} /> <h3 className="text-[11px] font-black tracking-widest text-gray-900 uppercase italic">2. Profesional</h3></div>
                    <div className="flex gap-4 overflow-x-auto pt-2 pb-4 px-3 hide-scrollbar">
                        {availableStaff.map((member) => (
                            <button key={member.id} onClick={() => handleSelectStaff(member.id)} className={`flex-shrink-0 flex flex-col items-center gap-3 p-5 rounded-[2.5rem] border transition-all min-w-[130px] ${selectedStaffId === member.id ? 'bg-gray-50 border-primary/20 scale-105 shadow-sm' : 'bg-white border-gray-100'}`}>
                                <div className="size-18 rounded-full overflow-hidden border-2 shadow-sm" style={{ borderColor: selectedStaffId === member.id ? primaryColor : 'white' }}>
                                    {(member.imageMedia || member.avatar) 
                                        ? <img src={(member.imageMedia as any)?.url ?? member.avatar} className="w-full h-full object-cover" /> 
                                        : <div className="w-full h-full bg-gray-100 flex items-center justify-center font-black text-gray-400">{member.name[0]}</div>}
                                </div>
                                <p className="text-xs font-black text-gray-900">{member.name}</p>
                            </button>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="px-3 py-4 bg-amber-50 rounded-3xl border border-amber-100 flex items-center gap-3">
                    <Users size={16} className="text-amber-500" />
                    <p className="text-[10px] font-bold text-amber-700 uppercase tracking-widest leading-tight">No hay profesionales disponibles para este servicio hoy.</p>
                </div>
            )}
            <div id="booking-calendar" className={`relative space-y-4 px-2 transition-all duration-500 rounded-3xl ${shakeCalendar ? 'animate-calendar-shake ring-4 ring-pink-500/50' : ''}`}>
                {/* Overlay Bloqueador */}
                {(!selectedStaffId) && (
                    <div 
                        className="absolute inset-0 z-50 flex items-center justify-center bg-white/40 backdrop-blur-[1px] rounded-3xl cursor-not-allowed"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                        }}
                    >
                        <div className="bg-white/90 px-4 py-2 rounded-full shadow-sm border border-gray-100 flex items-center gap-2">
                            <User size={12} className="text-gray-400" />
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Selecciona un profesional primero</span>
                        </div>
                    </div>
                )}
                
                <div className={`space-y-4 transition-all duration-500 ${(!selectedStaffId) ? 'opacity-30 grayscale-[0.5] pointer-events-none' : ''}`}>
                    <div className="flex items-center gap-2 px-1"><Clock size={12} style={{ color: primaryColor }} /> <h3 className="text-[11px] font-black tracking-widest text-gray-900 uppercase italic">3. Horario</h3></div>
                    <BookingCalendar 
                        canchas={[
                            // Los servicios seleccionados primero para que el motor use el correcto
                            ...negocio.services
                                .filter((s: any) => selectedServiceIds.includes(s.id))
                                .map((s: any) => ({ ...s, precioHora: s.precio })),
                            // Resto de servicios
                            ...negocio.services
                                .filter((s: any) => !selectedServiceIds.includes(s.id))
                                .map((s: any) => ({ ...s, precioHora: s.precio })),
                        ]}
                        horarioApertura={negocio.horarioApertura || "09:00"}
                        horarioCierre={negocio.horarioCierre || "22:00"}
                        onSelectSlot={handleSelectSlot}
                        duracionFija={totalDuracionMin/60}
                        staffId={selectedStaffId}
                        showPrices={showPrices}
                        automaticDiscount={negocio.automaticDiscount}
                        diasAtencion={parsedConfig?.diasAtencion}
                    />
                </div>
            </div>
            <div className="fixed bottom-2 left-2 right-2 z-[300] max-w-lg mx-auto">
                <div className="bg-white rounded-[2.2rem] p-5 shadow-xl border border-gray-100 flex flex-col gap-5">
                    <div className="flex justify-between items-start px-2">
                        <div className="flex flex-col">
                            <span className="text-[9px] font-black text-gray-400 uppercase mb-1">{selectedBooking ? 'FECHA Y HORA' : (showPrices ? 'TOTAL' : 'SERVICIO')}</span>
                            <div className="text-3xl font-black text-gray-900 leading-none">
                                {selectedBooking ? (
                                    <div className="flex flex-col items-start">
                                        <div className="flex items-center gap-2">
                                            <span>{selectedBooking.hour}</span>
                                            <span className="text-[10px] text-gray-400 font-bold uppercase">HS</span>
                                        </div>
                                        <span className="text-[10px] font-black text-primary uppercase italic mt-1" style={{ color: primaryColor }}>
                                            {format(selectedBooking.date, "EEE d 'de' MMM", { locale: es })}
                                        </span>
                                    </div>
                                ) : (showPrices ? `$${totalPrecioInitial.toFixed(2)}` : 'SPA')}
                            </div>
                        </div>
                        {showPrices && selectedBooking && (
                            <div className="text-right flex flex-col items-end justify-end">
                                <span className="text-[9px] font-black text-gray-400 uppercase mb-1">
                                    {selectedBooking.tipoPromo === '2x1' ? 'PROMO 2x1' : (selectedBooking.tipoPromo === '3x1' ? 'PROMO 3x1' : 'TOTAL')}
                                </span>
                                <div className="flex items-baseline gap-2">
                                    {(selectedBooking.tipoPromo === '2x1' || selectedBooking.tipoPromo === '3x1') && (
                                        <span className="text-xs text-gray-400 line-through font-bold">
                                            ${((selectedBooking.precio || 0) * (selectedBooking.tipoPromo === '2x1' ? 2 : 3)).toFixed(2)}
                                        </span>
                                    )}
                                    <span className="text-3xl font-black text-gray-900 leading-none">
                                        ${selectedBooking.precio.toFixed(2)}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                    <button 
                        onClick={() => { 
                            if (selectedServiceIds.length === 0) {
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                                return;
                            }
                            if (selectedBooking) { 
                                setView('checkout'); 
                                window.scrollTo(0,0); 
                            } else { 
                                setShakeCalendar(true);
                                setTimeout(() => setShakeCalendar(false), 800);
                                document.getElementById('booking-calendar')?.scrollIntoView({ behavior: 'smooth'}); 
                            } 
                        }} 
                        className={`w-full h-16 text-white rounded-[1.6rem] font-black text-[13px] tracking-widest flex items-center justify-center gap-3 transition-all ${selectedServiceIds.length === 0 ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}`} 
                        style={{ backgroundColor: selectedServiceIds.length === 0 ? '#d1d5db' : primaryColor }}
                        disabled={selectedServiceIds.length === 0}
                    >
                        <span>{selectedServiceIds.length === 0 ? 'ELIGE UN SERVICIO' : (selectedBooking ? 'CONFIRMAR' : 'ELEGIR HORA')}</span>
                        {selectedServiceIds.length > 0 && <Check size={18} />}
                    </button>
                </div>
            </div>
        </div>
    );
}
