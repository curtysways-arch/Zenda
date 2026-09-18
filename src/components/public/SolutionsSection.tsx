'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
    Calendar, 
    Trophy, 
    ShoppingBag, 
    Dumbbell, 
    Sparkles, 
    ArrowRight, 
    X, 
    CheckCircle2, 
    ExternalLink, 
    Layers,
    UtensilsCrossed,
    ShieldCheck
} from 'lucide-react';

interface SolutionItem {
    id: string;
    title: string;
    subtitle: string;
    description: string;
    icon: any;
    color: string;
    shadowColor: string;
    textColor: string;
    href: string;
    badge?: string;
    features: string[];
}

const SOLUTIONS: SolutionItem[] = [
    {
        id: 'citas',
        title: 'Citas y Reservas',
        subtitle: 'Profesionales & Bienestar',
        description: 'Spas, salones de belleza, barberías, consultorios médicos y terapeutas independientes.',
        icon: Calendar,
        color: 'bg-purple-600 text-white',
        shadowColor: 'shadow-purple-500/25',
        textColor: 'text-purple-600',
        href: '/servicios',
        features: ['Agenda 24/7 sin esperas', 'Recordatorios por WhatsApp', 'Gestión de especialistas y horarios', 'Historial clínico/cliente']
    },
    {
        id: 'restaurantes',
        title: 'Restaurantes & Gastro',
        subtitle: 'Comidas & Bebidas',
        description: 'Menú digital QR, pedidos a mesa, delivery directo sin comisiones abusivas y comandas a cocina.',
        icon: UtensilsCrossed,
        color: 'bg-emerald-600 text-white',
        shadowColor: 'shadow-emerald-500/25',
        textColor: 'text-emerald-600',
        href: '/restaurantes',
        features: ['Menú digital interactivo', 'Pedidos mesa y delivery', 'Comanda de cocina en tiempo real', 'Cobro integrado y propinas']
    },
    {
        id: 'canchas',
        title: 'Canchas y Complejos',
        subtitle: 'Deportes & Espacios',
        description: 'Reserva por horas de canchas de fútbol, pádel, tenis, piscinas, salas de eventos y complejos deportivos.',
        icon: Trophy,
        color: 'bg-amber-500 text-white',
        shadowColor: 'shadow-amber-500/25',
        textColor: 'text-amber-600',
        href: '/canchas',
        features: ['Turnero por franja horaria', 'Cobro de seña anticipada', 'Control de iluminación y turnos', 'Torneos y clasificaciones']
    },
    {
        id: 'tiendas',
        title: 'Tienda en Línea',
        subtitle: 'E-commerce & Retail',
        description: 'Vende productos físicos o digitales con tu propio catálogo, carrito ágil, control de stock y envíos.',
        icon: ShoppingBag,
        color: 'bg-blue-600 text-white',
        shadowColor: 'shadow-blue-500/25',
        textColor: 'text-blue-600',
        href: '/tiendas',
        features: ['Catálogo multi-categoría', 'Carrito optimizado móvil', 'Gestión de inventario y stock', 'Notificaciones de pedidos']
    },
    {
        id: 'lavanderia',
        title: 'Lavandería & Calzado',
        subtitle: 'Sneaker Wash & Tintorería',
        description: 'Servicio exclusivo a domicilio con cálculo GPS, wizard de artículos, control por etapas y fotos de prendas.',
        icon: Sparkles,
        color: 'bg-indigo-600 text-white',
        shadowColor: 'shadow-indigo-500/25',
        textColor: 'text-indigo-600',
        href: '/lavado',
        badge: 'Destacado',
        features: ['Retiro a domicilio con GPS', 'Wizard fotográfico de prendas', 'Seguimiento por etapas en vivo', 'Inspección previa y extras']
    },
    {
        id: 'gimnasios',
        title: 'Gimnasios & Fitness',
        subtitle: 'Clubes & Academias',
        description: 'Planes de membresía, rutinas de entrenamiento, control de asistencia de alumnos y seguimiento.',
        icon: Dumbbell,
        color: 'bg-rose-600 text-white',
        shadowColor: 'shadow-rose-500/25',
        textColor: 'text-rose-600',
        href: '/register',
        features: ['Cobro recurrente de membresías', 'Control de accesos y asistencias', 'Fichas y rutinas personalizadas', 'Alertas de vencimiento']
    }
];

