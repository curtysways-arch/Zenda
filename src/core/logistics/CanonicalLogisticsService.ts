/**
 * @file CanonicalLogisticsService.ts
 * @module core/logistics
 * @description Servicio canónico de finanzas logísticas de Citiox.
 * @responsibility Separar estrictamente y de forma desacoplada:
 *   1. Dinero que paga el cliente al negocio (Online o Contraentrega).
 *   2. Dinero que el Driver puede recaudar en nombre del negocio ($0 en anticipado/lavandería; total en contraentrega).
 *   3. Compensación/costo que el negocio paga al Driver por el servicio logístico ($2 delivery; $2 pickup + $2 delivery en lavandería).
 *   4. Estados independientes de pago, recaudación, compensación y operación logística.
 */

export type CustomerPaymentStatus = 'PENDING' | 'PAID' | 'PARTIAL';
export type DriverCollectionStatus = 'NOT_REQUIRED' | 'PENDING' | 'COLLECTED' | 'LIQUIDATED';
export type DriverCompensationStatus = 'PENDING' | 'PAID';
export type LogisticsMissionType = 'DELIVERY_ONLY' | 'PICKUP_ONLY' | 'ROUND_TRIP_SERVICE' | 'PICKUP_AND_DELIVERY';

export interface CanonicalDriverMission {
  driverId?: string | null;
  driverName?: string | null;
  driverPhone?: string | null;
  misionTipo: 'RECOGIDA' | 'ENTREGA' | 'SIMPLE';
  compensacion: number;               // Ej: 2.00
  estadoCompensacion: DriverCompensationStatus; // PENDING | PAID
  pagadoAt?: string | null;
  pagadoPor?: string | null;
  metodoPagoCompensacion?: string | null;
}

export interface CanonicalRecaudacion {
  requerida: boolean;                 // true SOLO si es contraentrega en efectivo
  montoEsperado: number;              // Ej: 17.00 si contraentrega, 0.00 si anticipado o lavandería
  montoRecaudado: number;             // Registrado al cobrar
  estado: DriverCollectionStatus;     // NOT_REQUIRED | PENDING | COLLECTED | LIQUIDATED
  metodo: 'EFECTIVO' | 'TRANSFERENCIA' | 'NINGUNO';
  recaudadoAt?: string | null;
  liquidadoAt?: string | null;
  liquidadoPor?: string | null;
  notasLiquidacion?: string | null;
}

export interface CanonicalLogisticsData {
  tipoMision: LogisticsMissionType;
  pickupFee: number;                  // Ej: 2.00 para recogida
  deliveryFee: number;                // Ej: 2.00 para entrega
  totalLogisticsFee: number;          // Ej: 4.00 total logística cliente
  recaudacion: CanonicalRecaudacion;
  pickupDriver?: CanonicalDriverMission | null;
  deliveryDriver?: CanonicalDriverMission | null;
  distanceKm?: number;
  billableDistanceKm?: number;
}

/**
 * Determina si un tipo de negocio o pedido corresponde a lavandería / cuidado de prendas
 */
export function isLaundryType(tipoNegocio?: string | null, extra?: any, slugOrName?: string | null): boolean {
  if (extra?.servicioNombre || extra?.modoIngreso || extra?.articulos || extra?.cantidadPares || extra?.isLaundry) {
    return true;
  }
  const s = String(slugOrName || '').toLowerCase();
  if (s.includes('lavad') || s.includes('laundry') || s.includes('sneaker') || s.includes('bubble') || s.includes('wash') || s.includes('clean') || s.includes('zapater')) {
    return true;
  }
  if (!tipoNegocio) return false;
  const t = tipoNegocio.toUpperCase().trim();
  return t === 'LAVANDERIA' || t === 'SHOE_CARE' || t === 'ORDENES-SERVICIO' || t === 'LAVADO' || t === 'SERVICIOS';
}

/**
 * Calcula el desglose canónico de tarifas para una distancia y tipo de servicio
 */
export function calculateCanonicalFees(
  isLaundry: boolean,
  totalShippingCost: number
): { pickupFee: number; deliveryFee: number; totalLogisticsFee: number } {
  const total = Math.max(0, Math.round(Number(totalShippingCost || 0) * 100) / 100);
  if (isLaundry) {
    const half = Math.round((total / 2) * 100) / 100;
    const pickupFee = half;
    const deliveryFee = Math.round((total - half) * 100) / 100;
    return { pickupFee, deliveryFee, totalLogisticsFee: total };
  }
  return { pickupFee: 0, deliveryFee: total, totalLogisticsFee: total };
}

