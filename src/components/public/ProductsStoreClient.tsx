'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { 
    ShoppingBag, Plus, Minus, Trash2, MapPin, Calendar, Clock, 
    ChevronRight, Check, Loader2, Search, ArrowLeft, Phone, Info, AlertCircle, User,
    Copy, Building2, CreditCard, Hash, FileText, UploadCloud, ShieldCheck, Send, Lock, Wallet, X, ZoomIn, Share2
} from 'lucide-react';
import Image from 'next/image';
import MapSelectionModal from './MapSelectionModal';

interface Product {
    id: string;
    nombre: string;
    descripcion?: string | null;
    precio: number;
    imagenUrl?: string | null;
    activo: boolean;
    stock?: number | null;
    categoriaId?: string | null;
}

interface Category {
    id: string;
    nombre: string;
    activo: boolean;
}

interface CartItem {
    product: Product;
    quantity: number;
}

interface BusinessConfig {
    costoEnvio?: number;
    horarioAtencion?: string;
    horaLimiteMismoDia?: string; // Ej: "16:00"
    tiempoMaximoEntrega?: string; // Ej: "45-60 min"
    telefonoContacto?: string;
    coberturaKm?: number;
    whatsapp?: string;
}

interface Props {
    negocio: {
        id: string;
        nombre: string;
        slug: string;
        logoUrl?: string | null;
        colorPrimario?: string | null;
        colorSecundario?: string | null;
        colorNeutral?: string | null;
        colorTexto?: string | null;
        configuracion?: any;
        direccion?: string | null;
        whatsapp?: string | null;
        horarioApertura?: string | null;
        horarioCierre?: string | null;
    };
}