export default function SolutionsSection() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedSolution, setSelectedSolution] = useState<SolutionItem | null>(null);

    // Evitar scroll de fondo al abrir modal y escuchar ESC
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setIsModalOpen(false);
            }
        };

        if (isModalOpen) {
            document.body.style.overflow = 'hidden';
            window.addEventListener('keydown', handleKeyDown);
        } else {
            document.body.style.overflow = '';
        }

        return () => {
            document.body.style.overflow = '';
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isModalOpen]);

    const handleOpenModal = (sol?: SolutionItem) => {
        if (sol) {
            setSelectedSolution(sol);
        } else {
            setSelectedSolution(null);
        }
        setIsModalOpen(true);
    };

    return (
        <>
            <section id="soluciones" className="py-20 max-w-7xl mx-auto px-6">
                {/* Header de la sección */}
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
                    <div className="space-y-2">
                        <div className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[#4f46e5]">
                            <span>⚛️</span>
                            <span>SOLUCIONES PARA CADA NEGOCIO</span>
                        </div>
                        <h2 className="text-3xl sm:text-4xl font-black text-slate-950 tracking-tight">
                            Elige el tipo de negocio que <span className="text-[#6366f1]">mejor te represente</span>
                        </h2>
                    </div>

                    <button 
                        type="button"
                        onClick={() => handleOpenModal()}
                        className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#4f46e5] hover:text-[#4338ca] bg-indigo-50 hover:bg-indigo-100/80 px-4 py-2.5 rounded-xl border border-indigo-200/80 transition-all cursor-pointer self-start md:self-auto shadow-2xs group"
                    >
                        <span>VER TODOS LOS TIPOS</span>
                        <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                    </button>
                </div>

                {/* 6 Tarjetas de Solución (Incluyendo Lavandería & Calzado) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-5">
                    {SOLUTIONS.map((sol) => {
                        const Icon = sol.icon;
                        return (
                            <div 
                                key={sol.id} 
                                className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between group hover:-translate-y-1 relative"
                            >
                                {sol.badge && (
                                    <div className="absolute top-4 right-4">
                                        <span className="bg-indigo-100 text-indigo-800 text-[10px] font-black uppercase px-2 py-0.5 rounded-full tracking-wider border border-indigo-200">
                                            {sol.badge}
                                        </span>
                                    </div>
                                )}

                                <div className="space-y-3.5">
                                    <div className={`size-12 rounded-2xl ${sol.color} flex items-center justify-center shadow-md ${sol.shadowColor}`}>
                                        <Icon size={22} />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-black text-slate-900 group-hover:text-[#4f46e5] transition-colors leading-tight">
                                            {sol.title}
                                        </h3>
                                        <p className="text-xs text-slate-500 font-medium mt-1.5 leading-relaxed line-clamp-3">
                                            {sol.description}
                                        </p>
                                    </div>
                                </div>

                                <div className="pt-5 mt-4 border-t border-slate-100 flex items-center justify-between">
                                    <Link 
                                        href={sol.href}
                                        className={`text-xs font-black ${sol.textColor} hover:underline flex items-center gap-1`}
                                    >
                                        <span>Ver solución</span>
                                        <ArrowRight size={12} />
                                    </Link>

                                    <button
                                        type="button"
                                        onClick={() => handleOpenModal(sol)}
                                        className="text-[11px] font-bold text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                                        title="Ver detalles"
                                    >
                                        + Info
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* MODAL INTERACTIVO: TODOS LOS MODELOS DE NEGOCIO */}
            {isModalOpen && (
                <div 
                    className="fixed inset-0 z-[99999] bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200"
                    onClick={() => setIsModalOpen(false)}
                >
                    <div 
                        className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl relative max-h-[92vh] flex flex-col overflow-hidden border border-slate-100"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Cabecera del Modal */}
                        <div className="p-6 sm:p-7 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50">
                            <div className="space-y-1">
                                <div className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-[#4f46e5]">
                                    <Layers size={14} />
                                    <span>Ecosistema Citiox</span>
                                </div>
                                <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                                    Modelos de Negocio Disponibles
                                </h3>
                                <p className="text-xs text-slate-500 font-medium">
                                    Tecnología especializada para cada industria. Elige el modelo ideal para tu negocio.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => setIsModalOpen(false)}
                                className="size-10 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-all cursor-pointer shadow-2xs"
                                aria-label="Cerrar modal"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Contenido con Scroll de Modelos */}
                        <div className="p-6 sm:p-7 overflow-y-auto space-y-4 flex-1">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {SOLUTIONS.map((sol) => {
                                    const Icon = sol.icon;
                                    const isHighlight = selectedSolution?.id === sol.id;

                                    return (
                                        <div 
                                            key={sol.id}
                                            className={`p-5 rounded-3xl border transition-all flex flex-col justify-between ${
                                                isHighlight 
                                                    ? 'bg-indigo-50/60 border-indigo-400 ring-2 ring-indigo-200' 
                                                    : 'bg-white border-slate-200/80 hover:border-slate-300 shadow-xs'
                                            }`}
                                        >
                                            <div className="space-y-3">
                                                <div className="flex items-start justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`size-11 rounded-2xl ${sol.color} flex items-center justify-center shadow-md ${sol.shadowColor} shrink-0`}>
                                                            <Icon size={20} />
                                                        </div>
                                                        <div>
                                                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                                                                {sol.subtitle}
                                                            </span>
                                                            <h4 className="text-base font-black text-slate-900 leading-tight">
                                                                {sol.title}
                                                            </h4>
                                                        </div>
                                                    </div>

                                                    {sol.badge && (
                                                        <span className="bg-indigo-100 text-indigo-800 text-[9px] font-black uppercase px-2 py-0.5 rounded-full border border-indigo-200">
                                                            {sol.badge}
                                                        </span>
                                                    )}
                                                </div>

                                                <p className="text-xs text-slate-600 font-medium leading-relaxed">
                                                    {sol.description}
                                                </p>

                                                {/* Características Clave */}
                                                <div className="space-y-1.5 pt-1">
                                                    <span className="text-[10px] font-extrabold uppercase text-slate-400 block">
                                                        Incluye en la app:
                                                    </span>
                                                    <div className="grid grid-cols-1 gap-1">
                                                        {sol.features.map((feat, idx) => (
                                                            <div key={idx} className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                                                                <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                                                                <span>{feat}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Acciones */}
                                            <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                                                <Link
                                                    href={sol.href}
                                                    onClick={() => setIsModalOpen(false)}
                                                    className={`text-xs font-black ${sol.textColor} hover:underline flex items-center gap-1.5`}
                                                >
                                                    <span>Explorar Solución</span>
                                                    <ExternalLink size={13} />
                                                </Link>

                                                <Link
                                                    href={`/register?tipo=${sol.id}`}
                                                    onClick={() => setIsModalOpen(false)}
                                                    className="px-3.5 py-1.5 bg-slate-900 hover:bg-[#4f46e5] text-white text-[11px] font-black uppercase rounded-xl transition-all shadow-2xs"
                                                >
                                                    Crear Negocio
                                                </Link>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Pie del modal */}
                        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 text-xs">
                            <div className="flex items-center gap-2 text-slate-600 font-medium">
                                <ShieldCheck size={16} className="text-emerald-600" />
                                <span>Todos los modelos incluyen dominio propio, app PWA para clientes y panel admin.</span>
                            </div>

                            <button
                                type="button"
                                onClick={() => setIsModalOpen(false)}
                                className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition-colors cursor-pointer self-end sm:self-auto text-xs"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}