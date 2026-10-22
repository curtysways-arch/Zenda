'use client';

import { useState } from "react";
import { Banknote } from "lucide-react";
import SuperAdminBillingClient from "./SuperAdminBillingClient";
import SuperAdminCuentasClient from "./SuperAdminCuentasClient";

interface SuperAdminPagosTabsProps {
    initialPayments: any[];
    plansMap: Record<string, string>;
}

export default function SuperAdminPagosTabs({ initialPayments, plansMap }: SuperAdminPagosTabsProps) {
    const [activeTab, setActiveTab] = useState<'VERIFICAR' | 'CUENTAS'>('VERIFICAR');
    const [payments, setPayments] = useState(initialPayments);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 dark:border-white/5 pb-6 gap-6">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                            <Banknote className="text-cyan-500" size={32} />
                            Módulo de Pagos
                        </h2>
                        {payments.length > 0 && (
                            <div className="px-3 py-1 bg-amber-500 text-white rounded-full text-xs font-bold animate-pulse">
                                {payments.length} Pendiente{payments.length > 1 ? 's' : ''}
                            </div>
                        )}
                    </div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                        Administración centralizada de cobros, cuentas bancarias de recepción y auditoría de comprobantes.
                    </p>
                </div>

                {/* Tabs Selector */}
                <div className="bg-slate-100 dark:bg-slate-900 p-1.5 rounded-2xl flex items-center gap-1 border border-slate-200 dark:border-white/5">
                    <button
                        onClick={() => setActiveTab('VERIFICAR')}
                        className={`px-6 py-3 rounded-2xl font-bold text-xs uppercase tracking-wide transition-all ${
 activeTab === 'VERIFICAR' 
 ? 'bg-white dark:bg-slate-800 text-cyan-500 shadow-md' 
 : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
 }`}
                    >
                        Verificar Pagos
                    </button>
                    <button
                        onClick={() => setActiveTab('CUENTAS')}
                        className={`px-6 py-3 rounded-2xl font-bold text-xs uppercase tracking-wide transition-all ${
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
                    initialPayments={payments} 
                    plansMap={plansMap} 
                />
            ) : (
                <SuperAdminCuentasClient />
            )}
        </div>
    );
}
