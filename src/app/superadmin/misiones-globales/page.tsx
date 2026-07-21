import prisma from '@/lib/prisma';
import MisionesUnificadasClient from '@/components/superadmin/MisionesUnificadasClient';

export const dynamic = 'force-dynamic';

export default async function MisionesGlobalesPage() {
    // Misiones de negocio (GlobalMission)
    const businessRaw = await prisma.globalMission.findMany({
        orderBy: [{ prioridad: 'desc' }, { createdAt: 'desc' }]
    });
    const businessMissions = businessRaw.map(m => ({
        id: m.id,
        titulo: m.titulo,
        descripcion: m.descripcion,
        tipo: m.tipo,
        objetivo: m.objetivo,
        recompensaTipo: m.recompensaTipo,
        recompensaValor: m.recompensaValor,
        fechaInicio: m.fechaInicio ? m.fechaInicio.toISOString() : null,
        fechaFin: m.fechaFin ? m.fechaFin.toISOString() : null,
        activa: m.activa,
        prioridad: m.prioridad,
        icono: m.icono,
        color: m.color,
    }));

    // Misiones de cliente (MissionDefinition)
    let clientMissions: any[] = [];
    try {
        const clientRaw = await (prisma as any).missionDefinition.findMany({
            orderBy: { createdAt: 'desc' }
        });
        clientMissions = clientRaw.map((m: any) => ({
            id: m.id,
            nombre: m.nombre,
            descripcion: m.descripcion,
            categoria: m.categoria,
            dificultad: m.dificultad,
            triggerEvent: m.triggerEvent,
            cantidadMeta: m.cantidadMeta,
            status: m.status,
            requiresBusinessReward: m.requiresBusinessReward,
            version: m.version,
        }));
    } catch {
        // Si el modelo aún no existe en este entorno, seguimos con array vacío
        clientMissions = [];
    }

    // Catálogo de recompensas del sistema (si existe)
    let rewardCatalog: any[] = [];
    try {
        const rewards = await (prisma as any).rewardCatalog.findMany({
            where: { activo: true },
            orderBy: { nombre: 'asc' },
            select: { id: true, nombre: true, tipo: true }
        });
        rewardCatalog = rewards;
    } catch {
        rewardCatalog = [];
    }

    return (
        <MisionesUnificadasClient
            initialBusiness={businessMissions}
            initialClients={clientMissions}
            rewardCatalog={rewardCatalog}
        />
    );
}
