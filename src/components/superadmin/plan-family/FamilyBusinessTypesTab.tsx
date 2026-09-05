'use client';

import { Layers, Store, ArrowUpRight, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

interface FamilyBusinessTypesTabProps {
    familyId: string;
    familyName: string;
    familyCode: string;
    businessTypes?: { id: string; name: string; slug: string }[];
}

export default function FamilyBusinessTypesTab({
    familyId,
    familyName,
    familyCode,
    businessTypes = []
}: FamilyBusinessTypesTabProps) {
    return (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                    <h4 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                        <Layers size={18} className="text-indigo-600" />
                        Tipos de Negocio Asociados ({businessTypes.length})
                    </h4>
                    <p className="text-xs text-slate-500">
                        Los negocios con estos tipos heredan automáticamente los planes y reglas de la familia <span className="font-bold text-slate-700">{familyName}</span>.
                    </p>
                </div>

                <Link
                    href="/superadmin/tipos-negocio"
                    className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 self-start sm:self-auto"
                >
                    Gestionar Tipos de Negocio <ArrowUpRight size={14} />
                </Link>
            </div>

            {businessTypes.length === 0 ? (
                <div className="text-center py-12 space-y-2">
                    <Store size={36} className="mx-auto text-slate-300" />
                    <p className="text-sm font-bold text-slate-600">No hay tipos de negocio asociados a esta familia</p>
                    <p className="text-xs text-slate-400">
                        Vincula tipos de negocio en el módulo de Tipos de Negocio para que apunten a esta familia.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {businessTypes.map((bt) => (
                        <div
                            key={bt.id}
                            className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-indigo-200 hover:shadow-md transition-all flex items-center justify-between"
                        >
                            <div className="space-y-0.5">
                                <span className="text-xs font-black text-slate-900 block">{bt.name}</span>
                                <span className="text-[11px] font-mono text-slate-400 block">{bt.slug}</span>
                            </div>
                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full text-[9px] font-black uppercase tracking-wider flex items-center gap-1">
                                <CheckCircle2 size={10} /> Vinculado
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
