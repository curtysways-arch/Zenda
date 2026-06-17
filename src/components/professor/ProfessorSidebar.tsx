"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
    LayoutDashboard, 
    BookOpen, 
    Calendar, 
    Users, 
    UserCheck,
    LogOut
} from "lucide-react";
import { cn } from "@/lib/utils";

const menuItems = [
    { name: "Inicio", icon: LayoutDashboard, href: "/profesor" },
    { name: "Cursos", icon: BookOpen, href: "/profesor/cursos" },
    { name: "Clases", icon: Calendar, href: "/profesor/clases" },
    { name: "Pasar Lista", icon: UserCheck, href: "/profesor/asistencia" },
    { name: "Alumnos", icon: Users, href: "/profesor/alumnos" },
];

export default function ProfessorSidebar() {
    const pathname = usePathname();

    return (
        <>
            {/* 🖥️ DESKTOP SIDEBAR - SLIM & PRO */}
            <aside className="hidden md:flex w-64 bg-slate-900 border-r border-white/5 flex-col sticky top-0 h-screen z-[100]">
                <div className="p-6 border-b border-white/5 flex items-center justify-center">
                    <h1 className="text-sm font-black text-white tracking-[0.2em] uppercase italic">PROFESOR<span className="text-emerald-500 italic">APP</span></h1>
                </div>

                <nav className="flex-1 px-4 py-6 space-y-1">
                    {menuItems.map((item) => {
                        const isActive = pathname === item.href || (item.href !== "/profesor" && pathname.startsWith(item.href));
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-3 px-5 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                    isActive 
                                        ? "bg-emerald-500 text-slate-900 shadow-lg shadow-emerald-500/20" 
                                        : "text-white/40 hover:bg-white/5 hover:text-white"
                                )}
                            >
                                <item.icon size={16} strokeWidth={3} />
                                {item.name}
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-white/5 mt-auto">
                    <button 
                       onClick={() => {
                           if(confirm("¿Salir?")) {
                               document.cookie = "customer_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;";
                               window.location.href = "/";
                           }
                       }}
                       className="flex items-center justify-center gap-3 px-4 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest text-rose-500 hover:bg-rose-500/10 w-full transition-all"
                    >
                        <LogOut size={14} />
                        Cerrar Sesión
                    </button>
                </div>
            </aside>

            {/* 📱 MOBILE NAVIGATION - SLIM DOCK */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-xl border-t border-white/5 px-2 py-2 z-[200] flex items-center justify-around">
                {menuItems.map((item) => {
                    const isActive = pathname === item.href || (item.href !== "/profesor" && pathname.startsWith(item.href));
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={cn(
                                "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all",
                                isActive ? "text-emerald-500 scale-105" : "text-white/30"
                            )}
                        >
                            <item.icon size={18} strokeWidth={isActive ? 3 : 2} />
                            <span className="text-[7px] font-black uppercase tracking-widest truncate max-w-[50px]">{item.name}</span>
                        </Link>
                    );
                })}
            </nav>
        </>
    );
}
