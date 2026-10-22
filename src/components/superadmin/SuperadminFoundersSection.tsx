'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Trophy,
  Zap,
  ArrowUpRight,
  UtensilsCrossed,
  Sparkles,
  ShoppingBag,
  CalendarCheck,
  Stethoscope,
  Dumbbell,
  Building2,
  CheckCircle2,
  ExternalLink,
  Layers
} from 'lucide-react';

export interface FounderSubscription {
  id: string;
  negocioId: string;
  planId?: string | null;
  founderPosition: number;
  lockedPrice: number | null;
  estado: string;
  fechaInicio: string | Date;
  Negocio: {
    id: string;
    nombre: string;
    slug?: string;
    tipoNegocio?: string;
  };
  Plan: {
    id: string;
    name: string;
    familyId?: string | null;
    family?: {
      id: string;
      name: string;
      code: string;
    } | null;
  } | null;
}

export interface PlanFamilyWithProgram {
  id: string;
  name: string;
  code: string;
  founderProgram?: {
    id: string;
    enabled: boolean;
    maxMembers: number;
    currentMembers: number;
    founderPrice: number;
  } | null;
}

interface Props {
  families: PlanFamilyWithProgram[];
  founders: FounderSubscription[];
  defaultLockedPrice: number;
}

interface FamilyMeta {
  label: string;
  icon: any;
  color: string;
  border: string;
  bg: string;
  gradient: string;
}

const FAMILY_CONFIGS: Record<string, FamilyMeta> = {
  RESTAURANTE: {
    label: 'Restaurantes & Gastronomía',
    icon: UtensilsCrossed,
    color: 'text-amber-500',
    border: 'border-amber-500/30',
    bg: 'bg-amber-500/10',
    gradient: 'from-amber-500 to-orange-600',
  },
  CANCHAS: {
    label: 'Canchas & Clubes Deportivos',
    icon: Trophy,
    color: 'text-emerald-500',
    border: 'border-emerald-500/30',
    bg: 'bg-emerald-500/10',
    gradient: 'from-emerald-500 to-teal-600',
  },
  LAVANDERIA: {
    label: 'Lavanderías & Cuidado',
    icon: Sparkles,
    color: 'text-purple-500',
    border: 'border-purple-500/30',
    bg: 'bg-purple-500/10',
    gradient: 'from-purple-500 to-indigo-600',
  },
  SERVICIOS: {
    label: 'Citas & Servicios Profesionales',
    icon: CalendarCheck,
    color: 'text-blue-500',
    border: 'border-blue-500/30',
    bg: 'bg-blue-500/10',
    gradient: 'from-blue-500 to-cyan-600',
  },
  TIENDA: {
    label: 'Tiendas & Comercio',
    icon: ShoppingBag,
    color: 'text-rose-500',
    border: 'border-rose-500/30',
    bg: 'bg-rose-500/10',
    gradient: 'from-rose-500 to-pink-600',
  },
  DENTISTA: {
    label: 'Clínicas Dentales & Odontología',
    icon: Stethoscope,
    color: 'text-cyan-500',
    border: 'border-cyan-500/30',
    bg: 'bg-cyan-500/10',
    gradient: 'from-cyan-500 to-blue-600',
  },
  GIMNASIO: {
    label: 'Gimnasios & Fitness',
    icon: Dumbbell,
    color: 'text-orange-500',
    border: 'border-orange-500/30',
    bg: 'bg-orange-500/10',
    gradient: 'from-orange-500 to-amber-600',
  },
};

const DEFAULT_META: FamilyMeta = {
  label: 'Negocios Generales',
  icon: Building2,
  color: 'text-indigo-500',
  border: 'border-indigo-500/30',
  bg: 'bg-indigo-500/10',
  gradient: 'from-indigo-500 to-purple-600',
};

