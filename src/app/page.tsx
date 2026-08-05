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
    Youtube
} from 'lucide-react';

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

    return (
        <div className="min-h-screen bg-slate-50/50 text-slate-900 font-sans selection:bg-indigo-500 selection:text-white overflow-x-hidden">
            
            {/* ================= 1. TOP BANNER / BARRA DE ANUNCIO ================= */}
            <div className="bg-gradient-to-r from-purple-700 via-indigo-600 to-purple-800 py-2.5 px-4 relative z-50 text-white text-center shadow-md">
                <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-center gap-3 text-xs md:text-sm font-bold">
                    <span className="flex items-center gap-1.5">
                        <span className="text-amber-300">🔥</span>
                        <span className="font-extrabold uppercase tracking-wide">ÚLTIMOS CUPOS FUNDADORES:</span>
                        <span>Quedan <strong className="underline text-amber-300">{cuposDisponibles} de {founderMax}</strong> con tarifa especial de <strong>${founderPrice}/mes</strong> de por vida.</span>
                    </span>
                    <Link 
                        href="#fundadores" 
                        className="bg-white text-indigo-950 px-3.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider hover:bg-amber-300 hover:text-slate-950 transition-all shadow-sm flex items-center gap-1"
                    >
                        QUIERO MI DESCUENTO &rarr;
                    </Link>
                </div>
            </div>

            {/* ================= 2. NAVBAR (NAVEGACIÓN) ================= */}
            <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-100/80 shadow-xs">
                <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-2.5 group">
                        <CitioxLogo className="h-10 w-auto group-hover:scale-105 transition-transform" />
                        <span className="text-2xl font-black tracking-tight text-slate-900 flex items-center">
                            Citi<span className="text-indigo-600">Ox</span>
                        </span>
                    </Link>
                    
                    {/* Links centrales */}
                    <div className="hidden lg:flex items-center gap-8 text-xs font-bold text-slate-600">
                        <a href="#funcionalidades" className="hover:text-indigo-600 transition-colors flex items-center gap-1">
                            Funcionalidades <span className="text-[10px]">▾</span>
                        </a>
                        <a href="#precios" className="hover:text-indigo-600 transition-colors">Precios</a>
                        <a href="#sectores" className="hover:text-indigo-600 transition-colors">Sectores</a>
                        <a href="#demo" className="hover:text-indigo-600 transition-colors flex items-center gap-1">
                            Recursos <span className="text-[10px]">▾</span>
                        </a>
                    </div>

                    {/* Botones de acción */}
                    <div className="flex items-center gap-3">
                        <Link
                            href="/login"
                            className="text-xs font-bold text-slate-700 hover:text-indigo-600 px-3 py-2 transition-colors"
                        >
                            Iniciar sesión
                        </Link>
                        <Link
                            href="/register"
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-md shadow-indigo-200 hover:shadow-indigo-300 active:scale-95 flex items-center gap-1.5"
                        >
                            CREAR MI NEGOCIO GRATIS &rarr;
                        </Link>
                    </div>
                </div>
            </nav>

            {/* ================= 3. HERO SECTION ================= */}
            <header className="relative pt-12 md:pt-16 pb-20 bg-gradient-to-b from-purple-50/40 via-white to-slate-50/50 overflow-hidden">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
                        
                        {/* Columna Izquierda: Texto y CTA */}
                        <div className="lg:col-span-6 space-y-8 text-left">
                            
                            {/* Badge Pill */}
                            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-full text-xs font-bold uppercase tracking-wider">
                                <span>⚡</span> EL ESTÁNDAR DIGITAL EN GESTIÓN DE CITAS Y RESERVAS
                            </div>
                            
                            {/* Headline */}
                            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-slate-950 tracking-tight leading-[1.08]">
                                Gestiona <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-500 via-indigo-600 to-purple-600">tus citas</span> <br />
                                sin responder <br />
                                <span className="text-indigo-600 italic underline decoration-indigo-200 underline-offset-8">ni un mensaje.</span>
                            </h1>
                            
                            {/* Subtitle */}
                            <p className="text-slate-600 text-base md:text-lg font-medium leading-relaxed max-w-xl">
                                Automatiza reservas por WhatsApp, confirma al instante, reduce ausencias y haz crecer tu negocio con tecnología diseñada para profesionales.
                            </p>

                            {/* Checkmarks */}
                            <div className="flex flex-wrap gap-4 text-xs font-bold text-slate-700">
                                <span className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-full border border-slate-200/80 shadow-2xs">
                                    <CheckCircle2 size={15} className="text-indigo-600" /> 100% Automático
                                </span>
                                <span className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-full border border-slate-200/80 shadow-2xs">
                                    <CheckCircle2 size={15} className="text-indigo-600" /> Sin comisiones
                                </span>
                                <span className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-full border border-slate-200/80 shadow-2xs">
                                    <CheckCircle2 size={15} className="text-indigo-600" /> Fácil de usar
                                </span>
                            </div>
                            
                            {/* Botones principales */}
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2">
                                <Link
                                    href="/register"
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-wider text-center transition-all shadow-xl shadow-indigo-200 active:scale-95 flex items-center justify-center gap-2"
                                >
                                    CREAR MI NEGOCIO GRATIS &rarr;
                                </Link>
                                <Link
                                    href="/demo"
                                    className="bg-white hover:bg-slate-50 text-slate-800 border-2 border-slate-200 px-8 py-4 rounded-2xl font-bold text-xs uppercase tracking-wider text-center transition-all shadow-xs flex items-center justify-center gap-2"
                                >
                                    <PlayCircle size={18} className="text-indigo-600" />
                                    VER DEMO
                                </Link>
                            </div>

                            {/* Integrado con lo que ya usas */}
                            <div className="pt-6 border-t border-slate-200/60 space-y-3">
                                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                    Integrado con lo que ya usas:
                                </p>
                                <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-slate-600">
                                    <span className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-3.5 py-1.5 rounded-xl border border-emerald-100/80 shadow-2xs">
                                        <MessageCircle size={15} /> WhatsApp
                                    </span>
                                    <span className="flex items-center gap-1.5 bg-pink-50 text-pink-700 px-3.5 py-1.5 rounded-xl border border-pink-100/80 shadow-2xs">
                                        <Instagram size={15} /> Instagram
                                    </span>
                                    <span className="flex items-center gap-1.5 bg-indigo-50 text-indigo-700 px-3.5 py-1.5 rounded-xl border border-indigo-100/80 shadow-2xs">
                                        <Facebook size={15} /> Facebook
                                    </span>
                                    <span className="flex items-center gap-1.5 bg-slate-100 text-slate-700 px-3.5 py-1.5 rounded-xl border border-slate-200/80 shadow-2xs">
                                        <Globe size={15} /> Web Portal
                                    </span>
                                    <span className="flex items-center gap-1.5 bg-sky-50 text-sky-700 px-3.5 py-1.5 rounded-xl border border-sky-100/80 shadow-2xs">
                                        <Smartphone size={15} /> PWA App
                                    </span>
                                </div>
                            </div>

                        </div>

                        {/* Columna Derecha: Mockups visuales flotantes */}
                        <div className="lg:col-span-6 relative flex justify-center items-center">
                            
                            {/* Fondo decorativo con resplandor ambiente multi-capa */}
                            <div className="absolute w-[520px] h-[520px] bg-gradient-to-tr from-sky-300/40 via-indigo-300/50 to-purple-300/40 rounded-full blur-3xl opacity-70 -z-10 animate-pulse" />

                            {/* Contenedor Mockup Móvil + Tarjetas Flotantes */}
                            <div className="relative w-full max-w-md mx-auto py-4">
                                
                                {/* Smartphone Mockup Principal */}
                                <div className="relative mx-auto bg-slate-950 p-2.5 rounded-[3.2rem] shadow-[0_25px_70px_-15px_rgba(79,70,229,0.35)] border border-slate-800/80 ring-1 ring-white/20 w-[290px] sm:w-[320px] aspect-[9/18.5] transition-transform duration-500 hover:scale-[1.01]">
                                    
                                    {/* Isla Dinámica / Notch */}
                                    <div className="absolute top-3 left-1/2 -translate-x-1/2 w-24 h-4 bg-slate-950 rounded-full z-30 flex items-center justify-end px-2 gap-1 border border-slate-800/50">
                                        <div className="size-1.5 rounded-full bg-emerald-400 animate-ping" />
                                        <div className="size-2 rounded-full bg-indigo-500" />
                                    </div>
                                    
                                    {/* Pantalla PWA Ultra Premium */}
                                    <div className="w-full h-full bg-gradient-to-b from-indigo-600 via-indigo-700 to-purple-900 p-4 pt-10 text-white space-y-3.5 font-sans overflow-hidden rounded-[2.6rem] relative">
                                        
                                        {/* Cabecera del App */}
                                        <div className="flex items-center justify-between pb-1 border-b border-white/10">
                                            <div className="flex items-center gap-2">
                                                <div className="size-8 rounded-full bg-gradient-to-tr from-amber-300 to-amber-500 text-slate-950 font-black text-xs flex items-center justify-center border border-white/30 shadow-sm">
                                                    M
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-bold text-indigo-100/90 leading-none">¡Hola, María! 👋</p>
                                                    <p className="text-xs font-black text-white mt-0.5 tracking-tight">Estética & Spa Bella</p>
                                                </div>
                                            </div>
                                            <div className="size-7 bg-white/15 backdrop-blur-md rounded-full flex items-center justify-center text-xs border border-white/20">🔔</div>
                                        </div>

                                        {/* Card Próxima Cita */}
                                        <div className="bg-white/15 backdrop-blur-xl rounded-2xl p-3 border border-white/25 shadow-lg space-y-2 relative overflow-hidden">
                                            <div className="flex justify-between items-center">
                                                <span className="text-[9px] font-black bg-emerald-400 text-slate-950 px-2 py-0.5 rounded-md uppercase tracking-wider shadow-xs">Cita Hoy</span>
                                                <span className="text-[9px] font-extrabold text-emerald-300 flex items-center gap-1">● Confirmada</span>
                                            </div>
                                            <div>
                                                <p className="text-xs font-black text-white">Hidratación Facial + Limpieza</p>
                                                <p className="text-[10px] text-indigo-100 font-medium mt-0.5">12:00 PM • Especialista Carlos R.</p>
                                            </div>
                                        </div>

                                        {/* Card Club CitiOx Rewards */}
                                        <div className="bg-white text-slate-900 rounded-2xl p-3.5 shadow-xl space-y-2 border border-white/80">
                                            <div className="flex justify-between items-center">
                                                <span className="text-[10px] font-black text-indigo-600 uppercase tracking-wider flex items-center gap-1">
                                                    👑 Club CitiOx
                                                </span>
                                                <span className="text-[9px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-bold border border-indigo-100">Nivel VIP 2</span>
                                            </div>
                                            <div className="flex items-baseline justify-between">
                                                <p className="text-sm font-black text-slate-900">350 Diamantes 💎</p>
                                                <span className="text-[9px] font-bold text-slate-400">70% completado</span>
                                            </div>
                                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden p-0.5">
                                                <div className="bg-gradient-to-r from-indigo-500 to-purple-600 h-full rounded-full w-[70%] shadow-xs" />
                                            </div>
                                        </div>

                                        {/* Card Misiones Activas */}
                                        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/20 space-y-1.5">
                                            <div className="flex justify-between items-center">
                                                <p className="text-[10px] font-black uppercase tracking-wider text-indigo-100">🎯 Desafíos Activos</p>
                                                <span className="text-[9px] font-bold bg-amber-400/20 text-amber-300 px-1.5 py-0.5 rounded border border-amber-300/30">+50 pts</span>
                                            </div>
                                            <div className="space-y-1 text-[9px] font-medium text-indigo-100/90">
                                                <p className="flex items-center gap-1.5">
                                                    <span className="text-emerald-400 font-bold">✓</span> Completa 5 reservas seguidas
                                                </p>
                                                <p className="flex items-center gap-1.5">
                                                    <span className="text-emerald-400 font-bold">✓</span> Refiere a un amigo a la App
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Floating Card 1: Agenda Inteligente (Top Right) */}
                                <div className="absolute -top-2 -right-3 sm:-right-8 bg-white/95 backdrop-blur-xl p-4 rounded-2xl shadow-2xl shadow-indigo-900/15 border border-slate-100 space-y-2.5 w-52 text-left hidden sm:block hover:scale-105 transition-all duration-300">
                                    <div className="flex items-center justify-between">
                                        <p className="text-[10px] font-black text-slate-900 uppercase tracking-wider">Agenda inteligente</p>
                                        <span className="size-2 rounded-full bg-indigo-600 animate-pulse" />
                                    </div>
                                    <div className="flex justify-between text-[8px] font-bold text-slate-400 border-b border-slate-100 pb-1.5">
                                        <span>LUN 30</span>
                                        <span>MAR 31</span>
                                        <span className="text-indigo-600 font-black underline underline-offset-2">MIÉ 1</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-1.5 text-[9px] font-bold">
                                        <span className="bg-slate-100/90 text-slate-600 p-1.5 rounded-xl text-center border border-slate-200/50">11:00 AM</span>
                                        <span className="bg-indigo-600 text-white p-1.5 rounded-xl text-center shadow-md shadow-indigo-200">12:00 PM</span>
                                    </div>
                                </div>

                                {/* Floating Card 2: Confirmación por WhatsApp (Middle Right) */}
                                <div className="absolute top-1/3 -right-5 sm:-right-12 bg-white/95 backdrop-blur-xl p-4 rounded-2xl shadow-2xl shadow-emerald-900/15 border border-slate-100 space-y-2 w-56 text-left hidden sm:block hover:scale-105 transition-all duration-300">
                                    <div className="flex items-center justify-between text-[9px] font-black text-emerald-600">
                                        <span className="flex items-center gap-1.5">
                                            <MessageCircle size={13} fill="currentColor" /> Notificación WhatsApp
                                        </span>
                                        <span className="text-[8px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold">Automática</span>
                                    </div>
                                    <div className="bg-emerald-50/80 p-2.5 rounded-xl border border-emerald-100 text-[10px] text-slate-800 space-y-0.5">
                                        <p className="font-black text-emerald-950 flex items-center gap-1">
                                            <span>Cita confirmada</span>
                                            <CheckCircle2 size={12} className="text-emerald-600 fill-emerald-100" />
                                        </p>
                                        <p className="text-[9px] text-slate-600 font-medium">Miércoles 22 • 12:00 PM</p>
                                        <p className="text-[8px] text-emerald-700 font-bold mt-1">¡Recordatorio enviado al cliente!</p>
                                    </div>
                                </div>

                                {/* Floating Card 3: Menos ausencias (Bottom Right) */}
                                <div className="absolute -bottom-4 -right-2 sm:-right-6 bg-white/95 backdrop-blur-xl p-4 rounded-2xl shadow-2xl shadow-purple-900/15 border border-slate-100 space-y-1 w-48 text-left hidden sm:block hover:scale-105 transition-all duration-300">
                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Menos ausencias</p>
                                    <div className="flex items-baseline gap-2">
                                        <p className="text-3xl font-black text-indigo-600 leading-none tracking-tight">-68%</p>
                                        <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md">↓ Ausencias</span>
                                    </div>
                                    <p className="text-[9px] font-bold text-slate-600 pt-0.5">Asistencia confirmada este mes</p>
                                </div>

                                {/* Badge inferior: PWA */}
                                <div className="mt-6 flex justify-center">
                                    <div className="bg-white/95 backdrop-blur-md px-5 py-2.5 rounded-2xl shadow-lg border border-slate-200/80 inline-flex items-center gap-2 text-xs font-bold text-slate-800 hover:shadow-xl transition-all">
                                        <span className="text-base">📲</span>
                                        <span>PWA • Instalable en iPhone, Android y PC</span>
                                    </div>
                                </div>

                            </div>

                        </div>

                    </div>
                </div>
            </header>

            {/* ================= 4. MÉTRICAS DE SOCIAL PROOF ================= */}
            <section className="py-16 bg-white border-y border-slate-100">
                <div className="max-w-7xl mx-auto px-6 text-center space-y-8">
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400">
                        Miles de negocios ya confían en CitiOx
                    </p>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                        <div className="space-y-1">
                            <p className="text-3xl md:text-4xl font-black text-indigo-600">+2,500</p>
                            <p className="text-xs font-bold text-slate-600">Negocios activos</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-3xl md:text-4xl font-black text-indigo-600">+250,000</p>
                            <p className="text-xs font-bold text-slate-600">Citas gestionadas</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-3xl md:text-4xl font-black text-indigo-600">+1M</p>
                            <p className="text-xs font-bold text-slate-600">Clientes satisfechos</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-3xl md:text-4xl font-black text-indigo-600">-70%</p>
                            <p className="text-xs font-bold text-slate-600">Ausencias de citas</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* ================= 5. FUNCIONALIDADES (TODO LO QUE NECESITAS) ================= */}
            <section id="funcionalidades" className="py-24 bg-slate-50/70">
                <div className="max-w-7xl mx-auto px-6 text-center space-y-16">
                    
                    <div className="space-y-3 max-w-2xl mx-auto">
                        <h2 className="text-3xl md:text-5xl font-black text-slate-950 tracking-tight">
                            Todo lo que necesitas para <br />
                            <span className="text-indigo-600">automatizar y crecer</span>
                        </h2>
                        <p className="text-slate-600 text-base font-medium">
                            Un sistema completo, simple y poderoso.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 text-left">
                        
                        {/* Feature 1 */}
                        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all space-y-4 group">
                            <div className="size-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <MessageCircle size={28} />
                            </div>
                            <h3 className="text-lg font-black text-slate-900">Reservas por WhatsApp</h3>
                            <p className="text-sm text-slate-600 font-medium leading-relaxed">
                                Tus clientes reservan, reagendan o cancelan sin salir de WhatsApp. 100% automático.
                            </p>
                        </div>

                        {/* Feature 2 */}
                        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all space-y-4 group">
                            <div className="size-14 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Calendar size={28} />
                            </div>
                            <h3 className="text-lg font-black text-slate-900">Agenda Inteligente</h3>
                            <p className="text-sm text-slate-600 font-medium leading-relaxed">
                                Sin dobles reservas. Bloqueos, buffers y disponibilidad en tiempo real.
                            </p>
                        </div>

                        {/* Feature 3 */}
                        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all space-y-4 group">
                            <div className="size-14 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Award size={28} />
                            </div>
                            <h3 className="text-lg font-black text-slate-900">Club de Fidelización</h3>
                            <p className="text-sm text-slate-600 font-medium leading-relaxed">
                                Gamificación, niveles, misiones, diamantes y premios que hacen volver a tus clientes.
                            </p>
                        </div>

                        {/* Feature 4 */}
                        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all space-y-4 group">
                            <div className="size-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Bell size={28} />
                            </div>
                            <h3 className="text-lg font-black text-slate-900">Recordatorios Automáticos</h3>
                            <p className="text-sm text-slate-600 font-medium leading-relaxed">
                                Reduce ausencias con recordatorios por WhatsApp totalmente automatizados.
                            </p>
                        </div>

                        {/* Feature 5 */}
                        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all space-y-4 group">
                            <div className="size-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <BarChart3 size={28} />
                            </div>
                            <h3 className="text-lg font-black text-slate-900">Reportes y Analytics</h3>
                            <p className="text-sm text-slate-600 font-medium leading-relaxed">
                                Conoce tus ingresos, clientes más frecuentes, servicios más solicitados y más.
                            </p>
                        </div>

                        {/* Feature 6 */}
                        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all space-y-4 group">
                            <div className="size-14 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Globe size={28} />
                            </div>
                            <h3 className="text-lg font-black text-slate-900">Tu sitio web tipo app</h3>
                            <p className="text-sm text-slate-600 font-medium leading-relaxed">
                                Tu negocio en línea 24/7 con tu marca, servicios, galería, ubicación y más.
                            </p>
                        </div>

                    </div>

                    <div>
                        <a 
                            href="#precios" 
                            className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-indigo-600 hover:text-indigo-700 transition-colors"
                        >
                            VER TODAS LAS FUNCIONALIDADES &rarr;
                        </a>
                    </div>

                </div>
            </section>

            {/* ================= 6. DEMO INTERACTIVA / VIDEO ================= */}
            <section id="demo" className="py-24 bg-white overflow-hidden">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="bg-slate-900 rounded-[3rem] p-8 md:p-16 flex flex-col lg:flex-row items-center gap-12 text-white shadow-2xl relative">
                        
                        {/* Texto Izquierdo */}
                        <div className="lg:w-5/12 space-y-6 text-left">
                            <h2 className="text-3xl md:text-4xl font-black tracking-tight leading-tight">
                                Pruébalo en 2 minutos
                            </h2>
                            <p className="text-indigo-300 font-bold text-sm uppercase tracking-wider">
                                Así de simple funciona
                            </p>

                            <div className="space-y-3 text-sm font-medium text-slate-300">
                                <p className="flex items-center gap-2">
                                    <CheckCircle2 size={18} className="text-indigo-400 shrink-0" />
                                    Agenda tu demo personalizada
                                </p>
                                <p className="flex items-center gap-2">
                                    <CheckCircle2 size={18} className="text-indigo-400 shrink-0" />
                                    Te mostramos cómo funciona en vivo
                                </p>
                                <p className="flex items-center gap-2">
                                    <CheckCircle2 size={18} className="text-indigo-400 shrink-0" />
                                    Resolvemos todas tus dudas
                                </p>
                            </div>

                            <div className="pt-4">
                                <Link
                                    href="/demo"
                                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-wider inline-flex items-center gap-2 transition-all shadow-lg active:scale-95"
                                >
                                    <Play size={16} fill="currentColor" />
                                    VER DEMO AHORA &rarr;
                                </Link>
                            </div>
                        </div>

                        {/* Mockup de Laptop + Móvil Derecha */}
                        <div className="lg:w-7/12 relative flex justify-center items-center">
                            <div className="w-full bg-gradient-to-tr from-indigo-600 via-purple-600 to-indigo-800 rounded-[2.5rem] p-6 shadow-2xl relative flex items-center justify-center">
                                {/* Pantalla principal */}
                                <div className="bg-slate-950 rounded-2xl overflow-hidden border border-white/10 shadow-2xl relative w-full aspect-video flex items-center justify-center">
                                    <img 
                                        src="/hero-spa-mockup.png" 
                                        alt="Demo Preview" 
                                        className="w-full h-full object-cover opacity-60"
                                    />
                                    {/* Botón de Play Central */}
                                    <Link 
                                        href="/demo" 
                                        className="absolute size-16 bg-white text-indigo-600 rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition-transform group"
                                    >
                                        <Play size={28} fill="currentColor" className="ml-1 group-hover:scale-110 transition-transform" />
                                    </Link>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </section>

            {/* ================= 7. TESTIMONIOS ================= */}
            <section className="py-24 bg-slate-50/70">
                <div className="max-w-7xl mx-auto px-6 text-center space-y-16">
                    
                    <div className="space-y-3 max-w-2xl mx-auto">
                        <h2 className="text-3xl md:text-4xl font-black text-slate-950">
                            Negocios que ya están <span className="text-indigo-600">creciendo</span> con CitiOx
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
                        
                        {/* Testimonio 1 */}
                        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-4 flex flex-col justify-between">
                            <div className="space-y-3">
                                <div className="flex gap-1 text-amber-400 text-sm">★★★★★</div>
                                <p className="text-sm text-slate-700 font-medium leading-relaxed">
                                    "Antes perdíamos muchas citas por ausencias. Ahora con los recordatorios automáticos se redujeron <strong>70%</strong>."
                                </p>
                            </div>
                            <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                                <div className="size-10 bg-indigo-100 rounded-full flex items-center justify-center font-bold text-indigo-700 text-sm">
                                    CM
                                </div>
                                <div>
                                    <p className="text-xs font-black text-slate-900">Carolina M.</p>
                                    <p className="text-[10px] text-slate-500 font-medium">Salón de Belleza • Quito</p>
                                </div>
                            </div>
                        </div>

                        {/* Testimonio 2 */}
                        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-4 flex flex-col justify-between">
                            <div className="space-y-3">
                                <div className="flex gap-1 text-amber-400 text-sm">★★★★★</div>
                                <p className="text-sm text-slate-700 font-medium leading-relaxed">
                                    "Mis clientes aman el sistema de puntos y premios. Vuelven más seguido y gastan más."
                                </p>
                            </div>
                            <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                                <div className="size-10 bg-emerald-100 rounded-full flex items-center justify-center font-bold text-emerald-700 text-sm">
                                    AR
                                </div>
                                <div>
                                    <p className="text-xs font-black text-slate-900">Andrés R.</p>
                                    <p className="text-[10px] text-slate-500 font-medium">Barbería Premium • Guayaquil</p>
                                </div>
                            </div>
                        </div>

                        {/* Testimonio 3 */}
                        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-4 flex flex-col justify-between">
                            <div className="space-y-3">
                                <div className="flex gap-1 text-amber-400 text-sm">★★★★★</div>
                                <p className="text-sm text-slate-700 font-medium leading-relaxed">
                                    "Lo mejor es que todo es automático. Yo ya no respondo mensajes todo el día."
                                </p>
                            </div>
                            <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                                <div className="size-10 bg-purple-100 rounded-full flex items-center justify-center font-bold text-purple-700 text-sm">
                                    MJ
                                </div>
                                <div>
                                    <p className="text-xs font-black text-slate-900">María J.</p>
                                    <p className="text-[10px] text-slate-500 font-medium">Spa & Wellness • Cuenca</p>
                                </div>
                            </div>
                        </div>

                    </div>

                    <div>
                        <a 
                            href="#precios" 
                            className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-indigo-600 hover:text-indigo-700 transition-colors"
                        >
                            VER MÁS HISTORIAS DE ÉXITO &rarr;
                        </a>
                    </div>

                </div>
            </section>

            {/* ================= 8. BANNER OFERTA FUNDADORES ================= */}
            <section id="fundadores" className="py-16 bg-white">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 rounded-[2.5rem] p-8 md:p-12 text-white shadow-2xl flex flex-col md:flex-row justify-between items-center gap-8">
                        
                        {/* Contenido Izquierdo */}
                        <div className="space-y-4 text-left">
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-bold uppercase tracking-wider">
                                💎 Oferta de Lanzamiento para Fundadores
                            </div>
                            <div className="flex items-baseline gap-2">
                                <span className="text-4xl md:text-5xl font-black">${founderPrice}</span>
                                <span className="text-sm font-bold opacity-80">/ mes</span>
                                <span className="text-xs bg-amber-400 text-slate-950 font-black px-2.5 py-0.5 rounded-full uppercase ml-2">de por vida</span>
                                <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded uppercase font-bold">Cupos Limitados</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs font-semibold opacity-90 pt-2">
                                <p>✔ Todas las funcionalidades</p>
                                <p>✔ Soporte prioritario</p>
                                <p>✔ Actualizaciones de por vida</p>
                                <p>✔ Sin permanencia</p>
                            </div>
                        </div>

                        {/* Contenido Derecho / CTA */}
                        <div className="space-y-4 text-center md:text-right shrink-0">
                            <p className="text-xs font-bold uppercase tracking-wider opacity-90">
                                Quedan <strong className="text-amber-300 text-lg">{cuposDisponibles} / {founderMax}</strong> cupos disponibles
                            </p>
                            <Link
                                href="/register"
                                className="bg-white text-indigo-950 hover:bg-amber-300 hover:text-slate-950 px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-wider inline-flex items-center gap-2 transition-all shadow-xl active:scale-95 block text-center"
                            >
                                QUIERO MI DESCUENTO &rarr;
                            </Link>
                        </div>

                    </div>
                </div>
            </section>

            {/* ================= 9. PLANES DE PRECIO ================= */}
            <section id="precios" className="py-24 bg-slate-50">
                <div className="max-w-7xl mx-auto px-6 text-center space-y-16">
                    <div className="space-y-3 max-w-2xl mx-auto">
                        <h2 className="text-3xl md:text-5xl font-black text-slate-950">
                            Planes transparentes
                        </h2>
                        <p className="text-slate-600 text-base font-medium">
                            Elige el plan ideal para escalar tu negocio.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 text-left">
                        {planes.length > 0 ? planes.map((plan: any) => {
                            // Extraer características únicas del plan
                            const maxCitas = plan.max_reservations_per_month || plan.maxAppointmentsMonthly || 40;
                            const featuresObj = plan.features 
                                ? (typeof plan.features === 'string' ? JSON.parse(plan.features || '{}') : plan.features)
                                : {};
                            
                            const distinctFeatures: Array<{ text: string; highlight?: boolean }> = [];

                            // 1. Staff / Profesionales
                            if (plan.maxStaff >= 999 || plan.maxStaff === 0) {
                                distinctFeatures.push({ text: '👥 Staff / Profesionales ILIMITADOS', highlight: true });
                            } else if (plan.maxStaff > 1) {
                                distinctFeatures.push({ text: `👥 Hasta ${plan.maxStaff} Profesionales / Agendas`, highlight: true });
                            } else {
                                distinctFeatures.push({ text: '👤 1 Profesional / Agenda', highlight: true });
                            }

                            // 2. Sucursales
                            if (plan.max_locations > 1) {
                                distinctFeatures.push({ text: `🏢 ${plan.max_locations} Sucursales / Sedes`, highlight: true });
                            } else {
                                distinctFeatures.push({ text: '🏢 1 Sucursal / Sede', highlight: true });
                            }

                            // 3. Citas Mensuales
                            if (maxCitas >= 99999 || maxCitas === 0) {
                                distinctFeatures.push({ text: '⚡ Citas y Reservas ILIMITADAS', highlight: true });
                            } else {
                                distinctFeatures.push({ text: `📅 Hasta ${maxCitas} citas mensuales`, highlight: true });
                            }

                            // 4. Confirmaciones por WhatsApp
                            const hasWhatsappNotif = featuresObj?.whatsapp_notifications !== false;
                            if (hasWhatsappNotif) {
                                distinctFeatures.push({ text: '📲 Confirmaciones Automáticas por WhatsApp', highlight: true });
                            }

                            // 5. Recordatorios por WhatsApp
                            if (featuresObj?.whatsapp_reminders) {
                                distinctFeatures.push({ text: '⏰ Recordatorios previos por WhatsApp', highlight: true });
                            }

                            // 6. Comunicaciones Masivas (WhatsApp & Push)
                            if (plan.communications_module) {
                                distinctFeatures.push({ text: '💬 Notificaciones y Anuncios Masivos (WhatsApp & Push)', highlight: true });
                            }

                            // 7. Cursos / Academia
                            if (plan.courses_module) {
                                distinctFeatures.push({ text: '🎓 Módulo de Academia, Cursos y Talleres', highlight: true });
                            }

                            // 8. Promociones
                            if (plan.automatic_discounts_enabled) {
                                distinctFeatures.push({ text: '🏷️ Módulo de Promociones y Descuentos', highlight: true });
                            }

                            // 9. Torneos / Portafolio
                            if (plan.tournaments_enabled) {
                                distinctFeatures.push({ text: '🏆 Portafolio de Trabajos y Galería', highlight: true });
                            }

                            // 10. Club de Fidelización
                            distinctFeatures.push({ text: '🎁 Club de Fidelización (Puntos y Premios)', highlight: true });

                            // 11. Marca Blanca
                            if (featuresObj?.remove_zenda_branding) {
                                distinctFeatures.push({ text: '✨ Sin marca de agua CitiOx (Marca Blanca)', highlight: true });
                            }

                            return (
                                <div 
                                    key={plan.id}
                                    className={`bg-white p-8 rounded-3xl border ${plan.is_recommended ? 'border-indigo-500 ring-2 ring-indigo-500/20 shadow-xl' : 'border-slate-200 shadow-sm'} flex flex-col justify-between space-y-6 relative`}
                                >
                                    {plan.is_recommended && (
                                        <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-indigo-600 text-white px-3.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-md">
                                            🔥 Más Popular
                                        </span>
                                    )}
                                    <div className="space-y-4">
                                        <div>
                                            <h3 className="text-xl font-black text-slate-900">{plan.name}</h3>
                                            <p className="text-xs text-slate-500 font-medium mt-1">{plan.description || "Solución completa para escalar tu negocio."}</p>
                                        </div>

                                        <div className="flex items-baseline gap-1 py-1">
                                            <span className="text-4xl font-black text-slate-950">${plan.price}</span>
                                            <span className="text-xs font-bold text-slate-500">/ mes</span>
                                        </div>

                                        <ul className="space-y-2.5 text-xs font-medium text-slate-700 pt-3 border-t border-slate-100">
                                            {distinctFeatures.map((feat, idx) => (
                                                <li key={idx} className={`flex items-start gap-2.5 ${feat.highlight ? 'font-bold text-indigo-950' : ''}`}>
                                                    <CheckCircle2 size={16} className={`shrink-0 mt-0.5 ${feat.highlight ? 'text-indigo-600' : 'text-slate-400'}`} />
                                                    <span>{feat.text}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                    <Link
                                        href={`/register?plan=${plan.id}`}
                                        className={`w-full py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider text-center transition-all shadow-md active:scale-95 block ${plan.is_recommended ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
                                    >
                                        CREAR MI NEGOCIO &rarr;
                                    </Link>
                                </div>
                            );
                        }) : (
                            <div className="col-span-full text-center py-12 bg-white rounded-3xl border border-dashed border-slate-200">
                                <p className="text-xs font-bold text-slate-400">Cargando planes de suscripción...</p>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* ================= 10. BOTÓN CTA SECCIÓN FINAL ================= */}
            <section className="py-20 bg-white">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="bg-slate-100/80 rounded-[3rem] p-10 md:p-16 text-center space-y-8 border border-slate-200/60 shadow-xs">
                        <div className="space-y-3 max-w-2xl mx-auto">
                            <h2 className="text-3xl md:text-4xl font-black text-slate-950">
                                ¿Listo para transformar tu negocio?
                            </h2>
                            <p className="text-slate-600 text-base font-medium">
                                Únete a miles de profesionales que ya automatizaron sus reservas y hacen crecer su negocio todos los días.
                            </p>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <Link
                                href="/register"
                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-lg active:scale-95"
                            >
                                CREAR MI NEGOCIO GRATIS &rarr;
                            </Link>
                            <a
                                href="https://wa.me/593968118444?text=Hola%20CitiOx,%20quisiera%20más%20información"
                                target="_blank"
                                rel="noreferrer"
                                className="bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 px-8 py-4 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2"
                            >
                                <MessageCircle size={16} className="text-emerald-600" />
                                HABLAR CON ASESOR
                            </a>
                        </div>

                        <div className="flex flex-wrap justify-center gap-6 text-xs font-bold text-slate-500 pt-2">
                            <span>✔ Sin tarjeta de crédito</span>
                            <span>✔ Configuración en 5 minutos</span>
                            <span>✔ Cancela cuando quieras</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* ================= 11. FOOTER (PIE DE PÁGINA) ================= */}
            <footer id="sectores" className="bg-slate-950 text-white py-16">
                <div className="max-w-7xl mx-auto px-6 space-y-12">
                    
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-10 text-left">
                        
                        {/* Columna 1: Logo e Info */}
                        <div className="md:col-span-2 space-y-4">
                            <Link href="/" className="flex items-center gap-2.5">
                                <CitioxLogo className="h-10 w-auto" />
                                <span className="text-2xl font-black tracking-tight text-white">
                                    Citi<span className="text-indigo-400">Ox</span>
                                </span>
                            </Link>
                            <p className="text-xs text-slate-400 font-medium leading-relaxed max-w-sm">
                                El estándar digital en gestión de citas y reservas para profesionales y negocios.
                            </p>
                            <div className="flex gap-3 text-slate-400 pt-2">
                                <a href="#" className="hover:text-white transition-colors"><Facebook size={18} /></a>
                                <a href="#" className="hover:text-white transition-colors"><Instagram size={18} /></a>
                                <a href="#" className="hover:text-white transition-colors"><Youtube size={18} /></a>
                            </div>
                        </div>

                        {/* Columna 2: Producto */}
                        <div className="space-y-3">
                            <p className="text-xs font-black uppercase tracking-wider text-slate-300">Producto</p>
                            <ul className="space-y-2 text-xs font-medium text-slate-400">
                                <li><a href="#funcionalidades" className="hover:text-white transition-colors">Funcionalidades</a></li>
                                <li><a href="#precios" className="hover:text-white transition-colors">Precios</a></li>
                                <li><a href="#funcionalidades" className="hover:text-white transition-colors">Integraciones</a></li>
                                <li><Link href="/demo" className="hover:text-white transition-colors">Demo</Link></li>
                            </ul>
                        </div>

                        {/* Columna 3: Sectores */}
                        <div className="space-y-3">
                            <p className="text-xs font-black uppercase tracking-wider text-slate-300">Sectores</p>
                            <ul className="space-y-2 text-xs font-medium text-slate-400">
                                <li><span className="hover:text-white transition-colors">Belleza y Salones</span></li>
                                <li><span className="hover:text-white transition-colors">Barberías</span></li>
                                <li><span className="hover:text-white transition-colors">Salud y Bienestar</span></li>
                                <li><span className="hover:text-white transition-colors">Ver todos</span></li>
                            </ul>
                        </div>

                        {/* Columna 4: Recursos & Contacto */}
                        <div className="space-y-3">
                            <p className="text-xs font-black uppercase tracking-wider text-slate-300">Contacto</p>
                            <ul className="space-y-2 text-xs font-medium text-slate-400">
                                <li>
                                    <a 
                                        href="https://wa.me/593968118444?text=Hola%20CitiOx,%20quisiera%20más%20información" 
                                        target="_blank" 
                                        rel="noreferrer"
                                        className="hover:text-emerald-400 transition-colors flex items-center gap-1.5 font-bold"
                                    >
                                        💬 WhatsApp: +593 96 811 8444
                                    </a>
                                </li>
                                <li><span className="hover:text-white transition-colors">Preguntas frecuentes</span></li>
                                <li><span className="hover:text-white transition-colors">Centro de ayuda</span></li>
                            </ul>
                        </div>

                    </div>

                    {/* Bottom copyright */}
                    <div className="pt-8 border-t border-slate-900 flex flex-col md:flex-row justify-between items-center gap-4 text-[11px] font-medium text-slate-500">
                        <p>© 2026 CitiOx. Todos los derechos reservados.</p>
                        <p className="flex items-center gap-1">Hecho con 💖 en Ecuador</p>
                    </div>

                </div>
            </footer>

        </div>
    );
}
