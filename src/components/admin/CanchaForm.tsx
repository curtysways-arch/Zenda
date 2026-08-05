'use client';

import { useState } from 'react';
import { X, Dribbble, Users, DollarSign, Loader2 } from 'lucide-react';
import { useSession } from 'next-auth/react';

interface CanchaFormProps {
    onClose: () => void;
    onSuccess: () => void;
    initialData?: any;
}

export default function CanchaForm({ onClose, onSuccess, initialData }: CanchaFormProps) {
    const [loading, setLoading] = useState(false);
    const { data: session } = useSession();

    const [nombre, setNombre] = useState(initialData?.nombre || '');
    const [tipo, setTipo] = useState(initialData?.tipo || 'PÁDEL CRISTAL');
    const [capacidad, setCapacidad] = useState(initialData?.capacidad?.toString() || '4');
    const [precioHora, setPrecioHora] = useState(initialData?.precioHora?.toString() || '25');
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const negocioId = (session?.user as any)?.negocioId;
            const res = await fetch('/api/canchas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nombre,
                    tipo,
                    capacidad,
                    precioHora,
                    negocioId
                }),
            });

            if (res.ok) {
                onSuccess();
                onClose();
            } else {
                const data = await res.json();
                setError(data.error || 'Error al guardar cancha');
            }
        } catch (err) {
            setError('Error de conexión');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-[1000] flex items-center justify-center p-4">
            <div className="bg-white rounded-[2.5rem] p-8 sm:p-10 max-w-lg w-full shadow-2xl border border-slate-100 space-y-6 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="size-10 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center font-bold">
                            <Dribbble className="size-5" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-900 uppercase italic tracking-tight">
                                {initialData ? 'Editar Cancha' : 'Nueva Cancha'}
                            </h2>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                                Registrar espacio deportivo
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors"
                    >
                        <X className="size-5" />
                    </button>
                </div>

                {error && (
                    <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 text-xs font-bold">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                            Nombre de la Cancha
                        </label>
                        <input
                            type="text"
                            required
                            placeholder="Ej: Cancha 1 (Cristal)"
                            value={nombre}
                            onChange={(e) => setNombre(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm font-bold p-4 rounded-2xl focus:outline-none focus:border-emerald-500 transition-all"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                                Tipo de Superficie
                            </label>
                            <select
                                value={tipo}
                                onChange={(e) => setTipo(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm font-bold p-4 rounded-2xl focus:outline-none focus:border-emerald-500 transition-all"
                            >
                                <option value="PÁDEL CRISTAL">PÁDEL CRISTAL</option>
                                <option value="PÁDEL PARED">PÁDEL PARED</option>
                                <option value="FÚTBOL SINTÉTICO">FÚTBOL SINTÉTICO</option>
                                <option value="TENIS POLVO">TENIS POLVO DE LADRILLO</option>
                            </select>
                        </div>

                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                                Capacidad Jugadores
                            </label>
                            <input
                                type="number"
                                required
                                value={capacidad}
                                onChange={(e) => setCapacidad(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm font-bold p-4 rounded-2xl focus:outline-none focus:border-emerald-500 transition-all"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                            Precio por Turno ($ USD)
                        </label>
                        <input
                            type="number"
                            required
                            placeholder="Ej: 25"
                            value={precioHora}
                            onChange={(e) => setPrecioHora(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm font-bold p-4 rounded-2xl focus:outline-none focus:border-emerald-500 transition-all"
                        />
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-black uppercase tracking-widest transition-all"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-[2] py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 className="size-4 animate-spin" /> : 'Guardar Cancha'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
