"use client";

import React, { createContext, useContext, useState, useRef, useEffect } from "react";
import { AlertTriangle, Trash2, DollarSign, X, HelpCircle } from "lucide-react";
import { clsx } from "clsx";

interface ConfirmOptions {
    title?: string;
    confirmText?: string;
    cancelText?: string;
    type?: "warning" | "danger" | "info" | "success";
    showInput?: boolean;
    inputValue?: number;
    inputLabel?: string;
}

type ConfirmResult = boolean | { confirmed: boolean; value: number };

interface ConfirmContextType {
    confirm: (message: string, options?: ConfirmOptions) => Promise<ConfirmResult>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export function useConfirm() {
    const context = useContext(ConfirmContext);
    if (!context) {
        throw new Error("useConfirm debe usarse dentro de un ConfirmProvider");
    }
    return context;
}

export function ConfirmProvider({ children, primaryColor = '#0ea5e9' }: { children: React.ReactNode; primaryColor?: string }) {
    const [state, setState] = useState<{
        isOpen: boolean;
        message: string;
        title: string;
        confirmText: string;
        cancelText: string;
        type: "warning" | "danger" | "info" | "success";
        showInput: boolean;
        inputValue: string;
        inputLabel: string;
        resolve: (value: ConfirmResult) => void;
    } | null>(null);

    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (state?.isOpen && state?.showInput) {
            // Autoenfocar el input del monto al abrir el modal
            setTimeout(() => {
                inputRef.current?.focus();
                inputRef.current?.select();
            }, 100);
        }
    }, [state?.isOpen, state?.showInput]);

    const confirm = (message: string, options?: ConfirmOptions) => {
        return new Promise<ConfirmResult>((resolve) => {
            setState({
                isOpen: true,
                message,
                title: options?.title || "¿Estás seguro?",
                confirmText: options?.confirmText || "Aceptar",
                cancelText: options?.cancelText || "Cancelar",
                type: options?.type || "warning",
                showInput: options?.showInput || false,
                inputValue: options?.inputValue !== undefined ? options.inputValue.toString() : "",
                inputLabel: options?.inputLabel || "Monto",
                resolve,
            });
        });
    };

    const handleConfirm = () => {
        if (!state) return;
        
        if (state.showInput) {
            const numVal = parseFloat(state.inputValue);
            state.resolve({
                confirmed: true,
                value: isNaN(numVal) ? 0 : numVal
            });
        } else {
            state.resolve(true);
        }
        setState(null);
    };

    const handleCancel = () => {
        if (!state) return;
        state.resolve(false);
        setState(null);
    };

    return (
        <ConfirmContext.Provider value={{ confirm }}>
            {children}
            {state?.isOpen && (
                <>
                    {/* Overlay de fondo independiente */}
                    <div 
                        className="fixed inset-0 z-[999998] bg-black/40 backdrop-blur-md animate-in fade-in duration-300"
                        onClick={handleCancel}
                    />

                    {/* Tarjeta del modal colocada arriba en móviles (top-8) para que el teclado no la empuje */}
                    <div 
                        className={clsx(
                            "fixed top-8 sm:top-1/2 left-1/2 -translate-x-1/2 sm:-translate-y-1/2 z-[999999]",
                            "w-[92%] max-w-sm sm:max-w-md bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 rounded-[2.5rem] p-5 sm:p-8 shadow-2xl overflow-hidden text-center",
                            "animate-in zoom-in-95 duration-200"
                        )}
                        style={{ '--primary-color': primaryColor } as any}
                    >
                        {/* Glow decorativo de fondo */}
                        <div 
                            className="absolute -top-24 -left-24 w-48 h-48 rounded-full blur-[80px] pointer-events-none opacity-40"
                            style={{ 
                                backgroundColor: state.type === 'danger' ? '#ef4444' : 'var(--primary-color, #0ea5e9)' 
                            }} 
                        />

                        {/* Botón de cerrar (esquina superior derecha) */}
                        <button 
                            onClick={handleCancel}
                            className="absolute top-6 right-6 size-9 bg-slate-50 dark:bg-white/5 hover:bg-rose-500 hover:text-white dark:hover:bg-rose-500 text-slate-400 rounded-xl flex items-center justify-center transition-all group"
                        >
                            <X size={16} className="group-hover:rotate-90 transition-transform" />
                        </button>

                        {/* Icono de cabecera */}
                        <div className="flex justify-center mb-6">
                            <div 
                                className={clsx(
                                    "size-16 rounded-2xl flex items-center justify-center shadow-lg animate-pulse",
                                    state.type === "danger" 
                                        ? "bg-rose-500/10 text-rose-500 shadow-rose-500/10" 
                                        : state.type === "success"
                                            ? "bg-emerald-500/10 text-emerald-500 shadow-emerald-500/10"
                                            : state.type === "info"
                                                ? "bg-blue-500/10 text-blue-500 shadow-blue-500/10"
                                                : "bg-amber-500/10 text-amber-500 shadow-amber-500/10"
                                )}
                            >
                                {state.type === "danger" ? (
                                    <Trash2 size={28} />
                                ) : state.showInput ? (
                                    <DollarSign size={28} style={{ color: "var(--primary-color, #0ea5e9)" }} />
                                ) : (
                                    <AlertTriangle size={28} />
                                )}
                            </div>
                        </div>

                        {/* Textos */}
                        <div className="space-y-2 mb-6">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none italic">
                                {state.title}
                            </p>
                            <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight italic leading-snug">
                                {state.message}
                            </h3>
                        </div>

                        {/* Input opcional de monto con Flexbox robusto para evitar superposición */}
                        {state.showInput && (
                            <div className="mb-8 space-y-2 text-left">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1 ml-1">
                                    {state.inputLabel}
                                </label>
                                <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-white/5 rounded-3xl px-4 py-4 focus-within:bg-white focus-within:border-[var(--primary-color, #0ea5e9)] dark:focus-within:bg-slate-700 focus-within:ring-2 focus-within:ring-[var(--primary-color, #0ea5e9)]/10 shadow-inner transition-all">
                                    <span className="text-3xl font-black text-slate-400 select-none italic">$</span>
                                    <input 
                                        ref={inputRef}
                                        type="number"
                                        step="0.01"
                                        placeholder="0.00"
                                        className="flex-1 bg-transparent border-none outline-none text-3xl font-black text-slate-900 dark:text-white focus:ring-0 focus:outline-none p-0 italic"
                                        style={{ color: '#0f172a', border: 'none', outline: 'none', boxShadow: 'none' }}
                                        value={state.inputValue}
                                        onChange={(e) => setState(prev => prev ? { ...prev, inputValue: e.target.value } : null)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleConfirm();
                                            if (e.key === 'Escape') handleCancel();
                                        }}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Botones de acción (Horizontales compactos para ahorrar espacio vertical) */}
                        <div className="flex gap-2 sm:gap-3">
                            <button
                                type="button"
                                onClick={handleCancel}
                                className="flex-1 py-3.5 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 rounded-2xl font-black text-[9px] sm:text-[10px] uppercase tracking-wider transition-all italic active:scale-95 text-center truncate px-2"
                            >
                                {state.cancelText}
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirm}
                                className={clsx(
                                    "flex-[1.5] py-3.5 text-white rounded-2xl font-black text-[9px] sm:text-[10px] uppercase tracking-wider transition-all italic active:scale-95 shadow-lg text-center truncate px-2",
                                    state.type === 'danger' 
                                        ? "bg-rose-600 hover:bg-rose-700 shadow-rose-600/20" 
                                        : "bg-[var(--primary-color, #0ea5e9)] hover:brightness-95 hover:text-white shadow-[var(--primary-color, #0ea5e9)]/20"
                                )}
                                style={state.type !== 'danger' ? { backgroundColor: 'var(--primary-color, #0ea5e9)' } : undefined}
                            >
                                {state.confirmText}
                            </button>
                        </div>
                    </div>
                </>
            )}
        </ConfirmContext.Provider>
    );
}
