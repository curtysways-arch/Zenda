'use client';

import React, { useState } from 'react';
import { Users, Calendar, Table as TableIcon, Trophy, ShieldAlert, Check, Swords } from 'lucide-react';

export interface StandingTeam {
  id: string;
  nombre: string;
  logoUrl?: string;
  partidosJugados: number;
  ganados: number;
  empatados: number;
  perdidos: number;
  golesFavor: number;
  golesContra: number;
  puntos: number;
}

export interface FixtureMatch {
  id: string;
  equipoLocal: string;
  equipoVisitante: string;
  marcadorLocal?: number;
  marcadorVisitante?: number;
  fecha: string;
  cancha?: string;
  estado: 'PENDIENTE' | 'EN_CURSO' | 'FINALIZADO';
}

export interface PublicTournamentViewerProps {
  torneo: {
    id: string;
    nombre: string;
    formato: 'round_robin' | 'eliminatoria';
    categoria?: string;
    standings: StandingTeam[];
    fixture: FixtureMatch[];
  };
}

export default function PublicTournamentViewer({ torneo }: PublicTournamentViewerProps) {
  const [activeTab, setActiveTab] = useState<'posiciones' | 'fixture'>('posiciones');

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
      {/* Header del Torneo */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-6">
        <div className="flex items-center gap-4">
          <div className="size-14 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold shadow-sm">
            <Trophy className="size-8" />
          </div>
          <div>
            <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest bg-amber-500/10 px-2.5 py-0.5 rounded-full">
              {torneo.categoria || 'Torneo de Canchas'}
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
              {torneo.nombre}
            </h2>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl">
          <button
            onClick={() => setActiveTab('posiciones')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all ${
              activeTab === 'posiciones'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
            }`}
          >
            <TableIcon className="size-4" />
            Tabla de Posiciones
          </button>
          <button
            onClick={() => setActiveTab('fixture')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all ${
              activeTab === 'fixture'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
            }`}
          >
            <Swords className="size-4" />
            Fixture & Partidos
          </button>
        </div>
      </div>

      {/* Contenido de Tabs */}
      {activeTab === 'posiciones' ? (
        <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-800">
          <table className="w-full text-left text-xs font-semibold whitespace-nowrap">
            <thead className="bg-slate-50 dark:bg-slate-800/60 uppercase text-[10px] text-slate-400 font-black tracking-widest border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-4 py-4 text-center">#</th>
                <th className="px-6 py-4">Equipo / Pareja</th>
                <th className="px-4 py-4 text-center">PJ</th>
                <th className="px-4 py-4 text-center text-emerald-600">G</th>
                <th className="px-4 py-4 text-center text-slate-400">E</th>
                <th className="px-4 py-4 text-center text-rose-500">P</th>
                <th className="px-4 py-4 text-center">GF</th>
                <th className="px-4 py-4 text-center">GC</th>
                <th className="px-4 py-4 text-center">DG</th>
                <th className="px-6 py-4 text-center text-amber-600 dark:text-amber-400 font-black bg-amber-500/10">PTS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {torneo.standings.map((s, idx) => {
                const diff = s.golesFavor - s.golesContra;
                return (
                  <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-4 text-center font-black">
                      {idx === 0 ? <Trophy className="size-4 text-amber-500 mx-auto" /> : idx + 1}
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-900 dark:text-white flex items-center gap-3">
                      <div className="size-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-black text-[10px] uppercase text-slate-600 dark:text-slate-300">
                        {s.nombre.substring(0, 2)}
                      </div>
                      {s.nombre}
                    </td>
                    <td className="px-4 py-4 text-center text-slate-500">{s.partidosJugados}</td>
                    <td className="px-4 py-4 text-center font-bold text-emerald-600">{s.ganados}</td>
                    <td className="px-4 py-4 text-center font-bold text-slate-400">{s.empatados}</td>
                    <td className="px-4 py-4 text-center font-bold text-rose-500">{s.perdidos}</td>
                    <td className="px-4 py-4 text-center text-slate-500">{s.golesFavor}</td>
                    <td className="px-4 py-4 text-center text-slate-500">{s.golesContra}</td>
                    <td className={`px-4 py-4 text-center font-bold ${diff > 0 ? 'text-emerald-500' : diff < 0 ? 'text-rose-500' : 'text-slate-400'}`}>
                      {diff > 0 ? `+${diff}` : diff}
                    </td>
                    <td className="px-6 py-4 text-center font-black text-amber-600 dark:text-amber-400 bg-amber-500/5">
                      {s.puntos}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="space-y-4">
          {torneo.fixture.map((match) => (
            <div
              key={match.id}
              className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex flex-wrap items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3 text-xs font-bold text-slate-500">
                <Calendar className="size-4 text-slate-400" />
                <span>{match.fecha}</span>
                {match.cancha && <span className="bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded-full text-[10px] uppercase text-slate-700 dark:text-slate-300">{match.cancha}</span>}
              </div>

              {/* Marcador */}
              <div className="flex items-center gap-6 text-sm font-black text-slate-900 dark:text-white">
                <span className="w-32 text-right">{match.equipoLocal}</span>
                <div className="px-4 py-1.5 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-mono font-bold tracking-widest shadow-sm">
                  {match.marcadorLocal !== undefined ? `${match.marcadorLocal} - ${match.marcadorVisitante}` : 'VS'}
                </div>
                <span className="w-32 text-left">{match.equipoVisitante}</span>
              </div>

              <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${
                match.estado === 'FINALIZADO' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'
              }`}>
                {match.estado}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
