import Link from 'next/link';
import type { Metadata } from 'next';
import { Bricolage_Grotesque } from 'next/font/google';
import {
    ArrowRight,
    Check,
    X,
    Users,
    Store,
    Calendar,
    CreditCard,
    Tag,
    Star,
    SlidersHorizontal,
    BarChart3,
    LayoutGrid,
    Palette,
    Share2,
    ChevronDown,
    Smartphone,
    Clock,
    Trophy,
    Gift,
    Target,
    Crown,
} from 'lucide-react';
import BusinessVerticalsGrid from '@/components/landing/BusinessVerticalsGrid';
import HeroShowcase from '@/components/landing/HeroShowcase';

const display = Bricolage_Grotesque({ subsets: ['latin'], variable: '--font-display', display: 'swap' });

export const metadata: Metadata = {
    title: 'Citiox | Tu negocio. Tu propia app.',
    description:
        'Crea la app de tu negocio en minutos: tus clientes reservan, piden y compran desde el celular, y tú lo manejas todo desde un solo panel.',
    openGraph: {
        title: 'Citiox | Tu negocio. Tu propia app.',
        description: 'Tus clientes reservan, piden y compran desde el celular. Tú lo manejas todo desde un solo panel.',
        images: ['/logo-citiox.png'],
        type: 'website',
    },
};

const BRAND = '#0066FF';

const STEPS = [
    {
        icon: LayoutGrid,
        title: 'Elige tu tipo de negocio',
        text: 'Spa, restaurante, tienda, gimnasio, canchas, clínica o lavandería. Tu app arranca con todo lo que ese negocio necesita.',
    },
    {
        icon: Palette,
        title: 'Ponle tu marca',
        text: 'Sube tu logo, fotos, servicios o productos y precios. Lo cambias cuando quieras, también desde el celular.',
    },
    {
        icon: Share2,
        title: 'Compártela',
        text: 'Recibes tu enlace propio y un código QR. Ponlos en Instagram, WhatsApp o en el mostrador y empieza a recibir clientes.',
    },
];

const COMPARISON: [string, string][] = [
    ['Solo muestra información', 'El cliente reserva, pide o compra ahí mismo'],
    ['Te escriben para preguntar horarios y precios', 'Ven horarios y precios actualizados al instante'],
    ['Necesitas a alguien para actualizarla', 'La actualizas tú desde el celular'],
    ['Te visitan una vez y se olvidan', 'Promociones y premios para que regresen'],
    ['No sabes qué está funcionando', 'Reportes claros de ventas y clientes'],
];

const SMALL_FEATURES = [
    { icon: Users, title: 'Clientes', text: 'Historial, datos de contacto y lo que más compra cada uno.', tint: 'bg-blue-50 text-blue-600' },
    { icon: CreditCard, title: 'Pagos', text: 'Cobra en efectivo, transferencia o tarjeta y lleva tu caja al día.', tint: 'bg-violet-50 text-violet-600' },
    { icon: Tag, title: 'Promociones', text: 'Crea ofertas y cupones en segundos para llenar tus horas flojas.', tint: 'bg-pink-50 text-pink-600' },
    { icon: Star, title: 'Fidelización', text: 'Premios y misiones que hacen que tus clientes vuelvan.', tint: 'bg-amber-50 text-amber-600' },
    { icon: SlidersHorizontal, title: 'Operación', text: 'Equipo, horarios, inventario y sucursales en un solo lugar.', tint: 'bg-slate-100 text-slate-700' },
    { icon: BarChart3, title: 'Reportes', text: 'Cuánto vendiste, qué funciona y qué mejorar, sin hojas de cálculo.', tint: 'bg-teal-50 text-teal-600' },
];

