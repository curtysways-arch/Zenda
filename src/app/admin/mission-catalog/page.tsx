import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { BusinessMissionService } from '@/lib/growth/businessMissionService';
import BusinessMissionCatalog from '@/components/admin/BusinessMissionCatalog';

export const dynamic = 'force-dynamic';

export default async function AdminMissionCatalogPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!user?.negocioId) {
    redirect('/login');
  }

  const negocioId = user.negocioId;

  // 1. Obtener catálogo disponible (excluye las ya instaladas)
  const availableRaw = await BusinessMissionService.getAvailableCatalog(negocioId);

  // 2. Obtener misiones instaladas
  const installedRaw = await BusinessMissionService.getByNegocio(negocioId);

  // 3. Obtener servicios y color del negocio
  const [negocio, servicesRaw] = await Promise.all([
    prisma.negocio.findUnique({
      where: { id: negocioId },
      select: { colorPrimario: true }
    }),
    prisma.service.findMany({
      where: { negocioId, estaActivo: true },
      select: { id: true, nombre: true, precio: true },
      orderBy: { nombre: 'asc' }
    })
  ]);

  const primaryColor = negocio?.colorPrimario || '#0ea5e9';
  const services = servicesRaw.map(s => ({
    id: s.id,
    nombre: s.nombre,
    precio: Number(s.precio) || 0
  }));

  // Serializar fechas y campos JSON
  const catalog = availableRaw.map(m => ({
    id: m.id,
    nombre: m.nombre,
    descripcion: m.descripcion,
    imagenUrl: m.imagenUrl,
    categoria: m.categoria,
    dificultad: m.dificultad,
    triggerEvent: m.triggerEvent,
    cantidadMeta: m.cantidadMeta,
    requiresBusinessReward: m.requiresBusinessReward,
    Rewards: m.Rewards.map(r => ({
      id: r.id,
      orden: r.orden,
      RewardCatalog: {
        id: r.RewardCatalog.id,
        nombre: r.RewardCatalog.nombre,
        descripcion: r.RewardCatalog.descripcion,
        tipo: r.RewardCatalog.tipo,
        valor: r.RewardCatalog.valor ? JSON.parse(JSON.stringify(r.RewardCatalog.valor)) : null
      }
    })),
    Publications: m.Publications.map(p => ({
      id: p.id,
      fechaInicio: p.fechaInicio?.toISOString() || null,
      fechaFin: p.fechaFin?.toISOString() || null
    }))
  }));

  const installed = installedRaw.map(bm => ({
    id: bm.id,
    missionDefinitionId: bm.missionDefinitionId,
    negocioId: bm.negocioId,
    rewardConfiguration: bm.rewardConfiguration ? JSON.parse(JSON.stringify(bm.rewardConfiguration)) : null,
    status: bm.status,
    publishedAt: bm.publishedAt?.toISOString() || null,
    MissionDefinition: {
      id: bm.MissionDefinition.id,
      nombre: bm.MissionDefinition.nombre,
      descripcion: bm.MissionDefinition.descripcion,
      imagenUrl: bm.MissionDefinition.imagenUrl,
      categoria: bm.MissionDefinition.categoria,
      dificultad: bm.MissionDefinition.dificultad,
      triggerEvent: bm.MissionDefinition.triggerEvent,
      cantidadMeta: bm.MissionDefinition.cantidadMeta,
      requiresBusinessReward: bm.MissionDefinition.requiresBusinessReward,
      Rewards: bm.MissionDefinition.Rewards.map(r => ({
        id: r.id,
        orden: r.orden,
        RewardCatalog: {
          id: r.RewardCatalog.id,
          nombre: r.RewardCatalog.nombre,
          descripcion: r.RewardCatalog.descripcion,
          tipo: r.RewardCatalog.tipo,
          valor: r.RewardCatalog.valor ? JSON.parse(JSON.stringify(r.RewardCatalog.valor)) : null
        }
      })),
      Publications: []
    }
  }));

  return (
    <BusinessMissionCatalog
      initialCatalog={catalog as any}
      initialInstalled={installed as any}
      primaryColor={primaryColor}
      services={services}
    />
  );
}
