import React from 'react';
import { ShoppingBag, Plus, Minus, Trash2, ArrowRight, Tag, PlusCircle, AlertCircle } from 'lucide-react';
import { PinchoCartItem } from '../services/pinchoCartService';

interface Step1Props {
    items: PinchoCartItem[];
    onUpdateQuantity: (productId: string, delta: number) => void;
    onRemoveItem: (productId: string) => void;
    onContinue: () => void;
    onBackToCatalog?: () => void;
    couponCode: string;
    setCouponCode: (code: string) => void;
    minOrderAmount?: number;
    primaryColor?: string;
}

export default function Step1PinchoCart({
    items,
    onUpdateQuantity,
    onRemoveItem,
    onContinue,
    onBackToCatalog,
    couponCode,
    setCouponCode,
    minOrderAmount = 0,
    primaryColor = '#ff6b2b'
}: Step1Props) {
    const subtotal = items.reduce((acc, i) => acc + (i.product.precio * i.quantity), 0);
    const amountNeededForMin = minOrderAmount > 0 ? Math.max(0, minOrderAmount - subtotal) : 0;
    const isMinAmountMet = amountNeededForMin === 0;

    if (items.length === 0) {
        return (
            <div className="bg-white rounded-3xl p-8 border border-slate-200/80 text-center space-y-4 shadow-sm max-w-lg mx-auto font-sans">
                <div className="size-16 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                    <ShoppingBag className="size-8" />
                </div>
                <h3 className="text-lg font-black text-slate-900">Tu carrito está vacío</h3>
                <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                    Explora nuestro menú y añade tus pinchos favoritos para iniciar tu pedido.
                </p>
                {onBackToCatalog && (
                    <button
                        type="button"
                        onClick={onBackToCatalog}
                        className="px-5 py-3 bg-orange-600 hover:bg-orange-700 text-white font-black rounded-xl text-xs uppercase tracking-wider shadow-md transition-all cursor-pointer"
                    >
                        Ver Menú de Productos
                    </button>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-5 max-w-xl mx-auto text-left font-sans">
            {/* Warning Banner if Min Order Amount not met */}
            {!isMinAmountMet && (
                <div className="bg-amber-50 border border-amber-200/90 rounded-2xl p-4 flex items-start gap-3 shadow-2xs">
                    <AlertCircle className="size-5 text-amber-600 shrink-0 mt-0.5" />
                    <div className="text-xs space-y-0.5">
                        <span className="font-black text-amber-950 block uppercase tracking-wider text-[11px]">
                            Pedido Mínimo: ${minOrderAmount.toFixed(2)}
                        </span>
                        <p className="text-amber-800 font-medium">
                            Tu subtotal es de <strong>${subtotal.toFixed(2)}</strong>. Agrega <strong>${amountNeededForMin.toFixed(2)}</strong> más en productos para poder continuar.
                        </p>
                    </div>
                </div>
            )}

            {/* Encabezado y Productos */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-3">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                    <span className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                        <ShoppingBag className="size-4 text-orange-600" />
                        <span>Productos Seleccionados</span>
                    </span>
                    <span className="text-xs font-mono font-black text-orange-600 bg-orange-50 px-2.5 py-1 rounded-xl">
                        {items.reduce((a, b) => a + b.quantity, 0)} ítems
                    </span>
                </div>

                {/* Lista de Productos */}
                <div className="divide-y divide-slate-100">
                    {items.map((item) => (
                        <div key={item.product.id} className="py-3.5 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                                {item.product.imagenUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img 
                                        src={item.product.imagenUrl} 
                                        alt={item.product.nombre} 
                                        className="size-14 rounded-2xl object-cover border border-slate-200/60 shrink-0 bg-slate-100" 
                                    />
                                ) : (
                                    <div className="size-14 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center font-black shrink-0 text-sm">
                                        🍢
                                    </div>
                                )}
                                <div className="min-w-0">
                                    <h4 className="text-xs font-black text-slate-900 truncate">{item.product.nombre}</h4>
                                    <span className="text-[11px] font-bold text-slate-500 block">
                                        ${item.product.precio.toFixed(2)} c/u
                                    </span>
                                    <span className="text-xs font-black text-orange-600 font-mono">
                                        Subtotal: ${(item.product.precio * item.quantity).toFixed(2)}
                                    </span>
                                </div>
                            </div>

                            {/* Controles de Cantidad */}
                            <div className="flex items-center gap-2 shrink-0">
                                <div className="flex items-center bg-slate-100 rounded-2xl p-1 gap-2 border border-slate-200/80">
                                    <button
                                        type="button"
                                        onClick={() => onUpdateQuantity(item.product.id, -1)}
                                        className="size-8 bg-white hover:bg-slate-200 text-slate-800 rounded-xl flex items-center justify-center shadow-xs active:scale-95 transition-transform cursor-pointer"
                                        title="Disminuir"
                                    >
                                        <Minus className="size-3.5 stroke-[2.5]" />
                                    </button>
                                    <span className="text-xs font-mono font-black text-slate-900 min-w-[18px] text-center">
                                        {item.quantity}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => onUpdateQuantity(item.product.id, 1)}
                                        className="size-8 bg-white hover:bg-slate-200 text-slate-800 rounded-xl flex items-center justify-center shadow-xs active:scale-95 transition-transform cursor-pointer"
                                        title="Aumentar"
                                    >
                                        <Plus className="size-3.5 stroke-[2.5]" />
                                    </button>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => onRemoveItem(item.product.id)}
                                    className="p-2 text-rose-500 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl transition-all active:scale-95 cursor-pointer"
                                    title="Eliminar producto"
                                >
                                    <Trash2 className="size-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Botón para Añadir Otro Producto */}
                {onBackToCatalog && (
                    <div className="pt-2 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={onBackToCatalog}
                            className="w-full py-3 bg-orange-50 hover:bg-orange-100 border border-orange-200/80 text-orange-900 font-black rounded-2xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
                        >
                            <PlusCircle className="size-4 text-orange-600" />
                            <span>AÑADIR OTRO PRODUCTO AL CARRITO</span>
                        </button>
                    </div>
                )}
            </div>

            {/* Cupón Opcional */}
            <div className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-sm flex items-center gap-3">
                <Tag className="size-5 text-orange-600 shrink-0" />
                <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    placeholder="Código de cupón o descuento (opcional)"
                    className="w-full text-xs font-bold text-slate-800 placeholder:text-slate-400 bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 focus:outline-none focus:border-orange-500 uppercase"
                />
            </div>

            {/* Resumen del Carrito */}
            <div className="bg-slate-900 text-white rounded-3xl p-5 shadow-xl space-y-4">
                <div className="space-y-1.5 text-xs border-b border-slate-800 pb-3">
                    <div className="flex justify-between text-slate-400 font-semibold">
                        <span>Subtotal Productos</span>
                        <span className="font-mono text-white">${subtotal.toFixed(2)}</span>
                    </div>
                    {minOrderAmount > 0 && (
                        <div className="flex justify-between text-[11px] text-slate-400 font-medium">
                            <span>Pedido Mínimo Requerido</span>
                            <span className="font-mono text-amber-400">${minOrderAmount.toFixed(2)}</span>
                        </div>
                    )}
                    <div className="flex justify-between text-sm font-black text-white pt-2 border-t border-slate-800/80">
                        <span>Total estimado</span>
                        <span className="text-lg font-mono text-orange-400">${subtotal.toFixed(2)}</span>
                    </div>
                </div>

                <button
                    type="button"
                    disabled={!isMinAmountMet}
                    onClick={onContinue}
                    className={`w-full py-4 font-black rounded-2xl text-xs uppercase tracking-widest shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        isMinAmountMet
                            ? 'bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 text-white shadow-orange-600/30 active:scale-[0.98]'
                            : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-80'
                    }`}
                >
                    {isMinAmountMet ? (
                        <>
                            <span>CONTINUAR A DATOS DEL CLIENTE</span>
                            <ArrowRight className="size-4" />
                        </>
                    ) : (
                        <span>FALTAN ${amountNeededForMin.toFixed(2)} PARA EL PEDIDO MÍNIMO</span>
                    )}
                </button>
            </div>
        </div>
    );
}
