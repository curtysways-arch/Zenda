/**
 * @file addonService.ts
 * @module lib/services
 * @description Servicio canónico para la gestión comercial y ciclo de vida de Add-ons en Citiox.
 */

import prisma from '@/lib/prisma';
import { Addon, SubscriptionAddon, SubscriptionAddonStatus, SubscriptionAddonAction } from '@prisma/client';
import { LegacyCompatibilityResolver } from '@/core/modules/LegacyCompatibilityResolver';

export interface AddonAvailabilityDTO {
  addon: Addon;
  isPurchased: boolean;
  isPendingPayment?: boolean;
  activeContract?: {
    id: string;
    quantity: number;
    priceContracted: number;
    status: SubscriptionAddonStatus;
    cancelAtPeriodEnd: boolean;
    effectiveUntil: Date | null;
  };
  available: boolean;
  ineligibilityReason?: string;
}

export interface PurchaseAddonParams {
  businessId: string;
  addonCodeOrId: string;
  planId?: string;
  requestedQuantity?: number;
  metodoPago?: string;
  referencia?: string;
  comprobanteUrl?: string;
  performedBy?: string;
}

/**
 * Calcula el prorrateo exacto para la contratación de un add-on a mitad de ciclo.
 */
export function calculateAddonProration(
  sub: { fechaInicio?: Date | string | null; fechaFin?: Date | string | null },
  addonPriceMonthly: number,
  quantity = 1
) {
  const now = new Date();
  const totalPriceMonthly = Number((addonPriceMonthly * quantity).toFixed(2));

  if (!sub.fechaInicio || !sub.fechaFin) {
    return {
      proratedAmount: totalPriceMonthly,
      daysRemaining: 30,
      totalDaysInCycle: 30,
      isProrated: false,
      dailyRate: Number((totalPriceMonthly / 30).toFixed(2))
    };
  }

  const startDate = new Date(sub.fechaInicio);
  const endDate = new Date(sub.fechaFin);

  if (endDate <= now) {
    return {
      proratedAmount: totalPriceMonthly,
      daysRemaining: 0,
      totalDaysInCycle: 30,
      isProrated: false,
      dailyRate: Number((totalPriceMonthly / 30).toFixed(2))
    };
  }

  const totalMs = Math.max(1000 * 60 * 60 * 24, endDate.getTime() - startDate.getTime());
  const remainingMs = Math.max(0, endDate.getTime() - now.getTime());

  const totalDays = Math.max(1, Math.round(totalMs / (1000 * 60 * 60 * 24)));
  const remainingDays = Math.max(1, Math.min(totalDays, Math.ceil(remainingMs / (1000 * 60 * 60 * 24))));

  const prorated = (totalPriceMonthly * remainingDays) / totalDays;
  const roundedProrated = Math.max(1.00, Number(prorated.toFixed(2)));

  return {
    proratedAmount: roundedProrated,
    daysRemaining: remainingDays,
    totalDaysInCycle: totalDays,
    isProrated: remainingDays < totalDays,
    dailyRate: Number((totalPriceMonthly / totalDays).toFixed(2))
  };
}

