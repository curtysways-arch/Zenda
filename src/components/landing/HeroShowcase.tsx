'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
    Scissors,
    UtensilsCrossed,
    ShoppingBag,
    Trophy,
    Dumbbell,
    Shirt,
    Stethoscope,
    CalendarCheck,
    Bell,
    CreditCard,
    QrCode,
    Truck,
    Clock,
    Plus,
    Check,
    Search,
    Link2,
    ChevronRight,
} from 'lucide-react';

const img = (id: string, w = 500) => `https://images.unsplash.com/photo-${id}?w=${w}&auto=format&fit=crop&q=70`;

/* ───────────────────────── Pantallas de ejemplo ───────────────────────── */

function ScreenHeader({ image, name, note }: { image: string; name: string; note: string }) {
    return (
        <div className="relative h-28 shrink-0">
            <img src={img(image, 600)} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
            <div className="absolute bottom-2.5 left-3 right-3 text-white">
                <p className="text-[15px] font-bold leading-tight">{name}</p>
                <p className="text-[10px] text-white/80 font-medium">{note}</p>
            </div>
        </div>
    );
}

function SpaScreen() {
    const services = [
        { name: 'Masaje relajante', time: '60 min', price: '$45', image: '1544022613-e87ca75a784a', active: true },
        { name: 'Limpieza facial', time: '60 min', price: '$40', image: '1512290923902-8a9f81dc236c' },
        { name: 'Manicure spa', time: '45 min', price: '$20', image: '1604654894610-df63bc536371' },
    ];
    return (
        <div className="flex flex-col h-full bg-white">
            <ScreenHeader image="1544161515-4ab6ce6db874" name="Aura Spa" note="Abierto hoy · 9:00 a 19:00" />
            <div className="p-3 space-y-2 flex-1">
                <p className="text-[11px] font-bold text-slate-900">Elige tu servicio</p>
                {services.map((s) => (
                    <div key={s.name} className={`flex items-center gap-2 p-1.5 rounded-xl border ${s.active ? 'border-rose-300 bg-rose-50' : 'border-slate-100'}`}>
                        <img src={img(s.image, 120)} alt="" className="size-9 rounded-lg object-cover" loading="lazy" />
                        <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-semibold text-slate-900 truncate">{s.name}</p>
                            <p className="text-[10px] text-slate-500">{s.time}</p>
                        </div>
                        <span className="text-[11px] font-bold text-slate-900">{s.price}</span>
                    </div>
                ))}
                <p className="text-[11px] font-bold text-slate-900 pt-1">Mañana</p>
                <div className="grid grid-cols-4 gap-1">
                    {['10:00', '11:30', '15:00', '16:30'].map((t) => (
                        <span key={t} className={`text-center text-[10px] font-semibold py-1 rounded-lg ${t === '11:30' ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-700'}`}>{t}</span>
                    ))}
                </div>
            </div>
            <div className="p-3 pt-0">
                <div className="w-full text-center py-2.5 rounded-xl bg-rose-500 text-white text-[11px] font-bold">Reservar mañana 11:30</div>
            </div>
        </div>
    );
}

