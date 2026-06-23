'use client';

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Banknote, Landmark, Loader2 } from "lucide-react";
import SuperAdminBillingClient from "./SuperAdminBillingClient";
import SuperAdminCuentasClient from "./SuperAdminCuentasClient";

export default function SuperAdminPagosPage() {
    const { data: session, status } = useSession();
    const [activeTab, setActiveTab] = useState<'VERIFICAR' | 'CUENTAS'>('VERIFICAR');
    
    const [pendingPayments, setPendingPayments] = useState<any[]>([]);
    const [plansMap, setPlansMap] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (status === "unauthenticated") {
            redirect('/');
        }
    }, [status]);

    const fetchData = async () => {
        if (status !== "authenticated") return;
        setLoading(true);
        try {
            // Cargar planes
            const resPlanes = await fetch('/api/admin/setup-demo-creds'); // Endpoint de utilidad o similar, o simplemente hacer fetch de planes si hay API
            // Haremos fetch de pagos pendientes directamente de la API de superadmin que cuenta pagos
            const resPagos = await fetch('/api/superadmin/solicitudes/count'); // Usamos el endpoint para no duplicar consultas si existe, o cargamos los datos directos
            
            // Para simplificar y hacerlo 100% robusto y asíncrono, cargaremos los pagos pendientes desde una API de superadmin de pagos
            const resPending = await fetch('/api/superadmin/pagos/pending');
            if (resPending.ok) {
                const data = await resPending.json();
                setPendingPayments(data.payments || []);
                setPlansMap(data.plansMap || {});
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [status]);

    if (status === "loading" || loading) {
        return (
            <div className="flex items-center justify-center p-24">
                <Loader2 size={36} className="animate-spin text-cyan-500" />
            </div>
        );
    }

    if (!session || !['SUPERADMIN', 'SUPER_ADMIN', 'ADMIN'].includes((session.user as any).role)) {
        redirect('/');
        return null;
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 dark:border-white/5 pb-6 gap-6">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight uppercase italic flex items-center gap-2">
                            <Banknote className="text-cyan-500" size={32} />
                            Módulo de Pagos
                        </h2>
                        {pendingPayments.length > 0 && (
                            <div className="px-3 py-1 bg-amber-500 text-white rounded-full text-xs font-black animate-pulse">
                                {pendingPayments.length} Pendientes
                            </div>
                        )}
                    </div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                        Administración centralizada de cobros, cuentas bancarias de recepción y auditoría de comprobantes.
                    </p>
                </div>

                {/* Tabs Selector */}
                <div className="bg-slate-100 dark:bg-slate-900 p-1.5 rounded-[1.5rem] flex items-center gap-1 border border-slate-200 dark:border-white/5">
                    <button
                        onClick={() => setActiveTab('VERIFICAR')}
                        className={`px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${
                            activeTab === 'VERIFICAR' 
                                ? 'bg-white dark:bg-slate-800 text-cyan-500 shadow-md' 
                                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                        }`}
                    >
                        Verificar Pagos
                    </button>
                    <button
                        onClick={() => setActiveTab('CUENTAS')}
                        className={`px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${
                            activeTab === 'CUENTAS' 
                                ? 'bg-white dark:bg-slate-800 text-cyan-500 shadow-md' 
                                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                        }`}
                    >
                        Cuentas de Cobro
                    </button>
                </div>
            </div>

            {activeTab === 'VERIFICAR' ? (
                <SuperAdminBillingClient 
                    initialPayments={pendingPayments} 
                    plansMap={plansMap} 
                />
            ) : (
                <SuperAdminCuentasClient />
            )}
        </div>
    );
}