/**
 * Obtiene la estructura canónica normalizada de finanzas logísticas de cualquier orden
 */
export function getCanonicalLogistics(order: any, currentDriverId?: string | null): CanonicalLogisticsData {
  const extra = (order?.extraInfo && typeof order.extraInfo === 'object') ? order.extraInfo : 
                (typeof order?.extraInfo === 'string' ? (() => { try { return JSON.parse(order.extraInfo); } catch { return {}; } })() : {});
  
  const existingLogistics = extra.canonicalLogistics || extra.logistica;
  const businessIdentifier = `${order?.negocio?.slug || ''} ${order?.negocio?.nombre || ''}`;
  const isLaundry = isLaundryType(order?.negocio?.tipoNegocio, extra, businessIdentifier);
  const totalCost = Number(order?.costoEnvio !== undefined ? order.costoEnvio : (extra?.costoEnvio || 0));

  // 1. Desglose de Tarifas
  let pickupFee = existingLogistics?.pickupFee;
  let deliveryFee = existingLogistics?.deliveryFee;
  let totalLogisticsFee = existingLogistics?.totalLogisticsFee;

  if (pickupFee === undefined || deliveryFee === undefined || totalLogisticsFee === undefined) {
    const fees = calculateCanonicalFees(isLaundry, totalCost);
    pickupFee = fees.pickupFee;
    deliveryFee = fees.deliveryFee;
    totalLogisticsFee = fees.totalLogisticsFee;
  }

  // 2. Estado de Recaudación del Driver
  const paymentMethod = (
    (order as any)?.metodoPago || 
    (order as any)?.payment?.metodo || 
    extra?.paymentMethodCode || 
    extra?.metodoPago || 
    ''
  ).toUpperCase();

  const paymentState = (
    order?.paymentStatus || 
    (order as any)?.payment?.estado || 
    extra?.paymentStatus || 
    ''
  ).toUpperCase();

  const isPaidOnline = ['CONFIRMADO', 'PAGO_VERIFICADO', 'VERIFICADO', 'PAID'].includes(paymentState) ||
    (['TRANSFERENCIA', 'TARJETA', 'STRIPE', 'PAYPHONE', 'DATAFAT', 'TRANSFER', 'ONLINE'].includes(paymentMethod) && paymentState !== 'PENDIENTE');

  const isCashOrder = !isLaundry && (
    paymentMethod.includes('EFECTIVO') || 
    paymentMethod.includes('CASH') || 
    paymentMethod.includes('CONTRA_ENTREGA') || 
    paymentMethod.includes('ENTREGA') || 
    (!isPaidOnline && paymentMethod !== 'TRANSFERENCIA')
  );

  let recaudacion: CanonicalRecaudacion;
  if (existingLogistics?.recaudacion) {
    recaudacion = { ...existingLogistics.recaudacion };
  } else if (isLaundry) {
    // Escenarios 3, 4, 5: Lavandería siempre $0 de recaudación por defecto en puerta
    recaudacion = {
      requerida: false,
      montoEsperado: 0.00,
      montoRecaudado: 0.00,
      estado: 'NOT_REQUIRED',
      metodo: 'NINGUNO'
    };
  } else if (isCashOrder) {
    // Escenario 2: Restaurante Contraentrega
    const orderTotal = Math.round(Number(order?.total || 0) * 100) / 100;
    const isDelivered = order?.estado === 'ENTREGADO' || order?.estado === 'COMPLETADO';
    recaudacion = {
      requerida: true,
      montoEsperado: orderTotal,
      montoRecaudado: isDelivered ? orderTotal : 0.00,
      estado: isDelivered ? 'COLLECTED' : 'PENDING',
      metodo: 'EFECTIVO'
    };
  } else {
    // Escenario 1: Restaurante Pago Anticipado
    recaudacion = {
      requerida: false,
      montoEsperado: 0.00,
      montoRecaudado: 0.00,
      estado: 'NOT_REQUIRED',
      metodo: 'NINGUNO'
    };
  }

  // 3. Choferes y Compensaciones
  let pickupDriver: CanonicalDriverMission | null = existingLogistics?.pickupDriver || null;
  let deliveryDriver: CanonicalDriverMission | null = existingLogistics?.deliveryDriver || null;

  if (isLaundry) {
    // Retiro
    const retiroInfo = extra?.retiroCompletadoPor || (
      ['REPARTIDOR_ASIGNADO', 'REPARTIDOR_EN_CAMINO', 'RECOGIDO'].includes(order?.estado) ? {
        driverId: extra?.assignedDriverId || extra?.repartidorId || order?.repartidorId,
        driverName: extra?.assignedDriverName || extra?.assignedDriver,
        driverPhone: extra?.assignedDriverPhone
      } : null
    );

    if (retiroInfo && !pickupDriver) {
      pickupDriver = {
        driverId: retiroInfo.driverId || null,
        driverName: retiroInfo.driverName || 'Repartidor Retiro',
        driverPhone: retiroInfo.driverPhone || null,
        misionTipo: 'RECOGIDA',
        compensacion: pickupFee,
        estadoCompensacion: extra?.pickupCompensacionEstado || 'PENDING'
      };
    }

    // Entrega
    const entregaInfo = (
      ['ESPERANDO_REPARTIDOR_ENTREGA', 'EN_RUTA_ENTREGA', 'ENTREGADO'].includes(order?.estado) ? {
        driverId: extra?.assignedDriverId || extra?.repartidorId || order?.repartidorId,
        driverName: extra?.assignedDriverName || extra?.assignedDriver,
        driverPhone: extra?.assignedDriverPhone
      } : null
    );

    if (entregaInfo && !deliveryDriver) {
      deliveryDriver = {
        driverId: entregaInfo.driverId || null,
        driverName: entregaInfo.driverName || 'Repartidor Entrega',
        driverPhone: entregaInfo.driverPhone || null,
        misionTipo: 'ENTREGA',
        compensacion: deliveryFee,
        estadoCompensacion: extra?.deliveryCompensacionEstado || 'PENDING'
      };
    }
  } else {
    // Restaurante / Simple Delivery
    const driverId = extra?.assignedDriverId || extra?.repartidorId || order?.repartidorId;
    const driverName = extra?.assignedDriverName || extra?.assignedDriver;
    if (driverId || driverName) {
      deliveryDriver = deliveryDriver || {
        driverId: driverId || null,
        driverName: driverName || 'Repartidor',
        driverPhone: extra?.assignedDriverPhone || null,
        misionTipo: 'ENTREGA',
        compensacion: deliveryFee,
        estadoCompensacion: extra?.deliveryCompensacionEstado || 'PENDING'
      };
    }
  }

  const tipoMision: LogisticsMissionType = isLaundry ? 'ROUND_TRIP_SERVICE' : 'DELIVERY_ONLY';

  return {
    tipoMision,
    pickupFee,
    deliveryFee,
    totalLogisticsFee,
    recaudacion,
    pickupDriver,
    deliveryDriver,
    distanceKm: extra?.distanciaKm,
    billableDistanceKm: extra?.distanciaCobrableKm
  };
}

