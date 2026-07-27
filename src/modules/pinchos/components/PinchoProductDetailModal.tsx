'use client';

import React, { useState, useEffect } from 'react';
import { X, Plus, Minus, ShoppingBag, CheckCircle2, Flame, Snowflake, Truck, Sparkles } from 'lucide-react';

interface Product {
    id: string;
    nombre: string;
    precio: number;
    imagenUrl?: string | null;
    descripcion?: string | null;
}

interface ModalProps {
    product: Product | null;
    onClose: () => void;
    onAddToCart: (product: Product, quantity: number) => void;
    currentCartQuantity?: number;
}

export default function PinchoProductDetailModal({
    product,
    onClose,
    onAddToCart,
    currentCartQuantity = 0
}: ModalProps) {
    const [quantity, setQuantity] = useState(1);
    const [showToast, setShowToast] = useState(false);
    const [toastMsg, setToastMsg] = useState('');

    useEffect(() => {
        setQuantity(1);
    }, [product]);

    if (!product) return null;

    const unitPrice = product.precio || 0;
    const totalPrice = unitPrice * quantity;

    const handleIncrement = () => setQuantity(q => q + 1);
    const handleDecrement = () => setQuantity(q => (q > 1 ? q - 1 : 1));

    const handleAdd = () => {
        onAddToCart(product, quantity);
        setToastMsg(currentCartQuantity > 0 ? '✅ Se actualizó tu carrito.' : '✅ ¡Producto agregado al carrito!');
        setShowToast(true);
        setTimeout(() => setShowToast(false), 2500);
    };

    // Default description fallback if empty
    const displayDescription = product.descripcion && product.descripcion.trim().length > 5
        ? product.descripcion
        : 'Delicioso pincho preparado con productos seleccionados frescos, embutidos y vegetales marinados con especias naturales de la casa.';

    return (
        <div className="fixed inset-0 z-[500] bg-slate-950/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto custom-scrollbar animate-fade-in">
            {/* Backdrop Click */}
            <div className="absolute inset-0" onClick={onClose} />

            {/* Modal Card */}
            <div className="relative bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[90vh] sm:max-h-[88vh] text-left animate-scale-up border border-slate-200/80">
                {/* Drag Handle Bar for Mobile */}
                <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto my-2 shrink-0 sm:hidden" />

                {/* Close Button (Floating Frosted Glass) */}
                <button
                    type="button"
                    onClick={onClose}
                    className="absolute top-4 right-4 z-20 size-9 bg-black/40 hover:bg-black/60 text-white rounded-full flex items-center justify-center backdrop-blur-md transition-all active:scale-90 cursor-pointer shadow-md"
                    title="Cerrar"
                >
                    <X className="size-5 stroke-[2.5]" />
                </button>

                {/* Scrollable Modal Body */}
                <div className="overflow-y-auto custom-scrollbar flex-1 pb-24">
                    {/* Top Image (occupies ~55-60% visual height) */}
                    <div className="relative w-full aspect-[4/3] bg-slate-100 overflow-hidden">
                        {product.imagenUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={product.imagenUrl}
                                alt={product.nombre}
                                className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-500"
                            />
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-orange-100 via-amber-50 to-orange-50 text-orange-600">
                                <span className="text-6xl">🍢</span>
                                <span className="text-xs font-black uppercase tracking-widest text-orange-700 mt-2">PinchoListo</span>
                            </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
                    </div>

                    {/* Content Section */}
                    <div className="p-5 sm:p-6 space-y-4">
                        {/* Title & Category Badge */}
                        <div className="space-y-1">
                            <span className="inline-block px-2.5 py-0.5 bg-orange-100 text-orange-800 text-[10px] font-black uppercase tracking-widest rounded-md">
                                Calidad Premium
                            </span>
                            <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
                                {product.nombre}
                            </h2>
                        </div>

                        {/* Attractive Description */}
                        <p className="text-xs text-slate-600 font-medium leading-relaxed">
                            {displayDescription}
                        </p>

                        {/* Additional Badges with Icons */}
                        <div className="grid grid-cols-2 gap-2 pt-1">
                            <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl border border-slate-200/60 text-[11px] font-bold text-slate-700">
                                <span className="text-sm">🥩</span>
                                <span>Producto fresco</span>
                            </div>
                            <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl border border-slate-200/60 text-[11px] font-bold text-slate-700">
                                <Snowflake className="size-3.5 text-blue-500 shrink-0" />
                                <span>Mantener refrigerado</span>
                            </div>
                            <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl border border-slate-200/60 text-[11px] font-bold text-slate-700">
                                <Flame className="size-3.5 text-amber-500 shrink-0" />
                                <span>Listo para asar</span>
                            </div>
                            <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl border border-slate-200/60 text-[11px] font-bold text-slate-700">
                                <Truck className="size-3.5 text-emerald-600 shrink-0" />
                                <span>Entrega rápida</span>
                            </div>
                        </div>

                        {/* Price & Quantity Selector Section */}
                        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 flex items-center justify-between gap-4 mt-2">
                            {/* Prominent Price */}
                            <div>
                                <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">Precio Unitario</span>
                                <span className="text-2xl font-black text-orange-600 font-mono tracking-tight">
                                    ${unitPrice.toFixed(2)}
                                </span>
                            </div>

                            {/* Modern Quantity Selector */}
                            <div className="flex items-center bg-white rounded-2xl p-1.5 border border-slate-200 shadow-2xs gap-3">
                                <button
                                    type="button"
                                    onClick={handleDecrement}
                                    className="size-9 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl flex items-center justify-center font-black transition-all active:scale-90 cursor-pointer"
                                    title="Disminuir cantidad"
                                >
                                    <Minus className="size-4 stroke-[2.5]" />
                                </button>
                                <span className="text-sm font-mono font-black text-slate-900 min-w-[20px] text-center select-none">
                                    {quantity}
                                </span>
                                <button
                                    type="button"
                                    onClick={handleIncrement}
                                    className="size-9 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl flex items-center justify-center font-black transition-all active:scale-90 cursor-pointer"
                                    title="Aumentar cantidad"
                                >
                                    <Plus className="size-4 stroke-[2.5]" />
                                </button>
                            </div>
                        </div>

                        {/* Total Display */}
                        <div className="flex justify-between items-center px-1 text-xs border-t border-slate-100 pt-3">
                            <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Total Estimado</span>
                            <span className="text-lg font-black text-slate-900 font-mono">${totalPrice.toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                {/* Fixed Sticky Bottom Bar with Main Button */}
                <div className="p-4 bg-white/95 backdrop-blur-md border-t border-slate-200/80 shrink-0 space-y-2">
                    <button
                        type="button"
                        onClick={handleAdd}
                        className="w-full py-4 bg-gradient-to-r from-orange-600 via-orange-500 to-orange-600 hover:from-orange-700 hover:to-orange-600 text-white font-black rounded-2xl text-xs uppercase tracking-widest shadow-xl shadow-orange-600/30 flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
                    >
                        <ShoppingBag className="size-4 stroke-[2.5]" />
                        <span>
                            🛒 AGREGAR {quantity > 1 ? `${quantity} ` : ''}AL CARRITO • ${totalPrice.toFixed(2)}
                        </span>
                    </button>
                </div>
            </div>

            {/* Floating Snackbar Toast */}
            {showToast && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[600] bg-slate-900 text-white px-5 py-3 rounded-2xl text-xs font-black shadow-2xl flex items-center gap-2 border border-slate-800 animate-bounce">
                    <CheckCircle2 className="size-4 text-emerald-400" />
                    <span>{toastMsg}</span>
                </div>
            )}
        </div>
    );
}
