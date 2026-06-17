import { CheckSquare, Square, Rocket, ChevronRight } from 'lucide-react';
import Link from 'next/link';

interface CheckItem {
    id: string;
    label: string;
    completed: boolean;
}

interface OnboardingChecklistProps {
    percentage: number;
    checks: CheckItem[];
    primaryColor: string;
}

export default function OnboardingChecklist({ percentage, checks, primaryColor }: OnboardingChecklistProps) {
    if (percentage === 100) return null;

    return (
        <div className="bg-white border border-slate-200 p-8 rounded-[3rem] shadow-sm hover:shadow-xl transition-all relative overflow-hidden group">
            {/* Background blur */}
            <div 
                className="absolute -right-20 -top-20 w-64 h-64 rounded-full blur-[80px] opacity-10 group-hover:scale-110 transition-transform duration-700 pointer-events-none"
                style={{ backgroundColor: primaryColor }}
            />
            
            <div className="flex items-center gap-4 mb-6 relative z-10">
                <div 
                    className="w-12 h-12 rounded-[1.25rem] flex items-center justify-center text-white font-black"
                    style={{ backgroundColor: primaryColor }}
                >
                    <Rocket size={24} />
                </div>
                <div>
                    <h3 className="font-black text-slate-800 uppercase tracking-tighter text-xl italic leading-none">
                        Configuración
                    </h3>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-1">
                        {percentage}% Completado
                    </p>
                </div>
            </div>

            <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-8 relative z-10">
                <div 
                    className="h-full rounded-full transition-all duration-1000"
                    style={{ width: `${percentage}%`, backgroundColor: primaryColor }}
                />
            </div>

            <div className="space-y-4 mb-8 relative z-10">
                {checks.map(check => (
                    <div key={check.id} className="flex items-center gap-3">
                        {check.completed ? (
                            <CheckSquare size={20} style={{ color: primaryColor }} />
                        ) : (
                            <Square size={20} className="text-slate-300" />
                        )}
                        <span className={`text-sm font-bold uppercase tracking-tight italic ${check.completed ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                            {check.label}
                        </span>
                    </div>
                ))}
            </div>

            <Link 
                href="/admin/perfil" 
                className="w-full py-4 text-white rounded-2xl font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 active:scale-95 shadow-md hover:brightness-110 relative z-10"
                style={{ backgroundColor: primaryColor }}
            >
                Completar Perfil <ChevronRight size={18} />
            </Link>
        </div>
    );
}
