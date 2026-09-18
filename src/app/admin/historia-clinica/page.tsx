'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { 
  FileText, Search, Users, ShieldCheck, ChevronRight, 
  Loader2, Plus, Calendar, AlertCircle, Lock, Sparkles, ArrowRight
} from 'lucide-react';

export default function HistoriasClinicasGlobalPage() {
  const { data: session } = useSession();
  const userObj = session?.user as any;
  const isRealSuperAdmin = Boolean(
    userObj?.role === 'SUPERADMIN' || 
    userObj?.role === 'SUPER_ADMIN' || 
    userObj?.isAdminUser === true || 
    userObj?.isDelegated === true
  );

  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    async function checkAccessAndLoad() {
      try {
        const entRes = await fetch('/api/admin/entitlements');
        let allowed = true;
        if (entRes.ok) {
          const entData = await entRes.json();
          const caps = entData?.entitlements?.capabilities || {};
          allowed = Boolean(caps.CLINICAL_RECORDS || caps.clinical_records || isRealSuperAdmin);
        }
        setHasAccess(allowed);

        if (!allowed && !isRealSuperAdmin) {
          setLoading(false);
          return;
        }

        const res = await fetch('/api/admin/dental/records');
        if (res.ok) {
          const data = await res.json();
          setRecords(data.records || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    checkAccessAndLoad();
  }, [isRealSuperAdmin]);

  const filtered = records.filter(r => {
    const term = searchTerm.toLowerCase();
    const nom = (r.Cliente?.nombre || '').toLowerCase();
    const num = (r.numeroHistoria || '').toLowerCase();
    return nom.includes(term) || num.includes(term);
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-purple-100 text-purple-700">
              <FileText className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-black text-slate-900">Historias Clínicas Odontológicas</h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Expedientes médicos, antecedentes sistémicos, alergias y evolución por paciente.
          </p>
        </div>

        <Link
          href="/admin/pacientes"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-sky-600 text-white font-extrabold text-xs shadow-md hover:bg-sky-700 active:scale-95 transition-all"
        >
          <Users className="w-4 h-4" />
          <span>Ver Pacientes</span>
        </Link>
      </div>

      {loading ? (
        <div className="py-20 text-center flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-sky-600 mb-2" />
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Verificando suscripción y expedientes...</p>
        </div>
      ) : hasAccess === false ? (
        /* ─── PAYWALL: HISTORIA CLÍNICA NO INCLUIDA EN PLAN INICIAL ─── */
        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200/80 shadow-xs text-center max-w-2xl mx-auto my-8">
          <div className="size-16 rounded-2xl bg-gradient-to-tr from-purple-500/10 to-indigo-500/10 text-purple-600 flex items-center justify-center mx-auto mb-4 border border-purple-200/60 shadow-xs">
            <Lock className="w-8 h-8" />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-black uppercase tracking-wider mb-3 border border-purple-100">
            <Sparkles className="w-3.5 h-3.5" /> Plan Crecimiento Requerido
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mb-2">
            Historia Clínica Digital & Odontograma
          </h2>
          <p className="text-sm text-slate-500 max-w-md mx-auto mb-6 leading-relaxed">
            El módulo de <strong>Historia Clínica Digital</strong> no está disponible en el plan inicial. Actualiza al <strong>Plan Crecimiento</strong> para desbloquear expedientes completos, odontograma interactivo 3D/2D, consentimientos informados y evolución clínica por consulta.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/admin/plan"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-extrabold text-xs shadow-md transition-all group"
            >
              <span>Actualizar a Plan Crecimiento</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <Link
              href="/admin/pacientes"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 transition-colors"
            >
              <span>Ir a Pacientes</span>
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-96">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por paciente o número de historia..."
                className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>
            <span className="text-xs font-bold text-slate-500">
              Total: {filtered.length} expedientes
            </span>
          </div>

          {filtered.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-xs">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-slate-700">Sin historias clínicas registradas</h3>
              <p className="text-xs text-slate-400 mt-1">
                Al abrir la ficha de un paciente se creará automáticamente su expediente clínico.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-xs">
              <div className="divide-y divide-slate-100">
                {filtered.map((rec) => (
                  <div key={rec.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-md bg-purple-50 text-purple-700 font-extrabold text-xs">
                          #{rec.numeroHistoria || 'HC-0001'}
                        </span>
                        <h3 className="text-base font-extrabold text-slate-900">
                          {rec.Cliente?.nombre || 'Paciente'}
                        </h3>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-slate-400 mt-1">
                        <span>{rec._count?.encounters || 0} consultas</span>
                        <span>•</span>
                        <span>{rec._count?.treatments || 0} tratamientos</span>
                        <span>•</span>
                        <span>{rec._count?.documents || 0} archivos</span>
                      </div>
                    </div>

                    <Link
                      href={`/admin/pacientes/${rec.clienteId}`}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-sky-50 hover:text-sky-700 text-slate-700 font-bold text-xs transition-all shrink-0"
                    >
                      <span>Abrir Expediente</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

    </div>
  );
}
