import prisma from '@/lib/prisma';

export interface ServiceInspectionInput {
  pedidoId: string;
  nivelSuciedad: 'POCO' | 'MEDIO' | 'ALTO' | 'RESTAURACION';
  precioBase: number;
  serviciosAdicionales?: Array<{ id?: string; nombre: string; precio: number }>;
  costoRetiro?: number;
  costoEntrega?: number;
  fechaHoraEntregaEstimada?: string;
  notasInspeccion?: string;
}

export interface ServicePhotoInput {
  pedidoId: string;
  tipo: 'RECEPCION' | 'PROCESO' | 'ENTREGA' | 'RETIRO';
  url: string;
}

export class ServiceEngine {
  /**
   * Calcula el precio total desglosado tras la inspección física.
   */
  static calculateInspectionTotal(input: {
    precioBase: number;
    serviciosAdicionales?: Array<{ precio: number }>;
    costoRetiro?: number;
    costoEntrega?: number;
  }) {
    const base = input.precioBase || 0;
    const adicionales = (input.serviciosAdicionales || []).reduce((acc, s) => acc + (s.precio || 0), 0);
    const retiro = input.costoRetiro || 0;
    const entrega = input.costoEntrega || 0;
    const total = base + adicionales + retiro + entrega;

    return {
      precioBase: base,
      costoAdicionales: adicionales,
      costoRetiro: retiro,
      costoEntrega: entrega,
      total
    };
  }

  /**
   * Procesa la inspección de un artículo o pedido en el ServiceEngine
   */
  static async processInspection(input: ServiceInspectionInput) {
    const pedido = await prisma.pedido.findUnique({
      where: { id: input.pedidoId }
    });

    if (!pedido) {
      throw new Error('Pedido u Orden de Servicio no encontrada');
    }

    const currentExtra = (pedido.extraInfo as any) || {};
    const breakdown = this.calculateInspectionTotal({
      precioBase: input.precioBase,
      serviciosAdicionales: input.serviciosAdicionales,
      costoRetiro: input.costoRetiro,
      costoEntrega: input.costoEntrega
    });

    const updatedExtraInfo = {
      ...currentExtra,
      inspeccionRealizada: true,
      fechaInspeccion: new Date().toISOString(),
      nivelSuciedad: input.nivelSuciedad,
      precioBase: breakdown.precioBase,
      serviciosAdicionales: input.serviciosAdicionales || [],
      costoRetiro: breakdown.costoRetiro,
      costoEntrega: breakdown.costoEntrega,
      fechaHoraEntregaEstimada: input.fechaHoraEntregaEstimada || currentExtra.fechaHoraEntregaEstimada,
      notasInspeccion: input.notasInspeccion || currentExtra.notasInspeccion
    };

    const updatedPedido = await prisma.pedido.update({
      where: { id: input.pedidoId },
      data: {
        subtotal: breakdown.precioBase + breakdown.costoAdicionales,
        costoEnvio: breakdown.costoRetiro + breakdown.costoEntrega,
        total: breakdown.total,
        estado: 'INSPECCIONADO',
        extraInfo: updatedExtraInfo
      }
    });

    return {
      pedido: updatedPedido,
      breakdown
    };
  }

  /**
   * Registra fotografías asociadas a la orden (Recepción, Proceso, Retiro, Entrega)
   */
  static async attachPhoto(input: ServicePhotoInput) {
    const pedido = await prisma.pedido.findUnique({
      where: { id: input.pedidoId }
    });

    if (!pedido) {
      throw new Error('Pedido u Orden de Servicio no encontrada');
    }

    const extra = (pedido.extraInfo as any) || {};
    const photoKey = input.tipo === 'RECEPCION'
      ? 'fotosRecepcion'
      : input.tipo === 'PROCESO'
      ? 'fotosProceso'
      : input.tipo === 'RETIRO'
      ? 'fotosRetiro'
      : 'fotosEntrega';

    const currentPhotos = Array.isArray(extra[photoKey]) ? extra[photoKey] : [];
    const updatedPhotos = [...currentPhotos, input.url];

    const updatedPedido = await prisma.pedido.update({
      where: { id: input.pedidoId },
      data: {
        extraInfo: {
          ...extra,
          [photoKey]: updatedPhotos
        }
      }
    });

    return updatedPedido;
  }
}
