/**
 * @file OrderStatusPresenter.ts
 * @module core/adapters
 * @description Presentador desacoplado de estados de pedidos para componentes React de UI.
 * @responsibility Traducir estados comerciales Enterprise (WAITING_ACCEPTANCE, ACCEPTED, CONFIRMED, PREPARING, READY, COMPLETED, CANCELLED)
 *   y estados legacy (WAITING_CONFIRMATION, EN_PREPARACION, RUTA, ENTREGADO) a un formato UI uniforme.
 * @dependencies Ninguna (Pura)
 * @status Stable (FASE 5C - UI Integration)
 */

export interface OrderStatusDisplay {
  rawStatus: string;
  label: string;
  badgeColor: 'amber' | 'blue' | 'indigo' | 'emerald' | 'rose' | 'gray' | 'purple';
  textColor: string;
  bgColor: string;
  modeLabel: 'Enterprise Runtime' | 'Legacy';
  isEnterprise: boolean;
  stepProgress: number; // 0 a 100% para barras de progreso en UI
}

export class OrderStatusPresenter {
  /**
   * Presenta un estado de pedido para UI basándose en el estado crudo y si proviene de Enterprise Runtime.
   */
  public static present(rawStatus: string, isEnterprise: boolean = false): OrderStatusDisplay {
    const s = (rawStatus || '').toUpperCase();

    // ──────────────────────────────────────────────────────────
    // Modo Enterprise Runtime
    // ──────────────────────────────────────────────────────────
    if (isEnterprise) {
      switch (s) {
        case 'WAITING_ACCEPTANCE':
          return {
            rawStatus: s,
            label: 'Esperando Aceptación',
            badgeColor: 'amber',
            textColor: 'text-amber-800 dark:text-amber-300',
            bgColor: 'bg-amber-100 dark:bg-amber-900/40',
            modeLabel: 'Enterprise Runtime',
            isEnterprise: true,
            stepProgress: 15,
          };
        case 'ACCEPTED':
          return {
            rawStatus: s,
            label: 'Aceptado por Caja',
            badgeColor: 'blue',
            textColor: 'text-blue-800 dark:text-blue-300',
            bgColor: 'bg-blue-100 dark:bg-blue-900/40',
            modeLabel: 'Enterprise Runtime',
            isEnterprise: true,
            stepProgress: 30,
          };
        case 'CONFIRMED':
        case 'PREPARING':
          return {
            rawStatus: s,
            label: 'En Preparación (KDS)',
            badgeColor: 'indigo',
            textColor: 'text-indigo-800 dark:text-indigo-300',
            bgColor: 'bg-indigo-100 dark:bg-indigo-900/40',
            modeLabel: 'Enterprise Runtime',
            isEnterprise: true,
            stepProgress: 55,
          };
        case 'READY':
          return {
            rawStatus: s,
            label: '¡Listo para Despacho!',
            badgeColor: 'purple',
            textColor: 'text-purple-800 dark:text-purple-300',
            bgColor: 'bg-purple-100 dark:bg-purple-900/40',
            modeLabel: 'Enterprise Runtime',
            isEnterprise: true,
            stepProgress: 80,
          };
        case 'COMPLETED':
          return {
            rawStatus: s,
            label: 'Completado / Entregado',
            badgeColor: 'emerald',
            textColor: 'text-emerald-800 dark:text-emerald-300',
            bgColor: 'bg-emerald-100 dark:bg-emerald-900/40',
            modeLabel: 'Enterprise Runtime',
            isEnterprise: true,
            stepProgress: 100,
          };
        case 'REJECTED':
        case 'CANCELLED':
          return {
            rawStatus: s,
            label: 'Cancelado / Rechazado',
            badgeColor: 'rose',
            textColor: 'text-rose-800 dark:text-rose-300',
            bgColor: 'bg-rose-100 dark:bg-rose-900/40',
            modeLabel: 'Enterprise Runtime',
            isEnterprise: true,
            stepProgress: 0,
          };
      }
    }

    // ──────────────────────────────────────────────────────────
    // Modo Legacy / Fallback
    // ──────────────────────────────────────────────────────────
    switch (s) {
      case 'WAITING_CONFIRMATION':
      case 'PENDIENTE':
        return {
          rawStatus: s,
          label: 'Por Confirmar',
          badgeColor: 'amber',
          textColor: 'text-amber-700 dark:text-amber-300',
          bgColor: 'bg-amber-50 dark:bg-amber-950/30',
          modeLabel: 'Legacy',
          isEnterprise: false,
          stepProgress: 20,
        };
      case 'RECIBIDO':
      case 'CONFIRMED':
        return {
          rawStatus: s,
          label: 'Recibido / Confirmado',
          badgeColor: 'blue',
          textColor: 'text-blue-700 dark:text-blue-300',
          bgColor: 'bg-blue-50 dark:bg-blue-950/30',
          modeLabel: 'Legacy',
          isEnterprise: false,
          stepProgress: 40,
        };
      case 'PREPARACION':
      case 'EN_PREPARACION':
        return {
          rawStatus: s,
          label: 'En Cocina',
          badgeColor: 'indigo',
          textColor: 'text-indigo-700 dark:text-indigo-300',
          bgColor: 'bg-indigo-50 dark:bg-indigo-950/30',
          modeLabel: 'Legacy',
          isEnterprise: false,
          stepProgress: 60,
        };
      case 'LISTO':
        return {
          rawStatus: s,
          label: 'Listo',
          badgeColor: 'purple',
          textColor: 'text-purple-700 dark:text-purple-300',
          bgColor: 'bg-purple-50 dark:bg-purple-950/30',
          modeLabel: 'Legacy',
          isEnterprise: false,
          stepProgress: 80,
        };
      case 'RUTA':
      case 'EN_CAMINO':
        return {
          rawStatus: s,
          label: 'En Ruta de Entrega',
          badgeColor: 'indigo',
          textColor: 'text-indigo-700 dark:text-indigo-300',
          bgColor: 'bg-indigo-50 dark:bg-indigo-950/30',
          modeLabel: 'Legacy',
          isEnterprise: false,
          stepProgress: 90,
        };
      case 'ENTREGADO':
      case 'COMPLETED':
        return {
          rawStatus: s,
          label: 'Entregado',
          badgeColor: 'emerald',
          textColor: 'text-emerald-700 dark:text-emerald-300',
          bgColor: 'bg-emerald-50 dark:bg-emerald-950/30',
          modeLabel: 'Legacy',
          isEnterprise: false,
          stepProgress: 100,
        };
      case 'CANCELADO':
      case 'RECHAZADO':
      default:
        return {
          rawStatus: s,
          label: s === 'CANCELADO' || s === 'RECHAZADO' ? 'Cancelado' : s,
          badgeColor: 'rose',
          textColor: 'text-rose-700 dark:text-rose-300',
          bgColor: 'bg-rose-50 dark:bg-rose-950/30',
          modeLabel: 'Legacy',
          isEnterprise: false,
          stepProgress: 0,
        };
    }
  }
}
