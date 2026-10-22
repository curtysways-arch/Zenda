import prisma from '@/lib/prisma';

export interface OpenSessionParams {
  businessId: string;
  branchId?: string;
  cashRegisterId?: string;
  cashRegisterName?: string;
  openedBy: string;
  openingAmount: number;
  notes?: string;
}

export interface CloseSessionParams {
  sessionId: string;
  businessId: string;
  closedBy: string;
  cashCounted: number;
  notes?: string;
}

export interface CashMovementParams {
  sessionId: string;
  businessId: string;
  type: 'INGRESO_MANUAL' | 'EGRESO_GASTO' | 'RETIRO_DEPOSITO' | 'VENTA_EFECTIVO' | 'DEVOLUCION_EFECTIVO';
  amount: number;
  paymentMethod?: string;
  concept: string;
  reference?: string;
  userId?: string;
  userName?: string;
}

export interface HandoverParams {
  currentSessionId: string;
  businessId: string;
  outgoingCashier: string;
  incomingCashier: string;
  cashCounted: number;
  newOpeningAmount?: number;
  notes?: string;
}

export class CashSessionService {
  /**
   * Obtiene la terminal física o caja por defecto de la sucursal/negocio, o la crea si no existe
   */
  public static async getOrCreateDefaultRegister(businessId: string, branchId?: string) {
    let effectiveBranchId = branchId;
    if (!effectiveBranchId) {
      const mainBranch = await (prisma as any).branch.findFirst({
        where: { businessId, active: true },
        orderBy: { isMain: 'desc' }
      });
      if (mainBranch) {
        effectiveBranchId = mainBranch.id;
      } else {
        // Crear sucursal principal por defecto si no existe
        const newBranch = await (prisma as any).branch.create({
          data: {
            businessId,
            name: 'Sucursal Principal',
            slug: 'principal',
            isMain: true
          }
        });
        effectiveBranchId = newBranch.id;
      }
    }

    let register = await (prisma as any).cashRegister.findFirst({
      where: { businessId, branchId: effectiveBranchId, active: true }
    });

    if (!register) {
      register = await (prisma as any).cashRegister.create({
        data: {
          businessId,
          branchId: effectiveBranchId,
          name: 'Caja Principal 01',
          code: 'CAJA-01',
          active: true
        }
      });
    }

    return register;
  }

