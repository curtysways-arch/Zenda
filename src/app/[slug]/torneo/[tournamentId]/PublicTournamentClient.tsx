'use client';

import { useState } from 'react';
import { Users, Calendar, Table as TableIcon, Trophy, ShieldAlert, Check } from 'lucide-react';
import { clsx } from 'clsx';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export function PublicTournamentClient({ torneo }: { torneo: any }) {
    const [activeTab, setActiveTab] = useState<'equipos' | 'calendario' | 'posiciones'>('posiciones');

    const tabs = [
        { id: 'posiciones', label: 'Tabla', icon: TableIcon },
        { id: 'calendario', label: 'Fixture', icon: Calendar },
        { id: 'equipos', label: 'Equipos', icon: Users },
    ];

    return (
        <div className="bg-white rounded-[2.5rem] shadow-xl shadow-black/5 p-4 md:p-8 space-y-8">
            {/* Nav Tabs */}
            <div className="flex justify-center -mt-12 mb-8">
                <div className="bg-white p-2 rounded-2xl shadow-lg shadow-black/5 border border-gray-100 flex gap-1 md:gap-2 overflow-x-auto max-w-full">
                    {tabs.map(tab => {
                        const active = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={clsx(
                                    "flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all whitespace-nowrap",
                                    active ? "bg-emerald-50 text-emerald-700 shadow-sm" : "text-gray-500 hover:text-gray-900 hover:bg-gray-50/50"
                                )}
                            >
                                <tab.icon size={18} className={clsx(active && "text-emerald-600")} />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="min-h-[400px]">
                {/* TABLA DE POSICIONES */}
                {activeTab === 'posiciones' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {torneo.formato !== 'round_robin' ? (
                            <div className="text-center py-20 bg-gray-50 rounded-3xl border border-gray-100 border-dashed">
                                <Trophy size={48} className="mx-auto text-gray-300 mb-4" />
                                <h3 className="text-xl font-bold text-gray-800 mb-2">Formato de Eliminatorias</h3>
                                <p className="text-gray-500">Este torneo se juega bajo eliminación directa. Revisa el Fixture para ver las llaves.</p>
                            </div>
                        ) : torneo.standings.length === 0 ? (
                            <EmptyState icon={TableIcon} message="La tabla de posiciones aún no está disponible." />
                        ) : (
                            <div className="overflow-x-auto rounded-3xl border border-gray-100 shadow-sm">
                                <table className="w-full text-left font-medium whitespace-nowrap">
                                    <thead className="bg-gray-50 border-b border-gray-100 uppercase text-[10px] text-gray-400 font-black tracking-widest">
                                        <tr>
                                            <th className="px-6 py-5 text-center w-12">#</th>
                                            <th className="px-6 py-5">Equipo</th>
                                            <th className="px-4 py-5 text-center text-gray-500" title="Partidos Jugados">PJ</th>
                                            <th className="px-4 py-5 text-center text-emerald-600" title="Ganados">G</th>
                                            <th className="px-4 py-5 text-center text-gray-400" title="Empatados">E</th>
                                            <th className="px-4 py-5 text-center text-red-400" title="Perdidos">P</th>
                                            <th className="px-4 py-5 text-center" title="Goles a Favor">GF</th>
                                            <th className="px-4 py-5 text-center" title="Goles en Contra">GC</th>
                                            <th className="px-4 py-5 text-center" title="Diferencia de Goles">DG</th>
                                            <th className="px-6 py-5 text-center text-emerald-700 font-black bg-emerald-50">PTS</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {torneo.standings.map((s: any, i: number) => {
                                            const diff = s.golesFavor - s.golesContra;
                                            return (
                                                <tr key={s.id} className="hover:bg-gray-50/50 transition duration-300">
                                                    <td className={clsx("px-6 py-5 text-center font-black", i === 0 ? "text-emerald-500 text-lg" : "text-gray-400")}>
                                                        {i === 0 ? <Trophy size={20} className="mx-auto" /> : i + 1}
                                                    </td>
                                                    <td className="px-6 py-5 font-bold text-gray-900 flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center border border-gray-200 shadow-sm text-xs text-gray-400 font-black uppercase overflow-hidden">
                                                            {s.team.logoUrl ? <img src={s.team.logoUrl} alt={s.team.nombre} /> : s.team.nombre.substring(0, 2)}
                                                        </div>
                                                        {s.team.nombre}
                                                    </td>
                                                    <td className="px-4 py-5 text-center text-gray-600">{s.partidosJugados}</td>
                                                    <td className="px-4 py-5 text-center font-bold text-emerald-600">{s.ganados}</td>
                                                    <td className="px-4 py-5 text-center font-bold text-gray-400">{s.empatados}</td>
                                                    <td className="px-4 py-5 text-center font-bold text-red-500">{s.perdidos}</td>
                                                    <td className="px-4 py-5 text-center text-gray-500">{s.golesFavor}</td>
                                                    <td className="px-4 py-5 text-center text-gray-500">{s.golesContra}</td>
                                                    <td className={clsx("px-4 py-5 text-center font-bold flex justify-center", diff > 0 ? "text-emerald-500" : diff < 0 ? "text-red-500" : "text-gray-400")}>
                                                        <span className="bg-gray-50 px-2 py-0.5 rounded-md min-w-[2rem] text-center inline-block">{diff > 0 ? `+${diff}` : diff}</span>
                                                    </td>
                                                    <td className="px-6 py-5 text-center text-xl font-black text-emerald-700 bg-emerald-50/50">{s.puntos}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* FIXTURE (CALENDARIO) */}
                {activeTab === 'calendario' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
                        {torneo.matches.length === 0 ? (
                            <EmptyState icon={Calendar} message="El calendario de partidos aún no ha sido publicado." />
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
                                {torneo.matches.map((m: any) => {
                                    const isPlayed = m.estado === 'jugado';
                                    const aWinner = isPlayed && (m.scoreA > m.scoreB);
                                    const bWinner = isPlayed && (m.scoreB > m.scoreA);
                                    return (
                                        <div key={m.id} className="bg-white border-2 border-gray-100 hover:border-emerald-100 rounded-[2rem] p-6 shadow-sm hover:shadow-xl hover:shadow-emerald-50/50 transition duration-300 group flex flex-col justify-center">
                                            <div className="flex justify-between items-center mb-6">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400">
                                                        <Calendar size={14} />
                                                    </div>
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Ronda {m.round}</span>
                                                </div>
                                                <span className={clsx(
                                                    "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-sm",
                                                    isPlayed ? "bg-gray-900 text-white" : "bg-emerald-50 text-emerald-600 border border-emerald-100/50"
                                                )}>
                                                    {isPlayed ? <><Check size={12} strokeWidth={4} /> Finalizado</> : 'Pendiente'}
                                                </span>
                                            </div>

                                            <div className="space-y-3 relative">
                                                <TeamRow name={m.teamA?.nombre} score={m.scoreA} isWinner={aWinner} isPlayed={isPlayed} logo={m.teamA?.logoUrl} />
                                                <div className="absolute inset-y-0 right-[3.25rem] w-px bg-gray-100 hidden sm:block"></div>
                                                <TeamRow name={m.teamB?.nombre} score={m.scoreB} isWinner={bWinner} isPlayed={isPlayed} logo={m.teamB?.logoUrl} />
                                            </div>

                                            {m.fecha && (
                                                <div className="mt-6 pt-4 border-t border-gray-50 text-center text-xs text-gray-400 font-bold uppercase tracking-widest">
                                                    {format(new Date(m.fecha), "d MMM, yyyy", { locale: es })}
                                                    {m.horaInicio && ` • ${m.horaInicio}`}
                                                    {m.cancha && ` • ${m.cancha}`}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* EQUIPOS */}
                {activeTab === 'equipos' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {torneo.teams.length === 0 ? (
                            <EmptyState icon={Users} message="Aún no hay equipos registrados en el torneo." />
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                                {torneo.teams.map((t: any) => (
                                    <div key={t.id} className="bg-white border-2 border-gray-100 rounded-[2rem] p-6 text-center hover:shadow-xl hover:shadow-emerald-50/50 hover:border-emerald-100 transition duration-300 group">
                                        <div className="w-20 h-20 mx-auto bg-gray-50 border-4 border-white shadow-xl shadow-black/5 rounded-full mb-4 flex items-center justify-center text-gray-300 group-hover:-translate-y-2 group-hover:scale-105 transition duration-500 overflow-hidden relative">
                                            {t.logoUrl ? (
                                                <img src={t.logoUrl} alt={t.nombre} className="w-full h-full object-cover" />
                                            ) : (
                                                <ShieldAlert size={36} className="text-gray-200" />
                                            )}
                                        </div>
                                        <h4 className="font-black text-gray-900 text-lg group-hover:text-emerald-600 transition truncate px-2">{t.nombre}</h4>
                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-2 bg-gray-50 inline-block px-3 py-1 rounded-full">Inscrito</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

function EmptyState({ icon: Icon, message }: { icon: any, message: string }) {
    return (
        <div className="py-24 text-center bg-gray-50/50 rounded-3xl border border-gray-100 border-dashed">
            <div className="w-20 h-20 bg-white shadow-xl shadow-black/5 rounded-3xl flex items-center justify-center mx-auto mb-6 transform -rotate-3 hover:rotate-0 transition duration-300">
                <Icon size={32} className="text-gray-300" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Sección Vacía</h3>
            <p className="text-gray-500 max-w-sm mx-auto">{message}</p>
        </div>
    );
}

function TeamRow({ name, score, isWinner, isPlayed, logo }: any) {
    if (!name) name = 'Bye (Avanza Directo)';

    return (
        <div className="flex justify-between items-center group relative p-3 rounded-2xl hover:bg-gray-50 transition">
            <div className="flex items-center gap-3 w-3/4">
                <div className={clsx("w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black border uppercase shadow-sm overflow-hidden", isWinner ? "bg-emerald-50 border-emerald-200 text-emerald-600" : "bg-white border-gray-100 text-gray-400")}>
                    {logo ? <img src={logo} alt={name} className="w-full h-full object-cover" /> : name.substring(0, 2)}
                </div>
                <span className={clsx("font-extrabold truncate", isPlayed && !isWinner ? "text-gray-400" : "text-gray-900", isWinner && "text-emerald-700")}>
                    {name}
                </span>
            </div>
            <div className={clsx(
                "w-14 h-10 rounded-xl flex items-center justify-center font-black text-xl z-10 transition-colors shadow-sm",
                isWinner ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            )}>
                {score ?? '-'}
            </div>
        </div>
    );
}
