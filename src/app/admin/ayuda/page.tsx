import Link from "next/link";
import { BookOpen, Search, ArrowRight, Layers, Star, HelpCircle, CheckCircle2 } from "lucide-react";
import prisma from "@/lib/prisma";
import { DEFAULT_GUIAS } from "@/app/api/superadmin/guias/route";

export const dynamic = "force-dynamic";

export default async function AdminAyudaPage() {
    let guias = DEFAULT_GUIAS;
    try {
        const config = await prisma.globalConfig.findUnique({
            where: { clave: "GUIAS_PLATAFORMA" }
        });
        if (config?.valor) {
            const parsed = JSON.parse(config.valor);
            if (Array.isArray(parsed) && parsed.length > 0) {
                guias = parsed;
            }
        }
    } catch (e) {
        console.error("Error leyendo guias:", e);
    }

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-16 text-slate-900 font-sans">
            {/* Header Hero */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-950 to-teal-950 rounded-[2.5rem] p-8 md:p-12 text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="relative z-10 max-w-2xl space-y-4">
                    <span className="inline-flex items-center gap-2 px-3 py-1 bg-teal-500/20 text-teal-300 border border-teal-500/30 rounded-full text-[10px] font-black uppercase tracking-widest">
                        <BookOpen size={12} /> Centro de Guías & Documentación
                    </span>
                    <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-tight uppercase italic !text-white text-white drop-shadow-sm">
                        Aprende a configurar tu tienda al 100%
                    </h1>
                    <p className="!text-slate-200 text-slate-200 font-medium text-sm md:text-base leading-relaxed">
                        Encuentra tutoriales paso a paso sobre creación de variantes, gestión de inventario, reseñas verificadas y estrategias de conversión.
                    </p>
                </div>
            </div>

            {/* Listado de Guías */}
            <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                    <div>
                        <h2 className="text-xl font-black text-slate-900 uppercase italic tracking-tight">
                            Guías Oficiales Citiox
                        </h2>
                        <p className="text-xs text-slate-500 font-medium">Actualizadas directamente por el equipo técnico</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {guias.map((guia: any) => (
                        <div
                            key={guia.id || guia.slug}
                            id={guia.slug}
                            className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between space-y-6"
                        >
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="px-3 py-1 bg-teal-50 text-teal-700 text-[10px] font-black uppercase tracking-wider rounded-xl border border-teal-200">
                                        {guia.category || "General"}
                                    </span>
                                    <span className="text-[10px] font-semibold text-slate-400">
                                        {guia.updatedAt ? new Date(guia.updatedAt).toLocaleDateString() : "Actualizado"}
                                    </span>
                                </div>

                                <h3 className="text-lg sm:text-xl font-black text-slate-900 leading-snug">
                                    {guia.title}
                                </h3>

                                <p className="text-xs text-slate-600 font-medium leading-relaxed">
                                    {guia.summary}
                                </p>

                                {/* Contenido formateado */}
                                <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200/70 text-xs text-slate-700 space-y-3 whitespace-pre-line leading-relaxed max-h-96 overflow-y-auto custom-scrollbar">
                                    {guia.content}
                                </div>
                            </div>

                            <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                                <span className="text-[11px] font-bold text-teal-600 flex items-center gap-1.5">
                                    <CheckCircle2 size={14} /> Paso a paso verificado
                                </span>
                                <a
                                    href={`https://wa.me/593968118444?text=Hola%20CitiOx,%20tengo%20dudas%20sobre%20la%20guía%20${encodeURIComponent(guia.title)}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-[11px] font-black uppercase text-slate-600 hover:text-teal-600 transition-colors"
                                >
                                    ¿Dudas? Hablar con soporte →
                                </a>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
