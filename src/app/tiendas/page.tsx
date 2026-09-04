import Link from 'next/link';
import { 
    ShoppingBag, 
    Layers, 
    Truck, 
    Boxes, 
    Sparkles, 
    CheckCircle2, 
    CreditCard, 
    TrendingUp, 
    Globe,
    Smartphone
} from 'lucide-react';
import type { Metadata } from 'next';
import prisma from '@/lib/prisma';
import FamilyPricingSection from '@/components/pricing/FamilyPricingSection';

export const metadata: Metadata = {
    title: "Citiox para Tiendas | Tu app y catálogo digital de ventas",
    description: "Crea la presencia digital de tu tienda: catálogo en línea, variantes, inventario, pedidos por WhatsApp, carrito de compras y delivery.",
};

export default async function TiendasLandingPage() {
    const family = await prisma.planFamily.findUnique({
        where: { code: 'TIENDA' },
        include: {
            plans: {
                where: { activo: true, isPublic: true },
                orderBy: { displayOrder: 'asc' },
                include: {
                    planEntitlements: {
                        where: { enabled: true },
                        include: { module: true }
                    }
                }
            }
        }
    });
    return (
        <div className="min-h-screen bg-slate-50/60 text-slate-900 font-sans selection:bg-indigo-500 selection:text-white overflow-x-hidden">
            
            {/* Header / Navbar */}
            <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-xs">
                <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
                    <Link href="/" className="flex items-center gap-2.5 group">
                        <img src="/logo-citiox.png" alt="Citiox" className="h-10 w-auto object-contain" />
                        <span className="text-2xl font-black tracking-tight text-slate-900">
                            Citi<span className="text-indigo-600">Ox</span>
                        </span>
                        <span className="ml-2 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-600 border border-indigo-200/60 hidden sm:inline-block">
                            Tiendas & Comercio
                        </span>
                    </Link>

                    <div className="flex items-center gap-4">
                        <Link href="/login" className="text-xs font-bold text-slate-700 hover:text-indigo-600 transition-colors">
                            Iniciar sesión
                        </Link>
                        <Link
                            href="/register?tipo=TIENDA"
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-md shadow-indigo-500/20 active:scale-95 flex items-center gap-1.5"
                        >
                            CREAR MI TIENDA &rarr;
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <header className="relative pt-14 pb-20 bg-gradient-to-b from-indigo-50/50 via-white to-slate-50/50 overflow-hidden">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
                        
                        <div className="lg:col-span-7 space-y-6 text-left">
                            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-indigo-100/80 text-indigo-700 border border-indigo-200 rounded-full text-xs font-black uppercase tracking-wider">
                                <ShoppingBag className="w-4 h-4" /> Solución para comercio y retail
                            </div>

                            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-slate-950 tracking-tight leading-[1.08]">
                                Tu catálogo, pedidos <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-sky-600 to-purple-600">
                                    y ventas en línea.
                                </span>
                            </h1>

                            <p className="text-slate-600 text-base md:text-lg font-medium leading-relaxed max-w-xl">
                                Mucho más que una tienda estática. Con Citiox tus clientes exploran tus productos en una app móvil fluida, eligen tallas o colores, arman su carrito y te pagan directamente.
                            </p>

                            <div className="flex flex-wrap gap-3 text-xs font-bold text-slate-700">
                                <span className="flex items-center gap-1.5 bg-white px-3.5 py-2 rounded-xl border border-slate-200/80 shadow-2xs">
                                    <CheckCircle2 size={16} className="text-indigo-600" /> Catálogo con Variantes
                                </span>
                                <span className="flex items-center gap-1.5 bg-white px-3.5 py-2 rounded-xl border border-slate-200/80 shadow-2xs">
                                    <CheckCircle2 size={16} className="text-indigo-600" /> Control de Stock en Vivo
                                </span>
                                <span className="flex items-center gap-1.5 bg-white px-3.5 py-2 rounded-xl border border-slate-200/80 shadow-2xs">
                                    <CheckCircle2 size={16} className="text-indigo-600" /> Carrito + WhatsApp Checkout
                                </span>
                                <span className="flex items-center gap-1.5 bg-white px-3.5 py-2 rounded-xl border border-slate-200/80 shadow-2xs">
                                    <CheckCircle2 size={16} className="text-indigo-600" /> Punto de Venta en Mostrador
                                </span>
                            </div>

                            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                                <Link
                                    href="/register?tipo=TIENDA"
                                    className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:brightness-110 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-wider text-center transition-all shadow-xl shadow-indigo-500/25 active:scale-95 flex items-center justify-center gap-2"
                                >
                                    CREAR MI TIENDA GRATIS &rarr;
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
                                        <span className="text-[10px] font-mono text-slate-400 ml-2">citiox.com/tu-tienda</span>
                                    </div>
                                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">PWA Activa</span>
                                </div>

                                <div className="space-y-3">
                                    <div className="bg-slate-800/80 p-3.5 rounded-2xl border border-slate-700/60 flex items-center justify-between">
                                        <div>
                                            <p className="text-[10px] uppercase font-black text-indigo-400">Nuevo Pedido Recibido</p>
                                            <p className="font-extrabold text-sm text-white">Hoodie Oversize (Negro / Talla L)</p>
                                        </div>
                                        <span className="text-xs font-black text-emerald-400">$38.00</span>
                                    </div>

                                    <div className="bg-slate-800/80 p-3.5 rounded-2xl border border-slate-700/60 flex items-center justify-between">
                                        <div>
                                            <p className="text-[10px] uppercase font-black text-sky-400">Inventario Automático</p>
                                            <p className="font-extrabold text-sm text-white">Stock descontado: 12 disponibles</p>
                                        </div>
                                        <span className="text-[10px] font-black px-2 py-1 bg-sky-500/20 text-sky-300 rounded-lg">STOCK OK</span>
                                    </div>

                                    <div className="bg-slate-800/80 p-3.5 rounded-2xl border border-slate-700/60 flex items-center justify-between">
                                        <div>
                                            <p className="text-[10px] uppercase font-black text-purple-400">Envío & Despacho</p>
                                            <p className="font-extrabold text-sm text-white">Guía generada • Notificación WhatsApp</p>
                                        </div>
                                        <span className="text-[10px] font-black px-2 py-1 bg-purple-500/20 text-purple-300 rounded-lg">DESPACHO</span>
                                    </div>
                                </div>

                                <div className="pt-2 text-center">
                                    <p className="text-xs font-bold text-slate-400">Tus clientes compran desde cualquier celular en segundos.</p>
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
                        La infraestructura de venta que tu negocio merece
                    </h2>
                    <p className="text-slate-600 font-medium">
                        Control de inventario, pasarela o cobro contra entrega y sincronización en tiempo real.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
                        <div className="size-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black">
                            <Layers size={26} />
                        </div>
                        <h3 className="text-xl font-black text-slate-900">Variantes & Atributos</h3>
                        <p className="text-slate-600 text-sm leading-relaxed">
                            Organiza por tallas, colores, materiales o modelos con fotos individuales y precios específicos para cada combinación.
                        </p>
                    </div>

                    <div className="bg-white p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
                        <div className="size-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center font-black">
                            <Boxes size={26} />
                        </div>
                        <h3 className="text-xl font-black text-slate-900">Inventario en Tiempo Real</h3>
                        <p className="text-slate-600 text-sm leading-relaxed">
                            Cada venta descuenta automáticamente tu inventario para que nunca vendas lo que no tienes disponible en bodega o local.
                        </p>
                    </div>

                    <div className="bg-white p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
                        <div className="size-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-black">
                            <Truck size={26} />
                        </div>
                        <h3 className="text-xl font-black text-slate-900">Envíos & Checkout Rápido</h3>
                        <p className="text-slate-600 text-sm leading-relaxed">
                            Carrito sin fricciones con entrega a domicilio o retiro en tienda y confirmación inmediata por WhatsApp al cliente.
                        </p>
                    </div>
                </div>
            </section>

            {/* Planes para Tiendas & Comercio */}
            <FamilyPricingSection
                familyCode="TIENDA"
                familyName="Tiendas & Comercio Digital"
                familyThemeColor="#4f46e5"
                plans={family?.plans || []}
                registerTipo="TIENDA"
            />

            {/* Bottom CTA */}
            <section className="py-16 bg-gradient-to-r from-indigo-600 via-sky-600 to-purple-600 text-white text-center px-6">
                <div className="max-w-4xl mx-auto space-y-6">
                    <h2 className="text-3xl sm:text-5xl font-black tracking-tight">
                        Empieza a vender en línea hoy mismo.
                    </h2>
                    <p className="text-indigo-100 text-base sm:text-lg max-w-2xl mx-auto font-medium">
                        Crea la app y catálogo digital de tu tienda en minutos. Prueba gratis sin tarjeta de crédito.
                    </p>
                    <div>
                        <Link
                            href="/register?tipo=TIENDA"
                            className="inline-flex items-center gap-2 bg-white text-slate-950 hover:bg-indigo-50 px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-wider shadow-2xl transition-all active:scale-95"
                        >
                            CREAR MI TIENDA &rarr;
                        </Link>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-10 bg-white border-t border-slate-200/80 text-center text-xs text-slate-500 font-bold">
                <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <Link href="/" className="font-black text-slate-800">
                        Citi<span className="text-indigo-600">Ox</span> © 2026 — Plataforma Digital para Negocios
                    </Link>
                    <div className="flex items-center gap-6">
                        <Link href="/restaurantes" className="hover:text-slate-900">Restaurantes</Link>
                        <Link href="/servicios" className="hover:text-slate-900">Servicios</Link>
                        <Link href="/lavanderias" className="hover:text-slate-900">Lavanderías</Link>
                        <Link href="/canchas" className="hover:text-slate-900">Canchas</Link>
                    </div>
                </div>
            </footer>

        </div>
    );
}
