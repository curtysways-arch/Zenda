import Link from 'next/link';
import prisma from '@/lib/prisma';
import { 
    Check, 
    ArrowRight, 
    Dribbble, 
    Smartphone, 
    Zap, 
    PlayCircle,
    Star,
    Rocket,
    BarChart3,
    Sparkles
} from 'lucide-react';

const CitioxLogo = ({ className = "" }: { className?: string }) => (
    <img 
        src="/logo-citiox.png" 
        alt="Citiox Logo" 
        className={`object-contain ${className}`}
    />
);

export default async function LandingPage() {
    // Obtener los planes reales de la base de datos
    const planes = await prisma.plan.findMany({
        where: { activo: true, id: { not: 'founder' } },
        orderBy: { price: 'asc' }
    });

    const activeFoundersCount = await (prisma.suscripcion as any).count({
        where: {
            isFounder: true,
            estado: { in: ['activa', 'active', 'ACTIVA'] }
        }
    });

    const cuposDisponibles = Math.max(0, 25 - activeFoundersCount);

    return (
        <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-cyan-200 overflow-x-hidden">
            {/* Top Bar / Announcement */}
            <div className="bg-gradient-to-r from-cyan-600 via-purple-600 to-indigo-700 py-2.5 relative z-50 shadow-md">
                <div className="max-w-7xl mx-auto px-6 text-center">
                    <p className="text-white text-[10px] sm:text-xs font-black uppercase tracking-[0.3em] flex items-center justify-center gap-2">
                        <Rocket size={14} className="animate-bounce" /> 
                        {cuposDisponibles > 0 ? (
                            <span>¡ÚLTIMOS CUPOS! Quedan {cuposDisponibles} de 25 cupos fundadores (Tarifa especial de $15/mes de por vida)</span>
                        ) : (
                            <span>Impulsa tu negocio hoy: Prueba de 14 días en planes profesionales</span>
                        )}
                    </p>
                </div>
            </div>

            {/* Navigation */}
            <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-100">
                <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
                    <Link href="/" className="flex items-center gap-3 group cursor-pointer">
                        <CitioxLogo className="h-14 sm:h-16 w-auto group-hover:scale-105 transition-transform duration-300" />
                        <span className="text-2xl sm:text-3xl font-black tracking-tight bg-gradient-to-r from-cyan-500 via-sky-500 to-purple-600 bg-clip-text text-transparent italic">
                            CitiOx
                        </span>
                    </Link>
                    
                    <div className="hidden lg:flex items-center gap-10 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                        <a href="#como-funciona" className="hover:text-cyan-500 transition-colors">Cómo funciona</a>
                        <Link href="/demo" className="hover:text-cyan-500 transition-colors">Demo</Link>
                        <a href="#pricing" className="hover:text-cyan-500 transition-colors">Precios</a>
                    </div>

                    <div className="flex items-center gap-4">
                        <Link
                            href="/login"
                            className="hidden sm:block text-[10px] font-black text-slate-900 uppercase tracking-widest px-4 py-2 hover:bg-slate-100 rounded-xl transition-colors"
                        >
                            Acceso
                        </Link>
                        <Link
                            href="/register"
                            className="bg-slate-900 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-gradient-to-r hover:from-cyan-500 hover:to-purple-600 transition-all shadow-xl shadow-slate-200 hover:shadow-cyan-500/10 active:scale-95"
                        >
                            Crear mi negocio gratis
                        </Link>
                    </div>
                </div>
            </nav>

            {/* 1. Hero Section: Centralizada y Visualmente Potente */}
            <header className="relative pt-20 pb-0 overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120%] h-[120%] bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.12)_0%,rgba(139,92,246,0.06)_40%,transparent_70%)]" />
                </div>

                <div className="max-w-7xl mx-auto px-6 text-center space-y-12">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-50 text-cyan-600 border border-cyan-100 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-sm animate-in fade-in duration-700">
                        <Sparkles size={14} fill="currentColor" /> El estándar digital en gestión de citas y reservas
                    </div>
                    
                    <h1 className="text-5xl md:text-8xl font-black text-slate-900 tracking-tighter leading-[0.9] italic max-w-5xl mx-auto animate-in slide-in-from-bottom duration-700 delay-100">
                        Gestiona <span className="bg-gradient-to-r from-cyan-500 to-purple-600 bg-clip-text text-transparent not-italic">tus citas</span> <br /> 
                        sin responder <span className="bg-gradient-to-r from-cyan-500 to-purple-600 bg-clip-text text-transparent underline decoration-cyan-200">ni un mensaje.</span>
                    </h1>
                    
                    <p className="max-w-2xl mx-auto text-lg md:text-2xl text-slate-500 font-medium leading-relaxed animate-in slide-in-from-bottom duration-700 delay-200">
                        Automatiza tus reservas por WhatsApp con tecnología diseñada para profesionales y negocios de cualquier sector.
                    </p>
                    
                    <div className="flex flex-col sm:flex-row justify-center gap-6 pt-6 animate-in slide-in-from-bottom duration-700 delay-300">
                        <Link
                            href="/register"
                            className="group flex items-center justify-center gap-3 bg-gradient-to-r from-cyan-500 via-sky-500 to-purple-600 text-white px-12 py-5 rounded-3xl font-black text-sm uppercase tracking-widest hover:brightness-110 hover:shadow-cyan-500/20 transition-all shadow-2xl shadow-purple-500/20 active:scale-95"
                        >
                            Crear mi negocio gratis
                            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                        </Link>
                        <Link
                            href="/demo-spa"
                            className="flex items-center justify-center gap-3 bg-white text-slate-900 border-2 border-slate-100 px-12 py-5 rounded-3xl font-black text-sm uppercase tracking-widest hover:border-cyan-300 hover:text-cyan-600 transition-all shadow-sm active:scale-95"
                        >
                            <PlayCircle size={18} />
                            Ver demo
                        </Link>
                    </div>

                    {/* El Mockup Principal Ultra Premium con Animaciones */}
                    <div className="relative mt-32 pt-12 animate-in zoom-in duration-1000 delay-500 max-w-5xl mx-auto">
                        {/* Efectos de Brillo de Fondo */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[140%] h-[140%] -z-10">
                            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.18)_0%,transparent_60%)] animate-pulse-slow" />
                        </div>

                        <div className="relative bg-slate-950 rounded-[4rem] p-5 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] border border-white/5 md:scale-110 lg:scale-125 translate-y-24 group transition-all duration-700">
                            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-purple-500/10 rounded-[3.8rem] opacity-0 group-hover:opacity-100 transition-opacity" />
                            
                            <img 
                                src="/hero-spa-mockup.png" 
                                alt="Citiox App Mockup" 
                                className="relative z-10 rounded-[3rem] w-full max-w-[380px] md:max-w-md mx-auto shadow-3xl grayscale-[0.2] group-hover:grayscale-0 transition-all duration-700 brightness-90 group-hover:brightness-100 object-cover aspect-[4/5] object-center"
                            />

                            {/* Floating Stats Label - RESERVAS */}
                            <div className="absolute -left-16 sm:-left-32 top-1/4 bg-white/90 backdrop-blur-xl p-6 rounded-[2.5rem] shadow-[0_30px_60px_-15px_rgba(6,182,212,0.2)] border border-cyan-100 hidden md:flex items-center gap-4 animate-float-slow z-20 hover:scale-105 transition-transform cursor-default">
                                <div className="size-14 bg-gradient-to-br from-cyan-400 to-blue-500 text-white rounded-2xl flex items-center justify-center shadow-xl shadow-cyan-400/30">
                                    <Star size={24} fill="currentColor" className="animate-pulse" />
                                </div>
                                <div className="text-left pr-4">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] leading-none mb-1.5">Reservas VIP</p>
                                    <p className="text-3xl font-black text-slate-900 tracking-tighter leading-none italic">+85% Eficiencia</p>
                                </div>
                            </div>

                            {/* Floating WhatsApp Label - AUTOMATION */}
                            <div className="absolute -right-16 sm:-right-32 bottom-1/4 bg-white/90 backdrop-blur-xl p-6 rounded-[2.5rem] shadow-[0_30px_60px_-15px_rgba(168,85,247,0.15)] border border-purple-50 group/wa animate-float-medium z-20 hover:scale-105 transition-transform cursor-default">
                                <div className="flex items-center gap-4">
                                    <div className="text-right pl-4">
                                        <p className="text-[10px] font-black text-purple-500 uppercase tracking-[0.3em] leading-none mb-1.5 font-bold italic">Auto-Bot ON</p>
                                        <p className="text-2xl font-black text-slate-900 tracking-tighter leading-none uppercase italic">WhatsApp Full</p>
                                    </div>
                                    <div className="size-14 bg-[#25D366] text-white rounded-2xl flex items-center justify-center shadow-xl shadow-emerald-400/20 group-hover:rotate-12 transition-transform">
                                        <Smartphone size={24} strokeWidth={3} />
                                    </div>
                                </div>
                                
                                {/* Notificación Bubble */}
                                <div className="absolute -top-3 -left-3 bg-gradient-to-r from-cyan-500 to-purple-500 text-white text-[9px] font-black px-3 py-1 rounded-full shadow-lg animate-bounce">
                                    NUEVA CITA
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Banner de Servicios con Imágenes Vibrantes */}
                <div className="relative mt-80 py-24 bg-slate-900 overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-full opacity-20 bg-[url('/bg-pattern.svg')] bg-repeat" />
                    <div className="max-w-7xl mx-auto px-6 relative z-10 text-center">
                        <p className="text-[10px] font-black text-cyan-400 uppercase tracking-[0.4em] mb-12">Adaptable a múltiples sectores</p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <ServiceCard 
                                image="https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&q=80&w=800" 
                                name="Spas & Estética" 
                                icon="✨" 
                                description="Gestión total de cabinas, aparatología y tiempos de relajación."
                            />
                            <ServiceCard 
                                image="https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&q=80&w=800" 
                                name="Peluquerías & Barbería" 
                                icon="✂️" 
                                description="Sincronización de agendas por profesional y servicios combinados."
                            />
                            <ServiceCard 
                                image="https://images.unsplash.com/photo-1522337660859-02fbefca4702?auto=format&fit=crop&q=80&w=800" 
                                name="Uñas & Maquillaje" 
                                icon="💅" 
                                description="Optimiza tus estaciones de trabajo y productos utilizados."
                            />
                        </div>
                    </div>
                </div>
            </header>

            {/* 2. Sección: Cómo funciona */}
            <section id="como-funciona" className="py-24 bg-slate-50">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-20 space-y-4">
                        <div className="flex items-center justify-center gap-2">
                            <div className="h-px w-8 bg-cyan-500" />
                            <span className="text-[10px] font-black text-cyan-500 uppercase tracking-[0.4em]">Proceso</span>
                            <div className="h-px w-8 bg-cyan-500" />
                        </div>
                        <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">Cómo funciona</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                        <StepCard 
                            number="01"
                            title="El cliente reserva"
                            description="Tus clientes agendan su cita desde WhatsApp o tu página de reservas personalizada en segundos."
                            icon={<Smartphone className="text-cyan-500" size={32} />}
                        />
                        <StepCard 
                            number="02"
                            title="Registro Automático"
                            description="El sistema procesa y registra la reserva automáticamente, sin que tengas que responder mensajes manualmente."
                            icon={<Zap className="text-purple-500" size={32} />}
                        />
                        <StepCard 
                            number="03"
                            title="Control Total"
                            description="Tú administras la agenda del staff, cancelaciones y stock desde un panel administrativo intuitivo."
                            icon={<BarChart3 className="text-cyan-500" size={32} />}
                        />
                    </div>
                </div>
            </section>

            {/* 3. Sección: Demo */}
            <section id="demo" className="py-24 bg-white overflow-hidden">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="bg-slate-900 rounded-[3rem] p-8 md:p-16 flex flex-col lg:flex-row items-center gap-16 relative shadow-3xl">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl -mr-32 -mt-32" />
                        
                        <div className="flex-1 space-y-8 text-center lg:text-left">
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-cyan-500/10 text-cyan-400 rounded-full text-[10px] font-black uppercase tracking-widest border border-cyan-500/20">
                                <PlayCircle size={14} /> Prueba en vivo
                            </div>
                            <h3 className="text-4xl md:text-6xl font-black text-white italic tracking-tighter leading-none">
                                Citiox <br />
                                <span className="bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent not-italic uppercase">Demo</span>
                            </h3>
                            <p className="text-slate-400 text-lg font-medium leading-relaxed max-w-xl">
                                Experimenta cómo los clientes ven tu negocio y la alta demanda que genera tener horarios siempre visibles.
                            </p>
                            <Link 
                                href="/register"
                                className="inline-flex items-center gap-3 bg-gradient-to-r from-cyan-500 to-purple-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:brightness-110 transition-all shadow-xl shadow-cyan-950/50 active:scale-95"
                            >
                                Quiero mi sistema de reservas
                                <ArrowRight size={18} />
                            </Link>
                        </div>

                        <div className="w-full lg:w-96 bg-slate-800 rounded-[2.5rem] p-6 shadow-2xl border border-white/5 transform lg:rotate-2">
                            <div className="space-y-4">
                                <div className="flex justify-between items-center pb-4 border-b border-white/5">
                                    <span className="text-xs font-black text-white/50 uppercase tracking-widest">Horarios Hoy</span>
                                    <span className="size-2 bg-emerald-500 rounded-full animate-pulse" />
                                </div>
                                <DemoSlot time="18:00" status="Reservado" />
                                <DemoSlot time="19:00" status="Reservado" />
                                <DemoSlot time="20:00" status="Reservado" />
                                <DemoSlot time="21:00" status="Disponible" active />
                                <DemoSlot time="22:00" status="Disponible" active />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* 4. Sección de precios */}
            <section id="pricing" className="py-24 bg-slate-50 relative overflow-hidden">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-20 space-y-4 flex flex-col items-center">
                        <div className="flex items-center justify-center gap-2 text-cyan-500">
                            <Star size={16} fill="currentColor" />
                            <span className="text-[10px] font-black uppercase tracking-[0.4em]">Inversión</span>
                            <Star size={16} fill="currentColor" />
                        </div>
                        <h2 className="text-5xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">Planes simples para tu negocio</h2>
                        <p className="text-slate-500 font-medium text-lg max-w-xl mx-auto">
                            Comienza tu transformación digital con el plan que mejor se adapte a tu escala.
                        </p>
                        {cuposDisponibles > 0 && (
                            <div className="mt-4 inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500/10 to-yellow-500/10 text-amber-700 border border-amber-200/50 rounded-2xl text-[10px] font-black uppercase tracking-wider shadow-sm animate-pulse">
                                🚀 Quedan {cuposDisponibles} de 25 cupos fundadores con precio congelado ($15/mes)
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-stretch justify-center">
                        {planes.length > 0 ? planes.map((plan: any) => (
                            <PricingCard 
                                key={plan.id}
                                name={plan.name}
                                price={plan.price}
                                description={plan.description || "Gestión de estética profesional."}
                                features={[
                                    plan.max_fields === 0 ? "Servicios ilimitados" : `${plan.max_fields} Servicio${plan.max_fields > 1 ? 's' : ''}`,
                                    plan.max_locations > 1 ? `${plan.max_locations} Centros` : "1 Centro",
                                    "Citas por WhatsApp",
                                    plan.tournaments_enabled && "Portafolio de Trabajos",
                                    plan.courses_module && "Academia y Talleres",
                                    plan.automatic_discounts_enabled && "Módulo de Promociones",
                                    "Panel administrativo",
                                    "Agenda para Staff"
                                ].filter(Boolean)}
                                buttonText={plan.price === 0 ? "Empezar Gratis" : "Crear mi negocio"}
                                href={plan.price === 0 ? "#demo" : "/register"}
                                featured={plan.is_recommended}
                                trialDays={plan.trial_days}
                            />
                        )) : (
                            <div className="col-span-full text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200">
                                <p className="text-slate-400 font-bold uppercase tracking-widest italic">Cargando planes del sistema...</p>
                            </div>
                        )}
                    </div>

                    {/* 5. Métricas de Impacto */}
                    <div className="mt-32 grid grid-cols-1 md:grid-cols-3 gap-8 text-center pt-20 border-t border-slate-200">
                        <div className="space-y-2">
                            <p className="text-6xl font-black bg-gradient-to-r from-cyan-500 to-blue-500 bg-clip-text text-transparent tracking-tighter italic">+42%</p>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">En Citas Confirmadas</p>
                            <p className="text-xs text-slate-500 font-medium px-4">Automatizar WhatsApp elimina la fricción en el proceso de compra.</p>
                        </div>
                        <div className="space-y-2">
                            <p className="text-6xl font-black bg-gradient-to-r from-purple-500 to-indigo-600 bg-clip-text text-transparent tracking-tighter italic">0</p>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Confusiones en Horarios</p>
                            <p className="text-xs text-slate-500 font-medium px-4">Calendario sincronizado en tiempo real para todos tus administradores.</p>
                        </div>
                        <div className="space-y-2">
                            <p className="text-6xl font-black bg-gradient-to-r from-cyan-500 to-purple-500 bg-clip-text text-transparent tracking-tighter italic">100%</p>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Gestión Móvil / PWA</p>
                            <p className="text-xs text-slate-500 font-medium px-4">Administra desde cualquier lugar sin instalar aplicaciones pesadas.</p>
                        </div>
                    </div>

                    {/* 6. Preguntas Frecuentes (FAQ) */}
                    <div className="mt-40 max-w-3xl mx-auto space-y-12">
                        <div className="text-center space-y-4">
                            <h3 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">Preguntas Frecuentes</h3>
                            <p className="text-slate-500 font-medium">Todo lo que necesitas saber antes de empezar.</p>
                        </div>
                        
                        <div className="space-y-4">
                            <FAQItem 
                                question="¿Cómo funciona la integración con WhatsApp?" 
                                answer="El sistema genera un link inteligente que puedes poner en tu perfil. Cuando el cliente escribe, el bot le permite ver los horarios libres y reservar sin que tú tengas que responder manualmente." 
                            />
                            <FAQItem 
                                question="¿Necesito instalar algo en mi PC?" 
                                answer="No. Citiox es 100% en la nube. Puedes acceder desde el navegador de tu computadora, tablet o celular en cualquier momento." 
                            />
                            <FAQItem 
                                question="¿Qué tipos de negocios puedo gestionar?" 
                                answer="Cualquier negocio que use citas por tiempo: Spas, Estéticas, Barberías, Centros de Yoga, Fisioterapia y más." 
                            />
                            <FAQItem 
                                question="¿Cómo se pagan las suscripciones?" 
                                answer="Aceptamos tarjetas de crédito o transferencia bancaria. Tú mismo gestionas tu suscripción desde el panel administrativo." 
                            />
                        </div>
                    </div>

                    {/* 7. Trust Elements Final */}
                    <div className="mt-40 text-center py-20 bg-slate-900 rounded-[3.5rem] text-white shadow-3xl shadow-cyan-950/10 border border-slate-800 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-[100px] -mr-32 -mt-32" />
                        
                        <div className="relative z-10 space-y-8 px-6">
                            <h4 className="text-4xl md:text-5xl font-black italic tracking-tighter uppercase leading-none">¿Listo para transformar <br /> tu espacio?</h4>
                            <p className="text-slate-400 font-medium text-lg max-w-xl mx-auto">Únete a cientos de profesionales y empresas que ya automatizaron su agenda.</p>
                            <div className="flex flex-col sm:flex-row justify-center gap-6 pt-4">
                                <Link 
                                    href="/register"
                                    className="bg-gradient-to-r from-cyan-500 to-purple-600 text-white px-10 py-5 rounded-2xl font-black text-xs uppercase tracking-widest hover:brightness-110 transition-all shadow-xl shadow-cyan-950/50"
                                >
                                    Empezar ahora mismo
                                </Link>
                                <Link 
                                    href="/demo"
                                    className="bg-white/5 border border-white/10 hover:border-cyan-300/30 text-white px-10 py-5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-white/10 transition-all"
                                >
                                    Ver demostración
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-white border-t border-slate-100 py-20">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-12 text-center md:text-left">
                        <div className="space-y-6 flex flex-col items-center md:items-start">
                            <Link href="/" className="flex items-center gap-2.5 group">
                                <CitioxLogo className="h-12 w-auto group-hover:scale-105 transition-transform duration-300" />
                                <span className="text-xl font-black tracking-tight bg-gradient-to-r from-cyan-500 via-sky-500 to-purple-600 bg-clip-text text-transparent italic">
                                    CitiOx
                                </span>
                            </Link>
                            <p className="text-slate-400 font-medium text-sm max-w-sm">
                                Tecnología en gestión de reservas diseñada para negocios modernos. Automatiza y escala.
                            </p>
                        </div>
                        
                        <div className="flex gap-12">
                            <div className="space-y-4">
                                <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Legal</p>
                                <ul className="flex flex-col gap-2">
                                    <li><Link href="/privacidad" className="text-xs font-bold text-slate-400 hover:text-cyan-500 underline decoration-slate-200">Privacidad</Link></li>
                                    <li><Link href="/terminos" className="text-xs font-bold text-slate-400 hover:text-cyan-500 underline decoration-slate-200">Términos</Link></li>
                                </ul>
                            </div>
                            <div className="space-y-4">
                                <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Contacto</p>
                                <ul className="flex flex-col gap-2">
                                    <li><Link href="#" className="text-xs font-bold text-slate-400 hover:text-cyan-500 underline decoration-slate-200">Soporte</Link></li>
                                    <li><Link href="#" className="text-xs font-bold text-slate-400 hover:text-cyan-500 underline decoration-slate-200">WhatsApp</Link></li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    <div className="mt-20 pt-8 border-t border-slate-50 flex flex-col md:flex-row justify-between items-center gap-4">
                        <p className="text-slate-400 text-[9px] font-black uppercase tracking-[0.3em]">© 2026 Citiox. El estándar en gestión de reservas.</p>
                        <div className="flex gap-4">
                           <div className="size-6 bg-slate-50 rounded flex items-center justify-center text-slate-300">
                                <Dribbble size={14} />
                           </div>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}

function StepCard({ number, title, description, icon }: { number: string, title: string, description: string, icon: React.ReactNode }) {
    return (
        <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 hover:scale-[1.03] hover:shadow-2xl transition-all duration-500 relative group overflow-hidden">
            <span className="absolute -top-4 -right-4 text-7xl font-black text-slate-50 opacity-0 group-hover:opacity-100 group-hover:translate-y-4 group-hover:-translate-x-4 transition-all duration-700">{number}</span>
            <div className="relative z-10 space-y-6">
                <div className="size-16 bg-cyan-50 rounded-2xl flex items-center justify-center shadow-inner group-hover:bg-gradient-to-br group-hover:from-cyan-400 group-hover:to-purple-500 group-hover:text-white transition-all duration-500">
                    {icon}
                </div>
                <h4 className="text-2xl font-black text-slate-900 uppercase italic tracking-tight">{title}</h4>
                <p className="text-slate-500 font-medium leading-relaxed">{description}</p>
            </div>
        </div>
    );
}

function DemoSlot({ time, status, active }: { time: string, status: string, active?: boolean }) {
    return (
        <div className={`p-4 rounded-2xl flex justify-between items-center transition-all ${active ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-white/5 border border-white/5 opacity-40'}`}>
            <span className="font-black text-white">{time}</span>
            <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-lg ${active ? 'bg-gradient-to-r from-emerald-400 to-green-500 text-slate-950 font-bold' : 'bg-slate-700 text-slate-400'}`}>
                {status}
            </span>
        </div>
    );
}

function PricingCard({ name, price, description, features, buttonText, href, featured, trialDays }: any) {
    return (
        <div className={`relative flex flex-col p-10 rounded-[3rem] transition-all duration-500 hover:-translate-y-2 border ${
            featured 
            ? 'bg-slate-900 text-white border-slate-800 shadow-[0_40px_80px_-15px_rgba(0,0,0,0.3)] scale-105 z-10' 
            : 'bg-white text-slate-900 border-slate-100 shadow-xl shadow-slate-200/50'
        }`}>
            {featured && (
                <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-cyan-400 to-purple-500 text-white px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-cyan-500/40 whitespace-nowrap">
                   🔥 Recomendado
                </div>
            )}
            
            <div className="space-y-3 mb-8 text-center px-2">
                <p className={`text-[10px] font-black uppercase tracking-[0.3em] ${featured ? 'text-cyan-400' : 'text-slate-400'}`}>{name}</p>
                <div className="flex items-baseline justify-center gap-1">
                    <span className="text-sm font-black uppercase tracking-widest opacity-40">$</span>
                    <span className="text-6xl font-black tracking-tighter italic leading-none">{price}</span>
                    <span className="text-xs font-black uppercase tracking-widest opacity-40">/mes</span>
                </div>
                {trialDays > 0 && (
                    <div className={`${featured ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' : 'bg-purple-500/10 text-purple-500 border-purple-500/20'} px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest w-fit mx-auto border`}>
                        {trialDays} Días gratis
                    </div>
                )}
                <p className={`text-xs font-medium ${featured ? 'text-slate-400' : 'text-slate-500'}`}>{description}</p>
            </div>

            <div className="flex-grow space-y-4 mb-10 overflow-hidden">
                {features.map((feature: string, i: number) => (
                    <div key={i} className="flex items-start gap-3 group/feat">
                        <div className={`p-0.5 rounded-full mt-0.5 shrink-0 transition-transform group-hover/feat:scale-110 ${featured ? 'bg-cyan-400 text-slate-950' : 'bg-emerald-100 text-emerald-600'}`}>
                            <Check size={12} strokeWidth={4} />
                        </div>
                        <span className={`text-sm font-bold truncate ${featured ? 'text-slate-200' : 'text-slate-600'}`}>{feature}</span>
                    </div>
                ))}
            </div>

            <Link
                href={href}
                className={`w-full py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] text-center transition-all shadow-lg active:scale-95 ${
                    featured 
                    ? 'bg-gradient-to-r from-cyan-400 to-purple-500 text-white hover:brightness-110 shadow-cyan-500/10' 
                    : 'bg-slate-900 text-white hover:bg-gradient-to-r hover:from-cyan-500 hover:to-purple-600'
                }`}
            >
                {buttonText}
            </Link>
        </div>
    );
}

