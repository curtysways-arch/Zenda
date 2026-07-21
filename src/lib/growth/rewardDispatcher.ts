import prisma from '../prisma';
import { Prisma } from '@prisma/client';
import { publishDomainEvent } from './eventBus';
import { WalletService } from './walletService';
import { WalletCurrencyType } from '@prisma/client';

export interface RewardDefinition {
  tipo: string;          // Tipo de premio, ej. "DIAMONDS", "COUPON", "WEBHOOK", "FREE_DAYS"
  valor: any;            // Parámetros de configuración del premio
  provider?: string;     // Proveedor externo ej: "SPOTIFY", "SYSTEM"
  version?: string;      // Versión de la definición del premio
}

export interface RewardHandler {
  supports(type: string): boolean;
  handle(
    targetId: string,
    targetType: 'NEGOCIO' | 'USUARIO',
    definition: RewardDefinition,
    motive: string,
    referenceId?: string,
    tx?: Prisma.TransactionClient
  ): Promise<any>;
}

export class WalletHandler implements RewardHandler {
  supports(type: string): boolean {
    return ['DIAMONDS', 'XP', 'SEASON_POINTS', 'CREDITS', 'TOKENS', 'CASHBACK'].includes(type);
  }

  async handle(
    targetId: string,
    targetType: 'NEGOCIO' | 'USUARIO',
    definition: RewardDefinition,
    motive: string,
    referenceId?: string,
    tx?: Prisma.TransactionClient
  ): Promise<any> {
    const val = definition.valor || {};
    const valorNumerico = parseFloat(String(val.valor || val.amount || val || 0));
    const currency = definition.tipo as WalletCurrencyType;
    return await WalletService.addFunds(
      targetId,
      targetType,
      currency,
      valorNumerico,
      motive,
      referenceId,
      tx
    );
  }
}

export class CouponHandler implements RewardHandler {
  supports(type: string): boolean {
    return type === 'COUPON' || type === 'CUPON';
  }

