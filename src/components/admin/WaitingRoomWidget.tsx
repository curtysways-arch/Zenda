'use client';

import { useState, useEffect, useCallback } from 'react';
import { Clock, Play, UserX, Loader2, Users, ChevronRight } from 'lucide-react';

interface WaitingClient {
    id: string;
    clienteNombre: string;
    clienteTelefono: string;
    servicio: string;
    horaInicio: string;
    especialista: string | null;
    especialistaAvatar: string | null;
    checkedInAt: string;
    minutosEsperando: number;
}

interface WaitingRoomWidgetProps {
    primaryColor: string;
}

export default function WaitingRoomWidget({ primaryColor }: WaitingRoomWidgetProps) {
    const [clients, setClients] = useState<WaitingClient[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const fetchWaiting = useCallback(async () => {
        try {
            const res = await fetch('/api/appointments/waiting');
            if (res.ok) setClients(await res.json());
        } catch { /* silent */ } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchWaiting();
        const interval = setInterval(fetchWaiting, 30_000); // refrescar cada 30s
        return () => clearInterval(interval);
    }, [fetchWaiting]);

    const changeStatus = async (id: string, estado: string) => {
        setActionLoading(id + estado);
        try {
            const res = await fetch(`/api/appointments/${id}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ estado }),
            });
            if (res.ok) {
                setClients(prev => prev.filter(c => c.id !== id));
            }
        } catch { /* silent */ } finally {
            setActionLoading(null);
        }
    };

    if (loading) return null;

    return (
        <section className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <div
                            className="h-4 w-1 rounded-full"
                            style={{ backgroundColor: primaryColor }}
                        />
                        {clients.length > 0 && (
                            <div
                                className="h-4 w-1 rounded-full absolute inset-0 animate-ping opacity-50"
                                style={{ backgroundColor: primaryColor }}
                            />
                        )}
                    </div>
                    <h2 className="text-[11px] font-black uppercase tracking-widest text-slate-900 italic">
                        Sala de Espera
                    </h2>
                    {clients.length > 0 && (
                        <span
                            className="text-[10px] font-black text-white px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: primaryColor }}
                        >
                            {clients.length}
                        </span>
                    )}
                </div>
            </div>

            {clients.length === 0 ? (
                <div className="bg-white/50 border border-dashed border-slate-200 rounded-[2rem] p-8 text-center">
                    <div className="size-12 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto mb-3 text-slate-300">
                        <Users size={24} />
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Sin clientes en espera</p>
                </div>
            ) : (
                <div className="space-y-3">
                {clients.map(client => (
                    <div
                        key={client.id}
                        className="bg-white rounded-[1.75rem] border shadow-lg overflow-hidden animate-in slide-in-from-top-2 duration-500"
                        style={{ borderColor: `${primaryColor}30` }}
                    >
                        {/* Franja de color superior */}
                        <div
                            className="h-1 w-full"
                            style={{ backgroundColor: primaryColor }}
                        />

                        <div className="p-5 space-y-4">
                            {/* Info cliente */}
                            <div className="flex items-start gap-3">
                                <div
                                    className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 text-white font-black text-sm"
                                    style={{ backgroundColor: `${primaryColor}20`, color: primaryColor }}
                                >
                                    {client.clienteNombre.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-black text-slate-900 text-[15px] uppercase tracking-tight leading-none truncate">
                                        {client.clienteNombre}
                                    </p>
                                    <p className="text-[12px] font-bold text-slate-500 mt-1 truncate">{client.servicio}</p>
                                    {client.especialista && (
                                        <p className="text-[11px] font-bold text-slate-400">c/ {client.especialista}</p>
                                    )}
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-wide">
                                        {client.horaInicio}
                                    </p>
                                    <div className="flex items-center gap-1 mt-1 justify-end">
                                        <Clock size={10} className="text-amber-500" />
                                        <span className="text-[10px] font-black text-amber-600">
                                            {client.minutosEsperando}m esperando
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Botones de acción */}
                            <div className="flex gap-2">
                                <button
                                    onClick={() => changeStatus(client.id, 'in_progress')}
                                    disabled={actionLoading === client.id + 'in_progress'}
                                    className="flex-1 h-11 rounded-2xl text-white font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-60"
                                    style={{ backgroundColor: primaryColor }}
                                >
                                    {actionLoading === client.id + 'in_progress' ? (
                                        <Loader2 size={16} className="animate-spin" />
                                    ) : (
                                        <><Play size={14} fill="white" /> Iniciar</>
                                    )}
                                </button>
                                <button
                                    onClick={() => changeStatus(client.id, 'no_show')}
                                    disabled={actionLoading === client.id + 'no_show'}
                                    className="h-11 px-4 rounded-2xl bg-slate-100 text-slate-500 font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-60 hover:bg-red-50 hover:text-red-500"
                                >
                                    {actionLoading === client.id + 'no_show' ? (
                                        <Loader2 size={16} className="animate-spin" />
                                    ) : (
                                        <UserX size={16} />
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            )}

            {/* Recordatorio si alguno lleva más de 20 min */}
            {clients.some(c => c.minutosEsperando >= 20) && (
                <div
                    className="flex items-center gap-3 p-4 rounded-2xl border animate-pulse"
                    style={{
                        backgroundColor: `${primaryColor}10`,
                        borderColor: `${primaryColor}30`,
                    }}
                >
                    <span className="text-xl">⚠️</span>
                    <p className="text-[11px] font-black uppercase tracking-wide" style={{ color: primaryColor }}>
                        Hay clientes esperando hace más de 20 min
                    </p>
                </div>
            )}
        </section>
    );
}
