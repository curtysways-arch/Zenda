import prisma from '@/lib/prisma';
import { RewardCatalogType, WalletCurrencyType, Prisma } from '@prisma/client';
import { WalletService } from './walletService';
import { NotificationService } from '../notifications/notificationService';

export class RewardService {
  /**
   * Crea un nuevo premio en el catálogo general.
   */
  static async createRewardCatalog(
    data: {
      nombre: string;
      descripcion?: string | null;
      tipo: RewardCatalogType;
      valor?: any;
      activa?: boolean;
    },
    tx?: Prisma.TransactionClient
  ) {
    const client = tx || prisma;
    return await client.rewardCatalog.create({
      data: {
        nombre: data.nombre,
        descripcion: data.descripcion,
        tipo: data.tipo,
        valor: data.valor || null,
        activa: data.activa ?? true,
      },
    });
  }

  /**
   * Procesa la entrega de un premio del catálogo de forma atómica.
   */
  static async processReward(
    targetId: string,
    targetType: 'NEGOCIO' | 'USUARIO',
    rewardCatalogId: string,
    motive: string,
    referenceId?: string,
    tx?: Prisma.TransactionClient
  ) {
    const execute = async (client: Prisma.TransactionClient) => {
      // Buscar el premio en el catálogo
      const reward = await client.rewardCatalog.findUnique({
        where: { id: rewardCatalogId },
      });

      if (!reward || !reward.activa) {
        throw new Error(`El premio con ID ${rewardCatalogId} no existe o no está activo.`);
      }

      // Procesar según el tipo de premio
      await this.processRewardAction(
        targetId,
        targetType,
        reward.tipo,
        reward.valor,
        motive,
        referenceId || reward.id,
        client
      );

      return reward;
    };

    if (tx) {
      return await execute(tx);
    } else {
      return await prisma.$transaction(async (client) => {
        return await execute(client);
      });
    }
  }

