import { CheckCircle2, Circle, ChevronRight } from 'lucide-react';
import Link from 'next/link';

interface CheckItem {
    id: string;
    label: string;
    hint?: string;
    href?: string;
    completed: boolean;
}

interface OnboardingChecklistProps {
    percentage: number;
    checks: CheckItem[];
    primaryColor: string;
}

/**
 * Lista "Pon tu negocio en marcha". Cada tarea pendiente es un enlace directo
 * a la pantalla donde se completa. Funciona igual en escritorio y en móvil.
 */
export default function OnboardingChecklist({ percentage, checks, primaryColor }: OnboardingChecklistProps) {
    if (percentage >= 100) return null;

    const done = checks.filter(c => c.completed).length;

    return (
        <section className="bg-white border border-slate-200 rounded-2xl p-5" aria-labelledby="onboarding-title">
            <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                    <h3 id="onboarding-title" className="text-base font-semibold text-slate-900">Pon tu negocio en marcha</h3>
                    <p className="text-sm text-slate-500 mt-0.5">{done} de {checks.length} listos</p>
                </div>
                <span className="text-sm font-semibold" style={{ color: primaryColor }}>{percentage}%</span>
            </div>

            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-4" role="progressbar" aria-valuenow={percentage} aria-valuemin={0} aria-valuemax={100}>
                <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${percentage}%`, backgroundColor: primaryColor }}
                />
            </div>

            <ul className="space-y-1">
                {checks.map(check => {
                    const row = (
                        <div className="flex items-start gap-3 py-2 px-2">
                            {check.completed ? (
                                <CheckCircle2 size={20} className="shrink-0 mt-0.5" style={{ color: primaryColor }} />
                            ) : (
                                <Circle size={20} className="shrink-0 mt-0.5 text-slate-300" />
                            )}
                            <div className="min-w-0 flex-1">
                                <p className={check.completed ? 'text-sm text-slate-400 line-through' : 'text-sm font-medium text-slate-800'}>
                                    {check.label}
                                </p>
                                {!check.completed && check.hint && (
                                    <p className="text-xs text-slate-500 mt-0.5">{check.hint}</p>
                                )}
                            </div>
                            {!check.completed && check.href && (
                                <ChevronRight size={18} className="shrink-0 mt-0.5 text-slate-400" />
                            )}
                        </div>
                    );
                    return (
                        <li key={check.id}>
                            {!check.completed && check.href ? (
                                <Link href={check.href} className="block -mx-2 hover:bg-slate-50 rounded-lg">{row}</Link>
                            ) : <div className="-mx-2">{row}</div>}
                        </li>
                    );
                })}
            </ul>
        </section>
    );
}