  async handle(
    targetId: string,
    targetType: 'NEGOCIO' | 'USUARIO',
    definition: RewardDefinition,
    motive: string,
    referenceId?: string,
    tx?: Prisma.TransactionClient
  ): Promise<any> {
    const client = tx || prisma;
    const val = definition.valor || {};
    const valor = parseFloat(String(val.valor || val.descuento || 10));
    const tipoCupon = val.tipo || 'PORCENTAJE'; // PORCENTAJE | FIJO
    const vencimientoDias = parseInt(String(val.vencimientoDias || 30));
    
    if (targetType !== 'USUARIO') {
      throw new Error('Los cupones solo pueden asignarse a Usuarios.');
    }

    // Resolver negocioId y couponId
    const negocioId = val.negocioId || 'system';
    let couponId = val.couponId;

    if (!couponId) {
      // Buscar un cupón activo del negocio que coincida con el valor y tipo
      const coupon = await client.coupon.findFirst({
        where: {
          negocioId,
          activa: true,
          valor,
          tipo: tipoCupon
        }
      });
      if (!coupon) {
        // Crear un cupón de respaldo con el valor y tipo correctos para evitar fallos
        const tempCouponId = crypto.randomUUID();
        const createdCoupon = await client.coupon.create({
          data: {
            id: tempCouponId,
            negocioId,
            codigo: `CTX-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
            descripcion: val.descripcion || `Cupón Especial Citiox: ${tipoCupon === 'FIJO' ? '$' : ''}${valor}${tipoCupon === 'PORCENTAJE' ? '%' : ''} Desc.`,
            valor,
            tipo: tipoCupon,
            activa: true
          }
        });
        couponId = createdCoupon.id;
      } else {
        couponId = coupon.id;
      }
    }

    // Buscar el cupón original para obtener su código original
    const coupon = await client.coupon.findUnique({
      where: { id: couponId }
    });
    if (!coupon) {
      throw new Error(`El cupón con ID ${couponId} no existe.`);
    }

    const code = `CP-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const fechaExpiracion = new Date();
    fechaExpiracion.setDate(fechaExpiracion.getDate() + vencimientoDias);

    return await client.clientCoupon.create({
      data: {
        id: crypto.randomUUID(),
        negocioId,
        clienteId: targetId,
        couponId,
        questId: referenceId || null,
        sourceType: 'QUEST',
        estado: 'DISPONIBLE',
        codigo: code,
        codigoOriginal: coupon.codigo,
        nombre: val.nombre || `Cupón de Recompensa`,
        descripcion: val.descripcion || `Cupón obtenido: ${motive}`,
        descuento: valor,
        tipo: tipoCupon,
        fechaAsignacion: new Date(),
        fechaExpiracion
      }
    });
  }
}

export class FreeDaysHandler implements RewardHandler {
  supports(type: string): boolean {
    return type === 'FREE_DAYS';
  }

  async handle(
    targetId: string,
    targetType: 'NEGOCIO' | 'USUARIO',
    definition: RewardDefinition,
    motive: string,
    referenceId?: string,
    tx?: Prisma.TransactionClient
  ): Promise<any> {
    if (targetType !== 'NEGOCIO') {
      throw new Error('Las recompensas de tipo FREE_DAYS solo aplican a Negocios.');
    }
    const client = tx || prisma;
    const val = definition.valor || {};
    const dias = Math.floor(parseFloat(String(val.dias || val.valor || 15)));
    const negocio = await client.negocio.findUnique({
      where: { id: targetId },
      select: { planExpiresAt: true },
    });

    if (negocio) {
      const currentExpiry = negocio.planExpiresAt && negocio.planExpiresAt > new Date()
        ? negocio.planExpiresAt
        : new Date();
      const newExpiry = new Date(currentExpiry.getTime() + dias * 24 * 60 * 60 * 1000);

      await client.negocio.update({
        where: { id: targetId },
        data: { planExpiresAt: newExpiry },
      });

      // Crear auditoría
      await client.globalMissionRewardHistory.create({
        data: {
          negocioId: targetId,
          missionId: referenceId || 'SYSTEM',
          tipo: 'FREE_DAYS',
          valor: { dias },
          detalles: `+${dias} días gratis: ${motive}`,
        },
      });
    }
  }
}

export class BadgeHandler implements RewardHandler {
  supports(type: string): boolean {
    return type === 'BADGE' || type === 'ADD_BADGE';
  }

  async handle(
    targetId: string,
    targetType: 'NEGOCIO' | 'USUARIO',
    definition: RewardDefinition,
    motive: string,
    referenceId?: string,
    tx?: Prisma.TransactionClient
  ): Promise<any> {
    if (targetType !== 'USUARIO') {
      throw new Error('Las insignias solo se otorgan a Usuarios.');
    }
    const client = tx || prisma;
    const badgeId = definition.valor?.badgeId || definition.valor;
    if (!badgeId) return;

    // Verificar si ya la tiene
    const existing = await client.userBadge.findUnique({
      where: {
        userId_badgeId: {
          userId: targetId,
          badgeId
        }
      }
    });

    if (!existing) {
      return await client.userBadge.create({
        data: {
          id: crypto.randomUUID(),
          userId: targetId,
          badgeId
        }
      });
    }
  }
}

export class WebhookHandler implements RewardHandler {
  supports(type: string): boolean {
    return type === 'WEBHOOK' || type === 'CUSTOM_WEBHOOK';
  }

  async handle(
    targetId: string,
    targetType: 'NEGOCIO' | 'USUARIO',
    definition: RewardDefinition,
    motive: string,
    referenceId?: string,
    tx?: Prisma.TransactionClient
  ): Promise<any> {
    const url = definition.valor?.url || definition.valor;
    if (!url) return;

    // Disparar llamada asíncrona no bloqueante
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        targetId,
        targetType,
        motive,
        referenceId,
        provider: definition.provider,
        version: definition.version,
        timestamp: new Date().toISOString()
      })
    }).catch(err => {
      console.error(`[WebhookHandler] Error enviando webhook a ${url}:`, err.message);
    });

    return { status: 'SENT_ASYNC', url };
  }
}

export class FeatureHandler implements RewardHandler {
  supports(type: string): boolean {
    return ['FEATURE_UNLOCK', 'UNLOCK_FEATURE', 'LIMIT_BOOST', 'BOOST_VISIBILITY'].includes(type);
  }

  async handle(
    targetId: string,
    targetType: 'NEGOCIO' | 'USUARIO',
    definition: RewardDefinition,
    motive: string,
    referenceId?: string,
    tx?: Prisma.TransactionClient
  ): Promise<any> {
    console.log(`[FeatureHandler] Desbloqueando característica/boost de tipo ${definition.tipo} para ${targetId}`);
    return { status: 'UNLOCKED', type: definition.tipo };
  }
}

export class GiftHandler implements RewardHandler {
  supports(type: string): boolean {
    return ['PRODUCT_GIFT', 'SERVICE_GIFT', 'REGALO', 'SERVICIO', 'PRODUCTO', 'SERVICE', 'GIFT'].includes(type);
  }

