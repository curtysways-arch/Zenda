'use client';

import { useState, useEffect } from 'react';
import { Mail, Search, Trash2, Calendar, UserPlus, Download, Send, X, Loader2, Sparkles, Trophy, Smartphone } from 'lucide-react';
import WysiwygEditor from '@/components/admin/WysiwygEditor';

interface Subscriber {
    id: string;
    email: string;
    createdAt: string;
}

export default function NewsletterPage() {
    const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
    const [loading, setLoading] = useState(true);
    const [query, setQuery] = useState('');

    // Estados para el envío de correo
    const [showSendModal, setShowSendModal] = useState(false);
    const [sending, setSending] = useState(false);
    const [mailForm, setMailForm] = useState({ subject: '', message: '' });

    const fetchSubscribers = async () => {
        try {
            const res = await fetch('/api/admin/subscribers');
            if (res.ok) {
                const data = await res.json();
                setSubscribers(data);
            }
        } catch (error) {
            console.error("Error fetching subscribers", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSubscribers();
    }, []);

    const handleDelete = async (id: string) => {
        if (!confirm('¿Seguro que deseas eliminar este suscriptor?')) return;

        try {
            const res = await fetch(`/api/admin/subscribers?id=${id}`, { method: 'DELETE' });
            if (res.ok) {
                setSubscribers(subscribers.filter(s => s.id !== id));
            }
        } catch (error) {
            console.error("Error deleting subscriber", error);
        }
    };

    const handleSendMail = (e: React.FormEvent) => {
        e.preventDefault();
        if (subscribers.length === 0) {
            alert('No tienes suscriptores a quienes enviar el mensaje.');
            return;
        }

        const bcc = subscribers.map(s => s.email).join(',');
        const subject = encodeURIComponent(mailForm.subject);
        const body = encodeURIComponent(mailForm.message.replace(/<[^>]*>?/gm, '')); // Limpiar HTML para el cuerpo del mailto

        // Abrir app de correo local
        window.location.href = `mailto:?bcc=${bcc}&subject=${subject}&body=${body}`;

        setShowSendModal(false);
        setMailForm({ subject: '', message: '' });
    };

    const filteredSubscribers = subscribers.filter(s =>
        s.email.toLowerCase().includes(query.toLowerCase())
    );

    const exportToCSV = () => {
        const headers = "Email,Fecha de Registro\n";
        const rows = filteredSubscribers.map(s => `${s.email},${new Date(s.createdAt).toLocaleDateString()}`).join("\n");
        const blob = new Blob([headers + rows], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.setAttribute('hidden', '');
        a.setAttribute('href', url);
        a.setAttribute('download', 'suscriptores.csv');
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight uppercase">Boletín Pro</h1>
                    <p className="text-gray-500 font-medium">Gestiona tu lista de correos y envía campañas de marketing.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowSendModal(true)}
                        className="flex items-center gap-2 px-6 py-2.5 text-white rounded-xl font-bold text-sm transition-all shadow-lg active:scale-95"
                        style={{ backgroundColor: 'var(--primary-color)', boxShadow: '0 10px 15px -3px color-mix(in srgb, var(--primary-color), transparent 80%)' }}
                        onMouseEnter={(e) => e.currentTarget.style.filter = 'brightness(1.1)'}
                        onMouseLeave={(e) => e.currentTarget.style.filter = 'none'}
                    >
                        <Send size={18} />
                        Enviar Mensaje
                    </button>
                    <button
                        onClick={exportToCSV}
                        className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-50 transition-all shadow-sm"
                    >
                        <Download size={18} />
                        Exportar CSV
                    </button>
                    <div className="hidden lg:flex px-4 py-2.5 rounded-xl border items-center gap-2"
                          style={{ backgroundColor: 'color-mix(in srgb, var(--primary-color), transparent 90%)', color: 'var(--primary-color)', borderColor: 'color-mix(in srgb, var(--primary-color), transparent 80%)' }}>
                        <UserPlus size={18} />
                        <span className="font-bold">{subscribers.length} Suscriptores</span>
                    </div>
                </div>
            </div>

            {/* Send Message Modal */}
            {showSendModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !sending && setShowSendModal(false)} />
                     <div className="relative bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl border border-white/20 overflow-hidden animate-in zoom-in duration-300">
                        <div className="p-8 text-white" style={{ backgroundColor: 'var(--primary-color)' }}>
                            <div className="flex justify-between items-center mb-2">
                                <Trophy size={24} className="opacity-50" />
                                <button onClick={() => setShowSendModal(false)} className="hover:bg-white/20 p-2 rounded-full transition-colors">
                                    <X size={24} />
                                </button>
                            </div>
                             <h3 className="text-2xl font-black uppercase tracking-tight italic">Crear Nueva Campaña</h3>
                            <p className="text-white/80 text-sm">Enviando a {subscribers.length} suscriptores registrados.</p>
                        </div>

                        <form onSubmit={handleSendMail} className="p-8 space-y-6">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Asunto del Correo</label>
                                     <input
                                        required
                                        type="text"
                                        placeholder="¡Gran oferta esta semana! ⚽"
                                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-6 font-bold text-gray-900 outline-none transition-all placeholder:text-gray-300"
                                        onFocus={(e) => {
                                            e.currentTarget.style.borderColor = 'var(--primary-color)';
                                            e.currentTarget.style.backgroundColor = 'white';
                                            e.currentTarget.style.boxShadow = '0 0 0 4px color-mix(in srgb, var(--primary-color), transparent 95%)';
                                        }}
                                        onBlur={(e) => {
                                            e.currentTarget.style.borderColor = 'rgb(243, 244, 246)';
                                            e.currentTarget.style.backgroundColor = 'rgb(249, 250, 251)';
                                            e.currentTarget.style.boxShadow = 'none';
                                        }}
                                        value={mailForm.subject}
                                        onChange={e => setMailForm({ ...mailForm, subject: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Mensaje de tu Boletín</label>
                                    <WysiwygEditor
                                        value={mailForm.message}
                                        onChange={(content) => setMailForm({ ...mailForm, message: content })}
                                    />
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-4 pt-2">
                                 <button
                                    type="submit"
                                    className="flex-1 text-white font-black py-4 rounded-2xl transition-all shadow-lg flex items-center justify-center gap-3 uppercase text-xs tracking-widest active:scale-95"
                                    style={{ backgroundColor: 'var(--primary-color)', boxShadow: '0 10px 15px -3px color-mix(in srgb, var(--primary-color), transparent 80%)' }}
                                    onMouseEnter={(e) => e.currentTarget.style.filter = 'brightness(1.1)'}
                                    onMouseLeave={(e) => e.currentTarget.style.filter = 'none'}
                                >
                                    <Smartphone size={18} />
                                    Abrir en App de Correo
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setShowSendModal(false)}
                                    className="px-8 py-4 text-gray-400 hover:text-gray-600 font-black uppercase text-xs tracking-widest transition-colors text-center"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Content Card */}
            <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-50 flex items-center gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                         <input
                            type="text"
                            placeholder="Buscar por email..."
                            className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-3.5 pl-12 pr-4 text-sm font-medium outline-none transition-all placeholder:text-gray-400"
                            onFocus={(e) => {
                                e.currentTarget.style.borderColor = 'var(--primary-color)';
                                e.currentTarget.style.boxShadow = '0 0 0 4px color-mix(in srgb, var(--primary-color), transparent 95%)';
                            }}
                            onBlur={(e) => {
                                e.currentTarget.style.borderColor = 'rgb(243, 244, 246)';
                                e.currentTarget.style.boxShadow = 'none';
                            }}
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50">
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Suscriptor</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Fecha de Registro</th>
                                <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest text-gray-400">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="px-6 py-5"><div className="h-4 bg-gray-100 rounded w-48" /></td>
                                        <td className="px-6 py-5"><div className="h-4 bg-gray-100 rounded w-32" /></td>
                                        <td className="px-6 py-5 flex justify-end"><div className="h-8 bg-gray-100 rounded w-8" /></td>
                                    </tr>
                                ))
                            ) : filteredSubscribers.length > 0 ? (
                                filteredSubscribers.map((subscriber) => (
                                    <tr key={subscriber.id} className="hover:bg-gray-50/50 transition-colors group">
                                        <td className="px-6 py-5">
                                             <div className="flex items-center gap-3">
                                                <div className="size-10 rounded-xl flex items-center justify-center border"
                                                     style={{ backgroundColor: 'color-mix(in srgb, var(--primary-color), transparent 90%)', color: 'var(--primary-color)', borderColor: 'color-mix(in srgb, var(--primary-color), transparent 80%)' }}>
                                                    <Mail size={18} />
                                                </div>
                                                <span className="font-bold text-gray-900">{subscriber.email}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-2 text-gray-500 text-sm font-medium">
                                                <Calendar size={14} className="text-gray-400" />
                                                {new Date(subscriber.createdAt).toLocaleDateString('es-ES', {
                                                    day: '2-digit',
                                                    month: 'long',
                                                    year: 'numeric'
                                                })}
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-right">
                                            <button
                                                onClick={() => handleDelete(subscriber.id)}
                                                className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                                title="Eliminar suscriptor"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={3} className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center gap-4">
                                            <Mail size={48} className="text-gray-200" />
                                            <div>
                                                <p className="font-black text-gray-900 uppercase tracking-tight">No hay suscriptores aún</p>
                                                <p className="text-gray-500 text-sm">Los correos que se registren en tu boletín aparecerán aquí.</p>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Marketing Tips Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 <div className="rounded-[2.5rem] p-8 text-white relative overflow-hidden group" style={{ backgroundColor: 'var(--primary-color)' }}>
                    <div className="absolute -top-10 -right-10 size-40 bg-white/10 rounded-full group-hover:scale-110 transition-transform duration-700" />
                    <h4 className="text-xl font-black uppercase tracking-tighter mb-4 italic">Tip de Marketing</h4>
                    <p className="text-white/80 font-medium text-sm leading-relaxed">
                        Envía novedades sobre los próximos torneos para aumentar la participación y retención.
                    </p>
                </div>
                <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden group">
                    <div className="absolute -bottom-10 -left-10 size-32 bg-emerald-500/20 rounded-full group-hover:scale-110 transition-transform duration-700" />
                    <h4 className="text-xl font-black uppercase tracking-tighter mb-4 italic">Ofertas Flash</h4>
                    <p className="text-slate-300 font-medium text-sm leading-relaxed">
                        Aprovecha los horarios de baja demanda enviando cupones descuento exclusivos a tu lista de suscriptores.
                    </p>
                </div>
                <div className="bg-gray-100 rounded-[2.5rem] p-8 text-gray-900 relative overflow-hidden group border border-gray-200">
                    <h4 className="text-xl font-black uppercase tracking-tighter mb-4 italic">Privacidad</h4>
                    <p className="text-gray-500 font-medium text-sm leading-relaxed">
                        Recuerda siempre respetar los datos de tus clientes y usar esta lista solo para fines comunicativos del negocio.
                    </p>
                </div>
            </div>
        </div>
    );
}
