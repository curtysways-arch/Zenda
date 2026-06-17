'use client';

import { 
    ArrowLeftRight, Image as ImageIcon, 
    Sparkles, User, Calendar,
    Share2, MapPin
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import ResultInteraction from './ResultInteraction';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface PortfolioGridProps {
    items: any[];
    slug: string;
    primaryColor: string;
}

export default function PortfolioGrid({ items, slug, primaryColor }: PortfolioGridProps) {
    const handleShare = async (item: any) => {
        const shareData = {
            title: item.title,
            text: item.description,
            url: window.location.href + '#' + item.id,
        };

        try {
            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                await navigator.clipboard.writeText(shareData.url);
                alert('¡Enlace copiado!');
            }
        } catch (err) {}
    };

    if (items.length === 0) {
        return (
            <div className="py-20 text-center space-y-4">
                <div className="size-20 mx-auto bg-slate-100 rounded-full flex items-center justify-center text-slate-300">
                    <ImageIcon size={32} />
                </div>
                <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">No hay trabajos publicados aún.</p>
            </div>
        );
    }

    return (
        <div className="max-w-xl mx-auto space-y-6 pb-20">
            {items.map((item) => (
                <div key={item.id} id={`trabajo-${item.id}`} className="bg-white border border-slate-100 sm:rounded-[2.5rem] overflow-hidden shadow-xl shadow-slate-200/40 group">
                    {/* Header Premium */}
                    <div className="px-5 py-4 flex items-center justify-between bg-white border-b border-slate-50">
                        <div className="flex items-center gap-3">
                            <div className="size-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100 overflow-hidden shadow-inner">
                                {(item.staff?.imageMedia || item.staff?.avatar) 
                                    ? <img src={(item.staff.imageMedia as any)?.url ?? item.staff.avatar} className="w-full h-full object-cover" /> 
                                    : <User size={18} />}
                            </div>
                            <div className="flex flex-col">
                                <span className="text-sm font-black text-slate-900 leading-none uppercase italic">{item.staff?.name || 'Profesional'}</span>
                                {item.service?.nombre && (
                                    <span className="text-[9px] font-bold mt-0.5 uppercase tracking-widest flex items-center gap-1" style={{ color: primaryColor }}>
                                        <Sparkles size={8} /> {item.service.nombre}
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="flex flex-col items-end">
                            <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Publicado</span>
                            <span className="text-[11px] font-bold text-slate-900 uppercase italic leading-none mt-0.5">
                                {format(new Date(item.createdAt), "dd MMM, yyyy", { locale: es })}
                            </span>
                        </div>
                    </div>

                    {/* Media Area */}
                    <div className="relative aspect-square bg-slate-50">
                        {item.type === 'BEFORE_AFTER' ? (
                            <div className="flex w-full h-full relative">
                                <div className="w-1/2 h-full relative border-r border-white/10 overflow-hidden">
                                    <img src={item.beforeImage} className="w-full h-full object-cover grayscale-[0.2]" alt="Antes" />
                                    <div className="absolute top-3 left-3 px-2 py-1 bg-black/40 backdrop-blur-md text-[8px] font-black text-white uppercase tracking-widest rounded border border-white/10">Antes</div>
                                </div>
                                <div className="w-1/2 h-full relative overflow-hidden">
                                    <img src={item.afterImage} className="w-full h-full object-cover" alt="Después" />
                                    <div className="absolute top-3 right-3 px-2 py-1 bg-white/90 backdrop-blur-md text-[8px] font-black text-slate-900 uppercase tracking-widest rounded shadow-md">Después</div>
                                </div>
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-10 rounded-full bg-white shadow-xl flex items-center justify-center text-slate-900 z-10 group-hover:scale-110 transition-transform duration-500">
                                    <ArrowLeftRight size={16} />
                                </div>
                            </div>
                        ) : (
                            <div className="w-full h-full relative overflow-hidden">
                                <div className="flex h-full overflow-x-auto snap-x snap-mandatory hide-scrollbar">
                                    {(item.gallery || []).map((imgUrl: string, idx: number) => (
                                        <div key={idx} className="w-full h-full shrink-0 snap-center relative">
                                            <img src={imgUrl} className="w-full h-full object-cover" alt={`Gallery ${idx + 1}`} />
                                            <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/20 pointer-events-none" />
                                        </div>
                                    ))}
                                </div>
                                {(item.gallery || []).length > 1 && (
                                    <div className="absolute top-3 right-3 px-3 py-1.5 bg-black/40 backdrop-blur-md text-white rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 border border-white/10 shadow-md">
                                        <ImageIcon size={12} /> {item.gallery.length} Fotos
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Content Details Area */}
                    <div className="p-5">
                        <div className="flex items-start justify-between gap-3 mb-4">
                            <div>
                                <h3 className="text-xl font-black text-slate-900 leading-tight mb-1 uppercase tracking-tighter italic">{item.title}</h3>
                                {item.clientName && (
                                    <div className="flex items-center gap-1.5 text-slate-400">
                                        <User size={12} />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Para: {item.clientName}</span>
                                    </div>
                                )}
                            </div>
                            <button 
                                onClick={() => handleShare(item)} 
                                className="size-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors shrink-0"
                            >
                                <Share2 size={16} />
                            </button>
                        </div>

                        {item.description && (
                            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 relative">
                                <p className="text-sm font-medium text-slate-600 leading-snug italic">
                                    "{item.description}"
                                </p>
                            </div>
                        )}

                        {/* Componente de Interacción Social */}
                        <ResultInteraction 
                            resultadoId={item.id} 
                            businessSlug={slug} 
                            initialLikes={item.likesCount || 0}
                        />
                    </div>
                </div>
            ))}
        </div>
    );
}

