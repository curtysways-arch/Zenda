import Link from 'next/link';
import { 
    Shirt, 
    Sparkles, 
    Truck, 
    Clock, 
    CheckCircle2, 
    QrCode, 
    ShieldCheck, 
    ArrowRight,
    Camera
} from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: "Citiox para Lavanderías & Calzado | Tu app de recepción y entregas",
    description: "Crea la presencia en línea de tu lavandería o sneaker wash: órdenes digitales, estados en vivo, fotos de inspección y delivery.",
};

export default function LavanderiasLandingPage() {
    return (
        <div className="min-h-screen bg-slate-50/60 text-slate-900 font-sans selection:bg-cyan-500 selection:text-white overflow-x-hidden">
            
            {/* Header / Navbar */}
            <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-xs">
                <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
                    <Link href="/" className="flex items-center gap-2.5 group">
                        <img src="/logo-citiox.png" alt="Citiox" className="h-10 w-auto object-contain" />
                        <span className="text-2xl font-black tracking-tight text-slate-900">
                            Citi<span className="text-cyan-600">Ox</span>
                        </span>
                        <span className="ml-2 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-cyan-50 text-cyan-700 border border-cyan-200/60 hidden sm:inline-block">
                            Lavanderías & Calzado
                        </span>
                    </Link>

                    <div className="flex items-center gap-4">
                        <Link href="/login" className="text-xs font-bold text-slate-700 hover:text-cyan-600 transition-colors">
                            Iniciar sesión
                        </Link>
                        <Link
                            href="/register?tipo=SHOE_CARE"
                            className="bg-cyan-600 hover:bg-cyan-700 text-white px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-md shadow-cyan-500/20 active:scale-95 flex items-center gap-1.5"
                        >
                            CREAR MI LAVANDERÍA &rarr;
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <header className="relative pt-14 pb-20 bg-gradient-to-b from-cyan-50/50 via-white to-slate-50/50 overflow-hidden">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
                        
                        <div className="lg:col-span-7 space-y-6 text-left">
                            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-cyan-100/80 text-cyan-800 border border-cyan-200 rounded-full text-xs font-black uppercase tracking-wider">
                                <Sparkles className="w-4 h-4" /> Solución para lavanderías, tintorerías y sneaker wash
                            </div>

                            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-slate-950 tracking-tight leading-[1.08]">
                                Control total de prendas, <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 via-sky-600 to-blue-600">
                                    estados y entregas.
                                </span>
                            </h1>

                            <p className="text-slate-600 text-base md:text-lg font-medium leading-relaxed max-w-xl">
                                Mucho más que recibos de papel. Citiox le da a tu lavandería un sistema con seguimiento en tiempo real para que tus clientes sepan exactamente cuándo su pedido está listo para recoger o en camino.
                            </p>

                            <div className="flex flex-wrap gap-3 text-xs font-bold text-slate-700">
                                <span className="flex items-center gap-1.5 bg-white px-3.5 py-2 rounded-xl border border-slate-200/80 shadow-2xs">
                                    <CheckCircle2 size={16} className="text-cyan-600" /> Recepción Digital Rápida
                                </span>
                                <span className="flex items-center gap-1.5 bg-white px-3.5 py-2 rounded-xl border border-slate-200/80 shadow-2xs">
                                    <CheckCircle2 size={16} className="text-cyan-600" /> Estados en Vivo (En Lavado / Listo)
                                </span>
                                <span className="flex items-center gap-1.5 bg-white px-3.5 py-2 rounded-xl border border-slate-200/80 shadow-2xs">
                                    <CheckCircle2 size={16} className="text-cyan-600" /> Avisos Automáticos WhatsApp
                                </span>
                                <span className="flex items-center gap-1.5 bg-white px-3.5 py-2 rounded-xl border border-slate-200/80 shadow-2xs">
                                    <CheckCircle2 size={16} className="text-cyan-600" /> Recolección & Delivery
                                </span>
                            </div>

                            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                                <Link
                                    href="/register?tipo=SHOE_CARE"
                                    className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:brightness-110 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-wider text-center transition-all shadow-xl shadow-cyan-500/25 active:scale-95 flex items-center justify-center gap-2"
                                >
                                    CREAR MI LAVANDERÍA GRATIS &rarr;
                                </Link>
                                <Link
                                    href="/demo-lavado"
                                    target="_blank"
                                    className="bg-white hover:bg-slate-50 text-slate-800 border-2 border-slate-200 px-7 py-4 rounded-2xl font-black text-xs uppercase tracking-wider text-center transition-all shadow-xs flex items-center justify-center gap-2"
                                >
                                    Ver Demo en Vivo ➔
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
                                        <span className="text-[10px] font-mono text-slate-400 ml-2">citiox.com/tu-lavanderia</span>
                                    </div>
                                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-400">Órdenes Online</span>
                                </div>

                                <div className="space-y-3">
                                    <div className="bg-slate-800/80 p-3.5 rounded-2xl border border-slate-700/60 flex items-center justify-between">
                                        <div>
                                            <p className="text-[10px] uppercase font-black text-cyan-400">Orden #240 — Recepción</p>
                                            <p className="font-extrabold text-sm text-white">2 Trajes + 1 Edredón King</p>
                                        </div>
                                        <span className="text-xs font-black text-emerald-400">$18.00</span>
                                    </div>

                                    <div className="bg-slate-800/80 p-3.5 rounded-2xl border border-slate-700/60 flex items-center justify-between">
                                        <div>
                                            <p className="text-[10px] uppercase font-black text-amber-400">Estado del Proceso</p>
                                            <p className="font-extrabold text-sm text-white">Planchado & Empaque listo</p>
                                        </div>
                                        <span className="text-[10px] font-black px-2 py-1 bg-amber-500/20 text-amber-300 rounded-lg">LISTO PARA RETIRO</span>
                                    </div>

                                    <div className="bg-slate-800/80 p-3.5 rounded-2xl border border-slate-700/60 flex items-center justify-between">
                                        <div>
                                            <p className="text-[10px] uppercase font-black text-emerald-400">Notificación al Cliente</p>
                                            <p className="font-extrabold text-sm text-white">WhatsApp enviado con link de seguimiento</p>
                                        </div>
                                        <span className="text-[10px] font-black px-2 py-1 bg-emerald-500/20 text-emerald-300 rounded-lg">ENTREGADO</span>
                                    </div>
                                </div>

                                <div className="pt-2 text-center">
                                    <p className="text-xs font-bold text-slate-400">Cero tickets perdidos. Mayor fidelidad de tus clientes.</p>
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
                        La herramienta que tu lavandería necesita
                    </h2>
                    <p className="text-slate-600 font-medium">
                        Controla cada prenda y mantén al cliente informado de cada avance.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
                        <div className="size-12 rounded-2xl bg-cyan-50 text-cyan-600 flex items-center justify-center font-black">
                            <QrCode size={26} />
                        </div>
                        <h3 className="text-xl font-black text-slate-900">Tickets Digitales QR</h3>
                        <p className="text-slate-600 text-sm leading-relaxed">
                            Genera comprobantes digitales inmediatos que el cliente consulta desde su celular sin perder el papel.
                        </p>
                    </div>

                    <div className="bg-white p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
                        <div className="size-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center font-black">
                            <Camera size={26} />
                        </div>
                        <h3 className="text-xl font-black text-slate-900">Fotos de Inspección</h3>
                        <p className="text-slate-600 text-sm leading-relaxed">
                            Registra el estado previo de las prendas o calzado con fotografías adjuntas a la orden para total tranquilidad.
                        </p>
                    </div>

                    <div className="bg-white p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
                        <div className="size-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-black">
                            <Truck size={26} />
                        </div>
                        <h3 className="text-xl font-black text-slate-900">Rutas de Recolección</h3>
                        <p className="text-slate-600 text-sm leading-relaxed">
                            Coordina servicios a domicilio con geolocalización y despacho organizado para tus repartidores.
                        </p>
                    </div>
                </div>
            </section>

            {/* Bottom CTA */}
            <section className="py-16 bg-gradient-to-r from-cyan-600 via-sky-600 to-blue-600 text-white text-center px-6">
                <div className="max-w-4xl mx-auto space-y-6">
                    <h2 className="text-3xl sm:text-5xl font-black tracking-tight">
                        Moderniza tu lavandería hoy.
                    </h2>
                    <p className="text-cyan-100 text-base sm:text-lg max-w-2xl mx-auto font-medium">
                        Crea tu presencia digital y sistema de recepción en minutos. Prueba gratis.
                    </p>
                    <div>
                        <Link
                            href="/register?tipo=SHOE_CARE"
                            className="inline-flex items-center gap-2 bg-white text-slate-950 hover:bg-cyan-50 px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-wider shadow-2xl transition-all active:scale-95"
                        >
                            CREAR MI LAVANDERÍA &rarr;
                        </Link>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-10 bg-white border-t border-slate-200/80 text-center text-xs text-slate-500 font-bold">
                <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <Link href="/" className="font-black text-slate-800">
                        Citi<span className="text-cyan-600">Ox</span> © 2026 — Plataforma Digital para Negocios
                    </Link>
                    <div className="flex items-center gap-6">
                        <Link href="/restaurantes" className="hover:text-slate-900">Restaurantes</Link>
                        <Link href="/tiendas" className="hover:text-slate-900">Tiendas</Link>
                        <Link href="/servicios" className="hover:text-slate-900">Servicios</Link>
                        <Link href="/canchas" className="hover:text-slate-900">Canchas</Link>
                    </div>
                </div>
            </footer>

        </div>
    );
}
