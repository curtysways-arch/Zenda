'use client';

import React from 'react';
import { ShoppingBag, ArrowRight } from 'lucide-react';

interface FloatingCartBarProps {
    itemCount: number;
    totalAmount: number;
    onOpenCart: () => void;
}

export default function PinchoFloatingCartBar({
    itemCount,
    totalAmount,
    onOpenCart
}: FloatingCartBarProps) {
    if (itemCount <= 0) return null;

    return (
        <div className="fixed bottom-[84px] sm:bottom-6 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-lg font-sans animate-bounce-short">
            <button
                type="button"
                onClick={onOpenCart}
                className="w-full bg-slate-900 hover:bg-slate-950 text-white rounded-3xl p-3.5 pl-4 shadow-2xl border border-slate-800 flex items-center justify-between transition-all active:scale-[0.98] cursor-pointer group"
            >
                {/* Left side: Item count badge & Total */}
                <div className="flex items-center gap-3">
                    <div className="relative size-10 bg-orange-600 rounded-2xl flex items-center justify-center text-white shadow-md font-black">
                        <ShoppingBag className="size-5" />
                        <span className="absolute -top-1.5 -right-1.5 size-5 bg-amber-400 text-slate-950 text-[10px] font-black rounded-full flex items-center justify-center border-2 border-slate-900">
                            {itemCount}
                        </span>
                    </div>

                    <div className="text-left">
                        <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">Tu Carrito</span>
                        <span className="text-sm font-mono font-black text-white">
                            ${totalAmount.toFixed(2)}
                        </span>
                    </div>
                </div>

                {/* Right side: Action Button */}
                <div className="flex items-center gap-2 bg-orange-600 group-hover:bg-orange-500 text-white px-4 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider transition-colors shadow-md">
                    <span>Ver Carrito</span>
                    <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" />
                </div>
            </button>
        </div>
    );
}
