import Link from 'next/link';
import { 
    Check, 
    ArrowRight, 
    Smartphone, 
    Star, 
    BarChart3, 
    Sparkles, 
    Calendar, 
    Users, 
    ChevronDown, 
    UtensilsCrossed, 
    ShoppingBag, 
    Scissors, 
    Shirt, 
    Trophy, 
    Dumbbell, 
    Store, 
    SlidersHorizontal, 
    CreditCard, 
    Tag, 
    CheckCircle2, 
    XCircle,
    Bell,
    ExternalLink,
    Lock,
    Shield
} from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: "Citiox | Tu negocio. Tu propia app.",
    description: "No importa qué tipo de negocio tengas. Con Citiox puedes crear la app de tu negocio para recibir clientes, vender, gestionar reservas, pedidos, servicios, membresías y mucho más.",
    openGraph: {
        title: "Citiox | Tu negocio. Tu propia app.",
        description: "No importa qué tipo de negocio tengas. Con Citiox crea la app de tu negocio.",
        images: ["/logo-citiox.png"],
        type: "website"
    }
};

const ToothIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M7 3C4.24 3 2 5.24 2 8c0 3.5 2 6 3 9.5C6 21 8 21 9 18c.5-1.5 1-3 3-3s2.5 1.5 3 3c1 3 3 3 4-0.5 1-3.5 3-6 3-9.5 0-2.76-2.24-5-5-5-1.5 0-2.8.7-3.8 1.8-.2.2-.4.4-.6.6a1 1 0 0 1-1.2 0c-.2-.2-.4-.4-.6-.6C10.8 3.7 9.5 3 7 3z" />
    </svg>
);

