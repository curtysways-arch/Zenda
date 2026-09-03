import Link from 'next/link';
import prisma from '@/lib/prisma';
import { 
    Check, 
    ArrowRight, 
    Smartphone, 
    Zap, 
    PlayCircle,
    Star,
    Rocket,
    BarChart3,
    Sparkles,
    MessageCircle,
    Calendar,
    Award,
    Bell,
    Globe,
    CheckCircle2,
    MessageSquare,
    TrendingUp,
    Shield,
    Users,
    ChevronRight,
    Play,
    Facebook,
    Instagram,
    Youtube,
    UtensilsCrossed,
    ShoppingBag,
    Scissors,
    Shirt,
    Trophy,
    Laptop,
    CreditCard,
    Layers,
    Boxes,
    ChefHat,
    QrCode,
    SlidersHorizontal,
    Compass
} from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: "Citiox | Crea la presencia de tu negocio en línea",
    description: "Crea la presencia digital de tu negocio con Citiox. Mucho más que un sitio web: una app completa para gestionar clientes, reservas, pedidos, ventas y operaciones.",
    openGraph: {
        title: "Citiox | Crea la presencia de tu negocio en línea",
        description: "Mucho más que un sitio web: la app completa para mostrar lo que haces, recibir clientes, vender y operar tu negocio.",
        images: ["/logo-citiox.png"],
        type: "website"
    }
};

const CitioxLogo = ({ className = "" }: { className?: string }) => (
    <img 
        src="/logo-citiox.png" 
        alt="Citiox Logo" 
        className={`object-contain ${className}`}
    />
);

