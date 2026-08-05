'use client';

import React, { useState } from 'react';
import PublicTournamentViewer from '@/modules/sports-courts/components/PublicTournamentViewer';
import { Trophy, Plus, Swords, Calendar } from 'lucide-react';

export default function TorneosPage() {
  const [demoTorneo, setDemoTorneo] = useState({
    id: 'torneo-padel-2026',
    nombre: '🏆 Torneo Apertura Pádel Citiox 2026',
    formato: 'round_robin' as const,
    categoria: 'Pádel 2da Categoría',
    standings: [
      { id: 't1', nombre: 'Los Galácticos (Carlos & Juan)', partidosJugados: 5, ganados: 4, empatados: 1, perdidos: 0, golesFavor: 12, golesContra: 4, puntos: 13 },
      { id: 't2', nombre: 'Pádel Kings (Mateo & Luis)', partidosJugados: 5, ganados: 3, empatados: 1, perdidos: 1, golesFavor: 10, golesContra: 6, puntos: 10 },
      { id: 't3', nombre: 'Smash Masters (Andrés & Diego)', partidosJugados: 5, ganados: 2, empatados: 0, perdidos: 3, golesFavor: 7, golesContra: 9, puntos: 6 },
      { id: 't4', nombre: 'Víbora Team (Santiago & Camilo)', partidosJugados: 5, ganados: 0, empatados: 0, perdidos: 5, golesFavor: 3, golesContra: 13, puntos: 0 },
    ],
    fixture: [
      { id: 'm1', equipoLocal: 'Los Galácticos', equipoVisitante: 'Pádel Kings', marcadorLocal: 2, marcadorVisitante: 1, fecha: '2026-07-28 19:00', cancha: 'Cancha 1 (Cristal)', estado: 'FINALIZADO' as const },
      { id: 'm2', equipoLocal: 'Smash Masters', equipoVisitante: 'Víbora Team', marcadorLocal: 2, marcadorVisitante: 0, fecha: '2026-07-29 20:00', cancha: 'Cancha 2 (Cristal)', estado: 'FINALIZADO' as const },
      { id: 'm3', equipoLocal: 'Los Galácticos', equipoVisitante: 'Smash Masters', fecha: '2026-08-01 18:00', cancha: 'Cancha 1 (Cristal)', estado: 'PENDIENTE' as const },
    ],
  });

  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Encabezado */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-8 rounded-3xl shadow-sm">
        <div className="flex items-center gap-4">
          <div className="size-14 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
            <Trophy className="size-7" />
          </div>
          <div>
            <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest bg-amber-500/10 px-2.5 py-0.5 rounded-full">
              Módulo SPORTS_COURTS
            </span>
            <h1 className="text-xl sm:text-3xl font-black text-slate-900 dark:text-white italic tracking-tight mt-1">
              Torneos & Ligas Deportivas
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Gestión de tablas de posiciones, fixtures, llaves y resultados de partidos.
            </p>
          </div>
        </div>

        <button
          onClick={() => alert("🏆 Crear nuevo torneo deportivo")}
          className="px-5 py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-amber-500/20 flex items-center gap-2"
        >
          <Plus className="size-4" />
          Crear Nuevo Torneo
        </button>
      </div>

      {/* Visualizador de Torneo */}
      <PublicTournamentViewer torneo={demoTorneo} />
    </div>
  );
}
