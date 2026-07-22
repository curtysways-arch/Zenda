'use client';

import { useState, useEffect, useRef } from 'react';
import { 
    ShoppingBag, Plus, Minus, Trash2, MapPin, Calendar, Clock, 
    ChevronRight, Check, Loader2, Search, ArrowLeft, Phone, Info, AlertCircle
} from 'lucide-react';
import Image from 'next/image';
import SimpleLeafletMap from './SimpleLeafletMap';

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
    };
}

export default function ProductsStoreClient({ negocio }: Props) {
    const primaryColor = negocio.colorPrimario || '#1dc95c';
    const secondaryColor = negocio.colorSecundario || '#112117';
    const config: any = negocio.configuracion || {};

    // Obtener la imagen de portada real subida por el negocio
    const bannerFromImagenes = (negocio as any).imagenes?.find((i: any) => i.tipo === 'BANNER' || i.esBanner)?.url;
    const bannerFromConfig = config.bannerUrl || config.banner_url || (negocio as any).bannerUrl;
    const bannerImage = bannerFromImagenes || bannerFromConfig || 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?q=80&w=687';

    const hasCustomBanner = !!(bannerFromImagenes || bannerFromConfig);
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
    
    // GPS / Maps States
    const [lat, setLat] = useState<number | null>(null);
    const [lng, setLng] = useState<number | null>(null);
    const [mapError, setMapError] = useState<string | null>(null);
    const mapRef = useRef<HTMLDivElement>(null);
    const googleMapRef = useRef<any>(null);
    const markerRef = useRef<any>(null);

    // Order Success Info
    const [submitting, setSubmitting] = useState(false);

    // Load Catalogue
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
        fetchCatalogue();
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

    // Save Cart to localStorage
    const saveCart = (newCart: CartItem[]) => {
        setCart(newCart);
        localStorage.setItem(`cart_${negocio.id}`, JSON.stringify(newCart));
    };

    // Leaflet Script & CSS Loader (OpenStreetMap - 100% Gratis sin API Key)
    const mapInitialized = useRef(false);
    const leafletMapRef = useRef<any>(null);
    const leafletMarkerRef = useRef<any>(null);

    useEffect(() => {
        if (step === 'checkout' && deliveryType === 'DOMICILIO' && !mapInitialized.current) {
            
            const loadLeaflet = () => {
                if ((window as any).L) {
                    initMap();
                    return;
                }

                // Cargar CSS
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
                document.head.appendChild(link);

                // Cargar JS
                const script = document.createElement('script');
                script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
                script.async = true;
                script.onload = () => {
                    initMap();
                };
                script.onerror = () => {
                    setMapError("No se pudo cargar el servicio de mapas. Introduce tu dirección manualmente.");
                };
                document.head.appendChild(script);
            };

            const initMap = () => {
                if (!mapRef.current) {
                    setTimeout(initMap, 100);
                    return;
                }
                if (mapInitialized.current) return;
                mapInitialized.current = true;
                
                const L = (window as any).L;
                if (!L) return;

                // Coordenadas del negocio o por defecto (Quito)
                const latNegocio = config.latitudNegocio !== undefined ? parseFloat(config.latitudNegocio) : -0.180653;
                const lngNegocio = config.longitudNegocio !== undefined ? parseFloat(config.longitudNegocio) : -78.467838;

                const defaultLat = latNegocio;
                const defaultLng = lngNegocio;

                // Crear el mapa de Leaflet
                const map = L.map(mapRef.current, {
                    zoomControl: true,
                    attributionControl: false,
                    tap: false
                }).setView([defaultLat, defaultLng], 15);

                leafletMapRef.current = map;

                setTimeout(() => {
                    if (leafletMapRef.current) {
                        leafletMapRef.current.invalidateSize();
                    }
                }, 300);

                // Cargar tiles de OpenStreetMap
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    maxZoom: 19
                }).addTo(map);

                // Icono personalizado oficial para evitar problemas de CORS en marcadores
                const defaultIcon = L.icon({
                    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
                    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
                    iconSize: [25, 41],
                    iconAnchor: [12, 41],
                    popupAnchor: [1, -34],
                    shadowSize: [41, 41]
                });

                // Crear marcador
                const marker = L.marker([defaultLat, defaultLng], {
                    draggable: true,
                    icon: defaultIcon
                }).addTo(map);

                leafletMarkerRef.current = marker;
                setLat(defaultLat);
                setLng(defaultLng);

                // Geolocalizar cliente
                if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(
                        (position) => {
                            const userLat = position.coords.latitude;
                            const userLng = position.coords.longitude;
                            map.setView([userLat, userLng], 16);
                            marker.setLatLng([userLat, userLng]);
                            setLat(userLat);
                            setLng(userLng);
                        },
                        () => {
                            console.log("Geolocalización denegada.");
                        }
                    );
                }

                // Eventos del marcador
                marker.on('dragend', () => {
                    const position = marker.getLatLng();
                    setLat(position.lat);
                    setLng(position.lng);
                });

                // Evento al hacer click en el mapa
                map.on('click', (e: any) => {
                    const position = e.latlng;
                    marker.setLatLng(position);
                    setLat(position.lat);
                    setLng(position.lng);
                });
            };

            loadLeaflet();
        }

        // Limpieza de instancia al desmontar
        return () => {
            if (step !== 'checkout' || deliveryType !== 'DOMICILIO') {
                if (leafletMapRef.current) {
                    leafletMapRef.current.remove();
                    leafletMapRef.current = null;
                }
                mapInitialized.current = false;
            }
        };
    }, [step, deliveryType]);

    // Cart Operations
    const addToCart = (product: Product) => {
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
        if (lat && lng) {
            const latNegocio = config.latitudNegocio !== undefined ? parseFloat(config.latitudNegocio) : -0.180653;
            const lngNegocio = config.longitudNegocio !== undefined ? parseFloat(config.longitudNegocio) : -78.467838;
            const distance = getDistanceFromLatLonInKm(latNegocio, lngNegocio, lat, lng);
            const kmCost = distance * (config.costoEnvioPorKm !== undefined ? parseFloat(config.costoEnvioPorKm) : 0.25);
            return parseFloat((baseCost + kmCost).toFixed(2));
        }
        return baseCost;
    };

    const getShippingText = () => {
        if (deliveryType !== 'DOMICILIO') return '';
        if (lat && lng) {
            const latNegocio = config.latitudNegocio !== undefined ? parseFloat(config.latitudNegocio) : -0.180653;
            const lngNegocio = config.longitudNegocio !== undefined ? parseFloat(config.longitudNegocio) : -78.467838;
            const distance = getDistanceFromLatLonInKm(latNegocio, lngNegocio, lat, lng);
            return `${distance.toFixed(1)} km`;
        }
        return 'Base';
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
        if (slotsDisponibles.length > 0) {
            setTimeSlot(slotsDisponibles[0]);
        } else {
            setTimeSlot('');
        }
    }, [deliveryDate, slotsDisponibles.length]);

    // Cargar teléfono y nombre guardados de la sesión previa / OTP
    useEffect(() => {
        const savedPhone = localStorage.getItem('pinchos_client_phone');
        const savedName = localStorage.getItem('pinchos_client_name');
        if (savedPhone) setClientPhone(savedPhone);
        if (savedName) setClientName(savedName);
    }, []);

    // Función auxiliar para crear pedido directamente sin repetir OTP si el cliente ya está autenticado
    const createOrderDirectly = async (phone: string, name: string) => {
        const response = await fetch(`/api/public/${negocio.slug}/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                deliveryType,
                clientName: name,
                clientPhone: phone,
                clientAddress: deliveryType === 'DOMICILIO' ? clientAddress : null,
                clientReference: deliveryType === 'DOMICILIO' ? clientReference : null,
                lat: deliveryType === 'DOMICILIO' ? lat : null,
                lng: deliveryType === 'DOMICILIO' ? lng : null,
                deliveryDate: deliveryDate,
                timeSlot,
                items: cart.map(item => ({
                    productId: item.product.id,
                    cantidad: item.quantity
                }))
            })
        });

        if (response.ok) {
            const data = await response.json();
            setCreatedOrder(data.pedido);
            setCreatedPayment(data.payment);

            // Cargar datos bancarios del negocio usando endpoint público
            try {
                const bankRes = await fetch(`/api/public/${negocio.slug}/bank-details`);
                const bankData = await bankRes.json();
                if (bankData.success && bankData.method) {
                    setBankConfig(bankData.method);
                }
            } catch (e) {
                console.error("Error al cargar datos bancarios:", e);
            }
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
        if (!clientName || !clientPhone) {
            alert("Por favor ingresa tu nombre y teléfono.");
            return;
        }
        if (deliveryType === 'DOMICILIO' && !clientAddress) {
            alert("Por favor ingresa tu dirección.");
            return;
        }

        // SI EL CLIENTE YA VERIFICÓ OTP PREVIAMENTE CON ESTE TELÉFONO EN ESTE NAVEGADOR
        const savedPhone = localStorage.getItem('pinchos_client_phone');
        if (savedPhone && savedPhone.trim() === clientPhone.trim()) {
            try {
                setSubmitting(true);
                await createOrderDirectly(clientPhone, clientName);
            } catch (err) {
                alert("Error de conexión al procesar el pedido.");
            } finally {
                setSubmitting(false);
            }
            return;
        }

        // SI NO ESTÁ AUTENTICADO, SOLICITAR OTP
        try {
            setSubmitting(true);
            setOtpMessage(null);
            const res = await fetch('/api/public/auth/otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'send_otp', phone: clientPhone, nombre: clientName, slug: negocio.slug })
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

            // Guardar sesión del cliente autenticado
            localStorage.setItem('pinchos_client_phone', clientPhone);
            localStorage.setItem('pinchos_client_name', clientName);

            // Crear el pedido
            await createOrderDirectly(clientPhone, clientName);
        } catch (err) {
            setOtpMessage("Error al procesar el pedido.");
        } finally {
            setOtpLoading(false);
        }
    };

    // Paso 3: Subir Comprobante de Pago
    const handleUploadEvidenceSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!evidenceFile || !createdOrder) {
            setUploadError("Por favor selecciona una imagen o documento PDF de tu comprobante.");
            return;
        }

        try {
            setUploadingEvidence(true);
            setUploadError(null);

            const formData = new FormData();
            formData.append('file', evidenceFile);

            const res = await fetch(`/api/public/${negocio.slug}/orders/${createdOrder.id}/payment-evidence`, {
                method: 'POST',
                body: formData
            });

            const data = await res.json();
            if (data.success) {
                clearCart();
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
    if (step === 'payment' && createdOrder) {
        return (
            <div className="min-h-screen bg-slate-50 text-slate-900 px-4 py-8 flex flex-col justify-center items-center">
                <div className="w-full max-w-lg bg-white border border-slate-200/80 rounded-3xl p-8 shadow-2xl space-y-6">
                    <div className="text-center space-y-2 pb-4 border-b border-slate-100">
                        <span className="px-3 py-1 bg-orange-100 text-orange-800 border border-orange-200 rounded-full text-[10px] font-black uppercase tracking-wider">
                            Paso Final: Transferencia Bancaria
                        </span>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Completa tu Pago</h2>
                        <p className="text-xs text-slate-500 font-medium">Transfiere el monto exacto y adjunta tu comprobante para enviar a producción.</p>
                    </div>

                    {/* Resumen del Monto y Código */}
                    <div className="bg-orange-50 border border-orange-200/70 rounded-2xl p-4 flex justify-between items-center">
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-orange-900/60 block">Código de Pago</span>
                            <span className="text-sm font-mono font-black text-orange-600">{createdPayment?.codigoPago || `PAY-${createdOrder.id.slice(0, 6)}`}</span>
                        </div>
                        <div className="text-right">
                            <span className="text-[10px] font-black uppercase tracking-wider text-orange-900/60 block">Monto a Transferir</span>
                            <span className="text-2xl font-black text-slate-900">${createdOrder.total.toFixed(2)}</span>
                        </div>
                    </div>

                    {/* Datos de la Cuenta Bancaria */}
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3 text-xs">
                        <h3 className="font-black text-slate-900 uppercase tracking-wider text-[11px] pb-2.5 border-b border-slate-200 flex items-center justify-between">
                            <span>🏛️ Datos para la Transferencia</span>
                            <span className="text-orange-600 font-mono font-black">{bankConfig?.banco || 'Banco Pichincha'}</span>
                        </h3>

                        <div className="grid grid-cols-2 gap-3 text-slate-700">
                            <div>
                                <span className="text-slate-400 text-[10px] block font-bold uppercase tracking-wider">TITULAR</span>
                                <span className="font-bold text-slate-900">{bankConfig?.titular || negocio.nombre}</span>
                            </div>
                            <div>
                                <span className="text-slate-400 text-[10px] block font-bold uppercase tracking-wider">TIPO DE CUENTA</span>
                                <span className="font-bold text-slate-900">{bankConfig?.tipoCuenta || 'Ahorros'}</span>
                            </div>
                            <div>
                                <span className="text-slate-400 text-[10px] block font-bold uppercase tracking-wider">NÚMERO DE CUENTA</span>
                                <span className="font-mono font-black text-slate-900 text-sm select-all">{bankConfig?.numeroCuenta || '2100987654'}</span>
                            </div>
                            <div>
                                <span className="text-slate-400 text-[10px] block font-bold uppercase tracking-wider">IDENTIFICACIÓN / RUC</span>
                                <span className="font-mono font-bold text-slate-900">{bankConfig?.identificacion || '1792345678001'}</span>
                            </div>
                        </div>

                        {/* Código QR si existe */}
                        {bankConfig?.qrImageUrl && (
                            <div className="pt-3 text-center border-t border-slate-200">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Escanea el código QR de Pago</span>
                                <img src={bankConfig.qrImageUrl} alt="QR de Pago" className="w-36 h-36 mx-auto rounded-xl border border-slate-200 shadow-md object-contain bg-white p-2" />
                            </div>
                        )}
                    </div>

                    {/* Formulario de Carga de Comprobante */}
                    <form onSubmit={handleUploadEvidenceSubmit} className="space-y-4 pt-2">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                                Subir Comprobante (PNG, JPG, WEBP o PDF) *
                            </label>
                            <input
                                type="file"
                                required
                                accept="image/png, image/jpeg, image/webp, application/pdf"
                                onChange={e => {
                                    if (e.target.files?.[0]) setEvidenceFile(e.target.files[0]);
                                }}
                                className="w-full text-xs text-slate-600 file:mr-4 file:py-3 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-orange-600 file:text-white hover:file:bg-orange-700 bg-slate-50 rounded-2xl border border-slate-200 p-2 cursor-pointer"
                            />
                        </div>

                        {uploadError && (
                            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-bold">
                                {uploadError}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={uploadingEvidence || !evidenceFile}
                            className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl text-xs uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 disabled:opacity-40 transition-all active:scale-95"
                        >
                            {uploadingEvidence ? <Loader2 className="size-5 animate-spin" /> : 'Enviar Comprobante y Finalizar'}
                        </button>
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
                            <span className="text-base font-black text-orange-600">${createdOrder.total.toFixed(2)}</span>
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
        <div className="min-h-screen bg-slate-50 flex flex-col pb-24 md:pb-12 text-slate-800" style={{ '--primary-color': primaryColor } as any}>
            {/* Header */}
            <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 py-4 flex items-center justify-between shadow-sm">
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
                    <div className="relative">
                        <button 
                            onClick={() => {
                                if (cart.length > 0) setStep('checkout');
                            }}
                            disabled={cart.length === 0}
                            className="relative p-2 text-slate-600 disabled:text-slate-300 disabled:bg-transparent active:scale-95 transition-transform"
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
            </header>

            {step === 'catalog' ? (
                <>
                    {/* Hero / Banner */}
                    {hasCustomBanner ? (
                        <div className="relative w-full bg-slate-950 flex flex-col items-center justify-center overflow-hidden">
                            <div className="relative w-full">
                                <img 
                                    src={bannerImage} 
                                    alt={negocio.nombre} 
                                    className="w-full h-auto object-contain max-h-[500px] mx-auto block shadow-md"
                                />
                                {hasCustomTitle && (
                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex items-end justify-center text-center p-6">
                                        <div className="max-w-md">
                                            <h2 className="text-2xl md:text-4xl font-black text-white italic tracking-tighter uppercase mb-1 drop-shadow-lg">
                                                {heroTitle}
                                            </h2>
                                            <p className="text-xs md:text-sm text-white/90 font-bold uppercase tracking-widest drop-shadow">
                                                {heroSub}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="relative h-60 md:h-80 bg-slate-900 overflow-hidden flex items-center justify-center text-center px-6">
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/70 via-slate-900/30 to-transparent z-10" />
                            <div 
                                className="absolute inset-0 opacity-80 bg-cover bg-center transition-all duration-500"
                                style={{ backgroundImage: `url('${bannerImage}')` }}
                            />
                            
                            <div className="relative z-20 max-w-md">
                                <h2 className="text-3xl md:text-4xl font-black text-white italic tracking-tighter uppercase mb-2 drop-shadow-lg">
                                    {heroTitle}
                                </h2>
                                <p className="text-xs md:text-sm text-white/90 font-bold uppercase tracking-widest mb-5 drop-shadow">
                                    {heroSub}
                                </p>
                                <button 
                                    onClick={() => {
                                        const el = document.getElementById('catalogo');
                                        el?.scrollIntoView({ behavior: 'smooth' });
                                    }}
                                    className="px-6 py-3 bg-white text-slate-900 text-[11px] font-black uppercase tracking-widest rounded-full hover:scale-105 active:scale-95 transition-all shadow-xl"
                                >
                                    Hacer Pedido
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Informative Banner (Tiempo de entrega compacto) */}
                    {config.tiempoMaximoEntrega && (
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

                    {/* Catálogo de Productos */}
                    <main id="catalogo" className="flex-1 px-6 mt-6 pb-24">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-20">
                                <Loader2 className="size-8 text-slate-300 animate-spin mb-3" />
                                <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">Cargando menú...</span>
                            </div>
                        ) : filteredProducts.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {filteredProducts.map(p => {
                                    const inCart = cart.find(item => item.product.id === p.id);
                                    
                                    return (
                                        <div key={p.id} className="bg-white rounded-3xl p-4 border border-slate-100 shadow-sm hover:shadow-md transition-shadow flex gap-4 relative overflow-hidden group">
                                            {/* Imagen del Producto */}
                                            <div className="relative size-24 rounded-2xl bg-slate-50 overflow-hidden shrink-0">
                                                {p.imagenUrl ? (
                                                    <img src={p.imagenUrl} alt={p.nombre} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="absolute inset-0 flex items-center justify-center bg-emerald-500/5 text-emerald-600 font-black text-xl italic uppercase">
                                                        {p.nombre.substring(0, 1)}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Detalles del Producto */}
                                            <div className="flex-1 flex flex-col justify-between text-left">
                                                <div>
                                                    <h3 className="text-sm font-black text-slate-800 tracking-tight leading-tight group-hover:text-slate-900">{p.nombre}</h3>
                                                    {p.descripcion && (
                                                        <p className="text-[10px] text-slate-400 font-medium leading-relaxed mt-1 line-clamp-2">{p.descripcion}</p>
                                                    )}
                                                </div>
                                                <div className="flex justify-between items-end mt-3">
                                                    <span className="text-sm font-black text-slate-800">${p.precio.toFixed(2)}</span>
                                                    
                                                    {/* Control de Carrito */}
                                                    {inCart ? (
                                                        <div className="flex items-center bg-slate-100 rounded-xl p-1 gap-2">
                                                            <button 
                                                                onClick={() => updateQuantity(p.id, -1)}
                                                                className="size-6 bg-white hover:bg-slate-50 text-slate-600 rounded-lg flex items-center justify-center shadow-sm active:scale-90 transition-transform"
                                                            >
                                                                <Minus className="size-3" />
                                                            </button>
                                                            <span className="text-xs font-black text-slate-800 min-w-[16px] text-center">{inCart.quantity}</span>
                                                            <button 
                                                                onClick={() => updateQuantity(p.id, 1)}
                                                                className="size-6 bg-white hover:bg-slate-50 text-slate-600 rounded-lg flex items-center justify-center shadow-sm active:scale-90 transition-transform"
                                                            >
                                                                <Plus className="size-3" />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button 
                                                            onClick={() => addToCart(p)}
                                                            className="h-8 px-4 rounded-xl text-[10px] font-black uppercase tracking-wider text-white shadow-md active:scale-95 transition-transform flex items-center gap-1"
                                                            style={{ backgroundColor: primaryColor }}
                                                        >
                                                            Agregar
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

                    {/* Footer Carrito Flotante */}
                    {cart.length > 0 && (
                        <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-white via-white to-white/90 border-t border-slate-100/50 backdrop-blur-md z-30 flex justify-center">
                            <button 
                                onClick={() => setStep('checkout')}
                                className="w-full max-w-md py-4 px-6 rounded-2xl text-white shadow-xl flex justify-between items-center active:scale-[0.98] transition-transform font-black text-xs uppercase tracking-widest"
                                style={{ backgroundColor: primaryColor }}
                            >
                                <span className="flex items-center gap-2">
                                    <ShoppingBag className="size-4 shrink-0" />
                                    {totalItems} {totalItems === 1 ? 'Pincho' : 'Pinchos'}
                                </span>
                                <span>Ver Pedido (${cartSubtotal.toFixed(2)})</span>
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

                        {/* Datos del Cliente */}
                        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-4">
                            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest border-b border-slate-50 pb-2">Datos de Contacto</h3>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Nombre Completo</label>
                                <input 
                                    type="text"
                                    required
                                    placeholder="Ej: Juan Pérez"
                                    value={clientName}
                                    onChange={e => setClientName(e.target.value)}
                                    className="w-full bg-slate-50 rounded-xl px-4 py-3 border border-slate-100 text-xs font-semibold placeholder:text-slate-400 focus:outline-none focus:border-slate-300"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Teléfono Celular</label>
                                <div className="relative">
                                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                                    <input 
                                        type="tel"
                                        required
                                        placeholder="Ej: 0998877665"
                                        value={clientPhone}
                                        onChange={e => setClientPhone(e.target.value)}
                                        className="w-full bg-slate-50 rounded-xl pl-11 pr-4 py-3 border border-slate-100 text-xs font-semibold placeholder:text-slate-400 focus:outline-none focus:border-slate-300"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Dirección y Ubicación GPS (Solo para Domicilio) */}
                        {deliveryType === 'DOMICILIO' && (
                            <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-4">
                                <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest border-b border-slate-50 pb-2">Dirección de Entrega</h3>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Dirección Principal</label>
                                    <input 
                                        type="text"
                                        required={deliveryType === 'DOMICILIO'}
                                        placeholder="Ej: Av. de los Shyris y Portugal"
                                        value={clientAddress}
                                        onChange={e => setClientAddress(e.target.value)}
                                        className="w-full bg-slate-50 rounded-xl px-4 py-3 border border-slate-100 text-xs font-semibold placeholder:text-slate-400 focus:outline-none focus:border-slate-300"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Referencia (Casa/Depto/Color)</label>
                                    <input 
                                        type="text"
                                        placeholder="Ej: Casa blanca de 2 pisos junto a la tienda"
                                        value={clientReference}
                                        onChange={e => setClientReference(e.target.value)}
                                        className="w-full bg-slate-50 rounded-xl px-4 py-3 border border-slate-100 text-xs font-semibold placeholder:text-slate-400 focus:outline-none focus:border-slate-300"
                                    />
                                </div>

                                {/* Mapa de OpenStreetMap para coordenadas GPS */}
                                <div className="space-y-2">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">Geolocalización GPS (Mueve el pin)</label>
                                    <SimpleLeafletMap 
                                        initialLat={config.latitudNegocio !== undefined ? parseFloat(config.latitudNegocio) : -0.180653}
                                        initialLng={config.longitudNegocio !== undefined ? parseFloat(config.longitudNegocio) : -78.467838}
                                        onLocationSelect={(selectedLat, selectedLng) => {
                                            setLat(selectedLat);
                                            setLng(selectedLng);
                                        }}
                                    />
                                    {lat && lng && (
                                        <div className="flex justify-between text-[9px] font-bold text-slate-400">
                                            <span>Latitud: {lat.toFixed(6)}</span>
                                            <span>Longitud: {lng.toFixed(6)}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Fecha y Franja Horaria */}
                        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-4">
                            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest border-b border-slate-50 pb-2">Programación de Entrega</h3>
                            
                            {/* Selector Fecha */}
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Fecha de Entrega</label>
                                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none snap-x">
                                    {(() => {
                                        const days = [];
                                        const today = new Date();
                                        const startIdx = isTodayAvailable() ? 0 : 1;
                                        const weekdays = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
                                        const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

                                        for (let i = startIdx; i < startIdx + 7; i++) {
                                            const d = new Date();
                                            d.setDate(today.getDate() + i);
                                            const dateStr = d.toISOString().split('T')[0];
                                            const labelDay = d.getDate();
                                            const labelWeek = weekdays[d.getDay()];
                                            const labelMonth = months[d.getMonth()];
                                            days.push({
                                                dateStr,
                                                label: `${labelWeek} ${labelDay}`,
                                                subLabel: labelMonth,
                                                isToday: i === 0
                                            });
                                        }

                                        return days.map(day => (
                                            <button
                                                key={day.dateStr}
                                                type="button"
                                                onClick={() => setDeliveryDate(day.dateStr)}
                                                className={`px-4 py-2.5 text-center rounded-2xl text-[10px] font-black uppercase tracking-wider border transition-all shrink-0 snap-center flex flex-col items-center justify-center min-w-[70px] ${
                                                    deliveryDate === day.dateStr 
                                                        ? 'bg-orange-600 text-white shadow-md border-transparent font-black' 
                                                        : 'bg-slate-50 text-slate-500 border-transparent hover:bg-slate-100 font-bold'
                                                }`}
                                            >
                                                <span>{day.isToday ? "Hoy" : day.label}</span>
                                                <span className={`text-[8px] font-bold ${
                                                    deliveryDate === day.dateStr ? 'text-orange-100' : 'text-slate-400'
                                                }`}>{day.subLabel}</span>
                                            </button>
                                        ));
                                    })()}
                                </div>
                            </div>

                            {/* Selector Franja Horaria */}
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Franja Horaria</label>
                                {slotsDisponibles.length > 0 ? (
                                    <div className="grid grid-cols-2 gap-2">
                                        {slotsDisponibles.map(slot => (
                                            <button
                                                key={slot}
                                                type="button"
                                                onClick={() => setTimeSlot(slot)}
                                                className={`py-2.5 text-center rounded-xl text-[10px] font-black tracking-wider transition-all border ${
                                                    timeSlot === slot 
                                                        ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500' 
                                                        : 'bg-slate-50 text-slate-500 border-transparent hover:bg-slate-100'
                                                }`}
                                            >
                                                {slot} hrs
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-[10px] font-bold text-rose-500 bg-rose-50 border border-rose-100 rounded-xl p-3">
                                        No hay franjas horarias disponibles para el día de hoy. Por favor, selecciona mañana.
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Resumen del Pedido */}
                        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-4">
                            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest border-b border-slate-50 pb-2">Resumen</h3>
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
                                            {lat && lng && (
                                                <span className="text-[9px] text-slate-400 font-bold tracking-wider lowercase">
                                                    distancia: {getShippingText()}
                                                </span>
                                            )}
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

                        {/* Botón de Confirmación */}
                        <button
                            type="submit"
                            disabled={submitting || slotsDisponibles.length === 0 || isBelowMinOrder}
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
                                    Confirmar Pedido (${cartTotal.toFixed(2)})
                                </>
                            )}
                        </button>
                    </form>
                </main>
            )}

            {/* Barra Flotante Inferior de Ver Carrito en Móvil */}
            {step === 'catalog' && totalItems > 0 && (
                <div className="fixed bottom-[84px] left-0 right-0 z-[120] px-4 md:hidden animate-in fade-in slide-in-from-bottom-5 duration-300 pointer-events-none">
                    <button
                        onClick={() => setStep('checkout')}
                        className="w-full bg-slate-900 text-white py-4 px-6 rounded-2xl flex items-center justify-between shadow-xl active:scale-95 transition-transform pointer-events-auto"
                        style={{ backgroundColor: primaryColor }}
                    >
                        <div className="flex items-center gap-2">
                            <span className="bg-white/20 px-2.5 py-0.5 rounded-lg text-[9px] font-black">{totalItems} uds</span>
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest">Ver mi Carrito</span>
                        <span className="text-xs font-black">${cartSubtotal.toFixed(2)}</span>
                    </button>
                </div>
            )}
        </div>
    );
}