const FAQ = [
    {
        q: '¿Necesito saber de tecnología?',
        a: 'No. Eliges tu tipo de negocio, cargas tus servicios o productos y tu app queda lista para compartir. Todo se maneja con botones y formularios sencillos.',
    },
    {
        q: '¿Mis clientes tienen que descargar algo?',
        a: 'No hace falta pasar por ninguna tienda de aplicaciones. Tus clientes abren tu enlace o escanean tu código QR desde el celular y ya pueden reservar, pedir o comprar.',
    },
    {
        q: '¿Puedo cambiar precios, fotos y horarios yo mismo?',
        a: 'Sí. Desde tu panel cambias lo que quieras, cuando quieras, desde la computadora o el celular. Los cambios se ven al instante en tu app.',
    },
    {
        q: '¿Sirve para mi tipo de negocio?',
        a: 'Citiox tiene versiones pensadas para spas y salones, barberías, restaurantes y cafeterías, tiendas, gimnasios, canchas deportivas, clínicas y lavanderías. Si tu negocio es distinto, elige el tipo más parecido al crear tu cuenta.',
    },
    {
        q: '¿Puedo manejarlo con mi equipo?',
        a: 'Sí. Puedes invitar a tu equipo y cada persona ve solo lo que necesita para su trabajo.',
    },
];

function CitioxLogo({ className = 'h-9 w-auto' }: { className?: string }) {
    return <img src="/citiox-logo-horizontal.png" alt="Citiox" className={`object-contain select-none ${className}`} />;
}

function SectionLabel({ children, light = false }: { children: React.ReactNode; light?: boolean }) {
    return (
        <span className={`inline-flex items-center gap-2 text-sm font-semibold ${light ? 'text-sky-300' : 'text-[#0066FF]'}`}>
            <span className={`h-px w-6 ${light ? 'bg-sky-300' : 'bg-[#0066FF]'}`} />
            {children}
        </span>
    );
}

