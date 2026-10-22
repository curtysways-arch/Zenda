// src/core/provisioning/ProvisioningEngine.ts
// Servicio Maestro de Aprovisionamiento Universal de Negocios (v2.0.0 Canónico)
// Orquesta la creación, vinculación de BusinessType -> PlanFamily -> Plan, 
// Sucursales, Hero/Highlights, Catálogo y Administrador.

import { TRIAL_DAYS, addDays, addMonths } from '@/lib/subscription/lifecycle';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { BranchService } from '../branch/BranchService';
import { getTemplateManifest } from '../templates/templatesRegistry';

export interface ProvisioningCatalogItem {
  type: 'product' | 'service';
  name: string;
  category?: string;
  price: number;
  duration?: number;
  stock?: number;
  sku?: string;
  imageUrl?: string;
  description?: string;
  variants?: Array<{ name: string; price?: number; stock?: number }>;
}

export interface ProvisioningBranchItem {
  name: string;
  address?: string;
  city?: string;
  phone?: string;
  isMain?: boolean;
  latitude?: number | null;
  longitude?: number | null;
}

export interface ProvisioningPayload {
  mode?: 'blueprint' | 'duplicate' | 'template' | 'import' | 'quick';
  sourceBusinessId?: string;
  businessTypeId?: string;
  blueprintId?: string;
  planId: string;
  
  // Datos comerciales de Fundador
  isFounder?: boolean;
  founderPosition?: number;
  lockedPrice?: number;
  trialDays?: number;

  // Precio negociado (independiente del Founder — NO mezclar conceptos)
  /** Precio comercial negociado en USD. Si es null/undefined, se usa Plan.price. */
  negotiatedPrice?: number;
  /**
   * Duración del precio negociado.
   * 'PERMANENT' = permanente mientras esté vigente la condición comercial.
   * number = cantidad de ciclos de facturación tras los cuales vuelve al precio normal.
   */
  negotiatedPriceDuration?: 'PERMANENT' | number;
  /** Razón o descripción de la negociación (aparece en auditoría). */
  negotiatedPriceReason?: string;


  generalInfo: {
    nombre: string;
    nombreLegal?: string;
    slug: string;
    whatsapp: string;
    emailContacto?: string;
    direccion?: string;
    ciudad?: string;
    gpsUrl?: string;
    latitude?: number | null;
    longitude?: number | null;
    descripcionCorta?: string;
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
    adminTelefono?: string;
    crearDemo?: boolean;
  };

  // Contenido de Landing
  landingHero?: {
    title?: string;
    subtitle?: string;
    ctaText?: string;
    ctaAction?: string;
    imageUrl?: string;
  };
  landingHighlights?: Array<{
    title: string;
    type?: string;
    price?: number;
    imageUrl?: string;
    description?: string;
  }>;

  // Catálogo o Contenido Inicial
  catalogItems?: ProvisioningCatalogItem[];
  
  // Sucursales
  branches?: ProvisioningBranchItem[];

  // Configuración de Runtime y Módulos
  channels?: string[];
  activeCapabilities?: Record<string, boolean>;
  initialResources?: Array<{ name: string; category?: string; capacity?: number; quantity?: number }>;
  activeModules?: string[];
  selectedAddons?: string[];
  saveAsTemplate?: boolean;
  templateName?: string;
}

