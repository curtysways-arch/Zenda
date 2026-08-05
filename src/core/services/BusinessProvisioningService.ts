// src/core/services/BusinessProvisioningService.ts
// Servicio de aprovisionamiento 1-Click para Business Templates (v1.0.0)

import prisma from '@/lib/prisma';
import { BusinessTemplateManifest } from '../templates/types';
import { getTemplateManifest } from '../templates/templatesRegistry';

export class BusinessProvisioningService {
  /**
   * Despliega un Business Template para un negocio en 1-Click.
   * Actualiza el modulo, perfil, capabilities, settings y versionado de forma 100% no destructiva.
   */
  static async provisionTemplate(negocioId: string, templateIdOrManifest: string | BusinessTemplateManifest) {
    const manifest: BusinessTemplateManifest = 
      typeof templateIdOrManifest === 'string'
        ? getTemplateManifest(templateIdOrManifest)
        : templateIdOrManifest;

    if (!manifest) {
      throw new Error(`BusinessTemplate manifest not found: ${templateIdOrManifest}`);
    }

    // 1. Obtener el negocio actual
    const negocio = await prisma.negocio.findUnique({
      where: { id: negocioId },
      select: { id: true, configuracion: true },
    });

    if (!negocio) {
      throw new Error(`Negocio con ID ${negocioId} no encontrado.`);
    }

    // 2. Fusionar configuración existente preservando todos los datos previos (Backward Comp)
    const currentConfig = (negocio.configuracion as Record<string, any>) || {};

    const updatedConfig = {
      ...currentConfig,
      businessModule: manifest.module,
      businessProfile: manifest.profile,
      businessCapabilities: manifest.capabilities,
      businessSettings: manifest.settings,
      templateId: manifest.id,
      templateVersion: manifest.templateVersion,
      provisionedAt: new Date().toISOString(),
      // Compatibilidad legacy:
      tipoNegocio: manifest.module === 'FOOD_DELIVERY' ? 'PRODUCTOS' : 'RESERVA',
    };

    // 3. Actualizar la entidad Negocio con los nuevos metadatos y sugerencias de color
    await prisma.negocio.update({
      where: { id: negocioId },
      data: {
        configuracion: updatedConfig as any,
        colorPrimario: manifest.suggestedColors?.primaryColor || undefined,
        colorSecundario: manifest.suggestedColors?.secondaryColor || undefined,
      },
    });

    // 4. Crear recursos iniciales asignables si no existen
    if (manifest.initialResources && manifest.initialResources.length > 0) {
      for (const res of manifest.initialResources) {
        if (!res.name) continue;
        const existing = await prisma.staff.findFirst({
          where: { businessId: negocioId, name: res.name },
        });

        if (!existing) {
          await prisma.staff.create({
            data: {
              id: crypto.randomUUID(),
              businessId: negocioId,
              name: res.name,
              role: res.category || 'Recurso',
              active: res.active !== false,
              updatedAt: new Date(),
            },
          });
        }
      }
    }

    // 5. Crear servicios iniciales si no existen
    if (manifest.initialServices && manifest.initialServices.length > 0) {
      for (const srv of manifest.initialServices) {
        const existingSrv = await prisma.service.findFirst({
          where: { negocioId, nombre: srv.nombre },
        });

        if (!existingSrv) {
          await prisma.service.create({
            data: {
              id: crypto.randomUUID(),
              negocioId,
              nombre: srv.nombre,
              precio: srv.precio,
              duracion: srv.duracionMinutos || 60,
              estaActivo: true,
              updatedAt: new Date(),
            },
          });
        }
      }
    }

    return {
      success: true,
      negocioId,
      templateId: manifest.id,
      templateVersion: manifest.templateVersion,
      module: manifest.module,
      profile: manifest.profile,
    };
  }
}
