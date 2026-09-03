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
    UtensilsCrossed,
    ShoppingBag,
    Scissors,
    Shirt,
    Trophy,
    Dumbbell,
    Store,
    Layers,
    Boxes,
    SlidersHorizontal,
    Search,
    ChevronDown,
    Plus,
    Activity,
    CreditCard
} from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: "Citiox | Crea la presencia de tu negocio en línea",
    description: "Mucho más que un sitio web. Tu negocio tiene su propia app para mostrar lo que haces, recibir clientes, vender y administrar todo desde un solo lugar.",
    openGraph: {
        title: "Citiox | Crea la presencia de tu negocio en línea",
        description: "Mucho más que un sitio web. Tu negocio tiene su propia app para mostrar, vender y administrar todo.",
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
                    clave: { in: ['FOUNDER_LOCKED_PRICE', 'FOUNDER_MAX'] }
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

    return (
        <div className="min-h-screen bg-[#fcfbfe] text-slate-900 font-sans selection:bg-[#4f46e5] selection:text-white overflow-x-hidden">
            
            {/* ================= 1. TOP BANNER / ANUNCIO ================= */}
            <div className="bg-[#0b0f19] py-2.5 px-4 relative z-50 text-white text-center border-b border-white/10 shadow-sm">
                <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-center gap-3 text-xs md:text-sm font-semibold">
                    <span className="flex items-center gap-1.5 text-slate-200">
                        <span className="text-amber-400">🔥</span>
                        <strong className="text-amber-400 font-black tracking-wide">PLAN FUNDADORES:</strong>
                        <span>Últimos <strong className="underline text-white font-black">{cuposDisponibles} cupos</strong> con tarifa especial de <strong>${founderPrice}/mes</strong> de por vida.</span>
                    </span>
                    <a 
                        href="#precios" 
                        className="bg-white hover:bg-slate-100 text-slate-950 px-3.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider transition-all shadow-sm flex items-center gap-1 cursor-pointer"
                    >
                        VER PLANES &rarr;
                    </a>
                </div>
            </div>

            {/* ================= 2. NAVBAR ================= */}
            <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-xs">
                <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
                    
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-2.5 group">
                        <CitioxLogo className="h-9 w-auto object-contain group-hover:scale-105 transition-transform" />
                        <span className="text-2xl font-black tracking-tight text-slate-900 flex items-center">
                            Citi<span className="text-[#4f46e5]">Ox</span>
                        </span>
                    </Link>
                    
                    {/* Menu links */}
                    <div className="hidden lg:flex items-center gap-8 text-xs font-bold text-slate-600">
                        <a href="#soluciones" className="hover:text-[#4f46e5] transition-colors flex items-center gap-1">
                            Soluciones <ChevronDown size={14} className="text-slate-400" />
                        </a>
                        <a href="#como-funciona" className="hover:text-[#4f46e5] transition-colors">¿Cómo funciona?</a>
                        <a href="#que-incluye" className="hover:text-[#4f46e5] transition-colors">Qué incluye</a>
                        <a href="#testimonios" className="hover:text-[#4f46e5] transition-colors">Casos de éxito</a>
                        <a href="#precios" className="hover:text-[#4f46e5] transition-colors">Precios</a>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3">
                        <Link
                            href="/login"
                            className="text-xs font-bold text-slate-700 hover:text-[#4f46e5] px-3 py-2 transition-colors"
                        >
                            Iniciar sesión
                        </Link>
                        <a
                            href="#soluciones"
                            className="bg-[#4f46e5] hover:bg-[#4338ca] text-white px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-md shadow-indigo-500/25 active:scale-95 flex items-center gap-1.5 cursor-pointer"
                        >
                            CREAR MI NEGOCIO GRATIS &rarr;
                        </a>
                    </div>
                </div>
            </nav>

            {/* ================= 3. HERO PRINCIPAL ================= */}
            <header className="relative pt-12 md:pt-16 pb-20 bg-gradient-to-b from-[#f5f3ff]/60 via-white to-white overflow-hidden">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
                        
                        {/* Columna Izquierda: Mensaje Central */}
                        <div className="lg:col-span-6 space-y-6 text-left">
                            
                            {/* Badge Pill */}
                            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-[#eef2ff] text-[#4f46e5] border border-[#e0e7ff] rounded-full text-[11px] font-black uppercase tracking-wider shadow-2xs">
                                <span className="text-sm">⚛️</span>
                                <span>PLATAFORMA DIGITAL TODO EN UNO</span>
                            </div>
                            
                            {/* Headline */}
                            <h1 className="text-4xl sm:text-5xl md:text-[54px] font-black text-slate-950 tracking-tight leading-[1.12]">
                                Crea la presencia de <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#2563eb] via-[#4f46e5] to-[#7c3aed]">
                                    tu negocio en línea.
                                </span>
                            </h1>
                            
                            {/* Subtitle */}
                            <p className="text-slate-600 text-base md:text-[17px] font-medium leading-relaxed max-w-xl">
                                Mucho más que un sitio web. Tu negocio tiene su propia app para mostrar lo que haces, recibir clientes, vender y administrar todo desde un solo lugar.
                            </p>

                            {/* Botones principales */}
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 pt-1">
                                <a
                                    href="#soluciones"
                                    className="bg-gradient-to-r from-[#4f46e5] to-[#6366f1] hover:brightness-110 text-white px-7 py-3.5 rounded-xl font-black text-xs uppercase tracking-wider text-center transition-all shadow-lg shadow-indigo-500/30 active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    CREA TU NEGOCIO GRATIS &rarr;
                                </a>
                                <a
                                    href="#como-funciona"
                                    className="bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 px-6 py-3.5 rounded-xl font-black text-xs uppercase tracking-wider text-center transition-all shadow-2xs flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    <PlayCircle size={17} className="text-[#4f46e5]" />
                                    VER CÓMO FUNCIONA
                                </a>
                            </div>

                            {/* Píldoras de valor con checks */}
                            <div className="flex flex-wrap gap-2.5 text-[11px] font-extrabold text-slate-700 pt-2">
                                <span className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-full border border-emerald-200/80 shadow-2xs text-emerald-800">
                                    <CheckCircle2 size={15} className="text-emerald-500 shrink-0" /> Tu propio enlace en línea
                                </span>
                                <span className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-full border border-indigo-200/80 shadow-2xs text-indigo-900">
                                    <CheckCircle2 size={15} className="text-indigo-500 shrink-0" /> App completa para clientes
                                </span>
                                <span className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-full border border-sky-200/80 shadow-2xs text-sky-900">
                                    <CheckCircle2 size={15} className="text-sky-500 shrink-0" /> Panel de operaciones y caja
                                </span>
                            </div>

                        </div>

                        {/* Columna Derecha: Dual Mockup Exacto al Diseño */}
                        <div className="lg:col-span-6 relative flex justify-center items-center">
                            
                            {/* Resplandor ambiente */}
                            <div className="absolute w-[460px] h-[460px] bg-gradient-to-tr from-indigo-200/40 via-purple-200/40 to-sky-200/30 rounded-full blur-3xl opacity-70 -z-10" />

                            <div className="relative w-full max-w-lg">
                                
                                {/* 💻 MOCKUP LAPTOP / TABLET DE ADMINISTRACIÓN */}
                                <div className="bg-[#0b101e] rounded-3xl p-3 shadow-2xl border border-slate-800/90 text-white">
                                    
                                    {/* Header de la ventana */}
                                    <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800/80 text-[11px]">
                                        <div className="flex items-center gap-1.5">
                                            <div className="size-2.5 rounded-full bg-rose-500" />
                                            <div className="size-2.5 rounded-full bg-amber-500" />
                                            <div className="size-2.5 rounded-full bg-emerald-500" />
                                        </div>
                                        <div className="flex items-center gap-2 text-slate-400 text-[10px]">
                                            <Search size={12} />
                                            <span className="size-4 rounded-full bg-slate-800 inline-block text-center text-[9px] font-bold">M</span>
                                        </div>
                                    </div>

                                    {/* Contenedor del panel */}
                                    <div className="grid grid-cols-12 gap-2 p-2 bg-slate-950/60 rounded-2xl">
                                        
                                        {/* Barra lateral interna oscura */}
                                        <div className="col-span-3 bg-[#0d1428] rounded-xl p-2.5 space-y-3 border border-slate-800/60 hidden sm:block">
                                            <div className="flex items-center gap-1.5 text-white font-black text-xs">
                                                <div className="size-4 rounded-md bg-[#4f46e5] flex items-center justify-center text-[9px]">⚡</div>
                                                <span>CitiOx</span>
                                            </div>
                                            <div className="space-y-1 text-[9px] font-bold text-slate-400">
                                                <div className="bg-[#4f46e5] text-white p-1 rounded-md flex items-center gap-1">
                                                    <span>📊</span> Panel
                                                </div>
                                                <div className="p-1 hover:text-white flex items-center gap-1">🛍️ Ventas</div>
                                                <div className="p-1 hover:text-white flex items-center gap-1">📦 Pedidos</div>
                                                <div className="p-1 hover:text-white flex items-center gap-1">🏷️ Productos</div>
                                                <div className="p-1 hover:text-white flex items-center gap-1">👥 Clientes</div>
                                                <div className="p-1 hover:text-white flex items-center gap-1">⚙️ Ajustes</div>
                                            </div>
                                        </div>

                                        {/* Área de contenido del panel (Fondo blanco pulcro) */}
                                        <div className="col-span-12 sm:col-span-9 bg-white text-slate-900 rounded-xl p-3.5 space-y-3 shadow-inner">
                                            
                                            {/* Saludo */}
                                            <div className="border-b border-slate-100 pb-2">
                                                <h3 className="font-extrabold text-xs text-slate-900 flex items-center gap-1">
                                                    ¡Hola, Mariana! 👋
                                                </h3>
                                                <p className="text-[10px] text-slate-400 font-medium">Resumen de tu negocio</p>
                                            </div>

                                            {/* 3 Tarjetas de estadísticas */}
                                            <div className="grid grid-cols-3 gap-2">
                                                <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                                                    <p className="text-[8px] font-bold text-slate-400 uppercase">Ventas totales</p>
                                                    <p className="text-xs font-black text-slate-900 mt-0.5">$24,680</p>
                                                    <span className="text-[8px] font-black text-emerald-600">+18.6% vs ayer</span>
                                                </div>
                                                <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                                                    <p className="text-[8px] font-bold text-slate-400 uppercase">Pedidos</p>
                                                    <p className="text-xs font-black text-slate-900 mt-0.5">342</p>
                                                    <span className="text-[8px] font-black text-emerald-600">+12.2% vs ayer</span>
                                                </div>
                                                <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                                                    <p className="text-[8px] font-bold text-slate-400 uppercase">Clientes</p>
                                                    <p className="text-xs font-black text-slate-900 mt-0.5">1,248</p>
                                                    <span className="text-[8px] font-black text-emerald-600">+21.3% vs ayer</span>
                                                </div>
                                            </div>

                                            {/* Órdenes recientes */}
                                            <div className="space-y-1.5 pt-1">
                                                <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Órdenes recientes</p>
                                                <div className="space-y-1 text-[9px] font-bold">
                                                    <div className="flex items-center justify-between p-1 bg-slate-50 rounded-md">
                                                        <div className="flex items-center gap-1.5">
                                                            <div className="size-4 rounded-full bg-indigo-100 text-indigo-700 font-black flex items-center justify-center text-[8px]">M</div>
                                                            <span>Orden #1258</span>
                                                            <span className="text-slate-400">• María G.</span>
                                                        </div>
                                                        <div className="flex items-center gap-1.5">
                                                            <span>$28.50</span>
                                                            <span className="px-1 py-0.2 rounded bg-emerald-100 text-emerald-700 text-[8px] font-black">Pagado</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center justify-between p-1 bg-slate-50 rounded-md">
                                                        <div className="flex items-center gap-1.5">
                                                            <div className="size-4 rounded-full bg-blue-100 text-blue-700 font-black flex items-center justify-center text-[8px]">C</div>
                                                            <span>Orden #1257</span>
                                                            <span className="text-slate-400">• Carlos L.</span>
                                                        </div>
                                                        <div className="flex items-center gap-1.5">
                                                            <span>$15.00</span>
                                                            <span className="px-1 py-0.2 rounded bg-amber-100 text-amber-800 text-[8px] font-black">En preparación</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center justify-between p-1 bg-slate-50 rounded-md">
                                                        <div className="flex items-center gap-1.5">
                                                            <div className="size-4 rounded-full bg-purple-100 text-purple-700 font-black flex items-center justify-center text-[8px]">A</div>
                                                            <span>Orden #1256</span>
                                                            <span className="text-slate-400">• Andrea P.</span>
                                                        </div>
                                                        <div className="flex items-center gap-1.5">
                                                            <span>$31.20</span>
                                                            <span className="px-1 py-0.2 rounded bg-sky-100 text-sky-700 text-[8px] font-black">Enviado</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                        </div>

                                    </div>

                                </div>

                                {/* 📱 MOCKUP TELÉFONO MÓVIL SUPERPUESTO (DERECHA) */}
                                <div className="absolute -bottom-8 -right-4 sm:-right-8 w-48 sm:w-56 bg-slate-950 p-2 rounded-[2.2rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] border-2 border-slate-800 animate-in fade-in slide-in-from-bottom-6 duration-700">
                                    
                                    {/* Notch */}
                                    <div className="w-16 h-3 bg-slate-950 rounded-full mx-auto mb-1 flex items-center justify-center">
                                        <div className="size-1 rounded-full bg-slate-800" />
                                    </div>

                                    {/* Pantalla PWA */}
                                    <div className="bg-slate-900 text-white rounded-[1.8rem] p-2.5 space-y-2 font-sans overflow-hidden">
                                        
                                        {/* Header Cliente */}
                                        <div className="flex items-center justify-between text-[8px] pb-1 border-b border-white/10">
                                            <div>
                                                <p className="font-extrabold text-white leading-none">¡Hola, Andrea!</p>
                                                <p className="text-[7px] text-slate-400">📍 Quito, Ecuador</p>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <div className="size-4 rounded-full bg-indigo-600 text-white text-[7px] font-black flex items-center justify-center">A</div>
                                            </div>
                                        </div>

                                        {/* Buscador */}
                                        <div className="bg-slate-800 px-2 py-1 rounded-md text-[8px] text-slate-400 flex items-center gap-1">
                                            <Search size={9} />
                                            <span>Buscar productos...</span>
                                        </div>

                                        {/* Banner Promo 20% OFF */}
                                        <div className="bg-gradient-to-r from-purple-700 to-indigo-700 p-2 rounded-xl flex items-center justify-between">
                                            <div>
                                                <p className="text-[7px] uppercase font-black text-indigo-200">Promo del día</p>
                                                <p className="text-[10px] font-black text-white">20% OFF en combos</p>
                                            </div>
                                            <span className="text-base">🍔</span>
                                        </div>

                                        {/* Categorías */}
                                        <div className="flex items-center justify-between text-[7px] font-bold text-slate-300 px-0.5">
                                            <div className="text-center"><span className="block text-xs">🍔</span>Burgers</div>
                                            <div className="text-center"><span className="block text-xs">🍕</span>Pizzas</div>
                                            <div className="text-center"><span className="block text-xs">🥤</span>Bebidas</div>
                                            <div className="text-center"><span className="block text-xs">🍰</span>Postres</div>
                                        </div>

                                        {/* Producto Popular */}
                                        <div className="bg-slate-800/90 p-1.5 rounded-lg border border-slate-700 flex items-center justify-between gap-1.5">
                                            <div className="size-8 rounded-md bg-amber-500/20 text-base flex items-center justify-center shrink-0">🍔</div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[8px] font-extrabold text-white truncate">Combo Clásico</p>
                                                <p className="text-[9px] font-black text-amber-400">$12.50</p>
                                            </div>
                                            <button className="bg-[#4f46e5] text-white px-2 py-1 rounded text-[8px] font-black shrink-0">
                                                Agregar
                                            </button>
                                        </div>

                                        {/* Bottom Nav móvil */}
                                        <div className="flex items-center justify-around text-[7px] text-slate-400 pt-1 border-t border-white/10">
                                            <span className="text-[#4f46e5] font-black">Inicio</span>
                                            <span>Pedidos</span>
                                            <span>Carrito</span>
                                            <span>Perfil</span>
                                        </div>

                                    </div>

                                </div>

                            </div>

                        </div>

                    </div>
                </div>
            </header>

            {/* ================= 4. FEATURE ICONS STRIP (FRANJA OSCURA CON 6 CAPACIDADES) ================= */}
            <section id="que-incluye" className="bg-[#0b1021] text-white py-14 border-y border-slate-800">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
                        
                        {/* 1. Tu negocio, tu marca */}
                        <div className="space-y-2 text-center sm:text-left">
                            <div className="size-11 rounded-2xl bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 flex items-center justify-center mx-auto sm:mx-0 shadow-sm">
                                <SlidersHorizontal size={20} />
                            </div>
                            <h3 className="font-extrabold text-xs text-white">Tu negocio, tu marca</h3>
                            <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
                                Personaliza tu sitio y app con tu identidad.
                            </p>
                        </div>

                        {/* 2. Apps para clientes */}
                        <div className="space-y-2 text-center sm:text-left">
                            <div className="size-11 rounded-2xl bg-teal-500/20 border border-teal-500/30 text-teal-400 flex items-center justify-center mx-auto sm:mx-0 shadow-sm">
                                <Smartphone size={20} />
                            </div>
                            <h3 className="font-extrabold text-xs text-white">Apps para clientes</h3>
                            <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
                                iOS y Android con tu marca y dominio propio.
                            </p>
                        </div>

                        {/* 3. Órdenes en línea */}
                        <div className="space-y-2 text-center sm:text-left">
                            <div className="size-11 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center mx-auto sm:mx-0 shadow-sm">
                                <Shield size={20} />
                            </div>
                            <h3 className="font-extrabold text-xs text-white">Órdenes en línea</h3>
                            <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
                                Recibe pedidos, reservas o compras 24/7.
                            </p>
                        </div>

                        {/* 4. Panel de control */}
                        <div className="space-y-2 text-center sm:text-left">
                            <div className="size-11 rounded-2xl bg-purple-500/20 border border-purple-500/30 text-purple-400 flex items-center justify-center mx-auto sm:mx-0 shadow-sm">
                                <Boxes size={20} />
                            </div>
                            <h3 className="font-extrabold text-xs text-white">Panel de control</h3>
                            <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
                                Administra todo tu negocio desde un solo lugar.
                            </p>
                        </div>

                        {/* 5. Promociones y campañas */}
                        <div className="space-y-2 text-center sm:text-left">
                            <div className="size-11 rounded-2xl bg-pink-500/20 border border-pink-500/30 text-pink-400 flex items-center justify-center mx-auto sm:mx-0 shadow-sm">
                                <Sparkles size={20} />
                            </div>
                            <h3 className="font-extrabold text-xs text-white">Promociones y campañas</h3>
                            <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
                                Crea ofertas y fideliza a tus clientes.
                            </p>
                        </div>

                        {/* 6. Reportes y métricas */}
                        <div className="space-y-2 text-center sm:text-left">
                            <div className="size-11 rounded-2xl bg-blue-500/20 border border-blue-500/30 text-blue-400 flex items-center justify-center mx-auto sm:mx-0 shadow-sm">
                                <BarChart3 size={20} />
                            </div>
                            <h3 className="font-extrabold text-xs text-white">Reportes y métricas</h3>
                            <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
                                Toma mejores decisiones con datos reales.
                            </p>
                        </div>

                    </div>
                </div>
            </section>

            {/* ================= 5. SECCIÓN: SOLUCIONES PARA CADA NEGOCIO ================= */}
            <section id="soluciones" className="py-20 max-w-7xl mx-auto px-6">
                
                {/* Header de la sección */}
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
                    <div className="space-y-2">
                        <div className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[#4f46e5]">
                            <span>⚛️</span>
                            <span>SOLUCIONES PARA CADA NEGOCIO</span>
                        </div>
                        <h2 className="text-3xl sm:text-4xl font-black text-slate-950 tracking-tight">
                            Elige el tipo de negocio que <span className="text-[#6366f1]">mejor te represente</span>
                        </h2>
                    </div>

                    <a 
                        href="#soluciones"
                        className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[#4f46e5] hover:text-[#4338ca] transition-colors"
                    >
                        VER TODOS LOS TIPOS &rarr;
                    </a>
                </div>

                {/* 5 Tarjetas de solución idénticas a la imagen */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
                    
                    {/* 1. Citas y Reservas */}
                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between group">
                        <div className="space-y-4">
                            <div className="size-12 rounded-2xl bg-purple-500 text-white flex items-center justify-center shadow-md shadow-purple-500/30">
                                <Calendar size={22} />
                            </div>
                            <div>
                                <h3 className="text-base font-black text-slate-900 group-hover:text-[#4f46e5] transition-colors">
                                    Citas y Reservas
                                </h3>
                                <p className="text-xs text-slate-500 font-medium mt-2 leading-relaxed">
                                    Spas, salones, barberías, clínicas y más.
                                </p>
                            </div>
                        </div>

                        <div className="pt-6 mt-4 border-t border-slate-100">
                            <Link 
                                href="/servicios"
                                className="text-xs font-black text-[#4f46e5] hover:underline flex items-center gap-1"
                            >
                                <span>Ver solución</span> &rarr;
                            </Link>
                        </div>
                    </div>

                    {/* 2. Restaurantes */}
                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between group">
                        <div className="space-y-4">
                            <div className="size-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/30">
                                <Store size={22} />
                            </div>
                            <div>
                                <h3 className="text-base font-black text-slate-900 group-hover:text-[#4f46e5] transition-colors">
                                    Restaurantes
                                </h3>
                                <p className="text-xs text-slate-500 font-medium mt-2 leading-relaxed">
                                    Pedidos en línea, delivery y para llevar con tu app.
                                </p>
                            </div>
                        </div>

                        <div className="pt-6 mt-4 border-t border-slate-100">
                            <Link 
                                href="/restaurantes"
                                className="text-xs font-black text-emerald-600 hover:underline flex items-center gap-1"
                            >
                                <span>Ver solución</span> &rarr;
                            </Link>
                        </div>
                    </div>

                    {/* 3. Canchas y Complejos */}
                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between group">
                        <div className="space-y-4">
                            <div className="size-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/30">
                                <Trophy size={22} />
                            </div>
                            <div>
                                <h3 className="text-base font-black text-slate-900 group-hover:text-[#4f46e5] transition-colors">
                                    Canchas y Complejos
                                </h3>
                                <p className="text-xs text-slate-500 font-medium mt-2 leading-relaxed">
                                    Reserva de canchas, piscinas, paintball y más.
                                </p>
                            </div>
                        </div>

                        <div className="pt-6 mt-4 border-t border-slate-100">
                            <Link 
                                href="/canchas"
                                className="text-xs font-black text-amber-600 hover:underline flex items-center gap-1"
                            >
                                <span>Ver solución</span> &rarr;
                            </Link>
                        </div>
                    </div>

                    {/* 4. Tienda en línea */}
                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between group">
                        <div className="space-y-4">
                            <div className="size-12 rounded-2xl bg-blue-500 text-white flex items-center justify-center shadow-md shadow-blue-500/30">
                                <ShoppingBag size={22} />
                            </div>
                            <div>
                                <h3 className="text-base font-black text-slate-900 group-hover:text-[#4f46e5] transition-colors">
                                    Tienda en línea
                                </h3>
                                <p className="text-xs text-slate-500 font-medium mt-2 leading-relaxed">
                                    Vende productos físicos o digitales con tu propia tienda.
                                </p>
                            </div>
                        </div>

                        <div className="pt-6 mt-4 border-t border-slate-100">
                            <Link 
                                href="/tiendas"
                                className="text-xs font-black text-blue-600 hover:underline flex items-center gap-1"
                            >
                                <span>Ver solución</span> &rarr;
                            </Link>
                        </div>
                    </div>

                    {/* 5. Gimnasios & Lavanderías */}
                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between group">
                        <div className="space-y-4">
                            <div className="size-12 rounded-2xl bg-rose-500 text-white flex items-center justify-center shadow-md shadow-rose-500/30">
                                <Dumbbell size={22} />
                            </div>
                            <div>
                                <h3 className="text-base font-black text-slate-900 group-hover:text-[#4f46e5] transition-colors">
                                    Gimnasios & Cuidado
                                </h3>
                                <p className="text-xs text-slate-500 font-medium mt-2 leading-relaxed">
                                    Planes, rutinas, lavandería y seguimiento de clientes.
                                </p>
                            </div>
                        </div>

                        <div className="pt-6 mt-4 border-t border-slate-100">
                            <Link 
                                href="/lavanderias"
                                className="text-xs font-black text-rose-600 hover:underline flex items-center gap-1"
                            >
                                <span>Ver solución</span> &rarr;
                            </Link>
                        </div>
                    </div>

                </div>

            </section>

            {/* ================= 6. MÉTRICAS & TESTIMONIO (FRANJA DE CONFIANZA) ================= */}
            <section id="testimonios" className="py-16 max-w-7xl mx-auto px-6">
                <div className="bg-[#f5f4fa] rounded-[2.5rem] p-6 sm:p-10 border border-slate-200/80">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                        
                        {/* 3 Métricas */}
                        <div className="lg:col-span-6 grid grid-cols-3 gap-4 text-center">
                            
                            <div className="space-y-1">
                                <div className="size-10 rounded-xl bg-indigo-100 text-indigo-700 mx-auto flex items-center justify-center mb-2">
                                    <Users size={18} />
                                </div>
                                <p className="text-2xl sm:text-3xl font-black text-slate-950">+2,500</p>
                                <p className="text-[11px] font-bold text-slate-500 leading-tight">
                                    Negocios activos que ya confían en Citiox
                                </p>
                            </div>

                            <div className="space-y-1">
                                <div className="size-10 rounded-xl bg-sky-100 text-sky-700 mx-auto flex items-center justify-center mb-2">
                                    <TrendingUp size={18} />
                                </div>
                                <p className="text-2xl sm:text-3xl font-black text-slate-950">+150K</p>
                                <p className="text-[11px] font-bold text-slate-500 leading-tight">
                                    Órdenes procesadas cada mes en la plataforma
                                </p>
                            </div>

                            <div className="space-y-1">
                                <div className="size-10 rounded-xl bg-amber-100 text-amber-600 mx-auto flex items-center justify-center mb-2">
                                    <Star size={18} className="fill-amber-500 text-amber-500" />
                                </div>
                                <p className="text-2xl sm:text-3xl font-black text-slate-950">4.9/5</p>
                                <p className="text-[11px] font-bold text-slate-500 leading-tight">
                                    Calificación promedio de nuestros clientes
                                </p>
                            </div>

                        </div>

                        {/* Testimonio Destacado */}
                        <div className="lg:col-span-6">
                            <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-100 shadow-md space-y-4 relative">
                                <span className="text-4xl text-[#4f46e5]/20 font-serif leading-none absolute top-4 left-4">“</span>
                                <p className="text-slate-700 text-xs sm:text-sm font-semibold italic leading-relaxed pt-2 pl-4">
                                    “Citiox transformó mi negocio. Ahora mis clientes pueden reservar y pedir en línea 24/7. ¡Totalmente recomendado!”
                                </p>

                                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                                    <div className="flex items-center gap-3">
                                        <div className="size-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 text-white font-black flex items-center justify-center text-sm shadow-sm">
                                            A
                                        </div>
                                        <div>
                                            <p className="font-black text-xs text-slate-900">— Andrés R.</p>
                                            <p className="text-[11px] text-slate-500 font-medium">Restaurante La Esquina</p>
                                        </div>
                                    </div>

                                    {/* 5 Stars */}
                                    <div className="flex items-center gap-0.5 text-amber-400">
                                        <Star size={14} className="fill-amber-400" />
                                        <Star size={14} className="fill-amber-400" />
                                        <Star size={14} className="fill-amber-400" />
                                        <Star size={14} className="fill-amber-400" />
                                        <Star size={14} className="fill-amber-400" />
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </section>

            {/* ================= 7. SECCIÓN DE PRECIOS & PLANES ================= */}
            <section id="precios" className="py-20 bg-white border-t border-slate-100">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center max-w-3xl mx-auto mb-14 space-y-3">
                        <span className="px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                            Planes Transparentes
                        </span>
                        <h2 className="text-3xl sm:text-4xl font-black text-slate-950 tracking-tight">
                            Comienza gratis. Escala sin límites.
                        </h2>
                        <p className="text-slate-600 text-sm font-medium">
                            15 días de prueba completa en todas las soluciones. Sin compromiso.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto items-stretch">
                        
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
                        <div className="bg-gradient-to-b from-[#131938] via-[#0f142b] to-[#0a0d1d] text-white p-8 rounded-3xl border-2 border-amber-400 shadow-2xl space-y-6 flex flex-col justify-between relative">
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
                                    <li className="flex items-center gap-2"><Check size={15} className="text-amber-400" /> Soporte prioritario VIP</li>
                                </ul>
                            </div>
                            <Link
                                href="/register?plan=founder"
                                className="w-full py-4 bg-gradient-to-r from-amber-400 to-amber-500 hover:brightness-110 text-slate-950 rounded-xl font-black text-xs uppercase tracking-wider text-center transition-all shadow-xl shadow-amber-400/20 active:scale-95"
                            >
                                ASEGURAR TARIFA FUNDADOR &rarr;
                            </Link>
                        </div>

                        {/* Plan Pro */}
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
                                    <li className="flex items-center gap-2"><Check size={15} className="text-emerald-500" /> Reportes financieros avanzados</li>
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

            {/* ================= 8. BOTTOM CTA BANNER (COHETE / SIGUIENTE NIVEL) ================= */}
            <section className="py-14 max-w-7xl mx-auto px-6">
                <div className="bg-gradient-to-r from-[#0b1026] via-[#10183b] to-[#1c1242] rounded-[2.5rem] p-8 sm:p-12 text-white shadow-2xl relative overflow-hidden">
                    
                    {/* Glows decorativos */}
                    <div className="absolute top-0 right-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl -z-0" />
                    
                    <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
                        
                        {/* Cohete + Textos */}
                        <div className="flex items-center gap-6 text-center lg:text-left">
                            <div className="text-6xl sm:text-7xl shrink-0 animate-bounce duration-1000 hidden sm:block">
                                🚀
                            </div>
                            <div className="space-y-2">
                                <h2 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">
                                    Empieza hoy mismo <br />
                                    y lleva tu negocio al <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-indigo-300 to-purple-300">siguiente nivel</span>
                                </h2>
                                <p className="text-slate-300 text-xs sm:text-sm font-medium">
                                    Prueba gratuita • Sin tarjeta de crédito • Configuración en minutos
                                </p>
                            </div>
                        </div>

                        {/* Botón CTA + Avatares */}
                        <div className="flex flex-col items-center lg:items-end gap-3 shrink-0">
                            <a
                                href="#soluciones"
                                className="bg-white hover:bg-slate-100 text-slate-950 px-8 py-3.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-xl active:scale-95 cursor-pointer"
                            >
                                CREA TU NEGOCIO GRATIS &rarr;
                            </a>

                            <div className="flex items-center gap-2 text-[11px] text-slate-300 font-bold">
                                <div className="flex -space-x-2">
                                    <div className="size-6 rounded-full bg-indigo-500 border-2 border-slate-900 text-[9px] flex items-center justify-center font-black">👨‍🍳</div>
                                    <div className="size-6 rounded-full bg-pink-500 border-2 border-slate-900 text-[9px] flex items-center justify-center font-black">💇</div>
                                    <div className="size-6 rounded-full bg-emerald-500 border-2 border-slate-900 text-[9px] flex items-center justify-center font-black">⚽</div>
                                </div>
                                <span>Únete a miles de emprendedores exitosos</span>
                            </div>
                        </div>

                    </div>
                </div>
            </section>

            {/* ================= 9. FOOTER SAAS PROFESIONAL ================= */}
            <footer className="bg-white border-t border-slate-200/80 py-16 text-slate-500 text-xs">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 pb-12 border-b border-slate-100">
                        
                        {/* Columna 1: Marca */}
                        <div className="col-span-2 md:col-span-1 space-y-4">
                            <div className="flex items-center gap-2">
                                <CitioxLogo className="h-8 w-auto" />
                                <span className="text-xl font-black text-slate-900">Citi<span className="text-[#4f46e5]">Ox</span></span>
                            </div>
                            <p className="text-xs text-slate-500 font-medium leading-relaxed">
                                Plataforma digital completa para cualquier negocio. Crea tu presencia en línea, conecta con clientes y administra tus operaciones.
                            </p>
                        </div>

                        {/* Columna 2: Citiox */}
                        <div className="space-y-3">
                            <p className="text-xs font-black uppercase tracking-wider text-slate-900">Citiox</p>
                            <ul className="space-y-2 font-bold">
                                <li><a href="#" className="hover:text-slate-900 transition-colors">Inicio</a></li>
                                <li><a href="#como-funciona" className="hover:text-slate-900 transition-colors">Cómo funciona</a></li>
                                <li><a href="#soluciones" className="hover:text-slate-900 transition-colors">Soluciones</a></li>
                                <li><a href="#precios" className="hover:text-slate-900 transition-colors">Precios</a></li>
                                <li><Link href="/login" className="hover:text-slate-900 transition-colors">Iniciar sesión</Link></li>
                            </ul>
                        </div>

                        {/* Columna 3: Soluciones */}
                        <div className="space-y-3">
                            <p className="text-xs font-black uppercase tracking-wider text-slate-900">Soluciones</p>
                            <ul className="space-y-2 font-bold">
                                <li><Link href="/servicios" className="hover:text-slate-900 transition-colors">Citas y Reservas</Link></li>
                                <li><Link href="/restaurantes" className="hover:text-slate-900 transition-colors">Restaurantes</Link></li>
                                <li><Link href="/canchas" className="hover:text-slate-900 transition-colors">Canchas y Complejos</Link></li>
                                <li><Link href="/tiendas" className="hover:text-slate-900 transition-colors">Tienda en línea</Link></li>
                                <li><Link href="/lavanderias" className="hover:text-slate-900 transition-colors">Lavanderías & Calzado</Link></li>
                            </ul>
                        </div>

                        {/* Columna 4: Empresa */}
                        <div className="space-y-3">
                            <p className="text-xs font-black uppercase tracking-wider text-slate-900">Empresa</p>
                            <ul className="space-y-2 font-bold">
                                <li><Link href="/demo" className="hover:text-slate-900 transition-colors">Demos en vivo</Link></li>
                                <li><Link href="/terminos" className="hover:text-slate-900 transition-colors">Términos de servicio</Link></li>
                                <li><Link href="/privacidad" className="hover:text-slate-900 transition-colors">Política de privacidad</Link></li>
                                <li><a href="mailto:soporte@citiox.com" className="hover:text-slate-900 transition-colors">Contacto</a></li>
                            </ul>
                        </div>

                    </div>

                    <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] font-bold text-slate-400">
                        <p>© 2026 CitiOx. Todos los derechos reservados. Plataforma Digital para Negocios.</p>
                        <p className="text-[#4f46e5]">«empieza a crecer tu negocio»</p>
                    </div>
                </div>
            </footer>

        </div>
    );
}
