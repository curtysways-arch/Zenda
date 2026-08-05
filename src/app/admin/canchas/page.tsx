'use client';

import { useEffect, useState } from 'react';
import { Plus, Dribbble, Users, CheckCircle2, ChevronRight, Loader2 } from 'lucide-react';
import CanchaForm from '@/components/admin/CanchaForm';
import { useSession } from 'next-auth/react';

export default function CanchasAdminPage() {
    const { data: session } = useSession();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [canchas, setCanchas] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCancha, setSelectedCancha] = useState<any>(null);

    const fetchCanchas = async () => {
        try {
            const negocioId = (session?.user as any)?.negocioId;
            const res = await fetch(`/api/canchas?negocioId=${negocioId || ''}`);
            const data = await res.json();
            if (Array.isArray(data)) {
                setCanchas(data);
            }
        } catch (error) {
            console.error('Error fetching canchas:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCanchas();
    }, [session]);

    const handleEdit = (cancha: any) => {
        setSelectedCancha(cancha);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedCancha(null);
    };

    if (loading) {
        return (
            <div className="h-96 flex flex-col items-center justify-center text-slate-400 gap-4">
                <Loader2 className="animate-spin text-emerald-500" size={40} />
                <p className="font-bold text-xs uppercase tracking-widest animate-pulse">Cargando tus canchas...</p>
            </div>
        );
    }

    return (
        <div className="p-6 md:p-10 space-y-8 max-w-7xl mx-auto font-sans">
            {isModalOpen && (
                <CanchaForm
                    key={selectedCancha?.id || 'new'}
                    initialData={selectedCancha}
                    onClose={handleCloseModal}
                    onSuccess={fetchCanchas}
                />
            )}

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 border-b border-slate-200 pb-6">
                <div>
                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest block mb-1">
                        Gestión de Infraestructura
                    </span>
                    <h1 className="text-3xl font-black text-slate-900 uppercase italic tracking-tight">Mis Canchas</h1>
                    <p className="text-slate-500 font-bold text-xs">Administra tus escenarios deportivos y tarifas.</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all duration-300 shadow-lg shadow-emerald-500/20 active:scale-95"
                >
                    <Plus size={18} />
                    NUEVA CANCHA
                </button>
            </div>

            {canchas.length === 0 ? (
                <div className="bg-white rounded-[2.5rem] p-16 border-2 border-dashed border-slate-200 flex flex-col items-center text-center space-y-4">
                    <div className="size-20 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-300 border border-slate-100">
                        <Dribbble size={40} />
                    </div>
                    <div className="space-y-1">
                        <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tight">No tienes canchas registradas</h3>
                        <p className="text-slate-500 text-xs font-bold max-w-xs mx-auto">Comienza agregando tu primera cancha para recibir reservas.</p>
                    </div>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black transition shadow-md"
                    >
                        Registrar Primera Cancha
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {canchas.map((cancha) => (
                        <div key={cancha.id} className="group bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 flex flex-col justify-between">
                            <div className="h-44 bg-slate-900 flex items-center justify-center relative overflow-hidden">
                                {cancha.imagenes && cancha.imagenes.length > 0 ? (
                                    <img
                                        src={cancha.imagenes[0].url}
                                        alt={cancha.nombre}
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                    />
                                ) : (
                                    <Dribbble size={64} className="text-slate-700 group-hover:text-emerald-500 group-hover:scale-110 transition-all duration-700" />
                                )}
                                <div className="absolute top-4 right-4 flex items-center gap-1.5 text-emerald-400 bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-full text-[10px] font-black border border-emerald-500/30 uppercase tracking-widest">
                                    <div className="size-2 bg-emerald-400 rounded-full animate-pulse" />
                                    ACTIVA
                                </div>
                            </div>
                            <div className="p-6 space-y-6 flex-1 flex flex-col justify-between">
                                <div className="space-y-1">
                                    <h3 className="font-black text-slate-900 text-xl tracking-tight leading-none group-hover:text-emerald-600 transition-colors uppercase italic">{cancha.nombre}</h3>
                                    <span className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] block">{cancha.tipo}</span>
                                </div>

                                <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                                    <div className="flex items-center gap-2">
                                        <Users size={16} className="text-slate-400" />
                                        <span className="text-xs font-bold text-slate-600">{cancha.capacidad || 4} pers.</span>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-lg font-black text-slate-900">${Number(cancha.precioHora || 25000).toLocaleString()}</span>
                                        <span className="text-[10px] text-slate-400 font-bold block">/ turno</span>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-slate-100 flex gap-3">
                                    <button
                                        onClick={() => handleEdit(cancha)}
                                        className="flex-1 bg-slate-900 hover:bg-emerald-600 text-white font-black py-3.5 rounded-2xl text-xs uppercase tracking-widest transition-all duration-300 shadow-md"
                                    >
                                        Editar Cancha
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