  /**
   * Obtiene la sesión de caja actualmente abierta para una caja o negocio
   */
  public static async getActiveSession(businessId: string, cashRegisterId?: string, userEmail?: string) {
    const where: any = {
      businessId,
      status: 'OPEN'
    };

    if (cashRegisterId) {
      where.cashRegisterId = cashRegisterId;
    }
    if (userEmail) {
      where.openedBy = userEmail;
    }

    const session = await (prisma as any).cashRegisterSession.findFirst({
      where,
      include: {
        cashRegister: true,
        movements: {
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: { openedAt: 'desc' }
    });

    return session;
  }

  /**
   * Apertura formal de caja con fondo inicial
   */
  public static async openSession(params: OpenSessionParams) {
    const { businessId, openedBy, openingAmount, notes } = params;

    let register = null;
    if (params.cashRegisterId) {
      register = await (prisma as any).cashRegister.findUnique({
        where: { id: params.cashRegisterId }
      });
    }

    if (!register) {
      register = await this.getOrCreateDefaultRegister(businessId, params.branchId);
    }

    // Verificar si ya existe una sesión abierta en esta caja
    const existingOpenSession = await (prisma as any).cashRegisterSession.findFirst({
      where: {
        cashRegisterId: register.id,
        status: 'OPEN'
      }
    });

    if (existingOpenSession) {
      throw new Error(`La caja ${register.name} ya tiene una sesión abierta por ${existingOpenSession.openedBy}. Debe realizarse el cierre o relevo antes de una nueva apertura.`);
    }

    const session = await (prisma as any).cashRegisterSession.create({
      data: {
        businessId,
        branchId: register.branchId,
        cashRegisterId: register.id,
        openedBy,
        openingAmount: Math.max(0, Number(openingAmount) || 0),
        status: 'OPEN',
        notes: notes || 'Apertura de turno',
        cashExpected: Math.max(0, Number(openingAmount) || 0),
        cardExpected: 0,
        transferExpected: 0,
        otherExpected: 0
      },
      include: {
        cashRegister: true
      }
    });

    return session;
  }

  /**
   * Registro auditable de un movimiento en caja (ventas, ingresos, gastos, retiros)
   * Admite un cliente transaccional opcional `tx` para ejecutarse en operaciones atómicas compuestas (ej. checkout POS).
   */
  public static async recordMovement(params: CashMovementParams, tx?: any) {
    const { sessionId, businessId, type, amount, paymentMethod = 'EFECTIVO', concept, reference, userId, userName } = params;
    const db = tx || prisma;

    if (!businessId) {
      throw new Error('El negocio (businessId) es obligatorio para registrar movimientos de caja.');
    }

    const session = await (db as any).cashRegisterSession.findFirst({
      where: { id: sessionId, businessId }
    });

    if (!session) {
      throw new Error('Sesión de caja no encontrada o no pertenece al negocio especificado.');
    }

    if (session.status !== 'OPEN') {
      throw new Error('No se puede registrar movimiento: la sesión de caja está cerrada.');
    }

    const numAmount = Number(amount) || 0;
    if (numAmount <= 0) {
      throw new Error('El monto del movimiento debe ser mayor a 0.');
    }

    // Crear el movimiento
    const movement = await (db as any).cashMovement.create({
      data: {
        sessionId,
        businessId,
        type,
        amount: numAmount,
        paymentMethod: paymentMethod.toUpperCase(),
        concept,
        reference,
        userId,
        userName
      }
    });

    // Actualizar los acumulados esperados en la sesión
    const isEfectivo = paymentMethod.toUpperCase().includes('EFECTIVO');
    const isTarjeta = paymentMethod.toUpperCase().includes('TARJETA');
    const isTransferencia = paymentMethod.toUpperCase().includes('TRANSF');

    let cashDelta = 0;
    let cardDelta = 0;
    let transferDelta = 0;
    let otherDelta = 0;

    if (type === 'VENTA_EFECTIVO' || type === 'INGRESO_MANUAL') {
      if (isEfectivo) cashDelta += numAmount;
      else if (isTarjeta) cardDelta += numAmount;
      else if (isTransferencia) transferDelta += numAmount;
      else otherDelta += numAmount;
    } else if (type === 'EGRESO_GASTO' || type === 'RETIRO_DEPOSITO' || type === 'DEVOLUCION_EFECTIVO') {
      if (isEfectivo) cashDelta -= numAmount;
      else if (isTarjeta) cardDelta -= numAmount;
      else if (isTransferencia) transferDelta -= numAmount;
      else otherDelta -= numAmount;
    }

    await (db as any).cashRegisterSession.update({
      where: { id: sessionId },
      data: {
        cashExpected: Math.max(0, (session.cashExpected || 0) + cashDelta),
        cardExpected: Math.max(0, (session.cardExpected || 0) + cardDelta),
        transferExpected: Math.max(0, (session.transferExpected || 0) + transferDelta),
        otherExpected: Math.max(0, (session.otherExpected || 0) + otherDelta),
        updatedAt: new Date()
      }
    });

    return movement;
  }

  /**
   * Resumen y cálculo de cuadre de una sesión (efectivo esperado vs contado)
   * Valida estrictamente pertenencia a `businessId` si se provee.
   */
  public static async calculateSessionSummary(sessionId: string, businessId?: string, tx?: any) {
    const db = tx || prisma;
    const where: any = { id: sessionId };
    if (businessId) {
      where.businessId = businessId;
    }

    const session = await (db as any).cashRegisterSession.findFirst({
      where,
      include: {
        cashRegister: true,
        movements: true
      }
    });

    if (!session) {
      throw new Error(businessId
        ? 'Sesión de caja no encontrada o no pertenece al negocio especificado.'
        : 'Sesión de caja no encontrada.');
    }

    const opening = Number(session.openingAmount) || 0;
    let totalCashSales = 0;
    let totalCardSales = 0;
    let totalTransferSales = 0;
    let totalOtherSales = 0;
    let manualIncomes = 0;
    let expenses = 0;
    let withdrawals = 0;
    let refunds = 0;

    for (const m of session.movements || []) {
      const amt = Number(m.amount) || 0;
      const meth = (m.paymentMethod || 'EFECTIVO').toUpperCase();

      if (m.type === 'VENTA_EFECTIVO') {
        if (meth.includes('TARJETA')) totalCardSales += amt;
        else if (meth.includes('TRANSF')) totalTransferSales += amt;
        else if (meth.includes('OTRO')) totalOtherSales += amt;
        else totalCashSales += amt;
      } else if (m.type === 'INGRESO_MANUAL') {
        manualIncomes += amt;
      } else if (m.type === 'EGRESO_GASTO') {
        expenses += amt;
      } else if (m.type === 'RETIRO_DEPOSITO') {
        withdrawals += amt;
      } else if (m.type === 'DEVOLUCION_EFECTIVO') {
        refunds += amt;
      }
    }

    // Efectivo esperado = Fondo Inicial + Ventas Efectivo + Ingresos Manuales - Gastos - Retiros - Devoluciones
    const expectedCash = opening + totalCashSales + manualIncomes - expenses - withdrawals - refunds;

    return {
      session,
      openingAmount: opening,
      totalCashSales,
      totalCardSales,
      totalTransferSales,
      totalOtherSales,
      manualIncomes,
      expenses,
      withdrawals,
      refunds,
      expectedCash: Math.max(0, expectedCash),
      expectedTotal: expectedCash + totalCardSales + totalTransferSales + totalOtherSales
    };
  }

  /**
   * Cierre formal y definitivo de caja con arqueo y diferencia
   * Ejecutado atómicamente con validación estricta de empresa y prevención de doble cierre concurrente.
   */
  public static async closeSession(params: CloseSessionParams, tx?: any) {
    const { sessionId, businessId, closedBy, cashCounted, notes } = params;

    const executeClose = async (client: any) => {
      const summary = await this.calculateSessionSummary(sessionId, businessId, client);
      if (summary.session.status === 'CLOSED') {
        throw new Error('La sesión de caja ya se encuentra cerrada.');
      }

      const counted = Math.max(0, Number(cashCounted) || 0);
      const diff = counted - summary.expectedCash;

      // Reclamo condicional: solo se actualiza si aún está en estado OPEN y pertenece al negocio
      const claim = await client.cashRegisterSession.updateMany({
        where: { id: sessionId, businessId, status: 'OPEN' },
        data: {
          status: 'CLOSED',
          closedBy,
          closedAt: new Date(),
          closingAmount: counted,
          expectedAmount: summary.expectedCash,
          difference: diff,
          cashCounted: counted,
          notes: notes || summary.session.notes,
          updatedAt: new Date()
        }
      });

      if (claim.count !== 1) {
        throw new Error('La sesión de caja ya fue cerrada por otra operación simultánea.');
      }

      const closedSession = await client.cashRegisterSession.findUnique({
        where: { id: sessionId },
        include: {
          cashRegister: true,
          movements: true
        }
      });

      return {
        closedSession,
        summary,
        difference: diff
      };
    };

    if (tx) {
      return await executeClose(tx);
    }
    return await (prisma as any).$transaction(async (innerTx: any) => {
      return await executeClose(innerTx);
    });
  }

  /**
   * Proceso de Relevo / Cambio de cajero
   * 1. Cierra el turno del cajero saliente con su arqueo
   * 2. Abre de inmediato el turno del nuevo cajero con el fondo recibido
   * Todo dentro de UNA sola transacción para garantizar consistencia atómica.
   */
  public static async shiftHandover(params: HandoverParams) {
    const { currentSessionId, businessId, outgoingCashier, incomingCashier, cashCounted, newOpeningAmount, notes } = params;

    return await (prisma as any).$transaction(async (tx: any) => {
      // 1. Cierre saliente
      const closeResult = await this.closeSession({
        sessionId: currentSessionId,
        businessId,
        closedBy: outgoingCashier,
        cashCounted,
        notes: `Relevo de turno saliente a ${incomingCashier}. ${notes || ''}`
      }, tx);

      // 2. Fondo inicial entrante (por defecto el efectivo contado o lo especificado)
      const openingAmt = newOpeningAmount !== undefined ? newOpeningAmount : cashCounted;

      // 3. Apertura entrante
      const newSession = await (tx as any).cashRegisterSession.create({
        data: {
          businessId,
          branchId: closeResult.closedSession.branchId,
          cashRegisterId: closeResult.closedSession.cashRegisterId,
          openedBy: incomingCashier,
          openingAmount: Math.max(0, Number(openingAmt) || 0),
          status: 'OPEN',
          notes: `Relevo recibido de ${outgoingCashier}. Fondo declarado: $${Number(openingAmt).toFixed(2)}`,
          cashExpected: Math.max(0, Number(openingAmt) || 0),
          cardExpected: 0,
          transferExpected: 0,
          otherExpected: 0
        },
        include: {
          cashRegister: true
        }
      });

      return {
        closedSession: closeResult.closedSession,
        newSession,
        difference: closeResult.difference
      };
    });
  }
}
