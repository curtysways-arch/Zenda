/**
 * @file AccessPolicyService.ts
 * @module core/security
 * @description Servicio central y universal de gobernanza de acceso a información (Data Access Policy Engine).
 *
 * Responsabilidades:
 * 1. Resolver el Effective Plan en runtime sin mutar la base de datos física (Suscripcion.planId, isFounder, lockedPrice).
 * 2. Evaluar políticas explícitas declaradas en PlanDataPolicy (cero reglas mágicas).
 * 3. Aplicar la compuerta de seguridad (VIEW=false deniega granularidades sensibles).
 * 4. Desacoplar la recepción pública (RECEIVE=true) de la visualización privada (VIEW=false).
 * 5. Sanitizar y proteger datos mediante DataProtector antes de que crucen la frontera hacia el cliente.
 */

import prisma from '@/lib/prisma';
import { 
  DATA_RESOURCES, 
  DATA_ACTIONS, 
  DataResource, 
  DataAction, 
  ResourcePolicy, 
  EffectivePlanContext 
} from './dataPolicyTypes';
import { DataProtector } from './dataProtector';

export class AccessPolicyService {
  /**
   * Resuelve el plan efectivo de un negocio en runtime sin mutar la base de datos física.
   * Si la suscripción está vencida, degrada dinámicamente al Plan Free de su familia.
   * Si está activa, resuelve su plan contratado original.
   */
  public static async getEffectivePlan(businessId: string): Promise<{ plan: any; context: EffectivePlanContext }> {
    if (!businessId) {
      throw new Error('[AccessPolicyService] businessId es requerido.');
    }

    const negocio = await (prisma as any).negocio.findUnique({
      where: { id: businessId },
      include: {
        Suscripcion: {
          include: {
            Plan: {
              include: {
                dataPolicies: true,
                planEntitlements: { include: { module: true } },
                planLimits: true,
                family: true
              }
            }
          }
        },
        BusinessType: {
          include: {
            planFamily: {
              include: {
                plans: {
                  where: { activo: true },
                  include: {
                    dataPolicies: true,
                    planEntitlements: { include: { module: true } },
                    planLimits: true,
                    family: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!negocio) {
      return this.createFallbackResult(businessId);
    }

    const sub = negocio.Suscripcion;
    const planContratado = sub?.Plan;
    const family = negocio.BusinessType?.planFamily || planContratado?.family;
    const familyPlans = family?.plans || [];

    const isFounder = Boolean(sub?.isFounder);
    const founderPosition = sub?.founderPosition ?? null;
    const lockedPrice = sub?.lockedPrice ?? null;
    const planFamilyId = family?.id || null;
    const planFamilyCode = family?.code || null;

    // Verificar vigencia temporal de la suscripción
    const now = new Date();
    const fechaFin = sub?.fechaFin ? new Date(sub.fechaFin) : null;
    const isVencidaFecha = Boolean(fechaFin && now > fechaFin);
    const estadoLower = (sub?.estado || '').toLowerCase();
    const isExpiredState = estadoLower === 'expired' || estadoLower === 'vencida' || estadoLower === 'suspendida' || estadoLower === 'cancelada';
    const isPastDue = estadoLower === 'past_due' || estadoLower === 'grace';

    const isExpired = isExpiredState || isVencidaFecha;

    // ── ESCENARIO A: Suscripción ACTIVA y VIGENTE ──
    if (sub && planContratado && !isExpired) {
      const isFree = Boolean(planContratado.isFree);
      return {
        plan: planContratado,
        context: {
          businessId,
          isFreeTier: isFree,
          isExpired: false,
          isPastDue,
          lockReason: isFree ? 'PLAN_FREE' : undefined,
          originalPlanId: planContratado.id,
          originalPlanName: planContratado.name,
          effectivePlanId: planContratado.id,
          effectivePlanName: planContratado.name,
          planFamilyId,
          planFamilyCode,
          isFounder,
          founderPosition,
          lockedPrice,
        }
      };
    }

    // ── ESCENARIO B: Suscripción EXPIRADA / VENCIDA o SIN PLAN PAGADO ACTIVO ──
    // Se resuelve dinámicamente el Plan Free de su respectiva familia
    const freePlanDeFamilia = familyPlans.find((p: any) => Boolean(p.isFree)) || null;

    let effectivePlan = freePlanDeFamilia;

    // Fallback si la familia no tiene plan marcado con isFree todavía
    if (!effectivePlan) {
      effectivePlan = await (prisma as any).plan.findFirst({
        where: {
          isFree: true,
          activo: true,
          familyId: planFamilyId || undefined,
        },
        include: { dataPolicies: true, family: true }
      });
    }

    if (!effectivePlan) {
      effectivePlan = await (prisma as any).plan.findFirst({
        where: { isFree: true, activo: true },
        include: { dataPolicies: true, family: true }
      });
    }

    if (!effectivePlan) {
      // Si aún no existe ningún plan Free en base de datos, usar el plan contratado pero marcado como expired
      effectivePlan = planContratado || {
        id: 'PLAN_FALLBACK_FREE',
        name: 'Plan Citiox Free',
        isFree: true,
        dataPolicies: []
      };
    }

    const originalId = planContratado?.id || effectivePlan.id;
    const originalName = planContratado?.name || effectivePlan.name;

    return {
      plan: effectivePlan,
      context: {
        businessId,
        isFreeTier: true,
        isExpired: true,
        isPastDue,
        lockReason: isExpired ? 'PLAN_EXPIRED' : 'PLAN_FREE',
        originalPlanId: originalId,
        originalPlanName: originalName,
        effectivePlanId: effectivePlan.id,
        effectivePlanName: effectivePlan.name,
        planFamilyId,
        planFamilyCode,
        isFounder,
        founderPosition,
        lockedPrice,
      }
    };
  }

  /**
   * Resuelve la política de acceso de un recurso específico para un negocio.
   * Aplica la compuerta de seguridad estricta: si VIEW=false, todas las sub-acciones
   * de detalle se forzan a false, mientras que RECEIVE permanece independiente.
   */
  public static async getResourcePolicy(businessId: string, resource: DataResource): Promise<ResourcePolicy> {
    const { plan, context } = await this.getEffectivePlan(businessId);
    const policies: any[] = plan?.dataPolicies || [];

    // Filtrar políticas explícitas para este recurso
    const resourcePolicies = policies.filter((p: any) => p.resource === resource);
    const policyMap: Record<string, boolean> = {};

    for (const p of resourcePolicies) {
      policyMap[p.action] = p.effect === 'ALLOW';
    }

    // Evaluación de acciones
    let receive = policyMap[DATA_ACTIONS.RECEIVE] ?? true; // Por defecto permitido para no bloquear clientes
    let view = policyMap[DATA_ACTIONS.VIEW] ?? (context.isFreeTier ? false : true);
    let details = policyMap[DATA_ACTIONS.VIEW_DETAILS] ?? (context.isFreeTier ? false : true);
    let customer = policyMap[DATA_ACTIONS.VIEW_CUSTOMER] ?? (context.isFreeTier ? false : true);
    let contact = policyMap[DATA_ACTIONS.VIEW_CONTACT] ?? (context.isFreeTier ? false : true);
    let items = policyMap[DATA_ACTIONS.VIEW_ITEMS] ?? (context.isFreeTier ? false : true);
    let prices = policyMap[DATA_ACTIONS.VIEW_PRICES] ?? (context.isFreeTier ? false : true);
    let financials = policyMap[DATA_ACTIONS.VIEW_FINANCIALS] ?? (context.isFreeTier ? false : true);
    let manage = policyMap[DATA_ACTIONS.MANAGE] ?? (context.isFreeTier ? false : true);
    let exp = policyMap[DATA_ACTIONS.EXPORT] ?? (context.isFreeTier ? false : true);

    // ── COMPUERTA DE SEGURIDAD ESTRICTA (VIEW=false forzar detalles a false) ──
    if (!view) {
      details = false;
      customer = false;
      contact = false;
      items = false;
      prices = false;
      financials = false;
      manage = false;
      exp = false;
    }

    // VIEW_CONTACT exige también VIEW_CUSTOMER
    if (!customer) {
      contact = false;
    }

    const isLocked = context.isFreeTier || !view || !customer || !financials || !items;

    return {
      receive,
      view,
      details,
      customer,
      contact,
      items,
      prices,
      financials,
      manage,
      export: exp,
      isLocked,
      lockReason: isLocked ? (context.lockReason || 'POLICY_RESTRICTED') : undefined
    };
  }

  /**
   * Helper rápido para validar si un negocio puede recibir órdenes/reservas
   */
  public static async canReceive(businessId: string, resource: DataResource): Promise<boolean> {
    const policy = await this.getResourcePolicy(businessId, resource);
    return policy.receive;
  }

  // ── MÉTODOS DE PROTECCIÓN Y SANITIZACIÓN EN PUNTO DE SALIDA ──

  public static async protectOrder(businessId: string, order: any): Promise<any> {
    const policy = await this.getResourcePolicy(businessId, DATA_RESOURCES.ORDERS);
    return DataProtector.protectOrder(order, policy);
  }

  public static async protectOrders(businessId: string, orders: any[]): Promise<any[]> {
    if (!Array.isArray(orders) || orders.length === 0) return [];
    const policy = await this.getResourcePolicy(businessId, DATA_RESOURCES.ORDERS);
    return orders.map(o => DataProtector.protectOrder(o, policy));
  }

  public static async protectAppointment(businessId: string, appointment: any): Promise<any> {
    const policy = await this.getResourcePolicy(businessId, DATA_RESOURCES.APPOINTMENTS);
    return DataProtector.protectAppointment(appointment, policy);
  }

  public static async protectAppointments(businessId: string, appointments: any[]): Promise<any[]> {
    if (!Array.isArray(appointments) || appointments.length === 0) return [];
    const policy = await this.getResourcePolicy(businessId, DATA_RESOURCES.APPOINTMENTS);
    return appointments.map(a => DataProtector.protectAppointment(a, policy));
  }

  public static async protectReservation(businessId: string, reservation: any): Promise<any> {
    const policy = await this.getResourcePolicy(businessId, DATA_RESOURCES.RESERVATIONS);
    return DataProtector.protectReservation(reservation, policy);
  }

  public static async protectReservations(businessId: string, reservations: any[]): Promise<any[]> {
    if (!Array.isArray(reservations) || reservations.length === 0) return [];
    const policy = await this.getResourcePolicy(businessId, DATA_RESOURCES.RESERVATIONS);
    return reservations.map(r => DataProtector.protectReservation(r, policy));
  }

  public static async protectServiceOrder(businessId: string, serviceOrder: any): Promise<any> {
    const policy = await this.getResourcePolicy(businessId, DATA_RESOURCES.SERVICE_ORDERS);
    return DataProtector.protectServiceOrder(serviceOrder, policy);
  }

  public static async protectServiceOrders(businessId: string, serviceOrders: any[]): Promise<any[]> {
    if (!Array.isArray(serviceOrders) || serviceOrders.length === 0) return [];
    const policy = await this.getResourcePolicy(businessId, DATA_RESOURCES.SERVICE_ORDERS);
    return serviceOrders.map(so => DataProtector.protectServiceOrder(so, policy));
  }

  public static async protectStoreOrder(businessId: string, storeOrder: any): Promise<any> {
    const policy = await this.getResourcePolicy(businessId, DATA_RESOURCES.STORE_ORDERS);
    return DataProtector.protectStoreOrder(storeOrder, policy);
  }

  public static async protectStoreOrders(businessId: string, storeOrders: any[]): Promise<any[]> {
    if (!Array.isArray(storeOrders) || storeOrders.length === 0) return [];
    const policy = await this.getResourcePolicy(businessId, DATA_RESOURCES.STORE_ORDERS);
    return storeOrders.map(sto => DataProtector.protectStoreOrder(sto, policy));
  }

  public static async protectCustomer(businessId: string, customer: any): Promise<any> {
    const policy = await this.getResourcePolicy(businessId, DATA_RESOURCES.CUSTOMERS);
    return DataProtector.protectCustomer(customer, policy);
  }

  public static async protectCustomers(businessId: string, customers: any[]): Promise<any[]> {
    if (!Array.isArray(customers) || customers.length === 0) return [];
    const policy = await this.getResourcePolicy(businessId, DATA_RESOURCES.CUSTOMERS);
    return customers.map(c => DataProtector.protectCustomer(c, policy));
  }

  private static createFallbackResult(businessId: string) {
    return {
      plan: {
        id: 'PLAN_FALLBACK_FREE',
        name: 'Plan Citiox Free',
        isFree: true,
        dataPolicies: []
      },
      context: {
        businessId,
        isFreeTier: true,
        isExpired: false,
        isPastDue: false,
        lockReason: 'PLAN_FREE' as const,
        originalPlanId: 'PLAN_FALLBACK_FREE',
        originalPlanName: 'Plan Citiox Free',
        effectivePlanId: 'PLAN_FALLBACK_FREE',
        effectivePlanName: 'Plan Citiox Free',
        planFamilyId: null,
        planFamilyCode: null,
        isFounder: false,
        founderPosition: null,
        lockedPrice: null,
      }
    };
  }
}
