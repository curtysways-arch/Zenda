'use client';

import { useState, useEffect } from 'react';
import { Activity, RefreshCw, Clock, User, ShieldAlert } from 'lucide-react';

interface FamilyAuditTabProps {
    familyId: string;
    familyName: string;
}

export default function FamilyAuditTab({ familyId, familyName }: FamilyAuditTabProps) {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const loadAuditLogs = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/superadmin/familias/${familyId}/audit`);
            if (res.ok) {
                const data = await res.json();
                setLogs(data || []);
            }
        } catch (err) {
            console.error("Error al cargar auditoría:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAuditLogs();
    }, [familyId]);

    return (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-6 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                    <h4 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                        <Activity size={18} className="text-indigo-600" />
                        Historial de Auditoría — {familyName}
                    </h4>
                    <p className="text-xs text-slate-500">
                        Registro inmutable de cambios en planes, capacidades, límites y programa fundador.
                    </p>
                </div>

                <button
                    onClick={loadAuditLogs}
                    disabled={loading}
                    className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 transition-colors cursor-pointer"
                    title="Recargar auditoría"
                >
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                </button>
            </div>

            {loading ? (
                <div className="text-center py-10 text-xs font-bold text-slate-400">
                    Cargando historial de auditoría...
                </div>
            ) : logs.length === 0 ? (
                <div className="text-center py-12 space-y-2">
                    <ShieldAlert size={36} className="mx-auto text-slate-300" />
                    <p className="text-sm font-bold text-slate-600">No hay registros de auditoría para esta familia</p>
                    <p className="text-xs text-slate-400">
                        Cualquier modificación futura de planes o configuración quedará registrada automáticamente aquí.
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {logs.map(log => (
                        <div
                            key={log.id}
                            className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-slate-200 hover:shadow-xs transition-all space-y-1.5"
                        >
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                    <span className="px-2.5 py-0.5 bg-slate-900 text-white rounded-full text-[9px] font-black uppercase tracking-wider">
                                        {log.what}
                                    </span>
                                    <span className="text-xs font-bold text-slate-700">
                                        {log.description || 'Operación registrada'}
                                    </span>
                                </div>
                                <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                                    <Clock size={11} /> {new Date(log.createdAt).toLocaleString()}
                                </span>
                            </div>

                            <div className="flex items-center gap-4 text-[11px] text-slate-500">
                                <span className="flex items-center gap-1">
                                    <User size={12} className="text-slate-400" /> Por: <span className="font-bold text-slate-700">{log.who}</span>
                                </span>
                                <span>Tipo: <span className="font-bold text-slate-700">{log.targetType}</span></span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
