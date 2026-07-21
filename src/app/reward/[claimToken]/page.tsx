import { getServerSession } from "next-auth/next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { RewardService } from "@/lib/loyalty/rewardService";
import prisma from "@/lib/prisma";
import RewardClaimClient from "./RewardClaimClient";
import { AlertTriangle } from "lucide-react";

export default async function RewardClaimPage({
    params,
    searchParams
}: {
    params: Promise<{ claimToken: string }>;
    searchParams: Promise<{ sig?: string }>;
}) {
    const { claimToken } = await params;
    const { sig } = await searchParams;

    // 1. Validar la firma digital del QR
    if (!sig || !RewardService.verifySignature(claimToken, sig)) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
                <div className="max-w-md w-full bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-xl text-center space-y-4">
                    <AlertTriangle className="mx-auto text-rose-500" size={48} />
                    <h2 className="text-lg font-black uppercase text-slate-800 tracking-tight">QR Inválido</h2>
                    <p className="text-slate-500 text-xs font-semibold uppercase leading-relaxed">
                        Firma digital de seguridad ausente o inválida. El código QR ha sido alterado o es obsoleto.
                    </p>
                </div>
            </div>
        );
    }

    // 2. Buscar el premio por claimToken
    const reward = await RewardService.findByClaimToken(claimToken);
    if (!reward) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
                <div className="max-w-md w-full bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-xl text-center space-y-4">
                    <AlertTriangle className="mx-auto text-rose-500" size={48} />
                    <h2 className="text-lg font-black uppercase text-slate-800 tracking-tight">Premio No Encontrado</h2>
                    <p className="text-slate-500 text-xs font-semibold uppercase leading-relaxed">
                        El premio no existe o su código QR es inválido.
                    </p>
                </div>
            </div>
        );
    }

    // 3. Validar sesión de usuario (debe ser del mismo negocio)
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        // Redirigir a login preservando la url de retorno
        const callbackUrl = `/reward/${claimToken}?sig=${sig}`;
        redirect(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
    }

    const negocioId = (session.user as any).negocioId;
    if (reward.negocioId !== negocioId) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
                <div className="max-w-md w-full bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-xl text-center space-y-4">
                    <AlertTriangle className="mx-auto text-rose-500" size={48} />
                    <h2 className="text-lg font-black uppercase text-slate-800 tracking-tight">Acceso Denegado</h2>
                    <p className="text-slate-500 text-xs font-semibold uppercase leading-relaxed">
                        Este premio pertenece a otro negocio y no estás autorizado para gestionarlo.
                    </p>
                </div>
            </div>
        );
    }

    // 4. Obtener datos de red de la petición (IP y User Agent)
    const headersList = await headers();
    const ip = headersList.get("x-forwarded-for") || "127.0.0.1";
    const userAgent = headersList.get("user-agent") || "";

    // 5. Incrementar contador de escaneos y registrar auditoría de escaneo si no está revocado
    if (!reward.claimTokenRevokedAt) {
        await RewardService.incrementScanCount(reward.id, reward.tipoOrigen);
        await RewardService.createAudit(reward.id, reward.tipoOrigen, 'SCANNED', {
            negocioId,
            claimCode: reward.claimCode,
            oldStatus: reward.estado,
            newStatus: reward.estado,
            employeeId: (session.user as any).id,
            ip,
            userAgent
        });
    }

    // 6. Obtener auditorías del premio e inyectar nombres de los empleados
    const audits = await prisma.rewardAudit.findMany({
        where: { rewardId: reward.id, rewardType: reward.tipoOrigen },
        orderBy: { createdAt: 'desc' }
    });

    const employeeIds = audits.map(a => a.empleadoId).filter(Boolean) as string[];
    const employees = await prisma.usuario.findMany({
        where: { id: { in: employeeIds } },
        select: { id: true, nombre: true }
    });
    const employeeMap = new Map(employees.map(e => [e.id, e.nombre]));

    const auditsWithNames = audits.map(a => ({
        ...a,
        empleadoId: a.empleadoId ? (employeeMap.get(a.empleadoId) || a.empleadoId) : 'Sistema'
    }));

    return (
        <RewardClaimClient 
            reward={reward} 
            sig={sig}
            employeeName={(session.user as any).nombre || session.user.name || session.user.email || 'Empleado'}
            audits={auditsWithNames}
        />
    );
}
