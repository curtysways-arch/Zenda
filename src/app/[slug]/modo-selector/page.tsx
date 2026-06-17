
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { User, GraduationCap, ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";

export default function ModoSelectorPage() {
    const params = useParams();
    const slug = params.slug as string;
    const router = useRouter();
    const [roles, setRoles] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRoles = async () => {
            try {
                const res = await fetch(`/api/${slug}/perfil`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.roles) {
                        setRoles(data.roles);
                    } else {
                        // Si no hay roles específicos en el perfil, intentamos leer de la sesión
                        // Pero por ahora asumimos que el perfil los trae (necesitamos actualizar /perfil)
                        setRoles(['USER']);
                    }
                }
            } catch (e) {
                console.error("Error fetching roles:", e);
            } finally {
                setLoading(false);
            }
        };
        fetchRoles();
    }, [slug]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <Loader2 className="animate-spin text-emerald-500" size={48} />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f8faf9] flex items-center justify-center p-6">
            <div className="max-w-md w-full space-y-8">
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-black uppercase tracking-tighter">Selecciona Modo</h1>
                    <p className="text-slate-500 font-medium">¿Cómo quieres usar el sistema hoy?</p>
                </div>

                <div className="grid gap-4">
                    {roles.includes('USER') && (
                        <Link 
                            href={`/${slug}/mis-cursos`}
                            className="group p-6 bg-white rounded-3xl border-2 border-slate-100 hover:border-emerald-500 hover:shadow-xl transition-all flex items-center justify-between"
                        >
                            <div className="flex items-center gap-4">
                                <div className="p-4 rounded-2xl bg-blue-50 text-blue-600 group-hover:scale-110 transition-transform">
                                    <User size={24} />
                                </div>
                                <div>
                                    <h2 className="font-black uppercase tracking-tight">Modo Usuario</h2>
                                    <p className="text-xs text-slate-400 font-bold uppercase">Ver mis cursos y reservas</p>
                                </div>
                            </div>
                            <ArrowRight className="text-slate-300 group-hover:text-emerald-500 transition-colors" />
                        </Link>
                    )}

                    {roles.includes('PROFESOR') && (
                        <Link 
                            href={`/profesor`}
                            className="group p-6 bg-white rounded-3xl border-2 border-slate-100 hover:border-emerald-500 hover:shadow-xl transition-all flex items-center justify-between"
                        >
                            <div className="flex items-center gap-4">
                                <div className="p-4 rounded-2xl bg-emerald-50 text-emerald-600 group-hover:scale-110 transition-transform">
                                    <GraduationCap size={24} />
                                </div>
                                <div>
                                    <h2 className="font-black uppercase tracking-tight">Modo Profesor</h2>
                                    <p className="text-xs text-slate-400 font-bold uppercase">Gestionar mis clases y alumnos</p>
                                </div>
                            </div>
                            <ArrowRight className="text-slate-300 group-hover:text-emerald-500 transition-colors" />
                        </Link>
                    )}

                    {(roles.includes('ADMIN_NEGOCIO') || roles.includes('SUPERADMIN')) && (
                        <Link 
                            href={`/admin`}
                            className="group p-6 bg-white rounded-3xl border-2 border-slate-100 hover:border-emerald-500 hover:shadow-xl transition-all flex items-center justify-between"
                        >
                            <div className="flex items-center gap-4">
                                <div className="p-4 rounded-2xl bg-slate-100 text-slate-600 group-hover:scale-110 transition-transform">
                                    <Trophy size={24} />
                                </div>
                                <div>
                                    <h2 className="font-black uppercase tracking-tight">Modo Admin</h2>
                                    <p className="text-xs text-slate-400 font-bold uppercase">Panel de administración</p>
                                </div>
                            </div>
                            <ArrowRight className="text-slate-300 group-hover:text-emerald-500 transition-colors" />
                        </Link>
                    )}
                </div>
            </div>
        </div>
    );
}

function Trophy({ size, className }: { size: number, className?: string }) {
    return <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/><path d="M11.6 16.8c-.8 1-2.2 1.6-3.6 1.6-1.4 0-2.8-.6-3.6-1.6"/><path d="M11.6 16.8c.8-1 2.2-1.6 3.6-1.6s2.8.6 3.6 1.6"/><path d="M11.6 16.8a3 3 0 1 0 5.8 1.6"/></svg>;
}