function RestaurantScreen() {
    const items = [
        { name: 'Bife de chorizo 400 g', price: '$18.50', image: '1558030006-450675393462', qty: 1 },
        { name: 'Costillas BBQ', price: '$15.00', image: '1544025162-d76694265947' },
        { name: 'Empanadas (3)', price: '$6.00', image: '1601050690597-df0568f70950', qty: 1 },
    ];
    return (
        <div className="flex flex-col h-full bg-white">
            <ScreenHeader image="1555396273-367ea4eb4db5" name="La Brasa" note="Mesa 4 · Pedido desde la mesa" />
            <div className="flex gap-1.5 px-3 pt-3">
                {['Parrilla', 'Entradas', 'Bebidas'].map((c, i) => (
                    <span key={c} className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${i === 0 ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-600'}`}>{c}</span>
                ))}
            </div>
            <div className="p-3 space-y-2 flex-1">
                {items.map((it) => (
                    <div key={it.name} className="flex items-center gap-2">
                        <img src={img(it.image, 140)} alt="" className="size-11 rounded-xl object-cover" loading="lazy" />
                        <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-semibold text-slate-900 truncate">{it.name}</p>
                            <p className="text-[11px] font-bold text-orange-600">{it.price}</p>
                        </div>
                        {it.qty ? (
                            <span className="size-6 rounded-full bg-orange-500 text-white text-[10px] font-bold flex items-center justify-center">{it.qty}</span>
                        ) : (
                            <span className="size-6 rounded-full border border-slate-200 text-slate-500 flex items-center justify-center"><Plus size={12} /></span>
                        )}
                    </div>
                ))}
            </div>
            <div className="p-3 pt-0">
                <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-slate-900 text-white text-[11px] font-bold">
                    <span>Ver pedido · 2</span>
                    <span>$24.50</span>
                </div>
            </div>
        </div>
    );
}

function StoreScreen() {
    const products = [
        { name: 'Blusa de lino', price: '$29', image: '1434389677669-e08b4cac3105' },
        { name: 'Jean mom fit', price: '$39', image: '1541099649105-f69ad21f3246' },
        { name: 'Bolso de cuero', price: '$55', image: '1584917865442-de89df76afd3' },
        { name: 'Gafas de sol', price: '$22', image: '1511499767150-a48a237f0083' },
    ];
    return (
        <div className="flex flex-col h-full bg-white">
            <div className="px-3 pt-3 pb-2 space-y-2">
                <div className="flex items-center justify-between">
                    <p className="text-[15px] font-bold text-slate-900">Lino &amp; Co.</p>
                    <span className="relative">
                        <ShoppingBag size={16} className="text-slate-800" />
                        <span className="absolute -top-1.5 -right-1.5 size-3.5 rounded-full bg-violet-600 text-white text-[8px] font-bold flex items-center justify-center">1</span>
                    </span>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 text-slate-400 text-[10px]">
                    <Search size={11} /> Buscar productos
                </div>
            </div>
            <div className="grid grid-cols-2 gap-2 px-3 flex-1 content-start">
                {products.map((p) => (
                    <div key={p.name}>
                        <img src={img(p.image, 260)} alt="" className="w-full aspect-[4/5] rounded-xl object-cover bg-slate-100" loading="lazy" />
                        <p className="text-[10px] font-semibold text-slate-800 mt-1 truncate">{p.name}</p>
                        <p className="text-[11px] font-bold text-violet-700">{p.price}</p>
                    </div>
                ))}
            </div>
            <div className="p-3">
                <div className="w-full text-center py-2.5 rounded-xl bg-violet-600 text-white text-[11px] font-bold">Ir al carrito · $55</div>
            </div>
        </div>
    );
}

function CourtsScreen() {
    const hours = ['18:00', '19:00', '20:00', '21:00'];
    const taken: Record<string, boolean> = { '18:00-F5': true, '19:00-Pádel': true, '21:00-F5': true };
    return (
        <div className="flex flex-col h-full bg-white">
            <ScreenHeader image="1529900748604-07564a03e7a6" name="Complejo El Dorado" note="Fútbol 5 · Pádel" />
            <div className="flex gap-1 px-3 pt-3">
                {[['Lun', '19'], ['Mar', '20'], ['Mié', '21'], ['Jue', '22']].map(([d, n], i) => (
                    <span key={n} className={`flex-1 text-center rounded-xl py-1 ${i === 0 ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                        <span className="block text-[9px] font-medium">{d}</span>
                        <span className="block text-[12px] font-bold">{n}</span>
                    </span>
                ))}
            </div>
            <div className="px-3 pt-3 flex-1">
                <div className="grid grid-cols-[38px_1fr_1fr] gap-1 text-[10px]">
                    <span />
                    <span className="text-center font-bold text-slate-700">Fútbol 5</span>
                    <span className="text-center font-bold text-slate-700">Pádel</span>
                    {hours.map((h) => (
                        <React.Fragment key={h}>
                            <span className="font-semibold text-slate-500 py-1.5">{h}</span>
                            {['F5', 'Pádel'].map((c) => {
                                const isTaken = taken[`${h}-${c}`];
                                const selected = h === '20:00' && c === 'Pádel';
                                return (
                                    <span
                                        key={c}
                                        className={`text-center rounded-lg py-1.5 font-semibold ${selected ? 'bg-emerald-600 text-white' : isTaken ? 'bg-slate-100 text-slate-400 line-through' : 'bg-emerald-50 text-emerald-700'}`}
                                    >
                                        {selected ? 'Tuya' : isTaken ? 'Ocupada' : 'Libre'}
                                    </span>
                                );
                            })}
                        </React.Fragment>
                    ))}
                </div>
            </div>
            <div className="p-3">
                <div className="w-full text-center py-2.5 rounded-xl bg-emerald-600 text-white text-[11px] font-bold">Reservar Pádel 20:00 · $25</div>
            </div>
        </div>
    );
}

function GymScreen() {
    const classes = [
        { name: 'Spinning', time: '18:00', spots: '4 cupos' },
        { name: 'Funcional', time: '19:00', spots: 'Lleno', full: true },
        { name: 'Yoga', time: '20:00', spots: '9 cupos' },
    ];
    return (
        <div className="flex flex-col h-full bg-slate-950 text-white">
            <div className="px-3 pt-3">
                <p className="text-[10px] text-slate-400">Hola, Carla</p>
                <p className="text-[15px] font-bold">Vortex Fitness</p>
            </div>
            <div className="m-3 p-3 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 relative overflow-hidden">
                <div className="absolute -right-6 -top-6 size-24 rounded-full bg-white/15" />
                <p className="text-[10px] text-indigo-100">Tu membresía</p>
                <p className="text-[14px] font-bold">Plan mensual</p>
                <p className="text-[10px] text-indigo-100 mb-2">Activa hasta el 15 de noviembre</p>
                <div className="inline-flex items-center gap-1.5 bg-white text-indigo-700 rounded-lg px-2 py-1 text-[10px] font-bold">
                    <QrCode size={12} /> Mostrar mi QR de ingreso
                </div>
            </div>
            <div className="px-3 flex-1 space-y-1.5">
                <p className="text-[11px] font-bold">Clases de hoy</p>
                {classes.map((c) => (
                    <div key={c.name} className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/10">
                        <div>
                            <p className="text-[11px] font-semibold">{c.name}</p>
                            <p className="text-[10px] text-slate-400 flex items-center gap-1"><Clock size={9} /> {c.time}</p>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${c.full ? 'bg-white/10 text-slate-400' : 'bg-indigo-500/20 text-indigo-200'}`}>{c.spots}</span>
                    </div>
                ))}
            </div>
            <div className="p-3">
                <div className="w-full text-center py-2.5 rounded-xl bg-white text-slate-950 text-[11px] font-bold">Reservar Spinning 18:00</div>
            </div>
        </div>
    );
}

function DentalScreen() {
    return (
        <div className="flex flex-col h-full bg-sky-50/60">
            <div className="px-3 pt-3">
                <p className="text-[10px] text-slate-500">Clínica dental</p>
                <p className="text-[15px] font-bold text-slate-900">Sonríe</p>
            </div>
            <div className="m-3 p-3 rounded-2xl bg-white border border-sky-100 shadow-sm">
                <p className="text-[10px] font-bold text-sky-700 mb-2">Tu próxima cita</p>
                <div className="flex items-center gap-2">
                    <img src={img('1559839734-2b71ea197ec2', 120)} alt="" className="size-10 rounded-full object-cover" loading="lazy" />
                    <div className="min-w-0">
                        <p className="text-[12px] font-bold text-slate-900">Limpieza dental</p>
                        <p className="text-[10px] text-slate-500">Dra. Sofía Vargas</p>
                    </div>
                </div>
                <div className="flex gap-1.5 mt-2.5">
                    <span className="flex-1 text-center text-[10px] font-semibold bg-sky-50 text-sky-800 rounded-lg py-1">Mar 21 oct</span>
                    <span className="flex-1 text-center text-[10px] font-semibold bg-sky-50 text-sky-800 rounded-lg py-1">10:30</span>
                </div>
            </div>
            <div className="px-3 flex-1">
                <p className="text-[11px] font-bold text-slate-900 mb-1.5">Tratamientos</p>
                <div className="space-y-1.5">
                    {[['Consulta general', '$20'], ['Blanqueamiento', '$120'], ['Ortodoncia', 'Evaluación']].map(([n, p]) => (
                        <div key={n} className="flex items-center justify-between bg-white rounded-xl px-2.5 py-2 border border-slate-100">
                            <span className="text-[11px] font-semibold text-slate-800">{n}</span>
                            <span className="text-[10px] font-bold text-sky-700 flex items-center gap-0.5">{p} <ChevronRight size={10} /></span>
                        </div>
                    ))}
                </div>
            </div>
            <div className="p-3">
                <div className="w-full text-center py-2.5 rounded-xl bg-sky-600 text-white text-[11px] font-bold">Agendar una cita</div>
            </div>
        </div>
    );
}

function LaundryScreen() {
    const steps = [
        { label: 'Recibido', done: true },
        { label: 'Lavando', done: true },
        { label: 'Planchado', current: true },
        { label: 'Listo para entregar' },
    ];
    return (
        <div className="flex flex-col h-full bg-white">
            <div className="px-3 pt-3">
                <p className="text-[10px] text-slate-500">Lavandería Burbuja</p>
                <p className="text-[15px] font-bold text-slate-900">Tu pedido #1042</p>
            </div>
            <div className="m-3 p-3 rounded-2xl bg-cyan-50 border border-cyan-100">
                {steps.map((s, i) => (
                    <div key={s.label} className="flex items-start gap-2">
                        <div className="flex flex-col items-center">
                            <span className={`size-4 rounded-full flex items-center justify-center ${s.done ? 'bg-cyan-600 text-white' : s.current ? 'bg-white border-2 border-cyan-600' : 'bg-white border-2 border-slate-200'}`}>
                                {s.done && <Check size={9} strokeWidth={3} />}
                            </span>
                            {i < steps.length - 1 && <span className={`w-0.5 h-4 ${s.done ? 'bg-cyan-600' : 'bg-slate-200'}`} />}
                        </div>
                        <p className={`text-[11px] -mt-0.5 ${s.current ? 'font-bold text-cyan-800' : s.done ? 'font-semibold text-slate-700' : 'text-slate-400'}`}>
                            {s.label}{s.current && ' · ahora'}
                        </p>
                    </div>
                ))}
            </div>
            <div className="px-3 flex-1 space-y-1.5">
                {[['Camisas', '×4', '$4.00'], ['Edredón', '×1', '$10.00']].map(([n, q, p]) => (
                    <div key={n} className="flex items-center justify-between text-[11px] border-b border-slate-100 pb-1.5">
                        <span className="text-slate-700 font-medium">{n} <span className="text-slate-400">{q}</span></span>
                        <span className="font-bold text-slate-900">{p}</span>
                    </div>
                ))}
                <div className="flex items-center justify-between text-[12px] pt-0.5">
                    <span className="font-bold text-slate-900">Total</span>
                    <span className="font-bold text-cyan-700">$14.00</span>
                </div>
            </div>
            <div className="p-3">
                <div className="w-full text-center py-2.5 rounded-xl bg-cyan-600 text-white text-[11px] font-bold">Pedir recolección a domicilio</div>
            </div>
        </div>
    );
}

/* ───────────────────────── Configuración por tipo ───────────────────────── */

type Showcase = {
    id: string;
    label: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    glow: string;
    dot: string;
    slug: string;
    Screen: () => React.ReactElement;
    notice: { icon: React.ComponentType<{ size?: number; className?: string }>; title: string; detail: string; tint: string };
};

const SHOWCASES: Showcase[] = [
    {
        id: 'spa', label: 'Spa y belleza', icon: Scissors, glow: 'from-rose-300/50 to-amber-200/40', dot: 'bg-rose-500', slug: 'aura-spa', Screen: SpaScreen,
        notice: { icon: CalendarCheck, title: 'Nueva reserva', detail: 'Masaje relajante · mañana 11:30', tint: 'bg-rose-100 text-rose-600' },
    },
    {
        id: 'restaurante', label: 'Restaurantes', icon: UtensilsCrossed, glow: 'from-orange-300/50 to-yellow-200/40', dot: 'bg-orange-500', slug: 'la-brasa', Screen: RestaurantScreen,
        notice: { icon: Bell, title: 'Pedido nuevo · Mesa 4', detail: '2 productos · $24.50', tint: 'bg-orange-100 text-orange-600' },
    },
    {
        id: 'tienda', label: 'Tiendas', icon: ShoppingBag, glow: 'from-violet-300/50 to-fuchsia-200/40', dot: 'bg-violet-600', slug: 'lino-co', Screen: StoreScreen,
        notice: { icon: CreditCard, title: 'Venta realizada', detail: 'Bolso de cuero · $55.00', tint: 'bg-violet-100 text-violet-600' },
    },
    {
        id: 'canchas', label: 'Canchas', icon: Trophy, glow: 'from-emerald-300/50 to-lime-200/40', dot: 'bg-emerald-600', slug: 'el-dorado', Screen: CourtsScreen,
        notice: { icon: CalendarCheck, title: 'Cancha reservada', detail: 'Pádel · hoy 20:00', tint: 'bg-emerald-100 text-emerald-700' },
    },
    {
        id: 'gimnasio', label: 'Gimnasios', icon: Dumbbell, glow: 'from-indigo-400/50 to-violet-300/40', dot: 'bg-indigo-600', slug: 'vortex-fitness', Screen: GymScreen,
        notice: { icon: QrCode, title: 'Ingreso registrado', detail: 'Carla M. · Plan mensual', tint: 'bg-indigo-100 text-indigo-600' },
    },
    {
        id: 'dental', label: 'Clínicas', icon: Stethoscope, glow: 'from-sky-300/50 to-cyan-200/40', dot: 'bg-sky-600', slug: 'clinica-sonrie', Screen: DentalScreen,
        notice: { icon: CalendarCheck, title: 'Cita confirmada', detail: 'Limpieza dental · mar 10:30', tint: 'bg-sky-100 text-sky-700' },
    },
    {
        id: 'lavanderia', label: 'Lavanderías', icon: Shirt, glow: 'from-cyan-300/50 to-teal-200/40', dot: 'bg-cyan-600', slug: 'burbuja', Screen: LaundryScreen,
        notice: { icon: Truck, title: 'Recolección pedida', detail: 'Hoy entre 17:00 y 18:00', tint: 'bg-cyan-100 text-cyan-700' },
    },
];

const ROTATE_MS = 5000;

export default function HeroShowcase() {
    const [index, setIndex] = useState(0);
    const [auto, setAuto] = useState(true);
    const hovering = useRef(false);

    useEffect(() => {
        if (!auto) return;
        const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        if (reduce) return;
        const t = setInterval(() => {
            if (!hovering.current) setIndex((i) => (i + 1) % SHOWCASES.length);
        }, ROTATE_MS);
        return () => clearInterval(t);
    }, [auto]);

    const current = SHOWCASES[index];
    const Screen = current.Screen;
    const NoticeIcon = current.notice.icon;

    return (
        <div
            className="w-full flex flex-col items-center"
            onMouseEnter={() => { hovering.current = true; }}
            onMouseLeave={() => { hovering.current = false; }}
        >
            {/* Escenario del teléfono */}
            <div className="relative w-full max-w-[460px] h-[560px] sm:h-[600px] flex items-center justify-center">
                {/* Resplandor del color del negocio */}
                <div className={`absolute inset-x-6 top-10 bottom-10 rounded-full bg-gradient-to-br ${current.glow} blur-3xl transition-all duration-700`} aria-hidden />

                {/* Teléfono */}
                <div className="relative w-[268px] sm:w-[284px] h-[540px] sm:h-[576px] rounded-[2.8rem] bg-slate-950 p-[10px] shadow-[0_40px_80px_-20px_rgba(15,23,42,0.45)] ring-1 ring-slate-800">
                    <div className="absolute top-[18px] left-1/2 -translate-x-1/2 w-20 h-[22px] rounded-full bg-black z-20" aria-hidden />
                    <div className={`relative w-full h-full rounded-[2.2rem] overflow-hidden ${current.id === 'gimnasio' ? 'bg-slate-950' : current.id === 'dental' ? 'bg-sky-50' : 'bg-white'}`}>
                        <div key={current.id} className="landing-in h-full pt-9 flex flex-col">
                            <Screen />
                        </div>
                        <div className={`absolute top-0 inset-x-0 h-9 flex items-center justify-between px-6 text-[10px] font-semibold z-10 pointer-events-none ${current.id === 'gimnasio' ? 'text-white' : 'text-slate-900'}`}>
                            <span>9:41</span>
                            <span>5G</span>
                        </div>
                    </div>
                </div>

                {/* Aviso flotante: lo que recibe el dueño */}
                <div key={`n-${current.id}`} className="landing-in hidden sm:flex absolute left-0 top-24 items-center gap-2.5 bg-white rounded-2xl pl-2.5 pr-4 py-2.5 shadow-xl shadow-slate-900/10 ring-1 ring-slate-900/5 max-w-[230px]">
                    <span className={`size-9 rounded-xl flex items-center justify-center shrink-0 ${current.notice.tint}`}>
                        <NoticeIcon size={17} />
                    </span>
                    <span className="min-w-0">
                        <span className="block text-[13px] font-bold text-slate-900 leading-tight">{current.notice.title}</span>
                        <span className="block text-xs text-slate-500 truncate">{current.notice.detail}</span>
                    </span>
                </div>

                {/* Enlace propio del negocio */}
                <div key={`l-${current.id}`} className="landing-in hidden sm:flex absolute right-0 bottom-28 items-center gap-2 bg-slate-900 text-white rounded-2xl px-3.5 py-2.5 shadow-xl shadow-slate-900/20">
                    <Link2 size={15} className="text-sky-300 shrink-0" />
                    <span className="text-[13px] font-semibold">citiox.com/<span className="text-sky-300">{current.slug}</span></span>
                </div>
            </div>

            {/* Selector de tipo de negocio */}
            <div className="w-full -mt-2">
                <p className="text-center text-xs font-semibold text-slate-500 mb-2.5">Mira cómo se ve en tu tipo de negocio</p>
                <div className="flex gap-1.5 overflow-x-auto pb-2 px-1 justify-start sm:justify-center sm:flex-wrap [scrollbar-width:none]" role="tablist" aria-label="Tipos de negocio">
                    {SHOWCASES.map((s, i) => {
                        const Icon = s.icon;
                        const active = i === index;
                        return (
                            <button
                                key={s.id}
                                type="button"
                                role="tab"
                                aria-selected={active}
                                onClick={() => { setIndex(i); setAuto(false); }}
                                className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-semibold transition-all cursor-pointer ${active ? 'bg-slate-900 text-white shadow-md' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-slate-300 hover:text-slate-900'}`}
                            >
                                <Icon size={14} />
                                {s.label}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
