'use client';

import { useState } from 'react';
import { Send, Loader2, CheckCircle2 } from 'lucide-react';

interface NewsletterFormProps {
    negocioId: string;
}

export default function NewsletterForm({ negocioId }: NewsletterFormProps) {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) return;

        setLoading(true);
        setStatus('idle');

        try {
            const response = await fetch('/api/newsletter/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, negocioId }),
            });

            const data = await response.json();

            if (response.ok) {
                setStatus('success');
                setMessage(data.message || '¡Gracias por suscribirte!');
                setEmail('');
            } else {
                setStatus('error');
                setMessage(data.error || 'Algo salió mal. Intenta de nuevo.');
            }
        } catch (error) {
            setStatus('error');
            setMessage('Error de conexión. Intenta de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    if (status === 'success') {
        return (
            <div className="flex flex-col items-center justify-center p-6 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 text-center animate-in fade-in zoom-in duration-300">
                <CheckCircle2 className="text-emerald-500 mb-2" size={32} />
                <p className="text-white font-bold text-sm uppercase tracking-widest">{message}</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <h5 className="text-white font-black uppercase text-[10px] tracking-widest mb-4">Boletín Pro</h5>
            <p className="text-xs font-medium opacity-60">Recibe ofertas exclusivas y novedades de tratamientos.</p>
            <form onSubmit={handleSubmit} className="flex gap-2">
                <input
                    className="bg-white/5 border-white/10 rounded-xl text-xs px-5 py-4 w-full focus:bg-white/10 focus:ring-1 focus:ring-emerald-500 outline-none text-white font-bold transition-all"
                    placeholder="Tu Email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                />
                <button
                    disabled={loading}
                    className="bg-emerald-500 text-white p-4 rounded-xl hover:bg-emerald-600 transition-all shadow-lg active:scale-95 disabled:opacity-50 flex items-center justify-center"
                    type="submit"
                >
                    {loading ? (
                        <Loader2 size={18} className="animate-spin" />
                    ) : (
                        <Send size={18} />
                    )}
                </button>
            </form>
            {status === 'error' && (
                <p className="text-rose-500 text-[10px] font-bold uppercase tracking-widest mt-2">{message}</p>
            )}
        </div>
    );
}