  /**
   * Ejecuta una acción de premio directa (soporta el motor extensible y compatibilidad).
   */
  static async processRewardAction(
    targetId: string,
    targetType: 'NEGOCIO' | 'USUARIO',
    actionType: string,
    parametros: any,
    motive: string,
    referenceId?: string,
    tx?: Prisma.TransactionClient
  ) {
    const client = tx || prisma;
    const value = typeof parametros === 'object' && parametros !== null ? parametros : { valor: parametros };
    const valorNumerico = parseFloat(String(value.valor || value.amount || 0));

    switch (actionType) {
      // ─── DIVISAS DE WALLET UNIFICADO ──────────────────────────────────────────
      case 'DIAMONDS':
      case 'XP':
      case 'SEASON_POINTS':
      case 'CREDITS':
      case 'TOKENS':
      case 'CASHBACK': {
        const currency = actionType as WalletCurrencyType;
        await WalletService.addFunds(
          targetId,
          targetType,
          currency,
          valorNumerico,
          motive,
          referenceId,
          client
        );
        break;
      }

      // ─── DÍAS GRATIS (SUSCRIPCIÓN DE NEGOCIO) ──────────────────────────────────
      case 'FREE_DAYS': {
        if (targetType !== 'NEGOCIO') {
          throw new Error('Las recompensas de tipo FREE_DAYS solo aplican a Negocios.');
        }

        const dias = Math.floor(valorNumerico || 15);
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

          // Registrar en el historial de recompensas globales de negocio (para conservar compatibilidad de auditoría)
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
        break;
      }

      // ─── CUPONES DE DESCUENTO (CLIENTES FINALES) ──────────────────────────────
      case 'COUPON': {
        if (targetType !== 'USUARIO') {
          throw new Error('Las recompensas de tipo COUPON solo aplican a Usuarios.');
        }

        const valorDescuento = parseFloat(String(value.descuento || value.valor || 10));
        const tipoDescuento = String(value.tipo || 'PORCENTAJE'); // PORCENTAJE | FIJO
        const vencimientoDias = parseInt(String(value.vencimientoDias || 30));
        const fechaExpiracion = vencimientoDias > 0 ? new Date(Date.now() + vencimientoDias * 24 * 60 * 60 * 1000) : null;
        const negocioId = String(value.negocioId || 'SYSTEM');

        // Generar código de cupón aleatorio único
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let uniqueCode = '';
        let isUnique = false;
        for (let attempt = 0; attempt < 10; attempt++) {
          let tempCode = 'CTX-';
          for (let i = 0; i < 5; i++) {
            tempCode += chars.charAt(Math.floor(Math.random() * chars.length));
          }
          const check = await client.clientCoupon.findUnique({
            where: { codigo: tempCode }
          });
          if (!check) {
            uniqueCode = tempCode;
            isUnique = true;
            break;
          }
        }
        if (!isUnique) {
          uniqueCode = `CTX-${Date.now().toString().slice(-5)}`;
        }

        // Crear o buscar un cupón maestro asociado al negocio para vincular
        const masterCode = `REGLA-${(referenceId || 'CATALOG').substring(0, 8)}`.toUpperCase();
        let coupon = await client.coupon.findFirst({
          where: { negocioId, codigo: masterCode }
        });

        if (!coupon) {
          coupon = await client.coupon.create({
            data: {
              negocioId,
              codigo: masterCode,
              tipo: tipoDescuento,
              valor: valorDescuento,
              descripcion: `Cupón automático Citiox: ${motive}`,
              usosActuales: 0,
              activa: true
            }
          });
        }

        // Registrar cupón del cliente
        await client.clientCoupon.create({
          data: {
            negocioId,
            clienteId: targetId,
            couponId: coupon.id,
            sourceType: 'QUEST',
            estado: 'DISPONIBLE',
            codigo: uniqueCode,
            codigoOriginal: coupon.codigo,
            nombre: `Premio Especial Citiox`,
            descripcion: motive,
            descuento: valorDescuento,
            tipo: tipoDescuento,
            fechaAsignacion: new Date(),
            fechaExpiracion
          }
        });

        // Enviar notificación al usuario
        await NotificationService.createNotification({
          negocioId,
          userId: targetId,
          tipo: 'PREMIO',
          categoria: 'CUPONES',
          titulo: '🎁 ¡Premio Reclamado: Cupón de Regalo!',
          descripcion: `Has ganado un cupón de ${tipoDescuento === 'PORCENTAJE' ? `${valorDescuento}%` : `$${valorDescuento}`} de descuento. Código: ${uniqueCode}`,
          icono: 'Ticket',
          prioridad: 'SUCCESS',
          recipientType: 'USER',
        });
        break;
      }

      // ─── INSIGNIAS / BADGES (CLIENTES FINALES O NEGOCIOS) ─────────────────────
      case 'BADGE': {
        const badgeId = String(value.badgeId || value);
        if (targetType === 'USUARIO') {
          const existing = await client.userBadge.findUnique({
            where: { userId_badgeId: { userId: targetId, badgeId } }
          });
          if (!existing) {
            await client.userBadge.create({
              data: { userId: targetId, badgeId }
            });
          }
        }
        break;
      }

      // ─── FUNCIONES PREMIUM / DESBLOQUEOS / BOOST ──────────────────────────────
      case 'FEATURE_UNLOCK':
      case 'LIMIT_BOOST':
      case 'BOOST_VISIBILITY': {
        if (targetType !== 'NEGOCIO') {
          throw new Error(`Las acciones de tipo ${actionType} solo aplican a Negocios.`);
        }
        
        // Obtener negocio actual
        const negocio = await client.negocio.findUnique({
          where: { id: targetId },
          select: { configuracion: true }
        });

        if (negocio) {
          const currentConfig = negocio.configuracion && typeof negocio.configuracion === 'object'
            ? (negocio.configuracion as Record<string, any>)
            : {};
          
          // Modificar configuración agregando la función desbloqueada
          currentConfig[actionType] = true;
          if (value.featureName) {
            currentConfig[`unlock_${value.featureName}`] = true;
          }
          if (value.limitValue) {
            currentConfig[`limit_${actionType.toLowerCase()}`] = value.limitValue;
          }

          await client.negocio.update({
            where: { id: targetId },
            data: {
              configuracion: currentConfig
            }
          });
        }
        break;
      }

      default:
        console.warn(`[RewardService] Tipo de acción de recompensa no soportado en esta fase: ${actionType}`);
        break;
    }
  }
}
