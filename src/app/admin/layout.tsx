import MobileBottomNav from '@/components/admin/mobile/MobileBottomNav';
import MobileTopBar from '@/components/admin/mobile/MobileTopBar';
import AdminSidebar from '@/components/admin/AdminSidebar';
import GlobalOrderNotifier from '@/components/admin/GlobalOrderNotifier';
import DelegatedAdminBanner from '@/components/admin/DelegatedAdminBanner';
import { ConfirmProvider } from '@/components/admin/ConfirmContext';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { checkSubscriptionStatus, subscriptionEnforced } from "@/lib/subscriptions";
import { subscriptionService } from "@/lib/services/subscriptionService";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { AlertTriangle, Rocket } from 'lucide-react';
import Link from 'next/link';
import { destroyDelegatedSession, getDelegatedSession, getEffectiveAdminSession, logDelegatedAudit } from '@/lib/delegatedAuth';
import { BranchWarehouseProvider } from '@/context/BranchWarehouseContext';

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await getEffectiveAdminSession();

    if (!session?.user) {
        redirect('/login');
    }

    const user = session.user as any;

    // Manejar expiración de acceso delegado
    if (user.isDelegatedExpired) {
        await destroyDelegatedSession();
        await logDelegatedAudit({
            adminUserId: user.id || 'SUPERADMIN',
            accion: 'DELEGATED_ADMIN_ACCESS_EXPIRED',
            descripcion: 'El acceso delegado expiró automáticamente al superar los 30 minutos',
        });
        redirect('/superadmin?expired=true');
    }

    const role = user.role;
    const roles = user.roles || [];
    const negocioId = user.negocioId;
    const isDelegated = user.isDelegated === true;

    const isSuperAdmin = role === 'SUPER_ADMIN' || roles.includes('SUPERADMIN') || user.isAdminUser === true;
    if (isSuperAdmin && !negocioId && !isDelegated) {
        redirect('/superadmin');
    }

    if (!negocioId && !isSuperAdmin) {
        redirect('/login');
    }

    const headersList = await headers();
    const currentPath = 
        headersList.get('x-current-path') || 
        headersList.get('next-url') || 
        headersList.get('x-invoke-path') || 
        '';

    if (currentPath.includes('/admin/vencido') || currentPath.includes('/admin/onboarding')) {
        return <>{children}</>;
    }

    let primaryColor = '#0ea5e9';
    let status: any = { active: true, reason: null };
    let negocio: any = null;

    if (negocioId) {
        status = await checkSubscriptionStatus(negocioId);
        negocio = await prisma.negocio.findUnique({
            where: { id: negocioId },
            select: { colorPrimario: true, configuracion: true, nombre: true, tipoNegocio: true, slug: true }
        });
        primaryColor = negocio?.colorPrimario || '#0ea5e9';
        
        let config: any = {};
        if (typeof negocio?.configuracion === 'string') {
            try { config = JSON.parse(negocio.configuracion); } catch { config = {}; }
        } else {
            config = negocio?.configuracion || {};
        }

        if (config.wizardCompleted === false && !isDelegated) {
            redirect('/admin/onboarding');
        }

        await subscriptionService.checkAndUpdateSubscriptionStatus(negocioId);
    }

    const isExpired = status.reason === 'EXPIRED';
    const isNoPlan = status.reason === 'NO_PLAN';
    const isSuspended = status.reason === 'SUSPENDED';
    const isDemo = (session.user as any).isDemo === true || status.isDemo === true;
    const enforce = subscriptionEnforced() && !isDemo && !isSuperAdmin && !isDelegated;
    const info = status.info || {};
    const fmt = (d?: Date | string | null) => d ? new Date(d).toLocaleDateString('es-EC', { day: 'numeric', month: 'long' }) : '';

    // Pasada la gracia sin pagar: el panel queda limitado a "Mi plan" (no se borra nada)
    if (enforce && (isExpired || isSuspended) && currentPath && !currentPath.startsWith('/admin/plan')) {
        redirect('/admin/plan?bloqueado=1');
    }

    if (!status.active && !isExpired && !isNoPlan && !isSuspended && !isDemo && !isSuperAdmin) {
        redirect('/admin/vencido');
    }

    return (
        <ConfirmProvider primaryColor={primaryColor}>
            <BranchWarehouseProvider>
                {/* Escala compacta del panel: todo el admin (rem) se ve ~12% más pequeño en computadora */}
                <style>{`html{font-size:15px}@media (min-width:768px){html{font-size:14px}}`}</style>

                {/* Notificador emergente y alarma de nuevos pedidos online */}
                <GlobalOrderNotifier primaryColor={primaryColor} />

                <div className="flex h-screen bg-slate-50 overflow-hidden light-theme" style={{ '--primary-color': primaryColor } as any}>
                    
                    {/* Sidebar Unificado para todos los negocios de Citiox */}
                    <AdminSidebar 
                        primaryColor={primaryColor} 
                        initialBusinessName={negocio?.nombre} 
                        initialSlug={negocio?.slug}
                        initialBusiness={negocio}
                    />

                    {/* ── ÁREA PRINCIPAL CON DESPLAZAMIENTO PARA SIDEBAR Y BANNERS ── */}
                    <div className="flex-1 flex justify-center md:justify-start overflow-hidden relative md:pl-64">
                        <div className="w-full flex flex-col bg-white md:shadow-none relative h-full overflow-hidden md:border-x-0">
                            
                            {/* TopBar: solo en móvil */}
                            <div className="md:hidden">
                                <MobileTopBar 
                                    primaryColor={primaryColor} 
                                    negocioNombre={negocio?.nombre} 
                                    slug={negocio?.slug}
                                />
                            </div>

                            {/* Banners de estado */}
                            <div className="z-40">
                                {isDelegated && (
                                    <DelegatedAdminBanner
                                        businessName={user.targetBusinessName || negocio?.nombre || 'Negocio Objetivo'}
                                        expiresAt={user.delegatedExpiresAt}
                                        isDemo={isDemo}
                                    />
                                )}
                                {isDemo && !isDelegated && (
                                    <div className="bg-amber-500 text-white px-4 md:px-6 py-1.5 flex items-center justify-between gap-3">
                                        <p className="text-xs font-semibold">Estás viendo una demo</p>
                                        <Link href="/register" className="bg-white text-amber-700 px-2.5 py-1 rounded-md text-xs font-semibold shrink-0">Crear mi negocio</Link>
                                    </div>
                                )}
                                {enforce && (isExpired || isSuspended) && (
                                    <div className="bg-rose-600 text-white px-4 md:px-6 py-2 flex items-center justify-between gap-3">
                                        <p className="text-sm font-semibold">
                                            {isSuspended
                                                ? 'Tu negocio está suspendido por Citiox. Escríbenos para revisarlo.'
                                                : 'Tu página está pausada: no recibe reservas ni pedidos. Activa tu plan y todo vuelve al instante, sin perder nada.'}
                                        </p>
                                    </div>
                                )}
                                {enforce && status.phase === 'GRACE' && (
                                    <div className="bg-amber-500 text-white px-4 md:px-6 py-2 flex items-center justify-between gap-3">
                                        <p className="text-sm font-semibold">
                                            Tu {info.isTrial ? 'prueba gratis' : 'plan'} terminó. Tienes hasta el {fmt(info.graceEndsAt)} para activarlo; después tu página dejará de recibir reservas y pedidos.
                                        </p>
                                        <Link href="/admin/plan" className="bg-white text-amber-700 px-3 py-1.5 rounded-lg text-sm font-semibold shrink-0">Activar plan</Link>
                                    </div>
                                )}
                                {enforce && status.phase === 'TRIAL' && typeof info.daysLeft === 'number' && info.daysLeft <= 7 && (
                                    <div className="bg-sky-600 text-white px-4 md:px-6 py-1.5 flex items-center justify-between gap-3">
                                        <p className="text-sm font-medium">
                                            {info.daysLeft <= 0 ? 'Tu prueba gratis termina hoy.' : `Te quedan ${info.daysLeft} ${info.daysLeft === 1 ? 'día' : 'días'} de prueba gratis (hasta el ${fmt(info.endsAt)}).`}
                                        </p>
                                        <Link href="/admin/plan" className="bg-white text-sky-700 px-3 py-1 rounded-lg text-sm font-semibold shrink-0">Ver planes</Link>
                                    </div>
                                )}
                            </div>

                            {/* Contenido scrollable */}
                            <main className="flex-1 overflow-y-auto custom-scrollbar relative bg-slate-50/30">
                                <div className="p-4 md:p-6 pb-36 md:pb-8 w-full max-w-none">
                                    {children}
                                </div>
                            </main>

                            {/* BottomNav: solo en móvil */}
                            <div className="md:hidden">
                                <MobileBottomNav primaryColor={primaryColor} initialBusiness={negocio} />
                            </div>
                        </div>
                    </div>
                </div>
            </BranchWarehouseProvider>
        </ConfirmProvider>
    );
}
