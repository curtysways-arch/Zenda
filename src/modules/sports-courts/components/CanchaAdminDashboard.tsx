'use client';

import React from 'react';
import Link from 'next/link';
import { 
  Rocket, 
  Calendar, 
  DollarSign, 
  Users, 
  TrendingUp, 
  Activity, 
  Clock, 
  Plus, 
  Trophy, 
  Dribbble, 
  Lock, 
  Tag, 
  Mail, 
  Layout, 
  Contact, 
  Settings, 
  Building2, 
  Package, 
  LogOut 
} from 'lucide-react';
import ResourceScheduleGrid from '@/components/admin/ResourceScheduleGrid';

export interface CanchaAdminDashboardProps {
  negocio: any;
  stats?: {
    reservasHoy: number;
    ingresosMes: number;
    totalClientes: number;
    reservasMes: number;
  };
  resources?: any[];
}

export default function CanchaAdminDashboard({
  negocio,
  stats = { reservasHoy: 0, ingresosMes: 0, totalClientes: 0, reservasMes: 0 },
  resources = [
    { id: 'c1', name: 'Cancha 1 (Cristal)', type: 'INFRASTRUCTURE', isAvailable: true, nightFeeApplied: true },
    { id: 'c2', name: 'Cancha 2 (Cristal)', type: 'INFRASTRUCTURE', isAvailable: true, nightFeeApplied: true },
    { id: 'c3', name: 'Cancha 3 (Pared)', type: 'INFRASTRUCTURE', isAvailable: true, nightFeeApplied: false },
  ],
}: CanchaAdminDashboardProps) {
  const isDemo = negocio?.isDemo !== false;

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-900 font-sans pb-32 space-y-10">
      {/* 1. TOP BAR DEMO AMBER (TAL CUAL CAPTURA) */}
      {isDemo && (
        <div className="bg-amber-500 text-slate-950 px-6 py-2.5 flex items-center justify-between gap-4 shadow-md z-[60] relative">
          <div className="flex items-center gap-3 max-w-7xl mx-auto w-full justify-between">
            <div className="flex items-center gap-2">
              <Rocket className="size-5 animate-bounce" />
              <div className="flex flex-col sm:flex-row sm:gap-2">
                <span className="text-xs font-black uppercase tracking-wider italic">
                  MODO DEMO – DATOS DE EJEMPLO
                </span>
                <span className="text-[11px] font-bold text-slate-950/80">
                  ESTÁS EXPLORANDO EL SISTEMA. LAS FUNCIONES DE EDICIÓN ESTÁN LIMITADAS.
                </span>
              </div>
            </div>
            <Link
              href="/register"
              className="bg-white text-slate-950 px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all shadow-lg shrink-0"
            >
              CREAR MI NEGOCIO GRATIS
            </Link>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-8 space-y-12">
        {/* 2. HEADER CON VISTA ESTRATÉGICA Y WHATSAPP ACTIVO */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8 pt-4">
          <div className="space-y-2">
            <span className="text-[11px] font-black text-emerald-600 uppercase tracking-[0.4em] block italic">
              VISTA ESTRATÉGICA
            </span>
            <h1 className="text-5xl sm:text-7xl font-black text-slate-900 tracking-tighter uppercase leading-none italic">
              DASHBOARD
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm font-bold uppercase italic flex items-center gap-2">
              <Activity size={18} className="text-emerald-500" />
              TRÁFICO DE RED OPTIMIZADO. DATOS EN TIEMPO REAL.
            </p>
          </div>

          {/* Badge WhatsApp Activo */}
          <div className="bg-white p-2.5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-3 px-6">
            <div className="relative flex items-center justify-center">
              <div className="size-3 bg-emerald-500 rounded-full animate-ping absolute" />
              <div className="size-3 bg-emerald-500 rounded-full relative" />
            </div>
            <span className="text-[11px] font-black text-slate-800 uppercase tracking-widest italic">
              WHATSAPP ACTIVO
            </span>
          </div>
        </header>

        {/* 3. 4 STAT CARDS CLARAS REDONDEADAS (DISEÑO CANCHA ORIGINAL) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="HOY"
            value={stats.reservasHoy}
            icon={<Calendar size={26} />}
            color="blue"
            change="+12%"
            detail="Turnos"
          />
          <StatCard
            title="RECAUDADO"
            value={`$${stats.ingresosMes.toLocaleString()}`}
            icon={<DollarSign size={26} />}
            color="emerald"
            change="+8.5%"
            detail="Cerrado"
          />
          <StatCard
            title="CLIENTES"
            value={stats.totalClientes}
            icon={<Users size={26} />}
            color="violet"
            change="+20%"
            detail="Fichas"
          />
          <StatCard
            title="RENDIMIENTO"
            value={stats.reservasMes}
            icon={<TrendingUp size={26} />}
            color="orange"
            change="+15%"
            detail="Confirmadas"
          />
        </div>

        {/* 4. AGENDA SEMANAL / CONTROL DE OCUPACIÓN */}
        <div className="bg-white border border-slate-200 rounded-[3rem] p-6 sm:p-10 space-y-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-6 gap-4">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <Calendar className="size-5" />
              </div>
              <div>
                <h2 className="font-black text-slate-900 uppercase tracking-tight text-lg italic">
                  AGENDA SEMANAL
                </h2>
                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest block">
                  CONTROL DE OCUPACIÓN DE CANCHAS
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/admin/canchas/grilla"
                className="px-5 py-2.5 bg-slate-900 hover:bg-black text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md"
              >
                Ver Grilla Completa
              </Link>
            </div>
          </div>

          <ResourceScheduleGrid
            resources={resources}
            appointments={[]}
            selectedDate={new Date().toISOString().split('T')[0]}
            granularityMinutes={90}
            enableNightLightingFee={false}
            onSlotClick={(resourceId, hour) => {
              alert(`Reserva de cancha ${resourceId} a las ${hour}`);
            }}
          />
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color, change, detail }: any) {
  const colors: any = {
    emerald: "bg-emerald-50 border-emerald-100 text-emerald-600",
    blue: "bg-blue-50 border-blue-100 text-blue-600",
    violet: "bg-violet-50 border-violet-100 text-violet-600",
    orange: "bg-orange-50 border-orange-100 text-orange-600",
  };

  return (
    <div className="bg-white border border-slate-200 p-8 sm:p-10 rounded-[3rem] space-y-6 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 group overflow-hidden relative shadow-sm hover:shadow-2xl">
      <div className={`absolute -right-6 -top-6 size-32 rounded-full blur-[60px] opacity-20 transition-all duration-700 group-hover:scale-150 ${colors[color].split(' ')[0]}`} />

      <div className="flex justify-between items-start relative z-10">
        <div className={`p-4 rounded-[1.5rem] border shadow-inner transition-all duration-500 group-hover:scale-110 ${colors[color]}`}>
          {icon}
        </div>
        <div className="text-[10px] font-black px-3.5 py-1.5 rounded-full uppercase tracking-widest border shadow-sm bg-emerald-50 text-emerald-700 border-emerald-100">
          {change}
        </div>
      </div>

      <div className="relative z-10 space-y-2">
        <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em] mb-1 italic leading-none">{title}</p>
        <div className="flex items-baseline gap-2">
          <p className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tighter leading-none italic uppercase">{value}</p>
          <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest leading-none italic">{detail}</span>
        </div>
      </div>
    </div>
  );
}
