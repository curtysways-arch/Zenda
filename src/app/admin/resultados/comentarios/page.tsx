
'use client';

import { useState, useEffect } from 'react';
import { 
    ArrowLeft, Check, X, Trash2, 
    MessageCircle, Loader2, User, 
    Eye, ExternalLink 
} from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function AdminCommentsPage() {
    const [comments, setComments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchComments = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/resultados/social/comments');
            if (res.ok) setComments(await res.json());
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (id: string, approved: boolean) => {
        try {
            const res = await fetch('/api/resultados/social/comments', {
                method: 'PATCH',
                body: JSON.stringify({ id, approved })
            });
            if (res.ok) fetchComments();
        } catch (error) {}
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Eliminar comentario permanentemente?')) return;
        try {
            const res = await fetch(`/api/resultados/social/comments?id=${id}`, {
                method: 'DELETE'
            });
            if (res.ok) fetchComments();
        } catch (error) {}
    };

    useEffect(() => {
        fetchComments();
    }, []);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-center px-2">
                <div className="flex items-center gap-4">
                    <Link 
                        href="/admin/resultados"
                        className="size-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-slate-900 hover:text-white transition-all shadow-sm"
                    >
                        <ArrowLeft size={24} />
                    </Link>
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Comentarios</h1>
                        <p className="text-slate-500 text-sm font-medium">Modera las interacciones de tu portafolio.</p>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-40">
                    <Loader2 className="w-16 h-16 animate-spin text-emerald-500" />
                </div>
            ) : (
                <div className="bg-white rounded-[3rem] border border-slate-100 shadow-xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-100">
                                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Usuario</th>
                                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Comentario</th>
                                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Publicación</th>
                                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Estado</th>
                                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {comments.map((c) => (
                                    <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-3">
                                                <div className="size-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 overflow-hidden">
                                                    {c.userAvatar ? <img src={c.userAvatar} className="w-full h-full object-cover" /> : <User size={20} />}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-black text-slate-900">{c.userName}</span>
                                                    <span className="text-[10px] font-bold text-slate-400">{format(new Date(c.createdAt), "dd/MM/yyyy HH:mm", { locale: es })}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <p className="text-xs font-medium text-slate-600 max-w-xs leading-relaxed italic">"{c.content}"</p>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-3">
                                                <img src={c.post_image} className="size-10 rounded-lg object-cover border border-slate-100" />
                                                <span className="text-[10px] font-black text-slate-400 uppercase truncate max-w-[100px]">{c.post_title}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            {c.approved ? (
                                                <span className="px-3 py-1 bg-emerald-100 text-emerald-600 rounded-full text-[8px] font-black uppercase tracking-widest">Aprobado</span>
                                            ) : (
                                                <span className="px-3 py-1 bg-amber-100 text-amber-600 rounded-full text-[8px] font-black uppercase tracking-widest">Pendiente</span>
                                            )}
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {!c.approved ? (
                                                    <button 
                                                        onClick={() => handleAction(c.id, true)}
                                                        className="size-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center hover:bg-emerald-600 transition shadow-lg shadow-emerald-200 active:scale-90"
                                                        title="Aprobar"
                                                    >
                                                        <Check size={18} />
                                                    </button>
                                                ) : (
                                                    <button 
                                                        onClick={() => handleAction(c.id, false)}
                                                        className="size-10 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center hover:bg-slate-200 transition active:scale-90"
                                                        title="Ocultar"
                                                    >
                                                        <Eye size={18} />
                                                    </button>
                                                )}
                                                <button 
                                                    onClick={() => handleDelete(c.id)}
                                                    className="size-10 rounded-xl bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition active:scale-90"
                                                    title="Eliminar"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {comments.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-8 py-20 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">
                                            No hay comentarios para moderar.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
