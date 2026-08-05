'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import HeroCarousel from '@/components/HeroCarousel';
import { 
  ChevronLeft, 
  Star, 
  Clock, 
  Calendar, 
  CheckCircle2, 
  Zap, 
  ShieldCheck, 
  Share2, 
  Heart,
  Trophy,
  Users,
  Sparkles,
  ChevronRight
} from 'lucide-react';

export interface CanchaDetailViewProps {
  negocio: any;
  cancha: any;
}

export default function CanchaDetailView({ negocio, cancha }: CanchaDetailViewProps) {
  const [selectedDateIndex, setSelectedDateIndex] = useState<number>(2); // Default to Miércoles 5
  const [selectedDuration, setSelectedDuration] = useState<string>('1h');
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  const defaultBanner = 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&q=80&w=1200';
  const images = (cancha.imagenes && cancha.imagenes.length > 0)
    ? cancha.imagenes.map((img: any) => img.url)
    : [cancha.imageUrl || defaultBanner];

  const canchaTipo = cancha.tipo || 'FÚTBOL 7';
  const precioDisplay = cancha.precio || cancha.precioHora || negocio.precioHora || 25;

  const dateItems = [
    { day: 'LUN', num: '3' },
    { day: 'MAR', num: '4' },
    { day: 'MIÉ', num: '5' },
    { day: 'JUE', num: '6' },
    { day: 'VIE', num: '7' },
    { day: 'SÁB', num: '8' },
    { day: 'DOM', num: '9' },
  ];

  const durations = ['1h', '1.5h', '2h', '2.5h', '3h'];

  const availableSlots = [
    { time: '08:00', status: 'PASADO', disabled: true },
    { time: '09:00', status: 'PASADO', disabled: true },
    { time: '10:00', status: 'PASADO', disabled: true },
    { time: '11:00', status: 'PASADO', disabled: true },
    { time: '12:00', status: 'PASADO', disabled: true },
    { time: '13:00', status: 'PASADO', disabled: true },
    { time: '14:00', status: 'LIBRE', disabled: false },
    { time: '15:00', status: 'LIBRE', disabled: false },
    { time: '16:00', status: 'LIBRE', disabled: false },
  ];

  return (
    <div className="min-h-screen bg-[#0a0f1d] text-white font-sans pb-32">
      {/* Header Sticky Native Style */}
      <header className="sticky top-0 z-50 h-16 bg-[#0a0f1d]/90 backdrop-blur-xl border-b border-white/5 flex items-center px-6">
        <div className="max-w-3xl mx-auto w-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href={`/${negocio.slug}`}
              className="size-10 rounded-full bg-slate-900 flex items-center justify-center text-slate-300 hover:text-white transition-all border border-slate-800"
            >
              <ChevronLeft className="size-5" />
            </Link>
            <div>
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block leading-none">
                {negocio.nombre || 'CANCHA LOS CAMPEONES'}
              </span>
              <h1 className="font-black text-sm text-white uppercase italic tracking-tight leading-none mt-1">
                {cancha.nombre || 'CANCHA ELITE'}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button className="p-2 text-slate-400 hover:text-white rounded-full bg-slate-900 border border-slate-800">
              <Share2 className="size-4" />
            </button>
            <button className="p-2 text-slate-400 hover:text-rose-400 rounded-full bg-slate-900 border border-slate-800">
              <Heart className="size-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Carousel de Fotos */}
        <div className="relative aspect-[16/10] rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/10 bg-slate-950">
          <HeroCarousel images={images} opacityActive="opacity-100" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-black/30" />

          {/* Badge Disponible top-left */}
          <div className="absolute top-4 left-4 z-20">
            <span className="px-3.5 py-1.5 bg-emerald-500/20 backdrop-blur-md rounded-full border border-emerald-500/40 text-[10px] font-black uppercase tracking-widest text-emerald-400">
              ● DISPONIBLE
            </span>
          </div>

          {/* Badge Tipo Cancha bottom-left */}
          <div className="absolute bottom-4 left-4 z-20">
            <span className="px-4 py-2 bg-slate-900/90 backdrop-blur-md rounded-xl text-xs font-black uppercase tracking-widest text-emerald-400 border border-slate-800">
              {canchaTipo}
            </span>
          </div>
        </div>

        {/* 3 Tarjetas de Resumen (Precio, Capacidad, Horario de Atención) */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 space-y-1">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">PRECIO HORA</span>
              <span className="text-3xl font-black text-white">${Number(precioDisplay).toLocaleString()}</span>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 space-y-1">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">CAPACIDAD</span>
              <div className="flex items-center gap-2 text-white text-xl font-black">
                <Users className="size-5 text-emerald-400" />
                <span>10 JUG.</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-2xl border border-emerald-500/20">
                <Clock className="size-5" />
              </div>
              <div>
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">HORARIO DE ATENCIÓN</span>
                <span className="text-sm font-bold text-white">08:00 - 23:00</span>
              </div>
            </div>
            <span className="px-3 py-1 bg-emerald-950/80 border border-emerald-800/80 text-emerald-400 text-[10px] font-black rounded-full uppercase tracking-wider">
              ABIERTO AHORA
            </span>
          </div>
        </div>

        {/* ESPECIFICACIONES */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">ESPECIFICACIONES</span>
            <Sparkles className="size-4 text-emerald-400" />
          </div>

          <div className="space-y-2">
            <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-2xl flex items-center gap-3">
              <div className="p-2 bg-slate-800 text-amber-400 rounded-xl">
                <Trophy className="size-5" />
              </div>
              <div>
                <h4 className="text-xs font-black text-white italic uppercase">SINTÉTICO PREMIUM PRO</h4>
                <p className="text-[10px] text-slate-400 font-medium">Certificado FIFA Quality</p>
              </div>
            </div>

            <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-2xl flex items-center gap-3">
              <div className="p-2 bg-slate-800 text-emerald-400 rounded-xl">
                <Zap className="size-5" />
              </div>
              <div>
                <h4 className="text-xs font-black text-white italic uppercase">ILUMINACIÓN LED 4K</h4>
                <p className="text-[10px] text-slate-400 font-medium">Cero sombras en juego nocturno</p>
              </div>
            </div>
          </div>
        </div>

        {/* FECHA DE JUEGO */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-white">FECHA DE JUEGO</span>
            <div className="flex items-center gap-1 text-slate-400">
              <button className="p-1 hover:text-white"><ChevronLeft size={16} /></button>
              <button className="p-1 hover:text-white"><ChevronRight size={16} /></button>
            </div>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {dateItems.map((item, idx) => {
              const isSelected = selectedDateIndex === idx;
              return (
                <button
                  key={idx}
                  onClick={() => setSelectedDateIndex(idx)}
                  className={`shrink-0 w-14 py-3 rounded-2xl flex flex-col items-center justify-center transition-all border ${
                    isSelected 
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-black shadow-lg shadow-emerald-500/20' 
                      : 'bg-slate-950/80 text-slate-400 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <span className="text-[9px] font-black uppercase tracking-wider">{item.day}</span>
                  <span className="text-lg font-black leading-none mt-1">{item.num}</span>
                </button>
              );
            })}
          </div>

          {/* TIEMPO DE JUEGO */}
          <div className="space-y-3 pt-4 border-t border-slate-800">
            <span className="text-xs font-black uppercase tracking-wider text-white block">TIEMPO DE JUEGO</span>
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              {durations.map((dur) => {
                const isSel = selectedDuration === dur;
                return (
                  <button
                    key={dur}
                    onClick={() => setSelectedDuration(dur)}
                    className={`px-5 py-2.5 rounded-2xl font-black text-xs transition-all border ${
                      isSel 
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400' 
                        : 'bg-slate-950/80 text-slate-300 border-slate-800'
                    }`}
                  >
                    {dur}
                  </button>
                );
              })}
            </div>
          </div>

          {/* HORARIOS DISPONIBLES */}
          <div className="space-y-3 pt-4 border-t border-slate-800">
            <span className="text-xs font-black uppercase tracking-wider text-white block">HORARIOS DISPONIBLES</span>
            <div className="grid grid-cols-3 gap-2.5">
              {availableSlots.map((slot) => {
                const isSelected = selectedSlot === slot.time;
                return (
                  <button
                    key={slot.time}
                    disabled={slot.disabled}
                    onClick={() => setSelectedSlot(slot.time)}
                    className={`py-3 px-2 rounded-2xl font-mono text-xs font-bold text-center flex flex-col items-center justify-center transition-all border ${
                      slot.disabled
                        ? 'bg-slate-950/40 text-slate-600 border-slate-800/50 cursor-not-allowed opacity-50'
                        : isSelected
                          ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-black shadow-lg shadow-emerald-500/20'
                          : 'bg-slate-950/90 text-slate-200 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <span className="text-sm font-black">{slot.time}</span>
                    <span className="text-[8px] font-mono tracking-widest uppercase mt-0.5">{slot.status}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* CTA FINAL */}
        <button
          onClick={() => {
            if (!selectedSlot) return alert("Por favor selecciona una hora disponible.");
            alert(`¡Turno reservado para el ${dateItems[selectedDateIndex].day} ${dateItems[selectedDateIndex].num} a las ${selectedSlot} (${selectedDuration})!`);
          }}
          disabled={!selectedSlot}
          className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl ${
            selectedSlot
              ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 cursor-pointer shadow-emerald-500/20'
              : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
          }`}
        >
          {selectedSlot ? `Reservar ${selectedSlot} (${selectedDuration})` : 'Selecciona un Horario'}
        </button>
      </main>
    </div>
  );
}
