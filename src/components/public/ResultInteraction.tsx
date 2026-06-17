'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Heart, MessageCircle, Send } from 'lucide-react';

interface ResultInteractionProps {
    resultadoId: string;
    businessSlug: string;
    initialLikes?: number;
}

export default function ResultInteraction({ resultadoId, businessSlug, initialLikes = 0 }: ResultInteractionProps) {
    const { data: session } = useSession();
    const [liked, setLiked] = useState(false);
    const [likesCount, setLikesCount] = useState(initialLikes);
    const [showComments, setShowComments] = useState(false);
    const [commentText, setCommentText] = useState('');
    const [comments, setComments] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Cargar comentarios desde el backend cuando se abre la sección de comentarios
    useEffect(() => {
        if (showComments) {
            const fetchComments = async () => {
                try {
                    const res = await fetch(`/api/resultados/${resultadoId}/comments`);
                    if (res.ok) {
                        const data = await res.json();
                        setComments(data);
                    }
                } catch (e) {
                    console.error('Error fetching comments:', e);
                }
            };
            fetchComments();
        }
    }, [showComments, resultadoId]);

    const handleLike = async () => {
        const isLiked = !liked;
        setLiked(isLiked);
        setLikesCount(prev => isLiked ? prev + 1 : prev - 1);
        
        try {
            await fetch(`/api/resultados/${resultadoId}/like`, { method: 'POST' });
        } catch (e) {
            console.error('Error liking:', e);
        }
    };

    const handleCommentSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!commentText.trim()) return;
        setError(null);

        setIsSubmitting(true);
        try {
            const res = await fetch(`/api/resultados/${resultadoId}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: commentText })
            });

            if (res.ok) {
                const newComment = await res.json();
                setComments(prev => [newComment, ...prev]);
                setCommentText('');
            } else {
                const err = await res.json();
                setError(err.error || 'Error al enviar comentario');
                if (res.status === 401) {
                    alert('Debes iniciar sesión con tu número de teléfono (OTP) o cuenta para poder comentar.');
                }
            }
        } catch (e) {
            setError('Error de conexión');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="pt-4 border-t border-slate-100 w-full mt-4">
            <div className="flex items-center gap-5 mb-3">
                <button onClick={handleLike} className="flex items-center gap-1.5 text-slate-500 hover:text-rose-500 transition-colors group">
                    <Heart size={20} className={`transition-all ${liked ? 'fill-rose-500 text-rose-500 scale-110' : 'group-active:scale-95'}`} />
                    <span className="font-bold text-xs">{likesCount}</span>
                </button>
                <button onClick={() => setShowComments(!showComments)} className="flex items-center gap-1.5 text-slate-500 hover:text-emerald-500 transition-colors group">
                    <MessageCircle size={20} className="group-active:scale-95 transition-transform" />
                    <span className="font-bold text-xs">{comments.length > 0 ? comments.length : 'Comentar'}</span>
                </button>
            </div>

            {showComments && (
                <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                    <form onSubmit={handleCommentSubmit} className="flex gap-2">
                        <input 
                            type="text" 
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            placeholder="Añade un comentario..."
                            className="flex-1 bg-slate-100 border border-slate-200 rounded-full px-4 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all"
                            style={{ color: '#0f172a' }}
                        />
                        <button 
                            type="submit" 
                            disabled={!commentText.trim() || isSubmitting} 
                            className="size-10 rounded-full bg-slate-900 text-white flex items-center justify-center disabled:opacity-50 hover:bg-emerald-600 transition-colors shrink-0"
                        >
                            <Send size={16} className="ml-0.5" />
                        </button>
                    </form>

                    {error && (
                        <p className="text-[10px] font-bold text-rose-500 uppercase tracking-widest px-2 animate-shake">
                            {error}
                        </p>
                    )}

                    {comments.length > 0 && (
                        <div className="space-y-3 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                            {comments.map((comment: any, i) => (
                                <div key={i} className="flex gap-3 animate-in fade-in slide-in-from-left-2 duration-300">
                                    <div className="size-8 rounded-full bg-slate-200 shrink-0 overflow-hidden">
                                        {comment.userAvatar ? (
                                            <img src={comment.userAvatar} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-slate-400">
                                                {comment.userName?.charAt(0)}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 bg-slate-50 rounded-2xl p-3 border border-slate-100">
                                        <p className="text-[10px] font-black text-slate-900 uppercase italic mb-1">{comment.userName}</p>
                                        <p className="text-[11px] text-slate-600 leading-relaxed">{comment.content}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