const CitioxBrandLogo = ({ className = "h-11 sm:h-12 w-auto" }: { className?: string }) => (
    <div className="flex items-center">
        <img 
            src="/citiox-logo-horizontal.png" 
            alt="Citiox" 
            className={`object-contain select-none ${className}`} 
        />
    </div>
);
export default function LandingPage() {
    return (
        <div className="min-h-screen bg-[#FAFCFF] text-slate-900 font-sans selection:bg-[#0066FF] selection:text-white overflow-x-hidden">

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* 1. NAVBAR SUPERIOR                                              */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-100">
                <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
                    
                    {/* Brand Logo */}
                    <Link href="/" className="group flex items-center transition-transform hover:scale-105">
                        <CitioxBrandLogo className="h-10 sm:h-12 w-auto" />
                    </Link>
                    
                    {/* Menú de Enlaces */}
                    <div className="hidden lg:flex items-center gap-7 text-xs font-bold text-slate-600">
                        <a href="#verticales" className="hover:text-[#0066FF] transition-colors flex items-center gap-1">
                            Soluciones <ChevronDown size={13} className="text-slate-400" />
                        </a>
                        <a href="#como-funciona" className="hover:text-[#0066FF] transition-colors flex items-center gap-1">
                            Cómo funciona <ChevronDown size={13} className="text-slate-400" />
                        </a>
                        <a href="#verticales" className="hover:text-[#0066FF] transition-colors flex items-center gap-1">
                            Para tu negocio <ChevronDown size={13} className="text-slate-400" />
                        </a>
                        <a href="/admin/plan" className="hover:text-[#0066FF] transition-colors">
                            Precios
                        </a>
                        <a href="#funciones" className="hover:text-[#0066FF] transition-colors flex items-center gap-1">
                            Recursos <ChevronDown size={13} className="text-slate-400" />
                        </a>
                    </div>

                    {/* Acciones */}
                    <div className="flex items-center gap-4">
                        <Link
                            href="/login"
                            className="text-xs font-bold text-slate-700 hover:text-[#0066FF] px-2 py-1.5 transition-colors"
                        >
                            Iniciar sesión
                        </Link>
                        <Link
                            href="/register"
                            className="bg-[#0066FF] hover:bg-[#0052cc] text-white px-5 py-2.5 rounded-full font-extrabold text-xs transition-all shadow-md shadow-blue-500/20 active:scale-95 flex items-center gap-1.5"
                        >
                            <span>Crear mi app</span>
                            <ArrowRight size={13} />
                        </Link>
                    </div>
                </div>
            </nav>

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* 2. HERO PRINCIPAL CON MOCKUPS INTERACTIVOS Y RESPONSIVOS        */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            <header className="relative pt-8 sm:pt-12 md:pt-16 pb-14 md:pb-24 overflow-hidden bg-gradient-to-b from-[#EEF5FF]/80 via-[#F7FAFF]/50 to-[#FAFCFF]">
                
                {/* Resplandores de fondo */}
                <div className="absolute top-1/4 right-10 w-[550px] h-[550px] bg-gradient-to-tr from-blue-200/40 via-sky-200/40 to-indigo-100/30 rounded-full blur-3xl -z-10 pointer-events-none" />
                <div className="absolute top-10 left-1/3 w-[300px] h-[300px] bg-blue-100/30 rounded-full blur-2xl -z-10 pointer-events-none" />

                <div className="max-w-7xl mx-auto px-6">
                    <div className="flex flex-col lg:flex-row items-center justify-start gap-8 lg:gap-8 xl:gap-10">
                        
                        {/* Columna Izquierda: Mensaje y CTA */}
                        <div className="w-full lg:w-[420px] xl:w-[460px] shrink-0 space-y-6 text-center lg:text-left z-20 flex flex-col items-center lg:items-start">
                            
                            {/* Tag Badge */}
                            <div className="inline-flex items-center px-3.5 py-1.5 rounded-full bg-[#E8F1FF] text-[#0066FF] text-[11px] font-black uppercase tracking-wider">
                                TU NEGOCIO EN UNA APP
                            </div>
                            
                            {/* Titular */}
                            <h1 className="text-4xl sm:text-5xl lg:text-[42px] xl:text-[52px] font-black text-slate-950 tracking-tight leading-[1.08]">
                                Tu negocio.<br />
                                <span className="text-[#0066FF]">Tu propia app.</span>
                            </h1>
                            
                            {/* Subtítulo */}
                            <div className="space-y-2 text-slate-600 text-base md:text-lg leading-relaxed max-w-lg font-medium mx-auto lg:mx-0">
                                <p className="font-bold text-slate-900">
                                    No importa qué tipo de negocio tengas.
                                </p>
                                <p className="text-slate-500 text-sm md:text-base">
                                    Con Citiox puedes crear la app de tu negocio para recibir clientes, vender, gestionar reservas, pedidos, servicios, membresías y mucho más.
                                </p>
                            </div>

                            {/* Botón Principal */}
                            <div className="pt-2 w-full flex justify-center lg:justify-start">
                                <Link
                                    href="/register"
                                    className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-[#0066FF] hover:bg-[#0052cc] text-white font-extrabold text-sm shadow-xl shadow-blue-500/30 hover:shadow-blue-500/40 active:scale-95 transition-all"
                                >
                                    <span>Crear mi app gratis</span>
                                    <ArrowRight size={16} />
                                </Link>
                            </div>

                            {/* Checks de Confianza */}
                            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-y-2 gap-x-5 text-xs font-semibold text-slate-600 pt-2">
                                <span className="flex items-center gap-1.5">
                                    <Check size={14} className="text-[#0066FF] stroke-[3]" />
                                    Sin complicaciones
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <Check size={14} className="text-[#0066FF] stroke-[3]" />
                                    Configúrala a tu manera
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <Check size={14} className="text-[#0066FF] stroke-[3]" />
                                    Empieza en minutos
                                </span>
                            </div>
                        </div>

                        {/* Columna Derecha: Mockups Realistas (Móvil y Desktop diferenciados) */}
                        <div className="w-full flex-1 flex justify-center lg:justify-start items-center overflow-visible">
                            
                            {/* ─── VISTA MÓVIL: LAS 2 DEMOS QUE LE GUSTABAN (Gimnasio & Dentista - Sin Lavandería) ─── */}
                            <div className="lg:hidden w-full flex justify-center items-center py-4">
                                <div className="relative flex items-center justify-center -space-x-6 xs:-space-x-8 sm:-space-x-10 max-w-full select-none">
                                    
                                    {/* Móvil Demo 1: GIMNASIO & FITNESS */}
                                    <div className="w-[165px] xs:w-[185px] sm:w-[215px] h-[345px] xs:h-[385px] sm:h-[445px] bg-white rounded-[2.2rem] xs:rounded-[2.6rem] p-1.5 xs:p-2 shadow-2xl shadow-blue-500/20 border-[5px] xs:border-[6px] border-slate-950 shrink-0 z-20 transform -rotate-3 hover:rotate-0 transition-all duration-300 group/phoneM1">
                                        {/* Isla Dinámica con acceso a pantalla completa */}
                                        <div className="relative flex items-center justify-between px-2 mb-1 pt-0.5">
                                            <div className="w-12 xs:w-16 h-2.5 xs:h-3.5 bg-slate-950 rounded-full mx-auto flex items-center justify-center">
                                                <div className="size-1 xs:size-1.5 rounded-full bg-slate-800 ml-auto mr-1" />
                                            </div>
                                            <a 
                                                href="/vortex-fitness" 
                                                target="_blank" 
                                                rel="noopener noreferrer" 
                                                className="absolute right-1 top-0 size-5 rounded-full bg-slate-950 text-white flex items-center justify-center text-[8px] hover:bg-[#0066FF] transition-colors"
                                                title="Abrir app en pantalla completa"
                                            >
                                                <ExternalLink size={10} />
                                            </a>
                                        </div>

                                        {/* Pantalla con Iframe */}
                                        <div className="h-[calc(100%-20px)] xs:h-[calc(100%-25px)] bg-slate-950 rounded-[1.6rem] xs:rounded-[1.9rem] overflow-hidden relative border border-slate-900 shadow-inner">
                                            <div className="absolute top-1 left-1.5 z-20 pointer-events-none flex items-center gap-1 bg-blue-600/90 backdrop-blur-sm text-white px-1.5 py-0.5 rounded-full text-[6.5px] xs:text-[7.5px] font-black">
                                                <span className="size-1 rounded-full bg-emerald-300 animate-pulse" />
                                                <span>Gimnasio & Fitness</span>
                                            </div>
                                            <iframe 
                                                src="/vortex-fitness" 
                                                title="FitZone Vortex Demo"
                                                className="w-[390px] h-[800px] origin-top-left scale-[0.40] xs:scale-[0.45] sm:scale-[0.52] border-0 select-none pointer-events-auto"
                                                loading="lazy"
                                            />
                                        </div>
                                    </div>

                                    {/* Móvil Demo 2: DENTAL CHIP (Clínica Dental) */}
                                    <div className="w-[155px] xs:w-[175px] sm:w-[205px] h-[335px] xs:h-[375px] sm:h-[430px] bg-white rounded-[2.2rem] xs:rounded-[2.5rem] p-1.5 xs:p-2 shadow-2xl shadow-slate-900/10 border-[5px] xs:border-[5.5px] border-slate-900 shrink-0 z-10 transform rotate-3 translate-y-2 hover:rotate-0 transition-all duration-300 group/phoneM2">
                                        <div className="relative flex items-center justify-between px-2 mb-1 pt-0.5">
                                            <div className="w-10 xs:w-14 h-2.5 xs:h-3 bg-slate-900 rounded-full mx-auto" />
                                            <a 
                                                href="/dental-chip" 
                                                target="_blank" 
                                                rel="noopener noreferrer" 
                                                className="absolute right-1 top-0 size-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[8px] hover:bg-sky-600 transition-colors"
                                                title="Abrir app en pantalla completa"
                                            >
                                                <ExternalLink size={10} />
                                            </a>
                                        </div>

                                        {/* Pantalla con Iframe */}
                                        <div className="h-[calc(100%-20px)] xs:h-[calc(100%-24px)] bg-slate-50 rounded-[1.6rem] xs:rounded-[1.8rem] overflow-hidden relative border border-slate-100 shadow-inner">
                                            <div className="absolute top-1 left-1.5 z-20 pointer-events-none flex items-center gap-1 bg-sky-600/90 backdrop-blur-sm text-white px-1.5 py-0.5 rounded-full text-[6.5px] xs:text-[7.5px] font-bold">
                                                <ToothIcon className="w-2 h-2 text-white" />
                                                <span>Clínica Dental</span>
                                            </div>
                                            <iframe 
                                                src="/dental-chip" 
                                                title="Dental Chip Demo"
                                                className="w-[375px] h-[780px] origin-top-left scale-[0.38] xs:scale-[0.43] sm:scale-[0.50] border-0 select-none pointer-events-auto"
                                                loading="lazy"
                                            />
                                        </div>
                                    </div>

                                </div>
                            </div>

                            {/* ─── VISTA DESKTOP: LOS 4 TELÉFONOS DESBORDÁNDOSE POR LA DERECHA (BLEED-OFF-SCREEN) ─── */}
                            <div className="hidden lg:flex w-full justify-start items-center select-none overflow-visible lg:pl-1 xl:pl-3">
                                <div className="relative flex items-center -space-x-7 lg:-space-x-8 xl:-space-x-9 shrink-0">
                                    
                                    {/* TELÉFONO 1: LA PARRILLA (Restaurante Demo en Vivo) */}
                                    <div className="w-[185px] xl:w-[210px] h-[390px] xl:h-[440px] bg-white rounded-[2.4rem] xl:rounded-[2.7rem] p-2 shadow-2xl shadow-slate-900/10 border-[5px] border-slate-900/90 shrink-0 transform -rotate-6 translate-y-6 hover:rotate-0 hover:scale-105 hover:z-40 transition-all duration-300 z-10 group/phone1">
                                        <div className="relative flex items-center justify-between px-2 mb-1.5 pt-0.5">
                                            <div className="w-12 xl:w-14 h-3 bg-slate-900 rounded-full mx-auto" />
                                            <a 
                                                href="/parrilla-citiox-demo" 
                                                target="_blank" 
                                                rel="noopener noreferrer" 
                                                className="absolute right-1 top-0 size-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[8px] hover:bg-[#0066FF] transition-colors"
                                                title="Abrir app en pantalla completa"
                                            >
                                                <ExternalLink size={10} />
                                            </a>
                                        </div>
                                        <div className="h-[calc(100%-24px)] bg-white rounded-[1.6rem] xl:rounded-[1.8rem] overflow-hidden relative border border-slate-100 shadow-inner">
                                            <div className="absolute top-1 left-2 z-20 pointer-events-none flex items-center gap-1 bg-slate-900/85 backdrop-blur-sm text-white px-1.5 py-0.5 rounded-full text-[7px] font-bold">
                                                <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                                <span>Restaurante</span>
                                            </div>
                                            <iframe 
                                                src="/parrilla-citiox-demo" 
                                                title="La Parrilla Demo"
                                                className="w-[375px] h-[780px] origin-top-left scale-[0.49] xl:scale-[0.55] border-0 select-none pointer-events-auto"
                                                loading="lazy"
                                            />
                                        </div>
                                    </div>

                                    {/* TELÉFONO 2: FITZONE / VORTEX (Gimnasio Demo en Vivo - Central) */}
                                    <div className="w-[205px] xl:w-[235px] h-[430px] xl:h-[485px] bg-white rounded-[2.6rem] xl:rounded-[2.9rem] p-2 shadow-2xl shadow-blue-500/25 border-[6px] border-slate-950 shrink-0 z-30 transform hover:scale-105 hover:z-40 transition-all duration-300 group/phone2">
                                        <div className="relative flex items-center justify-between px-2 mb-1.5 pt-0.5">
                                            <div className="w-16 xl:w-18 h-3.5 bg-slate-950 rounded-full mx-auto flex items-center justify-center">
                                                <div className="size-1.5 rounded-full bg-slate-800 ml-auto mr-1.5" />
                                            </div>
                                            <a 
                                                href="/vortex-fitness" 
                                                target="_blank" 
                                                rel="noopener noreferrer" 
                                                className="absolute right-1 top-0 size-5 rounded-full bg-slate-950 text-white flex items-center justify-center text-[8px] hover:bg-[#0066FF] transition-colors"
                                                title="Abrir app en pantalla completa"
                                            >
                                                <ExternalLink size={10} />
                                            </a>
                                        </div>
                                        <div className="h-[calc(100%-26px)] bg-slate-950 rounded-[1.8rem] xl:rounded-[2rem] overflow-hidden relative border border-slate-900 shadow-inner">
                                            <div className="absolute top-1 left-2 z-20 pointer-events-none flex items-center gap-1 bg-blue-600/90 backdrop-blur-sm text-white px-2 py-0.5 rounded-full text-[7.5px] font-black">
                                                <span className="size-1.5 rounded-full bg-emerald-300 animate-pulse" />
                                                <span>Gimnasio & Fitness</span>
                                            </div>
                                            <iframe 
                                                src="/vortex-fitness" 
                                                title="FitZone Vortex Demo"
                                                className="w-[390px] h-[800px] origin-top-left scale-[0.53] xl:scale-[0.60] border-0 select-none pointer-events-auto"
                                                loading="lazy"
                                            />
                                        </div>
                                    </div>

                                    {/* TELÉFONO 3: DENTAL CHIP (Clínica Dental Demo en Vivo - Reemplazó Lavandería) */}
                                    <div className="w-[190px] xl:w-[215px] h-[400px] xl:h-[450px] bg-white rounded-[2.4rem] xl:rounded-[2.7rem] p-2 shadow-2xl shadow-slate-900/10 border-[5px] border-slate-900/90 shrink-0 transform rotate-3 translate-y-4 hover:rotate-0 hover:scale-105 hover:z-40 transition-all duration-300 z-20 group/phone3">
                                        <div className="relative flex items-center justify-between px-2 mb-1.5 pt-0.5">
                                            <div className="w-12 xl:w-14 h-3 bg-slate-900 rounded-full mx-auto" />
                                            <a 
                                                href="/dental-chip" 
                                                target="_blank" 
                                                rel="noopener noreferrer" 
                                                className="absolute right-1 top-0 size-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[8px] hover:bg-sky-600 transition-colors"
                                                title="Abrir app en pantalla completa"
                                            >
                                                <ExternalLink size={10} />
                                            </a>
                                        </div>
                                        <div className="h-[calc(100%-24px)] bg-slate-50 rounded-[1.7rem] xl:rounded-[1.8rem] overflow-hidden relative border border-slate-100 shadow-inner">
                                            <div className="absolute top-1 left-2 z-20 pointer-events-none flex items-center gap-1 bg-sky-600/90 backdrop-blur-sm text-white px-1.5 py-0.5 rounded-full text-[7px] font-bold">
                                                <ToothIcon className="w-2 h-2 text-white" />
                                                <span>Clínica Dental</span>
                                            </div>
                                            <iframe 
                                                src="/dental-chip" 
                                                title="Dental Chip Demo"
                                                className="w-[375px] h-[780px] origin-top-left scale-[0.50] xl:scale-[0.56] border-0 select-none pointer-events-auto"
                                                loading="lazy"
                                            />
                                        </div>
                                    </div>

                                    {/* TELÉFONO 4: MI TIENDA (E-commerce Retail Demo en Vivo - Se asoma y desborda por la derecha) */}
                                    <div className="w-[180px] xl:w-[205px] h-[380px] xl:h-[430px] bg-white rounded-[2.3rem] xl:rounded-[2.6rem] p-2 shadow-2xl shadow-slate-900/10 border-[5px] border-slate-900/90 shrink-0 transform rotate-8 translate-y-8 hover:rotate-0 hover:scale-105 hover:z-40 transition-all duration-300 z-10 group/phone4">
                                        <div className="relative flex items-center justify-between px-2 mb-1.5 pt-0.5">
                                            <div className="w-10 xl:w-12 h-2.5 bg-slate-900 rounded-full mx-auto" />
                                            <a 
                                                href="/tienda" 
                                                target="_blank" 
                                                rel="noopener noreferrer" 
                                                className="absolute right-1 top-0 size-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[8px] hover:bg-purple-600 transition-colors"
                                                title="Abrir app en pantalla completa"
                                            >
                                                <ExternalLink size={10} />
                                            </a>
                                        </div>
                                        <div className="h-[calc(100%-22px)] bg-white rounded-[1.5rem] xl:rounded-[1.6rem] overflow-hidden relative border border-slate-100 shadow-inner">
                                            <div className="absolute top-1 left-2 z-20 pointer-events-none flex items-center gap-1 bg-purple-600/90 backdrop-blur-sm text-white px-1.5 py-0.5 rounded-full text-[7px] font-bold">
                                                <span className="size-1.5 rounded-full bg-emerald-300 animate-pulse" />
                                                <span>Tienda & Retail</span>
                                            </div>
                                            <iframe 
                                                src="/tienda" 
                                                title="Citiox Store Demo"
                                                className="w-[375px] h-[780px] origin-top-left scale-[0.47] xl:scale-[0.53] border-0 select-none pointer-events-auto"
                                                loading="lazy"
                                            />
                                        </div>
                                    </div>

                                </div>
                            </div>

                        </div>

                    </div>
                </div>
            </header>

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* 3. GRID DE VERTICALES: UNA APP DIFERENTE PARA CADA NEGOCIO     */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            <section id="verticales" className="py-20 bg-white border-t border-slate-100 relative">
                <div className="max-w-7xl mx-auto px-6">
                    
                    {/* Encabezado con Anotación Manuscrita */}
                    <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
                        <div className="space-y-3 max-w-2xl text-left">
                            <span className="inline-block px-3 py-1 rounded-full bg-[#E8F1FF] text-[#0066FF] text-[11px] font-black tracking-wider uppercase">
                                ¿QUÉ TIPO DE NEGOCIO TIENES?
                            </span>
                            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-950 tracking-tight leading-tight">
                                Una app diferente<br />
                                para cada forma de hacer negocios.
                            </h2>
                            <p className="text-slate-500 text-sm sm:text-base font-medium">
                                Citiox adapta la experiencia de tu app a la manera en que funciona tu negocio.
                            </p>
                        </div>

                        {/* Anotación decorativa manuscrita con flecha */}
                        <div className="hidden md:flex items-center gap-2 text-sky-600 font-serif italic text-sm font-semibold select-none pb-2">
                            <span>Elige tu vertical y empieza hoy</span>
                            <svg width="40" height="40" viewBox="0 0 50 50" fill="none" className="text-sky-500 stroke-current -rotate-12">
                                <path d="M12 12 C 26 14, 38 24, 36 40 M 36 40 L 26 36 M 36 40 L 40 30" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                        </div>
                    </div>

                    {/* Las 7 Tarjetas de Verticales */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
                        
                        {/* 1. SERVICIOS */}
                        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col justify-between text-left group">
                            <div>
                                <div className="size-11 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <Scissors size={20} />
                                </div>
                                <h3 className="text-base font-black text-slate-900 mb-1">Servicios</h3>
                                <p className="text-[11px] text-slate-400 font-medium mb-4 leading-tight">
                                    Citas, clientes y servicios.
                                </p>
                                <ul className="space-y-1 text-xs text-slate-600 font-semibold mb-6">
                                    <li className="flex items-center gap-1.5"><span className="text-slate-300">•</span> Peluquerías</li>
                                    <li className="flex items-center gap-1.5"><span className="text-slate-300">•</span> Barberías</li>
                                    <li className="flex items-center gap-1.5"><span className="text-slate-300">•</span> Spas</li>
                                    <li className="flex items-center gap-1.5"><span className="text-slate-300">•</span> Uñas y más</li>
                                </ul>
                            </div>
                            <Link 
                                href="/register?tipo=servicios" 
                                className="text-[11px] font-extrabold text-[#0066FF] hover:text-[#0052cc] flex items-center gap-1 group-hover:translate-x-0.5 transition-transform"
                            >
                                <span>Crear app de servicios</span>
                                <span>&rarr;</span>
                            </Link>
                        </div>

                        {/* 2. RESTAURANTES */}
                        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col justify-between text-left group">
                            <div>
                                <div className="size-11 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <UtensilsCrossed size={20} />
                                </div>
                                <h3 className="text-base font-black text-slate-900 mb-1">Restaurantes</h3>
                                <p className="text-[11px] text-slate-400 font-medium mb-4 leading-tight">
                                    Pedidos, mesas y ventas.
                                </p>
                                <ul className="space-y-1 text-xs text-slate-600 font-semibold mb-6">
                                    <li className="flex items-center gap-1.5"><span className="text-slate-300">•</span> Menú digital</li>
                                    <li className="flex items-center gap-1.5"><span className="text-slate-300">•</span> Pedidos</li>
                                    <li className="flex items-center gap-1.5"><span className="text-slate-300">•</span> Mesas QR</li>
                                    <li className="flex items-center gap-1.5"><span className="text-slate-300">•</span> Delivery y más</li>
                                </ul>
                            </div>
                            <Link 
                                href="/register?tipo=restaurante" 
                                className="text-[11px] font-extrabold text-[#0066FF] hover:text-[#0052cc] flex items-center gap-1 group-hover:translate-x-0.5 transition-transform"
                            >
                                <span>Crear app para restaurante</span>
                                <span>&rarr;</span>
                            </Link>
                        </div>

                        {/* 3. TIENDAS */}
                        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col justify-between text-left group">
                            <div>
                                <div className="size-11 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <ShoppingBag size={20} />
                                </div>
                                <h3 className="text-base font-black text-slate-900 mb-1">Tiendas</h3>
                                <p className="text-[11px] text-slate-400 font-medium mb-4 leading-tight">
                                    Tu tienda siempre en el bolsillo de tus clientes.
                                </p>
                                <ul className="space-y-1 text-xs text-slate-600 font-semibold mb-6">
                                    <li className="flex items-center gap-1.5"><span className="text-slate-300">•</span> Catálogo</li>
                                    <li className="flex items-center gap-1.5"><span className="text-slate-300">•</span> Variantes</li>
                                    <li className="flex items-center gap-1.5"><span className="text-slate-300">•</span> Carrito</li>
                                    <li className="flex items-center gap-1.5"><span className="text-slate-300">•</span> Pagos y más</li>
                                </ul>
                            </div>
                            <Link 
                                href="/register?tipo=tienda" 
                                className="text-[11px] font-extrabold text-[#0066FF] hover:text-[#0052cc] flex items-center gap-1 group-hover:translate-x-0.5 transition-transform"
                            >
                                <span>Crear tienda app</span>
                                <span>&rarr;</span>
                            </Link>
                        </div>

                        {/* 4. CANCHAS */}
                        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col justify-between text-left group">
                            <div>
                                <div className="size-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <Trophy size={20} />
                                </div>
                                <h3 className="text-base font-black text-slate-900 mb-1">Canchas</h3>
                                <p className="text-[11px] text-slate-400 font-medium mb-4 leading-tight">
                                    Tus canchas, reservas y clientes en un solo lugar.
                                </p>
                                <ul className="space-y-1 text-xs text-slate-600 font-semibold mb-6">
                                    <li className="flex items-center gap-1.5"><span className="text-slate-300">•</span> Reservas</li>
                                    <li className="flex items-center gap-1.5"><span className="text-slate-300">•</span> Disponibilidad</li>
                                    <li className="flex items-center gap-1.5"><span className="text-slate-300">•</span> Horarios</li>
                                    <li className="flex items-center gap-1.5"><span className="text-slate-300">•</span> Pagos y más</li>
                                </ul>
                            </div>
                            <Link 
                                href="/register?tipo=canchas" 
                                className="text-[11px] font-extrabold text-[#0066FF] hover:text-[#0052cc] flex items-center gap-1 group-hover:translate-x-0.5 transition-transform"
                            >
                                <span>Crear app de canchas</span>
                                <span>&rarr;</span>
                            </Link>
                        </div>

                        {/* 5. LAVANDERÍAS */}
                        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col justify-between text-left group">
                            <div>
                                <div className="size-11 rounded-2xl bg-cyan-50 text-cyan-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <Shirt size={20} />
                                </div>
                                <h3 className="text-base font-black text-slate-900 mb-1">Lavanderías</h3>
                                <p className="text-[11px] text-slate-400 font-medium mb-4 leading-tight">
                                    Recibe, gestiona y entrega tus servicios.
                                </p>
                                <ul className="space-y-1 text-xs text-slate-600 font-semibold mb-6">
                                    <li className="flex items-center gap-1.5"><span className="text-slate-300">•</span> Solicitudes</li>
                                    <li className="flex items-center gap-1.5"><span className="text-slate-300">•</span> Recolección</li>
                                    <li className="flex items-center gap-1.5"><span className="text-slate-300">•</span> Artículos</li>
                                    <li className="flex items-center gap-1.5"><span className="text-slate-300">•</span> Estados y más</li>
                                </ul>
                            </div>
                            <Link 
                                href="/register?tipo=lavanderia" 
                                className="text-[11px] font-extrabold text-[#0066FF] hover:text-[#0052cc] flex items-center gap-1 group-hover:translate-x-0.5 transition-transform"
                            >
                                <span>Crear app de lavandería</span>
                                <span>&rarr;</span>
                            </Link>
                        </div>

                        {/* 6. GIMNASIOS */}
                        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col justify-between text-left group">
                            <div>
                                <div className="size-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <Dumbbell size={20} />
                                </div>
                                <h3 className="text-base font-black text-slate-900 mb-1">Gimnasios</h3>
                                <p className="text-[11px] text-slate-400 font-medium mb-4 leading-tight">
                                    Convierte tu gimnasio en una experiencia digital.
                                </p>
                                <ul className="space-y-1 text-xs text-slate-600 font-semibold mb-6">
                                    <li className="flex items-center gap-1.5"><span className="text-slate-300">•</span> Membresías</li>
                                    <li className="flex items-center gap-1.5"><span className="text-slate-300">•</span> Planes</li>
                                    <li className="flex items-center gap-1.5"><span className="text-slate-300">•</span> Asistencias</li>
                                    <li className="flex items-center gap-1.5"><span className="text-slate-300">•</span> Clases y más</li>
                                </ul>
                            </div>
                            <Link 
                                href="/register?tipo=gimnasio" 
                                className="text-[11px] font-extrabold text-[#0066FF] hover:text-[#0052cc] flex items-center gap-1 group-hover:translate-x-0.5 transition-transform"
                            >
                                <span>Crear app de gimnasio</span>
                                <span>&rarr;</span>
                            </Link>
                        </div>

                        {/* 7. CLÍNICAS Y ODONTOLOGÍA */}
                        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col justify-between text-left group">
                            <div>
                                <div className="size-11 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <ToothIcon className="size-5" />
                                </div>
                                <h3 className="text-base font-black text-slate-900 mb-1">Clínicas y odontología</h3>
                                <p className="text-[11px] text-slate-400 font-medium mb-4 leading-tight">
                                    Una experiencia digital para tus pacientes.
                                </p>
                                <ul className="space-y-1 text-xs text-slate-600 font-semibold mb-6">
                                    <li className="flex items-center gap-1.5"><span className="text-slate-300">•</span> Pacientes</li>
                                    <li className="flex items-center gap-1.5"><span className="text-slate-300">•</span> Citas</li>
                                    <li className="flex items-center gap-1.5"><span className="text-slate-300">•</span> Historia clínica</li>
                                    <li className="flex items-center gap-1.5"><span className="text-slate-300">•</span> Tratamientos y más</li>
                                </ul>
                            </div>
                            <Link 
                                href="/register?tipo=dentista" 
                                className="text-[11px] font-extrabold text-[#0066FF] hover:text-[#0052cc] flex items-center gap-1 group-hover:translate-x-0.5 transition-transform"
                            >
                                <span>Crear app para mi clínica</span>
                                <span>&rarr;</span>
                            </Link>
                        </div>

                    </div>
                </div>
            </section>

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* 4. COMPARATIVA: NO ES SOLO UNA WEB. ES LA APP DE TU NEGOCIO.    */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            <section id="como-funciona" className="py-20 md:py-28 bg-[#EEF5FF]/70 border-t border-b border-blue-100/60 relative overflow-hidden">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
                        
                        {/* Texto Izquierdo */}
                        <div className="lg:col-span-4 space-y-5 text-left">
                            <h2 className="text-3xl sm:text-4xl lg:text-[44px] font-black text-slate-950 tracking-tight leading-[1.12]">
                                No es solo una página web.<br />
                                <span className="text-[#0066FF]">Es la app de tu negocio.</span>
                            </h2>
                            <p className="text-slate-600 text-sm sm:text-base font-medium leading-relaxed">
                                Una experiencia móvil, rápida y completa para que tus clientes te encuentren, compren, reserven y vuelvan.
                            </p>
                            <div className="pt-2">
                                <Link
                                    href="/register"
                                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#0066FF] hover:bg-[#0052cc] text-white font-extrabold text-xs shadow-md shadow-blue-500/20 active:scale-95 transition-all"
                                >
                                    <span>Ver cómo funciona</span>
                                    <ArrowRight size={14} />
                                </Link>
                            </div>
                        </div>

                        {/* Comparativa Cara a Cara en el Centro */}
                        <div className="lg:col-span-5 flex items-center justify-center">
                            <div className="relative flex items-center gap-3 w-full max-w-md">
                                
                                {/* Tarjeta: Página Web Tradicional */}
                                <div className="flex-1 bg-white/90 rounded-2xl p-4 border border-slate-200/80 shadow-xs text-left">
                                    <div className="flex items-center gap-1.5 pb-2 mb-3 border-b border-slate-100">
                                        <span className="text-sm">📄</span>
                                        <span className="text-[11px] font-extrabold text-slate-600 truncate">Página web tradicional</span>
                                    </div>
                                    <ul className="space-y-2 text-[11px] font-semibold text-slate-400">
                                        <li className="flex items-center gap-1.5 text-slate-500"><span>✓</span> Información</li>
                                        <li className="flex items-center gap-1.5 text-slate-500"><span>✓</span> El cliente visita</li>
                                        <li className="flex items-center gap-1.5 text-slate-500"><span>✓</span> Catálogo</li>
                                        <li className="flex items-center gap-1.5 text-slate-500"><span>✓</span> Contacto</li>
                                        <li className="flex items-center gap-1.5 text-slate-500"><span>✓</span> Formulario</li>
                                        <li className="flex items-center gap-1.5 text-slate-500"><span>✓</span> Una URL</li>
                                        <li className="flex items-center gap-1.5 text-slate-500"><span>✓</span> Difícil de actualizar</li>
                                    </ul>
                                </div>

                                {/* Insignia VS Central */}
                                <div className="size-8 rounded-full bg-[#0066FF] text-white flex items-center justify-center font-black text-[10px] shadow-md shadow-blue-500/30 shrink-0 z-10">
                                    VS
                                </div>

                                {/* Tarjeta: Tu App Citiox */}
                                <div className="flex-1 bg-white rounded-2xl p-4 border-2 border-blue-500/40 shadow-lg shadow-blue-500/10 text-left relative">
                                    <div className="flex items-center gap-1.5 pb-2 mb-3 border-b border-blue-100">
                                        <span className="text-sm">📱</span>
                                        <span className="text-[11px] font-black text-[#0066FF] truncate">Tu app Citiox</span>
                                    </div>
                                    <ul className="space-y-2 text-[11px] font-extrabold text-slate-800">
                                        <li className="flex items-center gap-1.5 text-[#0066FF]"><Check size={12} className="stroke-[3]" /> Información + interacción</li>
                                        <li className="flex items-center gap-1.5 text-[#0066FF]"><Check size={12} className="stroke-[3]" /> El cliente vuelve</li>
                                        <li className="flex items-center gap-1.5 text-[#0066FF]"><Check size={12} className="stroke-[3]" /> Catálogo + compra</li>
                                        <li className="flex items-center gap-1.5 text-[#0066FF]"><Check size={12} className="stroke-[3]" /> Acciones directas</li>
                                        <li className="flex items-center gap-1.5 text-[#0066FF]"><Check size={12} className="stroke-[3]" /> Reservas / pedidos</li>
                                        <li className="flex items-center gap-1.5 text-[#0066FF]"><Check size={12} className="stroke-[3]" /> Experiencia de app</li>
                                        <li className="flex items-center gap-1.5 text-[#0066FF]"><Check size={12} className="stroke-[3]" /> Tú la gestionas</li>
                                    </ul>
                                </div>

                            </div>
                        </div>

                        {/* Teléfono con Simulación de Admin Citiox a la Derecha */}
                        <div className="lg:col-span-3 flex justify-center items-center">
                            <div className="w-[230px] h-[430px] bg-slate-950 rounded-[2.8rem] p-2.5 shadow-2xl shadow-blue-950/30 border-[5px] border-slate-900 relative overflow-hidden flex flex-col justify-between select-none">
                                
                                {/* Dynamic Island / Speaker & Status Bar */}
                                <div className="relative z-20 flex items-center justify-between px-3 pt-1 text-[9px] font-semibold text-slate-400">
                                    <span>9:41</span>
                                    <div className="w-16 h-3.5 bg-black rounded-full flex items-center justify-end px-1.5">
                                        <div className="size-1.5 rounded-full bg-emerald-500 animate-ping" />
                                    </div>
                                    <div className="flex items-center gap-1 text-[8px]">
                                        <span>5G</span>
                                        <div className="w-3.5 h-1.5 border border-slate-700 rounded-xs p-[0.5px]">
                                            <div className="h-full w-full bg-emerald-500 rounded-[1px]" />
                                        </div>
                                    </div>
                                </div>

                                {/* Pantalla del Admin (Simulación Visual sin acciones) */}
                                <div className="flex-1 bg-slate-900 text-white rounded-[2rem] mt-1.5 p-2.5 flex flex-col justify-between border border-white/10 overflow-hidden relative">
                                    
                                    {/* Cabecera del Admin Móvil */}
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-1.5">
                                                <div className="size-5 rounded-lg bg-[#0066FF] flex items-center justify-center font-black text-[9px] text-white">
                                                    C
                                                </div>
                                                <div className="text-left">
                                                    <p className="text-[9px] font-black tracking-tight leading-none">Mi Negocio</p>
                                                    <p className="text-[7px] text-slate-400 font-medium">Panel Admin</p>
                                                </div>
                                            </div>
                                            <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[7px] font-black uppercase tracking-wider flex items-center gap-1">
                                                <span className="size-1 rounded-full bg-emerald-400 animate-pulse" /> En Vivo
                                            </span>
                                        </div>

                                        {/* Tarjeta de Ingresos y Operación del Día */}
                                        <div className="bg-white/5 border border-white/10 rounded-xl p-2 text-left">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <span className="text-[7px] font-bold text-slate-400 uppercase tracking-wider">Hoy en Caja</span>
                                                    <h4 className="text-sm font-black text-white">$485.00</h4>
                                                </div>
                                                <span className="text-[7px] font-bold text-emerald-400 bg-emerald-500/10 px-1 py-0.5 rounded">
                                                    ▲ +24%
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-1.5 mt-1.5 pt-1.5 border-t border-white/5 text-[7px]">
                                                <div>
                                                    <span className="text-slate-400">Accesos / Turnos:</span>
                                                    <p className="font-bold text-slate-200">18 hoy</p>
                                                </div>
                                                <div>
                                                    <span className="text-slate-400">Clientes activos:</span>
                                                    <p className="font-bold text-slate-200">9 dentro</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Botones de Acción Rápida (Simulados) */}
                                        <div className="grid grid-cols-2 gap-1.5 text-left">
                                            <div className="bg-[#0066FF]/20 border border-[#0066FF]/40 rounded-lg p-1.5 flex items-center gap-1.5">
                                                <div className="size-4 rounded-md bg-[#0066FF] flex items-center justify-center text-white text-[8px]">
                                                    ⚡
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-[7px] font-black text-white truncate">Escanear QR</p>
                                                    <p className="text-[6px] text-blue-200 truncate">Acceso rápido</p>
                                                </div>
                                            </div>
                                            <div className="bg-white/5 border border-white/10 rounded-lg p-1.5 flex items-center gap-1.5">
                                                <div className="size-4 rounded-md bg-white/10 flex items-center justify-center text-amber-400 text-[8px]">
                                                    💰
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-[7px] font-black text-white truncate">Cobro / Caja</p>
                                                    <p className="text-[6px] text-slate-400 truncate">Turno abierto</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Actividad en Vivo Reciente */}
                                        <div className="space-y-1 text-left">
                                            <span className="text-[7px] font-black uppercase text-slate-400 tracking-wider">Actividad en Vivo</span>
                                            <div className="space-y-1">
                                                <div className="bg-white/[0.04] rounded-lg p-1.5 flex items-center justify-between border border-white/5">
                                                    <div className="flex items-center gap-1.5 min-w-0">
                                                        <span className="size-1.5 rounded-full bg-emerald-400 shrink-0" />
                                                        <span className="text-[7px] font-bold text-slate-200 truncate">Check-in QR • Sofía M.</span>
                                                    </div>
                                                    <span className="text-[6px] text-slate-400 shrink-0">10:24</span>
                                                </div>
                                                <div className="bg-white/[0.04] rounded-lg p-1.5 flex items-center justify-between border border-white/5">
                                                    <div className="flex items-center gap-1.5 min-w-0">
                                                        <span className="size-1.5 rounded-full bg-blue-400 shrink-0" />
                                                        <span className="text-[7px] font-bold text-slate-200 truncate">Plan Mensual • $35</span>
                                                    </div>
                                                    <span className="text-[6px] text-slate-400 shrink-0">10:18</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Barra de Navegación Inferior Móvil de la App */}
                                    <div className="bg-white/5 rounded-xl px-3 py-1 flex justify-between items-center border border-white/10 text-[7px] text-slate-400 mt-2">
                                        <span className="text-[#0066FF] font-bold">Inicio</span>
                                        <span>Accesos</span>
                                        <span>Caja</span>
                                        <span>Socios</span>
                                    </div>

                                    {/* Indicador Home Bar de iPhone */}
                                    <div className="w-16 h-1 bg-white/30 rounded-full mx-auto mt-1" />
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </section>

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* 5. TU NEGOCIO CRECE. TU APP TAMBIÉN. (8 MÓDULOS)                */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            <section id="funciones" className="py-20 bg-white">
                <div className="max-w-7xl mx-auto px-6">
                    
                    {/* Encabezado */}
                    <div className="text-left space-y-2 mb-12">
                        <span className="inline-block px-3.5 py-1.5 rounded-full bg-[#E8F1FF] text-[#0066FF] text-[11px] font-black tracking-wider uppercase">
                            TODO LO QUE TU APP PUEDE HACER
                        </span>
                        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-950 tracking-tight leading-tight">
                            Tu negocio crece.<br />
                            Tu app también.
                        </h2>
                        <p className="text-slate-500 text-sm sm:text-base font-medium">
                            Gestiona todo desde un solo lugar, sin complicaciones.
                        </p>
                    </div>

                    {/* Fila de 8 Módulos Funcionales */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 sm:gap-4">
                        
                        {/* 1. Clientes */}
                        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs hover:shadow-md hover:border-blue-200 transition-all text-center flex flex-col items-center">
                            <div className="size-10 rounded-xl bg-blue-50 text-[#0066FF] flex items-center justify-center mb-3">
                                <Users size={18} />
                            </div>
                            <h4 className="text-xs font-black text-slate-900 mb-1">Clientes</h4>
                            <p className="text-[10px] text-slate-400 font-medium leading-tight">
                                Conoce y administra tus clientes.
                            </p>
                        </div>

                        {/* 2. Ventas */}
                        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs hover:shadow-md hover:border-orange-200 transition-all text-center flex flex-col items-center">
                            <div className="size-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center mb-3">
                                <Store size={18} />
                            </div>
                            <h4 className="text-xs font-black text-slate-900 mb-1">Ventas</h4>
                            <p className="text-[10px] text-slate-400 font-medium leading-tight">
                                Recibe pedidos y controla tus ventas.
                            </p>
                        </div>

                        {/* 3. Reservas */}
                        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs hover:shadow-md hover:border-sky-200 transition-all text-center flex flex-col items-center">
                            <div className="size-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center mb-3">
                                <Calendar size={18} />
                            </div>
                            <h4 className="text-xs font-black text-slate-900 mb-1">Reservas</h4>
                            <p className="text-[10px] text-slate-400 font-medium leading-tight">
                                Gestiona citas, horarios y disponibilidad.
                            </p>
                        </div>

                        {/* 4. Pagos */}
                        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs hover:shadow-md hover:border-purple-200 transition-all text-center flex flex-col items-center">
                            <div className="size-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-3">
                                <CreditCard size={18} />
                            </div>
                            <h4 className="text-xs font-black text-slate-900 mb-1">Pagos</h4>
                            <p className="text-[10px] text-slate-400 font-medium leading-tight">
                                Recibe pagos de forma segura y fácil.
                            </p>
                        </div>

                        {/* 5. Promociones */}
                        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs hover:shadow-md hover:border-pink-200 transition-all text-center flex flex-col items-center">
                            <div className="size-10 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center mb-3">
                                <Tag size={18} />
                            </div>
                            <h4 className="text-xs font-black text-slate-900 mb-1">Promociones</h4>
                            <p className="text-[10px] text-slate-400 font-medium leading-tight">
                                Haz que tus clientes regresen.
                            </p>
                        </div>

                        {/* 6. Fidelización */}
                        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs hover:shadow-md hover:border-amber-200 transition-all text-center flex flex-col items-center">
                            <div className="size-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-3">
                                <Star size={18} />
                            </div>
                            <h4 className="text-xs font-black text-slate-900 mb-1">Fidelización</h4>
                            <p className="text-[10px] text-slate-400 font-medium leading-tight">
                                Misiones, premios y recompensas.
                            </p>
                        </div>

                        {/* 7. Operación */}
                        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs hover:shadow-md hover:border-slate-300 transition-all text-center flex flex-col items-center">
                            <div className="size-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center mb-3">
                                <SlidersHorizontal size={18} />
                            </div>
                            <h4 className="text-xs font-black text-slate-900 mb-1">Operación</h4>
                            <p className="text-[10px] text-slate-400 font-medium leading-tight">
                                Gestiona el día a día de tu negocio.
                            </p>
                        </div>

                        {/* 8. Reportes */}
                        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs hover:shadow-md hover:border-teal-200 transition-all text-center flex flex-col items-center">
                            <div className="size-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center mb-3">
                                <BarChart3 size={18} />
                            </div>
                            <h4 className="text-xs font-black text-slate-900 mb-1">Reportes</h4>
                            <p className="text-[10px] text-slate-400 font-medium leading-tight">
                                Entiende cómo está funcionando tu negocio.
                            </p>
                        </div>

                    </div>
                </div>
            </section>

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* 6. BANNER AZUL CTA: HOY PUEDES CREARLA                          */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            <section className="py-12 bg-white">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="relative rounded-[2.5rem] bg-gradient-to-r from-[#0052cc] via-[#0066FF] to-[#0055EE] text-white p-8 sm:p-12 overflow-hidden shadow-2xl shadow-blue-500/25 flex flex-col lg:flex-row items-center justify-between gap-8">
                        
                        {/* Decoración de ondas de fondo */}
                        <div className="absolute -right-20 -bottom-20 w-96 h-96 bg-white/10 rounded-full blur-2xl pointer-events-none" />
                        <div className="absolute left-10 -top-20 w-72 h-72 bg-sky-300/10 rounded-full blur-xl pointer-events-none" />

                        {/* Teléfonos miniatura a la izquierda */}
                        <div className="hidden sm:flex items-center -space-x-4 shrink-0">
                            <div className="w-16 h-28 bg-slate-900 rounded-2xl border-2 border-white/40 p-1 shadow-lg transform -rotate-6 overflow-hidden">
                                <img 
                                    src="https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=150&auto=format&fit=crop&q=80" 
                                    alt="Restaurante App" 
                                    className="w-full h-full object-cover rounded-xl"
                                />
                            </div>
                            <div className="w-20 h-32 bg-slate-950 rounded-2xl border-2 border-white/60 p-1 shadow-xl z-10 overflow-hidden">
                                <img 
                                    src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=200&auto=format&fit=crop&q=80" 
                                    alt="Gym App" 
                                    className="w-full h-full object-cover rounded-xl"
                                />
                            </div>
                            <div className="w-16 h-28 bg-slate-900 rounded-2xl border-2 border-white/40 p-1 shadow-lg transform rotate-6 overflow-hidden">
                                <img 
                                    src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=150&auto=format&fit=crop&q=80" 
                                    alt="Tienda App" 
                                    className="w-full h-full object-cover rounded-xl"
                                />
                            </div>
                        </div>

                        {/* Texto Central y Chips */}
                        <div className="space-y-3 text-center lg:text-left flex-1 max-w-xl z-10">
                            <span className="text-[10px] font-black uppercase tracking-wider text-blue-200">
                                ¿Y SI TU NEGOCIO TUVIERA SU PROPIA APP?
                            </span>
                            <h3 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                                Hoy puedes crearla.
                            </h3>
                            <p className="text-xs sm:text-sm text-blue-100 font-medium">
                                Elige tu tipo de negocio y empieza.
                            </p>

                            {/* Chips de Tipos de Negocio */}
                            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-1.5 pt-2">
                                <Link href="/register?tipo=servicios" className="px-2.5 py-1 rounded-full bg-white/15 hover:bg-white/25 text-[10px] font-bold transition-colors">
                                    ✂ Servicios
                                </Link>
                                <Link href="/register?tipo=restaurante" className="px-2.5 py-1 rounded-full bg-white/15 hover:bg-white/25 text-[10px] font-bold transition-colors">
                                    🍴 Restaurantes
                                </Link>
                                <Link href="/register?tipo=tienda" className="px-2.5 py-1 rounded-full bg-white/15 hover:bg-white/25 text-[10px] font-bold transition-colors">
                                    🛍 Tiendas
                                </Link>
                                <Link href="/register?tipo=canchas" className="px-2.5 py-1 rounded-full bg-white/15 hover:bg-white/25 text-[10px] font-bold transition-colors">
                                    ⚽ Canchas
                                </Link>
                                <Link href="/register?tipo=lavanderia" className="px-2.5 py-1 rounded-full bg-white/15 hover:bg-white/25 text-[10px] font-bold transition-colors">
                                    👕 Lavanderías
                                </Link>
                                <Link href="/register?tipo=gimnasio" className="px-2.5 py-1 rounded-full bg-white/15 hover:bg-white/25 text-[10px] font-bold transition-colors">
                                    🏋 Gimnasios
                                </Link>
                                <Link href="/register?tipo=dentista" className="px-2.5 py-1 rounded-full bg-white/15 hover:bg-white/25 text-[10px] font-bold transition-colors">
                                    🦷 Clínicas
                                </Link>
                                <Link href="/register" className="px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 text-[10px] font-bold transition-colors">
                                    + Más
                                </Link>
                            </div>
                        </div>

                        {/* Botón Blanco a la Derecha */}
                        <div className="shrink-0 z-10">
                            <Link
                                href="/register"
                                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-white text-[#0066FF] hover:bg-blue-50 font-black text-xs shadow-lg transition-all active:scale-95"
                            >
                                <span>Crear mi app</span>
                                <ArrowRight size={14} />
                            </Link>
                        </div>

                    </div>
                </div>
            </section>

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* 6. FOOTER PRINCIPAL (OPTIMIZADO PARA MÓVIL Y DESKTOP)           */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            <footer className="bg-white border-t border-slate-200/80 pt-16 pb-12 overflow-hidden">
                <div className="max-w-7xl mx-auto px-6">
                    
                    {/* Sección Superior del Footer */}
                    <div className="pb-12 border-b border-slate-100">
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-10">
                            
                            {/* Marca Citiox y Propuesta de Valor */}
                            <div className="space-y-4 max-w-sm text-left">
                                <Link href="/" className="inline-block transition-transform hover:scale-105">
                                    <CitioxBrandLogo className="h-12 sm:h-14 w-auto" />
                                </Link>
                                <p className="text-sm text-slate-600 font-medium leading-relaxed">
                                    La plataforma todo-en-uno para crear la app de tu negocio, vender productos, agendar citas y fidelizar clientes en minutos.
                                </p>
                                
                                {/* Badges de Confianza */}
                                <div className="flex flex-wrap gap-2 pt-1 text-[11px] font-bold text-slate-600">
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700">
                                        <Check size={12} className="text-[#0066FF] stroke-[3]" /> Sin comisiones ocultas
                                    </span>
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700">
                                        <Check size={12} className="text-[#0066FF] stroke-[3]" /> En minutos
                                    </span>
                                </div>
                            </div>

                            {/* Grid de Enlaces: 2 Columnas en Móvil, 3 Columnas en Desktop */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 md:gap-12 text-left flex-1 max-w-xl">
                                
                                {/* Columna 1: Soluciones */}
                                <div className="space-y-3">
                                    <h5 className="font-black text-slate-900 text-xs tracking-wider uppercase">
                                        Soluciones
                                    </h5>
                                    <ul className="space-y-2 text-xs font-semibold text-slate-600">
                                        <li><Link href="/restaurantes" className="hover:text-[#0066FF] transition-colors flex items-center gap-1.5"><span>🍔</span> Restaurantes</Link></li>
                                        <li><Link href="/tiendas" className="hover:text-[#0066FF] transition-colors flex items-center gap-1.5"><span>🛍️</span> Tiendas & Retail</Link></li>
                                        <li><Link href="/canchas" className="hover:text-[#0066FF] transition-colors flex items-center gap-1.5"><span>⚽</span> Canchas Deportivas</Link></li>
                                        <li><Link href="/register?tipo=gimnasio" className="hover:text-[#0066FF] transition-colors flex items-center gap-1.5"><span>💪</span> Gimnasios</Link></li>
                                        <li><Link href="/register?tipo=dentista" className="hover:text-[#0066FF] transition-colors flex items-center gap-1.5"><span>🦷</span> Clínicas & Dentistas</Link></li>
                                        <li><Link href="/lavanderias" className="hover:text-[#0066FF] transition-colors flex items-center gap-1.5"><span>🧺</span> Lavanderías</Link></li>
                                        <li><Link href="/servicios" className="hover:text-[#0066FF] transition-colors flex items-center gap-1.5"><span>✨</span> Servicios & Spa</Link></li>
                                    </ul>
                                </div>

                                {/* Columna 2: Empresa */}
                                <div className="space-y-3">
                                    <h5 className="font-black text-slate-900 text-xs tracking-wider uppercase">
                                        Empresa
                                    </h5>
                                    <ul className="space-y-2 text-xs font-semibold text-slate-600">
                                        <li><a href="#como-funciona" className="hover:text-[#0066FF] transition-colors">Cómo funciona</a></li>
                                        <li><Link href="/admin/plan" className="hover:text-[#0066FF] transition-colors">Planes y Precios</Link></li>
                                        <li><Link href="/register" className="hover:text-[#0066FF] transition-colors">Crear mi app gratis</Link></li>
                                        <li><Link href="/login" className="hover:text-[#0066FF] transition-colors">Iniciar sesión</Link></li>
                                        <li><a href="https://wa.me/" target="_blank" rel="noopener noreferrer" className="hover:text-[#0066FF] transition-colors">Soporte WhatsApp</a></li>
                                    </ul>
                                </div>

                                {/* Columna 3: Legal (ocupa las 2 columnas en pantallas ultra-pequeñas o columna propia) */}
                                <div className="space-y-3 col-span-2 sm:col-span-1">
                                    <h5 className="font-black text-slate-900 text-xs tracking-wider uppercase">
                                        Legal & Seguridad
                                    </h5>
                                    <ul className="space-y-2 text-xs font-semibold text-slate-600">
                                        <li><Link href="/terminos" className="hover:text-[#0066FF] transition-colors">Términos de servicio</Link></li>
                                        <li><Link href="/privacidad" className="hover:text-[#0066FF] transition-colors">Política de privacidad</Link></li>
                                        <li className="text-slate-400 text-[11px] pt-1">🔒 Encriptación SSL 256-bit</li>
                                    </ul>
                                </div>

                            </div>

                        </div>
                    </div>

                    {/* Fila Inferior: Redes Sociales, Estado del Sistema y Copyright */}
                    <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-6 text-slate-500 text-xs">
                        
                        {/* Redes Sociales con Botones Táctiles Amplios */}
                        <div className="flex items-center gap-3">
                            <a href="#" className="size-9 rounded-full bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-[#0066FF] flex items-center justify-center transition-all shadow-xs" aria-label="Instagram">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
                            </a>
                            <a href="#" className="size-9 rounded-full bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-[#0066FF] flex items-center justify-center transition-all shadow-xs" aria-label="Facebook">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
                            </a>
                            <a href="#" className="size-9 rounded-full bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-[#0066FF] flex items-center justify-center transition-all shadow-xs" aria-label="YouTube">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17"/><polygon points="10 15 15 12 10 9 10 15"/></svg>
                            </a>
                            <a href="#" className="size-9 rounded-full bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-[#0066FF] flex items-center justify-center transition-all shadow-xs" aria-label="TikTok">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"/></svg>
                            </a>
                            <a href="#" className="size-9 rounded-full bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-[#0066FF] flex items-center justify-center transition-all shadow-xs" aria-label="LinkedIn">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect width="4" height="12" x="2" y="9"/><circle cx="4" cy="4" r="2"/></svg>
                            </a>
                        </div>

                        {/* Indicador de Estado Operativo */}
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span>Sistemas 100% Operativos</span>
                        </div>

                        {/* Copyright */}
                        <div className="text-center sm:text-right font-medium text-slate-500">
                            © 2026 Citiox. Todos los derechos reservados.
                        </div>

                    </div>

                </div>
            </footer>

        </div>
    );
}