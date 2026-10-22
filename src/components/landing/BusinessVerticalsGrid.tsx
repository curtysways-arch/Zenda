'use client';

import React, { useCallback, useEffect, useState } from 'react';
import DemoViewer from './DemoViewer';
import Link from 'next/link';
import { 
    Scissors, 
    UtensilsCrossed, 
    ShoppingBag, 
    Trophy, 
    Shirt, 
    Dumbbell, 
    Eye, 
    ArrowRight,
    Sparkles
} from 'lucide-react';

const ToothIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M7 3C4.24 3 2 5.24 2 8c0 3.5 2 6 3 9.5C6 21 8 21 9 18c.5-1.5 1-3 3-3s2.5 1.5 3 3c1 3 3 3 4-0.5 1-3.5 3-6 3-9.5 0-2.76-2.24-5-5-5-1.5 0-2.8.7-3.8 1.8-.2.2-.4.4-.6.6a1 1 0 0 1-1.2 0c-.2-.2-.4-.4-.6-.6C10.8 3.7 9.5 3 7 3z" />
    </svg>
);

export interface VerticalItem {
    id: string;
    title: string;
    subtitle: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    iconBg: string;
    accentColor: string;
    bullets: string[];
    createLabel: string;
    createHref: string;
    demoUrl: string;
    demoTitle: string;
    demoTag: string;
    demoDescription: string;
    demoFeatures: string[];
    image: string;
}