/**
 * Obtiene la compensación específica que le corresponde al chofer actual para la fase activa de la orden
 */
export function getActiveDriverCompensation(order: any, currentDriverId?: string | null): {
  monto: number;
  mision: 'RECOGIDA' | 'ENTREGA' | 'SIMPLE';
  estadoCompensacion: DriverCompensationStatus;
  puedeCobrarCliente: boolean;
  montoRecaudarCliente: number;
} {
  const canonical = getCanonicalLogistics(order, currentDriverId);
  const isLaundry = canonical.tipoMision === 'ROUND_TRIP_SERVICE';
  const orderState = String(order?.estado || '');

  const isRetiroPhase = ['PENDIENTE_RETIRO', 'REPARTIDOR_ASIGNADO', 'REPARTIDOR_EN_CAMINO', 'RECOGIDO'].includes(orderState);

  if (isLaundry) {
    if (isRetiroPhase) {
      return {
        monto: canonical.pickupFee,
        mision: 'RECOGIDA',
        estadoCompensacion: canonical.pickupDriver?.estadoCompensacion || 'PENDING',
        puedeCobrarCliente: false,
        montoRecaudarCliente: 0.00
      };
    } else {
      return {
        monto: canonical.deliveryFee,
        mision: 'ENTREGA',
        estadoCompensacion: canonical.deliveryDriver?.estadoCompensacion || 'PENDING',
        puedeCobrarCliente: false,
        montoRecaudarCliente: 0.00
      };
    }
  }

  const recaudar = canonical.recaudacion.requerida ? canonical.recaudacion.montoEsperado : 0.00;
  return {
    monto: canonical.deliveryFee,
    mision: 'ENTREGA',
    estadoCompensacion: canonical.deliveryDriver?.estadoCompensacion || 'PENDING',
    puedeCobrarCliente: canonical.recaudacion.requerida,
    montoRecaudarCliente: recaudar
  };
}
