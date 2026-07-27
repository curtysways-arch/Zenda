import React from 'react';
import { ShoppingBag, User, MapPin, CheckCircle2, CreditCard, Sparkles } from 'lucide-react';

interface StepperProps {
    currentStep: number;
    onStepClick?: (step: number) => void;
}

const STEPS = [
    { number: 1, label: 'Productos', icon: ShoppingBag },
    { number: 2, label: 'Datos', icon: User },
    { number: 3, label: 'Entrega', icon: MapPin },
    { number: 4, label: 'Confirmar', icon: CheckCircle2 },
    { number: 5, label: 'Pago', icon: CreditCard },
    { number: 6, label: 'Finalizado', icon: Sparkles }
];

export default function PinchoCheckoutStepper({ currentStep, onStepClick }: StepperProps) {
    return (
        <div className="w-full bg-white border-b border-slate-200/80 px-3 py-2.5 sticky top-14 z-30 shadow-2xs">
            <div className="max-w-2xl mx-auto flex items-center justify-between gap-1 overflow-x-auto custom-scrollbar">
                {STEPS.map((s) => {
                    const Icon = s.icon;
                    const isActive = currentStep === s.number;
                    const isCompleted = currentStep > s.number;

                    return (
                        <div 
                            key={s.number}
                            onClick={() => {
                                if (isCompleted && onStepClick) onStepClick(s.number);
                            }}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-black shrink-0 transition-all ${
                                isActive 
                                    ? 'bg-orange-600 text-white shadow-md shadow-orange-600/20 scale-[1.02]' 
                                    : isCompleted
                                        ? 'bg-orange-50 text-orange-800 border border-orange-200/80 cursor-pointer hover:bg-orange-100'
                                        : 'bg-slate-50 text-slate-400 border border-slate-100 opacity-60'
                            }`}
                        >
                            <div className={`size-5 rounded-lg flex items-center justify-center text-[10px] font-black ${
                                isActive 
                                    ? 'bg-white/20 text-white' 
                                    : isCompleted 
                                        ? 'bg-orange-600 text-white' 
                                        : 'bg-slate-200 text-slate-500'
                            }`}>
                                {isCompleted ? '✓' : s.number}
                            </div>
                            <span className="truncate max-w-[65px] sm:max-w-[90px] uppercase text-[10px] tracking-wider">{s.label}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
