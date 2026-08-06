// src/core/delivery/DeliveryOperations.ts
// Motor de Operaciones de Delivery: asignación de repartidores y estados de envío

import prisma from '@/lib/prisma';
import { coreEventBus } from '../events/EventBus';

export type DeliveryStatus = 'PENDING' | 'ASSIGNED' | 'PICKED_UP' | 'ON_ROUTE' | 'DELIVERED' | 'CANCELLED';

export interface CreateDeliveryParams {
  pedidoId: string;
  negocioId: string;
  clienteNombre: string;
  clienteTelefono: string;
  direccion: string;
  referencia?: string;
  latitud?: number;
  longitud?: number;
  distanciaKm?: number;
  costoEnvio?: number;
}

export class DeliveryOperations {
  // Crear orden de delivery para un pedido de forma automática
  public static async createDeliveryOrder(params: CreateDeliveryParams) {
    try {
      // Verificar si ya existe un registro de delivery para el pedido
      const existing = await (prisma as any).deliveryAssignment?.findFirst({
        where: { pedidoId: params.pedidoId }
      });

      if (existing) {
        console.log(`[DeliveryOperations] Envío ya existente para pedido ${params.pedidoId}`);
        return existing;
      }

      // Crear el registro de asignación/envío de delivery
      let assignment = null;
      if ((prisma as any).deliveryAssignment) {
        assignment = await (prisma as any).deliveryAssignment.create({
          data: {
            pedidoId: params.pedidoId,
            negocioId: params.negocioId,
            estado: 'PENDING',
            direccionEntrega: params.direccion,
            distanciaKm: params.distanciaKm || 0,
            costoEnvio: params.costoEnvio || 0,
            notas: params.referencia || null,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });
      }

      console.log(`[DeliveryOperations] Orden de delivery creada exitosamente para pedido ${params.pedidoId}`);
      return assignment;
    } catch (err) {
      console.error('[DeliveryOperations_ERROR]', err);
      return null;
    }
  }

  // Asignar repartidor (rol DELIVERY / Staff)
  public static async assignDriver(deliveryId: string, driverId: string, negocioId: string) {
    try {
      const updated = await (prisma as any).deliveryAssignment.update({
        where: { id: deliveryId },
        data: {
          driverId,
          estado: 'ASSIGNED',
          updatedAt: new Date()
        }
      });

      // Emitir evento desacoplado
      await coreEventBus.emit('DELIVERY_ASSIGNED', negocioId, { deliveryId, driverId }, updated.pedidoId);
      return updated;
    } catch (err) {
      console.error('[DeliveryOperations_ASSIGN_ERROR]', err);
      return null;
    }
  }
}

// Registrar listener en EventBus para ORDER_CONFIRMED
coreEventBus.on('ORDER_CONFIRMED', async (payload) => {
  const { data, businessId, orderId } = payload;
  if (data?.tipoEntrega === 'DELIVERY_ORDER' || data?.tipoEntrega === 'DOMICILIO') {
    console.log(`[DeliveryOperations] Creando envío para pedido confirmado #${data.numeroPedido || orderId}`);
    await DeliveryOperations.createDeliveryOrder({
      pedidoId: orderId || data.id,
      negocioId: businessId,
      clienteNombre: data.nombreCliente || 'Cliente',
      clienteTelefono: data.telefonoCliente || '',
      direccion: data.direccionCliente || '',
      referencia: data.referenciaCliente || '',
      latitud: data.latitud,
      longitud: data.longitud,
      distanciaKm: data.pricingBreakdown?.distanceKm || 0,
      costoEnvio: data.costoEnvio || 0
    });
  }
});