export default function LandingPage() {
    const year = new Date().getFullYear();

    return (
        <div
            className={`${display.variable} min-h-screen bg-[#F7F8FB] text-slate-900 selection:bg-[#0066FF] selection:text-white overflow-x-hidden`}
            style={{ ['--font-heading' as string]: 'var(--font-display), Inter, sans-serif' }}
        >
            {/* ─────────────── Navegación ─────────────── */}
            <nav className="sticky top-0 z-50 bg-[#F7F8FB]/85 backdrop-blur-md border-b border-slate-200/70">
                <div className="max-w-6xl mx-auto px-5 sm:px-8 lg:px-10 h-16 flex items-center justify-between gap-4">
                    <Link href="/" aria-label="Citiox, inicio">
                        <CitioxLogo className="h-9 sm:h-10 w-auto" />
                    </Link>
                    <div className="hidden md:flex items-center gap-8 text-[15px] font-medium text-slate-600">
                        <a href="#como-funciona" className="hover:text-slate-950 transition-colors">Cómo funciona</a>
                        <a href="#verticales" className="hover:text-slate-950 transition-colors">Tipos de negocio</a>
                        <a href="#funciones" className="hover:text-slate-950 transition-colors">Funciones</a>
                        <a href="#club" className="hover:text-slate-950 transition-colors">Club de beneficios</a>
                        <a href="#preguntas" className="hover:text-slate-950 transition-colors">Preguntas</a>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3">
                        <Link href="/login" className="text-[15px] font-semibold text-slate-700 hover:text-slate-950 px-2 py-2 transition-colors">
                            Entrar
                        </Link>
                        <Link
                            href="/register"
                            className="inline-flex items-center gap-1.5 bg-slate-950 hover:bg-[#0066FF] text-white px-4 sm:px-5 py-2.5 rounded-full text-sm font-semibold transition-colors"
                        >
                            Crear mi app
                            <ArrowRight size={15} />
                        </Link>
                    </div>
                </div>
            </nav>

            {/* ─────────────── Hero ─────────────── */}
            <header className="relative overflow-hidden">
                <div
                    className="absolute inset-0 -z-0 pointer-events-none opacity-60"
                    style={{
                        backgroundImage:
                            'linear-gradient(to right, rgba(15,23,42,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(15,23,42,0.06) 1px, transparent 1px)',
                        backgroundSize: '44px 44px',
                        maskImage: 'radial-gradient(ellipse 70% 60% at 50% 30%, black 30%, transparent 75%)',
                        WebkitMaskImage: 'radial-gradient(ellipse 70% 60% at 50% 30%, black 30%, transparent 75%)',
                    }}
                    aria-hidden
                />
                <div className="relative max-w-6xl mx-auto px-5 sm:px-8 lg:px-10 pt-8 sm:pt-12 lg:pt-10 pb-12 lg:pb-16 grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-8 lg:gap-12 items-start">
                    <div className="min-w-0 text-center lg:text-left flex flex-col items-center lg:items-start lg:pt-16 xl:pt-20">
                        <span className="inline-flex items-center gap-2 rounded-full bg-white ring-1 ring-slate-200 pl-1.5 pr-3.5 py-1.5 text-[13px] font-medium text-slate-600 shadow-sm">
                            <span className="inline-flex items-center gap-1 rounded-full bg-[#0066FF] text-white px-2 py-0.5 text-xs font-semibold">
                                <Smartphone size={12} /> App
                            </span>
                            Para spas, restaurantes, tiendas, gimnasios y más
                        </span>

                        <h1 className="mt-5 text-[2.6rem] leading-[1.03] sm:text-6xl lg:text-[3.6rem] xl:text-[4.25rem] font-bold tracking-tight text-slate-950">
                            Tu negocio.
                            <br />
                            <span className="relative inline-block text-[#0066FF]">
                                Tu propia app.
                                <svg className="absolute left-0 -bottom-2 w-full h-3 text-[#0066FF]/35" viewBox="0 0 300 12" preserveAspectRatio="none" aria-hidden>
                                    <path d="M2 9 C 60 2, 140 2, 298 7" stroke="currentColor" strokeWidth="4" fill="none" strokeLinecap="round" />
                                </svg>
                            </span>
                        </h1>

                        <p className="mt-5 text-lg sm:text-xl text-slate-600 leading-relaxed max-w-xl">
                            Tus clientes reservan, piden y compran desde el celular. Tú lo manejas todo desde un solo panel, sin saber de tecnología.
                        </p>

                        <div className="mt-8 flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                            <Link
                                href="/register"
                                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-4 rounded-full bg-[#0066FF] hover:bg-[#0052cc] text-white text-base font-semibold shadow-lg shadow-blue-600/25 transition-colors"
                            >
                                Crear mi app gratis
                                <ArrowRight size={18} />
                            </Link>
                            <a
                                href="#verticales"
                                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-4 rounded-full bg-white ring-1 ring-slate-200 hover:ring-slate-300 text-slate-800 text-base font-semibold transition-shadow"
                            >
                                Ver ejemplos
                            </a>
                        </div>

                        <ul className="mt-7 flex flex-wrap justify-center lg:justify-start gap-x-5 gap-y-2 text-sm text-slate-600">
                            {['Lista en minutos', 'Sin instalar nada', 'La manejas desde el celular'].map((t) => (
                                <li key={t} className="inline-flex items-center gap-1.5">
                                    <span className="size-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                                        <Check size={12} strokeWidth={3} />
                                    </span>
                                    {t}
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="min-w-0">
                        <HeroShowcase />
                    </div>
                </div>
            </header>

            {/* ─────────────── Cómo funciona ─────────────── */}
            <section id="como-funciona" className="scroll-mt-20 bg-white border-y border-slate-200/70">
                <div className="max-w-6xl mx-auto px-5 sm:px-8 lg:px-10 py-20 lg:py-24">
                    <div className="max-w-2xl">
                        <SectionLabel>Cómo funciona</SectionLabel>
                        <h2 className="mt-3 text-4xl sm:text-5xl font-bold tracking-tight text-slate-950 leading-[1.05]">
                            Tres pasos y tu negocio ya está en el celular de tus clientes.
                        </h2>
                    </div>
                    <ol className="mt-14 grid md:grid-cols-3 gap-6 lg:gap-10">
                        {STEPS.map((s, i) => {
                            const Icon = s.icon;
                            return (
                                <li key={s.title} className="relative">
                                    <div className="flex items-center gap-4 mb-5">
                                        <span className="font-display text-6xl font-bold text-slate-200 leading-none">{i + 1}</span>
                                        <span className="size-12 rounded-2xl bg-[#0066FF]/10 text-[#0066FF] flex items-center justify-center">
                                            <Icon size={22} />
                                        </span>
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-950">{s.title}</h3>
                                    <p className="mt-2 text-base text-slate-600 leading-relaxed">{s.text}</p>
                                </li>
                            );
                        })}
                    </ol>
                </div>
            </section>

            {/* ─────────────── Tipos de negocio ─────────────── */}
            <section id="verticales" className="scroll-mt-20">
                <div className="max-w-6xl mx-auto px-5 sm:px-8 lg:px-10 py-20 lg:py-24">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
                        <div className="max-w-2xl">
                            <SectionLabel>¿Qué tipo de negocio tienes?</SectionLabel>
                            <h2 className="mt-3 text-4xl sm:text-5xl font-bold tracking-tight text-slate-950 leading-[1.05]">
                                Una app pensada para cómo trabaja tu negocio.
                            </h2>
                        </div>
                        <p className="text-base text-slate-600 max-w-sm">
                            Abre un ejemplo para probarlo como si fueras tu cliente, o crea la tuya directamente.
                        </p>
                    </div>
                    <BusinessVerticalsGrid />
                </div>
            </section>

            {/* ─────────────── Web vs app ─────────────── */}
            <section className="bg-slate-950 text-white relative overflow-hidden">
                <div className="absolute -top-40 -right-40 size-[520px] rounded-full bg-[#0066FF]/25 blur-3xl pointer-events-none" aria-hidden />
                <div className="relative max-w-6xl mx-auto px-5 sm:px-8 lg:px-10 py-20 lg:py-24 grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr] gap-12 items-center">
                    <div>
                        <SectionLabel light>La diferencia</SectionLabel>
                        <h2 className="mt-3 text-4xl sm:text-5xl font-bold tracking-tight leading-[1.05]" style={{ color: 'white' }}>
                            No es solo una página web.{' '}
                            <span className="text-sky-300">Es la app de tu negocio.</span>
                        </h2>
                        <p className="mt-5 text-lg text-slate-300 leading-relaxed max-w-md">
                            Una página web se mira. Una app se usa: tus clientes resuelven solos lo que antes te preguntaban por mensaje.
                        </p>
                        <Link
                            href="/register"
                            className="mt-8 inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-white text-slate-950 hover:bg-sky-100 text-base font-semibold transition-colors"
                        >
                            Crear mi app
                            <ArrowRight size={17} />
                        </Link>
                    </div>

                    <div className="rounded-3xl bg-white/[0.04] ring-1 ring-white/10 overflow-hidden">
                        <div className="grid grid-cols-2 text-sm font-semibold border-b border-white/10">
                            <div className="px-5 py-4 text-slate-400">Página web común</div>
                            <div className="px-5 py-4 text-sky-300 bg-[#0066FF]/10">Tu app Citiox</div>
                        </div>
                        {COMPARISON.map(([before, after]) => (
                            <div key={before} className="grid grid-cols-2 border-b border-white/5 last:border-0">
                                <div className="px-5 py-4 flex items-start gap-2.5 text-[15px] text-slate-400">
                                    <X size={16} className="mt-0.5 shrink-0 text-slate-600" />
                                    {before}
                                </div>
                                <div className="px-5 py-4 flex items-start gap-2.5 text-[15px] text-white bg-[#0066FF]/10">
                                    <Check size={16} strokeWidth={3} className="mt-0.5 shrink-0 text-sky-300" />
                                    {after}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ─────────────── Funciones ─────────────── */}
            <section id="funciones" className="scroll-mt-20">
                <div className="max-w-6xl mx-auto px-5 sm:px-8 lg:px-10 py-20 lg:py-24">
                    <div className="max-w-2xl mb-12">
                        <SectionLabel>Todo en un solo lugar</SectionLabel>
                        <h2 className="mt-3 text-4xl sm:text-5xl font-bold tracking-tight text-slate-950 leading-[1.05]">
                            Tu negocio crece. Tu app también.
                        </h2>
                        <p className="mt-4 text-lg text-slate-600">Empiezas con lo básico y activas más funciones cuando las necesites.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                        {/* Reservas */}
                        <div className="md:col-span-3 rounded-3xl bg-white ring-1 ring-slate-200/80 p-6 sm:p-8 flex flex-col">
                            <span className="size-11 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center"><Calendar size={20} /></span>
                            <h3 className="mt-4 text-2xl font-bold text-slate-950">Reservas y citas</h3>
                            <p className="mt-2 text-base text-slate-600">Tus clientes eligen servicio, profesional y horario. Tú ves tu agenda del día de un vistazo.</p>
                            <div className="mt-6 rounded-2xl bg-slate-50 ring-1 ring-slate-200/70 p-4 space-y-2" aria-hidden>
                                {[
                                    ['09:00', 'Limpieza facial', 'Ana V.', 'bg-sky-500'],
                                    ['10:30', 'Masaje relajante', 'Lucía M.', 'bg-rose-500'],
                                    ['12:00', 'Manicure spa', 'Ana V.', 'bg-amber-500'],
                                ].map(([t, s, p, c]) => (
                                    <div key={t} className="flex items-center gap-3 bg-white rounded-xl px-3 py-2.5 ring-1 ring-slate-200/60">
                                        <span className="text-sm font-semibold text-slate-500 w-[60px] shrink-0 flex items-center gap-1"><Clock size={12} />{t}</span>
                                        <span className={`w-1 h-7 rounded-full ${c}`} />
                                        <span className="flex-1 min-w-0">
                                            <span className="block text-sm font-semibold text-slate-900 truncate">{s}</span>
                                            <span className="block text-xs text-slate-500">con {p}</span>
                                        </span>
                                        <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 rounded-full px-2 py-0.5">Confirmada</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Ventas */}
                        <div className="md:col-span-3 rounded-3xl bg-white ring-1 ring-slate-200/80 p-6 sm:p-8 flex flex-col">
                            <span className="size-11 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center"><Store size={20} /></span>
                            <h3 className="mt-4 text-2xl font-bold text-slate-950">Ventas y pedidos</h3>
                            <p className="mt-2 text-base text-slate-600">Recibe pedidos para mesa, retiro o domicilio y vende tus productos con carrito y pago.</p>
                            <div className="mt-6 rounded-2xl bg-slate-50 ring-1 ring-slate-200/70 p-4 space-y-2" aria-hidden>
                                {[
                                    ['#1042', 'Mesa 4 · 2 productos', '$24.50', 'En cocina', 'bg-amber-50 text-amber-700'],
                                    ['#1041', 'Retiro en local', '$11.00', 'Listo', 'bg-emerald-50 text-emerald-700'],
                                    ['#1040', 'Domicilio · Av. Amazonas', '$32.00', 'En camino', 'bg-sky-50 text-sky-700'],
                                ].map(([n, d, a, st, cls]) => (
                                    <div key={n} className="flex items-center gap-3 bg-white rounded-xl px-3 py-2.5 ring-1 ring-slate-200/60">
                                        <span className="text-sm font-semibold text-slate-400 w-12">{n}</span>
                                        <span className="flex-1 min-w-0 text-sm font-semibold text-slate-900 truncate">{d}</span>
                                        <span className="text-sm font-bold text-slate-900">{a}</span>
                                        <span className={`hidden sm:inline text-xs font-semibold rounded-full px-2 py-0.5 ${cls}`}>{st}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {SMALL_FEATURES.map((f) => {
                            const Icon = f.icon;
                            return (
                                <div key={f.title} className="md:col-span-2 rounded-3xl bg-white ring-1 ring-slate-200/80 p-6 hover:ring-slate-300 hover:shadow-lg hover:shadow-slate-900/5 transition-all">
                                    <span className={`size-11 rounded-2xl flex items-center justify-center ${f.tint}`}><Icon size={20} /></span>
                                    <h3 className="mt-4 text-lg font-bold text-slate-950">{f.title}</h3>
                                    <p className="mt-1.5 text-[15px] text-slate-600 leading-relaxed">{f.text}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* ─────────────── Club de beneficios y días gratis ─────────────── */}
            <section id="club" className="scroll-mt-20 bg-white border-t border-slate-200/70">
                <div className="max-w-6xl mx-auto px-5 sm:px-8 lg:px-10 py-20 lg:py-24">
                    <div className="max-w-2xl mb-12">
                        <SectionLabel>Club de beneficios</SectionLabel>
                        <h2 className="mt-3 text-4xl sm:text-5xl font-bold tracking-tight text-slate-950 leading-[1.05]">
                            Clientes que vuelven. Y un negocio que gana premios.
                        </h2>
                        <p className="mt-4 text-lg text-slate-600">
                            Tus clientes juntan puntos y premios por volver a tu negocio. Y tú, por hacer crecer tu negocio con Citiox, ganas días gratis de suscripción.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                        {/* Para tus clientes */}
                        <div className="rounded-3xl bg-gradient-to-br from-rose-50 via-white to-amber-50 ring-1 ring-slate-200/80 p-6 sm:p-8 flex flex-col">
                            <span className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-rose-600 bg-rose-100/70 rounded-full px-3 py-1">
                                <Users size={14} /> Para tus clientes
                            </span>
                            <h3 className="mt-4 text-2xl font-bold text-slate-950">Un club con tu marca</h3>
                            <ul className="mt-4 space-y-2.5 text-[15px] text-slate-700">
                                {[
                                    'Puntos automáticos en cada visita, reserva o compra',
                                    'Misiones: reseñar, recomendar a un amigo, venir en su cumpleaños',
                                    'Niveles Bronce, Plata y Oro con beneficios que tú eliges',
                                    'Plantillas listas para tu tipo de negocio: lo activas en un minuto',
                                ].map((t) => (
                                    <li key={t} className="flex items-start gap-2.5">
                                        <Check size={17} strokeWidth={3} className="mt-0.5 text-rose-500 shrink-0" />
                                        {t}
                                    </li>
                                ))}
                            </ul>

                            {/* Tarjeta de ejemplo del cliente */}
                            <div className="mt-8 rounded-2xl bg-slate-950 text-white p-5 shadow-xl max-w-sm" aria-hidden>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs text-slate-400">Club Aura Spa</p>
                                        <p className="font-bold">Hola, Camila</p>
                                    </div>
                                    <span className="inline-flex items-center gap-1 text-xs font-semibold bg-amber-400/15 text-amber-300 rounded-full px-2.5 py-1">
                                        <Crown size={12} /> Nivel Plata
                                    </span>
                                </div>
                                <div className="mt-4 flex items-end justify-between">
                                    <p className="text-3xl font-bold">340 <span className="text-sm font-medium text-slate-400">puntos</span></p>
                                    <p className="text-xs text-slate-400">160 para Oro</p>
                                </div>
                                <div className="mt-2 h-2 rounded-full bg-white/10 overflow-hidden">
                                    <div className="h-full w-[68%] rounded-full bg-gradient-to-r from-rose-400 to-amber-300" />
                                </div>
                                <div className="mt-4 flex items-center gap-2.5 bg-white/5 rounded-xl px-3 py-2.5">
                                    <Gift size={16} className="text-rose-300 shrink-0" />
                                    <p className="text-sm">5 visitas = <span className="font-semibold">facial gratis</span> · llevas 4</p>
                                </div>
                            </div>
                        </div>

                        {/* Para ti */}
                        <div className="rounded-3xl bg-slate-950 text-white p-6 sm:p-8 relative overflow-hidden flex flex-col">
                            <div className="absolute -right-24 -top-24 size-72 rounded-full bg-[#0066FF]/35 blur-3xl pointer-events-none" aria-hidden />
                            <span className="relative inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-sky-300 bg-sky-400/10 rounded-full px-3 py-1">
                                <Trophy size={14} /> Para ti
                            </span>
                            <h3 className="relative mt-4 text-2xl font-bold" style={{ color: 'white' }}>Usa Citiox y gana días gratis</h3>
                            <p className="relative mt-3 text-[15px] text-slate-300 max-w-md">
                                Cumple retos mientras haces crecer tu negocio: carga tus servicios, recibe tus primeras reservas, comparte tu QR o recomienda Citiox a otro negocio. Cada reto suma días a tu suscripción.
                            </p>

                            <div className="relative mt-8 space-y-2.5 max-w-sm" aria-hidden>
                                {[
                                    { t: 'Recibe tus primeras 10 reservas en línea', p: 70, r: '+7 días', done: false },
                                    { t: 'Comparte tu enlace en Instagram', p: 100, r: '+3 días', done: true },
                                    { t: 'Recomienda Citiox a otro negocio', p: 0, r: '+30 días', done: false },
                                ].map((m) => (
                                    <div key={m.t} className="bg-white/5 ring-1 ring-white/10 rounded-2xl px-4 py-3">
                                        <div className="flex items-center justify-between gap-3">
                                            <p className="text-sm font-medium text-white flex items-center gap-2">
                                                {m.done ? <Check size={15} strokeWidth={3} className="text-emerald-400" /> : <Target size={15} className="text-sky-300" />}
                                                {m.t}
                                            </p>
                                            <span className="text-xs font-bold text-emerald-300 shrink-0">{m.r}</span>
                                        </div>
                                        <div className="mt-2 h-1.5 rounded-full bg-white/10 overflow-hidden">
                                            <div className={`h-full rounded-full ${m.done ? 'bg-emerald-400' : 'bg-sky-400'}`} style={{ width: `${m.p}%` }} />
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <Link
                                href="/register"
                                className="relative mt-8 inline-flex w-fit items-center gap-2 px-6 py-3 rounded-full bg-white text-slate-950 hover:bg-sky-100 text-base font-semibold transition-colors"
                            >
                                Empezar a ganar días
                                <ArrowRight size={17} />
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* ─────────────── Preguntas ─────────────── */}
            <section id="preguntas" className="scroll-mt-20 bg-white border-y border-slate-200/70">
                <div className="max-w-6xl mx-auto px-5 sm:px-8 lg:px-10 py-20 lg:py-24 grid grid-cols-1 lg:grid-cols-[0.8fr_1.2fr] gap-10">
                    <div>
                        <SectionLabel>Preguntas frecuentes</SectionLabel>
                        <h2 className="mt-3 text-4xl sm:text-5xl font-bold tracking-tight text-slate-950 leading-[1.05]">
                            Lo que todos preguntan antes de empezar.
                        </h2>
                    </div>
                    <div className="divide-y divide-slate-200 border-y border-slate-200">
                        {FAQ.map((item) => (
                            <details key={item.q} className="group py-5">
                                <summary className="flex items-center justify-between gap-4 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                                    <span className="text-lg font-semibold text-slate-950">{item.q}</span>
                                    <span className="size-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 transition-transform group-open:rotate-180">
                                        <ChevronDown size={17} />
                                    </span>
                                </summary>
                                <p className="mt-3 text-base text-slate-600 leading-relaxed pr-12">{item.a}</p>
                            </details>
                        ))}
                    </div>
                </div>
            </section>

            {/* ─────────────── Llamado final ─────────────── */}
            <section className="px-4 sm:px-6 py-16 lg:py-20">
                <div className="max-w-7xl mx-auto relative overflow-hidden rounded-[2rem] text-white px-6 sm:px-12 py-14 sm:py-16" style={{ background: `linear-gradient(135deg, ${BRAND} 0%, #0047B3 100%)` }}>
                    <div className="absolute -right-24 -bottom-32 size-96 rounded-full bg-white/10 pointer-events-none" aria-hidden />
                    <div className="absolute right-40 -top-24 size-60 rounded-full bg-sky-300/20 pointer-events-none" aria-hidden />
                    <div className="relative grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-10 items-center">
                        <div>
                            <h2 className="text-4xl sm:text-5xl font-bold tracking-tight leading-[1.05]" style={{ color: 'white' }}>
                                ¿Y si tu negocio tuviera su propia app desde hoy?
                            </h2>
                            <p className="mt-4 text-lg text-blue-100">Elige tu tipo de negocio y empieza en minutos.</p>
                            <div className="mt-6 flex flex-wrap gap-2">
                                {[
                                    ['Servicios y spa', 'servicios'],
                                    ['Restaurantes', 'restaurante'],
                                    ['Tiendas', 'tienda'],
                                    ['Canchas', 'canchas'],
                                    ['Gimnasios', 'gimnasio'],
                                    ['Clínicas', 'dentista'],
                                    ['Lavanderías', 'lavanderia'],
                                ].map(([label, tipo]) => (
                                    <Link
                                        key={tipo}
                                        href={`/register?tipo=${tipo}`}
                                        className="px-3.5 py-1.5 rounded-full bg-white/15 hover:bg-white/25 text-sm font-medium transition-colors"
                                    >
                                        {label}
                                    </Link>
                                ))}
                            </div>
                        </div>
                        <div className="flex lg:justify-end">
                            <Link
                                href="/register"
                                className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-white text-[#0047B3] hover:bg-blue-50 text-lg font-semibold shadow-xl shadow-blue-950/20 transition-colors"
                            >
                                Crear mi app gratis
                                <ArrowRight size={20} />
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* ─────────────── Pie de página ─────────────── */}
            <footer className="border-t border-slate-200/70 bg-white">
                <div className="max-w-6xl mx-auto px-5 sm:px-8 lg:px-10 pt-14 pb-10">
                    <div className="flex flex-col md:flex-row justify-between gap-10">
                        <div className="max-w-sm">
                            <CitioxLogo className="h-10 w-auto" />
                            <p className="mt-4 text-[15px] text-slate-600 leading-relaxed">
                                La app de tu negocio para recibir reservas, pedidos y ventas, y hacer que tus clientes vuelvan.
                            </p>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 sm:gap-14 text-[15px]">
                            <div>
                                <p className="font-semibold text-slate-950 mb-3">Soluciones</p>
                                <ul className="space-y-2.5 text-slate-600">
                                    <li><Link href="/servicios" className="hover:text-slate-950">Servicios y spa</Link></li>
                                    <li><Link href="/restaurantes" className="hover:text-slate-950">Restaurantes</Link></li>
                                    <li><Link href="/tiendas" className="hover:text-slate-950">Tiendas</Link></li>
                                    <li><Link href="/canchas" className="hover:text-slate-950">Canchas</Link></li>
                                    <li><Link href="/lavanderias" className="hover:text-slate-950">Lavanderías</Link></li>
                                    <li><Link href="/register?tipo=gimnasio" className="hover:text-slate-950">Gimnasios</Link></li>
                                    <li><Link href="/register?tipo=dentista" className="hover:text-slate-950">Clínicas</Link></li>
                                </ul>
                            </div>
                            <div>
                                <p className="font-semibold text-slate-950 mb-3">Citiox</p>
                                <ul className="space-y-2.5 text-slate-600">
                                    <li><a href="#como-funciona" className="hover:text-slate-950">Cómo funciona</a></li>
                                    <li><a href="#preguntas" className="hover:text-slate-950">Preguntas</a></li>
                                    <li><Link href="/register" className="hover:text-slate-950">Crear cuenta</Link></li>
                                    <li><Link href="/login" className="hover:text-slate-950">Entrar</Link></li>
                                </ul>
                            </div>
                            <div className="col-span-2 sm:col-span-1">
                                <p className="font-semibold text-slate-950 mb-3">Legal</p>
                                <ul className="space-y-2.5 text-slate-600">
                                    <li><Link href="/terminos" className="hover:text-slate-950">Términos de servicio</Link></li>
                                    <li><Link href="/privacidad" className="hover:text-slate-950">Política de privacidad</Link></li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    <div className="mt-12 pt-6 border-t border-slate-200/70 text-sm text-slate-500">
                        © {year} Citiox. Todos los derechos reservados.
                    </div>
                </div>
            </footer>
        </div>
    );
}