export default function ProductsStoreClient({ negocio }: Props) {
    const primaryColor = negocio.colorPrimario || '#1dc95c';
    const secondaryColor = negocio.colorSecundario || '#112117';
    const config: any = negocio.configuracion || {};

    // Obtener todas las imágenes de portada/banner del negocio para el slider desde todas las fuentes (config.bannerUrls, config.bannerUrl, imagenes, etc.)
    const configBannerUrlsList = (Array.isArray(config.bannerUrls) ? config.bannerUrls : []).filter(Boolean);
    const imagenesBannerList = (negocio as any).imagenes?.filter((i: any) => (i.tipo === 'BANNER' || i.esBanner) && i.url)?.map((i: any) => i.url) || [];
    const configBannersList = (config.banners || []).map((b: any) => typeof b === 'string' ? b : b?.url).filter(Boolean);
    const singleBanner = config.bannerUrl || config.banner_url || (negocio as any).bannerUrl;

    // Si el usuario configuró los banners en /admin/config (config.bannerUrls), esa lista es prioritaria y autoritativa.
    let rawBannerList: string[] = [];
    if (configBannerUrlsList.length > 0) {
        rawBannerList = configBannerUrlsList;
    } else if (imagenesBannerList.length > 0) {
        rawBannerList = imagenesBannerList;
    } else if (configBannersList.length > 0) {
        rawBannerList = configBannersList;
    } else if (singleBanner) {
        rawBannerList = [singleBanner];
    }

    const bannerList = rawBannerList.length > 0 ? rawBannerList : [
        'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?q=80&w=1200',
        'https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=1200',
        'https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=1200'
    ];

    const bannerImage = bannerList[0];

    const [currentBannerIndex, setCurrentBannerIndex] = useState(0);

    useEffect(() => {
        if (bannerList.length <= 1) return;
        const interval = setInterval(() => {
            setCurrentBannerIndex((prev) => (prev + 1) % bannerList.length);
        }, 4500);
        return () => clearInterval(interval);
    }, [bannerList.length]);

    // Helper para formatear cualquier string de hora (ej: "11:00", "23:59", "18:00") a formato legible AM/PM
    const formatTimeLabel = (timeStr?: string | null): string => {
        if (!timeStr) return '';
        const match = timeStr.trim().match(/(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)?/i);
        if (!match) return timeStr;
        let hours = parseInt(match[1], 10);
        const minutes = match[2];
        const mer = match[3] ? match[3].toUpperCase() : null;
        if (mer) return `${hours}:${minutes} ${mer}`;
        if (hours === 0) return `12:${minutes} AM`;
        if (hours < 12) return `${hours}:${minutes} AM`;
        if (hours === 12) return `12:${minutes} PM`;
        return `${hours - 12}:${minutes} PM`;
    };

    // Helper para parsear cualquier string de hora (ej: "11:00 AM", "10:00 PM", "22:00") a minutos desde medianoche
    const parseTimeToMinutes = (timeStr: string): number | null => {
        if (!timeStr) return null;
        const match = timeStr.trim().match(/(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)?/i);
        if (!match) return null;
        let hours = parseInt(match[1], 10);
        const minutes = parseInt(match[2], 10);
        const mer = match[3] ? match[3].toUpperCase() : null;

        if (mer === 'PM' && hours < 12) hours += 12;
        if (mer === 'AM' && hours === 12) hours = 0;

        return hours * 60 + minutes;
    };

    // Helper para determinar si los minutos actuales están dentro del rango de atención
    const isTimeWithinRange = (currentMinutes: number, openMinutes: number, closeMinutes: number): boolean => {
        if (closeMinutes > openMinutes) {
            // Horario regular del mismo día (ej: 11:00 a 22:00)
            return currentMinutes >= openMinutes && currentMinutes < closeMinutes;
        } else if (closeMinutes < openMinutes) {
            // Horario nocturno que cruza medianoche (ej: 18:00 a 02:00)
            return currentMinutes >= openMinutes || currentMinutes < closeMinutes;
        }
        return true;
    };

    // Verificar si el local está cerrado
    const getStoreStatus = () => {
        if (config.cerradoManual === true || config.cerrado === true || config.fueradeServicio === true) {
            return { isClosed: true, reason: 'El local está cerrado en este momento por disposición del comercio.' };
        }

        const now = new Date();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();

        // 1. Prioridad: Horarios explícitos de Apertura y Cierre configurados en el Perfil del negocio
        if (negocio.horarioApertura && negocio.horarioCierre) {
            const openMinutes = parseTimeToMinutes(negocio.horarioApertura);
            const closeMinutes = parseTimeToMinutes(negocio.horarioCierre);

            if (openMinutes !== null && closeMinutes !== null) {
                if (!isTimeWithinRange(currentMinutes, openMinutes, closeMinutes)) {
                    return {
                        isClosed: true,
                        reason: `Fuera de horario de atención (${formatTimeLabel(negocio.horarioApertura)} - ${formatTimeLabel(negocio.horarioCierre)}).`
                    };
                }
                return { isClosed: false, reason: '' };
            }
        }

        // 2. Evaluar objeto de horarios estructurados por día si existe
        if (config.horarios && typeof config.horarios === 'object') {
            const days = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
            const currentDayKey = days[now.getDay()];
            const todaySchedule = config.horarios[currentDayKey];

            if (todaySchedule) {
                if (todaySchedule.activo === false || todaySchedule.cerrado === true) {
                    return { isClosed: true, reason: `Hoy no hay atención. Horarios: ${config.horarioAtencion || 'ver detalles'}` };
                }
                if (todaySchedule.apertura && todaySchedule.cierre) {
                    const openMinutes = parseTimeToMinutes(todaySchedule.apertura);
                    const closeMinutes = parseTimeToMinutes(todaySchedule.cierre);

                    if (openMinutes !== null && closeMinutes !== null) {
                        if (!isTimeWithinRange(currentMinutes, openMinutes, closeMinutes)) {
                            return { isClosed: true, reason: `Fuera de horario. Atención hoy: ${todaySchedule.apertura} a ${todaySchedule.cierre}` };
                        }
                        return { isClosed: false, reason: '' };
                    }
                }
            }
        }

        // 3. Fallback: Evaluar el texto libre del horario (ej: "Lunes a Domingo: 11:00 AM - 11:59 PM")
        const horarioTexto = config.horarioAtencion || (config.horaLimiteMismoDia ? `Lunes a Domingo: 11:00 AM - ${config.horaLimiteMismoDia}` : 'Lunes a Domingo: 11:00 AM - 11:59 PM');
        if (horarioTexto) {
            const matches = Array.from(horarioTexto.matchAll(/(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)?/gi));
            if (matches.length >= 2) {
                const openMinutes = parseTimeToMinutes(matches[0][0]);
                let closeMinutes = parseTimeToMinutes(matches[1][0]);

                if (openMinutes !== null && closeMinutes !== null) {
                    if (closeMinutes < openMinutes && !matches[1][3]) {
                        closeMinutes += 12 * 60;
                    }
                    if (!isTimeWithinRange(currentMinutes, openMinutes, closeMinutes)) {
                        return { isClosed: true, reason: `Fuera de horario de atención (${horarioTexto}).` };
                    }
                }
            }
        }

        return { isClosed: false, reason: '' };
    };

    const storeStatus = getStoreStatus();
    const isStoreClosed = storeStatus.isClosed;

    const hasCustomBanner = bannerList.length > 0;
    const hasCustomTitle = !!((negocio as any).heroTitulo || config.heroTitulo);

    const heroTitle = (negocio as any).heroTitulo || config.heroTitulo || 'Los mejores pinchos para asar';
    const heroSub = (negocio as any).heroSubtitulo || config.heroSubtitulo || 'Rápido • Calidad Premium • A Domicilio';

    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [cart, setCart] = useState<CartItem[]>([]);
    const [step, setStep] = useState<'catalog' | 'checkout' | 'otp' | 'payment' | 'success'>('catalog');

    // Checkout Form States
    const [deliveryType, setDeliveryType] = useState<'RETIRO' | 'DOMICILIO'>('DOMICILIO');
    const [clientName, setClientName] = useState('');
    const [clientPhone, setClientPhone] = useState('');
    const [clientAddress, setClientAddress] = useState('');
    const [clientReference, setClientReference] = useState('');

    // OTP Auth States
    const [otpCode, setOtpCode] = useState('');
    const [otpLoading, setOtpLoading] = useState(false);
    const [otpMessage, setOtpMessage] = useState<string | null>(null);

    // Payment & Evidence States
    const [createdOrder, setCreatedOrder] = useState<any>(null);
    const [createdPayment, setCreatedPayment] = useState<any>(null);
    const [bankConfig, setBankConfig] = useState<any>(null);
    const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
    const [uploadingEvidence, setUploadingEvidence] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const getInitialDate = () => {
        const config: any = negocio?.configuracion || {};
        const isTodayAvailable = () => {
            if (!config.horaLimiteMismoDia) return true;
            const now = new Date();
            const [limitH, limitM] = config.horaLimiteMismoDia.split(':').map(Number);
            const limitTime = new Date();
            limitTime.setHours(limitH, limitM, 0, 0);
            return now.getTime() < limitTime.getTime();
        };
        const today = new Date();
        if (isTodayAvailable()) {
            return today.toISOString().split('T')[0];
        } else {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            return tomorrow.toISOString().split('T')[0];
        }
    };
    const [deliveryDate, setDeliveryDate] = useState<string>(getInitialDate());
    const [timeSlot, setTimeSlot] = useState('');
    const [copiedCode, setCopiedCode] = useState(false);
    const [zoomProduct, setZoomProduct] = useState<Product | null>(null);
    const [showShareToast, setShowShareToast] = useState(false);

    // Función para Compartir la App / Tienda
    const handleShareApp = async () => {
        const shareData = {
            title: negocio.nombre,
            text: `¡Pide tus productos online en ${negocio.nombre}! 🍢🔥`,
            url: typeof window !== 'undefined' ? window.location.href : ''
        };

        if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare && navigator.canShare(shareData)) {
            try {
                await navigator.share(shareData);
            } catch (err) {
                // Compartir cancelado o no soportado
            }
        } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
            try {
                await navigator.clipboard.writeText(window.location.href);
                setShowShareToast(true);
                setTimeout(() => setShowShareToast(false), 3000);
            } catch (err) {
                console.error("No se pudo copiar el enlace:", err);
            }
        }
    };

    // Load Catalogue & Bank Details
    useEffect(() => {
        const fetchCatalogue = async () => {
            try {
                setLoading(true);
                const res = await fetch(`/api/public/${negocio.slug}/catalogue`);
                if (res.ok) {
                    const data = await res.json();
                    setProducts(data.products || []);
                    setCategories(data.categories || []);
                }
            } catch (err) {
                console.error("Error loading catalogue:", err);
            } finally {
                setLoading(false);
            }
        };
        const fetchBankDetails = async () => {
            try {
                const bankRes = await fetch(`/api/public/${negocio.slug}/bank-details`);
                const bankData = await bankRes.json();
                if (bankData.success && bankData.method) {
                    setBankConfig(bankData.method);
                }
            } catch (e) {
                console.error("Error al cargar datos bancarios:", e);
            }
        };
        fetchCatalogue();
        fetchBankDetails();
    }, [negocio.slug]);

    // Load Cart from localStorage
    useEffect(() => {
        const savedCart = localStorage.getItem(`cart_${negocio.id}`);
        if (savedCart) {
            try {
                setCart(JSON.parse(savedCart));
            } catch (e) {}
        }
    }, [negocio.id]);

    const [submitting, setSubmitting] = useState(false);
    const [isEditingPersonalData, setIsEditingPersonalData] = useState(false);
    const [countryCode, setCountryCode] = useState('+593');

    // Modal de Mapa & Coordenadas GPS
    const [showMapModal, setShowMapModal] = useState(false);
    const [selectedLat, setSelectedLat] = useState<number | null>(null);
    const [selectedLng, setSelectedLng] = useState<number | null>(null);

    // Draft Checkout State para Negocios con Pago Previo Obligatorio
    const [draftCheckoutPayload, setDraftCheckoutPayload] = useState<any>(null);
    const [draftPaymentCode, setDraftPaymentCode] = useState<string>('');
    const [selectedBankIndex, setSelectedBankIndex] = useState<number>(0);
    // Cart Drawer State
    const [showCartDrawer, setShowCartDrawer] = useState(false);

    // Estado para Pedido Activo y Contador Regresivo
    const [activeOrder, setActiveOrder] = useState<any | null>(null);
    const [countdownTime, setCountdownTime] = useState<string>('');

    // Cargar pedido activo para mostrar aviso y contador en el home
    const fetchActiveOrder = async (phone: string) => {
        if (!phone) return;
        try {
            const res = await fetch(`/api/public/${negocio.slug}/client-orders?phone=${encodeURIComponent(phone)}`);
            if (res.ok) {
                const data = await res.json();
                const list = data.orders || data.pedidos || [];
                if (list.length > 0) {
                    const active = list.find((p: any) => 
                        !['ENTREGADO', 'CANCELADO', 'RECHAZADO'].includes(p.estado)
                    );
                    setActiveOrder(active || null);
                } else {
                    setActiveOrder(null);
                }
            }
        } catch (e) {
            console.error("Error al consultar pedido activo:", e);
        }
    };

    // Polling periódico cada 10s para mantener el estado del pedido activo actualizado en tiempo real
    useEffect(() => {
        if (!clientPhone) return;
        fetchActiveOrder(clientPhone);
        const poll = setInterval(() => {
            fetchActiveOrder(clientPhone);
        }, 10000);
        return () => clearInterval(poll);
    }, [clientPhone]);

    useEffect(() => {
        const updateTimer = () => {
            if (!activeOrder) {
                setCountdownTime('');
                return;
            }

            if (['PENDIENTE_PAGO', 'PAGO_EN_REVISION', 'PENDIENTE'].includes(activeOrder.estado)) {
                setCountdownTime('Pendiente de confirmación');
                return;
            }

            if (!activeOrder.fechaEntrega) {
                setCountdownTime('Por asignar');
                return;
            }

            const target = new Date(activeOrder.fechaEntrega).getTime();
            const now = new Date().getTime();
            const diff = target - now;

            if (diff <= 0) {
                if (['LISTO', 'RUTA', 'EN_CAMINO'].includes(activeOrder.estado)) {
                    setCountdownTime('¡En camino / Listo!');
                } else {
                    setCountdownTime('¡En preparación final!');
                }
                return;
            }

            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);

            const hStr = hours < 10 ? `0${hours}` : `${hours}`;
            const mStr = minutes < 10 ? `0${minutes}` : `${minutes}`;
            const sStr = seconds < 10 ? `0${seconds}` : `${seconds}`;

            if (days > 0) {
                setCountdownTime(`${days}d ${hStr}h ${mStr}m ${sStr}s`);
            } else {
                setCountdownTime(`${hStr}h ${mStr}m ${sStr}s`);
            }
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [activeOrder]);

    // Enviar mensaje con detalles y ubicación GPS al WhatsApp del negocio
    const sendWhatsAppToBusiness = (pedido: any, name: string, phone: string) => {
        try {
            const bizPhone = (negocio as any).telefono || negocio.whatsapp || (config as any)?.whatsapp || '593998877665';
            let formattedBizPhone = bizPhone.replace(/[^0-9]/g, '');
            if (formattedBizPhone.startsWith('0')) {
                formattedBizPhone = '593' + formattedBizPhone.substring(1);
            }

            const itemsText = cart.map(item => `• ${item.quantity}x ${item.product.nombre} ($${(item.product.precio * item.quantity).toFixed(2)})`).join('\n');
            
            let locationUrl = '';
            if (selectedLat && selectedLng) {
                locationUrl = `📍 *Ubicación GPS:* https://maps.google.com/?q=${selectedLat},${selectedLng}\n`;
            }

            let message = `🛒 *NUEVO PEDIDO REGISTRADO #${pedido.id ? pedido.id.slice(0, 8) : ''}*\n\n`;
            message += `👤 *Cliente:* ${name}\n`;
            message += `📞 *Teléfono:* ${countryCode} ${phone}\n`;
            message += `🚚 *Tipo:* ${deliveryType === 'DOMICILIO' ? 'Entrega a Domicilio' : 'Retiro en Local'}\n`;
            
            if (deliveryType === 'DOMICILIO') {
                message += `🏠 *Dirección:* ${clientAddress || 'No especificada'}\n`;
                if (clientReference) message += `📝 *Referencia:* ${clientReference}\n`;
                if (locationUrl) message += locationUrl;
            }

            message += `📅 *Fecha/Hora Entrega:* ${deliveryDate} (${timeSlot} hrs)\n\n`;
            message += `📦 *Detalle del Pedido:*\n${itemsText}\n\n`;
            message += `💰 *Subtotal:* $${cartSubtotal.toFixed(2)}\n`;
            if (deliveryType === 'DOMICILIO') {
                message += `🛵 *Envío:* $${shippingCost.toFixed(2)}\n`;
            }
            message += `💵 *TOTAL A PAGAR:* $${cartTotal.toFixed(2)}\n`;

            const whatsappUrl = `https://wa.me/${formattedBizPhone}?text=${encodeURIComponent(message)}`;
            window.open(whatsappUrl, '_blank');
        } catch (e) {
            console.error("Error al enviar WhatsApp al negocio:", e);
        }
    };

    // Save Cart to localStorage
    const saveCart = (newCart: CartItem[]) => {
        setCart(newCart);
        localStorage.setItem(`cart_${negocio.id}`, JSON.stringify(newCart));
    };

    // Cart Operations
    const addToCart = (product: Product) => {
        if (isStoreClosed) {
            alert('El local se encuentra cerrado en este momento. No es posible añadir productos al carrito.');
            return;
        }
        const existing = cart.find(item => item.product.id === product.id);
        let newCart: CartItem[] = [];
        if (existing) {
            newCart = cart.map(item => 
                item.product.id === product.id 
                    ? { ...item, quantity: item.quantity + 1 }
                    : item
            );
        } else {
            newCart = [...cart, { product, quantity: 1 }];
        }
        saveCart(newCart);
    };

    const updateQuantity = (productId: string, delta: number) => {
        const newCart = cart.map(item => {
            if (item.product.id === productId) {
                const newQty = item.quantity + delta;
                return newQty > 0 ? { ...item, quantity: newQty } : null;
            }
            return item;
        }).filter(Boolean) as CartItem[];
        saveCart(newCart);
    };

    const removeFromCart = (productId: string) => {
        const newCart = cart.filter(item => item.product.id !== productId);
        saveCart(newCart);
    };

    const clearCart = () => {
        saveCart([]);
    };

    // Helpers para Distancia GPS (Haversine)
    const getDistanceFromLatLonInKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371; // Radio de la Tierra en km
        const dLat = (lat2 - lat1) * (Math.PI / 180);
        const dLon = (lon2 - lon1) * (Math.PI / 180);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const d = R * c; // Distancia en km
        return d;
    };

    const getDynamicShippingCost = () => {
        if (deliveryType !== 'DOMICILIO') return 0;
        const baseCost = config.costoEnvio !== undefined ? parseFloat(config.costoEnvio) : 1.50;
        if (selectedLat && selectedLng) {
            const latNegocio = config.latitudNegocio !== undefined ? parseFloat(config.latitudNegocio) : -0.180653;
            const lngNegocio = config.longitudNegocio !== undefined ? parseFloat(config.longitudNegocio) : -78.467838;
            const distance = getDistanceFromLatLonInKm(latNegocio, lngNegocio, selectedLat, selectedLng);
            const kmCost = distance * (config.costoEnvioPorKm !== undefined ? parseFloat(config.costoEnvioPorKm) : 0.25);
            return parseFloat((baseCost + kmCost).toFixed(2));
        }
        return baseCost;
    };

    const getShippingText = () => {
        if (deliveryType !== 'DOMICILIO') return '';
        if (selectedLat && selectedLng) {
            const latNegocio = config.latitudNegocio !== undefined ? parseFloat(config.latitudNegocio) : -0.180653;
            const lngNegocio = config.longitudNegocio !== undefined ? parseFloat(config.longitudNegocio) : -78.467838;
            const distance = getDistanceFromLatLonInKm(latNegocio, lngNegocio, selectedLat, selectedLng);
            return `📍 ${distance.toFixed(1)} km aprox. ($${shippingCost.toFixed(2)})`;
        }
        return `📍 Tarifa base ($${shippingCost.toFixed(2)})`;
    };

    // Calculations
    const cartSubtotal = cart.reduce((acc, item) => acc + (item.product.precio * item.quantity), 0);
    const shippingCost = getDynamicShippingCost();
    const cartTotal = cartSubtotal + shippingCost;
    const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);

    const minOrderAmount = config.montoMinimoPedido !== undefined ? parseFloat(config.montoMinimoPedido) : 0;
    const isBelowMinOrder = minOrderAmount > 0 && cartSubtotal < minOrderAmount;
    const missingAmountForMin = isBelowMinOrder ? (minOrderAmount - cartSubtotal) : 0;

    // Filters
    const filteredProducts = products.filter(p => {
        const matchesCategory = selectedCategory === 'all' || p.categoriaId === selectedCategory;
        const matchesSearch = p.nombre.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            (p.descripcion && p.descripcion.toLowerCase().includes(searchQuery.toLowerCase()));
        return p.activo && matchesCategory && matchesSearch;
    });

    // Validations & Availabilities
    const isTodayAvailable = () => {
        if (!config.horaLimiteMismoDia) return true;
        const now = new Date();
        const [limitH, limitM] = config.horaLimiteMismoDia.split(':').map(Number);
        const limitTime = new Date();
        limitTime.setHours(limitH, limitM, 0, 0);
        return now.getTime() < limitTime.getTime();
    };

    // Obtener franjas horarias válidas
    const getTimeSlots = () => {
        const slots = ["09-11", "11-13", "14-16", "16-18", "18-20", "20-22"];
        const todayStr = new Date().toISOString().split('T')[0];
        
        if (deliveryDate === todayStr) {
            const now = new Date();
            const currentHour = now.getHours();
            // Filtrar franjas que ya pasaron con 1 hora de margen
            return slots.filter(slot => {
                const startHour = parseInt(slot.split('-')[0]);
                return startHour > currentHour + 1;
            });
        }
        return slots;
    };

    const slotsDisponibles = getTimeSlots();

    // Auto-seleccionar primer horario disponible al cambiar fecha
    useEffect(() => {
        const slots = getTimeSlots();
        if (slots.length > 0) {
            setTimeSlot(prev => (slots.includes(prev) ? prev : slots[0]));
        } else {
            setTimeSlot(prev => (prev === '' ? prev : ''));
        }
    }, [deliveryDate]);

    // Cargar datos del cliente guardados en localStorage (Teléfono, Nombre, Dirección, Referencia, Coordenadas)
    useEffect(() => {
        try {
            let savedPhone = localStorage.getItem('pinchos_client_phone') || localStorage.getItem('user_phone') || localStorage.getItem('customer_phone');
            let savedName = localStorage.getItem('pinchos_client_name') || localStorage.getItem('user_name') || localStorage.getItem('customer_name');
            const savedAddr = localStorage.getItem('pinchos_client_address');
            const savedRef = localStorage.getItem('pinchos_client_reference');
            const savedLat = localStorage.getItem('pinchos_client_lat');
            const savedLng = localStorage.getItem('pinchos_client_lng');

            if (!savedName || !savedPhone) {
                const custInfo = localStorage.getItem('customerInfo');
                if (custInfo) {
                    try {
                        const parsed = JSON.parse(custInfo);
                        if (parsed.name && !savedName) savedName = parsed.name;
                        if (parsed.phone && !savedPhone) savedPhone = parsed.phone;
                    } catch (e) {}
                }
            }

            if (savedPhone) {
                setClientPhone(savedPhone);
                fetchActiveOrder(savedPhone);
            }
            if (savedName) setClientName(savedName);
            if (savedAddr) setClientAddress(savedAddr);
            if (savedRef) setClientReference(savedRef);

            if (savedLat && savedLng) {
                const pLat = parseFloat(savedLat);
                const pLng = parseFloat(savedLng);
                if (!isNaN(pLat) && !isNaN(pLng)) {
                    setSelectedLat(pLat);
                    setSelectedLng(pLng);
                }
            } else {
                // Auto-detectar GPS al entrar si no hay coordenadas guardadas
                if (typeof window !== 'undefined' && navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition((pos) => {
                        setSelectedLat(pos.coords.latitude);
                        setSelectedLng(pos.coords.longitude);
                    }, () => {}, { timeout: 6000, maximumAge: 60000 });
                }
            }
        } catch (e) {
            console.error("Error al leer datos guardados del cliente:", e);
        }
    }, []);

    // Guardar los datos del cliente en localStorage para futuros pedidos
    const saveClientDataToLocalStorage = (name: string, phone: string) => {
        try {
            if (phone) {
                localStorage.setItem('pinchos_client_phone', phone);
                localStorage.setItem('user_phone', phone);
            }
            if (name) {
                localStorage.setItem('pinchos_client_name', name);
                localStorage.setItem('user_name', name);
            }
            if (clientAddress) localStorage.setItem('pinchos_client_address', clientAddress);
            if (clientReference) localStorage.setItem('pinchos_client_reference', clientReference);
            if (selectedLat !== null && selectedLat !== undefined) localStorage.setItem('pinchos_client_lat', selectedLat.toString());
            if (selectedLng !== null && selectedLng !== undefined) localStorage.setItem('pinchos_client_lng', selectedLng.toString());
            localStorage.setItem('customerInfo', JSON.stringify({ name, phone, address: clientAddress }));
        } catch (e) {
            console.error("Error al guardar datos del cliente en localStorage:", e);
        }
    };

    // Función auxiliar para procesar o preparar el pedido
    const createOrderDirectly = async (phone: string, name: string) => {
        const isPinchos = negocio.slug === 'pinchos';
        const isSoloPagoPrevio = !isPinchos && (bankConfig?.soloPagoPrevio ?? true);

        const payload = {
            deliveryType,
            clientName: name,
            clientPhone: phone,
            clientAddress: deliveryType === 'DOMICILIO' ? clientAddress : null,
            clientReference: deliveryType === 'DOMICILIO' ? clientReference : null,
            lat: deliveryType === 'DOMICILIO' ? selectedLat : null,
            lng: deliveryType === 'DOMICILIO' ? selectedLng : null,
            deliveryDate: deliveryDate,
            timeSlot,
            items: cart.map(item => ({
                productId: item.product.id,
                cantidad: item.quantity
            }))
        };

        if (isSoloPagoPrevio) {
            // 🔒 PAGO PREVIO OBLIGATORIO: No se crea la orden en la BD todavía
            setDraftCheckoutPayload(payload);
            const mockCode = `PAY-${Math.floor(100000 + Math.random() * 900000)}`;
            setDraftPaymentCode(mockCode);
            saveClientDataToLocalStorage(name, phone);
            setStep('payment');
            return;
        }

        // Flujo tradicional (Pinchos o Pago en Efectivo/Contraentrega)
        const response = await fetch(`/api/public/${negocio.slug}/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            const data = await response.json();
            setCreatedOrder(data.pedido);
            setCreatedPayment(data.payment);
            setActiveOrder(data.pedido);
            saveClientDataToLocalStorage(name, phone);
            setStep('payment');
            setCart([]);
            localStorage.removeItem(`cart_${negocio.id}`);
        } else {
            const err = await response.json();
            alert(err.error || "Ocurrió un error al procesar el pedido.");
        }
    };

    // Paso 1: Iniciar proceso de confirmación de pedido
    const handleStartCheckoutOTP = async (e: React.FormEvent) => {
        e.preventDefault();
        if (cart.length === 0) return;

        const savedPhone = clientPhone || localStorage.getItem('pinchos_client_phone') || localStorage.getItem('user_phone');
        const savedName = clientName || localStorage.getItem('pinchos_client_name') || localStorage.getItem('user_name');

        if (!savedPhone || !savedName) {
            if (!clientName || !clientPhone) {
                alert("Por favor ingresa tu nombre y teléfono para continuar.");
                return;
            }
        }

        if (deliveryType === 'DOMICILIO' && !clientAddress) {
            alert("Por favor ingresa tu dirección de entrega.");
            return;
        }

        const phoneToUse = (savedPhone || clientPhone).trim();
        const nameToUse = (savedName || clientName).trim();

        // SI EL CLIENTE YA ESTÁ AUTENTICADO CON ESTE NAVEGADOR
        const isAuth = localStorage.getItem('pinchos_client_phone') || localStorage.getItem('user_phone');
        if (isAuth) {
            try {
                setSubmitting(true);
                await createOrderDirectly(phoneToUse, nameToUse);
            } catch (err) {
                alert("Error de conexión al procesar el pedido.");
            } finally {
                setSubmitting(false);
            }
            return;
        }

        // SI ES UN CLIENTE NUEVO (NO AUTENTICADO), SOLICITAR OTP VÍA WHATSAPP
        try {
            setSubmitting(true);
            setOtpMessage(null);
            const res = await fetch('/api/public/auth/otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'send_otp', phone: phoneToUse, nombre: nameToUse, slug: negocio.slug })
            });
            const data = await res.json();
            if (data.success) {
                setStep('otp');
                setOtpMessage(data.message);
            } else {
                alert(data.error || "Fallo al enviar el código OTP.");
            }
        } catch (err) {
            alert("Error de conexión al enviar OTP.");
        } finally {
            setSubmitting(false);
        }
    };

    // Paso 2: Verificar OTP y Crear Pedido en DB
    const handleVerifyOTPAndSubmitOrder = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!otpCode) {
            setOtpMessage("Ingresa el código de 4 dígitos.");
            return;
        }

        try {
            setOtpLoading(true);
            setOtpMessage(null);

            // Verificar OTP
            const otpRes = await fetch('/api/public/auth/otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'verify_otp', phone: clientPhone, code: otpCode, slug: negocio.slug })
            });

            const otpData = await otpRes.json();
            if (!otpData.success) {
                setOtpMessage(otpData.error || "Código OTP incorrecto.");
                setOtpLoading(false);
                return;
            }

            // Guardar sesión unificada del cliente autenticado
            saveClientDataToLocalStorage(clientName, clientPhone);

            // Crear el pedido
            await createOrderDirectly(clientPhone, clientName);
        } catch (err) {
            setOtpMessage("Error al procesar el pedido.");
        } finally {
            setOtpLoading(false);
        }
    };

    // Paso 3: Subir Comprobante de Pago y Confirmar Orden en DB
    const handleUploadEvidenceSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!evidenceFile) {
            setUploadError("Por favor selecciona una imagen o documento PDF de tu comprobante.");
            return;
        }

        try {
            setUploadingEvidence(true);
            setUploadError(null);

            let targetOrder = createdOrder;

            // Si es Pago Previo Obligatorio y la orden aún no está en la BD, crearla ahora
            if (!targetOrder && draftCheckoutPayload) {
                const createRes = await fetch(`/api/public/${negocio.slug}/orders`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(draftCheckoutPayload)
                });

                if (!createRes.ok) {
                    const errData = await createRes.json();
                    setUploadError(errData.error || "Error al registrar la orden previa.");
                    setUploadingEvidence(false);
                    return;
                }

                const createData = await createRes.json();
                targetOrder = createData.pedido;
                setCreatedOrder(createData.pedido);
                setCreatedPayment(createData.payment);
                setActiveOrder(createData.pedido);
            }

            if (!targetOrder) {
                setUploadError("No se encontró una orden válida para adjuntar comprobante.");
                setUploadingEvidence(false);
                return;
            }

            if (!evidenceFile && targetOrder) {
                clearCart();
                setDraftCheckoutPayload(null);
                setStep('success');
                return;
            }

            const formData = new FormData();
            formData.append('file', evidenceFile);

            const res = await fetch(`/api/public/${negocio.slug}/orders/${targetOrder.id}/payment-evidence`, {
                method: 'POST',
                body: formData
            });

            const data = await res.json();
            if (data.success) {
                clearCart();
                setDraftCheckoutPayload(null);
                setStep('success');
            } else {
                setUploadError(data.error || "Error al subir el comprobante.");
            }
        } catch (err: any) {
            setUploadError("Error de red al subir comprobante.");
        } finally {
            setUploadingEvidence(false);
        }
    };

    // PANTALLA 1: VERIFICACIÓN OTP
    if (step === 'otp') {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-4 py-12 text-slate-900">
                <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-2xl border border-slate-200/80 text-center space-y-6">
                    <div className="size-16 bg-orange-500/10 rounded-2xl flex items-center justify-center mx-auto text-orange-600 border border-orange-500/20">
                        <Phone className="size-8" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Verificación de Teléfono</h2>
                        <p className="text-xs text-slate-500 mt-1 font-medium">Ingresa el código OTP enviado a <strong>{clientPhone}</strong> para verificar tu identidad y confirmar tu pedido.</p>
                    </div>

                    {otpMessage && (
                        <div className="p-3.5 bg-orange-50 border border-orange-200 rounded-2xl text-xs text-orange-800 font-bold">
                            {otpMessage}
                        </div>
                    )}

                    <form onSubmit={handleVerifyOTPAndSubmitOrder} className="space-y-4">
                        <div>
                            <input
                                type="text"
                                required
                                maxLength={6}
                                value={otpCode}
                                onChange={e => setOtpCode(e.target.value)}
                                placeholder="1234"
                                className="w-full py-4 bg-slate-50 border border-slate-200 rounded-2xl text-center text-3xl font-mono tracking-widest text-slate-900 focus:outline-none focus:border-orange-500 focus:bg-white transition-colors shadow-inner"
                            />
                            <p className="text-[11px] text-slate-400 mt-2 font-medium">Código en modo prueba: <strong className="text-slate-700">1234</strong></p>
                        </div>

                        <button
                            type="submit"
                            disabled={otpLoading}
                            className="w-full py-4 bg-orange-600 hover:bg-orange-700 active:scale-95 text-white font-black rounded-2xl text-xs uppercase tracking-widest shadow-lg shadow-orange-600/20 flex items-center justify-center gap-2 transition-all"
                        >
                            {otpLoading ? <Loader2 className="size-5 animate-spin" /> : 'Verificar OTP y Generar Pedido'}
                        </button>
                    </form>

                    <button
                        onClick={() => setStep('checkout')}
                        className="text-xs text-slate-500 hover:text-slate-800 transition-colors font-bold"
                    >
                        ← Volver a modificar datos
                    </button>
                </div>
            </div>
        );
    }

    // PANTALLA 2: DATOS BANCARIOS Y CARGA DE COMPROBANTE
    if (step === 'payment' && (createdOrder || draftCheckoutPayload)) {
        const paymentCode = createdPayment?.codigoPago || draftPaymentCode || `PAY-${Math.floor(100000 + Math.random() * 900000)}`;
        const totalAmountToPay = Number(createdOrder?.total || cartTotal || 0).toFixed(2);
        const isPinchos = negocio.slug === 'pinchos';
        const isLockedPayment = !isPinchos && (bankConfig?.soloPagoPrevio ?? true);

        return (
            <div className="min-h-screen bg-slate-950 text-slate-900 flex flex-col justify-start items-center pb-12">
                {/* Header Oscuro con Banner y Logo */}
                <header className="relative w-full max-w-lg bg-slate-950 pt-6 pb-12 px-6 flex items-center justify-between overflow-hidden">
                    {bannerImage && (
                        <div 
                            className="absolute inset-0 opacity-40 bg-cover bg-center pointer-events-none"
                            style={{ backgroundImage: `url('${bannerImage}')` }}
                        />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-b from-slate-950/90 via-slate-950/80 to-slate-950" />

                    {!isLockedPayment ? (
                        <button 
                            onClick={() => setStep('checkout')}
                            className="relative z-10 size-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center backdrop-blur-md transition-all active:scale-95 cursor-pointer border border-white/10"
                            title="Volver"
                        >
                            <ArrowLeft className="size-5" />
                        </button>
                    ) : (
                        <div className="relative z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[10px] font-black uppercase shadow-xs">
                            <Lock className="size-3.5 text-amber-400" />
                            <span>Pago Previo Requerido</span>
                        </div>
                    )}

                    <div className="relative z-10 flex items-center gap-2">
                        {negocio.logoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={negocio.logoUrl} alt={negocio.nombre} className="h-10 w-auto object-contain" />
                        ) : (
                            <span className="text-lg font-black text-white italic tracking-tighter uppercase">{negocio.nombre}</span>
                        )}
                    </div>

                    <div className="size-10 opacity-0" />
                </header>

                {/* Hoja Blanca de Contenido Principal */}
                <div className="relative z-20 w-full max-w-lg bg-slate-50 rounded-t-[36px] -mt-6 px-4 sm:px-6 py-6 border-t border-white/20 shadow-2xl space-y-5">
                    
                    {/* Título & Badges */}
                    <div className="text-center space-y-1.5 pb-1">
                        <div className="flex items-center justify-center gap-2 flex-wrap">
                            <span className="px-3 py-1 bg-orange-600 text-white rounded-full text-[9px] font-black uppercase tracking-wider shadow-xs">
                                Paso Final
                            </span>
                            <span className="px-3 py-1 bg-orange-100/80 text-orange-900 rounded-full text-[9px] font-black uppercase tracking-wider">
                                Transferencia Bancaria
                            </span>
                        </div>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight pt-1">Completa tu pago</h2>
                        <div className="w-8 h-1 bg-orange-600 rounded-full mx-auto" />
                        <p className="text-xs text-slate-500 font-medium max-w-xs mx-auto pt-0.5 leading-relaxed">
                            Transfiere el monto exacto y adjunta tu comprobante para enviar a producción.
                        </p>
                    </div>

                    {/* Tarjeta 1: Código de Pago y Monto a Transferir */}
                    <div className="bg-gradient-to-r from-orange-50/90 via-orange-50/50 to-orange-50/90 border border-orange-200/80 rounded-3xl p-4 sm:p-5 flex items-center justify-between shadow-2xs">
                        <div className="space-y-0.5">
                            <span className="text-[9px] font-black uppercase tracking-widest text-orange-900/70 block">Código de Pago</span>
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-mono font-black text-orange-700 tracking-wider">{paymentCode}</span>
                                <button
                                    type="button"
                                    onClick={() => {
                                        navigator.clipboard.writeText(paymentCode);
                                        setCopiedCode(true);
                                        setTimeout(() => setCopiedCode(false), 2000);
                                    }}
                                    className="p-1.5 text-orange-600 hover:text-orange-800 bg-orange-100 hover:bg-orange-200 rounded-lg transition-all active:scale-95 cursor-pointer"
                                    title="Copiar código"
                                >
                                    {copiedCode ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
                                </button>
                            </div>
                        </div>

                        <div className="h-10 w-px bg-orange-200/70 mx-1" />

                        <div className="flex items-center gap-3">
                            <div className="text-right space-y-0.5">
                                <span className="text-[9px] font-black uppercase tracking-widest text-orange-900/70 block">Monto a Transferir</span>
                                <span className="text-2xl font-black text-slate-900 tracking-tight">${totalAmountToPay}</span>
                            </div>
                            <div className="size-11 bg-orange-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-orange-600/30 shrink-0">
                                <Wallet className="size-6" />
                            </div>
                        </div>
                    </div>

                    {/* Tarjeta 2: Datos para la Transferencia */}
                    {(() => {
                        const cuentasList = Array.isArray(bankConfig?.cuentas) && bankConfig.cuentas.length > 0 ? bankConfig.cuentas : [bankConfig || {}];
                        const activeBankAcc = cuentasList[selectedBankIndex] || cuentasList[0] || {};

                        return (
                            <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-md space-y-4 text-left">
                                <div className="flex justify-between items-center border-b border-slate-100 pb-3 flex-wrap gap-2">
                                    <div className="flex items-center gap-3">
                                        <div className="size-10 bg-slate-900 text-white rounded-full flex items-center justify-center font-black shadow-xs shrink-0">
                                            <Building2 className="size-5" />
                                        </div>
                                        <span className="text-xs font-black text-slate-900 uppercase tracking-widest">Datos para la Transferencia</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl">
                                        <span className="text-xs font-black text-orange-700 uppercase tracking-wider">{activeBankAcc.banco || 'BANCO PICHINCHA'}</span>
                                    </div>
                                </div>

                                {/* Pestañas / Tabs si hay más de una cuenta bancaria */}
                                {cuentasList.length > 1 && (
                                    <div className="space-y-1.5">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Selecciona el Banco a Transferir:</span>
                                        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                                            {cuentasList.map((acc: any, idx: number) => (
                                                <button
                                                    key={acc.id || idx}
                                                    type="button"
                                                    onClick={() => setSelectedBankIndex(idx)}
                                                    className={`px-3.5 py-2 rounded-2xl text-xs font-black transition-all shrink-0 cursor-pointer ${
                                                        selectedBankIndex === idx 
                                                            ? 'bg-orange-600 text-white shadow-md' 
                                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                                    }`}
                                                >
                                                    🏦 {acc.banco}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-4 pt-1">
                                    <div className="flex items-center gap-3">
                                        <div className="size-8 bg-orange-100/70 text-orange-700 rounded-full flex items-center justify-center shrink-0">
                                            <User className="size-4" />
                                        </div>
                                        <div>
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">TITULAR</span>
                                            <span className="text-xs font-black text-slate-900">{activeBankAcc.titular || 'Titular de Cuenta'}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <div className="size-8 bg-orange-100/70 text-orange-700 rounded-full flex items-center justify-center shrink-0">
                                            <CreditCard className="size-4" />
                                        </div>
                                        <div>
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">TIPO DE CUENTA</span>
                                            <span className="text-xs font-black text-slate-900">{activeBankAcc.tipoCuenta || 'Ahorros'}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <div className="size-8 bg-orange-100/70 text-orange-700 rounded-full flex items-center justify-center shrink-0">
                                            <Hash className="size-4" />
                                        </div>
                                        <div>
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">NÚMERO DE CUENTA</span>
                                            <span className="text-xs font-mono font-black text-slate-900 select-all">{activeBankAcc.numeroCuenta || '0000000000'}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <div className="size-8 bg-orange-100/70 text-orange-700 rounded-full flex items-center justify-center shrink-0">
                                            <FileText className="size-4" />
                                        </div>
                                        <div>
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">IDENTIFICACIÓN / RUC</span>
                                            <span className="text-xs font-mono font-black text-slate-900">{activeBankAcc.identificacion || '0000000000001'}</span>
                                        </div>
                                    </div>
                                </div>

                                {activeBankAcc.instructions && (
                                    <div className="p-3 bg-orange-50/70 border border-orange-200/60 rounded-2xl text-[11px] text-orange-950 font-medium">
                                        💡 {activeBankAcc.instructions}
                                    </div>
                                )}

                                {/* Código QR opcional */}
                                {activeBankAcc.qrImageUrl && (
                                    <div className="pt-3 text-center border-t border-slate-100">
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Escanea el código QR de Pago</span>
                                        <img src={activeBankAcc.qrImageUrl} alt="QR de Pago" className="w-36 h-36 mx-auto rounded-2xl border border-slate-200 shadow-md object-contain bg-white p-2" />
                                    </div>
                                )}
                            </div>
                        );
                    })()}

                    {/* Formulario de Carga de Comprobante con Estilo Dashed */}
                    <form onSubmit={handleUploadEvidenceSubmit} className="space-y-4 pt-1">
                        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-md space-y-3">
                            <label className="block text-[10px] font-black text-slate-900 uppercase tracking-widest">
                                SUBIR COMPROBANTE (PNG, JPG, WEBP O PDF) *
                            </label>

                            <div 
                                onClick={() => document.getElementById('evidence-file-input')?.click()}
                                className="border-2 border-dashed border-orange-300/80 hover:border-orange-500 bg-orange-50/30 hover:bg-orange-50/60 rounded-2xl p-4 flex items-center gap-3 transition-all cursor-pointer"
                            >
                                <div className="size-10 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center shrink-0 shadow-2xs">
                                    <UploadCloud className="size-5" />
                                </div>
                                
                                <button
                                    type="button"
                                    className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-black text-xs rounded-xl shadow-md transition-all active:scale-95 cursor-pointer shrink-0"
                                >
                                    Seleccionar archivo
                                </button>

                                <span className="text-xs font-semibold text-slate-500 truncate flex-1">
                                    {evidenceFile ? evidenceFile.name : 'Sin archivos seleccionados'}
                                </span>

                                <input
                                    id="evidence-file-input"
                                    type="file"
                                    required={!createdPayment && !activeOrder}
                                    accept="image/png, image/jpeg, image/webp, application/pdf"
                                    onChange={e => {
                                        if (e.target.files?.[0]) setEvidenceFile(e.target.files[0]);
                                    }}
                                    className="hidden"
                                />
                            </div>

                            <div className="bg-slate-100/80 rounded-2xl p-3.5 flex items-start gap-3 border border-slate-200/60">
                                <ShieldCheck className="size-5 text-orange-600 shrink-0 mt-0.5" />
                                <div className="text-[10px] text-slate-600 font-semibold leading-relaxed">
                                    <strong className="text-slate-800 block">Tu comprobante es 100% seguro.</strong>
                                    Solo se usa para validar tu pago y enviar tu pedido a producción.
                                </div>
                            </div>
                        </div>

                        {uploadError && (
                            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-bold text-center">
                                {uploadError}
                            </div>
                        )}

                        {/* Botón Principal enviar comprobante */}
                        <div className="space-y-2 pt-1">
                            <button
                                type="submit"
                                disabled={uploadingEvidence || !evidenceFile}
                                className="w-full py-4 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 text-white font-black rounded-2xl text-xs uppercase tracking-widest shadow-xl shadow-orange-600/30 flex items-center justify-center gap-2 disabled:opacity-50 transition-all active:scale-[0.98] cursor-pointer"
                            >
                                {uploadingEvidence ? (
                                    <>
                                        <Loader2 className="size-5 animate-spin" />
                                        Enviando comprobante...
                                    </>
                                ) : (
                                    <>
                                        <Send className="size-4" />
                                        ENVIAR COMPROBANTE Y FINALIZAR
                                    </>
                                )}
                            </button>
                            <div className="flex items-center justify-center gap-1.5 text-center pt-1">
                                <Lock className="size-3 text-slate-400" />
                                <span className="text-[11px] font-bold text-slate-400">Tus datos están protegidos</span>
                            </div>
                        </div>
                    </form>

                </div>
            </div>
        );
    }

    // PANTALLA 3: PEDIDO REGISTRADO Y PAGO EN REVISIÓN
    if (step === 'success' && createdOrder) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-6 py-12 text-slate-900">
                <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-2xl text-center border border-slate-200/80 animate-fade-in space-y-6">
                    <div className="size-20 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto text-amber-600 border border-amber-500/20 animate-pulse">
                        <Clock className="size-10 stroke-[2.5]" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight">¡Comprobante Recibido!</h1>
                        <p className="text-xs text-slate-500 font-medium mt-2">
                            Tu pago está en <strong>Proceso de Verificación</strong>. Tu pedido pasará a producción automáticamente tan pronto como el administrador confirme la transferencia bancaria.
                        </p>
                    </div>

                    <div className="bg-slate-50 rounded-2xl p-5 text-left border border-slate-200 space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Pedido N°</span>
                            <span className="text-sm font-black text-slate-900">#{createdOrder.numeroPedido}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Estado del Pago</span>
                            <span className="px-3 py-1 bg-amber-100 text-amber-800 border border-amber-300 rounded-full text-[10px] font-black uppercase tracking-widest">
                                En Revisión
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Entrega</span>
                            <span className="text-xs font-bold text-slate-700">{createdOrder.tipoEntrega}</span>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total</span>
                            <span className="text-base font-black text-orange-600">${(Number(createdOrder?.total) || 0).toFixed(2)}</span>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <a
                            href={`/${negocio.slug}/pedidos`}
                            className="block w-full py-4 text-center text-xs font-black uppercase tracking-widest rounded-2xl text-white shadow-lg active:scale-95 transition-transform bg-orange-600 hover:bg-orange-700"
                        >
                            Ver Mis Pedidos
                        </a>
                        <button
                            onClick={() => {
                                setStep('catalog');
                                setCreatedOrder(null);
                            }}
                            className="block w-full py-4 text-center text-xs font-black uppercase tracking-widest rounded-2xl text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 active:scale-95 transition-transform"
                        >
                            Volver al Catálogo
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col pb-24 md:pb-12 text-slate-800 md:pt-[76px]" style={{ '--primary-color': primaryColor } as any}>
            {/* Header móvil (En Desktop se usa la barra unificada PublicDesktopNav) */}
            <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 py-4 flex items-center justify-between shadow-sm md:hidden">
                <div className="flex items-center gap-3">
                    {step === 'checkout' && (
                        <button onClick={() => setStep('catalog')} className="p-1 rounded-lg text-slate-500 active:scale-95 transition-transform">
                            <ArrowLeft className="size-5" />
                        </button>
                    )}
                    {negocio.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={negocio.logoUrl} alt={negocio.nombre} width={36} height={36} className="rounded-xl object-contain size-9 border border-slate-100 bg-white" />
                    ) : (
                        <div className="size-9 rounded-xl flex items-center justify-center text-white text-xs font-black uppercase" style={{ backgroundColor: primaryColor }}>
                            {negocio.nombre.substring(0, 2)}
                        </div>
                    )}
                    <div>
                        <h1 className="text-sm font-black text-slate-900 tracking-tight leading-tight">{negocio.nombre}</h1>
                        <span className="text-[9px] font-black tracking-widest text-slate-400 uppercase leading-none">
                            {step === 'checkout' ? 'Realizar Pedido' : 'Pedidos Online'}
                        </span>
                    </div>
                </div>
                
                {step === 'catalog' && (
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handleShareApp}
                            className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200/80 px-2.5 py-1.5 rounded-xl transition-all cursor-pointer shadow-2xs active:scale-95"
                            title="Compartir esta app"
                        >
                            <Share2 className="size-3.5 text-orange-600 shrink-0" />
                            <span className="hidden sm:inline">Compartir</span>
                        </button>

                        {clientPhone ? (
                            <Link 
                                href={`/${negocio.slug}/perfil`}
                                className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl transition-all cursor-pointer shadow-2xs"
                            >
                                <User className="size-3.5 text-slate-500" />
                                <span className="truncate max-w-[70px] sm:max-w-[100px]">{clientName || 'Perfil'}</span>
                            </Link>
                        ) : (
                            <Link
                                href={`/${negocio.slug}/perfil`}
                                className="text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl border border-emerald-200/80 transition-all cursor-pointer shadow-2xs flex items-center gap-1"
                            >
                                <User className="size-3.5 text-emerald-600" />
                                <span>Login</span>
                            </Link>
                        )}

                        <button 
                            onClick={() => {
                                if (cart.length > 0) setStep('checkout');
                            }}
                            disabled={cart.length === 0}
                            className="relative p-2 text-slate-600 disabled:text-slate-300 disabled:bg-transparent active:scale-95 transition-transform cursor-pointer"
                        >
                            <ShoppingBag className="size-6" />
                            {totalItems > 0 && (
                                <span className="absolute -top-1 -right-1 size-5 bg-rose-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center shadow-md animate-pulse">
                                    {totalItems}
                                </span>
                            )}
                        </button>
                    </div>
                )}
                {step === 'checkout' && (
                    <button 
                        type="button"
                        onClick={() => setStep('catalog')}
                        className="text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100/80 px-3 py-1.5 rounded-xl border border-emerald-200/80 flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer shadow-2xs"
                    >
                        <Plus className="size-3.5 text-emerald-600 stroke-[2.5]" />
                        <span>Añadir productos</span>
                    </button>
                )}
            </header>

            {step === 'catalog' ? (
                <>
                    {/* ── HERO PRINCIPAL OSCURO ── */}
                    <div className="relative w-full bg-[#120800] overflow-hidden">
                        {/* Carrusel de imágenes de portada con transición suave */}
                        {bannerList.map((url, idx) => (
                            <div 
                                key={idx}
                                className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ease-in-out ${
                                    idx === currentBannerIndex ? 'opacity-50 z-0' : 'opacity-0 -z-10'
                                }`}
                                style={{ backgroundImage: `url('${url}')` }}
                            />
                        ))}
                        <div className="absolute inset-0 bg-gradient-to-t from-[#120800] via-[#120800]/60 to-[#120800]/20" />
                        <div className="absolute inset-0 bg-gradient-to-r from-[#120800]/80 via-transparent to-[#120800]/30" />

                        {/* Contenido del Hero */}
                        <div className="relative z-10 px-6 pt-10 pb-8 max-w-lg mx-auto">
                            {/* Badge superior */}
                            <div className="inline-flex items-center gap-2 mb-4">
                                <span className="px-3 py-1 text-[9px] font-black uppercase tracking-[0.2em] rounded-full border" style={{ color: primaryColor, borderColor: primaryColor, backgroundColor: `${primaryColor}20` }}>
                                    🔥 Pedidos en Línea
                                </span>
                            </div>

                            {/* Título grande */}
                            <h2 className="text-5xl md:text-6xl font-black text-white uppercase leading-[0.9] tracking-tight mb-2 drop-shadow-2xl">
                                {heroTitle.split(' ').slice(0, 2).join(' ')}
                            </h2>
                            {heroTitle.split(' ').length > 2 && (
                                <h2 className="text-5xl md:text-6xl font-black italic uppercase leading-[0.9] tracking-tight mb-4 drop-shadow-2xl" style={{ color: primaryColor }}>
                                    {heroTitle.split(' ').slice(2).join(' ')}
                                </h2>
                            )}

                            <p className="text-white/70 text-sm font-medium mb-6 leading-relaxed max-w-xs">
                                {heroSub}
                            </p>

                            {/* ── CARD DE HORARIO DE ATENCIÓN Y ESTADO DEL LOCAL ── */}
                            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4.5 mb-2 text-white shadow-2xl">
                                <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
                                    <div className="flex items-center gap-2">
                                        <span className={`w-3 h-3 rounded-full animate-pulse ${isStoreClosed ? 'bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.8)]' : 'bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)]'}`} />
                                        <span className={`font-black text-xs uppercase tracking-wider ${isStoreClosed ? 'text-red-300' : 'text-emerald-300'}`}>
                                            {isStoreClosed ? '🔴 Local Cerrado' : '🟢 Abierto Ahora'}
                                        </span>
                                    </div>
                                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-white/90 px-2.5 py-1 rounded-full bg-white/10 border border-white/15">
                                        {isStoreClosed ? 'Pedidos Pausados' : 'Pedidos Inmediatos'}
                                    </span>
                                </div>

                                <div className="flex items-start gap-2.5 text-xs text-white/90">
                                    <Clock className="w-4 h-4 mt-0.5 shrink-0" style={{ color: primaryColor }} />
                                    <div>
                                        <p className="font-bold text-white text-xs">Horario de Atención:</p>
                                        <p className="text-white/80 font-medium text-xs mt-0.5">
                                            {negocio.horarioApertura && negocio.horarioCierre
                                                ? `Lunes a Domingo: ${formatTimeLabel(negocio.horarioApertura)} - ${formatTimeLabel(negocio.horarioCierre)}`
                                                : config.horarioAtencion || (config.horaLimiteMismoDia ? `Lunes a Domingo: 11:00 AM - ${config.horaLimiteMismoDia}` : 'Lunes a Domingo: 11:00 AM - 11:59 PM')}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Indicadores de Banner (Dots) */}
                            {bannerList.length > 1 && (
                                <div className="flex items-center gap-1.5 mt-3">
                                    {bannerList.map((_, idx) => (
                                        <button
                                            key={idx}
                                            type="button"
                                            onClick={() => setCurrentBannerIndex(idx)}
                                            className={`h-1.5 rounded-full transition-all duration-300 ${
                                                idx === currentBannerIndex ? 'w-6 bg-white' : 'w-2 bg-white/40 hover:bg-white/70'
                                            }`}
                                            title={`Ver banner ${idx + 1}`}
                                        />
                                    ))}
                                </div>
                            )}

                            {/* 3 badges informativos */}
                            <div className="flex gap-4 mt-6 pt-5 border-t border-white/10 flex-wrap">
                                {config.tiempoMaximoEntrega && (
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-base">⏱️</span>
                                        <div>
                                            <p className="text-white font-black text-[10px]">{config.tiempoMaximoEntrega}</p>
                                            <p className="text-white/50 text-[9px] font-medium">Entrega rápida</p>
                                        </div>
                                    </div>
                                )}
                                <div className="flex items-center gap-1.5">
                                    <span className="text-base">🔥</span>
                                    <div>
                                        <p className="text-white font-black text-[10px]">Recién preparado</p>
                                        <p className="text-white/50 text-[9px] font-medium">Ingredientes frescos</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className="text-base">🔒</span>
                                    <div>
                                        <p className="text-white font-black text-[10px]">Pago seguro</p>
                                        <p className="text-white/50 text-[9px] font-medium">Múltiples métodos</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>


                    {/* Banner de Aviso de Pedido Activo / Pendiente de Aprobación (Debajo del Banner Principal) */}
                    {activeOrder && (
                        <div className={`mx-4 mt-4 rounded-3xl p-4 md:p-5 shadow-xl border flex flex-col md:flex-row items-center justify-between gap-4 text-left animate-fade-in ${
                            ['PENDIENTE_PAGO', 'PAGO_EN_REVISION', 'PENDIENTE'].includes(activeOrder.estado)
                                ? 'bg-gradient-to-r from-amber-950 via-slate-900 to-amber-950 text-amber-50 border-amber-800/80 shadow-amber-950/20'
                                : 'bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white border-emerald-800/80 shadow-emerald-950/20'
                        }`}>
                            <div className="flex items-center gap-3.5 w-full md:w-auto">
                                <div className={`size-11 rounded-2xl flex items-center justify-center font-black shrink-0 shadow-inner ${
                                    ['PENDIENTE_PAGO', 'PAGO_EN_REVISION', 'PENDIENTE'].includes(activeOrder.estado)
                                        ? 'bg-amber-500/20 text-amber-400 ring-2 ring-amber-500/30'
                                        : 'bg-emerald-500/20 text-emerald-400 ring-2 ring-emerald-500/30'
                                }`}>
                                    {['PENDIENTE_PAGO', 'PAGO_EN_REVISION', 'PENDIENTE'].includes(activeOrder.estado) ? (
                                        <AlertCircle className="size-6 animate-bounce" />
                                    ) : (
                                        <Clock className="size-6 animate-pulse" />
                                    )}
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className={`text-xs font-black uppercase tracking-wider ${
                                            ['PENDIENTE_PAGO', 'PAGO_EN_REVISION', 'PENDIENTE'].includes(activeOrder.estado)
                                                ? 'text-amber-400'
                                                : 'text-emerald-400'
                                        }`}>
                                            {['PENDIENTE_PAGO', 'PAGO_EN_REVISION', 'PENDIENTE'].includes(activeOrder.estado)
                                                ? `⏳ Pedido Pendiente de Aprobación #${activeOrder.id.slice(0, 8)}`
                                                : `🛵 Pedido Confirmado #${activeOrder.id.slice(0, 8)}`}
                                        </span>
                                        <span className={`text-[8px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                                            ['PENDIENTE_PAGO', 'PAGO_EN_REVISION', 'PENDIENTE'].includes(activeOrder.estado)
                                                ? 'bg-amber-500/30 text-amber-200 border border-amber-400/30'
                                                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                                        }`}>
                                            {['PENDIENTE_PAGO', 'PAGO_EN_REVISION', 'PENDIENTE'].includes(activeOrder.estado) ? 'En Verificación' : activeOrder.estado}
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-slate-300 font-semibold mt-1">
                                        {['PENDIENTE_PAGO', 'PAGO_EN_REVISION', 'PENDIENTE'].includes(activeOrder.estado)
                                            ? 'El establecimiento está verificando tu pago para programar el envío.'
                                            : `Entrega estimada: ${activeOrder.fechaEntrega ? new Date(activeOrder.fechaEntrega).toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) : 'Por definir'}`}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center justify-between md:justify-end gap-4 w-full md:w-auto border-t md:border-t-0 border-slate-800/80 pt-3 md:pt-0">
                                <div className="text-left md:text-right">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">Tiempo Restante</span>
                                    <span className={`text-sm font-mono font-black ${
                                        ['PENDIENTE_PAGO', 'PAGO_EN_REVISION', 'PENDIENTE'].includes(activeOrder.estado)
                                            ? 'text-amber-400'
                                            : 'text-emerald-400'
                                    }`}>
                                        {countdownTime || 'Calculando...'}
                                    </span>
                                </div>
                                <Link
                                    href={`/${negocio.slug}/pedidos/${activeOrder.id}`}
                                    className={`px-4 py-2.5 font-black text-xs rounded-xl transition-all active:scale-95 shrink-0 shadow-md flex items-center gap-1.5 ${
                                        ['PENDIENTE_PAGO', 'PAGO_EN_REVISION', 'PENDIENTE'].includes(activeOrder.estado)
                                            ? 'bg-amber-500 hover:bg-amber-600 text-slate-950'
                                            : 'bg-emerald-500 hover:bg-emerald-600 text-slate-950'
                                    }`}
                                >
                                    <span>Ver Pedido →</span>
                                </Link>
                            </div>
                        </div>
                    )}

                    {/* Informative Banner (Tiempo de entrega compacto) - Se oculta si hay un pedido activo visible */}
                    {!activeOrder && config.tiempoMaximoEntrega && (
                        <div className="mx-6 mt-3 bg-gradient-to-r from-amber-50 to-orange-50/70 border border-amber-200/60 rounded-xl px-3.5 py-2 flex items-center justify-between text-left shadow-xs">
                            <div className="flex items-center gap-2">
                                <Clock className="size-3.5 text-amber-600 shrink-0" />
                                <span className="text-[10px] font-bold text-amber-900/80 uppercase tracking-wider">Tiempo de entrega aproximado:</span>
                            </div>
                            <span className="text-[11px] font-black text-amber-950 bg-white/80 px-2 py-0.5 rounded-md border border-amber-200/60 shadow-2xs">
                                {config.tiempoMaximoEntrega}
                            </span>
                        </div>
                    )}



                    {/* Categorías (Filtros) */}
                    {categories.length > 0 && (
                        <div className="px-6 mt-4">
                            <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar scroll-smooth">
                                <button 
                                    onClick={() => setSelectedCategory('all')}
                                    className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider shrink-0 transition-all ${
                                        selectedCategory === 'all' 
                                            ? 'text-white shadow-md' 
                                            : 'bg-white text-slate-500 border border-slate-100'
                                    }`}
                                    style={selectedCategory === 'all' ? { backgroundColor: primaryColor } : {}}
                                >
                                    Todos
                                </button>
                                {categories.map(cat => (
                                    <button 
                                        key={cat.id}
                                        onClick={() => setSelectedCategory(cat.id)}
                                        className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider shrink-0 transition-all ${
                                            selectedCategory === cat.id 
                                                ? 'text-white shadow-md' 
                                                : 'bg-white text-slate-500 border border-slate-100'
                                        }`}
                                        style={selectedCategory === cat.id ? { backgroundColor: primaryColor } : {}}
                                    >
                                        {cat.nombre}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ── TÍTULO SECCIÓN CATÁLOGO ── */}
                    <div className="px-4 pt-4 pb-1 flex items-center justify-between">
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] mb-0.5 block" style={{ color: primaryColor }}>🍽️ Menú</span>
                            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Los más pedidos</h3>
                        </div>
                        <button
                            onClick={() => setSelectedCategory('all')}
                            className="text-[10px] font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1"
                        >
                            Ver menú completo <ChevronRight className="size-3.5" />
                        </button>
                    </div>

                    {/* Catálogo de Productos */}
                    <main id="catalogo" className="flex-1 px-4 mt-3 pb-36">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-20">
                                <Loader2 className="size-8 text-slate-300 animate-spin mb-3" />
                                <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">Cargando menú...</span>
                            </div>
                        ) : filteredProducts.length > 0 ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                {filteredProducts.map(p => {
                                    const inCart = cart.find(item => item.product.id === p.id);
                                    
                                    return (
                                        <div key={p.id} className="bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-md transition-all relative flex flex-col group">
                                            {/* Imagen del Producto (Click para Zoom) - CUADRADA dominante */}
                                            <div 
                                                onClick={() => setZoomProduct(p)}
                                                className="relative w-full aspect-square bg-slate-100 overflow-hidden cursor-pointer"
                                                title="Ver detalle"
                                            >
                                                {p.imagenUrl ? (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img 
                                                        src={p.imagenUrl} 
                                                        alt={p.nombre} 
                                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                                                    />
                                                ) : (
                                                    <div className="absolute inset-0 flex items-center justify-center font-black text-4xl italic uppercase" style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}>
                                                        {p.nombre.substring(0, 1)}
                                                    </div>
                                                )}
                                                {/* Badge Zoom */}
                                                <div className="absolute top-2 right-2 size-7 rounded-xl bg-slate-950/60 text-white flex items-center justify-center backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <ZoomIn className="size-3.5" />
                                                </div>
                                            </div>

                                            {/* Detalles del Producto */}
                                            <div className="flex flex-col flex-1 p-3 text-left">
                                                <h3 
                                                    onClick={() => setZoomProduct(p)}
                                                    className="text-xs font-black text-slate-900 tracking-tight leading-tight cursor-pointer line-clamp-2"
                                                >
                                                    {p.nombre}
                                                </h3>
                                                {p.descripcion && (
                                                    <p className="text-[10px] text-slate-400 font-medium leading-relaxed mt-0.5 line-clamp-2">{p.descripcion}</p>
                                                )}
                                                <div className="flex justify-between items-center mt-auto pt-2">
                                                    <span className="text-sm font-black text-slate-900">${p.precio.toFixed(2)}</span>
                                                    
                                                    {isStoreClosed ? (
                                                        <button 
                                                            type="button"
                                                            onClick={(e) => { e.stopPropagation(); alert('El local se encuentra cerrado en este momento.'); }}
                                                            className="px-2.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider text-red-500 bg-red-50 border border-red-100 flex items-center gap-1 opacity-85 cursor-not-allowed"
                                                        >
                                                            <Lock className="size-3" />
                                                            <span>Cerrado</span>
                                                        </button>
                                                    ) : inCart ? (
                                                        <div className="flex items-center bg-slate-100 rounded-xl p-0.5 gap-1.5 border border-slate-200">
                                                            <button 
                                                                type="button"
                                                                onClick={() => updateQuantity(p.id, -1)}
                                                                className="size-7 bg-white hover:bg-slate-100 text-slate-800 rounded-lg flex items-center justify-center shadow-xs active:scale-90 transition-transform cursor-pointer"
                                                            >
                                                                <Minus className="size-3.5 stroke-[2.5]" />
                                                            </button>
                                                            <span className="text-xs font-black text-slate-900 min-w-[16px] text-center">{inCart.quantity}</span>
                                                            <button 
                                                                type="button"
                                                                onClick={() => updateQuantity(p.id, 1)}
                                                                className="size-7 bg-white hover:bg-slate-100 text-slate-800 rounded-lg flex items-center justify-center shadow-xs active:scale-90 transition-transform cursor-pointer"
                                                            >
                                                                <Plus className="size-3.5 stroke-[2.5]" />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button 
                                                            type="button"
                                                            onClick={() => addToCart(p)}
                                                            className="size-8 rounded-xl text-white shadow-md active:scale-95 transition-all flex items-center justify-center cursor-pointer"
                                                            style={{ backgroundColor: primaryColor }}
                                                        >
                                                            <Plus className="size-4 stroke-[2.5]" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-20">
                                <ShoppingBag className="size-12 text-slate-300 mx-auto mb-3" />
                                <h3 className="text-sm font-black text-slate-800 mb-1">Sin productos disponibles</h3>
                                <p className="text-xs text-slate-400 font-medium">Prueba buscando otro término o categoría.</p>
                            </div>
                        )}
                    </main>

                    {/* ── BANNER CTA GRUPOS/COMBOS ── */}
                    {categories.length > 0 && (
                        <div className="mx-4 my-4 rounded-3xl overflow-hidden relative" style={{ backgroundColor: '#120800' }}>
                            <div className="absolute inset-0 bg-cover bg-center opacity-30" style={{ backgroundImage: `url('${bannerImage}')` }} />
                            <div className="relative z-10 p-6 flex items-center justify-between gap-4">
                                <div>
                                    <p className="text-white/60 text-[10px] font-bold uppercase tracking-wider">¿Vas a tener visita?</p>
                                    <h3 className="text-white font-black text-lg uppercase tracking-tight leading-tight mt-0.5">SOMOS TU<br/><span style={{ color: primaryColor }}>MEJOR OPCIÓN</span></h3>
                                    <p className="text-white/50 text-[10px] mt-1">Grandes cantidades, mismo sabor.</p>
                                </div>
                                <button
                                    onClick={() => setSelectedCategory('all')}
                                    className="shrink-0 px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-wider border-2 border-white text-white hover:bg-white/20 active:scale-95 transition-all whitespace-nowrap flex items-center gap-2"
                                >
                                    <span>Ver Combos</span>
                                    <span>👥</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ── FOOTER PÚBLICO ── */}
                    <footer className="mx-0 px-6 py-6 mt-2 border-t border-slate-100 bg-white">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center sm:text-left">
                            {(config.whatsapp || negocio.whatsapp) && (
                                <a href={`https://wa.me/${(config.whatsapp || negocio.whatsapp || '').replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer"
                                    className="flex flex-col sm:flex-row items-center gap-2 group">
                                    <span className="text-2xl">💬</span>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">¿Dudas? Escríbenos</p>
                                        <p className="text-xs font-black text-slate-900 group-hover:text-green-600 transition-colors">{config.whatsapp || negocio.whatsapp}</p>
                                    </div>
                                </a>
                            )}
                            {config.horarioAtencion && (
                                <div className="flex flex-col sm:flex-row items-center gap-2">
                                    <span className="text-2xl">🕐</span>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Horario de atención</p>
                                        <p className="text-xs font-black text-slate-900">{config.horarioAtencion}</p>
                                    </div>
                                </div>
                            )}
                            <div className="flex flex-col items-center sm:items-start gap-1">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Síguenos</p>
                                <div className="flex items-center gap-3">
                                    {config.instagram && (
                                        <a href={`https://instagram.com/${config.instagram}`} target="_blank" rel="noopener noreferrer"
                                            className="size-8 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white hover:scale-110 transition-transform">
                                            <svg className="size-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                                        </a>
                                    )}
                                    {config.facebook && (
                                        <a href={`https://facebook.com/${config.facebook}`} target="_blank" rel="noopener noreferrer"
                                            className="size-8 rounded-xl bg-blue-600 flex items-center justify-center text-white hover:scale-110 transition-transform">
                                            <svg className="size-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                                        </a>
                                    )}
                                    {!config.instagram && !config.facebook && (
                                        <span className="text-xs text-slate-300 font-medium">—</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </footer>

                    {/* ── CARRITO FLOTANTE PREMIUM ── */}
                    {cart.length > 0 && (
                        <div className="fixed bottom-[84px] md:bottom-6 left-0 right-0 z-[9990] flex justify-center px-4 pb-4 md:pb-0 pointer-events-none">
                            <button 
                                onClick={() => setShowCartDrawer(true)}
                                className="pointer-events-auto w-full max-w-md bg-slate-950 text-white py-3.5 px-5 rounded-2xl shadow-2xl flex items-center justify-between active:scale-[0.98] transition-all border border-white/10 hover:bg-slate-900 cursor-pointer"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="relative">
                                        <ShoppingBag className="size-5 text-white" />
                                        <span className="absolute -top-2 -right-2 size-4 text-[8px] font-black rounded-full flex items-center justify-center text-white" style={{ backgroundColor: primaryColor }}>{totalItems}</span>
                                    </div>
                                    <div className="text-left">
                                        <p className="text-[9px] font-bold text-white/50 uppercase tracking-wider leading-none">Tu pedido</p>
                                        <p className="text-xs font-black text-white leading-tight">{totalItems} {totalItems === 1 ? 'producto' : 'productos'}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-sm font-black text-white">${cartSubtotal.toFixed(2)}</span>
                                    <span className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider text-white" style={{ backgroundColor: primaryColor }}>Ver carrito →</span>
                                </div>
                            </button>
                        </div>
                    )}
                </>
            ) : (
                /* Checkout View */
                <main className="flex-1 max-w-md w-full mx-auto px-6 py-6 pb-36">
                    <form onSubmit={handleStartCheckoutOTP} className="space-y-6">
                        
                        {/* Selector Tipo Entrega */}
                        <div className="bg-white rounded-3xl p-1.5 border border-slate-100 shadow-sm flex">
                            <button
                                type="button"
                                onClick={() => setDeliveryType('DOMICILIO')}
                                className={`flex-1 py-3 text-center rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                    deliveryType === 'DOMICILIO' ? 'bg-orange-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800 font-bold'
                                }`}
                            >
                                Entrega a Domicilio
                            </button>
                            <button
                                type="button"
                                onClick={() => setDeliveryType('RETIRO')}
                                className={`flex-1 py-3 text-center rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                    deliveryType === 'RETIRO' ? 'bg-orange-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800 font-bold'
                                }`}
                            >
                                Retiro en Local
                            </button>
                        </div>

                        {/* Datos del Cliente (Oculto en tarjeta compacta si la sesión está iniciada) */}
                        {clientPhone && clientName && !isEditingPersonalData ? (
                            <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm flex items-center justify-between">
                                <div className="flex items-center gap-3.5">
                                    <div className="size-10 rounded-2xl text-white flex items-center justify-center font-black text-sm shadow-sm" style={{ backgroundColor: primaryColor }}>
                                        {clientName.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-1.5">
                                            <h4 className="text-xs font-black text-slate-900">{clientName}</h4>
                                            <span className="bg-emerald-100 text-emerald-800 text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider">Identificado</span>
                                        </div>
                                        <p className="text-[11px] font-semibold text-slate-500 flex items-center gap-1 mt-0.5">
                                            <Phone className="size-3 text-slate-400" /> {clientPhone}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setIsEditingPersonalData(true)}
                                    className="text-[10px] font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl transition-all active:scale-95 cursor-pointer"
                                >
                                    Editar datos
                                </button>
                            </div>
                        ) : (
                            <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-4">
                                <div className="flex justify-between items-center border-b border-slate-50 pb-2">
                                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Datos de Contacto</h3>
                                    {clientPhone && clientName && (
                                        <button
                                            type="button"
                                            onClick={() => setIsEditingPersonalData(false)}
                                            className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700"
                                        >
                                            Ocultar ↑
                                        </button>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Nombre Completo</label>
                                    <input 
                                        type="text"
                                        required
                                        placeholder="Ej: Juan Pérez"
                                        value={clientName}
                                        onChange={e => setClientName(e.target.value)}
                                        className="w-full bg-slate-50 rounded-xl px-4 py-3 border border-slate-100 text-xs font-semibold placeholder:text-slate-400 focus:outline-none focus:border-slate-300 text-slate-900"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Teléfono Celular</label>
                                    <div className="flex gap-2">
                                        <select
                                            value={countryCode}
                                            onChange={(e) => setCountryCode(e.target.value)}
                                            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-xs font-black text-slate-800 focus:outline-none focus:border-slate-400 shrink-0 cursor-pointer shadow-2xs"
                                        >
                                            <option value="+593">🇪🇨 +593</option>
                                            <option value="+57">🇨🇴 +57</option>
                                            <option value="+51">🇵🇪 +51</option>
                                            <option value="+52">🇲🇽 +52</option>
                                            <option value="+1">🇺🇸 +1</option>
                                            <option value="+34">🇪🇸 +34</option>
                                        </select>
                                        <input 
                                            type="tel"
                                            required
                                            placeholder="Ej: 0998877665"
                                            value={clientPhone}
                                            onChange={e => setClientPhone(e.target.value)}
                                            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-semibold placeholder:text-slate-400 text-slate-900 focus:outline-none focus:border-slate-400 shadow-2xs"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Dirección y Ubicación GPS Mejorado (Solo para Domicilio) */}
                        {deliveryType === 'DOMICILIO' && (
                            <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-4">
                                <div className="flex items-center gap-2 border-b border-slate-50 pb-2">
                                    <MapPin className="size-4 text-emerald-600 shrink-0" />
                                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Dirección de Entrega</h3>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Calle / Av. Principal y Secundaria</label>
                                    <input 
                                        type="text"
                                        required={deliveryType === 'DOMICILIO'}
                                        placeholder="Ej: Av. de los Shyris N34-120 y Portugal"
                                        value={clientAddress}
                                        onChange={e => setClientAddress(e.target.value)}
                                        className="w-full bg-slate-50 rounded-xl px-4 py-3 border border-slate-100 text-xs font-semibold placeholder:text-slate-400 focus:outline-none focus:border-slate-300 text-slate-900"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Referencia (Casa / Depto / Color / Conjunto)</label>
                                    <input 
                                        type="text"
                                        placeholder="Ej: Casa blanca de 2 pisos, portón negro frente a la farmacia"
                                        value={clientReference}
                                        onChange={e => setClientReference(e.target.value)}
                                        className="w-full bg-slate-50 rounded-xl px-4 py-3 border border-slate-100 text-xs font-semibold placeholder:text-slate-400 focus:outline-none focus:border-slate-300 text-slate-900"
                                    />
                                </div>

                                {/* Tarjeta de Fijación de Ubicación GPS */}
                                <div className="pt-1">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Punto Exacto en el Mapa (GPS)</label>
                                    <button
                                        type="button"
                                        onClick={() => setShowMapModal(true)}
                                        className={`w-full p-3.5 rounded-2xl border text-xs font-bold flex items-center justify-between transition-all active:scale-[0.99] cursor-pointer shadow-2xs ${
                                            selectedLat && selectedLng 
                                                ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900' 
                                                : 'bg-slate-50 hover:bg-slate-100/80 border-slate-200 text-slate-700'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`size-8 rounded-xl flex items-center justify-center shrink-0 font-bold ${
                                                selectedLat && selectedLng ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-200 text-slate-600'
                                            }`}>
                                                <MapPin className="size-4" />
                                            </div>
                                            <div className="text-left">
                                                <span className="block font-black text-xs">
                                                    {selectedLat && selectedLng ? '📍 Ubicación GPS Fijada' : '🗺️ Seleccionar Punto en el Mapa'}
                                                </span>
                                                <span className="block text-[10px] font-medium text-slate-500">
                                                    {selectedLat && selectedLng 
                                                        ? `${selectedLat.toFixed(4)}, ${selectedLng.toFixed(4)}` 
                                                        : 'Toca para abrir el mapa interactivo'}
                                                </span>
                                            </div>
                                        </div>
                                        <span className={`text-[10px] uppercase font-black tracking-wider px-2.5 py-1 rounded-lg ${
                                            selectedLat && selectedLng ? 'bg-emerald-200/60 text-emerald-800' : 'bg-white border border-slate-200 text-slate-600'
                                        }`}>
                                            {selectedLat && selectedLng ? 'Mover →' : 'Abrir →'}
                                        </span>
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* ⚡ Badge de Pedido Inmediato (reemplaza selector de fecha/hora) */}
                        <div className="rounded-2xl p-4 flex items-center gap-3 border" style={{ backgroundColor: `${primaryColor}10`, borderColor: `${primaryColor}30` }}>
                            <div className="size-10 rounded-xl flex items-center justify-center shrink-0 text-xl" style={{ backgroundColor: `${primaryColor}20` }}>⚡</div>
                            <div>
                                <p className="text-xs font-black uppercase tracking-wider" style={{ color: primaryColor }}>Pedido Inmediato</p>
                                <p className="text-[11px] text-slate-600 font-medium mt-0.5">
                                    Tu pedido se prepara de inmediato{config.tiempoMaximoEntrega ? ` · Entrega en ${config.tiempoMaximoEntrega}` : ' mientras el local esté abierto'}.
                                </p>
                            </div>
                        </div>

                        {/* Resumen del Pedido */}
                        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-4">
                            <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                                <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Resumen del Pedido</h3>
                                <button
                                    type="button"
                                    onClick={() => setStep('catalog')}
                                    className="text-[10px] font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg flex items-center gap-1 active:scale-95 transition-all cursor-pointer"
                                >
                                    <Plus className="size-3 text-slate-500 stroke-[2.5]" />
                                    <span>Añadir más</span>
                                </button>
                            </div>
                            <div className="divide-y divide-slate-100">
                                {cart.map(item => (
                                    <div key={item.product.id} className="py-2.5 flex justify-between items-center text-xs font-semibold">
                                        <div className="text-slate-600">
                                            <span className="font-black" style={{ color: primaryColor }}>{item.quantity}x</span> {item.product.nombre}
                                        </div>
                                        <span className="font-black text-slate-800">${(item.product.precio * item.quantity).toFixed(2)}</span>
                                    </div>
                                ))}
                            </div>
                            
                            <div className="border-t border-slate-100 pt-4 space-y-2">
                                <div className="flex justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
                                    <span>Subtotal</span>
                                    <span>${cartSubtotal.toFixed(2)}</span>
                                </div>
                                {deliveryType === 'DOMICILIO' && (
                                    <div className="flex justify-between text-xs font-bold text-slate-400 uppercase tracking-wider items-center">
                                        <div className="flex flex-col text-left">
                                            <span>Costo Envío</span>
                                        </div>
                                        <span>${shippingCost.toFixed(2)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-sm font-black text-slate-800 uppercase tracking-widest pt-2 border-t border-slate-50">
                                    <span>Total</span>
                                    <span>${cartTotal.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Alerta de Monto Mínimo */}
                        {isBelowMinOrder && (
                            <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl p-4 flex items-start gap-3 text-left">
                                <AlertCircle className="size-5 text-amber-600 shrink-0 mt-0.5" />
                                <div className="text-xs">
                                    <p className="font-black uppercase tracking-wider text-amber-950">Monto Mínimo de Compra</p>
                                    <p className="mt-1 font-medium leading-relaxed">
                                        El pedido mínimo en productos es de <strong className="font-black">${minOrderAmount.toFixed(2)}</strong> (sin incluir envío). Te faltan <strong className="font-black">${missingAmountForMin.toFixed(2)}</strong> en productos para poder confirmar tu pedido.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Botón Añadir Productos (Sobre Confirmar Pedido) */}
                        <button
                            type="button"
                            onClick={() => setStep('catalog')}
                            className="w-full py-3.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-black rounded-2xl uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer border border-slate-200/80 shadow-2xs"
                        >
                            <Plus className="size-4 text-slate-700 stroke-[2.5]" />
                            <span>Añadir más productos al carrito</span>
                        </button>

                        {/* Botón de Confirmación */}
                        <button
                            type="submit"
                            disabled={submitting || isBelowMinOrder}
                            className={`w-full py-4 text-center text-xs font-black uppercase tracking-widest rounded-2xl text-white shadow-xl transition-all flex items-center justify-center gap-2 ${
                                isBelowMinOrder ? 'opacity-60 cursor-not-allowed' : 'active:scale-[0.98]'
                            }`}
                            style={{ backgroundColor: primaryColor }}
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="size-4 animate-spin" />
                                    Procesando pedido...
                                </>
                            ) : isBelowMinOrder ? (
                                <>
                                    Mínimo ${minOrderAmount.toFixed(2)} (Faltan ${missingAmountForMin.toFixed(2)})
                                </>
                            ) : (
                                <>
                                    ⚡ Confirmar Pedido (${cartTotal.toFixed(2)})
                                </>
                            )}
                        </button>
                    </form>
                </main>
            )}

            {/* ── CART DRAWER LATERAL PREMIUM ── */}
            {showCartDrawer && (
                <div className="fixed inset-0 z-[200] flex">
                    {/* Overlay */}
                    <div className="flex-1 bg-slate-950/70 backdrop-blur-sm" onClick={() => setShowCartDrawer(false)} />
                    
                    {/* Panel del carrito */}
                    <div className="w-full max-w-sm bg-white flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
                        {/* Header del drawer */}
                        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100" style={{ backgroundColor: '#120800' }}>
                            <div className="flex items-center gap-3">
                                <ShoppingBag className="size-5 text-white" />
                                <div>
                                    <p className="text-[9px] font-bold text-white/50 uppercase tracking-wider leading-none">Tu pedido</p>
                                    <p className="text-sm font-black text-white">{totalItems} {totalItems === 1 ? 'producto' : 'productos'}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowCartDrawer(false)}
                                className="size-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all active:scale-95 cursor-pointer"
                            >
                                <X className="size-4" />
                            </button>
                        </div>

                        {/* Lista de ítems */}
                        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                            {cart.map(item => (
                                <div key={item.product.id} className="flex items-center gap-3 bg-slate-50 rounded-2xl p-3">
                                    {/* Miniatura producto */}
                                    <div className="size-14 rounded-xl bg-slate-200 overflow-hidden shrink-0">
                                        {item.product.imagenUrl ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={item.product.imagenUrl} alt={item.product.nombre} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center font-black text-lg italic" style={{ color: primaryColor }}>
                                                {item.product.nombre.substring(0, 1)}
                                            </div>
                                        )}
                                    </div>
                                    
                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-black text-slate-900 truncate">{item.product.nombre}</p>
                                        <p className="text-[10px] text-slate-500 font-medium">${item.product.precio.toFixed(2)} c/u</p>
                                    </div>
                                    
                                    {/* Controles */}
                                    <div className="flex items-center gap-2 shrink-0">
                                        <button
                                            type="button"
                                            onClick={() => updateQuantity(item.product.id, -1)}
                                            className="size-7 bg-white border border-slate-200 rounded-lg flex items-center justify-center active:scale-90 transition-transform cursor-pointer"
                                        >
                                            <Minus className="size-3.5 stroke-[2.5]" />
                                        </button>
                                        <span className="text-xs font-black text-slate-900 min-w-[20px] text-center">{item.quantity}</span>
                                        <button
                                            type="button"
                                            onClick={() => updateQuantity(item.product.id, 1)}
                                            className="size-7 bg-white border border-slate-200 rounded-lg flex items-center justify-center active:scale-90 transition-transform cursor-pointer"
                                        >
                                            <Plus className="size-3.5 stroke-[2.5]" />
                                        </button>
                                    </div>

                                    {/* Subtotal por ítem */}
                                    <p className="text-xs font-black text-slate-900 shrink-0 min-w-[48px] text-right">${(item.product.precio * item.quantity).toFixed(2)}</p>
                                </div>
                            ))}
                        </div>

                        {/* Resumen de totales (Sin calcular envío aún hasta elegir ubicación en checkout) */}
                        <div className="px-4 py-4 border-t border-slate-100 space-y-2">
                            <div className="flex justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
                                <span>Subtotal</span>
                                <span>${cartSubtotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-base font-black text-slate-900 pt-2 border-t border-slate-100">
                                <span>TOTAL</span>
                                <span>${cartSubtotal.toFixed(2)}</span>
                            </div>
                        </div>

                        {/* CTA */}
                        <div className="px-4 pb-6 space-y-2">
                            {isStoreClosed ? (
                                <button
                                    disabled
                                    className="w-full py-4 rounded-2xl bg-slate-200 text-slate-500 font-black text-xs uppercase tracking-wider cursor-not-allowed flex items-center justify-center gap-2 border border-slate-300"
                                >
                                    <Lock className="size-4 text-red-500" />
                                    <span>Local Cerrado - Pedidos Desactivados</span>
                                </button>
                            ) : (
                                <button
                                    onClick={() => { setShowCartDrawer(false); setStep('checkout'); }}
                                    className="w-full py-4 rounded-2xl text-white font-black text-sm uppercase tracking-widest shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
                                    style={{ backgroundColor: primaryColor }}
                                >
                                    ⚡ Confirmar Pedido (${cartSubtotal.toFixed(2)})
                                </button>
                            )}
                            <button
                                onClick={() => setShowCartDrawer(false)}
                                className="w-full py-3 rounded-2xl text-slate-600 font-black text-xs uppercase tracking-wider bg-slate-100 hover:bg-slate-200 active:scale-[0.98] transition-all cursor-pointer"
                            >
                                + Seguir comprando
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal para selección de ubicación GPS en Mapa */}
            <MapSelectionModal
                isOpen={showMapModal}
                onClose={() => setShowMapModal(false)}
                initialLat={selectedLat}
                initialLng={selectedLng}
                businessLat={config.latitudNegocio !== undefined ? parseFloat(config.latitudNegocio) : -0.180653}
                businessLng={config.longitudNegocio !== undefined ? parseFloat(config.longitudNegocio) : -78.467838}
                onConfirmLocation={(latVal, lngVal) => {
                    setSelectedLat(latVal);
                    setSelectedLng(lngVal);
                    try {
                        localStorage.setItem('pinchos_client_lat', latVal.toString());
                        localStorage.setItem('pinchos_client_lng', lngVal.toString());
                    } catch (e) {}
                }}
            />

            {/* Modal de Zoom de Producto Ampliado */}
            {zoomProduct && (
                <div 
                    className="fixed inset-0 z-[300] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
                    onClick={() => setZoomProduct(null)}
                >
                    <div 
                        className="bg-white rounded-3xl overflow-hidden max-w-lg w-full shadow-2xl relative border border-white/20 text-left flex flex-col max-h-[90vh]"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Botón Cerrar */}
                        <button 
                            type="button"
                            onClick={() => setZoomProduct(null)}
                            className="absolute top-4 right-4 z-20 size-10 rounded-full bg-slate-950/70 hover:bg-slate-950 text-white flex items-center justify-center backdrop-blur-md transition-all active:scale-95 cursor-pointer border border-white/20 shadow-lg"
                            title="Cerrar"
                        >
                            <X className="size-5" />
                        </button>

                        {/* Imagen Ampliada */}
                        <div className="relative w-full h-72 sm:h-96 bg-slate-950 flex items-center justify-center overflow-hidden shrink-0">
                            {zoomProduct.imagenUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img 
                                    src={zoomProduct.imagenUrl} 
                                    alt={zoomProduct.nombre} 
                                    className="w-full h-full object-contain p-2"
                                />
                            ) : (
                                <div className="text-white/40 font-black text-6xl italic uppercase">
                                    {zoomProduct.nombre.substring(0, 2)}
                                </div>
                            )}
                        </div>

                        {/* Detalles del Producto y Controles */}
                        <div className="p-6 space-y-4 overflow-y-auto">
                            <div className="flex justify-between items-start gap-4 border-b border-slate-100 pb-4">
                                <div>
                                    <h2 className="text-xl font-black text-slate-900 tracking-tight">{zoomProduct.nombre}</h2>
                                    {zoomProduct.descripcion && (
                                        <p className="text-xs text-slate-500 font-medium leading-relaxed mt-1">
                                            {zoomProduct.descripcion}
                                        </p>
                                    )}
                                </div>
                                <span className="text-2xl font-black text-slate-900 shrink-0">
                                    ${zoomProduct.precio.toFixed(2)}
                                </span>
                            </div>

                            {/* Controles de Carrito en Modal */}
                            <div className="pt-1 flex items-center justify-between gap-4">
                                <span className="text-xs font-black uppercase tracking-wider text-slate-400">Cantidad</span>
                                {(() => {
                                    const itemInCart = cart.find(item => item.product.id === zoomProduct.id);
                                    if (isStoreClosed) {
                                        return (
                                            <button 
                                                type="button"
                                                disabled
                                                className="h-12 px-6 rounded-2xl text-xs font-black uppercase tracking-wider text-red-500 bg-red-50 border border-red-200 opacity-80 cursor-not-allowed flex items-center gap-2"
                                            >
                                                <Lock className="size-4" />
                                                <span>Local Cerrado</span>
                                            </button>
                                        );
                                    }
                                    return itemInCart ? (
                                        <div className="flex items-center bg-slate-100/90 rounded-2xl p-1.5 gap-4 border border-slate-200 shadow-2xs">
                                            <button 
                                                type="button"
                                                onClick={() => updateQuantity(zoomProduct.id, -1)}
                                                className="size-9 bg-white hover:bg-slate-200 text-slate-800 rounded-xl flex items-center justify-center shadow-xs active:scale-90 transition-transform cursor-pointer"
                                                title="Disminuir cantidad"
                                            >
                                                <Minus className="size-4 stroke-[2.5]" />
                                            </button>
                                            <span className="text-base font-black text-slate-900 min-w-[24px] text-center">{itemInCart.quantity}</span>
                                            <button 
                                                type="button"
                                                onClick={() => updateQuantity(zoomProduct.id, 1)}
                                                className="size-9 bg-white hover:bg-slate-200 text-slate-800 rounded-xl flex items-center justify-center shadow-xs active:scale-90 transition-transform cursor-pointer"
                                                title="Aumentar cantidad"
                                            >
                                                <Plus className="size-4 stroke-[2.5]" />
                                            </button>
                                        </div>
                                    ) : (
                                        <button 
                                            type="button"
                                            onClick={() => addToCart(zoomProduct)}
                                            className="h-12 px-6 rounded-2xl text-xs font-black uppercase tracking-wider text-white shadow-xl hover:shadow-2xl active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
                                            style={{ backgroundColor: primaryColor }}
                                        >
                                            <Plus className="size-4 stroke-[2.5]" />
                                            <span>Agregar al Carrito</span>
                                        </button>
                                    );
                                })()}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast Notificación de Compartir / Enlace Copiado */}
            {showShareToast && (
                <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[350] bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-white/20 flex items-center gap-2.5 text-xs font-black animate-fade-in">
                    <Check className="size-4 text-emerald-400 shrink-0" />
                    <span>¡Enlace de la tienda copiado al portapapeles! 📋</span>
                </div>
            )}
        </div>
    );
}

