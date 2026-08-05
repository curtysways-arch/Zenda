// src/core/runtime/BusinessRuntimeService.ts
// Servicio central encargado de ensamlar y cachear el BusinessRuntime de 5 Pilares

import prisma from '@/lib/prisma';
import { BusinessRuntime } from './types';
import { LegacyRuntimeAdapter } from './LegacyRuntimeAdapter';

const runtimeCache = new Map<string, { runtime: BusinessRuntime; timestamp: number }>();
const CACHE_TTL_MS = 60 * 1000; // 1 minuto de caché en memoria

export class BusinessRuntimeService {
  /**
   * Limpia el caché en memoria para un negocio o todos
   */
  static clearCache(negocioId?: string) {
    if (negocioId) {
      runtimeCache.delete(negocioId);
    } else {
      runtimeCache.clear();
    }
  }

  /**
   * Obtiene el BusinessRuntime para un ID de negocio o slug
   */
  static async getRuntimeForNegocio(negocioIdOrSlug: string): Promise<BusinessRuntime> {
    const cached = runtimeCache.get(negocioIdOrSlug);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
      return cached.runtime;
    }

    // 1. Buscar negocio en base de datos
    const negocio = await prisma.negocio.findFirst({
      where: {
        OR: [{ id: negocioIdOrSlug }, { slug: negocioIdOrSlug }]
      },
      include: {
        Service: true
      }
    });

    if (!negocio) {
      throw new Error(`Negocio '${negocioIdOrSlug}' no encontrado.`);
    }

    // 2. Intentar buscar un BusinessBlueprint relacional asociado
    const blueprint = await prisma.businessBlueprint.findFirst({
      where: {
        OR: [
          { businessTypeId: negocio.businessTypeId || '' },
          { slug: negocio.slug }
        ],
        active: true
      }
    });

    let runtime: BusinessRuntime;

    if (blueprint) {
      // Ensamblar Runtime desde entidades relacionales
      const expProfile = blueprint.experienceProfileId
        ? await prisma.experienceProfile.findUnique({ where: { id: blueprint.experienceProfileId } })
        : null;

      runtime = {
        blueprint: {
          id: blueprint.id,
          name: blueprint.name,
          code: blueprint.code,
          slug: blueprint.slug,
          category: negocio.tipoNegocio,
          version: blueprint.version,
          active: blueprint.active,
          isDefault: blueprint.isDefault,
        },
        definition: {
          modules: (blueprint.modules as string[]) || ['BOOKING'],
          capabilities: (blueprint.capabilities as Record<string, boolean>) || { booking: true },
          workflow: { id: blueprint.workflowId || 'default_wf' },
          resources: (negocio as any).Service || [],
          plans: ['STARTER', 'GROWTH', 'PRO'],
          settings: negocio.configuracion || {},
          roles: ['ADMINISTRADOR', 'RECEPCION', 'CLIENTE'],
          permissions: ['READ', 'WRITE']
        },
        experience: {
          landing: { component: expProfile?.landingPackId || 'DefaultLanding', theme: expProfile?.themePackId || 'modern' },
          admin: { component: expProfile?.adminPackId || 'AdminSidebarLayout', layoutType: 'SIDEBAR' },
          dashboard: { layoutType: expProfile?.dashboardPackId || 'CARDS' },
          navigation: { items: ['INICIO', 'RESERVAS', 'SERVICIOS'] },
          forms: { pack: expProfile?.formsPackId || 'DEFAULT' },
          cards: { pack: expProfile?.cardsPackId || 'DEFAULT' },
          tables: { pack: expProfile?.tablesPackId || 'DEFAULT' },
          widgets: { pack: expProfile?.widgetsPackId || 'DEFAULT' },
          theme: { primaryColor: negocio.colorPrimario || '#7c3aed', secondaryColor: negocio.colorSecundario || '#4f46e5' },
          mobile: { appType: expProfile?.mobilePackId || 'PWA' }
        },
        operations: {
          policies: (blueprint.policies as any[]) || [],
          integrations: (blueprint.integrations as any[]) || []
        },
        intelligence: {
          skills: (blueprint.aiSkills as any[]) || [],
          assistants: [],
          models: [],
          prompts: []
        }
      };
    } else {
      // 3. Fallback al Adaptador Legacy (garantiza 100% retrocompatibilidad)
      runtime = LegacyRuntimeAdapter.createRuntimeFromNegocio(negocio);
    }

    runtimeCache.set(negocioIdOrSlug, { runtime, timestamp: Date.now() });
    return runtime;
  }
}
