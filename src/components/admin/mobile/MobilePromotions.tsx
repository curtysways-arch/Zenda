'use client';

import { useState } from 'react';
import { 
    Plus, 
    Tags, 
    Share2, 
    Trash2, 
    Edit, 
    ChevronRight, 
    Search,
    MoreVertical,
    Zap,
    Calendar,
    DollarSign
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface MobilePromotionsProps {
    promotions: any[];
    primaryColor: string;
    onNew: () => void;
    onEdit: (promo: any) => void;
    onShare: (promo: any) => void;
    onDelete: (id: string) => void;
    onToggleStatus: (promo: any) => void;
}

export default function MobilePromotions({ 
    promotions, 
    primaryColor, 
    onNew, 
    onEdit, 
    onShare, 
    onDelete, 
    onToggleStatus 
}: MobilePromotionsProps) {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredPromotions = promotions.filter(p => 
        p.titulo.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="flex flex-col min-h-screen bg-slate-50 animate-in fade-in duration-500 pb-24">
            {/* Header */}
            <div className="sticky top-0 z-30 bg-white border-b border-slate-100 p-6 space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic">Promociones</h2>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Impulsa tus ventas</p>
                    </div>
                    <button 
                        onClick={onNew}
                        className="size-12 rounded-2xl text-white shadow-xl flex items-center justify-center active:scale-90 transition-all"
                        style={{ backgroundColor: primaryColor }}
                    >
                        <Plus size={24} strokeWidth={3} />
                    </button>
                </div>

                <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <input 
                        type="text"
                        placeholder="BUSCAR PROMOCIÓN..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 pl-12 pr-4 text-xs font-black uppercase tracking-widest focus:outline-none focus:ring-2 transition-all shadow-inner"
                        style={{ '--tw-ring-color': primaryColor } as any}
                    />
                </div>
            </div>

            {/* List */}
            <div className="p-6 space-y-6">
                {filteredPromotions.length > 0 ? filteredPromotions.map((promo) => (
                    <div 
                        key={promo.id}
                        className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-sm active:scale-[0.99] transition-all group relative flex flex-col"
                    >
                        {/* Image Header */}
                        <div className="h-44 bg-slate-50 relative overflow-hidden">
                            {promo.imagenUrl ? (
                                <img src={promo.imagenUrl} alt={promo.titulo} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-200">
                                    <Tags size={48} />
                                </div>
                            )}
                            
                            <div className="absolute top-4 right-4 flex gap-2">
                                <button 
                                    onClick={() => onToggleStatus(promo)}
                                    className={cn(
                                        "px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest shadow-xl backdrop-blur-md transition-all",
                                        promo.estado === 'activa' ? "bg-white text-emerald-600" : "bg-slate-900/40 text-white"
                                    )}
                                    style={promo.estado === 'activa' ? { color: primaryColor } : {}}
                                >
                                    {promo.estado}
                                </button>
                            </div>

                            <div className="absolute bottom-4 left-4 bg-slate-900/60 backdrop-blur-md px-3 py-1.5 rounded-xl flex items-center gap-2">
                                <Share2 size={12} className="text-emerald-400" />
                                <span className="text-[9px] font-black text-white uppercase tracking-widest">{promo.shareCount} compartidos</span>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-6 space-y-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="text-lg font-black text-slate-900 uppercase italic leading-tight">
                                        {promo.titulo}
                                    </h3>
                                    <p className="text-[10px] font-bold text-slate-400 mt-1 line-clamp-1">{promo.descripcion}</p>
                                </div>
                                <button onClick={() => onEdit(promo)} className="size-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                                    <Edit size={16} />
                                </button>
                            </div>

                            <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                <div className="flex flex-col">
                                    <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1 italic">Precio Oferta</span>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-2xl font-black italic tracking-tighter" style={{ color: primaryColor }}>${promo.precioPromo}</span>
                                        {promo.precioAnterior && (
                                            <span className="text-xs text-slate-300 font-bold line-through">${promo.precioAnterior}</span>
                                        )}
                                    </div>
                                </div>
                                <button 
                                    onClick={() => onShare(promo)}
                                    className="px-6 py-3 bg-[#25D366] text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-emerald-100 active:scale-95 transition-all"
                                >
                                    <Share2 size={14} />
                                    WhatsApp
                                </button>
                            </div>

                            <div className="flex items-center justify-between pt-2">
                                <div className="flex items-center gap-2">
                                    <div className="size-6 rounded-lg bg-slate-100 flex items-center justify-center">
                                        <Calendar size={12} className="text-slate-400" />
                                    </div>
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                        {promo.fechaFin ? (
                                            (() => {
                                                const diff = Math.ceil((new Date(promo.fechaFin).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                                                return diff > 0 ? `Vence en ${diff} día${diff === 1 ? '' : 's'}` : 'Vencida';
                                            })()
                                        ) : 'Sin vencimiento'}
                                    </span>
                                </div>
                                <button 
                                    onClick={() => onDelete(promo.id)}
                                    className="text-[9px] font-black text-rose-400 uppercase tracking-widest italic"
                                >
                                    Eliminar Promo
                                </button>
                            </div>
                        </div>
                    </div>
                )) : (
                    <div className="py-20 flex flex-col items-center justify-center text-center space-y-4">
                        <div className="size-20 rounded-full bg-slate-100 flex items-center justify-center text-slate-300">
                            <Tags size={32} />
                        </div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">No hay promociones activas</p>
                    </div>
                )}
            </div>
        </div>
    );
}
