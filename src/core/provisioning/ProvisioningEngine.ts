// src/core/provisioning/ProvisioningEngine.ts
// Servicio Maestro de Aprovisionamiento Universal de Negocios (v1.0.0)
// Orquesta la creación, duplicación, importación y exportación de manifiestos declarativos

import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { BusinessProvisioningService } from '../services/BusinessProvisioningService';
import { SubscriptionEngine } from '../subscription/SubscriptionEngine';
import { PlanId } from '../subscription/types';

export interface ProvisioningPayload {
  mode: 'blueprint' | 'duplicate' | 'template' | 'import';
  sourceBusinessId?: string;
  blueprintId: string;
  planId: PlanId;
  generalInfo: {
    nombre: string;
    slug: string;
    whatsapp: string;
    emailContacto?: string;
    direccion?: string;
    ciudad?: string;
    logoUrl?: string;
    bannerUrl?: string;
    colorPrimario?: string;
    colorSecundario?: string;
    horarioApertura?: string;
    horarioCierre?: string;
    timezone?: string;
    currency?: string;
    language?: string;
    adminEmail: string;
    adminPassword: string;
    adminNombre?: string;
    crearDemo?: boolean;
  };
  channels: string[]; // e.g. ["TABLE", "DELIVERY", "PICKUP", "WAITER", "KITCHEN_KDS", "QR"]
  activeCapabilities: Record<string, boolean>;
  initialResources: Array<{ name: string; category?: string; capacity?: number; quantity?: number }>;
  activeModules: string[]; // e.g. ["CLUB_CITIOX", "ACADEMY", "COMMUNICATIONS", "PROMOTIONS", "AI_ASSISTANT", "INVENTORY"]
  selectedAddons: string[]; // Addon IDs
  saveAsTemplate?: boolean;
  templateName?: string;
}

export class ProvisioningEngine {
  /**
   * Crea un negocio completo en 1-Click desde un payload del Wizard Universal.
   */
  static async provisionBusiness(payload: ProvisioningPayload) {
    const { generalInfo, blueprintId, planId, selectedAddons, channels, activeCapabilities, activeModules, initialResources, saveAsTemplate, templateName } = payload;

    // 1. Validaciones previas
    if (!generalInfo.nombre || !generalInfo.slug || !generalInfo.adminEmail || !generalInfo.adminPassword) {
      throw new Error("Faltan datos obligatorios para el aprovisionamiento (Nombre, Slug, Email y Contraseña).");
    }

    const existingSlug = await prisma.negocio.findUnique({ where: { slug: generalInfo.slug } });
    if (existingSlug) {
      throw new Error(`El slug "${generalInfo.slug}" ya está registrado por otro negocio.`);
    }

    const existingUser = await prisma.usuario.findUnique({ where: { email: generalInfo.adminEmail } });
    if (existingUser) {
      throw new Error(`El correo de administrador "${generalInfo.adminEmail}" ya está registrado.`);
    }

    const businessId = crypto.randomUUID();
    const hashedPassword = await bcrypt.hash(generalInfo.adminPassword, 10);

    // 2. Construir la configuración declarativa del Runtime
    const runtimeConfig = {
      blueprintId,
      channels,
      activeCapabilities,
      activeModules,
      bannerUrl: generalInfo.bannerUrl || null,
      timezone: generalInfo.timezone || 'America/Bogota',
      currency: generalInfo.currency || 'USD',
      language: generalInfo.language || 'es',
      provisionedAt: new Date().toISOString(),
      isDemo: Boolean(generalInfo.crearDemo)
    };

    // 3. Crear el Negocio en la Base de Datos
    const negocio = await prisma.negocio.create({
      data: {
        id: businessId,
        nombre: generalInfo.nombre,
        slug: generalInfo.slug,
        whatsapp: generalInfo.whatsapp || null,
        emailContacto: generalInfo.emailContacto || generalInfo.adminEmail,
        direccion: generalInfo.direccion || null,
        ciudad: generalInfo.ciudad || null,
        propietario: generalInfo.adminNombre || generalInfo.nombre,
        horarioApertura: generalInfo.horarioApertura || '08:00',
        horarioCierre: generalInfo.horarioCierre || '22:00',
        precioHora: 0,
        colorPrimario: generalInfo.colorPrimario || '#06b6d4',
        colorSecundario: generalInfo.colorSecundario || '#0f172a',
        logoUrl: generalInfo.logoUrl || null,
        configuracion: runtimeConfig as any,
        updatedAt: new Date()
      }
    });

    // 4. Crear el Usuario Administrador principal
    const adminUser = await prisma.usuario.create({
      data: {
        id: crypto.randomUUID(),
        email: generalInfo.adminEmail,
        password: hashedPassword,
        nombre: generalInfo.adminNombre || 'Administrador',
        role: 'ADMIN',
        negocioId: businessId,
        updatedAt: new Date()
      }
    });

    // 5. Asignar el Plan y Addons en el Subscription Engine
    const planName = planId.toUpperCase();
    let dbPlan = await prisma.plan.findFirst({
      where: { name: { contains: planName } }
    });

    if (!dbPlan) {
      dbPlan = await prisma.plan.findFirst() || await prisma.plan.create({
        data: {
          id: crypto.randomUUID(),
          name: `Plan ${planId}`,
          price: planId === 'FREE' ? 0 : (planId === 'STARTER' ? 19 : 49),
          updated_at: new Date()
        }
      });
    }

    await (prisma as any).suscripcion.create({
      data: {
        id: crypto.randomUUID(),
        negocioId: businessId,
        planId: dbPlan.id,
        estado: 'active',
        fechaInicio: new Date(),
        fechaFin: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        customFeatures: {
          addons: selectedAddons,
          channels: channels,
          modules: activeModules
        }
      }
    });

    // 6. Instanciar Recursos y Servicios Iniciales según el Blueprint
    if (initialResources && initialResources.length > 0) {
      for (const res of initialResources) {
        const qty = res.quantity || 1;
        for (let i = 1; i <= qty; i++) {
          const resName = qty > 1 ? `${res.name} ${i}` : res.name;
          
          if (res.category === 'TABLE') {
            await (prisma as any).operableResource.create({
              data: {
                negocioId: businessId,
                name: resName,
                resourceType: 'INFRASTRUCTURE',
                category: 'TABLE',
                capacity: res.capacity || 4,
                estado: 'LIBRE',
                metadata: { code: resName.replace(/\s+/g, '') }
              }
            });
          } else {
            await prisma.staff.create({
              data: {
                id: crypto.randomUUID(),
                businessId,
                name: resName,
                role: res.category || 'Recurso Operativo',
                active: true,
                updatedAt: new Date()
              }
            });
          }
        }
      }
    }

    // 7. Guardar como Plantilla Reutilizable si fue solicitado
    if (saveAsTemplate && templateName) {
      await (prisma as any).configuracion.create({
        data: {
          id: crypto.randomUUID(),
          clave: `template_preset_${templateName.toLowerCase().replace(/\s+/g, '_')}`,
          valor: JSON.stringify({ templateName, payload }),
          negocioId: businessId
        }
      });
    }

    return {
      success: true,
      businessId,
      slug: negocio.slug,
      adminEmail: adminUser.email,
      negocio
    };
  }

