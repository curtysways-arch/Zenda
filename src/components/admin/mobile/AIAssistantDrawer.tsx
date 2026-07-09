'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Sparkles, Send, Loader2, Bot, User, ChevronRight, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Message {
    id: string;
    role: 'user' | 'model';
    text: string;
    loading?: boolean;
}

interface AIAssistantDrawerProps {
    open: boolean;
    onClose: () => void;
    primaryColor: string;
    citas: any[];
    selectedDate: Date;
    stats: {
        programadas: number;
        confirmadas: number;
        pendientes: number;
        finalizadas: number;
    };
    negocio?: string;
}

const SUGGESTED_QUESTIONS = [
    '¿Cómo va mi agenda hoy?',
    'Citas pendientes de confirmar',
    'Redacta un recordatorio para el primer cliente',
    'Consejos para llenar los espacios vacíos',
    '¿Cuál es mi especialista más ocupado?',
];

export default function AIAssistantDrawer({
    open,
    onClose,
    primaryColor,
    citas,
    selectedDate,
    stats,
    negocio = 'Tu Negocio'
}: AIAssistantDrawerProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Scroll al final cuando llegan mensajes
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Enfocar input al abrir
    useEffect(() => {
        if (open) {
            setTimeout(() => inputRef.current?.focus(), 300);
            if (messages.length === 0) {
                // Mensaje de bienvenida automático al abrir por primera vez
                const welcomeMsg: Message = {
                    id: 'welcome',
                    role: 'model',
                    text: `¡Hola! 👋 Soy **Citiox AI**, tu asistente de gestión.\n\nHoy es **${format(selectedDate, "EEEE d 'de' MMMM", { locale: es })}** y tienes **${stats.programadas} citas** programadas (${stats.pendientes} pendientes de confirmar).\n\n¿En qué te puedo ayudar?`
                };
                setMessages([welcomeMsg]);
            }
        }
    }, [open]);

    // Construir contexto de citas para la API
    const buildContext = () => ({
        fecha: format(selectedDate, "EEEE d 'de' MMMM yyyy", { locale: es }),
        negocio,
        stats,
        citas: citas
            .filter(c => {
                const d = new Date(c.fecha);
                return format(d, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
            })
            .map(c => ({
                hora: c.horaInicio || '—',
                servicio: c.service?.nombre || 'Servicio',
                cliente: c.cliente?.nombre || c.Usuario?.nombre || 'Cliente',
                especialista: c.staff?.name || 'Especialista',
                estado: c.estado || 'pending',
                duracion: c.service?.duracion || 60
            }))
    });

    const sendMessage = async (text: string) => {
        if (!text.trim() || loading) return;

        const userMsg: Message = { id: Date.now().toString(), role: 'user', text };
        const loadingMsg: Message = { id: 'loading', role: 'model', text: '', loading: true };

        setMessages(prev => [...prev, userMsg, loadingMsg]);
        setInput('');
        setLoading(true);

        try {
            // Historial excluyendo el welcome y el loading
            const history = [...messages, userMsg]
                .filter(m => m.id !== 'welcome' && !m.loading)
                .map(m => ({ role: m.role, text: m.text }));

            const res = await fetch('/api/admin/ai-assistant', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: history,
                    context: buildContext()
                })
            });

            const data = await res.json();
            const aiText = data.text || 'No pude generar una respuesta.';

            setMessages(prev => prev.map(m =>
                m.id === 'loading'
                    ? { id: Date.now().toString(), role: 'model', text: aiText }
                    : m
            ));
        } catch {
            setMessages(prev => prev.map(m =>
                m.id === 'loading'
                    ? { id: Date.now().toString(), role: 'model', text: '⚠️ Error de conexión. Intenta de nuevo.' }
                    : m
            ));
        } finally {
            setLoading(false);
        }
    };

    const handleReset = () => {
        setMessages([]);
        setTimeout(() => {
            const welcomeMsg: Message = {
                id: 'welcome',
                role: 'model',
                text: `¡Hola de nuevo! 👋 ¿En qué te puedo ayudar hoy?`
            };
            setMessages([welcomeMsg]);
        }, 100);
    };

    // Renderizar texto con formato básico de markdown
    const renderText = (text: string) => {
        return text
            .split('\n')
            .map((line, i) => {
                const bold = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                return <p key={i} dangerouslySetInnerHTML={{ __html: bold }} className={line === '' ? 'mt-1' : ''} />;
            });
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[150] flex flex-col justify-end">
            {/* Overlay */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
                onClick={onClose}
            />

            {/* Drawer */}
            <div className="relative z-10 bg-white rounded-t-[2.5rem] flex flex-col animate-in slide-in-from-bottom-4 duration-300 max-h-[88vh]"
                style={{ boxShadow: '0 -8px 40px rgba(0,0,0,0.15)' }}>

                {/* Header */}
                <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100 shrink-0">
                    <div className="flex items-center gap-3">
                        <div
                            className="size-11 rounded-2xl flex items-center justify-center text-white shadow-md"
                            style={{ background: `linear-gradient(135deg, ${primaryColor}, #ec4899)` }}
                        >
                            <Sparkles size={20} className="animate-pulse" />
                        </div>
                        <div>
                            <h3 className="font-black text-slate-900 text-sm uppercase tracking-tight">Citiox AI</h3>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Asistente de Agenda</p>
                        </div>
                        <span className="ml-1 flex items-center gap-1 px-2 py-0.5 bg-emerald-50 border border-emerald-100 rounded-full">
                            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest">En línea</span>
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleReset}
                            className="size-9 flex items-center justify-center bg-slate-50 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"
                        >
                            <RefreshCw size={15} />
                        </button>
                        <button
                            onClick={onClose}
                            className="size-9 flex items-center justify-center bg-slate-50 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* Resumen del día (pill contextual) */}
                <div className="px-5 pt-3 shrink-0">
                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-2xl p-3 overflow-x-auto no-scrollbar">
                        {[
                            { label: 'Total', value: stats.programadas, color: primaryColor },
                            { label: 'Confirmadas', value: stats.confirmadas, color: '#10b981' },
                            { label: 'Pendientes', value: stats.pendientes, color: '#f59e0b' },
                            { label: 'Finalizadas', value: stats.finalizadas, color: '#64748b' },
                        ].map(s => (
                            <div key={s.label} className="flex flex-col items-center shrink-0 px-3 py-1 first:pl-0">
                                <span className="text-sm font-black" style={{ color: s.color }}>{s.value}</span>
                                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">{s.label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Mensajes */}
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 min-h-0">
                    {messages.map(msg => (
                        <div key={msg.id} className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                            {/* Avatar */}
                            <div
                                className={`size-8 rounded-full shrink-0 flex items-center justify-center text-white shadow-sm mt-0.5 ${msg.role === 'model' ? '' : 'bg-slate-200'}`}
                                style={msg.role === 'model' ? { background: `linear-gradient(135deg, ${primaryColor}, #ec4899)` } : {}}
                            >
                                {msg.role === 'model'
                                    ? <Sparkles size={14} />
                                    : <User size={14} className="text-slate-500" />
                                }
                            </div>

                            {/* Burbuja */}
                            <div
                                className={`max-w-[78%] px-4 py-3 rounded-[1.4rem] text-[11px] font-medium leading-relaxed ${
                                    msg.role === 'user'
                                        ? 'text-white rounded-tr-sm'
                                        : 'bg-slate-50 border border-slate-100 text-slate-700 rounded-tl-sm'
                                }`}
                                style={msg.role === 'user' ? { background: `linear-gradient(135deg, ${primaryColor}, #ec4899)` } : {}}
                            >
                                {msg.loading ? (
                                    <div className="flex items-center gap-1.5 py-0.5">
                                        <span className="size-1.5 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                        <span className="size-1.5 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                        <span className="size-1.5 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                    </div>
                                ) : (
                                    <div className="space-y-0.5">{renderText(msg.text)}</div>
                                )}
                            </div>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>

                {/* Preguntas sugeridas (solo si no hay conversación aún) */}
                {messages.length <= 1 && (
                    <div className="px-5 pb-2 shrink-0">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Preguntas rápidas</p>
                        <div className="flex flex-col gap-1.5">
                            {SUGGESTED_QUESTIONS.slice(0, 3).map(q => (
                                <button
                                    key={q}
                                    onClick={() => sendMessage(q)}
                                    className="flex items-center justify-between gap-2 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-2xl text-left transition-colors group"
                                >
                                    <span className="text-[10px] font-bold text-slate-600 group-hover:text-slate-800">{q}</span>
                                    <ChevronRight size={12} className="text-slate-300 group-hover:text-slate-500 shrink-0" />
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Input */}
                <div className="px-5 pb-6 pt-3 border-t border-slate-100 shrink-0">
                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 focus-within:border-pink-300 focus-within:bg-white transition-all"
                        style={{ '--tw-ring-color': primaryColor } as any}>
                        <input
                            ref={inputRef}
                            type="text"
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && sendMessage(input)}
                            placeholder="Escribe tu pregunta..."
                            className="flex-1 bg-transparent text-[11px] font-medium text-slate-800 placeholder:text-slate-400 outline-none"
                            disabled={loading}
                        />
                        <button
                            onClick={() => sendMessage(input)}
                            disabled={!input.trim() || loading}
                            className="size-8 rounded-xl flex items-center justify-center text-white shrink-0 transition-all disabled:opacity-40 active:scale-95"
                            style={{ background: `linear-gradient(135deg, ${primaryColor}, #ec4899)` }}
                        >
                            {loading
                                ? <Loader2 size={14} className="animate-spin" />
                                : <Send size={14} />
                            }
                        </button>
                    </div>
                    <p className="text-center text-[8px] text-slate-300 font-bold uppercase tracking-widest mt-2">
                        Impulsado por Gemini AI
                    </p>
                </div>
            </div>
        </div>
    );
}
