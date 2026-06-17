'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Sparkles, Mail, Lock, Loader2, ArrowRight } from 'lucide-react';
import Link from 'next/link';

const ZendaLogo = ({ size = 24, className = "" }: { size?: number; className?: string }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
    >
        {/* Cuerpo del Calendario */}
        <rect x="3" y="5" width="18" height="15" rx="3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        
        {/* Cabezal */}
        <path d="M3 9.5H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        
        {/* Anillos de sujeción */}
        <path d="M8 3V6.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M16 3V6.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        
        {/* El Check en el centro */}
        <path d="M9.5 13.5L11.5 15.5L15 11.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        
        {/* Líneas inferiores de agenda */}
        <path d="M6 17.5H12" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
        <path d="M7 16.5V18.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
        <path d="M9 16.5V18.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
        <path d="M11 16.5V18.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
        
        {/* Mini reloj abajo a la derecha */}
        <circle cx="16.5" cy="17" r="1.5" stroke="currentColor" strokeWidth="1" />
        <path d="M16.5 16.2V17H17.2" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
    </svg>
);

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await signIn('credentials', {
                email,
                password,
                redirect: false,
            });

            if (res?.error) {
                setError('Email o contraseña incorrectos');
            } else {
                router.push('/admin');
                router.refresh();
            }
        } catch (err) {
            setError('Ocurrió un error inesperado');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-indigo-50 flex items-center justify-center p-4 relative overflow-hidden">
            {/* Elementos decorativos de fondo */}
            <div className="absolute -top-24 -left-24 w-96 h-96 bg-violet-200/20 rounded-full blur-3xl animate-pulse" />
            <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-indigo-200/20 rounded-full blur-3xl animate-pulse" />

            <div className="max-w-md w-full bg-white/70 backdrop-blur-xl p-10 pt-14 rounded-[3rem] shadow-2xl shadow-violet-200/40 border border-white/50 relative z-10 mt-16">
                <div className="flex flex-col items-center">
                    <div className="w-20 h-20 -mt-20 bg-gradient-to-tr from-violet-600 to-indigo-500 rounded-3xl flex items-center justify-center text-white shadow-xl shadow-violet-200 mb-6 group hover:rotate-6 transition-transform duration-500">
                        <ZendaLogo size={44} className="animate-pulse" />
                    </div>
                    <h2 className="text-4xl font-black text-gray-900 tracking-tight text-center uppercase italic">
                        Bienvenido a Zen<span className="text-violet-600">da</span>
                    </h2>
                    <p className="mt-3 text-xs font-bold text-gray-400 uppercase tracking-widest">
                        Zenda • Panel Administrativo
                    </p>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    {error && (
                        <div className="bg-rose-50 border-l-4 border-rose-500 p-4 text-rose-700 text-xs font-bold uppercase tracking-tight animate-shake rounded-r-xl">
                            {error}
                        </div>
                    )}

                    <div className="space-y-4">
                        <div className="flex items-center w-full border border-gray-100 overflow-hidden rounded-2xl focus-within:ring-2 focus-within:ring-violet-500 focus-within:border-transparent transition-all bg-white/50 group">
                            <div className="pl-5 pr-3 flex items-center justify-center text-gray-400 group-focus-within:text-violet-600 transition-colors">
                                <Mail size={20} />
                            </div>
                            <input
                                type="email"
                                required
                                className="w-full py-4 pr-5 bg-transparent !text-gray-900 font-bold text-sm placeholder-gray-300 focus:outline-none"
                                placeholder="TU@EMAIL.COM"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>

                        <div className="flex items-center w-full border border-gray-100 overflow-hidden rounded-2xl focus-within:ring-2 focus-within:ring-violet-500 focus-within:border-transparent transition-all bg-white/50 group">
                            <div className="pl-5 pr-3 flex items-center justify-center text-gray-400 group-focus-within:text-violet-600 transition-colors">
                                <Lock size={20} />
                            </div>
                            <input
                                type="password"
                                required
                                className="w-full py-4 pr-5 bg-transparent !text-gray-900 font-bold text-sm placeholder-gray-300 focus:outline-none"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex flex-row items-center justify-between gap-4 px-1">
                        <label className="flex items-center group cursor-pointer">
                            <div className="relative flex items-center justify-center">
                                <input
                                    id="remember_me"
                                    type="checkbox"
                                    className="peer h-5 w-5 appearance-none rounded-lg border-2 border-violet-100 bg-white checked:bg-violet-600 checked:border-violet-600 transition-all cursor-pointer"
                                />
                                <svg className="absolute w-3 h-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                            </div>
                            <span className="ml-2 text-[11px] font-bold text-gray-400 uppercase tracking-wider group-hover:text-violet-600 transition-colors">
                                Recordarme
                            </span>
                        </label>
                        
                        <Link href="/olvide-password" 
                            className="text-[11px] font-black uppercase tracking-wider text-violet-600 hover:text-violet-700 transition-colors border-b border-violet-100 hover:border-violet-600 pb-0.5">
                            ¿Olvidaste la contraseña?
                        </Link>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="group relative w-full flex justify-center py-5 px-4 border border-transparent text-xs font-black uppercase tracking-[0.2em] rounded-2xl text-white bg-gradient-to-r from-violet-600 to-indigo-500 hover:from-violet-700 hover:to-indigo-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500 transition-all shadow-xl shadow-violet-200 active:scale-[0.98]"
                    >
                        {loading ? (
                            <Loader2 className="animate-spin" size={20} />
                        ) : (
                            <span className="flex items-center gap-3">
                                Iniciar Sesión
                                <ArrowRight size={18} className="group-hover:translate-x-2 transition-transform" />
                            </span>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
