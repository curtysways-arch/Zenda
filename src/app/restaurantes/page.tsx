import Link from 'next/link';
import { 
    UtensilsCrossed, 
    Smartphone, 
    ChefHat, 
    Bike, 
    Store, 
    ArrowRight, 
    CheckCircle2, 
    Sparkles, 
    Flame,
    Receipt,
    Clock,
    Shield,
    QrCode,
    LayoutDashboard
} from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: "Citiox para Restaurantes | Tu app completa de gastronomía",
    description: "Crea la presencia en línea de tu restaurante: menú digital QR, comandas de cocina KDS, pedidos a mesa, delivery y punto de venta POS.",
};

export default function RestaurantesLandingPage() {
    return (
        <div className="min-h-screen bg-slate-50/60 text-slate-900 font-sans selection:bg-orange-500 selection:text-white overflow-x-hidden">
            
            {/* Header / Navbar */}
            <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-xs">
                <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
                    <Link href="/" className="flex items-center gap-2.5 group">
                        <img src="/logo-citiox.png" alt="Citiox" className="h-10 w-auto object-contain" />
                        <span className="text-2xl font-black tracking-tight text-slate-900">
                            Citi<span className="text-[#ea580c]">Ox</span>
                        </span>
                        <span className="ml-2 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-orange-50 text-[#ea580c] border border-orange-200/60 hidden sm:inline-block">
                            Restaurantes
                        </span>
                    </Link>

                    <div className="flex items-center gap-4">
                        <Link href="/login" className="text-xs font-bold text-slate-700 hover:text-[#ea580c] transition-colors">
                            Iniciar sesión
                        </Link>
                        <Link
                            href="/register?tipo=RESTAURANTE"
                            className="bg-[#ea580c] hover:bg-[#c2410c] text-white px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-md shadow-orange-500/20 active:scale-95 flex items-center gap-1.5"
                        >
                            CREAR MI RESTAURANTE &rarr;
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <header className="relative pt-14 pb-20 bg-gradient-to-b from-orange-50/50 via-white to-slate-50/50 overflow-hidden">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
                        
                        <div className="lg:col-span-7 space-y-6 text-left">
                            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-orange-100/80 text-[#ea580c] border border-orange-200 rounded-full text-xs font-black uppercase tracking-wider">
                                <Flame className="w-4 h-4" /> Solución integral para gastronomía
                            </div>

                            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-slate-950 tracking-tight leading-[1.08]">
                                La app completa para <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-600 via-amber-600 to-rose-600">
                                    tu restaurante.
                                </span>
                            </h1>

                            <p className="text-slate-600 text-base md:text-lg font-medium leading-relaxed max-w-xl">
                                Mucho más que un menú digital. Citiox crea la presencia en línea de tu restaurante y te da una app completa para recibir pedidos a mesa, comandas a cocina, delivery propio y cobros en mostrador.
                            </p>

                            <div className="flex flex-wrap gap-3 text-xs font-bold text-slate-700">
                                <span className="flex items-center gap-1.5 bg-white px-3.5 py-2 rounded-xl border border-slate-200/80 shadow-2xs">
                                    <CheckCircle2 size={16} className="text-[#ea580c]" /> Menú QR Interactivo
                                </span>
                                <span className="flex items-center gap-1.5 bg-white px-3.5 py-2 rounded-xl border border-slate-200/80 shadow-2xs">
                                    <CheckCircle2 size={16} className="text-[#ea580c]" /> Pantalla de Cocina (KDS)
                                </span>
                                <span className="flex items-center gap-1.5 bg-white px-3.5 py-2 rounded-xl border border-slate-200/80 shadow-2xs">
                                    <CheckCircle2 size={16} className="text-[#ea580c]" /> Pedidos & Delivery Propio
                                </span>
                                <span className="flex items-center gap-1.5 bg-white px-3.5 py-2 rounded-xl border border-slate-200/80 shadow-2xs">
                                    <CheckCircle2 size={16} className="text-[#ea580c]" /> Punto de Venta POS Rápido
                                </span>
                            </div>

                            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                                <Link
                                    href="/register?tipo=RESTAURANTE"
                                    className="bg-gradient-to-r from-[#ea580c] to-[#c2410c] hover:brightness-110 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-wider text-center transition-all shadow-xl shadow-orange-500/25 active:scale-95 flex items-center justify-center gap-2"
                                >
                                    CREAR MI RESTAURANTE GRATIS &rarr;
                                </Link>
                                <Link
                                    href="/parrilla-citiox-demo"
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
                                        <span className="text-[10px] font-mono text-slate-400 ml-2">citiox.com/tu-restaurante</span>
                                    </div>
                                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">En línea</span>
                                </div>

                                <div className="space-y-3">
                                    <div className="bg-slate-800/80 p-3.5 rounded-2xl border border-slate-700/60 flex items-center justify-between">
                                        <div>
                                            <p className="text-[10px] uppercase font-black text-orange-400">Cliente escanea QR Mesa 4</p>
                                            <p className="font-extrabold text-sm text-white">Comanda #104 — Costillitas BBQ + 2 Bebidas</p>
                                        </div>
                                        <span className="text-xs font-black text-emerald-400">$24.50</span>
                                    </div>

                                    <div className="bg-slate-800/80 p-3.5 rounded-2xl border border-slate-700/60 flex items-center justify-between">
                                        <div>
                                            <p className="text-[10px] uppercase font-black text-amber-400">Pantalla de Cocina (KDS)</p>
                                            <p className="font-extrabold text-sm text-white">En preparación • Mesa 4 (Hace 3 min)</p>
                                        </div>
                                        <span className="text-[10px] font-black px-2 py-1 bg-amber-500/20 text-amber-300 rounded-lg">COCINA</span>
                                    </div>

                                    <div className="bg-slate-800/80 p-3.5 rounded-2xl border border-slate-700/60 flex items-center justify-between">
                                        <div>
                                            <p className="text-[10px] uppercase font-black text-blue-400">Caja / Mostrador</p>
                                            <p className="font-extrabold text-sm text-white">POS Táctil — Cobro inmediato o cuenta abierta</p>
                                        </div>
                                        <span className="text-[10px] font-black px-2 py-1 bg-blue-500/20 text-blue-300 rounded-lg">POS</span>
                                    </div>
                                </div>

                                <div className="pt-2 text-center">
                                    <p className="text-xs font-bold text-slate-400">Infraestructura digital completa sin comisiones por pedido.</p>
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
                        Todo lo que tu restaurante necesita para operar
                    </h2>
                    <p className="text-slate-600 font-medium">
                        Desde que el cliente ve tu menú hasta que el plato sale de la cocina y se cobra en caja.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
                        <div className="size-12 rounded-2xl bg-orange-50 text-[#ea580c] flex items-center justify-center font-black">
                            <QrCode size={26} />
                        </div>
                        <h3 className="text-xl font-black text-slate-900">Menú QR & Pedidos a Mesa</h3>
                        <p className="text-slate-600 text-sm leading-relaxed">
                            Tus comensales escanean el QR de su mesa, ven platos con fotos de alta calidad, seleccionan extras y envían la comanda directamente a la cocina sin esperar al mesero.
                        </p>
                    </div>

                    <div className="bg-white p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
                        <div className="size-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-black">
                            <ChefHat size={26} />
                        </div>
                        <h3 className="text-xl font-black text-slate-900">Comandas en Cocina (KDS)</h3>
                        <p className="text-slate-600 text-sm leading-relaxed">
                            Despide las comandas de papel perdidas. Tu equipo de cocina ve los pedidos en tiempo real organizados por mesa, estado y tiempo de espera en cualquier tablet o pantalla.
                        </p>
                    </div>

                    <div className="bg-white p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
                        <div className="size-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center font-black">
                            <Bike size={26} />
                        </div>
                        <h3 className="text-xl font-black text-slate-900">Delivery Propio sin 30% de Comisión</h3>
                        <p className="text-slate-600 text-sm leading-relaxed">
                            Recibe pedidos para llevar o a domicilio directamente por tu enlace de Citiox y por WhatsApp, con cálculo de entrega por GPS y gestión de repartidores propios.
                        </p>
                    </div>
                </div>
            </section>

            {/* Bottom CTA */}
            <section className="py-16 bg-gradient-to-r from-orange-600 via-amber-600 to-rose-600 text-white text-center px-6">
                <div className="max-w-4xl mx-auto space-y-6">
                    <h2 className="text-3xl sm:text-5xl font-black tracking-tight">
                        Lleva tu restaurante al mundo digital hoy.
                    </h2>
                    <p className="text-orange-100 text-base sm:text-lg max-w-2xl mx-auto font-medium">
                        Crea la presencia en línea de tu restaurante en minutos. Prueba gratis sin compromiso.
                    </p>
                    <div>
                        <Link
                            href="/register?tipo=RESTAURANTE"
                            className="inline-flex items-center gap-2 bg-white text-slate-950 hover:bg-orange-50 px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-wider shadow-2xl transition-all active:scale-95"
                        >
                            CREAR MI RESTAURANTE &rarr;
                        </Link>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-10 bg-white border-t border-slate-200/80 text-center text-xs text-slate-500 font-bold">
                <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <Link href="/" className="font-black text-slate-800">
                        Citi<span className="text-[#ea580c]">Ox</span> © 2026 — Plataforma Digital para Negocios
                    </Link>
                    <div className="flex items-center gap-6">
                        <Link href="/tiendas" className="hover:text-slate-900">Tiendas</Link>
                        <Link href="/servicios" className="hover:text-slate-900">Servicios</Link>
                        <Link href="/lavanderias" className="hover:text-slate-900">Lavanderías</Link>
                        <Link href="/canchas" className="hover:text-slate-900">Canchas</Link>
                    </div>
                </div>
            </footer>

        </div>
    );
}
