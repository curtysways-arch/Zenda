import Link from 'next/link';
import { 
    Trophy, 
    Calendar, 
    Clock, 
    Users, 
    Sparkles, 
    CheckCircle2, 
    CreditCard, 
    ShieldCheck, 
    Activity,
    Swords
} from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: "Citiox para Canchas & Clubes | Tu app de reservas y torneos",
    description: "Crea la presencia en línea de tu club deportivo o complejo de canchas: reserva de turnos por hora, disponibilidad en vivo, señas y torneos.",
};

export default function CanchasLandingPage() {
    return (
        <div className="min-h-screen bg-slate-50/60 text-slate-900 font-sans selection:bg-emerald-500 selection:text-white overflow-x-hidden">
            
            {/* Header / Navbar */}
            <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-xs">
                <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
                    <Link href="/" className="flex items-center gap-2.5 group">
                        <img src="/logo-citiox.png" alt="Citiox" className="h-10 w-auto object-contain" />
                        <span className="text-2xl font-black tracking-tight text-slate-900">
                            Citi<span className="text-emerald-600">Ox</span>
                        </span>
                        <span className="ml-2 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200/60 hidden sm:inline-block">
                            Canchas & Clubes
                        </span>
                    </Link>

                    <div className="flex items-center gap-4">
                        <Link href="/login" className="text-xs font-bold text-slate-700 hover:text-emerald-600 transition-colors">
                            Iniciar sesión
                        </Link>
                        <Link
                            href="/register?tipo=SPORTS_COURTS"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-md shadow-emerald-500/20 active:scale-95 flex items-center gap-1.5"
                        >
                            CREAR MI NEGOCIO DE CANCHAS &rarr;
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <header className="relative pt-14 pb-20 bg-gradient-to-b from-emerald-50/50 via-white to-slate-50/50 overflow-hidden">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
                        
                        <div className="lg:col-span-7 space-y-6 text-left">
                            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-emerald-100/80 text-emerald-800 border border-emerald-200 rounded-full text-xs font-black uppercase tracking-wider">
                                <Trophy className="w-4 h-4" /> Solución para pádel, fútbol, tenis y complejos deportivos
                            </div>

                            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-slate-950 tracking-tight leading-[1.08]">
                                Reservas de turnos, <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600">
                                    canchas y torneos.
                                </span>
                            </h1>

                            <p className="text-slate-600 text-base md:text-lg font-medium leading-relaxed max-w-xl">
                                Dile adiós al cuaderno de reservas. Tus jugadores consultan horarios disponibles en tiempo real, reservan su turno, pagan su seña y reciben confirmación automática por WhatsApp.
                            </p>

                            <div className="flex flex-wrap gap-3 text-xs font-bold text-slate-700">
                                <span className="flex items-center gap-1.5 bg-white px-3.5 py-2 rounded-xl border border-slate-200/80 shadow-2xs">
                                    <CheckCircle2 size={16} className="text-emerald-600" /> Disponibilidad en Vivo
                                </span>
                                <span className="flex items-center gap-1.5 bg-white px-3.5 py-2 rounded-xl border border-slate-200/80 shadow-2xs">
                                    <CheckCircle2 size={16} className="text-emerald-600" /> Cobro de Señas & Pagos
                                </span>
                                <span className="flex items-center gap-1.5 bg-white px-3.5 py-2 rounded-xl border border-slate-200/80 shadow-2xs">
                                    <CheckCircle2 size={16} className="text-emerald-600" /> Iluminación & Turnos Fijos
                                </span>
                                <span className="flex items-center gap-1.5 bg-white px-3.5 py-2 rounded-xl border border-slate-200/80 shadow-2xs">
                                    <CheckCircle2 size={16} className="text-emerald-600" /> Torneos & Partidos Abiertos
                                </span>
                            </div>

                            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                                <Link
                                    href="/register?tipo=SPORTS_COURTS"
                                    className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-wider text-center transition-all shadow-xl shadow-emerald-500/25 active:scale-95 flex items-center justify-center gap-2"
                                >
                                    CREAR MI NEGOCIO DE CANCHAS &rarr;
                                </Link>
                                <Link
                                    href="/login"
                                    className="bg-white hover:bg-slate-50 text-slate-800 border-2 border-slate-200 px-7 py-4 rounded-2xl font-black text-xs uppercase tracking-wider text-center transition-all shadow-xs flex items-center justify-center gap-2"
                                >
                                    Explorar Panel ➔
                                </Link>
                            </div>
                        </div>

                        {/* Visual Mockup */}
                        <div className="lg:col-span-5 relative">
                            <div className="bg-slate-900 rounded-[2.5rem] p-4 sm:p-6 shadow-2xl text-white border border-slate-800 space-y-4">
                                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                                    <div className="flex items-center gap-2">
                                        <div className="size-3 rounded-full bg-rose-500" />
                                        <div className="size-3 rounded-full bg-amber-500" />
                                        <div className="size-3 rounded-full bg-emerald-500" />
                                        <span className="text-[10px] font-mono text-slate-400 ml-2">citiox.com/tu-club</span>
                                    </div>
                                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">En Vivo</span>
                                </div>

                                <div className="space-y-3">
                                    <div className="bg-slate-800/80 p-3.5 rounded-2xl border border-slate-700/60 flex items-center justify-between">
                                        <div>
                                            <p className="text-[10px] uppercase font-black text-emerald-400">Turno Reservado</p>
                                            <p className="font-extrabold text-sm text-white">Cancha 1 (Pádel Cristal) • 19:00 a 20:30</p>
                                        </div>
                                        <span className="text-xs font-black text-emerald-400">$30.00</span>
                                    </div>

                                    <div className="bg-slate-800/80 p-3.5 rounded-2xl border border-slate-700/60 flex items-center justify-between">
                                        <div>
                                            <p className="text-[10px] uppercase font-black text-teal-400">Seña Asegurada</p>
                                            <p className="font-extrabold text-sm text-white">50% abonado vía transferencia/pasarela</p>
                                        </div>
                                        <span className="text-[10px] font-black px-2 py-1 bg-teal-500/20 text-teal-300 rounded-lg">PAGADO</span>
                                    </div>

                                    <div className="bg-slate-800/80 p-3.5 rounded-2xl border border-slate-700/60 flex items-center justify-between">
                                        <div>
                                            <p className="text-[10px] uppercase font-black text-cyan-400">Partido Abierto</p>
                                            <p className="font-extrabold text-sm text-white">Faltan 2 jugadores • Nivel 4ta categoría</p>
                                        </div>
                                        <span className="text-[10px] font-black px-2 py-1 bg-cyan-500/20 text-cyan-300 rounded-lg">ABIERTO</span>
                                    </div>
                                </div>

                                <div className="pt-2 text-center">
                                    <p className="text-xs font-bold text-slate-400">Canchas llenas, cero superposición de horarios.</p>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </header>

            {/* Features Breakdown */}
            <section className="py-20 max-w-7xl mx-auto px-6">
                <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
                    <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                        La mejor experiencia para tu complejo y tus jugadores
                    </h2>
                    <p className="text-slate-600 font-medium">
                        Administra múltiples canchas, sedes, iluminación y eventos desde un único calendario.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
                        <div className="size-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black">
                            <Calendar size={26} />
                        </div>
                        <h3 className="text-xl font-black text-slate-900">Cuadrícula de Horarios</h3>
                        <p className="text-slate-600 text-sm leading-relaxed">
                            Vista general de todas tus canchas por hora con bloqueo de mantenimiento y gestión de turnos fijos semanales.
                        </p>
                    </div>

                    <div className="bg-white p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
                        <div className="size-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center font-black">
                            <CreditCard size={26} />
                        </div>
                        <h3 className="text-xl font-black text-slate-900">Señas & Pagos Previos</h3>
                        <p className="text-slate-600 text-sm leading-relaxed">
                            Evita que reserven y no asistan solicitando un porcentaje de seña previa con confirmación instantánea de comprobante.
                        </p>
                    </div>

                    <div className="bg-white p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
                        <div className="size-12 rounded-2xl bg-cyan-50 text-cyan-600 flex items-center justify-center font-black">
                            <Swords size={26} />
                        </div>
                        <h3 className="text-xl font-black text-slate-900">Partidos & Comunidad</h3>
                        <p className="text-slate-600 text-sm leading-relaxed">
                            Permite a tus clientes armar partidos abiertos, completar jugadores que falten y organizar torneos relámpago con tabla de posiciones.
                        </p>
                    </div>
                </div>
            </section>

            {/* Bottom CTA */}
            <section className="py-16 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white text-center px-6">
                <div className="max-w-4xl mx-auto space-y-6">
                    <h2 className="text-3xl sm:text-5xl font-black tracking-tight">
                        Optimiza la ocupación de tus canchas.
                    </h2>
                    <p className="text-emerald-100 text-base sm:text-lg max-w-2xl mx-auto font-medium">
                        Crea la presencia en línea de tu club deportivo hoy mismo. Prueba gratis.
                    </p>
                    <div>
                        <Link
                            href="/register?tipo=SPORTS_COURTS"
                            className="inline-flex items-center gap-2 bg-white text-slate-950 hover:bg-emerald-50 px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-wider shadow-2xl transition-all active:scale-95"
                        >
                            CREAR MI NEGOCIO DE CANCHAS &rarr;
                        </Link>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-10 bg-white border-t border-slate-200/80 text-center text-xs text-slate-500 font-bold">
                <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <Link href="/" className="font-black text-slate-800">
                        Citi<span className="text-emerald-600">Ox</span> © 2026 — Plataforma Digital para Negocios
                    </Link>
                    <div className="flex items-center gap-6">
                        <Link href="/restaurantes" className="hover:text-slate-900">Restaurantes</Link>
                        <Link href="/tiendas" className="hover:text-slate-900">Tiendas</Link>
                        <Link href="/servicios" className="hover:text-slate-900">Servicios</Link>
                        <Link href="/lavanderias" className="hover:text-slate-900">Lavanderías</Link>
                    </div>
                </div>
            </footer>

        </div>
    );
}