export class ProvisioningEngine {
  /**
   * Crea y aprovisiona un negocio completo en 1-Click desde el Asistente de Entrega de App.
   */
  static async provisionBusiness(payload: ProvisioningPayload) {
    const {
      generalInfo,
      businessTypeId,
      blueprintId: rawBlueprintId,
      planId,
      isFounder,
      founderPosition,
      lockedPrice,
      trialDays,
      landingHero,
      landingHighlights,
      catalogItems,
      branches,
      selectedAddons = [],
      channels = [],
      activeCapabilities = {},
      activeModules = [],
      initialResources = [],
      saveAsTemplate,
      templateName,
      negotiatedPrice,
      negotiatedPriceDuration,
      negotiatedPriceReason,
    } = payload;


    // 1. Validaciones previas
    if (!generalInfo?.nombre?.trim()) {
      throw new Error("El nombre comercial del negocio es obligatorio.");
    }
    if (!generalInfo?.slug?.trim()) {
      throw new Error("El slug del negocio es obligatorio.");
    }
    if (!generalInfo?.adminEmail?.trim() || !generalInfo?.adminPassword?.trim()) {
      throw new Error("Se requiere correo electrónico y contraseña para el administrador inicial.");
    }

    const cleanSlug = generalInfo.slug
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-');

    const existingSlug = await prisma.negocio.findUnique({ where: { slug: cleanSlug } });
    if (existingSlug) {
      throw new Error(`El slug "${cleanSlug}" ya se encuentra registrado por otro negocio.`);
    }

    const cleanEmail = generalInfo.adminEmail.toLowerCase().trim();
    const existingUser = await prisma.usuario.findUnique({ where: { email: cleanEmail } });
    if (existingUser) {
      throw new Error(`El correo de administrador "${cleanEmail}" ya está registrado.`);
    }

    // 2. Determinar BusinessType real desde la BD
    let dbBusinessType = null;
    if (businessTypeId) {
      dbBusinessType = await prisma.businessType.findUnique({
        where: { id: businessTypeId },
        include: { planFamily: true }
      });
    }

    if (!dbBusinessType && rawBlueprintId) {
      // Buscar por slug aproximado
      const bUpper = rawBlueprintId.toUpperCase();
      let targetSlug = 'comandas';
      if (bUpper.includes('PADEL') || bUpper.includes('CANCHA') || bUpper.includes('SPORT')) targetSlug = 'reservas';
      else if (bUpper.includes('SPA') || bUpper.includes('BARBER') || bUpper.includes('BEAUTY') || bUpper.includes('CITAS')) targetSlug = 'citas';
      else if (bUpper.includes('SHOE') || bUpper.includes('LAUNDRY') || bUpper.includes('LAVANDERIA') || bUpper.includes('LAVADO') || bUpper.includes('WASH')) targetSlug = 'ordenes-servicio';
      else if (bUpper.includes('STORE') || bUpper.includes('TIENDA') || bUpper.includes('RETAIL')) targetSlug = 'ecommerce';
      else if (bUpper.includes('GYM') || bUpper.includes('FITNESS')) targetSlug = 'gimnasio';
      else if (bUpper.includes('CLINIC') || bUpper.includes('DENTAL') || bUpper.includes('ODONTO')) targetSlug = 'dentista';

      dbBusinessType = await prisma.businessType.findUnique({
        where: { slug: targetSlug },
        include: { planFamily: true }
      });
    }

    if (!dbBusinessType) {
      dbBusinessType = await prisma.businessType.findFirst({
        include: { planFamily: true }
      });
    }

    const finalBusinessTypeId = dbBusinessType?.id || null;
    const finalPlanFamily = dbBusinessType?.planFamily || null;

    // Determinar Blueprint y canonical tipoNegocio
    const blueprintId = rawBlueprintId || (dbBusinessType?.initialConfig as any)?.blueprintId || 'RESTAURANT_STANDARD';
    let canonicalTipoNegocio = (dbBusinessType?.initialConfig as any)?.tipoNegocio || 'RESERVA';
    if (dbBusinessType?.slug === 'comandas') canonicalTipoNegocio = 'RESTAURANT';
    else if (dbBusinessType?.slug === 'citas') canonicalTipoNegocio = 'RESERVA';
    else if (dbBusinessType?.slug === 'reservas') canonicalTipoNegocio = 'SPORTS_COURTS';
    else if (dbBusinessType?.slug === 'ordenes-servicio' || dbBusinessType?.slug === 'lavanderia' || dbBusinessType?.slug === 'lavanderias' || dbBusinessType?.slug === 'lavado') canonicalTipoNegocio = 'LAVANDERIA';
    else if (dbBusinessType?.slug === 'ecommerce') canonicalTipoNegocio = 'TIENDA';
    else if (dbBusinessType?.slug === 'gimnasio') canonicalTipoNegocio = 'GIMNASIO';
    else if (dbBusinessType?.slug === 'dentista') canonicalTipoNegocio = 'RESERVA';

    if (blueprintId.toUpperCase().includes('LAVAND') || blueprintId.toUpperCase().includes('SHOE') || blueprintId.toUpperCase().includes('WASH')) {
      canonicalTipoNegocio = 'LAVANDERIA';
    }

    // 3. Resolver Plan en la Base de Datos
    let dbPlan = null;
    if (planId) {
      dbPlan = await prisma.plan.findUnique({ where: { id: planId } });
      if (!dbPlan) {
        dbPlan = await prisma.plan.findFirst({
          where: {
            OR: [
              { slug: planId },
              { name: { contains: planId } },
              { id: { contains: planId } }
            ]
          }
        });
      }
    }

    if (!dbPlan && finalPlanFamily) {
      // Tomar el plan Crecimiento o Default de la familia
      dbPlan = await prisma.plan.findFirst({
        where: {
          familyId: finalPlanFamily.id,
          OR: [{ isDefault: true }, { price: { gt: 0 } }]
        },
        orderBy: { price: 'asc' }
      });
    }

    if (!dbPlan) {
      dbPlan = await prisma.plan.findFirst({ where: { activo: true } }) || await prisma.plan.create({
        data: {
          id: crypto.randomUUID(),
          name: 'Plan Estándar',
          price: 19.99,
          updated_at: new Date()
        }
      });
    }

    // 4. Runtime Config declarativo
    const businessId = crypto.randomUUID();
    
    let effectiveCapabilities = { ...activeCapabilities };
    let effectiveModules = [...activeModules];
    let effectiveChannels = channels.length > 0 ? channels : ['TABLE', 'DELIVERY', 'PICKUP', 'QR'];

    if (canonicalTipoNegocio === 'LAVANDERIA' || canonicalTipoNegocio === 'SHOE_CARE') {
      effectiveCapabilities = {
        orders: true,
        delivery: true,
        catalog: true,
        services: true,
        service_orders: true,
        loyalty: true,
        ...activeCapabilities
      };
      effectiveModules = Array.from(new Set([
        'ORDERS',
        'DELIVERY',
        'SERVICES',
        'LOYALTY',
        ...activeModules
      ]));
      effectiveChannels = channels.length > 0 ? channels : ['DELIVERY', 'PICKUP', 'QR'];
    }

    const runtimeConfig = {
      blueprintId,
      tipoNegocio: canonicalTipoNegocio,
      businessTypeSlug: dbBusinessType?.slug || 'general',
      planFamilyCode: finalPlanFamily?.code || 'GENERAL',
      channels: effectiveChannels,
      activeCapabilities: effectiveCapabilities,
      activeModules: effectiveModules,
      bannerUrl: generalInfo.bannerUrl || null,
      timezone: generalInfo.timezone || 'America/Guayaquil',
      currency: generalInfo.currency || 'USD',
      language: generalInfo.language || 'es',
      gpsUrl: generalInfo.gpsUrl || null,
      descripcionCorta: generalInfo.descripcionCorta || null,
      nombreLegal: generalInfo.nombreLegal || null,
      provisionedAt: new Date().toISOString(),
      provisionedBy: 'SUPERADMIN',
      isDemo: Boolean(generalInfo.crearDemo)
    };

    const hashedPassword = await bcrypt.hash(generalInfo.adminPassword, 10);

    // 5. Crear el registro maestro Negocio
    const negocio = await prisma.negocio.create({
      data: {
        id: businessId,
        nombre: generalInfo.nombre.trim(),
        slug: cleanSlug,
        tipoNegocio: canonicalTipoNegocio,
        businessTypeId: finalBusinessTypeId,
        whatsapp: generalInfo.whatsapp || null,
        emailContacto: generalInfo.emailContacto || generalInfo.adminEmail,
        direccion: generalInfo.direccion || null,
        ciudad: generalInfo.ciudad || null,
        propietario: generalInfo.adminNombre || generalInfo.nombre,
        horarioApertura: generalInfo.horarioApertura || '08:00',
        horarioCierre: generalInfo.horarioCierre || '22:00',
        precioHora: 0,
        colorPrimario: generalInfo.colorPrimario || dbBusinessType?.color || '#059669',
        colorSecundario: generalInfo.colorSecundario || '#0f172a',
        logoUrl: generalInfo.logoUrl || null,
        heroTitulo: landingHero?.title || generalInfo.nombre,
        heroSubtitulo: landingHero?.subtitle || generalInfo.descripcionCorta || 'Descubre nuestros servicios y productos',
        configuracion: runtimeConfig as any,
        updatedAt: new Date()
      }
    });

    // 6. Crear el Usuario Administrador principal
    let finalPhone = generalInfo.adminTelefono || generalInfo.whatsapp || null;
    if (finalPhone) {
      const existingPhone = await prisma.usuario.findFirst({ where: { phone: finalPhone } });
      if (existingPhone) {
        finalPhone = null;
      }
    }

    const adminUser = await prisma.usuario.create({
      data: {
        id: crypto.randomUUID(),
        email: cleanEmail,
        password: hashedPassword,
        nombre: generalInfo.adminNombre || 'Administrador',
        phone: finalPhone,
        role: 'ADMIN',
        negocioId: businessId,
        updatedAt: new Date()
      }
    });

    // 7. Suscripción: misma regla que el registro web (lib/subscription/lifecycle)
    //    - 30 días de prueba completa (o los que indique quien lo crea; 0 = sin prueba, 1 mes activo).
    //    - La fecha de fin es el fin de la prueba (antes se sumaban 30 días extra: 60 días gratis).
    //    - Socio Fundador: queda como candidato si su tipo de negocio tiene cupos; el cupo y el
    //      precio de por vida se confirman al aprobarse el primer pago.
    const effectiveTrialDays = trialDays !== undefined && trialDays !== null ? Math.max(0, Number(trialDays)) : TRIAL_DAYS;
    const now = new Date();
    const trialFinDate = addDays(now, effectiveTrialDays);
    const subFinDate = effectiveTrialDays > 0 ? trialFinDate : addMonths(now, 1);

    let founderCandidate: any = null;
    if (isFounder && finalPlanFamily?.id) {
      const prog = await (prisma as any).founderProgram.findUnique({ where: { familyId: finalPlanFamily.id } });
      if (prog?.enabled && prog.currentMembers < prog.maxMembers) {
        founderCandidate = { founderCandidate: true, founderReservedPrice: prog.founderPrice, familyId: finalPlanFamily.id };
      }
    }

    const suscripcionId = crypto.randomUUID();
    await (prisma as any).suscripcion.create({
      data: {
        id: suscripcionId,
        negocioId: businessId,
        planId: dbPlan.id,
        estado: effectiveTrialDays > 0 ? 'trial' : 'active',
        fechaInicio: now,
        fechaFin: subFinDate,
        trial_inicio: effectiveTrialDays > 0 ? now : null,
        trial_fin: effectiveTrialDays > 0 ? trialFinDate : null,
        isFounder: false,
        founderPosition: null,
        lockedPrice: null,
        customFeatures: {
          addons: selectedAddons,
          channels: runtimeConfig.channels,
          modules: activeModules,
          provisionedBy: 'SUPERADMIN',
          ...(founderCandidate || {})
        },
        updatedAt: now
      }
    });

    // 7b. Si hay precio negociado, crear el SubscriptionPricingOverride.
    //     REGLA: NO modifica isFounder ni lockedPrice — conceptos independientes.
    if (negotiatedPrice !== undefined && negotiatedPrice !== null && negotiatedPriceDuration !== undefined) {
      try {
        const { pricingService } = await import('@/lib/services/pricingService');
        await pricingService.applyNegotiatedPrice({
          subscriptionId: suscripcionId,
          amount: negotiatedPrice,
          currency: generalInfo.currency || 'USD',
          duration: negotiatedPriceDuration,
          reason: negotiatedPriceReason || `Precio negociado al provisionar: ${generalInfo.nombre}`,
          createdByAdminId: 'SUPERADMIN_PROVISIONING',
        });
      } catch (priceErr: any) {
        console.warn('[Provisioning] No se pudo crear precio negociado:', priceErr.message);
      }
    }



    // 8. Crear la Sucursal Principal (Matriz) y adicionales si se suministraron
    try {
      const mainBranchInput = {
        name: `${generalInfo.nombre} (Matriz)`,
        address: generalInfo.direccion || 'Sede Principal',
        city: generalInfo.ciudad || '',
        phone: generalInfo.whatsapp || '',
        isDefault: true,
        latitude: generalInfo.latitude || null,
        longitude: generalInfo.longitude || null
      };
      await BranchService.createBranch(businessId, mainBranchInput);

      // Si hay sucursales extra provistas en el wizard
      if (Array.isArray(branches) && branches.length > 0) {
        for (const br of branches) {
          if (br.name && br.name.trim() !== '') {
            await BranchService.createBranch(businessId, {
              name: br.name.trim(),
              address: br.address || '',
              city: br.city || generalInfo.ciudad || '',
              phone: br.phone || generalInfo.whatsapp || '',
              isDefault: false,
              latitude: br.latitude || null,
              longitude: br.longitude || null
            }).catch(e => console.warn(`[Provisioning] No se pudo crear sucursal secundaria "${br.name}":`, e.message));
          }
        }
      }
    } catch (brErr: any) {
      console.warn('[Provisioning] Advertencia al crear sucursal inicial:', brErr.message);
    }

    // 9. Aprovisionar Landing: HeroItem y HighlightItem
    try {
      const heroImage = landingHero?.imageUrl || generalInfo.bannerUrl || generalInfo.logoUrl || null;
      if (heroImage || landingHero?.title) {
        await (prisma as any).heroItem.create({
          data: {
            businessId,
            type: 'IMAGE',
            sourceType: 'CUSTOM',
            image: heroImage || '',
            title: landingHero?.title || generalInfo.nombre,
            description: landingHero?.subtitle || generalInfo.descripcionCorta || 'Bienvenido a nuestra plataforma',
            buttonEnabled: Boolean(landingHero?.ctaText),
            buttonText: landingHero?.ctaText || 'Ver opciones',
            actionType: landingHero?.ctaAction || 'CATALOG',
            isActive: true,
            position: 0,
            priority: 10
          }
        });
      }

      if (Array.isArray(landingHighlights) && landingHighlights.length > 0) {
        for (let idx = 0; idx < landingHighlights.length; idx++) {
          const hl = landingHighlights[idx];
          if (hl.title) {
            await (prisma as any).highlightItem.create({
              data: {
                businessId,
                type: hl.type || 'IMAGE',
                sourceType: 'CUSTOM',
                image: hl.imageUrl || '',
                title: hl.title,
                description: hl.description || '',
                position: idx,
                priority: 5,
                isActive: true
              }
            });
          }
        }
      }
    } catch (landingErr: any) {
      console.warn('[Provisioning] Advertencia al configurar Hero/Highlights:', landingErr.message);
    }

    // 10. Aprovisionar Catálogo: Productos, Servicios, Categorías
    const createdCategoriesMap = new Map<string, string>();

    if (Array.isArray(catalogItems) && catalogItems.length > 0) {
      for (const item of catalogItems) {
        if (!item.name || !item.name.trim()) continue;

        // Categoría (si aplica)
        let catId: string | null = null;
        if (item.category && item.category.trim()) {
          const catName = item.category.trim();
          if (createdCategoriesMap.has(catName)) {
            catId = createdCategoriesMap.get(catName)!;
          } else {
            const cat = await (prisma as any).categoriaProducto.create({
              data: {
                id: crypto.randomUUID(),
                negocioId: businessId,
                nombre: catName,
                orden: createdCategoriesMap.size + 1,
                activo: true,
                updatedAt: new Date()
              }
            });
            catId = cat.id;
            createdCategoriesMap.set(catName, cat.id);
          }
        }

        if (item.type === 'service') {
          await prisma.service.create({
            data: {
              id: crypto.randomUUID(),
              negocioId: businessId,
              nombre: item.name.trim(),
              precio: Number(item.price) || 0,
              duracion: Number(item.duration) || 45,
              estaActivo: true,
              extraInfo: {
                descripcion: item.description || null,
                categoria: item.category || 'General'
              },
              updatedAt: new Date()
            }
          });
        } else {
          // Producto físico/carta
          const hasVariants = Array.isArray(item.variants) && item.variants.length > 0;
          await (prisma as any).producto.create({
            data: {
              id: crypto.randomUUID(),
              negocioId: businessId,
              categoriaId: catId,
              nombre: item.name.trim(),
              descripcion: item.description || null,
              precio: Number(item.price) || 0,
              imagenUrl: item.imageUrl || null,
              stock: item.stock !== undefined ? Number(item.stock) : null,
              sku: item.sku || null,
              activo: true,
              tieneVariantes: hasVariants,
              extraInfo: hasVariants ? { variantes: item.variants } : undefined,
              updatedAt: new Date()
            }
          });
        }
      }
    } else {
      // Contenido por defecto sugerido por Blueprint si no se suministró catálogo
      const templateManifest = getTemplateManifest(blueprintId);
      if (templateManifest?.initialServices && templateManifest.initialServices.length > 0) {
        for (const s of templateManifest.initialServices) {
          await prisma.service.create({
            data: {
              id: crypto.randomUUID(),
              negocioId: businessId,
              nombre: s.nombre,
              precio: s.precio || 0,
              duracion: s.duracionMinutos || 30,
              estaActivo: true,
              extraInfo: {
                descripcion: s.descripcion || `Servicio inicial configurado para ${templateManifest.name}`,
                categoria: s.categoria || 'General'
              },
              updatedAt: new Date()
            }
          });
        }
      }

      // Si es Restaurante o Tienda, crear categorías por defecto
      if (canonicalTipoNegocio === 'TIENDA' || canonicalTipoNegocio === 'PRODUCTOS') {
        await (prisma as any).categoriaProducto.createMany({
          data: [
            { id: crypto.randomUUID(), negocioId: businessId, nombre: 'Colección General', orden: 1, activo: true, updatedAt: new Date() },
            { id: crypto.randomUUID(), negocioId: businessId, nombre: 'Novedades & Destacados', orden: 2, activo: true, updatedAt: new Date() }
          ]
        });
      } else if (canonicalTipoNegocio === 'RESTAURANT') {
        await (prisma as any).categoriaProducto.createMany({
          data: [
            { id: crypto.randomUUID(), negocioId: businessId, nombre: 'Platos & Especialidades', orden: 1, activo: true, updatedAt: new Date() },
            { id: crypto.randomUUID(), negocioId: businessId, nombre: 'Bebidas & Refrescos', orden: 2, activo: true, updatedAt: new Date() }
          ]
        });
      }
    }

    // 11. Instanciar Recursos Operativos (Mesas, Canchas, Equipos, Staff)
    const infrastructureCategories = [
      'TABLE', 'INFRASTRUCTURE', 'EQUIPMENT', 'WAREHOUSE', 'POS', 
      'KITCHEN', 'DISPATCH', 'BARBER_CHAIR', 'DENTAL_CHAIR', 'CLASSROOM', 
      'WASHING_STATION', 'CONSULTING_ROOM', 'CANCHA', 'Pádel', 'Padel',
      'GYM_AREA', 'GYM_MACHINE'
    ];

    if (initialResources && initialResources.length > 0) {
      for (const res of initialResources) {
        const qty = res.quantity || 1;
        for (let i = 1; i <= qty; i++) {
          const resName = qty > 1 ? `${res.name} ${i}` : res.name;
          const isOperable = infrastructureCategories.includes(res.category || '');
          
          if (isOperable) {
            await (prisma as any).operableResource.create({
              data: {
                negocioId: businessId,
                name: resName,
                resourceType: res.category === 'POS' || res.category?.includes('CHAIR') ? 'EQUIPMENT' : 'INFRASTRUCTURE',
                category: res.category || 'TABLE',
                capacity: res.capacity || 1,
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

    // 12. Guardar como Plantilla Reutilizable si fue solicitado
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

    // 13. URLs de entrega final
    const publicUrl = `/${negocio.slug}`;
    const adminUrl = `/admin`;
    const superadminUrl = `/superadmin/negocios`;

    return {
      success: true,
      businessId,
      slug: negocio.slug,
      nombre: negocio.nombre,
      adminEmail: adminUser.email,
      plan: dbPlan.name,
      planPrice: dbPlan.price,
      isFounder: Boolean(isFounder),
      publicAppUrl: publicUrl,
      publicLandingUrl: publicUrl,
      adminAccessUrl: adminUrl,
      superadminUrl,
      modules: activeModules,
      negocio
    };
  }

  /**
   * Duplica un negocio existente (Clonación de sucursal/franquicia).
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
      businessTypeId: sourceNegocio.businessTypeId || undefined,
      blueprintId: sourceConfig.blueprintId || 'restaurant_standard',
      planId: sourceNegocio.Suscripcion?.planId || 'plan_restaurante_crecimiento',
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
        Service: true,
        branches: true
      }
    });

    if (!negocio) {
      throw new Error(`Negocio con ID ${businessId} no encontrado.`);
    }

    return {
      schemaVersion: '4.0.0',
      exportedAt: new Date().toISOString(),
      nombre: negocio.nombre,
      colorPrimario: negocio.colorPrimario,
      colorSecundario: negocio.colorSecundario,
      horarioApertura: negocio.horarioApertura,
      horarioCierre: negocio.horarioCierre,
      configuracion: negocio.configuracion,
      suscripcion: negocio.Suscripcion,
      branchesCount: negocio.branches?.length || 0,
      resourcesCount: negocio.Staff?.length || 0,
      servicesCount: negocio.Service?.length || 0
    };
  }
}