export default function SuperadminFoundersSection({
  families = [],
  founders = [],
  defaultLockedPrice = 10.0,
}: Props) {
  const [selectedFamilyId, setSelectedFamilyId] = useState<string>('ALL');

  // Enlazar cada fundador con su familia resuelta
  const enrichedFounders = useMemo(() => {
    return founders.map((f) => {
      // 1. Por relación directa de Plan.family
      let family = f.Plan?.family;
      // 2. Si no, por familyId en la lista de familias
      if (!family && f.Plan?.familyId) {
        family = families.find((fam) => fam.id === f.Plan?.familyId) as any;
      }
      // 3. Si no, mapeo por tipoNegocio del negocio
      if (!family && f.Negocio?.tipoNegocio) {
        const tn = f.Negocio.tipoNegocio.toUpperCase();
        if (tn === 'RESTAURANTE' || tn.includes('REST')) {
          family = families.find((fam) => fam.code === 'RESTAURANTE') as any;
        } else if (tn === 'SPORTS_COURTS' || tn.includes('CANCHA')) {
          family = families.find((fam) => fam.code === 'CANCHAS') as any;
        } else if (tn.includes('LAVADO') || tn.includes('LAVANDERIA') || tn.includes('SNEAKER')) {
          family = families.find((fam) => fam.code === 'LAVANDERIA') as any;
        } else if (tn.includes('SPA') || tn.includes('BARBER') || tn.includes('SERVICIO')) {
          family = families.find((fam) => fam.code === 'SERVICIOS') as any;
        } else if (tn.includes('TIENDA') || tn.includes('STORE')) {
          family = families.find((fam) => fam.code === 'TIENDA') as any;
        } else if (tn.includes('DENT')) {
          family = families.find((fam) => fam.code === 'DENTISTA') as any;
        } else if (tn.includes('GYM') || tn.includes('GIMNASIO')) {
          family = families.find((fam) => fam.code === 'GIMNASIO') as any;
        }
      }

      return {
        ...f,
        resolvedFamily: family || null,
      };
    });
  }, [founders, families]);

  // Contadores por familia
  const familyStats = useMemo(() => {
    return families.map((fam) => {
      const prog = fam.founderProgram;
      const maxMembers = prog?.maxMembers ?? 25;
      const price = prog?.founderPrice ?? defaultLockedPrice;
      const activeCount = enrichedFounders.filter(
        (f) => f.resolvedFamily?.id === fam.id
      ).length;
      const remaining = Math.max(0, maxMembers - activeCount);
      const meta = FAMILY_CONFIGS[fam.code] || DEFAULT_META;

      return {
        ...fam,
        maxMembers,
        price,
        activeCount,
        remaining,
        meta,
        progressPercent: Math.min(100, Math.round((activeCount / maxMembers) * 100)),
      };
    });
  }, [families, enrichedFounders, defaultLockedPrice]);

  // Familia activa seleccionada
  const activeFamilyStat = useMemo(() => {
    if (selectedFamilyId === 'ALL') return null;
    return familyStats.find((f) => f.id === selectedFamilyId) || null;
  }, [selectedFamilyId, familyStats]);

  // Lista filtrada
  const filteredFounders = useMemo(() => {
    if (selectedFamilyId === 'ALL') return enrichedFounders;
    return enrichedFounders.filter((f) => f.resolvedFamily?.id === selectedFamilyId);
  }, [selectedFamilyId, enrichedFounders]);

  const totalFundadores = enrichedFounders.length;
  const totalCuposDisponiblesGlobal = familyStats.reduce((acc, f) => acc + f.maxMembers, 0);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-white/5 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] overflow-hidden p-8 lg:p-12 space-y-8">
      {/* ── 1. CABECERA Y VISUAL DE CUPOS DINÁMICO ────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-100 dark:border-white/5">
        <div className="space-y-2 max-w-2xl">
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-6 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full animate-pulse" />
            <span className="text-xs font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-wide leading-none">
              Club Exclusivo · Programa Independiente
            </span>
          </div>
          <h3 className="text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white tracking-tight leading-none">
            Socios Fundadores
          </h3>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-xs sm:text-sm leading-relaxed">
            Cada tipo de negocio tiene su propio cupo exclusivo de <strong className="text-slate-900 dark:text-white font-bold">25 socios fundadores</strong> con tarifa especial de por vida (<span className="text-emerald-500 font-bold">${defaultLockedPrice}/mes</span>). Cada vertical numera sus fundadores del <span className="font-bold">#1 al #25</span>.
          </p>
        </div>

        {/* Visual de Cupos: cambia según la vertical seleccionada */}
        <div className="bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100/60 dark:border-indigo-500/15 rounded-2xl p-6 flex items-center gap-5 lg:min-w-[340px] shadow-sm">
          <div className={`size-16 rounded-2xl flex items-center justify-center text-white shadow-lg transition-all duration-300 ${
            activeFamilyStat
              ? `bg-gradient-to-br ${activeFamilyStat.meta.gradient} shadow-indigo-500/20`
              : 'bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 shadow-indigo-500/30'
          }`}>
            {activeFamilyStat ? (
              <activeFamilyStat.meta.icon size={28} className="animate-bounce" />
            ) : (
              <Trophy size={28} className="animate-bounce" />
            )}
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex justify-between items-end gap-2">
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide leading-none truncate">
                {activeFamilyStat ? activeFamilyStat.name : 'Total Asignados'}
              </span>
              <span className="text-xl font-bold text-slate-900 dark:text-white leading-none whitespace-nowrap">
                {activeFamilyStat ? (
                  <>{activeFamilyStat.activeCount} <span className="text-xs font-semibold text-slate-400">/ {activeFamilyStat.maxMembers}</span></>
                ) : (
                  <>{totalFundadores} <span className="text-xs font-semibold text-slate-400">activos</span></>
                )}
              </span>
            </div>
            <div className="w-full h-3 bg-slate-200/80 dark:bg-slate-800 rounded-full overflow-hidden p-0.5">
              <div
                className={`h-full rounded-full transition-all duration-700 bg-gradient-to-r ${
                  activeFamilyStat ? activeFamilyStat.meta.gradient : 'from-indigo-500 via-purple-500 to-pink-500'
                }`}
                style={{
                  width: activeFamilyStat
                    ? `${Math.max(5, activeFamilyStat.progressPercent)}%`
                    : `${Math.max(5, Math.min(100, (totalFundadores / Math.max(1, totalCuposDisponiblesGlobal)) * 100))}%`,
                }}
              />
            </div>
            <div className="flex items-center justify-between text-xs font-bold text-slate-400 dark:text-slate-400 uppercase tracking-tight">
              <span>
                {activeFamilyStat ? (
                  activeFamilyStat.remaining > 0
                    ? `Quedan ${activeFamilyStat.remaining} cupos disponibles`
                    : '¡Todos los 25 cupos agotados!'
                ) : (
                  `${familyStats.length} verticales activas (25 c/u)`
                )}
              </span>
              {activeFamilyStat && (
                <span className="text-emerald-500 font-bold">
                  ${activeFamilyStat.price}/mes
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. PESTAÑAS / FILTRO POR TIPO DE NEGOCIO ─────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <Layers size={14} className="text-indigo-500" />
            Filtrar por Tipo de Negocio
          </span>
          {activeFamilyStat && (
            <Link
              href={`/superadmin/familias/${activeFamilyStat.id}?tab=founder`}
              className="text-xs font-bold text-indigo-500 hover:text-indigo-600 flex items-center gap-1 hover:underline"
            >
              Configurar cupos de {activeFamilyStat.name}
              <ExternalLink size={11} />
            </Link>
          )}
        </div>

        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={() => setSelectedFamilyId('ALL')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${
 selectedFamilyId === 'ALL'
 ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-md shadow-slate-900/10'
 : 'bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
 }`}
          >
            <span>🌐 Ver Todos</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
 selectedFamilyId === 'ALL'
 ? 'bg-white/20 text-white dark:bg-slate-900/20 dark:text-slate-900'
 : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
 }`}>
              {totalFundadores}
            </span>
          </button>

          {familyStats.map((fam) => {
            const isSelected = selectedFamilyId === fam.id;
            const Icon = fam.meta.icon;
            return (
              <button
                key={fam.id}
                onClick={() => setSelectedFamilyId(fam.id)}
                className={`px-3.5 py-2.5 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 border ${
 isSelected
 ? `${fam.meta.bg} ${fam.meta.border} ${fam.meta.color} ring-2 ring-indigo-500/20 shadow-sm`
                    : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Icon size={14} className={fam.meta.color} />
                <span>{fam.meta.label.split('&')[0].trim()}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
 fam.activeCount > 0
 ? 'bg-indigo-500 text-white shadow-xs'
 : 'bg-slate-200/80 dark:bg-slate-700/80 text-slate-500 dark:text-slate-400'
 }`}>
                  {fam.activeCount}/{fam.maxMembers}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 3. RESUMEN EN TARJETAS POR VERTICAL (SOLO EN MODO "TODOS") ────── */}
      {selectedFamilyId === 'ALL' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          {familyStats.map((fam) => {
            const Icon = fam.meta.icon;
            return (
              <div
                key={fam.id}
                onClick={() => setSelectedFamilyId(fam.id)}
                className="group p-4 rounded-3xl bg-slate-50/70 dark:bg-slate-800/30 border border-slate-100 dark:border-white/5 hover:border-indigo-400/40 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 transition-all cursor-pointer space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className={`size-10 rounded-xl flex items-center justify-center ${fam.meta.bg} ${fam.meta.color}`}>
                    <Icon size={18} />
                  </div>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
 fam.activeCount > 0
 ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
 : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
 }`}>
                    {fam.activeCount} / {fam.maxMembers}
                  </span>
                </div>
                <div>
                  <h4 className="font-bold text-xs text-slate-800 dark:text-white uppercase tracking-tight truncate group-hover:text-indigo-500 transition-colors">
                    {fam.name}
                  </h4>
                  <p className="text-xs font-semibold text-slate-400 mt-0.5">
                    {fam.remaining > 0 ? `${fam.remaining} cupos restantes` : 'Cupos completos'}
                  </p>
                </div>
                <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${fam.meta.gradient}`}
                    style={{ width: `${Math.max(4, fam.progressPercent)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── 4. TABLA DE SOCIOS FUNDADORES ─────────────────────────────────── */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-100 dark:border-white/5 pb-4">
              <th className="pb-4 text-xs font-bold text-slate-400 uppercase tracking-wide">
                Posición
              </th>
              <th className="pb-4 text-xs font-bold text-slate-400 uppercase tracking-wide">
                Negocio
              </th>
              <th className="pb-4 text-xs font-bold text-slate-400 uppercase tracking-wide">
                Tipo de Negocio / Vertical
              </th>
              <th className="pb-4 text-xs font-bold text-slate-400 uppercase tracking-wide">
                Plan Base
              </th>
              <th className="pb-4 text-xs font-bold text-slate-400 uppercase tracking-wide">
                Precio Congelado
              </th>
              <th className="pb-4 text-xs font-bold text-slate-400 uppercase tracking-wide text-center">
                Estado
              </th>
              <th className="pb-4 text-xs font-bold text-slate-400 uppercase tracking-wide text-right">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/5">
            {filteredFounders.length > 0 ? (
              filteredFounders.map((sub: any) => {
                const familyCode = sub.resolvedFamily?.code || '';
                const familyMeta = FAMILY_CONFIGS[familyCode] || DEFAULT_META;
                const FamilyIcon = familyMeta.icon;

                return (
                  <tr
                    key={sub.id}
                    className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-all group"
                  >
                    {/* Posición dentro de su vertical */}
                    <td className="py-4">
                      <div className="flex flex-col items-start gap-1">
                        <span className={`size-8 rounded-xl font-bold text-sm flex items-center justify-center shadow-xs ${familyMeta.bg} ${familyMeta.color} border ${familyMeta.border}`}>
                          #{sub.founderPosition}
                        </span>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-tight">
                          en su rubro
                        </span>
                      </div>
                    </td>

                    {/* Negocio */}
                    <td className="py-4">
                      <div className="flex items-center gap-3.5">
                        <div className={`size-10 bg-gradient-to-br ${familyMeta.gradient} rounded-2xl flex items-center justify-center text-white font-bold uppercase text-base shadow-md shadow-indigo-500/10 group-hover:rotate-3 transition-transform`}>
                          {sub.Negocio?.nombre?.charAt(0) || 'N'}
                        </div>
                        <div>
                          <Link
                            href={`/superadmin/negocios/${sub.negocioId}?tab=subscription`}
                            className="font-bold text-slate-900 dark:text-white uppercase tracking-tight hover:text-indigo-500 transition-colors block"
                          >
                            {sub.Negocio?.nombre}
                          </Link>
                          <div className="text-xs font-bold text-slate-400 uppercase tracking-tight">
                            Desde {new Date(sub.fechaInicio).toLocaleDateString('es-ES', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Tipo de Negocio / Vertical */}
                    <td className="py-4">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border bg-slate-50/80 dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-800">
                        <FamilyIcon size={13} className={familyMeta.color} />
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                          {sub.resolvedFamily?.name || sub.Negocio?.tipoNegocio || 'General'}
                        </span>
                      </div>
                    </td>

                    {/* Plan Base */}
                    <td className="py-4">
                      <span className="px-2.5 py-1 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg text-xs font-bold tracking-wide uppercase inline-flex items-center gap-1 shadow-xs">
                        <Zap size={10} className="text-amber-400 fill-amber-400" />
                        {sub.Plan?.name || 'Founder'}
                      </span>
                    </td>

                    {/* Precio Congelado */}
                    <td className="py-4">
                      <div className="space-y-0.5">
                        <span className="text-sm font-bold text-slate-900 dark:text-white ">
                          ${sub.lockedPrice || defaultLockedPrice}
                          <span className="text-xs font-bold text-slate-400 uppercase"> /mes</span>
                        </span>
                        <div className="text-xs font-bold uppercase text-emerald-600 dark:text-emerald-400 tracking-wider">
                          ✓ Tarifa de por vida
                        </div>
                      </div>
                    </td>

                    {/* Estado */}
                    <td className="py-4 text-center">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-wide shadow-xs ${
 sub.estado.toLowerCase() === 'active' || sub.estado.toLowerCase() === 'activa'
 ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-500/20'
 : 'bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-500/20'
 }`}
                      >
                        {sub.estado}
                      </span>
                    </td>

                    {/* Acciones */}
                    <td className="py-4 text-right">
                      <Link
                        href={`/superadmin/negocios/${sub.negocioId}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-white/5 hover:bg-indigo-600 hover:text-white rounded-xl text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 transition-all active:scale-95 shadow-xs"
                      >
                        Ver Negocio
                        <ArrowUpRight size={12} strokeWidth={2.5} />
                      </Link>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={7} className="py-14 text-center">
                  <div className="max-w-md mx-auto space-y-2">
                    <Trophy size={32} className="mx-auto text-slate-300 dark:text-slate-600" />
                    <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase">
                      {activeFamilyStat
                        ? `Sin socios fundadores en ${activeFamilyStat.name}`
                        : 'No hay negocios fundadores registrados'}
                    </h4>
                    <p className="text-xs text-slate-400">
                      {activeFamilyStat
                        ? `Hay ${activeFamilyStat.maxMembers} cupos disponibles para esta categoría a tarifa especial de $${activeFamilyStat.price}/mes. El primer negocio en registrarse tomará la posición #1.`
                        : 'Ajusta el filtro o crea un negocio para activar su membresía de socio fundador.'}
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