export default async function LandingPage() {
    let planes: any[] = [];
    let activeFoundersCount = 4;
    let founderMax = 25;
    let founderPrice = "10";
    let cuposDisponibles = 21;

    try {
        const [planesDb, countDb, configsDb] = await Promise.all([
            prisma.plan.findMany({
                where: { activo: true, id: { not: 'founder' } },
                orderBy: { price: 'asc' }
            }).catch(() => []),
            (prisma.suscripcion as any).count({
                where: {
                    isFounder: true,
                    estado: { in: ['activa', 'active', 'ACTIVA'] }
                }
            }).catch(() => 4),
            prisma.globalConfig.findMany({
                where: {
                    clave: { in: ['FOUNDER_LOCKED_PRICE', 'FOUNDER_MAX', 'FAQS'] }
                }
            }).catch(() => [])
        ]);

        planes = (planesDb || []).filter((p: any) => {
            const name = (p.name || '').toUpperCase();
            return !name.includes('BEGIN') && p.id !== 'plan_begin';
        });
        activeFoundersCount = typeof countDb === 'number' ? countDb : 4;
        
        const founderMaxVal = configsDb.find((c: any) => c.clave === 'FOUNDER_MAX')?.valor || '25';
        const founderPriceVal = configsDb.find((c: any) => c.clave === 'FOUNDER_LOCKED_PRICE')?.valor || '10.0';
        founderMax = parseInt(founderMaxVal) || 25;
        const rawPrice = parseFloat(founderPriceVal) || 10;
        founderPrice = rawPrice % 1 === 0 ? rawPrice.toString() : rawPrice.toFixed(2);
        cuposDisponibles = Math.max(0, founderMax - activeFoundersCount);
    } catch (err) {
        console.error("Error loading landing page DB data:", err);
    }

    const solutions = [
        {
            id: 'restaurantes',
            badge: 'Gastronomía',
            icon: UtensilsCrossed,
            color: 'from-orange-500 to-amber-600',
            bgLight: 'bg-orange-50',
            borderLight: 'border-orange-200/80',
            textColor: 'text-orange-600',
            title: 'Restaurantes',
            desc: 'Menú digital, pedidos, mesas, cocina, delivery y gestión del restaurante.',
            cta: 'Ver Citiox para restaurantes →',
            href: '/restaurantes',
            registerHref: '/register?tipo=RESTAURANTE',
            registerCta: 'Crear mi restaurante',
            features: ['Menú QR en mesas', 'Pantalla Cocina KDS', 'Comandas & POS', 'Delivery sin 30%']
        },
        {
            id: 'tiendas',
            badge: 'Comercio & Retail',
            icon: ShoppingBag,
            color: 'from-indigo-500 to-blue-600',
            bgLight: 'bg-indigo-50',
            borderLight: 'border-indigo-200/80',
            textColor: 'text-indigo-600',
            title: 'Tiendas',
            desc: 'Catálogo, productos, variantes, inventario, pedidos, carrito y delivery.',
            cta: 'Ver Citiox para tiendas →',
            href: '/tiendas',
            registerHref: '/register?tipo=TIENDA',
            registerCta: 'Crear mi tienda',
            features: ['Catálogo con variantes', 'Control de stock vivo', 'Carrito & Checkout', 'Venta en mostrador']
        },
        {
            id: 'servicios',
            badge: 'Salud & Estética',
            icon: Scissors,
            color: 'from-pink-500 to-rose-600',
            bgLight: 'bg-pink-50',
            borderLight: 'border-pink-200/80',
            textColor: 'text-pink-600',
            title: 'Citas y Servicios',
            desc: 'Agenda, clientes, servicios, profesionales y reservas automatizadas.',
            cta: 'Ver Citiox para servicios →',
            href: '/servicios',
            registerHref: '/register?tipo=SPA',
            registerCta: 'Crear mi negocio',
            features: ['Reservas online 24/7', 'Recordatorios WhatsApp', 'Gestión de profesionales', 'Ficha de clientes']
        },
        {
            id: 'lavanderias',
            badge: 'Cuidado de Prendas',
            icon: Shirt,
            color: 'from-cyan-500 to-teal-600',
            bgLight: 'bg-cyan-50',
            borderLight: 'border-cyan-200/80',
            textColor: 'text-cyan-600',
            title: 'Lavanderías & Calzado',
            desc: 'Recepción de órdenes, clientes, estados, entregas y seguimiento en tiempo real.',
            cta: 'Ver Citiox para lavanderías →',
            href: '/lavanderias',
            registerHref: '/register?tipo=SHOE_CARE',
            registerCta: 'Crear mi lavandería',
            features: ['Tickets digitales QR', 'Fotos de inspección', 'Seguimiento de prendas', 'Rutas de entrega']
        },
        {
            id: 'canchas',
            badge: 'Clubes & Deporte',
            icon: Trophy,
            color: 'from-emerald-500 to-teal-600',
            bgLight: 'bg-emerald-50',
            borderLight: 'border-emerald-200/80',
            textColor: 'text-emerald-600',
            title: 'Canchas & Clubes',
            desc: 'Reservas por hora, disponibilidad en vivo, señas, torneos y comunidad.',
            cta: 'Ver Citiox para canchas →',
            href: '/canchas',
            registerHref: '/register?tipo=SPORTS_COURTS',
            registerCta: 'Crear mi negocio de canchas',
            features: ['Turnos por hora en vivo', 'Cobro de señas', 'Iluminación y turnos fijos', 'Partidos abiertos']
        }
    ];

    return (
        <div className="min-h-screen bg-slate-50/60 text-slate-900 font-sans selection:bg-indigo-600 selection:text-white overflow-x-hidden">
            
            {/* ================= 1. TOP BANNER / ANUNCIO ================= */}
            <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-950 py-2.5 px-4 relative z-50 text-white text-center shadow-md border-b border-white/10">
                <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-center gap-3 text-xs md:text-sm font-bold">
                    <span className="flex items-center gap-1.5">
                        <span className="text-amber-400">🔥</span>
                        <span className="font-extrabold uppercase tracking-wide text-amber-300">PLAN FUNDADORES:</span>
                        <span>Últimos <strong className="underline text-white">{cuposDisponibles} cupos</strong> con tarifa especial de <strong>${founderPrice}/mes</strong> de por vida.</span>
                    </span>
                    <Link 
                        href="#precios" 
                        className="bg-white text-slate-950 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider hover:bg-amber-300 transition-all shadow-sm"
                    >
                        Ver Planes &rarr;
                    </Link>
                </div>
            </div>

            {/* ================= 2. NAVBAR (NAVEGACIÓN) ================= */}
            <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-xs">
                <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
                    <Link href="/" className="flex items-center gap-2.5 group">
                        <CitioxLogo className="h-10 w-auto group-hover:scale-105 transition-transform" />
                        <span className="text-2xl font-black tracking-tight text-slate-900 flex items-center">
                            Citi<span className="text-indigo-600">Ox</span>
                        </span>
                    </Link>
                    
                    <div className="hidden lg:flex items-center gap-8 text-xs font-bold text-slate-600">
                        <a href="#soluciones" className="hover:text-indigo-600 transition-colors">Soluciones</a>
                        <a href="#que-es" className="hover:text-indigo-600 transition-colors">¿Cómo funciona?</a>
                        <a href="#capacidades" className="hover:text-indigo-600 transition-colors">Qué incluye</a>
                        <a href="#crecimiento" className="hover:text-indigo-600 transition-colors">Crecimiento</a>
                        <a href="#precios" className="hover:text-indigo-600 transition-colors">Precios</a>
                    </div>

                    <div className="flex items-center gap-3">
                        <Link
                            href="/login"
                            className="text-xs font-bold text-slate-700 hover:text-indigo-600 px-3 py-2 transition-colors"
                        >
                            Iniciar sesión
                        </Link>
                        <a
                            href="#soluciones"
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-md shadow-indigo-200 hover:shadow-indigo-300 active:scale-95 flex items-center gap-1.5"
                        >
                            CREAR MI NEGOCIO GRATIS &rarr;
                        </a>
                    </div>
                </div>
            </nav>

            {/* ================= 3. HERO PRINCIPAL ================= */}
            <header className="relative pt-12 md:pt-18 pb-20 bg-gradient-to-b from-indigo-50/40 via-white to-slate-50/50 overflow-hidden">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
                        
                        {/* Columna Izquierda: Mensaje Central */}
                        <div className="lg:col-span-6 space-y-6 text-left">
                            
                            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-full text-xs font-black uppercase tracking-wider">
                                <Sparkles size={14} className="text-indigo-600" />
                                <span>PLATAFORMA DIGITAL PARA CUALQUIER NEGOCIO</span>
                            </div>
                            
                            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-slate-950 tracking-tight leading-[1.08]">
                                Crea la presencia de <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-sky-600 to-purple-600">
                                    tu negocio en línea.
                                </span>
                            </h1>
                            
                            <p className="text-slate-600 text-base md:text-lg font-medium leading-relaxed max-w-xl">
                                Mucho más que un sitio web. Tu negocio tiene su propia app para mostrar lo que haces, recibir clientes, vender y administrar todo desde un solo lugar.
                            </p>

                            <p className="text-xs font-black uppercase tracking-widest text-indigo-600/90">
                                — empieza a crecer tu negocio
                            </p>

                            {/* Botones principales */}
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2">
                                <a
                                    href="#soluciones"
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-wider text-center transition-all shadow-xl shadow-indigo-200 active:scale-95 flex items-center justify-center gap-2"
                                >
                                    CREA TU NEGOCIO GRATIS &rarr;
                                </a>
                                <a
                                    href="#que-es"
                                    className="bg-white hover:bg-slate-50 text-slate-800 border-2 border-slate-200 px-8 py-4 rounded-2xl font-bold text-xs uppercase tracking-wider text-center transition-all shadow-xs flex items-center justify-center gap-2"
                                >
                                    <PlayCircle size={18} className="text-indigo-600" />
                                    VER CÓMO FUNCIONA
                                </a>
                            </div>

                            {/* Píldoras de valor */}
                            <div className="flex flex-wrap gap-4 text-xs font-bold text-slate-700 pt-2">
                                <span className="flex items-center gap-1.5 bg-white px-3.5 py-2 rounded-full border border-slate-200/80 shadow-2xs">
                                    <CheckCircle2 size={16} className="text-emerald-500" /> Tu propio enlace en línea
                                </span>
                                <span className="flex items-center gap-1.5 bg-white px-3.5 py-2 rounded-full border border-slate-200/80 shadow-2xs">
                                    <CheckCircle2 size={16} className="text-indigo-600" /> App completa para clientes
                                </span>
                                <span className="flex items-center gap-1.5 bg-white px-3.5 py-2 rounded-full border border-slate-200/80 shadow-2xs">
                                    <CheckCircle2 size={16} className="text-purple-600" /> Panel de operaciones y caja
                                </span>
                            </div>

                        </div>

                        {/* Columna Derecha: Representación Visual de Infraestructura Digital */}
                        <div className="lg:col-span-6 relative">
                            <div className="absolute w-[480px] h-[480px] bg-gradient-to-tr from-indigo-300/30 via-sky-300/30 to-purple-300/30 rounded-full blur-3xl opacity-70 -z-10" />

                            <div className="bg-slate-950 rounded-[2.8rem] p-6 shadow-2xl border border-slate-800 text-white space-y-6">
                                
                                {/* Header del Diagrama */}
                                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                                    <div className="flex items-center gap-2">
                                        <div className="size-3 rounded-full bg-rose-500" />
                                        <div className="size-3 rounded-full bg-amber-500" />
                                        <div className="size-3 rounded-full bg-emerald-500" />
                                        <span className="text-[11px] font-mono text-slate-400 ml-2">citiox.com/tu-negocio</span>
                                    </div>
                                    <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                        Ecosistema Digital Citiox
                                    </span>
                                </div>

                                {/* Diagrama Interactivo de Conexión */}
                                <div className="grid grid-cols-3 gap-3">
                                    
                                    {/* 1. App Pública */}
                                    <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-2 hover:border-indigo-500/50 transition-all group">
                                        <div className="size-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <Globe size={18} />
                                        </div>
                                        <p className="text-[11px] font-black uppercase text-indigo-300">App Pública</p>
                                        <ul className="text-[10px] text-slate-400 space-y-1 font-medium">
                                            <li>• Landing Web</li>
                                            <li>• Catálogo / Menú</li>
                                            <li>• Servicios & Precios</li>
                                            <li>• Promociones</li>
                                        </ul>
                                    </div>

                                    {/* 2. Clientes */}
                                    <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-2 hover:border-sky-500/50 transition-all group">
                                        <div className="size-8 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <Users size={18} />
                                        </div>
                                        <p className="text-[11px] font-black uppercase text-sky-300">Clientes</p>
                                        <ul className="text-[10px] text-slate-400 space-y-1 font-medium">
                                            <li>• Reservas 24/7</li>
                                            <li>• Pedidos en línea</li>
                                            <li>• WhatsApp Direct</li>
                                            <li>• Seguimiento en vivo</li>
                                        </ul>
                                    </div>

                                    {/* 3. Administración */}
                                    <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-2 hover:border-purple-500/50 transition-all group">
                                        <div className="size-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <SlidersHorizontal size={18} />
                                        </div>
                                        <p className="text-[11px] font-black uppercase text-purple-300">Operación</p>
                                        <ul className="text-[10px] text-slate-400 space-y-1 font-medium">
                                            <li>• Punto de Venta POS</li>
                                            <li>• Inventario & Stock</li>
                                            <li>• Cocina / Comandas</li>
                                            <li>• Reportes & Métricas</li>
                                        </ul>
                                    </div>

                                </div>

                                {/* Conclusión Visual */}
                                <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-950/70 to-purple-950/70 border border-indigo-800/40 text-center space-y-1">
                                    <p className="text-xs font-black text-indigo-200">
                                        «Citiox construye la infraestructura digital completa de tu negocio.»
                                    </p>
                                    <p className="text-[11px] text-slate-400 font-medium">
                                        No solo una página: una solución operativa conectada a tus ventas reales.
                                    </p>
                                </div>

                            </div>
                        </div>

                    </div>
                </div>
            </header>

            {/* ================= 4. SECCIÓN: NO ES SOLO UN SITIO WEB ================= */}
            <section id="que-es" className="py-20 bg-white border-y border-slate-200/80">
                <div className="max-w-7xl mx-auto px-6">
                    
                    <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
                        <span className="px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                            La diferencia real de Citiox
                        </span>
                        <h2 className="text-3xl sm:text-5xl font-black text-slate-950 tracking-tight">
                            No es solo un sitio web. <br />
                            <span className="text-indigo-600">Es la app de tu negocio.</span>
                        </h2>
                        <p className="text-slate-600 text-base sm:text-lg font-medium">
                            Tu negocio obtiene una presencia digital profesional y, al mismo tiempo, las herramientas necesarias para operar, vender y crecer todos los días.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        
                        {/* 1. Tu Presencia */}
                        <div className="bg-slate-50 p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-5 flex flex-col justify-between">
                            <div className="space-y-4">
                                <div className="size-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-black">
                                    <Globe size={26} />
                                </div>
                                <h3 className="text-xl font-black text-slate-900">🌐 TU PRESENCIA</h3>
                                <p className="text-slate-600 text-xs leading-relaxed font-medium">
                                    Tu cara profesional ante el mundo. Diseño moderno adaptado a celulares y computadoras.
                                </p>
                                <ul className="text-xs font-bold text-slate-700 space-y-2 pt-2 border-t border-slate-200/60">
                                    <li className="flex items-center gap-2"><Check size={14} className="text-indigo-600" /> Landing profesional personalizada</li>
                                    <li className="flex items-center gap-2"><Check size={14} className="text-indigo-600" /> Información, ubicación GPS y horarios</li>
                                    <li className="flex items-center gap-2"><Check size={14} className="text-indigo-600" /> Galería de resultados y fotos</li>
                                    <li className="flex items-center gap-2"><Check size={14} className="text-indigo-600" /> Catálogo completo o lista de servicios</li>
                                    <li className="flex items-center gap-2"><Check size={14} className="text-indigo-600" /> Promociones y posicionamiento SEO</li>
                                </ul>
                            </div>
                        </div>

                        {/* 2. Tu App para Clientes */}
                        <div className="bg-slate-50 p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-5 flex flex-col justify-between">
                            <div className="space-y-4">
                                <div className="size-12 rounded-2xl bg-sky-100 text-sky-600 flex items-center justify-center font-black">
                                    <Smartphone size={26} />
                                </div>
                                <h3 className="text-xl font-black text-slate-900">📲 TU APP PARA CLIENTES</h3>
                                <p className="text-slate-600 text-xs leading-relaxed font-medium">
                                    Experiencia interactiva sin necesidad de descargar apps pesadas desde las tiendas.
                                </p>
                                <ul className="text-xs font-bold text-slate-700 space-y-2 pt-2 border-t border-slate-200/60">
                                    <li className="flex items-center gap-2"><Check size={14} className="text-sky-600" /> Reservas en tiempo real con confirmación</li>
                                    <li className="flex items-center gap-2"><Check size={14} className="text-sky-600" /> Carrito de compras y pedidos en mesa o delivery</li>
                                    <li className="flex items-center gap-2"><Check size={14} className="text-sky-600" /> Cupones de descuento y recompensas</li>
                                    <li className="flex items-center gap-2"><Check size={14} className="text-sky-600" /> Enlace directo e integración con WhatsApp</li>
                                    <li className="flex items-center gap-2"><Check size={14} className="text-sky-600" /> Notificaciones de estado de órdenes</li>
                                </ul>
                            </div>
                        </div>

                        {/* 3. Tu Administración */}
                        <div className="bg-slate-50 p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-5 flex flex-col justify-between">
                            <div className="space-y-4">
                                <div className="size-12 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center font-black">
                                    <SlidersHorizontal size={26} />
                                </div>
                                <h3 className="text-xl font-black text-slate-900">⚙️ TU ADMINISTRACIÓN</h3>
                                <p className="text-slate-600 text-xs leading-relaxed font-medium">
                                    Control total de tu negocio desde cualquier computadora, tablet o teléfono.
                                </p>
                                <ul className="text-xs font-bold text-slate-700 space-y-2 pt-2 border-t border-slate-200/60">
                                    <li className="flex items-center gap-2"><Check size={14} className="text-purple-600" /> Gestión de clientes y base de datos</li>
                                    <li className="flex items-center gap-2"><Check size={14} className="text-purple-600" /> Productos, servicios y stock de inventario</li>
                                    <li className="flex items-center gap-2"><Check size={14} className="text-purple-600" /> Punto de Venta POS, caja diaria y pagos</li>
                                    <li className="flex items-center gap-2"><Check size={14} className="text-purple-600" /> Despacho de pedidos y delivery con GPS</li>
                                    <li className="flex items-center gap-2"><Check size={14} className="text-purple-600" /> Métricas e informes de ventas</li>
                                </ul>
                            </div>
                        </div>

                    </div>

                </div>
            </section>

            {/* ================= 5. SECCIÓN: UNA APP PARA CADA TIPO DE NEGOCIO (HUB) ================= */}
            <section id="soluciones" className="py-24 max-w-7xl mx-auto px-6">
                
                <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
                    <span className="px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200/80">
                        ¿Qué tipo de negocio tienes?
                    </span>
                    <h2 className="text-3xl sm:text-5xl font-black text-slate-950 tracking-tight">
                        Tu negocio. Tu propia app.
                    </h2>
                    <p className="text-slate-600 text-base sm:text-lg font-medium">
                        Citiox no impone un modelo genérico. Se adapta a la forma exacta en que opera tu sector.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {solutions.map((sol) => {
                        const Icon = sol.icon;
                        return (
                            <div 
                                key={sol.id} 
                                className="bg-white rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-xl transition-all duration-300 p-7 flex flex-col justify-between group"
                            >
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className={`size-12 rounded-2xl ${sol.bgLight} ${sol.textColor} flex items-center justify-center font-black`}>
                                            <Icon size={24} />
                                        </div>
                                        <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${sol.bgLight} ${sol.textColor} border ${sol.borderLight}`}>
                                            {sol.badge}
                                        </span>
                                    </div>

                                    <h3 className="text-xl font-black text-slate-900 group-hover:text-indigo-600 transition-colors">
                                        {sol.title}
                                    </h3>

                                    <p className="text-slate-600 text-xs leading-relaxed font-medium">
                                        {sol.desc}
                                    </p>

                                    <div className="pt-2 border-t border-slate-100 space-y-1.5">
                                        {sol.features.map((feat, i) => (
                                            <div key={i} className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600">
                                                <CheckCircle2 size={13} className={sol.textColor} />
                                                <span>{feat}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="pt-6 mt-4 border-t border-slate-100 flex flex-col gap-2.5">
                                    <Link
                                        href={sol.registerHref}
                                        className="w-full py-3 bg-slate-900 hover:bg-indigo-600 text-white font-black text-xs uppercase tracking-wider rounded-xl text-center transition-all shadow-sm active:scale-95 flex items-center justify-center gap-1"
                                    >
                                        <span>{sol.registerCta}</span> &rarr;
                                    </Link>
                                    <Link
                                        href={sol.href}
                                        className="text-center text-xs font-extrabold text-slate-500 hover:text-indigo-600 py-1 transition-colors"
                                    >
                                        {sol.cta}
                                    </Link>
                                </div>
                            </div>
                        );
                    })}
                </div>

            </section>

            {/* ================= 6. SECCIÓN: CONCEPTO DE APP COMPLETA ================= */}
            <section className="py-20 bg-slate-900 text-white">
                <div className="max-w-7xl mx-auto px-6">
                    
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
                        <div className="lg:col-span-6 space-y-6">
                            <span className="px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                Transformación Digital
                            </span>

                            <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
                                Tu negocio no necesita <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-sky-400 to-teal-400">
                                    otra página web.
                                </span>
                            </h2>

                            <p className="text-slate-300 text-base sm:text-lg font-medium leading-relaxed">
                                Necesita una herramienta que trabaje para él. Un sitio web solo muestra información; Citiox recibe pedidos, agenda citas, cobra en caja, descuenta stock y fideliza a tus clientes.
                            </p>

                            <div className="p-6 rounded-3xl bg-slate-800/80 border border-slate-700/60 space-y-3">
                                <p className="text-xs font-black uppercase tracking-widest text-indigo-400">El Ecosistema Citiox</p>
                                <p className="text-sm font-bold text-slate-200">
                                    Tu negocio en línea. Tu presencia. Tus clientes. Tus ventas. Tu operación. Todo en un solo lugar.
                                </p>
                            </div>
                        </div>

                        <div className="lg:col-span-6">
                            <div className="bg-slate-950 p-6 sm:p-8 rounded-[2.5rem] border border-slate-800 space-y-6">
                                <div className="text-center pb-4 border-b border-slate-800">
                                    <p className="text-xs font-black uppercase tracking-widest text-slate-400">FLUJO OPERATIVO</p>
                                    <p className="text-lg font-black text-white mt-1">TU NEGOCIO</p>
                                </div>

                                <div className="grid grid-cols-3 gap-3 text-center">
                                    <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
                                        <p className="text-xs font-black text-indigo-400">CLIENTES</p>
                                        <p className="text-[10px] text-slate-400 mt-1 font-medium">Reservas • WhatsApp • Promos</p>
                                    </div>
                                    <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
                                        <p className="text-xs font-black text-sky-400">VENTAS</p>
                                        <p className="text-[10px] text-slate-400 mt-1 font-medium">Pedidos • Pagos • Delivery</p>
                                    </div>
                                    <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
                                        <p className="text-xs font-black text-purple-400">OPERACIÓN</p>
                                        <p className="text-[10px] text-slate-400 mt-1 font-medium">Inventario • Productos • Reportes</p>
                                    </div>
                                </div>

                                <div className="pt-2 text-center">
                                    <span className="text-sm font-black text-emerald-400 tracking-wide">
                                        ➔ Eso es Citiox.
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </section>

            {/* ================= 7. SECCIÓN: QUÉ RECIBE TU NEGOCIO ================= */}
            <section id="capacidades" className="py-24 bg-white">
                <div className="max-w-7xl mx-auto px-6">
                    
                    <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
                        <span className="px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                            Capacidades Integrales
                        </span>
                        <h2 className="text-3xl sm:text-5xl font-black text-slate-950 tracking-tight">
                            Todo lo que necesitas para llevar tu negocio al mundo digital.
                        </h2>
                        <p className="text-slate-600 text-base sm:text-lg font-medium">
                            Componentes diseñados para trabajar en sintonía y potenciar tus ingresos.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        
                        <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200/80 space-y-3">
                            <div className="size-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black">
                                <Globe size={20} />
                            </div>
                            <h3 className="font-black text-slate-900 text-lg">PRESENCIA</h3>
                            <p className="text-slate-600 text-xs font-medium leading-relaxed">
                                Una página profesional y moderna que representa la calidad y seriedad de tu marca en internet.
                            </p>
                        </div>

                        <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200/80 space-y-3">
                            <div className="size-10 rounded-xl bg-sky-600 text-white flex items-center justify-center font-black">
                                <Users size={20} />
                            </div>
                            <h3 className="font-black text-slate-900 text-lg">CLIENTES</h3>
                            <p className="text-slate-600 text-xs font-medium leading-relaxed">
                                Permite que tus clientes interactúen contigo, consulten disponibilidad y reciban atención rápida.
                            </p>
                        </div>

                        <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200/80 space-y-3">
                            <div className="size-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black">
                                <CreditCard size={20} />
                            </div>
                            <h3 className="font-black text-slate-900 text-lg">VENTAS</h3>
                            <p className="text-slate-600 text-xs font-medium leading-relaxed">
                                Recibe pedidos, reservas anticipadas o solicitudes con cobro digital o en mostrador.
                            </p>
                        </div>

                        <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200/80 space-y-3">
                            <div className="size-10 rounded-xl bg-purple-600 text-white flex items-center justify-center font-black">
                                <SlidersHorizontal size={20} />
                            </div>
                            <h3 className="font-black text-slate-900 text-lg">OPERACIÓN</h3>
                            <p className="text-slate-600 text-xs font-medium leading-relaxed">
                                Administra tu catálogo, inventario, comandas de cocina y personal desde un panel central unificado.
                            </p>
                        </div>

                        <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200/80 space-y-3">
                            <div className="size-10 rounded-xl bg-rose-600 text-white flex items-center justify-center font-black">
                                <TrendingUp size={20} />
                            </div>
                            <h3 className="font-black text-slate-900 text-lg">CRECIMIENTO</h3>
                            <p className="text-slate-600 text-xs font-medium leading-relaxed">
                                Promociones, cupones de fidelización, métricas de recurrencia y herramientas para vender más.
                            </p>
                        </div>

                        <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200/80 space-y-3">
                            <div className="size-10 rounded-xl bg-teal-600 text-white flex items-center justify-center font-black">
                                <MessageCircle size={20} />
                            </div>
                            <h3 className="font-black text-slate-900 text-lg">COMUNICACIÓN</h3>
                            <p className="text-slate-600 text-xs font-medium leading-relaxed">
                                Conecta con tus clientes mediante WhatsApp y notificaciones automatizadas en cada etapa del servicio.
                            </p>
                        </div>

                    </div>

                </div>
            </section>

            {/* ================= 8. SECCIÓN: EMPcurrentIEZA CON TU PRESENCIA. CRECE CON CITIOX ================= */}
            <section id="crecimiento" className="py-24 bg-gradient-to-b from-slate-50 to-indigo-50/40 border-t border-slate-200/80">
                <div className="max-w-7xl mx-auto px-6 text-center space-y-12">
                    
                    <div className="max-w-3xl mx-auto space-y-3">
                        <span className="px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider bg-indigo-100 text-indigo-700 border border-indigo-200">
                            Evolución Progresiva
                        </span>
                        <h2 className="text-3xl sm:text-5xl font-black text-slate-950 tracking-tight">
                            Empieza con tu presencia. <br />
                            <span className="text-indigo-600">Crece con Citiox.</span>
                        </h2>
                        <p className="text-slate-600 text-base sm:text-lg font-medium">
                            Comienza mostrando tu negocio de forma profesional y activa más capacidades a medida que tu negocio lo requiera.
                        </p>
                    </div>

                    {/* Progresión Visual */}
                    <div className="flex flex-wrap items-center justify-center gap-3 md:gap-4 max-w-5xl mx-auto">
                        <span className="px-4 py-2.5 rounded-2xl bg-white border border-slate-200 shadow-xs font-black text-xs text-slate-800">
                            1. PRESENCIA
                        </span>
                        <span className="text-slate-400 font-black">➔</span>
                        <span className="px-4 py-2.5 rounded-2xl bg-white border border-slate-200 shadow-xs font-black text-xs text-slate-800">
                            2. CLIENTES
                        </span>
                        <span className="text-slate-400 font-black">➔</span>
                        <span className="px-4 py-2.5 rounded-2xl bg-white border border-slate-200 shadow-xs font-black text-xs text-slate-800">
                            3. RESERVAS / PEDIDOS
                        </span>
                        <span className="text-slate-400 font-black">➔</span>
                        <span className="px-4 py-2.5 rounded-2xl bg-white border border-slate-200 shadow-xs font-black text-xs text-slate-800">
                            4. VENTAS
                        </span>
                        <span className="text-slate-400 font-black">➔</span>
                        <span className="px-4 py-2.5 rounded-2xl bg-white border border-slate-200 shadow-xs font-black text-xs text-slate-800">
                            5. ADMINISTRACIÓN
                        </span>
                        <span className="text-slate-400 font-black">➔</span>
                        <span className="px-4 py-2.5 rounded-2xl bg-indigo-600 text-white shadow-md font-black text-xs">
                            6. CRECIMIENTO
                        </span>
                    </div>

                    <div className="pt-6">
                        <a
                            href="#soluciones"
                            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-xl shadow-indigo-200 active:scale-95"
                        >
                            ELEGIR MI SECTOR Y EMPEZAR GRATIS &rarr;
                        </a>
                    </div>

                </div>
            </section>

            {/* ================= 9. SECCIÓN: PRECIOS & PLANES ================= */}
            <section id="precios" className="py-24 bg-white border-t border-slate-200/80">
                <div className="max-w-7xl mx-auto px-6">
                    
                    <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
                        <span className="px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                            Planes Transparentes
                        </span>
                        <h2 className="text-3xl sm:text-5xl font-black text-slate-950 tracking-tight">
                            Comienza gratis. Escala sin límites.
                        </h2>
                        <p className="text-slate-600 text-base sm:text-lg font-medium">
                            15 días de prueba completa en todas las soluciones. Sin tarjeta de crédito obligatoria.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                        
                        {/* Plan Inicial */}
                        <div className="bg-slate-50 p-8 rounded-3xl border border-slate-200 shadow-xs space-y-6 flex flex-col justify-between">
                            <div className="space-y-4">
                                <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-200 text-slate-700">
                                    Para Empezar
                                </span>
                                <h3 className="text-2xl font-black text-slate-900">Plan Inicial</h3>
                                <p className="text-xs text-slate-500 font-medium">Ideal para lanzar tu presencia digital y recibir tus primeros clientes.</p>
                                <div className="pt-2">
                                    <span className="text-4xl font-black text-slate-950">$19</span>
                                    <span className="text-xs text-slate-500 font-bold"> /mes</span>
                                </div>
                                <ul className="text-xs font-bold text-slate-700 space-y-2.5 pt-4 border-t border-slate-200">
                                    <li className="flex items-center gap-2"><Check size={15} className="text-emerald-500" /> Presencia web & App digital</li>
                                    <li className="flex items-center gap-2"><Check size={15} className="text-emerald-500" /> Catálogo o menú con fotos</li>
                                    <li className="flex items-center gap-2"><Check size={15} className="text-emerald-500" /> Hasta 300 pedidos / reservas al mes</li>
                                    <li className="flex items-center gap-2"><Check size={15} className="text-emerald-500" /> Integración con WhatsApp</li>
                                </ul>
                            </div>
                            <Link
                                href="/register?plan=inicial"
                                className="w-full py-3.5 bg-white hover:bg-slate-100 text-slate-900 border-2 border-slate-200 rounded-xl font-black text-xs uppercase tracking-wider text-center transition-all active:scale-95"
                            >
                                Comenzar Prueba Gratis
                            </Link>
                        </div>

                        {/* Plan Fundador (Destacado) */}
                        <div className="bg-gradient-to-b from-indigo-900 via-indigo-950 to-slate-950 text-white p-8 rounded-3xl border-2 border-amber-400/80 shadow-2xl space-y-6 flex flex-col justify-between relative">
                            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-amber-400 text-slate-950 px-4 py-1 rounded-full font-black text-[10px] uppercase tracking-widest shadow-md">
                                ★ MÁS POPULAR • CUPOS LIMITADOS
                            </div>
                            <div className="space-y-4">
                                <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400/20 text-amber-300 border border-amber-400/30">
                                    Acceso Fundador
                                </span>
                                <h3 className="text-2xl font-black text-white">Tarifa Vitalicia</h3>
                                <p className="text-xs text-indigo-200 font-medium">Quedan {cuposDisponibles} cupos con precio congelado para siempre.</p>
                                <div className="pt-2">
                                    <span className="text-5xl font-black text-amber-400">${founderPrice}</span>
                                    <span className="text-xs text-indigo-200 font-bold"> /mes de por vida</span>
                                </div>
                                <ul className="text-xs font-bold text-indigo-100 space-y-2.5 pt-4 border-t border-indigo-800/60">
                                    <li className="flex items-center gap-2"><Check size={15} className="text-amber-400" /> Todas las soluciones incluidas</li>
                                    <li className="flex items-center gap-2"><Check size={15} className="text-amber-400" /> Pedidos y reservas ilimitadas</li>
                                    <li className="flex items-center gap-2"><Check size={15} className="text-amber-400" /> Punto de Venta POS & Pantalla KDS</li>
                                    <li className="flex items-center gap-2"><Check size={15} className="text-amber-400" /> Soporte prioritario y actualizaciones VIP</li>
                                </ul>
                            </div>
                            <Link
                                href="/register?plan=founder"
                                className="w-full py-4 bg-gradient-to-r from-amber-400 to-amber-500 hover:brightness-110 text-slate-950 rounded-xl font-black text-xs uppercase tracking-wider text-center transition-all shadow-xl shadow-amber-400/20 active:scale-95"
                            >
                                ASEGURAR TARIFA FUNDADOR &rarr;
                            </Link>
                        </div>

                        {/* Plan Pro / Escala */}
                        <div className="bg-slate-50 p-8 rounded-3xl border border-slate-200 shadow-xs space-y-6 flex flex-col justify-between">
                            <div className="space-y-4">
                                <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-200 text-slate-700">
                                    Negocios en Expansión
                                </span>
                                <h3 className="text-2xl font-black text-slate-900">Plan Pro</h3>
                                <p className="text-xs text-slate-500 font-medium">Para negocios con alto volumen, múltiples sucursales o equipo.</p>
                                <div className="pt-2">
                                    <span className="text-4xl font-black text-slate-950">$49</span>
                                    <span className="text-xs text-slate-500 font-bold"> /mes</span>
                                </div>
                                <ul className="text-xs font-bold text-slate-700 space-y-2.5 pt-4 border-t border-slate-200">
                                    <li className="flex items-center gap-2"><Check size={15} className="text-emerald-500" /> Múltiples usuarios y cajeros</li>
                                    <li className="flex items-center gap-2"><Check size={15} className="text-emerald-500" /> Control de inventario multi-bodega</li>
                                    <li className="flex items-center gap-2"><Check size={15} className="text-emerald-500" /> Gestión de repartidores con GPS</li>
                                    <li className="flex items-center gap-2"><Check size={15} className="text-emerald-500" /> Reportes financieros y exportación</li>
                                </ul>
                            </div>
                            <Link
                                href="/register?plan=pro"
                                className="w-full py-3.5 bg-white hover:bg-slate-100 text-slate-900 border-2 border-slate-200 rounded-xl font-black text-xs uppercase tracking-wider text-center transition-all active:scale-95"
                            >
                                Comenzar Prueba Gratis
                            </Link>
                        </div>

                    </div>

                </div>
            </section>

            {/* ================= 10. CTA FINAL ================= */}
            <section className="py-20 bg-gradient-to-r from-indigo-700 via-indigo-800 to-purple-800 text-white text-center px-6">
                <div className="max-w-4xl mx-auto space-y-6">
                    <span className="px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider bg-white/10 text-indigo-100 border border-white/20">
                        Tu negocio, ahora en línea.
                    </span>
                    <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
                        Crea la presencia digital de tu negocio hoy.
                    </h2>
                    <p className="text-indigo-100 text-base sm:text-lg max-w-2xl mx-auto font-medium">
                        Mucho más que una web. Una app completa para mostrar lo que haces, recibir clientes, vender y hacer crecer tu negocio.
                    </p>
                    <div className="pt-2">
                        <a
                            href="#soluciones"
                            className="inline-flex items-center gap-2 bg-white text-slate-950 hover:bg-amber-300 px-9 py-4 rounded-2xl font-black text-xs uppercase tracking-wider shadow-2xl transition-all active:scale-95"
                        >
                            CREAR MI NEGOCIO GRATIS &rarr;
                        </a>
                    </div>
                </div>
            </section>

            {/* ================= 11. FOOTER SAAS PROFESIONAL ================= */}
            <footer className="bg-slate-950 text-slate-400 py-16 border-t border-slate-800 text-xs">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 pb-12 border-b border-slate-800">
                        
                        {/* Col 1: Marca */}
                        <div className="col-span-2 md:col-span-1 space-y-4">
                            <div className="flex items-center gap-2">
                                <CitioxLogo className="h-8 w-auto brightness-200" />
                                <span className="text-xl font-black text-white">Citi<span className="text-indigo-400">Ox</span></span>
                            </div>
                            <p className="text-xs text-slate-400 font-medium leading-relaxed">
                                Plataforma digital completa para cualquier negocio. Crea tu presencia en línea, recibe clientes y administra tus operaciones.
                            </p>
                        </div>

                        {/* Col 2: Citiox */}
                        <div className="space-y-3">
                            <p className="text-xs font-black uppercase tracking-wider text-white">Citiox</p>
                            <ul className="space-y-2 font-bold">
                                <li><a href="#" className="hover:text-white transition-colors">Inicio</a></li>
                                <li><a href="#que-es" className="hover:text-white transition-colors">Cómo funciona</a></li>
                                <li><a href="#soluciones" className="hover:text-white transition-colors">Soluciones</a></li>
                                <li><a href="#precios" className="hover:text-white transition-colors">Precios</a></li>
                                <li><Link href="/login" className="hover:text-white transition-colors">Iniciar sesión</Link></li>
                            </ul>
                        </div>

                        {/* Col 3: Soluciones */}
                        <div className="space-y-3">
                            <p className="text-xs font-black uppercase tracking-wider text-white">Soluciones</p>
                            <ul className="space-y-2 font-bold">
                                <li><Link href="/restaurantes" className="hover:text-white transition-colors">Restaurantes</Link></li>
                                <li><Link href="/tiendas" className="hover:text-white transition-colors">Tiendas & Comercio</Link></li>
                                <li><Link href="/servicios" className="hover:text-white transition-colors">Citas y Servicios</Link></li>
                                <li><Link href="/lavanderias" className="hover:text-white transition-colors">Lavanderías & Calzado</Link></li>
                                <li><Link href="/canchas" className="hover:text-white transition-colors">Canchas & Clubes</Link></li>
                            </ul>
                        </div>

                        {/* Col 4: Empresa */}
                        <div className="space-y-3">
                            <p className="text-xs font-black uppercase tracking-wider text-white">Empresa</p>
                            <ul className="space-y-2 font-bold">
                                <li><Link href="/demo" className="hover:text-white transition-colors">Demos en vivo</Link></li>
                                <li><Link href="/terminos" className="hover:text-white transition-colors">Términos de servicio</Link></li>
                                <li><Link href="/privacidad" className="hover:text-white transition-colors">Política de privacidad</Link></li>
                                <li><a href="mailto:soporte@citiox.com" className="hover:text-white transition-colors">Contacto</a></li>
                            </ul>
                        </div>

                    </div>

                    <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] font-bold text-slate-500">
                        <p>© 2026 CitiOx. Todos los derechos reservados. Plataforma Digital para Negocios.</p>
                        <p>«empieza a crecer tu negocio»</p>
                    </div>
                </div>
            </footer>

        </div>
    );
}
