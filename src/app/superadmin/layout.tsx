import Link from "next/link";
import SuperAdminSidebar from "@/components/superadmin/SuperAdminSidebar";
import SuperAdminMobileNav from "@/components/superadmin/SuperAdminMobileNav";
import { ExternalLink } from "lucide-react";

export default function SuperAdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex min-h-screen bg-slate-50 text-slate-900">
            {/* Escala compacta: todo el superadmin (rem) se ve ~12% más pequeño en computadora */}
            <style>{`html{font-size:15px}@media (min-width:768px){html{font-size:14px}}`}</style>
            <SuperAdminSidebar />
            <main className="flex-1 min-w-0 overflow-x-hidden flex flex-col mb-16 lg:mb-0">
                <header className="h-14 bg-white/90 backdrop-blur-xl border-b border-slate-200 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-40">
                    <div className="flex items-center gap-3">
                        <img src="/citiox-icon.png" alt="" className="lg:hidden size-8 rounded-lg object-contain" />
                        <div>
                            <p className="text-[15px] font-bold text-slate-900 leading-tight">Superadmin</p>
                            <p className="text-xs text-slate-500">Control de toda la plataforma Citiox</p>
                        </div>
                    </div>
                    <Link
                        href="/"
                        target="_blank"
                        className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
                    >
                        <ExternalLink size={15} />
                        Ver sitio
                    </Link>
                </header>

                <div className="p-4 lg:p-6 w-full max-w-none">
                    {children}
                </div>
            </main>
            <SuperAdminMobileNav />
        </div>
    );
}
