import prisma from '@/lib/prisma';
import { WalletCurrencyType, Prisma } from '@prisma/client';

export class WalletService {
  /**
   * Obtiene o crea la billetera asociada a un negocio o un usuario para una divisa específica.
   */
  static async getOrCreateWallet(
    targetId: string,
    targetType: 'NEGOCIO' | 'USUARIO',
    currency: WalletCurrencyType,
    tx?: Prisma.TransactionClient
  ) {
    const client = tx || prisma;
    const filter = targetType === 'NEGOCIO' 
      ? { negocioId: targetId, tipo: currency } 
      : { usuarioId: targetId, tipo: currency };

    // Buscar billetera existente
    let wallet = await client.wallet.findFirst({
      where: filter,
    });

    // Si no existe, crearla atómicamente
    if (!wallet) {
      const data = targetType === 'NEGOCIO'
        ? { negocioId: targetId, tipo: currency, saldo: 0.0 }
        : { usuarioId: targetId, tipo: currency, saldo: 0.0 };

      wallet = await client.wallet.create({
        data,
      });
    }

    return wallet;
  }

  /**
   * Añade fondos de forma segura y auditable a una billetera.
   */
  static async addFunds(
    targetId: string,
    targetType: 'NEGOCIO' | 'USUARIO',
    currency: WalletCurrencyType,
    amount: number,
    motive: string,
    referenceId?: string,
    tx?: Prisma.TransactionClient
  ) {
    if (amount <= 0) {
      throw new Error('El monto a agregar debe ser mayor que cero.');
    }

    const execute = async (client: Prisma.TransactionClient) => {
      // Obtener o crear la wallet
      const wallet = await this.getOrCreateWallet(targetId, targetType, currency, client);

      // Actualizar saldo de la wallet
      const updatedWallet = await client.wallet.update({
        where: { id: wallet.id },
        data: {
          saldo: {
            increment: amount,
          },
        },
      });

      // Registrar la transacción de auditoría
      await client.walletTransaction.create({
        data: {
          walletId: wallet.id,
          tipo: 'INGRESO',
          monto: amount,
          motivo: motive,
          referenciaId: referenceId,
        },
      });

      return updatedWallet;
    };

    // Si ya viene una transacción, la reutilizamos, si no abrimos una nueva
    if (tx) {
      return await execute(tx);
    } else {
      return await prisma.$transaction(async (client) => {
        return await execute(client);
      });
    }
  }

  /**
   * Deduce fondos de una billetera validando saldo suficiente.
   */
  static async deductFunds(
    targetId: string,
    targetType: 'NEGOCIO' | 'USUARIO',
    currency: WalletCurrencyType,
    amount: number,
    motive: string,
    referenceId?: string,
    tx?: Prisma.TransactionClient
  ) {
    if (amount <= 0) {
      throw new Error('El monto a deducir debe ser mayor que cero.');
    }

    const execute = async (client: Prisma.TransactionClient) => {
      // Obtener o crear la wallet
      const wallet = await this.getOrCreateWallet(targetId, targetType, currency, client);

      // Validar saldo suficiente
      if (wallet.saldo < amount) {
        throw new Error(`Saldo insuficiente en monedero de ${currency}. Saldo actual: ${wallet.saldo}, requerido: ${amount}`);
      }

      // Actualizar saldo de la wallet
      const updatedWallet = await client.wallet.update({
        where: { id: wallet.id },
        data: {
          saldo: {
            decrement: amount,
          },
        },
      });

      // Registrar la transacción de auditoría
      await client.walletTransaction.create({
        data: {
          walletId: wallet.id,
          tipo: 'EGRESO',
          monto: amount,
          motivo: motive,
          referenciaId: referenceId,
        },
      });

      return updatedWallet;
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
   * Obtiene el saldo actual de un monedero específico.
   */
  static async getWalletBalance(
    targetId: string,
    targetType: 'NEGOCIO' | 'USUARIO',
    currency: WalletCurrencyType
  ): Promise<number> {
    const filter = targetType === 'NEGOCIO' 
      ? { negocioId: targetId, tipo: currency } 
      : { usuarioId: targetId, tipo: currency };

    const wallet = await prisma.wallet.findFirst({
      where: filter,
      select: { saldo: true },
    });

    return wallet?.saldo || 0.0;
  }

  /**
   * Obtiene el historial de transacciones de un usuario o negocio.
   */
  static async getTransactionHistory(
    targetId: string,
    targetType: 'NEGOCIO' | 'USUARIO',
    currency?: WalletCurrencyType
  ) {
    const walletFilter = targetType === 'NEGOCIO'
      ? { negocioId: targetId }
      : { usuarioId: targetId };

    if (currency) {
      Object.assign(walletFilter, { tipo: currency });
    }

    return await prisma.walletTransaction.findMany({
      where: {
        Wallet: walletFilter,
      },
      include: {
        Wallet: true,
      },
      orderBy: {
        fecha: 'desc',
      },
    });
  }
}