export const VERTICALS: VerticalItem[] = [
    {
        id: 'servicios',
        image: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=700&auto=format&fit=crop&q=70',
        title: 'Servicios',
        subtitle: 'Citas, clientes y servicios.',
        icon: Scissors,
        iconBg: 'bg-sky-50 text-sky-600',
        accentColor: '#0284c7',
        bullets: ['Peluquerías', 'Barberías', 'Spas', 'Uñas y más'],
        createLabel: 'Crear app de servicios',
        createHref: '/register?tipo=servicios',
        demoUrl: '/symechas-peluquera',
        demoTitle: 'Symechas Peluquería',
        demoTag: 'Belleza & Estética',
        demoDescription: 'App completa para salones y spas con agendamiento de citas 24/7, catálogo de servicios, selección de especialista y recordatorios por WhatsApp.',
        demoFeatures: [
            'Reserva de citas con selección de horario y profesional',
            'Catálogo con fotos, duración y precios de servicios',
            'Ficha de clientes con historial de visitas',
            'Recordatorios automáticos de citas por WhatsApp'
        ]
    },
    {
        id: 'restaurante',
        image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=700&auto=format&fit=crop&q=70',
        title: 'Restaurantes',
        subtitle: 'Pedidos, mesas y ventas.',
        icon: UtensilsCrossed,
        iconBg: 'bg-orange-50 text-orange-600',
        accentColor: '#ea580c',
        bullets: ['Menú digital', 'Pedidos', 'Mesas QR', 'Delivery y más'],
        createLabel: 'Crear app para restaurante',
        createHref: '/register?tipo=restaurante',
        demoUrl: '/parrilla-citiox-demo',
        demoTitle: 'La Parrilla Citiox',
        demoTag: 'Gastronomía & Grill',
        demoDescription: 'Experiencia gastronómica moderna con menú digital QR para mesas, pedidos para llevar, delivery a domicilio y comanda directa.',
        demoFeatures: [
            'Menú digital con categorías, fotos y modificadores',
            'Pedidos desde mesa escaneando código QR',
            'Checkout para retiro en local o delivery',
            'Notificación instantánea del pedido a cocina vía WhatsApp'
        ]
    },
    {
        id: 'tienda',
        image: 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=700&auto=format&fit=crop&q=70',
        title: 'Tiendas',
        subtitle: 'Tu tienda siempre en el bolsillo de tus clientes.',
        icon: ShoppingBag,
        iconBg: 'bg-purple-50 text-purple-600',
        accentColor: '#9333ea',
        bullets: ['Catálogo', 'Variantes', 'Carrito', 'Pagos y más'],
        createLabel: 'Crear tienda app',
        createHref: '/register?tipo=tienda',
        demoUrl: '/tienda',
        demoTitle: 'Citiox Urban Store',
        demoTag: 'Moda & Retail',
        demoDescription: 'Tu propia tienda online y app móvil con carrito de compras, variantes de tallas y colores, cálculo de envíos y pagos integrados.',
        demoFeatures: [
            'Catálogo de productos con múltiples fotos y variantes',
            'Carrito de compras ágil y cálculo automático de envíos',
            'Pasarela de pagos con tarjeta, transferencia o contra entrega',
            'Confirmación inmediata de compras al WhatsApp de la tienda'
        ]
    },
    {
        id: 'canchas',
        image: 'https://images.unsplash.com/photo-1529900748604-07564a03e7a6?w=700&auto=format&fit=crop&q=70',
        title: 'Canchas',
        subtitle: 'Tus canchas, reservas y clientes en un solo lugar.',
        icon: Trophy,
        iconBg: 'bg-emerald-50 text-emerald-600',
        accentColor: '#059669',
        bullets: ['Reservas', 'Disponibilidad', 'Horarios', 'Pagos y más'],
        createLabel: 'Crear app de canchas',
        createHref: '/register?tipo=canchas',
        demoUrl: '/demo-canchas',
        demoTitle: 'Cancha Los Campeones',
        demoTag: 'Pádel & Fútbol',
        demoDescription: 'Sistema de reservas en tiempo real para complejos deportivos de pádel, fútbol y tenis. Disponibilidad en vivo y cobro de señas.',
        demoFeatures: [
            'Grilla en tiempo real de turnos y canchas disponibles',
            'Reserva por hora con cobro de seña para evitar cancelaciones',
            'Gestión de iluminación y tarifas diferenciadas por horario',
            'Escuela deportiva, torneos y partidos abiertos'
        ]
    },
    {
        id: 'lavanderia',
        image: 'https://images.unsplash.com/photo-1517677208171-0bc6725a3e60?w=700&auto=format&fit=crop&q=70',
        title: 'Lavanderías',
        subtitle: 'Recibe, gestiona y entrega tus servicios.',
        icon: Shirt,
        iconBg: 'bg-cyan-50 text-cyan-600',
        accentColor: '#0891b2',
        bullets: ['Solicitudes', 'Recolección', 'Artículos', 'Estados y más'],
        createLabel: 'Crear app de lavandería',
        createHref: '/register?tipo=lavanderia',
        demoUrl: '/demo-lavado',
        demoTitle: 'Sneaker Wash Premium',
        demoTag: 'Lavado & Restauración',
        demoDescription: 'Recepción en local con fotografías y videos de inspección, recolección a domicilio, cotizador multi-ítem y seguimiento en vivo.',
        demoFeatures: [
            'Inspección fotográfica del estado inicial por artículo',
            'Recepción de mostrador con cotización por prenda/calzado',
            'Seguimiento en vivo para el cliente con barra de progreso',
            'Notificaciones automáticas de entrega por WhatsApp'
        ]
    },
    {
        id: 'gimnasio',
        image: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=700&auto=format&fit=crop&q=70',
        title: 'Gimnasios',
        subtitle: 'Convierte tu gimnasio en una experiencia digital.',
        icon: Dumbbell,
        iconBg: 'bg-indigo-50 text-indigo-600',
        accentColor: '#4f46e5',
        bullets: ['Membresías', 'Planes', 'Asistencias', 'Clases y más'],
        createLabel: 'Crear app de gimnasio',
        createHref: '/register?tipo=gimnasio',
        demoUrl: '/vortex-fitness',
        demoTitle: 'Vortex Fitness Club',
        demoTag: 'Fitness & Entrenamiento',
        demoDescription: 'App para gimnasios y boxes de crossfit con venta de membresías, reserva de clases grupales, control de asistencias por QR y planes.',
        demoFeatures: [
            'Venta y renovación de membresías mensuales/anuales',
            'Control de asistencia por QR o check-in digital',
            'Calendario de clases con reserva de cupos limitados',
            'Avisos automáticos de vencimiento de contrato'
        ]
    },
    {
        id: 'dentista',
        image: 'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=700&auto=format&fit=crop&q=70',
        title: 'Clínicas y odontología',
        subtitle: 'Una experiencia digital para tus pacientes.',
        icon: ToothIcon,
        iconBg: 'bg-sky-50 text-sky-600',
        accentColor: '#0284c7',
        bullets: ['Pacientes', 'Citas', 'Historia clínica', 'Tratamientos y más'],
        createLabel: 'Crear app para mi clínica',
        createHref: '/register?tipo=dentista',
        demoUrl: '/dental-chip',
        demoTitle: 'Dental Chip',
        demoTag: 'Salud & Odontología',
        demoDescription: 'Presencia digital para clínicas odontológicas y médicas con agenda de consultas, catálogo de especialidades y ficha del paciente.',
        demoFeatures: [
            'Agendamiento de citas médicas y odontológicas por especialidad',
            'Catálogo de tratamientos con precios y recomendaciones',
            'Registro y ficha médica digital del paciente',
            'Confirmación y recordatorios preventivos por WhatsApp'
        ]
    }
];

