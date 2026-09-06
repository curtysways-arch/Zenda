/**
 * @file dataProtector.ts
 * @module core/security
 * @description Capa universal de redacción lógica (Backend Data Sanitizer).
 * Protege datos estratégicos y sensibles devolviendo valores limpios (null)
 * e inyectando metadatos declarativos de bloqueo (isLocked, lockReason)
 * sin romper identificadores operativos ni alterar la base de datos física.
 */

import { ResourcePolicy } from './dataPolicyTypes';

export class DataProtector {
  /**
   * Protege una orden de restaurante / gastronomía / comanda
   */
  public static protectOrder(order: any, policy: ResourcePolicy): any {
    if (!order) return null;

    // Si no tiene permiso de visualización general, devolver estructura básica bloqueada
    if (!policy.view) {
      return {
        id: order.id,
        numeroPedido: order.numeroPedido,
        estado: order.estado,
        estadoDisponibilidad: order.estadoDisponibilidad,
        tipoEntrega: order.tipoEntrega,
        fechaEntrega: order.fechaEntrega,
        franjaHoraria: order.franjaHoraria,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        negocioId: order.negocioId,
        nombreCliente: 'Cliente Protegido',
        telefonoCliente: null,
        direccionCliente: null,
        referenciaCliente: null,
        latitud: null,
        longitud: null,
        subtotal: null,
        costoEnvio: null,
        total: null,
        notas: null,
        extraInfo: null,
        items: null,
        payment: null,
        isLocked: true,
        lockReason: policy.lockReason || 'POLICY_RESTRICTED',
      };
    }

    const protectedOrder = { ...order };

    // Protección de cliente y contacto
    if (!policy.customer) {
      protectedOrder.nombreCliente = 'Cliente Protegido';
    }
    if (!policy.contact) {
      protectedOrder.telefonoCliente = null;
      protectedOrder.direccionCliente = null;
      protectedOrder.referenciaCliente = null;
      protectedOrder.latitud = null;
      protectedOrder.longitud = null;
    }

    // Protección de notas / detalles operativos
    if (!policy.details) {
      protectedOrder.notas = null;
      protectedOrder.extraInfo = null;
    }

    // Protección de items y precios unitarios
    if (!policy.items) {
      protectedOrder.items = null;
    } else if (!policy.prices && Array.isArray(protectedOrder.items)) {
      protectedOrder.items = protectedOrder.items.map((item: any) => ({
        ...item,
        precioUnitario: null,
      }));
    }

    // Protección financiera global
    if (!policy.financials) {
      protectedOrder.subtotal = null;
      protectedOrder.costoEnvio = null;
      protectedOrder.total = null;
      protectedOrder.payment = null;
    }

    protectedOrder.isLocked = policy.isLocked;
    if (policy.lockReason) {
      protectedOrder.lockReason = policy.lockReason;
    }

    return protectedOrder;
  }

  /**
   * Protege una cita / servicio (Salud, Belleza, Spa, Barbería)
   */
  public static protectAppointment(appointment: any, policy: ResourcePolicy): any {
    if (!appointment) return null;

    if (!policy.view) {
      return {
        id: appointment.id,
        fecha: appointment.fecha,
        horaInicio: appointment.horaInicio,
        horaFin: appointment.horaFin,
        duracion: appointment.duracion,
        estado: appointment.estado,
        serviceId: appointment.serviceId,
        staffId: appointment.staffId,
        negocioId: appointment.negocioId,
        clienteId: appointment.clienteId,
        createdAt: appointment.createdAt,
        updatedAt: appointment.updatedAt,
        service: appointment.service || null,
        staff: appointment.staff || null,
        cliente: appointment.cliente ? {
          id: appointment.cliente.id,
          nombre: 'Cliente Protegido',
          telefono: null,
          email: null,
        } : null,
        total: null,
        pagoAnticipo: null,
        precioOriginal: null,
        descuentoAplicado: null,
        pagoReserva: null,
        comentarios: null,
        extraServices: null,
        isLocked: true,
        lockReason: policy.lockReason || 'POLICY_RESTRICTED',
      };
    }

    const protectedApp = { ...appointment };

    // Protección del cliente
    if (protectedApp.cliente) {
      protectedApp.cliente = { ...protectedApp.cliente };
      if (!policy.customer) {
        protectedApp.cliente.nombre = 'Cliente Protegido';
      }
      if (!policy.contact) {
        protectedApp.cliente.telefono = null;
        protectedApp.cliente.email = null;
      }
    }

    // Protección de notas / detalles operativos
    if (!policy.details) {
      protectedApp.comentarios = null;
      protectedApp.extraServices = null;
    }

    // Protección financiera
    if (!policy.financials) {
      protectedApp.total = null;
      protectedApp.pagoAnticipo = null;
      protectedApp.precioOriginal = null;
      protectedApp.descuentoAplicado = null;
      protectedApp.pagoReserva = null;
    }

    protectedApp.isLocked = policy.isLocked;
    if (policy.lockReason) {
      protectedApp.lockReason = policy.lockReason;
    }

    return protectedApp;
  }

