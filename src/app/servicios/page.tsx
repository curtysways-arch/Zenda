import Link from 'next/link';
import { 
    Scissors, 
    Calendar, 
    Clock, 
    Users, 
    Sparkles, 
    CheckCircle2, 
    MessageCircle, 
    ShieldCheck, 
    Star,
    Award
} from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: "Citiox para Servicios & Citas | Tu app y agenda inteligente",
    description: "Crea la presencia en línea de tu salón, spa o negocio de servicios: citas 24/7, catálogo de servicios, recordatorios por WhatsApp y ficha de clientes.",
};

export default function ServiciosLandingPage() {
    return (
        <div className="min-h-screen bg-slate-50/60 text-slate-900 font-sans selection:bg-pink-500 selection:text-white overflow-x-hidden">
            
            {/* Header / Navbar */}
            <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-xs">
                <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
                    <Link href="/" className="flex items-center gap-2.5 group">
                        <img src="/logo-citiox.png" alt="Citiox" className="h-10 w-auto object-contain" />
                        <span className="text-2xl font-black tracking-tight text-slate-900">
                            Citi<span className="text-pink-600">Ox</span>
                        </span>
                        <span className="ml-2 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-pink-50 text-pink-600 border border-pink-200/60 hidden sm:inline-block">
                            Citas & Servicios
                        </span>
                    </Link>

                    <div className="flex items-center gap-4">
                        <Link href="/login" className="text-xs font-bold text-slate-700 hover:text-pink-600 transition-colors">
                            Iniciar sesión
                        </Link>
                        <Link
                            href="/register?tipo=SPA"
                            className="bg-pink-600 hover:bg-pink-700 text-white px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-md shadow-pink-500/20 active:scale-95 flex items-center gap-1.5"
                        >
                            CREAR MI NEGOCIO &rarr;
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <header className="relative pt-14 pb-20 bg-gradient-to-b from-pink-50/50 via-white to-slate-50/50 overflow-hidden">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
                        
                        <div className="lg:col-span-7 space-y-6 text-left">
                            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-pink-100/80 text-pink-700 border border-pink-200 rounded-full text-xs font-black uppercase tracking-wider">
                                <Sparkles className="w-4 h-4" /> Solución para estética, salud y profesionales
                            </div>

                            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-slate-950 tracking-tight leading-[1.08]">
                                Tu app de servicios <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-600 via-rose-600 to-purple-600">
                                    y citas 24/7.
                                </span>
                            </h1>

                            <p className="text-slate-600 text-base md:text-lg font-medium leading-relaxed max-w-xl">
                                Deja de responder mensajes para coordinar horarios. Con Citiox tus clientes ven tus servicios, eligen a su profesional favorito y reservan directamente en tu enlace.
                            </p>

                            <div className="flex flex-wrap gap-3 text-xs font-bold text-slate-700">
                                <span className="flex items-center gap-1.5 bg-white px-3.5 py-2 rounded-xl border border-slate-200/80 shadow-2xs">
                                    <CheckCircle2 size={16} className="text-pink-600" /> Agenda Online Automática
                                </span>
                                <span className="flex items-center gap-1.5 bg-white px-3.5 py-2 rounded-xl border border-slate-200/80 shadow-2xs">
                                    <CheckCircle2 size={16} className="text-pink-600" /> Confirmación por WhatsApp
                                </span>
                                <span className="flex items-center gap-1.5 bg-white px-3.5 py-2 rounded-xl border border-slate-200/80 shadow-2xs">
                                    <CheckCircle2 size={16} className="text-pink-600" /> Ficha y Control de Clientes
                                </span>
                                <span className="flex items-center gap-1.5 bg-white px-3.5 py-2 rounded-xl border border-slate-200/80 shadow-2xs">
                                    <CheckCircle2 size={16} className="text-pink-600" /> Gestión de Profesionales
                                </span>
                            </div>

                            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                                <Link
                                    href="/register?tipo=SPA"
                                    className="bg-gradient-to-r from-pink-600 to-rose-600 hover:brightness-110 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-wider text-center transition-all shadow-xl shadow-pink-500/25 active:scale-95 flex items-center justify-center gap-2"
                                >
                                    CREAR MI NEGOCIO GRATIS &rarr;
                                </Link>
                                <Link
                                    href="/symechas-peluquera"
                                    target="_blank"
                                    className="bg-white hover:bg-slate-50 text-slate-800 border-2 border-slate-200 px-7 py-4 rounded-2xl font-black text-xs uppercase tracking-wider text-center transition-all shadow-xs flex items-center justify-center gap-2"
                                >
                                    Ver Ejemplo en Vivo ➔
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
                                        <span className="text-[10px] font-mono text-slate-400 ml-2">citiox.com/tu-salon</span>
                                    </div>
                                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">Reservas 24/7</span>
                                </div>

                                <div className="space-y-3">
                                    <div className="bg-slate-800/80 p-3.5 rounded-2xl border border-slate-700/60 flex items-center justify-between">
                                        <div>
                                            <p className="text-[10px] uppercase font-black text-pink-400">Reserva Confirmada</p>
                                            <p className="font-extrabold text-sm text-white">Corte + Balayage Premium con Sofía</p>
                                        </div>
                                        <span className="text-xs font-black text-emerald-400">Hoy, 15:30</span>
                                    </div>

                                    <div className="bg-slate-800/80 p-3.5 rounded-2xl border border-slate-700/60 flex items-center justify-between">
                                        <div>
                                            <p className="text-[10px] uppercase font-black text-emerald-400">Recordatorio Automático</p>
                                            <p className="font-extrabold text-sm text-white">WhatsApp enviado 2h antes al cliente</p>
                                        </div>
                                        <span className="text-[10px] font-black px-2 py-1 bg-emerald-500/20 text-emerald-300 rounded-lg">SIN AUSENCIAS</span>
                                    </div>

                                    <div className="bg-slate-800/80 p-3.5 rounded-2xl border border-slate-700/60 flex items-center justify-between">
                                        <div>
                                            <p className="text-[10px] uppercase font-black text-purple-400">Ficha de Cliente</p>
                                            <p className="font-extrabold text-sm text-white">Historial de visitas, servicios y notas</p>
                                        </div>
                                        <span className="text-[10px] font-black px-2 py-1 bg-purple-500/20 text-purple-300 rounded-lg">HISTORIAL</span>
                                    </div>
                                </div>

                                <div className="pt-2 text-center">
                                    <p className="text-xs font-bold text-slate-400">Tus clientes agendan a cualquier hora sin esperas.</p>
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
                        Organiza tu tiempo y duplica tus clientes
                    </h2>
                    <p className="text-slate-600 font-medium">
                        Todo lo que necesitas para tu peluquería, spa, barbería o estudio profesional.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
                        <div className="size-12 rounded-2xl bg-pink-50 text-pink-600 flex items-center justify-center font-black">
                            <Calendar size={26} />
                        </div>
                        <h3 className="text-xl font-black text-slate-900">Agenda Inteligente</h3>
                        <p className="text-slate-600 text-sm leading-relaxed">
                            Evita cruces de horarios y huecos vacíos. Configura la duración de cada servicio y la disponibilidad exacta de cada profesional de tu equipo.
                        </p>
                    </div>

                    <div className="bg-white p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
                        <div className="size-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black">
                            <MessageCircle size={26} />
                        </div>
                        <h3 className="text-xl font-black text-slate-900">Recordatorios WhatsApp</h3>
                        <p className="text-slate-600 text-sm leading-relaxed">
                            Reduce cancelaciones y ausencias en más del 80% enviando confirmaciones y recordatorios amigables directo al WhatsApp del cliente.
                        </p>
                    </div>

                    <div className="bg-white p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
                        <div className="size-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-black">
                            <Users size={26} />
                        </div>
                        <h3 className="text-xl font-black text-slate-900">Fidelización & Clientes</h3>
                        <p className="text-slate-600 text-sm leading-relaxed">
                            Conoce las preferencias de cada cliente, sus servicios frecuentes, historial de pagos y lanza promociones exclusivas para hacerlos volver.
                        </p>
                    </div>
                </div>
            </section>

            {/* Bottom CTA */}
            <section className="py-16 bg-gradient-to-r from-pink-600 via-rose-600 to-purple-600 text-white text-center px-6">
                <div className="max-w-4xl mx-auto space-y-6">
                    <h2 className="text-3xl sm:text-5xl font-black tracking-tight">
                        Moderniza la gestión de tus citas.
                    </h2>
                    <p className="text-pink-100 text-base sm:text-lg max-w-2xl mx-auto font-medium">
                        Crea la presencia en línea de tu negocio de servicios en 3 minutos. Prueba gratis.
                    </p>
                    <div>
                        <Link
                            href="/register?tipo=SPA"
                            className="inline-flex items-center gap-2 bg-white text-slate-950 hover:bg-pink-50 px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-wider shadow-2xl transition-all active:scale-95"
                        >
                            CREAR MI NEGOCIO &rarr;
                        </Link>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-10 bg-white border-t border-slate-200/80 text-center text-xs text-slate-500 font-bold">
                <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <Link href="/" className="font-black text-slate-800">
                        Citi<span className="text-pink-600">Ox</span> © 2026 — Plataforma Digital para Negocios
                    </Link>
                    <div className="flex items-center gap-6">
                        <Link href="/restaurantes" className="hover:text-slate-900">Restaurantes</Link>
                        <Link href="/tiendas" className="hover:text-slate-900">Tiendas</Link>
                        <Link href="/lavanderias" className="hover:text-slate-900">Lavanderías</Link>
                        <Link href="/canchas" className="hover:text-slate-900">Canchas</Link>
                    </div>
                </div>
            </footer>

        </div>
    );
}