export default function BusinessVerticalsGrid() {
    const [selectedDemo, setSelectedDemo] = useState<VerticalItem | null>(null);

    // Abrir un ejemplo agrega una entrada al historial: el botón "atrás" del celular lo cierra
    // y la dirección (#ejemplo-restaurante) se puede compartir.
    const showDemo = useCallback((v: VerticalItem) => {
        setSelectedDemo(v);
        const hash = `#ejemplo-${v.id}`;
        if (window.history.state?.citioxDemo) window.history.replaceState({ citioxDemo: true }, '', hash);
        else window.history.pushState({ citioxDemo: true }, '', hash);
    }, []);

    const closeDemo = useCallback(() => {
        if (window.history.state?.citioxDemo) window.history.back();
        else setSelectedDemo(null);
    }, []);

    useEffect(() => {
        const sync = () => {
            const m = window.location.hash.match(/^#ejemplo-(.+)$/);
            const found = m ? VERTICALS.find((v) => v.id === m[1]) : null;
            setSelectedDemo(found || null);
        };
        sync(); // abrir directo si la dirección ya trae #ejemplo-...
        window.addEventListener('popstate', sync);
        return () => window.removeEventListener('popstate', sync);
    }, []);

    return (
        <>
            {/* Tarjetas de tipos de negocio */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
                {VERTICALS.map((v) => {
                    const IconComp = v.icon;
                    return (
                        <article
                            key={v.id}
                            className="group bg-white rounded-3xl ring-1 ring-slate-200/80 overflow-hidden flex flex-col hover:shadow-xl hover:shadow-slate-900/10 hover:-translate-y-1 transition-all duration-300"
                        >
                            <button
                                type="button"
                                onClick={() => showDemo(v)}
                                className="relative h-40 overflow-hidden cursor-pointer text-left"
                                aria-label={`Ver ejemplo de app para ${v.title}`}
                            >
                                <img
                                    src={v.image}
                                    alt=""
                                    loading="lazy"
                                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                />
                                <span className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/10 to-transparent" />
                                <span className={`absolute top-3 left-3 size-10 rounded-xl ${v.iconBg} flex items-center justify-center shadow-sm`}>
                                    <IconComp size={19} />
                                </span>
                                <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-white/95 text-slate-900 text-xs font-semibold px-2.5 py-1 opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all">
                                    <Eye size={13} /> Ver ejemplo
                                </span>
                            </button>

                            <div className="p-5 flex flex-col flex-1">
                                <h3 className="text-lg font-bold text-slate-950">{v.title}</h3>
                                <p className="mt-1 text-[15px] text-slate-600 leading-snug">{v.subtitle}</p>
                                <ul className="mt-3 flex flex-wrap gap-1.5">
                                    {v.bullets.map((b) => (
                                        <li key={b} className="text-xs font-medium text-slate-600 bg-slate-100 rounded-full px-2.5 py-1">{b}</li>
                                    ))}
                                </ul>
                                <div className="mt-auto pt-5 flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => showDemo(v)}
                                        className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-semibold transition-colors cursor-pointer"
                                    >
                                        <Eye size={15} /> Ver ejemplo
                                    </button>
                                    <Link
                                        href={v.createHref}
                                        className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-full bg-[#0066FF] hover:bg-[#0052cc] text-white text-sm font-semibold transition-colors"
                                    >
                                        Crear <ArrowRight size={15} />
                                    </Link>
                                </div>
                            </div>
                        </article>
                    );
                })}

                {/* Tarjeta para negocios que no encajan */}
                <article className="rounded-3xl bg-slate-950 text-white p-6 flex flex-col justify-between min-h-[280px] relative overflow-hidden">
                    <div className="absolute -right-10 -top-10 size-40 rounded-full bg-[#0066FF]/40 blur-2xl" aria-hidden />
                    <div className="relative">
                        <span className="size-10 rounded-xl bg-white/10 flex items-center justify-center"><Sparkles size={19} /></span>
                        <h3 className="mt-4 text-xl font-bold" style={{ color: 'white' }}>¿Tu negocio es diferente?</h3>
                        <p className="mt-2 text-[15px] text-slate-300 leading-snug">
                            Elige el tipo más parecido al crear tu cuenta y ajusta servicios, productos y horarios a tu manera.
                        </p>
                    </div>
                    <Link
                        href="/register"
                        className="relative mt-6 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-full bg-white text-slate-950 hover:bg-sky-100 text-sm font-semibold transition-colors"
                    >
                        Empezar ahora <ArrowRight size={15} />
                    </Link>
                </article>
            </div>

            {selectedDemo && (
                <DemoViewer items={VERTICALS} current={selectedDemo} onChange={showDemo} onClose={closeDemo} />
            )}
        </>
    );
}
