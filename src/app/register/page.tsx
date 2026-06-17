import RegisterForm from "@/components/auth/RegisterForm";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

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

export default function RegisterPage() {
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col relative overflow-hidden light-theme">
            {/* Background elements */}
            <div className="absolute top-0 right-0 w-1/3 h-1/3 bg-violet-500/5 rounded-full blur-[120px] -mr-20 -mt-20" />
            <div className="absolute bottom-0 left-0 w-1/3 h-1/3 bg-violet-500/5 rounded-full blur-[120px] -ml-20 -mb-20" />

            {/* Header */}
            <header className="p-8 flex justify-between items-center relative z-10 w-full max-w-7xl mx-auto">
                <Link href="/" className="flex items-center gap-2 group">
                    <div className="bg-violet-600 p-2 rounded-xl group-hover:bg-gray-900 transition-colors flex items-center justify-center">
                        <ZendaLogo className="text-white" size={20} />
                    </div>
                    <span className="text-xl font-black text-slate-900 tracking-tighter italic uppercase">
                        Zen<span className="text-violet-600">da</span>
                    </span>
                </Link>
                <Link
                    href="/"
                    className="flex items-center gap-2 text-sm font-black text-gray-400 hover:text-gray-900 transition-colors uppercase tracking-widest"
                >
                    <ArrowLeft size={16} />
                    Volver
                </Link>
            </header>

            {/* Main Content */}
            <main className="flex-1 flex items-center justify-center p-6 relative z-10">
                <RegisterForm />
            </main>

            {/* Footer */}
            <footer className="p-8 text-center text-gray-400 text-[10px] font-bold uppercase tracking-[0.2em]">
                © 2026 ZENDA | GESTIÓN PROFESIONAL DE BIENESTAR
            </footer>
        </div>
    );
}