  async handle(
    targetId: string,
    targetType: 'NEGOCIO' | 'USUARIO',
    definition: RewardDefinition,
    motive: string,
    referenceId?: string,
    tx?: Prisma.TransactionClient
  ): Promise<any> {
    const val = definition.valor || {};
    const name = val.nombre || val.name || 'Regalo Sorpresa';
    const deliveryType = val.deliveryType || 'MANUAL';
    const vencimientoDias = parseInt(String(val.vencimientoDias || val.vencimiento || 30));
    
    // Si se entrega a un usuario final, debemos registrar la recompensa para que la vea en su app y se pueda canjear
    if (targetType === 'USUARIO') {
      const db = tx || prisma;
      const negocioId = val.negocioId;
      const serviceId = val.serviceId || null;
      const isService = ['SERVICE', 'SERVICE_GIFT', 'SERVICIO'].includes(definition.tipo);
      
      if (negocioId) {
        // Buscar o crear la LoyaltyReward de respaldo
        let reward = await db.loyaltyReward.findFirst({
          where: { 
            negocioId, 
            nombre: name, 
            tipo: isService ? 'SERVICIO_GRATIS' : 'PRODUCTO',
            ...(isService && { serviceId })
          }
        });

        if (!reward) {
          reward = await db.loyaltyReward.create({
            data: {
              negocioId,
              nombre: name,
              costoPuntos: isService ? 500 : 200,
              tipo: isService ? 'SERVICIO_GRATIS' : 'PRODUCTO',
              deliveryType: deliveryType === 'MANUAL' ? 'MANUAL' : 'AUTOMATICO',
              serviceId: isService ? serviceId : null,
              activa: false, // Oculto del catálogo público
              descripcion: `Premio ganado al completar la misión: ${motive}`
            }
          });
        }

        const cleanCode = deliveryType === 'MANUAL' 
          ? 'CTX-' + Math.random().toString(36).substring(2, 9).toUpperCase()
          : null;
          
        const estado = deliveryType === 'MANUAL' ? 'PENDIENTE_ENTREGA' : 'DISPONIBLE';
        const fechaExpiracion = vencimientoDias > 0 
          ? new Date(Date.now() + vencimientoDias * 24 * 60 * 60 * 1000) 
          : null;

        // Crear la redención
        await db.loyaltyRedemption.create({
          data: {
            negocioId,
            userId: targetId,
            rewardId: reward.id,
            questId: referenceId || null,
            fechaExpiracion,
            estado: estado as any,
            claimCode: cleanCode,
            notas: motive
          }
        });
      }
    }

    return { status: 'GIFT_GRANTED', name, deliveryType, vencimientoDias };
  }
}

export class RewardHandlerFactory {
  private static handlers: RewardHandler[] = [
    new WalletHandler(),
    new CouponHandler(),
    new FreeDaysHandler(),
    new BadgeHandler(),
    new WebhookHandler(),
    new FeatureHandler(),
    new GiftHandler()
  ];

  static getHandler(type: string): RewardHandler {
    const handler = this.handlers.find(h => h.supports(type));
    if (!handler) {
      throw new Error(`No se encontró un manejador de recompensa (RewardHandler) para el tipo: ${type}`);
    }
    return handler;
  }
}

export class RewardDispatcher {
  /**
   * Despacha una recompensa de forma segura delegando al manejador correspondiente
   * y emitiendo el evento de dominio resultante.
   */
  static async dispatchReward(
    targetId: string,
    targetType: 'NEGOCIO' | 'USUARIO',
    definition: RewardDefinition,
    motive: string,
    referenceId?: string,
    tx?: Prisma.TransactionClient
  ): Promise<any> {
    try {
      console.log(`[RewardDispatcher] Despachando recompensa de tipo ${definition.tipo} para ${targetType}:${targetId}`);
      
      const handler = RewardHandlerFactory.getHandler(definition.tipo);
      const result = await handler.handle(targetId, targetType, definition, motive, referenceId, tx);

      // Emitir el evento de dominio exitoso
      await publishDomainEvent(
        targetType === 'NEGOCIO' ? 'NEGOCIO' : 'USER',
        targetId,
        'LEVEL_REWARD_GRANTED',
        {
          definition,
          motive,
          referenceId,
          result
        }
      );

      return result;
    } catch (error: any) {
      console.error(`[RewardDispatcher] Error procesando recompensa:`, error.message);
      
      // Emitir evento de fallo
      await publishDomainEvent(
        targetType === 'NEGOCIO' ? 'NEGOCIO' : 'USER',
        targetId,
        'GLOBAL_REWARD_FAILED',
        {
          definition,
          motive,
          referenceId,
          error: error.message
        }
      );

      throw error;
    }
  }
}
