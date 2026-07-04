'use client';

import { useState } from 'react';
import { 
    Scissors, 
    Sparkles, 
    Calendar, 
    Smartphone, 
    Activity, 
    Shield, 
    Users, 
    Check, 
    Copy, 
    ExternalLink, 
    Lock, 
    Rocket, 
    ArrowRight, 
    Building2, 
    MessageSquare,
    DollarSign,
    GraduationCap,
    HeartHandshake
} from 'lucide-react';
import Link from 'next/link';

export default function DemoPage() {
    const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedEmail(text);
        setTimeout(() => setCopiedEmail(null), 2000);
    };

    const demos = [
        {
            title: "Aura Spa",
            slug: "demo-spa",
            industry: "Spa y Centro Estético",
            color: "from-pink-500 to-rose-600",
            lightBg: "bg-pink-500/10",
            textColor: "text-pink-600",
            icon: Sparkles,
            highlights: [
                "Control de cabinas de masajes y agendas de terapeutas.",
                "Automatización de recordatorios de citas por WhatsApp.",
                "Módulo de Recompensas por Referidos activo para fidelización."
            ],
            credentials: {
                email: "demospa@gmail.com",
                password: "admin123"
            }
        },
        {
            title: "Barber & Co",
            slug: "barber-co",
            industry: "Barbería y Cuidado Masculino",
            color: "from-cyan-500 to-sky-600",
            lightBg: "bg-cyan-500/10",
            textColor: "text-cyan-600",
            icon: Scissors,
            highlights: [
                "Selección de barbero y tarifas según categoría profesional.",
                "Sección 'Mis Trabajos' activa con galería de cortes realizados.",
                "Cálculo automático de comisiones de barberos por servicios."
            ],
            credentials: {
                email: "contacto@barberco.demo",
                password: "admin123"
            }
        },
        {
            title: "Bella Nails Studio",
            slug: "bella-nails",
            industry: "Salón de Manicura y Pestañas",
            color: "from-purple-500 to-indigo-600",
            lightBg: "bg-purple-500/10",
            textColor: "text-purple-600",
            icon: HeartHandshake,
            highlights: [
                "Agendamiento ágil mobile-first (PWA instalable).",
                "Gestión de servicios adicionales (nail art, remoción).",
                "Control de inventario de insumos críticos del salón."
            ],
            credentials: {
                email: "citas@bellanails.demo",
                password: "admin123"
            }
        },
        {
            title: "Vortex Fitness Club",
            slug: "vortex-fitness",
            industry: "Gimnasio y Centros Deportivos",
            color: "from-emerald-500 to-teal-600",
            lightBg: "bg-emerald-500/10",
            textColor: "text-emerald-600",
            icon: Activity,
            highlights: [
                "Módulo de suscripciones mensuales recurrentes.",
                "Reserva de clases grupales con límite de aforo diario.",
                "Control de asistencia mediante check-in rápido."
            ],
            credentials: {
                email: "admin@vortexfit.demo",
                password: "admin123"
            }
        },
        {
            title: "Dental Chip Clínica",
            slug: "dental-chip",
            industry: "Salud y Clínicas Dentales",
            color: "from-blue-500 to-indigo-600",
            lightBg: "bg-blue-500/10",
            textColor: "text-blue-600",
            icon: Building2,
            highlights: [
                "Ficha médica digital y registro de antecedentes del paciente.",
                "Recordatorios estrictos de revisiones periódicas.",
                "Asignación de consultorios y doctores especialistas."
            ],
            credentials: {
                email: "sonrisas@dentalchip.demo",
                password: "admin123"
            }
        }
    ];

    const qualities = [
        {
            title: "Notificaciones por WhatsApp",
            desc: "Mensajes automatizados de confirmación, cancelación y recordatorios nativos sin depender de APIs externas costosas.",
            icon: MessageSquare,
            color: "text-emerald-500 bg-emerald-50"
        },
        {
            title: "Fidelización de Clientes",
            desc: "Crea campañas virales de recompensas (ej. Invita a 5 amigos y gana un servicio) totalmente administrables.",
            icon: GiftIcon, // Reemplazado abajo
            color: "text-pink-500 bg-pink-50"
        },
        {
            title: "Control de Personal y Roles",
            desc: "Configura horarios, bloqueos, perfiles de acceso para tu personal y automatiza el cálculo de sus comisiones.",
            icon: Users,
            color: "text-blue-500 bg-blue-50"
        },
        {
            title: "Reportes Financieros",
            desc: "Monitorea tus ingresos, los servicios más vendidos, la efectividad del staff y exporta reportes detallados.",
            icon: DollarSign,
            color: "text-amber-500 bg-amber-50"
        },
        {
            title: "Módulo de Academia",
            desc: "Crea cursos y talleres grupales con inscripciones, control de asistencia QR de alumnos y pasarela de mensualidades.",
            icon: GraduationCap,
            color: "text-purple-500 bg-purple-50"
        },
        {
            title: "PWA Mobile-First",
            desc: "Tus clientes reservan desde una aplicación web instalable en sus celulares, con carga instantánea y diseño adaptado.",
            icon: Smartphone,
            color: "text-cyan-500 bg-cyan-50"
        }
    ];

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-cyan-200 overflow-x-hidden pb-20">
            
            {/* Header / Announcement */}
            <div className="bg-gradient-to-r from-cyan-600 via-indigo-600 to-purple-700 py-2 text-center text-white text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] px-4 flex items-center justify-center gap-2">
                <Rocket size={14} className="animate-bounce" />
                <span>CitiOx SaaS Demos Interactivas en vivo</span>
            </div>

            {/* Navigation */}
            <nav className="bg-white/80 backdrop-blur-xl border-b border-slate-100 sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
                    <Link href="/" className="flex items-center gap-3 cursor-pointer">
                        <img src="/logo-citiox.png" alt="Citiox Logo" className="h-12 w-auto" />
                        <span className="text-xl font-black bg-gradient-to-r from-cyan-500 via-sky-500 to-purple-600 bg-clip-text text-transparent italic">
                            CitiOx
                        </span>
                    </Link>
                    <Link
                        href="/"
                        className="text-[10px] font-black text-slate-500 hover:text-slate-900 uppercase tracking-widest px-4 py-2 rounded-xl transition-colors border border-slate-200"
                    >
                        Volver al inicio
                    </Link>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="max-w-5xl mx-auto px-6 text-center pt-16 pb-12">
                <span className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-500/10 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-wider mb-6">
                    <Shield size={12} />
                    Demos en Vivo de la Plataforma
                </span>
                <h1 className="text-4xl sm:text-6xl font-black text-slate-950 tracking-tighter uppercase italic leading-none max-w-4xl mx-auto">
                    Experimenta el Poder de <span className="bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-600 bg-clip-text text-transparent">CitiOx</span>
                </h1>
                <p className="text-slate-500 font-medium text-base sm:text-xl max-w-2xl mx-auto mt-6 leading-relaxed">
                    Hemos preparado entornos de prueba con datos simulados en tiempo real. Elige un modelo de negocio, explora la vista del cliente o inicia sesión en el Panel de Administrador.
                </p>
            </section>

            {/* Demos Grid - Layout de filas full-width con preview a la derecha */}
            <section className="max-w-7xl mx-auto px-6 flex flex-col gap-10 mt-4">
                {demos.map((demo, idx) => {
                    const DemoIcon = demo.icon;
                    const isEven = idx % 2 === 0;
                    return (
                        <div
                            key={demo.slug}
                            className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm hover:shadow-lg transition-shadow relative overflow-hidden flex flex-col lg:flex-row group"
                        >
                            {/* Accent line top */}
                            <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${demo.color} z-10`} />

                            {/* Preview de celular (izquierda en pares, derecha en impares) */}
                            <div className={`relative flex-shrink-0 w-full lg:w-80 xl:w-96 bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center p-8 ${isEven ? 'lg:order-last' : 'lg:order-first'} min-h-[420px]`}>
                                {/* Gradiente decorativo de fondo */}
                                <div className={`absolute inset-0 bg-gradient-to-br ${demo.color} opacity-10`} />

                                {/* Mockup de teléfono */}
                                <div className="relative z-10 w-[200px] xl:w-[220px]">
                                    {/* Cuerpo del teléfono */}
                                    <div className="bg-slate-900 rounded-[2.8rem] p-2.5 shadow-2xl shadow-black/40 border border-white/10">
                                        {/* Notch */}
                                        <div className="bg-slate-950 rounded-t-[2.2rem] px-3 pt-3 pb-1">
                                            <div className="flex items-center justify-center">
                                                <div className="w-16 h-1.5 bg-slate-800 rounded-full" />
                                            </div>
                                        </div>
                                        {/* Pantalla del iframe */}
                                        <div className="overflow-hidden rounded-b-[2rem] bg-white" style={{ height: '380px' }}>
                                            <iframe
                                                src={`/${demo.slug}`}
                                                className="w-full h-full border-0"
                                                style={{
                                                    transform: 'scale(0.6)',
                                                    transformOrigin: 'top left',
                                                    width: '167%',
                                                    height: '167%',
                                                    pointerEvents: 'none'
                                                }}
                                                title={`Preview de ${demo.title}`}
                                                loading="lazy"
                                            />
                                        </div>
                                    </div>
                                    {/* Botón home del teléfono */}
                                    <div className="flex justify-center mt-2">
                                        <div className="w-20 h-1 bg-slate-700 rounded-full" />
                                    </div>
                                    {/* Label flotante */}
                                    <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap">
                                        <span className={`text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-full text-white bg-gradient-to-r ${demo.color} shadow-sm`}>
                                            Vista del Cliente
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Info + Credenciales */}
                            <div className="flex flex-col justify-between flex-1 p-6 sm:p-8">
                                <div>
                                    <div className="flex items-center justify-between gap-4 mb-6 mt-2">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-3 rounded-2xl ${demo.lightBg} ${demo.textColor}`}>
                                                <DemoIcon size={22} />
                                            </div>
                                            <div>
                                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">{demo.industry}</span>
                                                <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tight mt-0.5">{demo.title}</h3>
                                            </div>
                                        </div>
                                        <span className="text-[8px] font-black uppercase tracking-widest px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100 shrink-0">
                                            En Vivo
                                        </span>
                                    </div>

                                    <h4 className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-3">Capacidades del SaaS en esta industria:</h4>
                                    <ul className="space-y-3 mb-8">
                                        {demo.highlights.map((h, i) => (
                                            <li key={i} className="flex items-start gap-2.5 text-xs font-semibold text-slate-700">
                                                <span className={`mt-0.5 shrink-0 size-4 rounded-full flex items-center justify-center bg-gradient-to-br ${demo.color} text-white`}>
                                                    <Check size={9} strokeWidth={3} />
                                                </span>
                                                <span>{h}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                {/* CTAs */}
                                <div className="space-y-4 border-t border-slate-100 pt-6">
                                    <div className="w-full">
                                        <Link
                                            href={`/${demo.slug}`}
                                            target="_blank"
                                            className="w-full py-4 border border-slate-200 hover:border-slate-300 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-700 flex items-center justify-center gap-1.5 transition-all bg-white hover:bg-slate-50 active:scale-95 shadow-sm"
                                        >
                                            Ver en Vivo <ExternalLink size={12} />
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </section>

            {/* SaaS Qualities Grid */}
            <section className="max-w-7xl mx-auto px-6 mt-24">
                <div className="text-center mb-16 space-y-4">
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-600">Por qué elegir CitiOx</span>
                    <h2 className="text-3xl sm:text-4xl font-black uppercase italic tracking-tight text-slate-900 leading-none">Cualidades Estratégicas del SaaS</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {qualities.map((q, idx) => {
                        const QIcon = q.icon;
                        return (
                            <div key={idx} className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4 hover:shadow-md transition-shadow">
                                <div className={`p-3 rounded-2xl w-fit ${q.color}`}>
                                    <QIcon size={20} />
                                </div>
                                <h3 className="text-base font-black text-slate-950 uppercase tracking-tight italic">{q.title}</h3>
                                <p className="text-slate-500 font-medium text-xs leading-relaxed">{q.desc}</p>
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* CTA Final */}
            <section className="max-w-4xl mx-auto px-6 mt-24">
                <div className="bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-[3rem] p-8 sm:p-12 text-center relative overflow-hidden border border-white/5 shadow-2xl">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500 rounded-full blur-3xl opacity-10 -mr-24 -mt-24" />
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500 rounded-full blur-3xl opacity-10 -ml-24 -mb-24" />
                    
                    <div className="relative z-10 space-y-6">
                        <h2 className="text-2xl sm:text-4xl font-black uppercase italic tracking-tight leading-none max-w-xl mx-auto">
                            ¿Listo para digitalizar tu propio negocio?
                        </h2>
                        <p className="text-slate-400 font-medium text-xs sm:text-sm max-w-md mx-auto leading-relaxed">
                            Crea tu cuenta de CitiOx en segundos. Obtén un periodo de prueba de 14 días con acceso a todas las funcionalidades profesionales.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3 items-center justify-center pt-4">
                            <Link
                                href="/register"
                                className="w-full sm:w-auto px-8 py-4 bg-white text-slate-950 font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                            >
                                Registrar mi negocio
                                <ArrowRight size={14} />
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

        </div>
    );
}

// Icono auxiliar para fidelización
function GiftIcon({ size = 20, className = "" }: { size?: number; className?: string }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <rect x="3" y="11" width="18" height="10" rx="2" />
            <path d="M12 2v20" />
            <path d="M2 12h20" />
            <path d="M12 7a4 4 0 0 1-4-4 4 4 0 0 1 8 0 4 4 0 0 1-4 4Z" />
        </svg>
    );
}
