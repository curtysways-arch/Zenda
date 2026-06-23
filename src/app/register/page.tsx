import RegisterForm from "@/components/auth/RegisterForm";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function RegisterPage() {
    return (
        <div className="min-h-screen bg-white flex flex-col relative overflow-hidden">
            {/* Barra gradient top */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-cyan-500 via-sky-400 to-purple-600 z-20" />
            
            {/* Destellos fondo */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-50 rounded-full blur-3xl -mr-40 -mt-40 opacity-60" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-50 rounded-full blur-3xl -ml-32 -mb-32 opacity-60" />

            {/* Header */}
            <header className="pt-8 px-6 flex justify-between items-center relative z-10 w-full max-w-4xl mx-auto">
                <Link href="/" className="flex items-center gap-3 group">
                    <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-br from-cyan-400 to-purple-500 rounded-2xl blur-lg opacity-30 scale-110" />
                        <div className="relative w-11 h-11 bg-white rounded-2xl shadow-lg border border-slate-100 flex items-center justify-center p-1.5 overflow-hidden">
                            <img src="/logo-citiox.png" alt="CitiOx" className="w-full h-full object-contain" />
                        </div>
                    </div>
                    <span className="text-xl font-black tracking-tight bg-gradient-to-r from-cyan-500 via-sky-500 to-purple-600 bg-clip-text text-transparent italic">
                        CitiOx
                    </span>
                </Link>
                <Link
                    href="/"
                    className="flex items-center gap-2 text-xs font-black text-slate-400 hover:text-slate-700 transition-colors uppercase tracking-widest"
                >
                    <ArrowLeft size={14} />
                    Volver
                </Link>
            </header>

            {/* Main Content */}
            <main className="flex-1 flex items-center justify-center p-6 relative z-10 pt-6">
                <RegisterForm />
            </main>

            {/* Footer */}
            <footer className="p-6 text-center text-slate-300 text-[10px] font-bold uppercase tracking-[0.2em]">
                © 2026 CitiOx | Booking &amp; App Solutions
            </footer>
        </div>
    );
}
