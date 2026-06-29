'use client';

import { useState } from 'react';
import { 
    Plus, 
    ArrowLeftRight, 
    Image as ImageIcon, 
    Pencil, 
    Trash2, 
    Sparkles, 
    ChevronRight,
    Search,
    MessageCircle
} from 'lucide-react';
import { cn, getImageUrl } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import Link from 'next/link';

interface MobileResultsProps {
    resultados: any[];
    primaryColor: string;
    onEdit: (item: any) => void;
    onDelete: (id: string) => void;
    onNew: () => void;
}

export default function MobileResults({ resultados, primaryColor, onEdit, onDelete, onNew }: MobileResultsProps) {
    const [filter, setFilter] = useState('ALL');

    const services = Array.from(new Set(resultados.map(r => r.service?.nombre))).filter(Boolean);

    const filtered = resultados.filter(r => {
        if (filter === 'ALL') return true;
        return r.service?.nombre === filter;
    });

    return (
        <>
            <style dangerouslySetInnerHTML={{ __html: `
                .text-slate-900 { color: #0f172a !important; }
                .text-slate-600 { color: #475569 !important; }
                .text-slate-500 { color: #64748b !important; }
                .text-slate-400 { color: #94a3b8 !important; }
                .bg-white { background-color: #ffffff !important; }
            `}} />
            <div className="flex flex-col bg-slate-50 min-h-screen animate-in fade-in duration-500 pb-32">
            {/* Header / Navigation */}
            <div className="sticky top-0 z-30 bg-white border-b border-slate-100 p-5 space-y-5">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-black uppercase italic tracking-tighter text-slate-900">
                        Nuestros <span style={{ color: primaryColor }}>Resultados</span>
                    </h2>
                    <div className="flex items-center gap-3">
                        <Link 
                            href="/admin/resultados/comentarios"
                            className="size-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 border border-slate-100 relative"
                        >
                            <MessageCircle size={18} />
                            <div className="absolute -top-1 -right-1 size-4 bg-rose-500 rounded-full border-2 border-white animate-pulse" />
                        </Link>
                        <button 
                            onClick={onNew}
                            className="size-10 rounded-xl flex items-center justify-center text-white shadow-lg shadow-cyan-500/20 active:scale-90 transition-all"
                            style={{ backgroundColor: primaryColor }}
                        >
                            <Plus size={24} strokeWidth={3} />
                        </button>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex gap-2 overflow-x-auto hide-scrollbar -mx-5 px-5">
                    <button 
                        onClick={() => setFilter('ALL')}
                        className={cn(
                            "px-5 py-2.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                            filter === 'ALL' ? "text-white shadow-lg" : "bg-white text-slate-400 border border-slate-100"
                        )}
                        style={filter === 'ALL' ? { backgroundColor: primaryColor } : {}}
                    >
                        Ver Todo
                    </button>
                    {services.map((s: any) => (
                        <button 
                            key={s}
                            onClick={() => setFilter(s)}
                            className={cn(
                                "px-5 py-2.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                                filter === s ? "text-white shadow-lg" : "bg-white text-slate-400 border border-slate-100"
                            )}
                            style={filter === s ? { backgroundColor: primaryColor } : {}}
                        >
                            {s}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            <div className="p-5 grid grid-cols-1 gap-6">
                {filtered.map((item) => (
                    <div 
                        key={item.id}
                        className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden animate-in zoom-in-95 duration-500"
                    >
                        <div className="relative aspect-[16/10]">
                            {item.type === 'BEFORE_AFTER' ? (
                                <div className="flex h-full w-full overflow-hidden">
                                    <div className="relative flex-1 h-full border-r border-white/30">
                                        <img 
                                            src={item.beforeImage} 
                                            className="w-full h-full object-cover" 
                                            alt="Antes" 
                                        />
                                        <div className="absolute bottom-3 left-3 px-2 py-1 bg-black/40 backdrop-blur-md rounded-lg border border-white/20">
                                            <span className="text-[8px] font-black text-white uppercase tracking-tighter">Antes</span>
                                        </div>
                                    </div>
                                    <div className="relative flex-1 h-full">
                                        <img 
                                            src={item.afterImage} 
                                            className="w-full h-full object-cover" 
                                            alt="Después" 
                                        />
                                        <div className="absolute bottom-3 right-3 px-2 py-1 bg-white/40 backdrop-blur-md rounded-lg border border-white/20">
                                            <span className="text-[8px] font-black text-slate-900 uppercase tracking-tighter">Después</span>
                                        </div>
                                    </div>
                                    {/* Divider Icon */}
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                        <div className="size-8 bg-white rounded-full shadow-2xl border-4 border-slate-50 flex items-center justify-center text-slate-900">
                                            <ArrowLeftRight size={14} strokeWidth={3} />
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <img 
                                    src={(Array.isArray(item.gallery) && item.gallery.length > 0) ? item.gallery[0] : (item.galleryUrls ? item.galleryUrls.split(',')[0] : (item.afterImage || ''))} 
                                    className="w-full h-full object-cover"
                                    alt={item.title}
                                />
                            )}
                            
                            <div className="absolute top-4 left-4 flex flex-col gap-2">
                                <div className="bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest text-slate-900 flex items-center gap-2 border border-white">
                                    {item.type === 'BEFORE_AFTER' ? <Sparkles size={10} style={{ color: primaryColor }} /> : <ImageIcon size={10} className="text-blue-500" />}
                                    {item.type === 'BEFORE_AFTER' ? 'Comparativa' : 'Galería'}
                                </div>
                                {item.featured && (
                                    <div className="bg-amber-400 size-7 rounded-lg text-white shadow-lg flex items-center justify-center">
                                        <Sparkles size={12} />
                                    </div>
                                )}
                            </div>

                            <div className="absolute bottom-4 right-4 flex gap-2">
                                <button 
                                    onClick={() => onEdit(item)}
                                    className="size-10 bg-white/90 backdrop-blur-md text-slate-900 rounded-2xl flex items-center justify-center shadow-xl active:scale-90 transition-all border border-white"
                                >
                                    <Pencil size={18} />
                                </button>
                                <button 
                                    onClick={() => onDelete(item.id)}
                                    className="size-10 bg-rose-500/90 backdrop-blur-md text-white rounded-2xl flex items-center justify-center shadow-xl active:scale-90 transition-all border border-rose-400"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: primaryColor }}>
                                    {item.service?.nombre}
                                </span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase italic">
                                    {format(new Date(item.date), "dd MMM yyyy", { locale: es })}
                                </span>
                            </div>
                            
                            <div>
                                <h4 className="text-xl font-black text-slate-900 uppercase italic leading-none tracking-tighter">{item.title}</h4>
                                <p className="mt-3 text-[13px] text-slate-600 line-clamp-3 italic leading-relaxed font-medium">"{item.description}"</p>
                            </div>

                            <div className="pt-5 border-t border-slate-100 flex items-center gap-3">
                                <div className="size-10 bg-slate-900 rounded-xl flex items-center justify-center overflow-hidden shadow-lg shadow-slate-200">
                                    {(item.staff?.imageMedia || item.staff?.avatar) ? (
                                        <img src={getImageUrl(item.staff.imageMedia || item.staff.avatar, 'thumb')} className="w-full h-full object-cover" />
                                    ) : (
                                        <ImageIcon size={18} className="text-white" />
                                    )}
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Especialista</span>
                                    <span className="text-sm font-black text-slate-900 italic uppercase">{item.staff?.name || 'Varios'}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
        </>
    );
}