  /**
   * Duplica un negocio existente (Clonación de sucursal/franquicia en 30 segundos).
   */
  static async duplicateBusiness(sourceBusinessId: string, targetInfo: ProvisioningPayload['generalInfo']) {
    const sourceNegocio = await prisma.negocio.findUnique({
      where: { id: sourceBusinessId },
      include: { Suscripcion: { include: { Plan: true } } }
    });

    if (!sourceNegocio) {
      throw new Error(`El negocio origen con ID "${sourceBusinessId}" no existe.`);
    }

    const sourceConfig = (sourceNegocio.configuracion as Record<string, any>) || {};

    const payload: ProvisioningPayload = {
      mode: 'duplicate',
      sourceBusinessId,
      blueprintId: sourceConfig.blueprintId || 'padel_club_standard',
      planId: (sourceNegocio.Suscripcion?.Plan?.name?.toUpperCase() as PlanId) || 'STARTER',
      generalInfo: targetInfo,
      channels: sourceConfig.channels || [],
      activeCapabilities: sourceConfig.activeCapabilities || {},
      activeModules: sourceConfig.activeModules || [],
      initialResources: [],
      selectedAddons: []
    };

    return await this.provisionBusiness(payload);
  }

  /**
   * Exporta la configuración completa de un negocio como un Business Manifest (JSON).
   */
  static async exportBusinessManifest(businessId: string) {
    const negocio = await prisma.negocio.findUnique({
      where: { id: businessId },
      include: {
        Suscripcion: true,
        Staff: true,
        Service: true
      }
    });

    if (!negocio) {
      throw new Error(`Negocio con ID ${businessId} no encontrado.`);
    }

    return {
      schemaVersion: '3.0.0',
      exportedAt: new Date().toISOString(),
      nombre: negocio.nombre,
      colorPrimario: negocio.colorPrimario,
      colorSecundario: negocio.colorSecundario,
      horarioApertura: negocio.horarioApertura,
      horarioCierre: negocio.horarioCierre,
      configuracion: negocio.configuracion,
      suscripcion: negocio.Suscripcion,
      resourcesCount: negocio.Staff?.length || 0,
      servicesCount: negocio.Service?.length || 0
    };
  }
}
