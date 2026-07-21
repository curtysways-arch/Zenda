'use client';

import { useState, useEffect, useRef } from 'react';
import { 
    ShoppingBag, Plus, Minus, Trash2, MapPin, Calendar, Clock, 
    ChevronRight, Check, Loader2, Search, ArrowLeft, Phone, Info
} from 'lucide-react';
import Image from 'next/image';

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
    const config: BusinessConfig = (negocio.configuracion as BusinessConfig) || {};

    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [cart, setCart] = useState<CartItem[]>([]);
    const [step, setStep] = useState<'catalog' | 'checkout' | 'success'>('catalog');

    // Checkout Form States
    const [deliveryType, setDeliveryType] = useState<'RETIRO' | 'DOMICILIO'>('DOMICILIO');
    const [clientName, setClientName] = useState('');
    const [clientPhone, setClientPhone] = useState('');
    const [clientAddress, setClientAddress] = useState('');
    const [clientReference, setClientReference] = useState('');
    const getInitialDate = () => {
        const config = negocio?.configuracion || {};
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
    const [createdOrder, setCreatedOrder] = useState<any>(null);
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
                if (!mapRef.current) return;
                mapInitialized.current = true;
                
                const L = (window as any).L;

                // Coordenadas del negocio o por defecto (Quito)
                const latNegocio = config.latitudNegocio !== undefined ? parseFloat(config.latitudNegocio) : -0.180653;
                const lngNegocio = config.longitudNegocio !== undefined ? parseFloat(config.longitudNegocio) : -78.467838;

                const defaultLat = latNegocio;
                const defaultLng = lngNegocio;

                // Crear el mapa de Leaflet
                const map = L.map(mapRef.current, {
                    zoomControl: true,
                    attributionControl: false
                }).setView([defaultLat, defaultLng], 15);

                leafletMapRef.current = map;

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

    // Checkout Submit
    const handleConfirmOrder = async (e: React.FormEvent) => {
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
        if (slotsDisponibles.length === 0 && deliveryDate === 'HOY') {
            alert("No hay franjas horarias disponibles para hoy. Selecciona mañana.");
            return;
        }

        try {
            setSubmitting(true);
            const response = await fetch(`/api/public/${negocio.slug}/orders`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    deliveryType,
                    clientName,
                    clientPhone,
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
                clearCart();
                setStep('success');
            } else {
                const errorData = await response.json();
                alert(errorData.error || "Ocurrió un error al procesar el pedido.");
            }
        } catch (err) {
            console.error(err);
            alert("Error de conexión. Inténtalo de nuevo.");
        } finally {
            setSubmitting(false);
        }
    };

    if (step === 'success' && createdOrder) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-6 py-12">
                <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-xl text-center border border-slate-100 animate-fade-in">
                    <div className="size-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Check className="size-10 text-emerald-500 stroke-[3]" />
                    </div>
                    <h1 className="text-2xl font-black text-slate-900 mb-2">¡Pedido Recibido!</h1>
                    <p className="text-sm text-slate-500 mb-6">Tu pedido ha sido registrado con éxito. El administrador ya ha sido notificado.</p>
                    
                    <div className="bg-slate-50 rounded-2xl p-5 mb-8 text-left border border-slate-100">
                        <div className="flex justify-between items-center mb-3">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Pedido N°</span>
                            <span className="text-sm font-black text-slate-800">#{createdOrder.numeroPedido}</span>
                        </div>
                        <div className="flex justify-between items-center mb-3">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Estado</span>
                            <span className="px-3 py-1 bg-emerald-500/10 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-widest">
                                Recibido
                            </span>
                        </div>
                        <div className="flex justify-between items-center mb-3">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Entrega</span>
                            <span className="text-xs font-bold text-slate-800">{createdOrder.tipoEntrega}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total</span>
                            <span className="text-sm font-black text-slate-800">${createdOrder.total.toFixed(2)}</span>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <a 
                            href={`/${negocio.slug}/pedidos/${createdOrder.id}`}
                            className="block w-full py-4 text-center text-xs font-black uppercase tracking-widest rounded-2xl text-white shadow-lg active:scale-95 transition-transform"
                            style={{ backgroundColor: primaryColor }}
                        >
                            Ver Estado de mi Pedido
                        </a>
                        <button 
                            onClick={() => {
                                setStep('catalog');
                                setCreatedOrder(null);
                            }}
                            className="block w-full py-4 text-center text-xs font-black uppercase tracking-widest rounded-2xl text-slate-600 bg-slate-100 hover:bg-slate-200 active:scale-95 transition-transform"
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
                        <Image src={negocio.logoUrl} alt={negocio.nombre} width={36} height={36} className="rounded-xl object-contain size-9 border border-slate-100" />
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
                    <div className="relative h-44 md:h-64 bg-slate-900 overflow-hidden flex items-center justify-center text-center px-6">
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/60 to-slate-900/20 z-10" />
                        <div className="absolute inset-0 opacity-40 bg-[url('https://images.unsplash.com/photo-1555939594-58d7cb561ad1?q=80&w=687')] bg-cover bg-center" />
                        
                        <div className="relative z-20 max-w-md">
                            <h2 className="text-2xl md:text-3xl font-black text-white italic tracking-tighter uppercase mb-1">
                                Los mejores pinchos para asar
                            </h2>
                            <p className="text-[10px] md:text-xs text-slate-200/90 font-bold uppercase tracking-widest mb-4">
                                Rápido • Calidad Premium • A Domicilio
                            </p>
                            <button 
                                onClick={() => {
                                    const el = document.getElementById('catalogo');
                                    el?.scrollIntoView({ behavior: 'smooth' });
                                }}
                                className="px-5 py-2.5 bg-white text-slate-900 text-[10px] font-black uppercase tracking-widest rounded-full hover:scale-105 active:scale-95 transition-all shadow-lg"
                            >
                                Hacer Pedido
                            </button>
                        </div>
                    </div>

                    {/* Informative Banner */}
                    {config.tiempoMaximoEntrega && (
                        <div className="mx-6 mt-6 bg-slate-100 rounded-2xl p-4 flex items-center gap-3 border border-slate-200/50">
                            <Info className="size-5 text-slate-500 shrink-0" />
                            <div className="text-left">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tiempo de entrega aproximado</p>
                                <p className="text-xs font-black text-slate-700">{config.tiempoMaximoEntrega}</p>
                            </div>
                        </div>
                    )}

                    {/* Buscador */}
                    <div className="px-6 mt-6">
                        <div className="relative bg-white rounded-2xl border border-slate-100 shadow-sm flex items-center px-4 py-3 group focus-within:border-emerald-500/50 transition-colors">
                            <Search className="size-4 text-slate-400 mr-3" />
                            <input 
                                type="text" 
                                placeholder="Buscar pincho de carne, pollo, chorizo..." 
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full text-xs font-medium bg-transparent border-none outline-none placeholder:text-slate-400"
                            />
                        </div>
                    </div>

                    {/* Categorías (Filtros) */}
                    {categories.length > 0 && (
                        <div className="px-6 mt-6">
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
                                                    <Image src={p.imagenUrl} alt={p.nombre} fill className="object-cover" />
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
                <main className="flex-1 max-w-md w-full mx-auto px-6 py-6 pb-28">
                    <form onSubmit={handleConfirmOrder} className="space-y-6">
                        
                        {/* Selector Tipo Entrega */}
                        <div className="bg-white rounded-3xl p-1.5 border border-slate-100 shadow-sm flex">
                            <button
                                type="button"
                                onClick={() => setDeliveryType('DOMICILIO')}
                                className={`flex-1 py-3 text-center rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                    deliveryType === 'DOMICILIO' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500'
                                }`}
                            >
                                Entrega a Domicilio
                            </button>
                            <button
                                type="button"
                                onClick={() => setDeliveryType('RETIRO')}
                                className={`flex-1 py-3 text-center rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                    deliveryType === 'RETIRO' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500'
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

                                {/* Mapa de Google Maps para coordenadas GPS */}
                                <div className="space-y-2">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">Geolocalización GPS (Mueve el pin)</label>
                                    {mapError ? (
                                        <div className="text-[10px] text-rose-500 font-bold bg-rose-50 p-3 rounded-xl border border-rose-100">{mapError}</div>
                                    ) : (
                                        <div 
                                            ref={mapRef} 
                                            className="w-full h-44 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden relative"
                                        >
                                            <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-xs font-bold bg-slate-100">
                                                Cargando mapa...
                                            </div>
                                        </div>
                                    )}
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
                                                        ? 'bg-slate-900 text-white shadow-md border-transparent' 
                                                        : 'bg-slate-50 text-slate-500 border-transparent hover:bg-slate-100'
                                                }`}
                                            >
                                                <span>{day.isToday ? "Hoy" : day.label}</span>
                                                <span className={`text-[8px] font-bold ${
                                                    deliveryDate === day.dateStr ? 'text-slate-300' : 'text-slate-400'
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

                        {/* Botón de Confirmación */}
                        <button
                            type="submit"
                            disabled={submitting || slotsDisponibles.length === 0}
                            className="w-full py-4 text-center text-xs font-black uppercase tracking-widest rounded-2xl text-white shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                            style={{ backgroundColor: primaryColor }}
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="size-4 animate-spin" />
                                    Procesando pedido...
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
                        <span className="text-xs font-black">${cartTotal.toFixed(2)}</span>
                    </button>
                </div>
            )}
        </div>
    );
}
