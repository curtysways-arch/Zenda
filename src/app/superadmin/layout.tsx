import SuperAdminSidebar from "@/components/superadmin/SuperAdminSidebar";
import SuperAdminMobileNav from "@/components/superadmin/SuperAdminMobileNav";
import { User, ShieldCheck } from "lucide-react";

export default function SuperAdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
            <SuperAdminSidebar />
            <main className="flex-1 min-w-0 overflow-x-hidden flex flex-col mb-16 lg:mb-0">
                <header className="h-16 lg:h-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-white/5 flex items-center justify-between px-6 lg:px-10 sticky top-0 z-40 transition-all">
                    <div className="flex items-center gap-4">
                        <div className="lg:hidden w-10 h-10 bg-gradient-to-br from-cyan-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-cyan-500/20">
                            S
                        </div>
                        <h1 className="text-xs lg:text-sm font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] italic">
                            SaaS <span className="mx-2 text-slate-300">/</span> <span className="text-slate-900 dark:text-white">Super Admin</span>
                        </h1>
                    </div>

                    <div className="flex items-center gap-3 lg:gap-6">
                        <div className="hidden md:flex items-center gap-2 bg-cyan-500/10 px-4 py-2 rounded-2xl border border-cyan-500/20">
                            <div className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(6,182,212,0.5)]"></div>
                            <span className="text-[10px] font-black text-cyan-600 uppercase tracking-widest leading-none">Status: Online</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                             <div className="size-8 lg:size-10 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-500">
                                <User size={18} />
                             </div>
                        </div>
                    </div>
                </header>

                <div className="p-4 lg:p-10 max-w-7xl mx-auto w-full">
                    {children}
                </div>
            </main>
            <SuperAdminMobileNav />
        </div>
    );
}
