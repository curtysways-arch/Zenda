'use client';

import { useState, useMemo, useEffect } from 'react';
import BookingCalendar from '@/components/BookingCalendar';
import { Check, Clock, Plus, Sparkles, User, Users, ChevronRight, ChevronDown, ArrowLeft, ArrowRight, Calendar, Loader2, Scissors } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useSession } from 'next-auth/react';
import PhoneInput from '@/components/ui/PhoneInput';
import { useRouter, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { parsePackInfo } from '@/lib/packHelper';

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
    // Promo forzada: cuando el usuario llega desde la tarjeta de una promo específica
    const forcedPromoId = searchParams.get('promoId');

    // Vista: 'calendar' o 'checkout'
    const [view, setView] = useState<'calendar' | 'checkout'>('calendar');
    
    const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>(
        initialServiceId ? [initialServiceId] : (urlServiceId ? [urlServiceId] : (allServices.length > 0 ? [allServices[0].id] : []))
    );
    
    // Staff disponible para el servicio actualmente seleccionado (o general)
    const currentStaffList = useMemo(() => {
        const activeServiceId = selectedServiceIds[0];
        const currentService = allServices.find((s: any) => s.id === activeServiceId);
        if (currentService?.Staff && Array.isArray(currentService.Staff) && currentService.Staff.length > 0) {
            return currentService.Staff.filter((s: any) => s.active !== false);
        }
        return staff.filter((s: any) => s.active !== false);
    }, [selectedServiceIds, allServices, staff]);

    const availableStaff = currentStaffList;
    
    const [selectedStaffId, setSelectedStaffId] = useState<string | undefined>(
        urlStaffId && currentStaffList.some(s => s.id === urlStaffId) 
            ? urlStaffId 
            : (currentStaffList.length > 0 ? currentStaffList[0].id : undefined)
    );
    const [showStaffDropdown, setShowStaffDropdown] = useState(false);
    const [showExtraServices, setShowExtraServices] = useState(false);

    // Mantener seleccionado un staff valido cuando cambia el servicio
    useEffect(() => {
        if (currentStaffList.length > 0) {
            if (!selectedStaffId || !currentStaffList.some(s => s.id === selectedStaffId)) {
                setSelectedStaffId(currentStaffList[0].id);
                setSelectedBooking(null);
            }
        }
    }, [currentStaffList, selectedStaffId]);
    
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
    const [shakeProfessional, setShakeProfessional] = useState(false);

    // Servicios Gratis del usuario
    const [freeServices, setFreeServices] = useState<any[]>([]);

    // Cashback del usuario
    const [userCashback, setUserCashback] = useState(0);
    const [applyCashback, setApplyCashback] = useState(false);

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
            
            const fetchUserProfile = async () => {
                try {
                    const res = await fetch(`/api/${slug}/referrals/me?t=${Date.now()}`);
                    if (res.ok) {
                        const data = await res.json();
                        setUserCashback(Number(data.cashback) || 0.0);
                    }
                } catch (e) {
                    console.error("Error fetching user profile for cashback:", e);
                }
            };

            fetchClientCoupons();
            fetchUserProfile();
        }
    }, [view, slug]);

    useEffect(() => {
        const fetchFreeServices = async () => {
            try {
                const res = await fetch(`/api/public/${slug}/loyalty/my-rewards`);
                if (res.ok) {
                    const data = await res.json();
                    const disponibles = data.disponibles || [];
                    const freeSrvs = disponibles.filter((r: any) => 
                        (r.rewardType === 'SERVICIO_GRATIS' || r.rewardType === 'SERVICIO') && r.serviceId
                    );
                    setFreeServices(freeSrvs);
                }
            } catch (e) {
                console.error("Error cargando servicios gratis:", e);
            }
        };
        if (slug) {
            fetchFreeServices();
        }
    }, [slug]);

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

    // Validar si el usuario tiene este servicio gratis disponible
    const freeService = freeServices.find((fs: any) => fs.serviceId === service.id && fs.estado === 'DISPONIBLE');
    if (freeService) {
        return { price: 0, hasPromotion: true, discountPercent: 100, labelText: 'Gratis (Premio)', source: 'free_service' };
    }

    // 1. Recolección de promociones (Soporte nombre/name)
    const allManualPromos = [
        ...(service.promociones || []),
        ...(service.promocion ? [service.promocion] : []),
        ...(service.PromotionToService || []).map((rel: any) => rel.Promotion),
        ...(service.Promotion ? [service.Promotion] : [])
    ].filter(Boolean);

    // Si hay una promo forzada (desde URL ?promoId=), mostrar solo esa
    const manualPromos = forcedPromoId
        ? allManualPromos.filter((p: any) => p.id === forcedPromoId)
        : allManualPromos;

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
            } else if (p.tipoPromo === 'combo_pack' || p.tipoPromo === 'pack') {
                label = 'PACK';
                hasPromo = true;
            }

            const priorityScore = (p.tipoPromo === '2x1' || p.tipoPromo === '3x1' ? 95 : (p.tipoPromo === 'combo_pack' || p.tipoPromo === 'pack' ? 90 : discount)) + (isTarget ? 20000 : 0);
            return { price: pPrice, hasPromotion: hasPromo, discountPercent: discount, labelText: label, source: 'manual' as const, priorityScore, promo: p };
        })
        .filter(Boolean)
        .sort((a, b) => b!.priorityScore - a!.priorityScore);

    if (evaluatedPromos.length > 0) {
        const winner = evaluatedPromos[0]!;
        return { price: winner.price, hasPromotion: true, discountPercent: winner.discountPercent, labelText: winner.labelText, source: winner.source, promotion: (winner as any).promo };
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
                    return { price: promoPrice, hasPromotion: true, discountPercent: discount, labelText: `-${discount}%`, source: 'optimization' as const, promotion: null };
                }
            }
        }
    }

    return { price: basePrice, hasPromotion: false, discountPercent: 0, labelText: '', source: null, promotion: null };
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

    const activePackInfo = useMemo(() => {
        if (selectedBooking?.packPromo) return parsePackInfo(selectedBooking);
        const mainService = allServices.find((s: any) => s.id === (selectedServiceIds[0] || initialServiceId)) || primaryService;
        if (mainService) {
            const fromService = parsePackInfo(mainService);
            if (fromService) return fromService;
        }
        return null;
    }, [selectedBooking, selectedServiceIds, initialServiceId, allServices, primaryService]);

    useEffect(() => {
        if (selectedBooking) {
            let currentPackPromo = selectedBooking.packPromo;
            let currentPromoType = selectedBooking.tipoPromo;

            const precioRealParaFecha = selectedServiceIds.reduce((acc, id) => {
                const s = allServices.find((ser: any) => ser.id === id);
                if (!s) return acc;
                // Usar el motor unificado con la config de descuentos automáticos
                const res = resolveSlotPromotion(selectedBooking.hour, selectedBooking.date, s, negocio.automaticDiscount);

                if (res.hasPromotion && res.source === 'manual') {
                    const manualPromos = [
                        ...(s.promociones || []),
                        ...(s.promocion ? [s.promocion] : []),
                        ...(s.PromotionToService || []).map((rel: any) => rel.Promotion),
                        ...(s.Promotion ? [s.Promotion] : [])
                    ].filter(Boolean);
                    const wp = (res as any).promotion || manualPromos.find((p: any) => Number(p.precioPromo || p.precioPromocion || 0) === res.price);
                    if (wp) {
                        currentPromoType = wp.tipoPromo;
                        const isPack = wp.tipoPromo === 'combo_pack' || 
                                       wp.tipoPromo === 'pack' || 
                                       (wp.PromotionToService && wp.PromotionToService.length > 1) ||
                                       String(wp.titulo || '').toLowerCase().includes('pack') ||
                                       String(wp.titulo || '').toLowerCase().includes('combo');
                        if (isPack) {
                            const included = (wp.PromotionToService || [])
                                .map((pts: any) => pts.Service?.nombre || pts.Service?.name)
                                .filter(Boolean);
                            const includedDetails = (wp.PromotionToService || [])
                                .map((pts: any) => ({
                                    nombre: pts.Service?.nombre || pts.Service?.name,
                                    duracion: pts.Service?.duracion,
                                    precio: pts.Service?.precio
                                }))
                                .filter((item: any) => Boolean(item.nombre));

                            currentPackPromo = {
                                id: wp.id,
                                titulo: wp.titulo,
                                descripcion: wp.descripcion,
                                precioPromo: res.price,
                                precioOriginal: wp.precioAnterior || s.precio,
                                servicios: included.length > 0 ? included : [s.nombre],
                                serviciosDetalle: includedDetails.length > 0 ? includedDetails : undefined,
                                tipoPromo: wp.tipoPromo
                            };
                        }
                    }
                }

                return acc + res.price;
            }, 0);
            
            if (precioRealParaFecha !== selectedBooking.precio || currentPackPromo !== selectedBooking.packPromo) {
                setSelectedBooking((prev: any) => ({
                    ...prev,
                    precio: precioRealParaFecha,
                    tipoPromo: currentPromoType,
                    packPromo: currentPackPromo,
                    canchaNombre: selectedServiceIds.length > 1 ? allServices.find((s: any) => s.id === selectedServiceIds[0])?.nombre + ` +${selectedServiceIds.length - 1}` : allServices.find((s: any) => s.id === selectedServiceIds[0])?.nombre || 'SPA',
                }));
            }
        }
    }, [selectedServiceIds, allServices, selectedBooking?.date, selectedBooking?.hour, selectedBooking?.precio, selectedBooking?.discountPercentage]);

    useEffect(() => {
        if (selectedBooking && selectedBooking.precio === 0) {
            setCouponCode('');
            setCouponStatus('idle');
            setCouponData(null);
            setCouponError('');
        }
    }, [selectedBooking?.precio]);


    const handleSelectSlot = (date: Date, hour: string, canchaId: string, duracion: number, discountPercentage: number = 0) => {
        // Solo bloquear si el negocio tiene staff disponible y ninguno está seleccionado
        if (availableStaff.length > 0 && !selectedStaffId) return;
        const staffMember = selectedStaffId ? staff.find(s => s.id === selectedStaffId) : undefined;
        
        let appliedPromoType: string | null = null;
        let appliedPromoPrice: number = 0;
        let appliedPackPromo: any = null;

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
                
                const winningPromo = (res as any).promotion || manualPromos.find((p: any) => Number(p.precioPromo || p.precioPromocion || 0) === res.price);
                if (winningPromo) {
                    appliedPromoType = winningPromo.tipoPromo;
                    appliedPromoPrice = res.price;

                    const isPack = winningPromo.tipoPromo === 'combo_pack' || 
                                   winningPromo.tipoPromo === 'pack' || 
                                   (winningPromo.PromotionToService && winningPromo.PromotionToService.length > 1) ||
                                   String(winningPromo.titulo || '').toLowerCase().includes('pack') ||
                                   String(winningPromo.titulo || '').toLowerCase().includes('combo');

                    if (isPack) {
                        const included = (winningPromo.PromotionToService || [])
                            .map((pts: any) => pts.Service?.nombre || pts.Service?.name)
                            .filter(Boolean);
                        const includedDetails = (winningPromo.PromotionToService || [])
                            .map((pts: any) => ({
                                nombre: pts.Service?.nombre || pts.Service?.name,
                                duracion: pts.Service?.duracion,
                                precio: pts.Service?.precio
                            }))
                            .filter((item: any) => Boolean(item.nombre));

                        appliedPackPromo = {
                            id: winningPromo.id,
                            titulo: winningPromo.titulo,
                            descripcion: winningPromo.descripcion,
                            precioPromo: res.price,
                            precioOriginal: winningPromo.precioAnterior || s.precio,
                            servicios: included.length > 0 ? included : [s.nombre],
                            serviciosDetalle: includedDetails.length > 0 ? includedDetails : undefined,
                            tipoPromo: winningPromo.tipoPromo
                        };
                    }
                }
            }

            return acc + res.price;
        }, 0);

        setSelectedBooking({
            date, hour, canchaId: canchaId || selectedServiceIds[0] || initialServiceId, staffId: selectedStaffId, staffName: staffMember?.name, duracion,
            canchaNombre: selectedServiceIds.length > 1 ? allServices.find((s: any) => s.id === selectedServiceIds[0])?.nombre + ` +${selectedServiceIds.length - 1}` : allServices.find((s: any) => s.id === selectedServiceIds[0])?.nombre || 'SPA',
            precio: precioRealParaFecha, slug, discountPercentage,
            tipoPromo: appliedPromoType,
            precioPromo: appliedPromoPrice,
            packPromo: appliedPackPromo
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
            const matchingReward = freeServices.find((fs: any) => fs.serviceId === selectedBooking.canchaId && fs.estado === 'DISPONIBLE');
            const subtotal = couponData ? couponData.totalConDescuento : selectedBooking.precio;
            const cashbackADescontar = applyCashback ? Math.min(userCashback, subtotal) : 0;
            const precioFinal = Math.max(0, subtotal - cashbackADescontar);

            let comentariosConPack = formData.comentarios || '';
            if (selectedBooking.packPromo) {
                const pack = selectedBooking.packPromo;
                const serviciosTxt = Array.isArray(pack.servicios) && pack.servicios.length > 0
                    ? pack.servicios.map((s: string) => `• ${s}`).join('\n')
                    : `• ${allServices.find((s: any) => s.id === selectedBooking.canchaId)?.nombre || 'Servicio'}`;
                comentariosConPack = `📦 Pack Promocional: ${pack.titulo}\nTratamientos incluidos:\n${serviciosTxt}${comentariosConPack ? `\n\nNotas del cliente: ${comentariosConPack}` : ''}`;
            }

            const payload = {
                clienteNombre: formData.nombre || 'Cliente',
                clienteTelefono: formData.telefono,
                comentarios: comentariosConPack,
                packPromo: selectedBooking.packPromo,
                fecha: format(selectedBooking.date, 'yyyy-MM-dd'),
                horaInicio: selectedBooking.hour,
                duracion: totalDuracionMin / 60,
                serviceId: selectedBooking.canchaId,
                staffId: selectedBooking.staffId,
                precioTotal: precioFinal,
                couponCode: couponStatus === 'valid' ? couponCode.trim().toUpperCase() : undefined,
                rewardId: matchingReward ? matchingReward.id : undefined, // Enviar rewardId de servicio gratis
                cashbackApplied: cashbackADescontar,
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

                        {/* Tarjeta Desglose Pack Promocional o de la Promo */}
                        {selectedBooking?.packPromo && (
                            <div className={`border-2 rounded-3xl p-5 text-left space-y-3.5 shadow-sm ${
                                selectedBooking.packPromo.isPack
                                    ? 'bg-gradient-to-br from-indigo-50/90 via-sky-50/70 to-blue-50/80 border-indigo-200/80'
                                    : 'bg-gradient-to-br from-emerald-50/90 via-teal-50/70 to-sky-50/80 border-emerald-200/80'
                            }`}>
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-2.5">
                                        <div className={`size-9 rounded-xl text-white flex items-center justify-center shadow-md shrink-0 ${
                                            selectedBooking.packPromo.isPack ? 'bg-indigo-600 shadow-indigo-200' : 'bg-emerald-600 shadow-emerald-200'
                                        }`}>
                                            <Sparkles size={16} className="animate-pulse" />
                                        </div>
                                        <div>
                                            <span className={`text-[9px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded-full border inline-block ${
                                                selectedBooking.packPromo.isPack 
                                                    ? 'text-indigo-700 bg-indigo-100/90 border-indigo-200' 
                                                    : 'text-emerald-700 bg-emerald-100/90 border-emerald-200'
                                            }`}>
                                                {selectedBooking.packPromo.isPack ? '📦 Pack Promocional Aplicado' : '🔥 Promoción Especial Aplicada'}
                                            </span>
                                            <h4 className="text-xs font-black text-slate-900 uppercase italic tracking-tight mt-1 leading-snug">
                                                {selectedBooking.packPromo.titulo}
                                            </h4>
                                        </div>
                                    </div>
                                    {selectedBooking.packPromo.precioOriginal && (
                                        <div className="text-right shrink-0">
                                            <span className="text-[10px] text-slate-400 line-through font-bold block">
                                                ${Number(selectedBooking.packPromo.precioOriginal).toFixed(2)}
                                            </span>
                                            <span className={`text-base font-black italic ${
                                                selectedBooking.packPromo.isPack ? 'text-indigo-600' : 'text-emerald-600'
                                            }`}>
                                                ${Number(selectedBooking.packPromo.precioPromo).toFixed(2)}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {selectedBooking.packPromo.descripcion && (
                                    <p className="text-[11px] text-slate-600 font-medium leading-relaxed bg-white/70 p-2.5 rounded-xl border border-slate-100">
                                        {selectedBooking.packPromo.descripcion}
                                    </p>
                                )}

                                {selectedBooking.packPromo.isPack && selectedBooking.packPromo.servicios && selectedBooking.packPromo.servicios.length > 0 && (
                                    <div className="space-y-1.5 pt-0.5">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-700">
                                            Servicios incluidos en este Pack:
                                        </p>
                                        <div className="space-y-1.5">
                                            {(selectedBooking.packPromo.serviciosDetalle && selectedBooking.packPromo.serviciosDetalle.length > 0
                                                ? selectedBooking.packPromo.serviciosDetalle
                                                : selectedBooking.packPromo.servicios?.map((sName: string) => ({ nombre: sName }))
                                            )?.map((item: any, sIdx: number) => (
                                                <div key={sIdx} className="flex items-center justify-between gap-2 bg-white px-3 py-2 rounded-xl border border-slate-100 shadow-xs">
                                                    <div className="flex items-center gap-2 min-w-0">
                                                    <div className="size-4 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                                                        <Check size={10} strokeWidth={3} />
                                                    </div>
                                                    <span className="text-xs font-bold text-slate-800 leading-tight truncate">
                                                        {item.nombre}
                                                    </span>
                                                </div>
                                                {item.duracion && (
                                                    <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-100 shrink-0">
                                                        {item.duracion} min
                                                    </span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                )}
                            </div>
                        )}

                        {/* Alerta de beneficio aplicado de Servicio Gratis (Premio) */}
                        {selectedBooking && freeServices.some((fs: any) => fs.serviceId === selectedBooking.canchaId && fs.estado === 'DISPONIBLE') && (
                            <div className="bg-emerald-50/70 border border-emerald-100 rounded-3xl p-4 text-left space-y-1">
                                <span className="text-[10px] font-black uppercase text-emerald-700 tracking-wider flex items-center gap-1.5 leading-none">
                                    🎁 Beneficio Aplicado: Servicio Gratis
                                </span>
                                <p className="text-[10px] text-emerald-600 font-bold leading-normal">
                                    Estás utilizando tu beneficio de <span className="uppercase">{allServices.find(s => s.id === selectedBooking.canchaId)?.nombre || 'Servicio'} Gratis</span>. Esta promoción personal no es acumulable con el 2x1 o tarifas públicas de oferta.
                                </p>
                            </div>
                        )}

                        {/* Fila del Descuento (si existe) */}
                        {selectedBooking && selectedBooking.discountPercentage > 0 && (
                            <div className="flex justify-between items-center pb-2">
                                <span className="text-[10px] font-black uppercase text-emerald-500 tracking-wider">Descuento aplicado</span>
                                <span className="text-xs font-black text-emerald-500">-{selectedBooking.discountPercentage}% DESCUENTO</span>
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
                        {selectedBooking && selectedBooking.precio === 0 ? (
                            <div className="bg-slate-50 border border-slate-100 rounded-[2rem] p-5 flex items-start gap-3">
                                <span className="text-lg">🎟️</span>
                                <div className="text-left">
                                    <p className="text-[10px] font-black text-slate-800 uppercase tracking-wider">Cupones no requeridos</p>
                                    <p className="text-[9.5px] text-slate-400 font-bold mt-0.5">Esta cita ya es gratuita, no es necesario aplicar cupones de descuento.</p>
                                </div>
                            </div>
                        ) : (
                            <>
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
                                                ✅ {couponData.tipo === 'PORCENTAJE' ? `${couponData.valor}% DESCUENTO aplicado` : `$${couponData.valor} DESCUENTO aplicado`} — Ahorras ${couponData.descuento.toFixed(2)}
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
                                                ✅ {couponData.tipo === 'PORCENTAJE' ? `${couponData.valor}% DESCUENTO aplicado` : `$${couponData.valor} DESCUENTO aplicado`} — Ahorras ${couponData.descuento.toFixed(2)}
                                            </p>
                                        )}
                                        {couponStatus === 'invalid' && (
                                            <p className="text-[10px] font-black text-red-500 ml-4">❌ {couponError}</p>
                                        )}
                                    </div>
                                )}
                            </>
                        )}


                        {/* ===== SECCIÓN DE CASHBACK ===== */}
                        {userCashback > 0 && (
                            <div className="space-y-2 text-left">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">💵 Pagar con Saldo Cashback</label>
                                <div 
                                    onClick={() => setApplyCashback(!applyCashback)}
                                    className={`rounded-2xl p-4 border transition-all cursor-pointer flex items-center justify-between shadow-sm ${
                                        applyCashback 
                                            ? 'border-emerald-400 bg-emerald-50/10' 
                                            : 'border-gray-100 bg-white hover:border-gray-200'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`size-10 rounded-xl flex items-center justify-center transition-colors ${applyCashback ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect width="20" height="12" x="2" y="6" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/></svg>
                                        </div>
                                        <div className="text-left">
                                            <p className="font-black text-slate-800 text-[13px] leading-none">Aplicar saldo disponible</p>
                                            <p className="text-[9px] text-slate-400 font-semibold mt-1">
                                                Tienes <strong className="text-emerald-600">${userCashback.toFixed(2)}</strong> de cashback acumulado.
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center">
                                        {/* Custom toggle switch */}
                                        <div className={`w-10 h-6 rounded-full transition-colors relative ${applyCashback ? 'bg-emerald-500' : 'bg-gray-200'}`}>
                                            <div className={`size-4 rounded-full bg-white absolute top-1 transition-transform shadow-sm ${applyCashback ? 'translate-x-5' : 'translate-x-1'}`} />
                                        </div>
                                    </div>
                                </div>
                                {applyCashback && (
                                    <p className="text-[10px] font-black text-emerald-600 ml-4 mt-2">
                                        ✅ Descuento de <strong>${Math.min(userCashback, selectedBooking ? (couponData ? couponData.totalConDescuento : selectedBooking.precio) : 0).toFixed(2)}</strong> aplicado a tu cita.
                                    </p>
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
                                        {(() => {
                                            const basePrecio = selectedBooking?.precio || 0;
                                            const totalConDescuento = couponStatus === 'valid' && couponData ? couponData.totalConDescuento : basePrecio;
                                            const cashbackDescuento = applyCashback ? Math.min(userCashback, totalConDescuento) : 0;
                                            const precioFinal = Math.max(0, totalConDescuento - cashbackDescuento);

                                            return (
                                                <div className="flex flex-col items-end">
                                                    {(totalConDescuento < basePrecio || cashbackDescuento > 0) && (
                                                        <span className="text-[12px] font-black text-gray-400 line-through leading-none">
                                                            ${basePrecio.toFixed(2)}
                                                        </span>
                                                    )}
                                                    {precioFinal === 0 ? (
                                                        <span className="text-4xl font-black text-emerald-500 tracking-tighter leading-none">GRATIS</span>
                                                    ) : (
                                                        <span className="text-4xl font-black tracking-tighter leading-none" style={{ color: primaryColor }}>
                                                            ${precioFinal.toFixed(2)}
                                                        </span>
                                                    )}
                                                    {cashbackDescuento > 0 && (
                                                        <span className="text-[9px] font-black text-emerald-600 uppercase tracking-wider mt-1">
                                                            Cashback: -${cashbackDescuento.toFixed(2)}
                                                        </span>
                                                    )}
                                                </div>
                                            );
                                        })()}
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
            {/* Si no hay initialServiceId, o si el usuario quiere añadir servicios extras */}
            {(!initialServiceId || showExtraServices) && (
                <div className="space-y-5 px-2">
                    <div className="flex items-center gap-2 px-1">
                        <Sparkles size={12} style={{ color: primaryColor }} /> 
                        <h3 className="text-[11px] font-black tracking-widest text-gray-900 uppercase italic">1. Servicios</h3>
                    </div>
                    
                    <div className="space-y-3">
                        {allServices.filter(s => isSelected(s.id)).map((service: any) => {
                            const esGratis = freeServices.some((fs: any) => fs.serviceId === service.id && fs.estado === 'DISPONIBLE');
                            return (
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
                                            <div className="flex items-center gap-2">
                                                <p className="text-base font-black text-gray-900 leading-none">{service.nombre}</p>
                                                {esGratis && (
                                                    <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 bg-emerald-550 text-white rounded-md shadow-sm">
                                                        🎁 Gratis
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase">{service.duracion} min</p>
                                        </div>
                                    </div>
                                    {showPrices && (() => {
                                        const promo = resolveSlotPromotion(
                                            selectedBooking?.hour || "00:00", 
                                            selectedBooking?.date || new Date(), 
                                            service, 
                                            negocio.automaticDiscount
                                        );
                                        if (promo.source === 'free_service' || promo.price === 0) {
                                            return (
                                                <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-100 uppercase tracking-widest font-mono shrink-0">
                                                    GRATIS
                                                </span>
                                            );
                                        }
                                        return (
                                            <span className="text-xl font-black text-gray-900">
                                                ${promo.price.toFixed(2)}
                                            </span>
                                        );
                                    })()}
                                </div>
                            );
                        })}
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
                                            {showPrices && (
                                                freeServices.some((fs: any) => fs.serviceId === s.id && fs.estado === 'DISPONIBLE') ? (
                                                    <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 bg-emerald-500 text-white rounded-md">
                                                        🎁 Gratis
                                                    </span>
                                                ) : (
                                                    <span className="text-[11px] font-black text-gray-900">${s.precio}</span>
                                                )
                                            )}
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
            )}

            {/* TARJETA DETALLE PACK PROMOCIONAL O DE LA PROMO */}
            {activePackInfo && (
                <div className={`mx-2 rounded-[2rem] p-5 sm:p-6 shadow-sm space-y-4 animate-in fade-in duration-300 border-2 ${
                    activePackInfo.isPack 
                        ? 'bg-gradient-to-br from-indigo-50/95 via-sky-50/85 to-blue-50/95 border-indigo-200/90' 
                        : 'bg-gradient-to-br from-emerald-50/95 via-teal-50/85 to-sky-50/95 border-emerald-200/90'
                }`}>
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="space-y-1.5 flex-1">
                            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider text-white shadow-xs ${
                                activePackInfo.isPack ? 'bg-indigo-600' : 'bg-emerald-600'
                            }`}>
                                <Sparkles size={12} className="animate-pulse text-amber-300" />
                                <span>{activePackInfo.isPack ? '📦 Pack Promocional Incluido' : '🔥 Promoción Especial con Descuento'}</span>
                            </div>
                            <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-snug uppercase">
                                {activePackInfo.titulo}
                            </h3>
                            {activePackInfo.descripcion && (
                                <p className={`text-xs text-slate-600 leading-relaxed font-medium bg-white/80 p-3 rounded-2xl border mt-1 ${
                                    activePackInfo.isPack ? 'border-indigo-100/70' : 'border-emerald-100/70'
                                }`}>
                                    {activePackInfo.descripcion}
                                </p>
                            )}
                        </div>

                        {/* Bloque de Precio y Ahorro */}
                        {(activePackInfo.precioPromo !== undefined || activePackInfo.precioOriginal !== undefined) && (
                            <div className="sm:text-right shrink-0 bg-white/85 sm:bg-transparent p-3 sm:p-0 rounded-2xl border sm:border-0 border-slate-150 flex sm:flex-col items-center sm:items-end justify-between">
                                <div>
                                    {activePackInfo.precioOriginal && (
                                        <span className="text-xs font-bold text-slate-400 line-through block">
                                            Antes ${Number(activePackInfo.precioOriginal).toFixed(2)}
                                        </span>
                                    )}
                                    <div className={`text-2xl font-black tracking-tight leading-tight ${
                                        activePackInfo.isPack ? 'text-indigo-600' : 'text-emerald-600'
                                    }`}>
                                        ${Number(activePackInfo.precioPromo ?? activePackInfo.precioOriginal).toFixed(2)}
                                    </div>
                                </div>
                                {activePackInfo.precioOriginal && activePackInfo.precioPromo && activePackInfo.precioOriginal > activePackInfo.precioPromo && (
                                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-100/90 px-2.5 py-0.5 rounded-full border border-emerald-200/80 mt-1 inline-block">
                                        Ahorras ${(Number(activePackInfo.precioOriginal) - Number(activePackInfo.precioPromo)).toFixed(2)}
                                        {activePackInfo.porcentajeDescuento ? ` (${activePackInfo.porcentajeDescuento}% OFF)` : ''}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Lista de tratamientos o servicios que incluye el pack (solo si es pack o tiene múltiples servicios) */}
                    {activePackInfo.isPack && activePackInfo.servicios && activePackInfo.servicios.length > 0 && (
                        <div className="space-y-2 pt-2 border-t border-indigo-100/80">
                            <p className="text-[10px] font-black uppercase tracking-widest text-indigo-900/90 flex items-center gap-1.5">
                                <span>Tratamientos incluidos en esta sesión:</span>
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {(activePackInfo.serviciosDetalle && activePackInfo.serviciosDetalle.length > 0
                                    ? activePackInfo.serviciosDetalle
                                    : activePackInfo.servicios.map((s: string) => ({ nombre: s }))
                                ).map((item: any, idx: number) => (
                                    <div 
                                        key={idx} 
                                        className="flex items-center justify-between gap-2 bg-white/95 px-3.5 py-2.5 rounded-2xl border border-indigo-100/80 shadow-xs"
                                    >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <div className="size-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                                                <Check size={12} strokeWidth={3} />
                                            </div>
                                            <span className="text-xs font-bold text-slate-800 truncate">
                                                {item.nombre}
                                            </span>
                                        </div>
                                        {item.duracion && (
                                            <span className="text-[10px] font-bold text-slate-400 shrink-0 bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-100">
                                                {item.duracion} min
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Garantía / Compromiso Clínico */}
                    <div className={`flex items-center gap-2 text-[10px] font-bold px-3.5 py-2 rounded-xl border ${
                        activePackInfo.isPack 
                            ? 'text-indigo-800 bg-indigo-100/60 border-indigo-200/50' 
                            : 'text-emerald-800 bg-emerald-100/60 border-emerald-200/50'
                    }`}>
                        <Check size={12} className={activePackInfo.isPack ? 'text-indigo-600 shrink-0' : 'text-emerald-600 shrink-0'} strokeWidth={2.5} />
                        <span>Sin costos ocultos · Diagnóstico integral y atención por especialistas odontológicos certificados.</span>
                    </div>
                </div>
            )}

            {/* PASO 2: ESPECIALISTA / PROFESIONAL */}
            {availableStaff.length > 0 && (
                <div id="booking-professional" className={`relative z-30 px-2 space-y-4 transition-all duration-300 ${shakeProfessional ? 'animate-calendar-shake ring-4 ring-pink-500/50 rounded-3xl p-3' : ''}`}>
                    <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-3">
                            <div 
                                className="size-7 rounded-full border-2 flex items-center justify-center shrink-0" 
                                style={{ borderColor: primaryColor, color: primaryColor }}
                            >
                                <User size={15} strokeWidth={2.5} />
                            </div>
                            <div>
                                <h3 className="text-base sm:text-lg font-black tracking-wide !text-slate-900 uppercase leading-tight" style={{ color: '#0f172a' }}>
                                    2. ESPECIALISTA
                                </h3>
                                <p className="text-xs sm:text-sm font-semibold text-slate-500 leading-tight">
                                    {availableStaff.length === 1 
                                        ? 'Especialista a cargo de tu atención' 
                                        : 'Selecciona al especialista de tu preferencia'}
                                </p>
                            </div>
                        </div>
                        {availableStaff.length > 1 && (
                            <span className="text-[10px] font-black uppercase text-sky-600 bg-sky-50 px-2.5 py-1 rounded-full border border-sky-100">
                                {availableStaff.length} disponibles
                            </span>
                        )}
                    </div>

                    {/* Tarjetas interactivas de Especialistas */}
                    <div className={`grid gap-3 ${availableStaff.length === 1 ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
                        {availableStaff.map((member) => {
                            const isSelected = selectedStaffId === member.id;
                            const avatarSrc = (member.imageMedia as any)?.url || member.avatar;
                            return (
                                <button
                                    key={member.id}
                                    type="button"
                                    onClick={() => handleSelectStaff(member.id)}
                                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-3.5 relative overflow-hidden group active:scale-98 ${
                                        isSelected 
                                            ? 'bg-white shadow-md ring-2 ring-offset-1' 
                                            : 'bg-white hover:bg-slate-50/80 border-slate-200/80 shadow-xs'
                                    }`}
                                    style={{
                                        borderColor: isSelected ? primaryColor : undefined,
                                        '--tw-ring-color': isSelected ? primaryColor : undefined
                                    } as any}
                                >
                                    {/* Avatar */}
                                    <div 
                                        className="size-12 sm:size-14 rounded-full overflow-hidden bg-slate-100 shrink-0 border-2 shadow-xs"
                                        style={{ borderColor: isSelected ? primaryColor : '#e2e8f0' }}
                                    >
                                        {avatarSrc ? (
                                            <img src={avatarSrc} alt={member.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div 
                                                className="w-full h-full flex items-center justify-center text-sm font-black text-white"
                                                style={{ backgroundColor: primaryColor }}
                                            >
                                                {member.name.charAt(0)}
                                            </div>
                                        )}
                                    </div>

                                    {/* Datos del Doctor */}
                                    <div className="flex-1 min-w-0 pr-4">
                                        <p className="text-sm font-black text-slate-900 leading-snug truncate">
                                            {member.name}
                                        </p>
                                        <p className="text-[11px] font-bold text-slate-500 line-clamp-1 mt-0.5" style={{ color: isSelected ? primaryColor : undefined }}>
                                            {member.role || 'Especialista'}
                                        </p>
                                        <div className="flex items-center gap-1.5 text-[10px] text-emerald-600 font-semibold mt-1">
                                            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                            <span>Disponible para agendar</span>
                                        </div>
                                    </div>

                                    {/* Check indicador */}
                                    <div 
                                        className={`size-6 rounded-full flex items-center justify-center shrink-0 transition-all ${
                                            isSelected 
                                                ? 'text-white shadow-sm' 
                                                : 'border border-slate-200 text-transparent'
                                        }`}
                                        style={{ backgroundColor: isSelected ? primaryColor : 'transparent' }}
                                    >
                                        <Check size={14} strokeWidth={3} className={isSelected ? 'text-white' : 'opacity-0'} />
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {initialServiceId && otherServices.length > 1 && (
                        <div className="pt-1">
                            <button
                                type="button"
                                onClick={() => setShowExtraServices(!showExtraServices)}
                                className="text-[11px] font-bold uppercase tracking-wider text-slate-500 hover:text-slate-800 transition-colors inline-flex items-center gap-1 cursor-pointer"
                            >
                                <span>{showExtraServices ? '− Ocultar otros servicios' : '+ ¿Deseas añadir otro tratamiento?'}</span>
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Paso 3: Horario con Calendario */}
            <div id="booking-calendar" className={`relative space-y-4 px-2 transition-all duration-500 ${shakeCalendar ? 'animate-calendar-shake ring-4 ring-pink-500/50 rounded-3xl' : ''}`}>
                {/* Overlay si no hay profesional seleccionado */}
                {!selectedStaffId && availableStaff.length > 0 && (
                    <div 
                        className="absolute inset-0 z-40 flex items-center justify-center bg-white/50 backdrop-blur-[1px] rounded-3xl cursor-not-allowed"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setShowStaffDropdown(true);
                        }}
                    >
                        <div className="bg-white px-4 py-2 rounded-full shadow-sm border border-gray-100 flex items-center gap-2">
                            <User size={12} className="text-gray-400" />
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Selecciona un profesional</span>
                        </div>
                    </div>
                )}
                
                <div className={`space-y-4 transition-all duration-500 ${!selectedStaffId && availableStaff.length > 0 ? 'opacity-30 grayscale-[0.5] pointer-events-none' : ''}`}>
                    {/* Header Paso 3 según diseño de referencia */}
                    <div className="flex items-center gap-3 px-1">
                        <div 
                            className="size-7 rounded-full border-2 flex items-center justify-center shrink-0" 
                            style={{ borderColor: primaryColor, color: primaryColor }}
                        >
                            <Clock size={15} strokeWidth={2.5} />
                        </div>
                        <div>
                            <h3 className="text-base sm:text-lg font-black tracking-wide !text-slate-900 uppercase leading-tight" style={{ color: '#0f172a' }}>3. HORARIO</h3>
                            <p className="text-xs sm:text-sm font-semibold text-slate-500 leading-tight">Selecciona la fecha y el horario que prefieras</p>
                        </div>
                    </div>

                    <BookingCalendar 
                        canchas={
                            (negocio.tipoNegocio === 'SPORTS_COURTS' || negocio.tipoNegocio === 'CANCHAS')
                                ? [
                                    ...negocio.services
                                        .filter((s: any) => selectedServiceIds.includes(s.id))
                                        .map((s: any) => ({ ...s, precioHora: s.precio })),
                                    ...negocio.services
                                        .filter((s: any) => !selectedServiceIds.includes(s.id))
                                        .map((s: any) => ({ ...s, precioHora: s.precio })),
                                  ]
                                : (negocio.services.filter((s: any) => selectedServiceIds.includes(s.id)).length > 0
                                    ? negocio.services.filter((s: any) => selectedServiceIds.includes(s.id)).map((s: any) => ({ ...s, precioHora: s.precio }))
                                    : (negocio.services || []).map((s: any) => ({ ...s, precioHora: s.precio })))
                        }
                        horarioApertura={negocio.horarioApertura || "09:00"}
                        horarioCierre={negocio.horarioCierre || "22:00"}
                        onSelectSlot={handleSelectSlot}
                        duracionFija={totalDuracionMin/60}
                        staffId={selectedStaffId}
                        showPrices={showPrices}
                        automaticDiscount={negocio.automaticDiscount}
                        diasAtencion={parsedConfig?.diasAtencion}
                        primaryColor={primaryColor}
                        tipoNegocio={negocio.tipoNegocio}
                        isCourt={negocio.tipoNegocio === 'SPORTS_COURTS' || negocio.tipoNegocio === 'CANCHAS'}
                    />
                </div>
            </div>

            {/* Barra Flotante Inferior estilo Card Píldora (como en la referencia) */}
            <div className="fixed bottom-3 left-3 right-3 sm:left-4 sm:right-4 z-[300] max-w-lg mx-auto">
                <div className="bg-white rounded-full p-2.5 sm:p-3 shadow-[0_15px_40px_rgba(0,0,0,0.12)] border border-slate-150 flex items-center justify-between">
                    <div className="flex flex-col pl-4 sm:pl-5">
                        <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">TOTAL</span>
                            {activePackInfo && (
                                <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full border ${
                                    activePackInfo.isPack 
                                        ? 'bg-indigo-100 text-indigo-700 border-indigo-200' 
                                        : 'bg-emerald-100 text-emerald-700 border-emerald-200'
                                }`}>
                                    {activePackInfo.isPack ? '📦 PACK' : '🔥 PROMO'}
                                </span>
                            )}
                        </div>
                        <div className="flex items-baseline gap-1.5">
                            {activePackInfo?.precioOriginal && (
                                <span className="text-xs font-bold text-slate-400 line-through">
                                    ${Number(activePackInfo.precioOriginal).toFixed(2)}
                                </span>
                            )}
                            <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-none">
                                ${(selectedBooking ? selectedBooking.precio : (activePackInfo?.precioPromo ?? totalPrecioInitial)).toFixed(2)}
                            </div>
                        </div>
                    </div>
                    <div className="h-8 w-px bg-slate-200 mx-3 sm:mx-4 shrink-0" />
                    <button 
                        type="button"
                        onClick={() => { 
                            if (selectedServiceIds.length === 0) {
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                                return;
                            }
                            if (!selectedStaffId && availableStaff.length > 0) {
                                setShakeProfessional(true);
                                setTimeout(() => setShakeProfessional(false), 800);
                                setShowStaffDropdown(true);
                                const element = document.getElementById('booking-professional');
                                if (element) {
                                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                }
                            } else if (!selectedBooking) {
                                setShakeCalendar(true);
                                setTimeout(() => setShakeCalendar(false), 800);
                                const element = document.getElementById('booking-calendar');
                                if (element) {
                                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                }
                            } else {
                                setView('checkout');
                                window.scrollTo(0,0);
                            } 
                        }} 
                        className="flex-1 py-3.5 sm:py-4 px-6 rounded-full font-black text-xs sm:text-sm tracking-wider uppercase text-white flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all cursor-pointer" 
                        style={{ backgroundColor: primaryColor }}
                    >
                        <span>{selectedBooking ? 'CONFIRMAR CITA' : 'ELEGIR HORA'}</span>
                        <ArrowRight size={16} strokeWidth={3} />
                    </button>
                </div>
            </div>
        </div>
    );
}