function FAQItem({ question, answer }: { question: string, answer: string }) {
    return (
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 hover:border-cyan-200 hover:shadow-xl hover:shadow-cyan-500/5 transition-all duration-300 group">
            <h4 className="text-base font-black text-slate-900 group-hover:text-cyan-500 transition-colors flex items-center justify-between gap-4">
                {question}
                <ArrowRight size={16} className="text-slate-300 group-hover:text-cyan-500 group-hover:translate-x-1 transition-all" />
            </h4>
            <p className="mt-3 text-sm text-slate-500 font-medium leading-relaxed">
                {answer}
            </p>
        </div>
    );
}

function ServiceCard({ image, name, icon, description }: { image: string, name: string, icon: string, description: string }) {
    return (
        <div className="group relative h-[400px] rounded-[2.5rem] overflow-hidden shadow-2xl transition-all duration-700 hover:-translate-y-4">
            <img 
                src={image} 
                alt={name} 
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />
            
            <div className="absolute inset-0 p-8 flex flex-col justify-end text-left space-y-4">
                <div className="size-12 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center text-2xl group-hover:bg-gradient-to-br group-hover:from-cyan-400 group-hover:to-purple-500 transition-all duration-500">
                    {icon}
                </div>
                <h4 className="text-2xl font-black text-white italic tracking-tighter uppercase">{name}</h4>
                <p className="text-slate-300 text-sm font-medium leading-relaxed opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-4 group-hover:translate-y-0">
                    {description}
                </p>
            </div>
        </div>
    );
}
