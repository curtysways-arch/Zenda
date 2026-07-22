import MobileBottomNav from '@/components/admin/mobile/MobileBottomNav';
import MobileTopBar from '@/components/admin/mobile/MobileTopBar';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { ConfirmProvider } from '@/components/admin/ConfirmContext';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { checkSubscriptionStatus } from "@/lib/subscriptions";
import { subscriptionService } from "@/lib/services/subscriptionService";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { AlertTriangle, Rocket } from 'lucide-react';
import Link from 'next/link';

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
        redirect('/login');
    }

    const user = session.user as any;
    const role = user.role;
    const roles = user.roles || [];

    const negocioId = (session.user as any).negocioId;

    const isSuperAdmin = role === 'SUPER_ADMIN' || roles.includes('SUPERADMIN');
    if (isSuperAdmin && !negocioId) {
        redirect('/superadmin');
    }

    // Si no tiene negocioId (y no es super admin), redirigir
    if (!negocioId && !isSuperAdmin) {
        redirect('/login');
    }

    // Leer la ruta actual
    const headersList = await headers();
    const currentPath = headersList.get('x-current-path') || '';

    if (currentPath.includes('/admin/vencido') || currentPath.includes('/admin/onboarding')) {
        return <>{children}</>;
    }

    let primaryColor = '#0ea5e9';
    let status = { active: true, reason: null };
    let negocio: any = null;

    if (negocioId) {
        status = await checkSubscriptionStatus(negocioId);
        negocio = await prisma.negocio.findUnique({
            where: { id: negocioId },
            select: { colorPrimario: true, configuracion: true, nombre: true }
        });
        primaryColor = negocio?.colorPrimario || '#0ea5e9';
        
        const config = (negocio?.configuracion as any) || {};
        if (config.wizardCompleted !== true) {
            redirect('/admin/onboarding');
        }

        await subscriptionService.checkAndUpdateSubscriptionStatus(negocioId);
    }

    const isExpired = status.reason === 'EXPIRED';
    const isNoPlan = status.reason === 'NO_PLAN';
    const isSuspended = status.reason === 'SUSPENDED';
    const isDemo = (session.user as any).isDemo === true;

    // Solo bloquear si el negocio realmente no existe o tiene ID inválido
    // Para NO_PLAN, SUSPENDED y EXPIRED: permitir acceso con banner visible
    if (!status.active && !isExpired && !isNoPlan && !isSuspended && !isDemo && !isSuperAdmin) {
        redirect('/admin/vencido');
    }

    return (
        <ConfirmProvider primaryColor={primaryColor}>
            <div className="flex h-screen bg-slate-50 overflow-hidden light-theme" style={{ '--primary-color': primaryColor } as any}>
                
                {/* Sidebar Unificado */}
                <AdminSidebar primaryColor={primaryColor} />

                {/* ── ÁREA PRINCIPAL ── */}
                <div className="flex-1 flex justify-center md:justify-start overflow-hidden relative">
                    <div className="w-full flex flex-col bg-white md:shadow-none relative h-full overflow-hidden md:border-x-0">
                        
                        {/* TopBar: solo en móvil */}
                        <div className="md:hidden">
                            <MobileTopBar primaryColor={primaryColor} negocioNombre={negocio?.nombre} />
                        </div>

                        {/* Banners de estado */}
                        <div className="z-40">
                            {isDemo && (
                                <div className="bg-amber-500 text-white px-6 py-2 flex items-center justify-between shadow-lg">
                                    <p className="text-[9px] font-black uppercase tracking-widest italic">MODO DEMO</p>
                                    <Link href="/register" className="bg-white text-amber-600 px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest">Crear mi Spa</Link>
                                </div>
                            )}
                            {(isExpired || isNoPlan || isSuspended) && !isDemo && (
                                <div className="bg-rose-600 text-white px-6 py-2 flex items-center justify-between shadow-lg">
                                    <p className="text-[9px] font-black uppercase tracking-widest italic">
                                        {isSuspended ? 'Negocio Suspendido' : isNoPlan ? 'Sin Plan Activo' : 'Periodo Terminado'}
                                    </p>
                                    <Link href="/admin/plan" className="bg-white text-rose-600 px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest">Activar Plan</Link>
                                </div>
                            )}
                        </div>

                        {/* Contenido scrollable */}
                        <main className="flex-1 overflow-y-auto custom-scrollbar relative bg-slate-50/30">
                            <div className="p-5 md:p-8 pb-40 md:pb-10 w-full max-w-none">
                                {children}
                            </div>
                        </main>

                        {/* BottomNav: solo en móvil */}
                        <div className="md:hidden">
                            <MobileBottomNav primaryColor={primaryColor} />
                        </div>
                    </div>
                </div>
            </div>
        </ConfirmProvider>
    );
}