export const addonService = {
  /**
   * Obtiene todos los add-ons del catálogo (para Superadmin o vista global).
   */
  async getAllAddons(includeInactive = false) {
    return prisma.addon.findMany({
      where: includeInactive ? {} : { active: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }]
    });
  },

  /**
   * Obtiene el catálogo de add-ons evaluando disponibilidad para un negocio específico.
   */
  async getAddonsForBusiness(businessId: string): Promise<AddonAvailabilityDTO[]> {
    const business = await prisma.negocio.findUnique({
      where: { id: businessId },
      include: {
        BusinessType: {
          include: { planFamily: true }
        },
        Suscripcion: {
          include: {
            Plan: {
              include: {
                planEntitlements: {
                  where: { enabled: true },
                  include: { module: true }
                }
              }
            },
            subscriptionAddons: {
              include: { addon: true }
            }
          }
        }
      }
    });

    if (!business) {
      throw new Error('Negocio no encontrado');
    }

    const sub = business.Suscripcion;
    const plan = sub?.Plan;
    const familyCode = business.BusinessType?.planFamily?.code;
    const activeModuleCodes = new Set(plan?.planEntitlements?.map(pe => pe.module?.code).filter(Boolean) || []);
    if (plan?.features) {
      const legacyCaps = LegacyCompatibilityResolver.resolveLegacyCapabilities(plan.features);
      for (const [key, val] of Object.entries(legacyCaps)) {
        if (val) {
          activeModuleCodes.add(key.toUpperCase());
        }
      }
    }

    const [allAddons, dependencies] = await Promise.all([
      prisma.addon.findMany({
        where: { active: true },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }]
      }),
      prisma.moduleDependency.findMany()
    ]);

    // Mapear contratos existentes del negocio
    const contractMap = new Map<string, SubscriptionAddon>();
    if (sub?.subscriptionAddons) {
      for (const sa of sub.subscriptionAddons) {
        contractMap.set(sa.addonId, sa);
      }
    }

    const result: AddonAvailabilityDTO[] = [];

    for (const addon of allAddons) {
      const contract = contractMap.get(addon.id);
      const isPurchased = Boolean(
        contract && (contract.status === 'ACTIVE' || (contract.cancelAtPeriodEnd && contract.effectiveUntil && new Date(contract.effectiveUntil) > new Date()))
      );
      const isPendingPayment = Boolean(contract && contract.status === 'PENDING');

      let available = true;
      let ineligibilityReason: string | undefined = undefined;

      // 1. Validar compatibilidad de familia si está restringida
      if (addon.applicableFamilies) {
        try {
          const families = JSON.parse(addon.applicableFamilies);
          if (Array.isArray(families) && familyCode && !families.includes(familyCode)) {
            available = false;
            ineligibilityReason = `No compatible con la familia de negocio actual (${familyCode})`;
          }
        } catch (_) {}
      }

      // 2. Si es CAPABILITY y el plan base ya lo incluye por entitlement
      if (available && addon.type === 'CAPABILITY') {
        if (activeModuleCodes.has(addon.targetKey)) {
          available = false;
          ineligibilityReason = 'Ya incluido de base en tu plan actual';
        }
      }

      // 3. Validar dependencias requeridas
      if (available && addon.type === 'CAPABILITY') {
        const requiredDeps = dependencies.filter(d => d.moduleCode === addon.targetKey);
        for (const dep of requiredDeps) {
          if (!activeModuleCodes.has(dep.dependsOnCode)) {
            available = false;
            ineligibilityReason = `Requiere que el módulo '${dep.dependsOnCode}' esté habilitado en tu plan`;
            break;
          }
        }
      }

      // 4. Si ya está comprado y no es stackable
      if (available && isPurchased && !addon.stackable) {
        available = false;
        ineligibilityReason = 'Ya se encuentra activo en tu suscripción';
      }

      // 5. Si ya tiene una solicitud pendiente de pago
      if (available && isPendingPayment) {
        available = false;
        ineligibilityReason = 'Solicitud en revisión (Pendiente de Aprobación de Pago)';
      }

      result.push({
        addon,
        isPurchased,
        isPendingPayment,
        activeContract: contract ? {
          id: contract.id,
          quantity: contract.quantity,
          priceContracted: contract.priceContracted,
          status: contract.status,
          cancelAtPeriodEnd: contract.cancelAtPeriodEnd,
          effectiveUntil: contract.effectiveUntil
        } : undefined,
        available,
        ineligibilityReason
      });
    }

    return result;
  },

  /**
   * Registra la solicitud de compra de un Add-on para un negocio, generando el cobro con prorrateo
   * y dejando el contrato en estado PENDING hasta que el pago sea confirmado.
   */
  async purchaseAddon(
    businessIdOrParams: string | PurchaseAddonParams,
    addonCodeOrIdArg?: string,
    requestedQuantityArg = 1,
    performedByArg = 'ADMIN'
  ) {
    const params: PurchaseAddonParams = typeof businessIdOrParams === 'object'
      ? businessIdOrParams
      : {
          businessId: businessIdOrParams,
          addonCodeOrId: addonCodeOrIdArg!,
          requestedQuantity: requestedQuantityArg,
          performedBy: performedByArg
        };

    const {
      businessId,
      addonCodeOrId,
      requestedQuantity = 1,
      metodoPago = 'TRANSFERENCIA',
      referencia,
      comprobanteUrl,
      performedBy = 'ADMIN'
    } = params;

    if (requestedQuantity < 1) {
      throw new Error('La cantidad debe ser al menos 1');
    }

    let business = await prisma.negocio.findUnique({
      where: { id: businessId },
      include: {
        Suscripcion: {
          include: { subscriptionAddons: true, Plan: true }
        }
      }
    });

    if (!business) {
      throw new Error('Negocio no encontrado');
    }

    // Auto-healing canónico: Si el negocio aún no tiene registro en Suscripcion,
    // se le provisiona automáticamente su suscripción base para no bloquear la compra de Add-ons
    if (!business.Suscripcion) {
      console.log(`[addonService] Negocio ${businessId} no tenía suscripción previa. Auto-provisionando suscripción base...`);
      const { planService } = await import('@/lib/services/planService');
      await planService.assignDefaultPlan(businessId);
      
      business = await prisma.negocio.findUnique({
        where: { id: businessId },
        include: {
          Suscripcion: {
            include: { subscriptionAddons: true, Plan: true }
          }
        }
      });
    }

    if (!business || !business.Suscripcion) {
      throw new Error('No se pudo inicializar la suscripción para este negocio');
    }

    const sub = business.Suscripcion;

    const addon = await prisma.addon.findFirst({
      where: {
        OR: [
          { id: addonCodeOrId },
          { code: addonCodeOrId }
        ],
        active: true
      }
    });

    if (!addon) {
      throw new Error('Add-on no encontrado o inactivo comercialmente');
    }

    // Determinar si el negocio tiene un plan comercial activo de pago
    const now = new Date();
    const isExpired = !sub.fechaFin || new Date(sub.fechaFin) < now || ['expired', 'vencida', 'suspendida', 'cancelada'].includes((sub.estado || '').toLowerCase());
    const isFreePlan = !sub.Plan || Boolean(sub.Plan.isFree) || sub.Plan.price === 0;
    const hasActivePaidPlan = !isExpired && !isFreePlan;

    let basePlan: any = null;
    if (!hasActivePaidPlan) {
      if (!params.planId) {
        throw new Error('Para contratar este Add-on debes seleccionar un plan base de suscripción comercial.');
      }
      basePlan = await prisma.plan.findUnique({
        where: { id: params.planId }
      });
      if (!basePlan || !basePlan.activo || basePlan.isFree) {
        throw new Error('El plan base seleccionado no es válido o está inactivo.');
      }
    }

    // Comprobar cantidad máxima permitida
    const maxQty = addon.stackable ? (addon.maxQuantity || 99) : 1;
    if (requestedQuantity > maxQty) {
      throw new Error(`Cantidad excede el máximo permitido (${maxQty})`);
    }

    // Buscar contrato existente
    const existing = await prisma.subscriptionAddon.findUnique({
      where: {
        subscriptionId_addonId: {
          subscriptionId: sub.id,
          addonId: addon.id
        }
      }
    });

    if (existing) {
      if (!addon.stackable && existing.status === 'ACTIVE' && !existing.cancelAtPeriodEnd) {
        throw new Error('Este Add-on ya está activo en tu cuenta');
      }
      if (existing.status === 'PENDING' && !comprobanteUrl && !referencia) {
        throw new Error('Ya existe una solicitud pendiente de pago para este Add-on');
      }
    }

    const finalQuantity = addon.stackable ? requestedQuantity : 1;
    const priceContracted = addon.priceMonthly; // Fijado server-side desde el catálogo

    // Cálculo canónico de prorrateo si tiene plan activo; si es combo, cobra plan + add-on mensual
    const proration = calculateAddonProration(sub, priceContracted, finalQuantity);
    const addonTotalAmount = Number((priceContracted * finalQuantity).toFixed(2));
    const totalAmountToPay = hasActivePaidPlan 
      ? proration.proratedAmount 
      : Number((Number(basePlan.price) + addonTotalAmount).toFixed(2));

    let subscriptionAddon: SubscriptionAddon;

    if (existing) {
      const qtyBefore = existing.quantity;
      const statusBefore = existing.status;

      subscriptionAddon = await prisma.subscriptionAddon.update({
        where: { id: existing.id },
        data: {
          quantity: finalQuantity,
          priceContracted,
          currency: addon.currency,
          status: 'PENDING', // PENDIENTE DE CONFIRMACIÓN DE PAGO
          cancelAtPeriodEnd: false,
          effectiveUntil: null,
          cancelledAt: null,
          updatedAt: now
        }
      });

      // Auditoría
      await prisma.subscriptionAddonHistory.create({
        data: {
          businessId,
          subscriptionId: sub.id,
          addonId: addon.id,
          subscriptionAddonId: existing.id,
          action: 'PURCHASED',
          quantityBefore: qtyBefore,
          quantityAfter: finalQuantity,
          priceBefore: existing.priceContracted,
          priceAfter: priceContracted,
          statusBefore,
          statusAfter: 'PENDING',
          performedBy,
          reason: hasActivePaidPlan
            ? `Solicitud de reactivación pendiente de pago (Monto prorrateado: $${totalAmountToPay})`
            : `Solicitud combo (Plan ${basePlan.name} + Add-on ${addon.name}) por $${totalAmountToPay}`
        }
      });
    } else {
      subscriptionAddon = await prisma.subscriptionAddon.create({
        data: {
          subscriptionId: sub.id,
          addonId: addon.id,
          quantity: finalQuantity,
          priceContracted,
          currency: addon.currency,
          status: 'PENDING', // PENDIENTE DE CONFIRMACIÓN DE PAGO
          startedAt: now
        }
      });

      // Auditoría
      await prisma.subscriptionAddonHistory.create({
        data: {
          businessId,
          subscriptionId: sub.id,
          addonId: addon.id,
          subscriptionAddonId: subscriptionAddon.id,
          action: 'PURCHASED',
          quantityBefore: 0,
          quantityAfter: subscriptionAddon.quantity,
          priceBefore: 0,
          priceAfter: priceContracted,
          statusBefore: null,
          statusAfter: 'PENDING',
          performedBy,
          reason: hasActivePaidPlan
            ? `Contratación inicial de add-on pendiente de pago (Monto prorrateado: $${totalAmountToPay})`
            : `Contratación inicial combo (Plan ${basePlan.name} + Add-on ${addon.name}) por $${totalAmountToPay}`
        }
      });
    }

    // Si es combo, marcar la suscripción con el plan solicitado
    if (!hasActivePaidPlan && basePlan) {
      await prisma.suscripcion.update({
        where: { id: sub.id },
        data: {
          solicitudPlanId: basePlan.id,
          pagoPendiente: true,
          metodoPago: metodoPago
        }
      });
    }

    // Crear registro de cobro pendiente en Payment
    const paymentPlanId = hasActivePaidPlan 
      ? `ADDON:${addon.id}` 
      : `COMBO:${basePlan.id}:${addon.id}`;

    const payment = await prisma.payment.create({
      data: {
        id: (await import('crypto')).randomUUID(),
        negocio_id: business.id,
        plan_id: paymentPlanId,
        monto: totalAmountToPay,
        metodo_pago: metodoPago,
        referencia: referencia || (hasActivePaidPlan ? `ADDON_${addon.code}_${Date.now()}` : `COMBO_${basePlan.name}_${addon.code}_${Date.now()}`),
        comprobante: comprobanteUrl || null,
        estado_pago: 'pending'
      }
    });

    // Notificar por WhatsApp al Super Admin
    try {
      const { notifyAdminAddonEvent } = await import('@/lib/adminNotificationHelper');
      await notifyAdminAddonEvent({
        eventType: 'SOLICITADO',
        businessName: business.nombre,
        addonName: hasActivePaidPlan ? addon.name : `${addon.name} + Plan ${basePlan.name} (COMBO)`,
        addonCode: addon.code,
        quantity: finalQuantity,
        amount: totalAmountToPay,
        paymentMethod: metodoPago,
        reference: referencia
      });
    } catch (err) {
      console.error('Error enviando WhatsApp de add-on al admin:', err);
    }

    return {
      subscriptionAddon,
      payment,
      proration: {
        ...proration,
        totalAmount: totalAmountToPay,
        isCombo: !hasActivePaidPlan,
        basePlan: basePlan ? { id: basePlan.id, name: basePlan.name, price: basePlan.price } : null
      }
    };
  },

  /**
   * Confirma o rechaza el pago de un Add-on desde Superadmin.
   * Si es aprobado: pasa a ACTIVE e inicia vigencia otorgando capabilities y limits.
   * Si es rechazado: pasa a CANCELLED y notifica al negocio.
   */
  async activateAddonPayment(paymentId: string, approved: boolean, performedBy = 'SUPERADMIN') {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { Negocio: true }
    });

    if (!payment) {
      throw new Error('Registro de pago no encontrado');
    }

    const isCombo = payment.plan_id.startsWith('COMBO:');
    let comboPlanId: string | null = null;
    let addonId: string;

    if (isCombo) {
      const parts = payment.plan_id.split(':');
      comboPlanId = parts[1];
      addonId = parts[2];
    } else if (payment.plan_id.startsWith('ADDON:')) {
      addonId = payment.plan_id.replace('ADDON:', '');
    } else {
      addonId = payment.plan_id;
    }

    const addon = await prisma.addon.findUnique({
      where: { id: addonId }
    });

    if (!addon) {
      throw new Error('Add-on asociado al pago no encontrado');
    }

    let comboPlan: any = null;
    if (comboPlanId) {
      comboPlan = await prisma.plan.findUnique({
        where: { id: comboPlanId }
      });
    }

    const sub = await prisma.suscripcion.findUnique({
      where: { negocioId: payment.negocio_id }
    });

    if (!sub) {
      throw new Error('Suscripción del negocio no encontrada');
    }

    const contract = await prisma.subscriptionAddon.findUnique({
      where: {
        subscriptionId_addonId: {
          subscriptionId: sub.id,
          addonId: addon.id
        }
      }
    });

    if (!contract) {
      throw new Error('Contrato de Add-on no encontrado para esta suscripción');
    }

    const now = new Date();

    if (!approved) {
      // Rechazar pago
      await prisma.payment.update({
        where: { id: payment.id },
        data: { estado_pago: 'rejected' }
      });

      if (isCombo) {
        await prisma.suscripcion.update({
          where: { id: sub.id },
          data: {
            solicitudPlanId: null,
            pagoPendiente: false
          }
        });
      }

      const updatedContract = await prisma.subscriptionAddon.update({
        where: { id: contract.id },
        data: {
          status: 'CANCELLED',
          cancelledAt: now,
          updatedAt: now
        }
      });

      await prisma.subscriptionAddonHistory.create({
        data: {
          businessId: payment.negocio_id,
          subscriptionId: sub.id,
          addonId: addon.id,
          subscriptionAddonId: contract.id,
          action: 'CANCELLED',
          quantityBefore: contract.quantity,
          quantityAfter: contract.quantity,
          priceBefore: contract.priceContracted,
          priceAfter: contract.priceContracted,
          statusBefore: contract.status,
          statusAfter: 'CANCELLED',
          performedBy,
          reason: isCombo 
            ? 'Comprobante combo (Plan + Add-on) rechazado por Superadmin'
            : 'Comprobante de pago rechazado por Superadmin'
        }
      });

      // Notificar por WhatsApp de rechazo si tiene teléfono
      if (payment.Negocio?.whatsapp) {
        try {
          const { notificationService } = await import('@/lib/notifications');
          const conceptoRechazo = isCombo 
            ? `el Plan *${comboPlan?.name || 'Base'}* y el módulo *${addon.name}*`
            : `el módulo *${addon.name}*`;
          const waMsg = `❌ *Comprobante de Pago Rechazado* ⚠️\n\nHola, tu comprobante para ${conceptoRechazo} ha sido rechazado.\n\nPor favor, verifica los datos del pago y vuelve a subir tu comprobante desde tu panel administrativo:\n${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/admin/plan`;
          await notificationService.provider.sendMessage({
            to: payment.Negocio.whatsapp.replace(/\D/g, ''),
            message: waMsg,
            template: 'rechazo_addon'
          });
        } catch (err) {
          console.error('Error enviando WhatsApp de rechazo:', err);
        }
      }

      return updatedContract;
    }

    // APROBADO: Activar contrato y si es combo, activar plan base
    await prisma.payment.update({
      where: { id: payment.id },
      data: { estado_pago: 'approved' }
    });

    if (isCombo && comboPlanId) {
      const { getBusinessTimeZone, getSubscriptionDates } = await import('@/lib/dateUtils');
      const timeZone = getBusinessTimeZone(payment.Negocio?.configuracion);
      const { endDate } = getSubscriptionDates(timeZone, { durationMonths: 1, baseDate: now });

      await prisma.suscripcion.update({
        where: { id: sub.id },
        data: {
          planId: comboPlanId,
          estado: 'active',
          solicitudPlanId: null,
          pagoPendiente: false,
          fechaInicio: now,
          fechaFin: endDate
        }
      });

      const { default: crypto } = await import('crypto');
      await prisma.subscriptionHistory.create({
        data: {
          id: crypto.randomUUID(),
          negocio_id: payment.negocio_id,
          plan_anterior_id: sub.planId,
          plan_nuevo_id: comboPlanId,
          tipo_cambio: 'upgrade_combo',
          admin_id: performedBy
        }
      });
    }

    const updatedContract = await prisma.subscriptionAddon.update({
      where: { id: contract.id },
      data: {
        status: 'ACTIVE',
        startedAt: now,
        cancelAtPeriodEnd: false,
        effectiveUntil: null,
        cancelledAt: null,
        updatedAt: now
      }
    });

    await prisma.subscriptionAddonHistory.create({
      data: {
        businessId: payment.negocio_id,
        subscriptionId: sub.id,
        addonId: addon.id,
        subscriptionAddonId: contract.id,
        action: 'ACTIVATED',
        quantityBefore: contract.quantity,
        quantityAfter: contract.quantity,
        priceBefore: contract.priceContracted,
        priceAfter: contract.priceContracted,
        statusBefore: contract.status,
        statusAfter: 'ACTIVE',
        performedBy,
        reason: isCombo 
          ? 'Pago combo (Plan + Add-on) aprobado por Superadmin'
          : 'Pago aprobado por Superadmin - Add-on activado canónicamente'
      }
    });

    // Notificar por WhatsApp de activación
    if (payment.Negocio?.whatsapp) {
      try {
        const { notificationService } = await import('@/lib/notifications');
        const waMsg = isCombo 
          ? `🎉 *¡Plan Comercial y Módulo Activados con Éxito!* ✅\n\nHola, tu pago para el *Plan ${comboPlan?.name || 'Base'}* y el módulo *${addon.name}* ha sido verificado y activado correctamente en *${payment.Negocio.nombre}*.\n\nYa puedes disfrutar de todas sus funciones sin límites desde tu panel:\n${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/admin/plan`
          : `🎉 *¡Módulo Add-on Activado con Éxito!* ✅\n\nHola, tu pago para el módulo *${addon.name}* ha sido verificado y activado correctamente en *${payment.Negocio.nombre}*.\n\nYa puedes disfrutar de todas sus funcionalidades desde tu panel de control:\n${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/admin/plan`;
        await notificationService.provider.sendMessage({
          to: payment.Negocio.whatsapp.replace(/\D/g, ''),
          message: waMsg,
          template: 'activacion_addon'
        });
      } catch (err) {
        console.error('Error enviando WhatsApp de aprobación:', err);
      }
    }

    // Notificar también al Super Admin por WhatsApp
    try {
      const { notifyAdminAddonEvent } = await import('@/lib/adminNotificationHelper');
      await notifyAdminAddonEvent({
        eventType: 'ACTIVADO',
        businessName: payment.Negocio?.nombre || 'Negocio',
        addonName: isCombo ? `${addon.name} + Plan ${comboPlan?.name} (COMBO)` : addon.name,
        addonCode: addon.code,
        quantity: contract.quantity,
        amount: Number(payment.monto),
        paymentMethod: payment.metodo_pago,
        reference: payment.referencia || undefined
      });
    } catch (adminWaErr) {
      console.error('Error notificando al admin por activación:', adminWaErr);
    }

    return updatedContract;
  },

  /**
   * Programa la cancelación de un Add-on al finalizar el período actual de suscripción.
   */
  async cancelAddonAtPeriodEnd(arg1: string, arg2: string, performedBy = 'ADMIN', reason = 'Cancelación voluntaria del cliente') {
    // Soportar tanto (subscriptionAddonId, businessId) como (businessId, subscriptionAddonId)
    let contract = await prisma.subscriptionAddon.findUnique({
      where: { id: arg1 },
      include: {
        subscription: true,
        addon: true
      }
    });
    let businessId = arg2;

    if (!contract) {
      contract = await prisma.subscriptionAddon.findUnique({
        where: { id: arg2 },
        include: {
          subscription: true,
          addon: true
        }
      });
      businessId = arg1;
    }

    if (!contract || contract.subscription.negocioId !== businessId) {
      throw new Error('Contrato de Add-on no encontrado para este negocio');
    }

    if (contract.status !== 'ACTIVE' || contract.cancelAtPeriodEnd) {
      return contract;
    }

    const effectiveUntil = contract.subscription.fechaFin || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const updated = await prisma.subscriptionAddon.update({
      where: { id: contract.id },
      data: {
        cancelAtPeriodEnd: true,
        effectiveUntil,
        cancelledAt: new Date(),
        updatedAt: new Date()
      }
    });

    // Auditoría
    await prisma.subscriptionAddonHistory.create({
      data: {
        businessId,
        subscriptionId: contract.subscriptionId,
        addonId: contract.addonId,
        subscriptionAddonId: contract.id,
        action: 'CANCELLED',
        quantityBefore: contract.quantity,
        quantityAfter: contract.quantity,
        priceBefore: contract.priceContracted,
        priceAfter: contract.priceContracted,
        statusBefore: 'ACTIVE',
        statusAfter: 'ACTIVE (CANCEL_AT_PERIOD_END)',
        performedBy,
        reason: `${reason} - Vigente hasta: ${effectiveUntil.toISOString().split('T')[0]}`
      }
    });

    return updated;
  }
};