  /**
   * Protege una reserva de canchas / complejos deportivos
   */
  public static protectReservation(reservation: any, policy: ResourcePolicy): any {
    // Las reservas de canchas en Citiox mapean a la tabla Reserva (Appointment)
    return DataProtector.protectAppointment(reservation, policy);
  }

  /**
   * Protege una orden de servicio (Lavanderías, Sneaker Care, Reparaciones)
   */
  public static protectServiceOrder(serviceOrder: any, policy: ResourcePolicy): any {
    if (!serviceOrder) return null;

    if (!policy.view) {
      return {
        id: serviceOrder.id,
        numeroOrden: serviceOrder.numeroOrden || serviceOrder.numeroPedido,
        estado: serviceOrder.estado,
        createdAt: serviceOrder.createdAt,
        updatedAt: serviceOrder.updatedAt,
        negocioId: serviceOrder.negocioId,
        nombreCliente: 'Cliente Protegido',
        telefonoCliente: null,
        direccionCliente: null,
        prendas: null,
        items: null,
        inspeccionFotos: null,
        total: null,
        subtotal: null,
        isLocked: true,
        lockReason: policy.lockReason || 'POLICY_RESTRICTED',
      };
    }

    const protectedOrder = { ...serviceOrder };

    if (!policy.customer) {
      protectedOrder.nombreCliente = 'Cliente Protegido';
    }
    if (!policy.contact) {
      protectedOrder.telefonoCliente = null;
      protectedOrder.direccionCliente = null;
      protectedOrder.emailCliente = null;
    }
    if (!policy.items) {
      protectedOrder.prendas = null;
      protectedOrder.items = null;
      protectedOrder.inspeccionFotos = null;
    } else if (!policy.prices) {
      if (Array.isArray(protectedOrder.prendas)) {
        protectedOrder.prendas = protectedOrder.prendas.map((p: any) => ({ ...p, precio: null }));
      }
      if (Array.isArray(protectedOrder.items)) {
        protectedOrder.items = protectedOrder.items.map((i: any) => ({ ...i, precioUnitario: null }));
      }
    }
    if (!policy.financials) {
      protectedOrder.subtotal = null;
      protectedOrder.total = null;
      protectedOrder.pago = null;
    }

    protectedOrder.isLocked = policy.isLocked;
    if (policy.lockReason) {
      protectedOrder.lockReason = policy.lockReason;
    }

    return protectedOrder;
  }

  /**
   * Protege una orden de tienda / e-commerce de productos físicos
   */
  public static protectStoreOrder(storeOrder: any, policy: ResourcePolicy): any {
    // Mapea la orden de tienda física utilizando la especificación de Pedido
    return DataProtector.protectOrder(storeOrder, policy);
  }

  /**
   * Protege los datos de un cliente en el directorio de clientes
   */
  public static protectCustomer(customer: any, policy: ResourcePolicy): any {
    if (!customer) return null;

    if (!policy.view) {
      return {
        id: customer.id,
        nombre: 'Cliente Protegido',
        telefono: null,
        email: null,
        totalReservas: customer.totalReservas ?? 0,
        totalGastado: null,
        ratingPromedio: customer.ratingPromedio ?? 0,
        totalReviews: customer.totalReviews ?? 0,
        createdAt: customer.createdAt,
        isLocked: true,
        lockReason: policy.lockReason || 'POLICY_RESTRICTED',
      };
    }

    const protectedCustomer = { ...customer };

    if (!policy.customer) {
      protectedCustomer.nombre = 'Cliente Protegido';
    }
    if (!policy.contact) {
      protectedCustomer.telefono = null;
      protectedCustomer.email = null;
    }
    if (!policy.financials) {
      protectedCustomer.totalGastado = null;
    }

    protectedCustomer.isLocked = policy.isLocked;
    if (policy.lockReason) {
      protectedCustomer.lockReason = policy.lockReason;
    }

    return protectedCustomer;
  }
}

export const protectOrder = (order: any, policy: ResourcePolicy) => DataProtector.protectOrder(order, policy);
export const protectAppointment = (apt: any, policy: ResourcePolicy) => DataProtector.protectAppointment(apt, policy);
export const protectReservation = (res: any, policy: ResourcePolicy) => DataProtector.protectReservation(res, policy);
export const protectServiceOrder = (so: any, policy: ResourcePolicy) => DataProtector.protectServiceOrder(so, policy);
export const protectStoreOrder = (sto: any, policy: ResourcePolicy) => DataProtector.protectStoreOrder(sto, policy);
export const protectCustomer = (cust: any, policy: ResourcePolicy) => DataProtector.protectCustomer(cust, policy);

