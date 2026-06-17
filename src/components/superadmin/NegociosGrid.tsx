"use client";

import { useState } from "react";
import {
    Filter,
    Search,
    Plus,
    Building2,
    ArrowUpDown,
    X
} from "lucide-react";
import Link from "next/link";
import NegocioActions from "./NegocioActions";
import NegocioModal from "./NegocioModal";

export default function NegociosGrid({ initialNegocios }: { initialNegocios: any[] }) {
    const [negocios, setNegocios] = useState(initialNegocios);
    const [search, setSearch] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedNegocio, setSelectedNegocio] = useState<any>(null);

    const filteredNegocios = negocios.filter(n =>
        n.nombre.toLowerCase().includes(search.toLowerCase()) ||
        n.slug.toLowerCase().includes(search.toLowerCase())
    );

    const handleEdit = (negocio: any) => {
        setSelectedNegocio(negocio);
        setIsModalOpen(true);
    };

    const handleCreate = () => {
        setSelectedNegocio(null);
        setIsModalOpen(true);
    };

    const getStatusColor = (estado: string) => {
        switch (estado) {
            case 'ACTIVO': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'SUSPENDIDO': return 'bg-rose-100 text-rose-700 border-rose-200';
            case 'PRUEBA': return 'bg-amber-100 text-amber-700 border-amber-200';
            case 'VENCIDO': return 'bg-slate-100 text-slate-700 border-slate-200';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    return (
        <div className="space-y-8 lg:space-y-12 animate-in fade-in duration-700 pb-20 lg:pb-0">
            {/* Header / Actions - APP STYLE */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="h-1 w-6 bg-emerald-500 rounded-full" />
                        <span className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.4em] italic leading-none">Management</span>
                    </div>
                    <h2 className="text-4xl lg:text-5xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic leading-none">Negocios</h2>
                    <p className="text-slate-400 font-medium text-sm lg:text-base">Control total sobre los complejos de la red.</p>
                </div>
                
                <div className="grid grid-cols-2 lg:flex items-center gap-3">
                    <button className="flex items-center justify-center gap-2 px-5 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-2xl text-slate-600 dark:text-slate-400 font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm active:scale-95">
                        <Filter size={16} strokeWidth={2.5} />
                        Filtros
                    </button>
                    <button
                        onClick={handleCreate}
                        className="flex items-center justify-center gap-2 px-5 py-4 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-500/20 active:scale-95"
                    >
                        <Plus size={18} strokeWidth={3} />
                        Nuevo
                    </button>
                </div>
            </div>

            {/* Buscador Premium - ESTILO APPLE/SAAS */}
            <div className="relative group max-w-4xl">
                {/* Glow Effect */}
                <div className="absolute inset-0 bg-emerald-500/5 rounded-[2rem] blur-2xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-700" />
                
                <div className="relative flex items-center">
                    <div className="absolute left-9 text-slate-400 group-focus-within:text-emerald-500 transition-all duration-500 z-20">
                        <Search size={22} strokeWidth={3} />
                    </div>
                    
                    <input
                        type="text"
                        placeholder="Buscar por nombre, complejo o ciudad..."
                        className="w-full !pl-24 pr-16 py-6 bg-white dark:bg-slate-900/50 backdrop-blur-xl border border-slate-100 dark:border-white/5 rounded-[2rem] focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500/30 transition-all font-bold text-slate-800 dark:text-white shadow-xl dark:shadow-none text-lg placeholder:text-slate-300 dark:placeholder:text-slate-700 italic tracking-tight"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />

                    {/* Botón de limpiar opcional si hay texto */}
                    {search && (
                         <button 
                            onClick={() => setSearch("")}
                            className="absolute right-6 size-8 bg-slate-100 dark:bg-white/5 hover:bg-rose-500 hover:text-white rounded-xl flex items-center justify-center transition-all animate-in zoom-in-75 duration-300 group/clear"
                         >
                            <X size={14} strokeWidth={3} className="group-hover:rotate-90 transition-transform" />
                         </button>
                    )}
                </div>

                {/* Decorative bar */}
                <div className="absolute -bottom-px left-10 right-10 h-[2px] bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent scale-x-0 group-focus-within:scale-x-100 transition-transform duration-700" />
            </div>

            {/* Vista Responsiva de Negocios */}
            <div className="lg:hidden space-y-4">
                {filteredNegocios.map((negocio) => (
                    <div key={negocio.id} className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 border border-slate-100 dark:border-white/5 shadow-lg active:scale-[0.98] transition-all relative overflow-hidden group">
                        <Link href={`/superadmin/negocios/${negocio.id}`} className="flex items-center gap-5">
                            <div className="size-16 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-2xl flex items-center justify-center text-white font-black text-2xl italic shadow-lg shadow-emerald-500/20 group-hover:scale-110 transition-transform">
                                {negocio.nombre.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 space-y-1">
                                <h4 className="font-black text-slate-900 dark:text-white uppercase italic tracking-tight text-lg leading-tight">{negocio.nombre}</h4>
                                <div className="flex items-center gap-2">
                                    <span className={`px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest ${getStatusColor(negocio.estado)}`}>
                                        {negocio.estado}
                                    </span>
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{negocio.ciudad}</span>
                                </div>
                            </div>
                        </Link>
                        
                        <div className="mt-6 flex items-center justify-between pt-6 border-t border-slate-50 dark:border-white/5">
                            <div className="flex gap-4">
                                <div className="text-center">
                                    <div className="text-base font-black text-slate-900 dark:text-white">{negocio._count.services}</div>
                                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Servicios</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-base font-black text-slate-900 dark:text-white">{negocio._count.appointments}</div>
                                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Citas</div>
                                </div>
                            </div>
                            <NegocioActions negocio={negocio} onEdit={() => handleEdit(negocio)} />
                        </div>
                    </div>
                ))}
            </div>

            {/* Tabla para Desktop */}
            <div className="hidden lg:block bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-50 dark:border-white/5 shadow-[0_40px_100px_-30px_rgba(0,0,0,0.05)] overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 dark:bg-white/[0.01] border-b border-slate-100 dark:border-white/5">
                                <th className="px-10 py-8 text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] italic">Complejo</th>
                                <th className="px-8 py-8 text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] italic">Ciudad</th>
                                <th className="px-8 py-8 text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] italic text-center">Stats</th>
                                <th className="px-8 py-8 text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] italic">Status</th>
                                <th className="px-10 py-8 text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] italic text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-white/[0.02]">
                            {filteredNegocios.map((negocio) => (
                                <tr key={negocio.id} className="hover:bg-slate-50/70 dark:hover:bg-white/[0.02] transition-all group">
                                    <td className="px-10 py-8">
                                        <div className="flex items-center gap-6">
                                            <div className="size-16 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-[1.5rem] flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-emerald-500/10 group-hover:scale-110 transition-transform uppercase italic">
                                                {negocio.nombre.charAt(0)}
                                            </div>
                                            <div className="space-y-1">
                                                <Link
                                                    href={`/superadmin/negocios/${negocio.id}`}
                                                    className="font-black text-slate-900 dark:text-white text-xl leading-tight uppercase tracking-tighter hover:text-emerald-500 transition-colors cursor-pointer italic"
                                                >
                                                    {negocio.nombre}
                                                </Link>
                                                <div className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] opacity-60">slug/{negocio.slug}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-8">
                                        <div className="text-base font-black text-slate-800 dark:text-slate-200 uppercase italic tracking-tight">{negocio.ciudad || 'N/A'}</div>
                                        <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{negocio.direccion?.substring(0, 30)}...</div>
                                    </td>
                                    <td className="px-8 py-8">
                                        <div className="flex items-center justify-center gap-6">
                                            <div className="text-center">
                                                <div className="text-xl font-black text-slate-900 dark:text-white italic">{negocio._count.services}</div>
                                                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Servicios</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-xl font-black text-slate-900 dark:text-white italic">{negocio._count.appointments}</div>
                                                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Citas</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-8">
                                        <span className={`px-5 py-2.5 rounded-2xl text-[10px] font-black border uppercase tracking-[0.2em] shadow-sm ${getStatusColor(negocio.estado)}`}>
                                            {negocio.estado}
                                        </span>
                                    </td>
                                    <td className="px-10 py-8 text-right">
                                        <NegocioActions negocio={negocio} onEdit={() => handleEdit(negocio)} />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <NegocioModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                negocio={selectedNegocio}
            />
        </div>
    );
}
