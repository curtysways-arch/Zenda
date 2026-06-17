
"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, Calendar, FileText, Save, Loader2 } from "lucide-react";
import Link from "next/link";

export default function NewClassPage() {
    const params = useParams();
    const courseId = params.courseId as string;
    const router = useRouter();

    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        class_date: new Date().toISOString().split('T')[0]
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch(`/api/profesor/cursos/${courseId}/clases`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });
            if (res.ok) {
                router.push(`/profesor/cursos/${courseId}/clases`);
                router.refresh();
            } else {
                alert("Error al crear la clase");
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-4">
                <Link 
                    href={`/profesor/cursos/${courseId}/clases`}
                    className="inline-flex items-center gap-2 text-slate-400 font-bold text-[10px] uppercase tracking-widest hover:text-emerald-600 transition-colors"
                >
                    <ChevronLeft size={14} /> Volver a clases
                </Link>
                <h1 className="text-4xl font-black uppercase tracking-tighter">Nueva Clase</h1>
            </div>

            <form onSubmit={handleSubmit} className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-200/50 space-y-8">
                <div className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">Título de la clase</label>
                        <div className="relative">
                            <span className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300">
                                <FileText size={20} />
                            </span>
                            <input
                                type="text"
                                required
                                placeholder="Ej: Control de balón"
                                className="w-full pl-14 pr-6 py-5 bg-slate-50 border-none rounded-3xl font-bold focus:ring-4 focus:ring-emerald-500/10 transition-all outline-none"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">Descripción (Opcional)</label>
                        <textarea
                            placeholder="Detalles sobre qué se trabajará en esta clase..."
                            className="w-full p-6 bg-slate-50 border-none rounded-3xl font-bold focus:ring-4 focus:ring-emerald-500/10 transition-all outline-none min-h-[120px]"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">Fecha de la clase</label>
                        <div className="relative">
                            <span className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300">
                                <Calendar size={20} />
                            </span>
                            <input
                                type="date"
                                required
                                className="w-full pl-14 pr-6 py-5 bg-slate-50 border-none rounded-3xl font-bold focus:ring-4 focus:ring-emerald-500/10 transition-all outline-none"
                                value={formData.class_date}
                                onChange={(e) => setFormData({ ...formData, class_date: e.target.value })}
                            />
                        </div>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-emerald-600 text-white font-black py-6 rounded-3xl uppercase tracking-widest text-sm shadow-xl shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-3"
                >
                    {loading ? <Loader2 className="animate-spin" /> : <><Save size={18} /> Crear Clase</>}
                </button>
            </form>
        </div>
    );
}
