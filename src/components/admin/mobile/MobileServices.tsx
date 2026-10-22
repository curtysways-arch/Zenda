'use client';

import { useState } from 'react';
import { 
    Plus, 
    Scissors, 
    Clock, 
    DollarSign, 
    ChevronRight, 
    Search,
    MoreVertical,
    Star,
    Zap,
    Users
} from 'lucide-react';
import { cn, getImageUrl } from '@/lib/utils';

interface MobileServicesProps {
    services: any[];
    primaryColor: string;
    onNew: () => void;
    onEdit: (service: any) => void;
    onImport?: () => void;
}

export default function MobileServices({ services, primaryColor, onNew, onEdit, onImport }: MobileServicesProps) {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredServices = services.filter(s => 
        s.nombre.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="flex flex-col min-h-screen bg-slate-50 animate-in fade-in duration-500 pb-24">
            {/* Header */}
            <div className="sticky top-0 z-30 bg-white border-b border-slate-100 p-6 space-y-6">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 tracking-tight ">Servicios</h2>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide ">Gestiona tus tratamientos</p>
                    </div>
                    <div className="flex items-center gap-2">
                        {onImport && (
                            <button 
                                onClick={onImport}
                                className="size-12 rounded-2xl bg-sky-50 text-sky-700 border border-sky-200/80 shadow-xs flex items-center justify-center active:scale-90 transition-all"
                                title="Importar servicios desde archivo"
                            >
                                <Zap size={20} />
                            </button>
                        )}
                        <button 
                            onClick={onNew}
                            className="size-12 rounded-2xl text-white shadow-xl flex items-center justify-center active:scale-90 transition-all"
                            style={{ backgroundColor: primaryColor }}
                        >
                            <Plus size={24} strokeWidth={3} />
                        </button>
                    </div>
                </div>

                <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <input 
                        type="text"
                        placeholder="BUSCAR SERVICIO..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 pl-12 pr-4 text-xs font-bold uppercase tracking-wide focus:outline-none focus:ring-2 transition-all shadow-inner"
                        style={{ '--tw-ring-color': primaryColor } as any}
                    />
                </div>
            </div>

            {/* List */}
            <div className="p-6 space-y-4">
                {filteredServices.length > 0 ? filteredServices.map((service) => (
                    <div 
                        key={service.id}
                        onClick={() => onEdit(service)}
                        className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm active:scale-[0.98] transition-all group overflow-hidden relative"
                    >
                        {/* Background Decoration */}
                        <div className="absolute top-0 right-0 w-24 h-24 rounded-full blur-[40px] -mr-12 -mt-12" style={{ backgroundColor: primaryColor, opacity: 0.05 }} />
                        
                        <div className="flex gap-4">
                            {/* Image Placeholder or Actual Image */}
                            <div className="size-20 rounded-3xl bg-slate-50 border border-slate-100 flex items-center justify-center overflow-hidden shrink-0">
                                {(service.imageMedia || service.imagenes?.[0]?.url) ? (
                                    <img src={getImageUrl(service.imageMedia || service.imagenes?.[0]?.url, 'thumb')} alt={service.nombre} className="w-full h-full object-cover" />
                                ) : (
                                    <Scissors size={24} className="text-slate-200" />
                                )}
                            </div>

                            <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                                <div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold uppercase tracking-wide " style={{ color: primaryColor }}>{service.tipo}</span>
                                        <div className="flex items-center gap-1">
                                            <Zap size={10} className="text-amber-400 fill-amber-400" />
                                            <span className="text-xs font-bold text-slate-300 uppercase">Premium</span>
                                        </div>
                                    </div>
                                    <h3 className="text-base font-bold text-slate-900 uppercase leading-tight truncate mt-1">
                                        {service.nombre}
                                    </h3>
                                </div>

                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-lg">
                                        <Clock size={12} className="text-slate-300" />
                                        <span className="text-xs font-bold text-slate-600 uppercase tracking-tight">
                                            {service.extraInfo?.tiempoEntrega || `${service.duracion} MIN`}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1.5 bg-slate-900 px-3 py-1 rounded-lg">
                                        <DollarSign size={10} className="text-slate-400" />
                                        <span className="text-xs font-bold text-white tracking-tight">{Number(service.precio).toFixed(0)}</span>
                                    </div>
                                </div>

                                {service.Staff && service.Staff.length > 0 && (
                                    <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-slate-50 text-xs text-slate-500 font-bold">
                                        <Users size={12} className="text-slate-400 shrink-0" />
                                        <span className="truncate">
                                            {service.Staff.length === 1 ? service.Staff[0].name : `${service.Staff.length} especialistas`}
                                        </span>
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center">
                                <ChevronRight size={20} className="text-slate-200 group-active:text-slate-900 transition-colors" />
                            </div>
                        </div>

                        {!service.estaActivo && (
                            <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center z-10">
                                <span className="bg-slate-900 text-white px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide shadow-xl">Desactivado</span>
                            </div>
                        )}
                    </div>
                )) : (
                    <div className="py-20 flex flex-col items-center justify-center text-center space-y-4">
                        <div className="size-20 rounded-full bg-slate-100 flex items-center justify-center text-slate-300">
                            <Search size={32} />
                        </div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide ">No se encontraron servicios</p>
                    </div>
                )}
            </div>
        </div>
    );
}
