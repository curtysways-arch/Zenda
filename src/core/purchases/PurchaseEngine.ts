import prisma from '@/lib/prisma';
import { InventoryEngine } from '../inventory/InventoryEngine';
import {
  toDecimal,
  addDecimal,
  subDecimal,
  mulDecimal,
  divDecimal,
  roundMoney,
  roundQty,
  roundCost,
  decimalGt,
  decimalGte,
  decimalLte,
  decimalEq,
  isZeroDecimal
} from '@/lib/math/money';

export interface CreateSupplierInput {
  businessId: string;
  taxId: string;
  taxIdType?: string;
  name: string;
  commercialName?: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
  paymentTerms?: string;
  creditDays?: number;
  prismaClient?: any;
}

export interface CreatePurchaseOrderInput {
  businessId: string;
  branchId?: string;
  warehouseId?: string;
  supplierId: string;
  orderNumber?: string;
  invoiceNumber?: string;
  expectedDate?: Date | string;
  currency?: string;
  discount?: number;
  shippingCost?: number;
  otherCosts?: number;
  paymentMethod?: string;
  paymentStatus?: string;
  notes?: string;
  requireApproval?: boolean;
  createdById?: string;
  createdByName?: string;
  items: Array<{
    productId: string;
    variantId?: string | null;
    productName: string;
    unit?: string;
    quantity: number;
    unitCost: number;
    discount?: number;
    taxRate?: number;
  }>;
  prismaClient?: any;
}

export interface ReceiveItemInput {
  productId: string;
  variantId?: string | null;
  receivedQuantity: number;
}

export interface ReceivePurchaseInput {
  purchaseId: string;
  businessId: string;
  receivedItems?: ReceiveItemInput[];
  receivedById?: string;
  receivedByName?: string;
  notes?: string;
  prismaClient?: any;
}

export interface RegisterPaymentInput {
  payableId: string;
  businessId: string;
  amount: number;
  paymentDate?: Date | string;
  paymentMethod?: string;
  reference?: string;
  notes?: string;
  registeredById?: string;
  registeredByName?: string;
  prismaClient?: any;
}

export interface ReturnToSupplierInput {
  purchaseId: string;
  businessId: string;
  warehouseId?: string;
  items: Array<{
    productId: string;
    variantId?: string | null;
    quantity: number;
    unitCost?: number;
    reason?: string;
  }>;
  returnedById?: string;
  returnedByName?: string;
  notes?: string;
  prismaClient?: any;
}

export class PurchaseEngine {
  /**
   * Crear o actualizar proveedor (aislado por businessId)
   */
  public static async upsertSupplier(input: CreateSupplierInput) {
    const { businessId, taxId, name } = input;
    const db = input.prismaClient || prisma;

    return await db.supplier.upsert({
      where: {
        businessId_taxId: { businessId, taxId }
      },
      update: {
        name,
        commercialName: input.commercialName,
        contactPerson: input.contactPerson,
        email: input.email,
        phone: input.phone,
        address: input.address,
        notes: input.notes,
        paymentTerms: input.paymentTerms || 'CONTADO',
        creditDays: input.creditDays !== undefined ? Number(input.creditDays) : 0,
        active: true,
        updatedAt: new Date()
      },
      create: {
        businessId,
        taxId,
        taxIdType: input.taxIdType || 'RUC',
        name,
        commercialName: input.commercialName,
        contactPerson: input.contactPerson,
        email: input.email,
        phone: input.phone,
        address: input.address,
        notes: input.notes,
        paymentTerms: input.paymentTerms || 'CONTADO',
        creditDays: input.creditDays !== undefined ? Number(input.creditDays) : 0,
        active: true
      }
    });
  }

  /**
   * Activar o desactivar proveedor (prohibido borrado físico con compras históricas)
   */
  public static async toggleSupplierStatus(supplierId: string, businessId: string, active: boolean, prismaClient?: any) {
    const db = prismaClient || prisma;
    const supplier = await db.supplier.findFirst({
      where: { id: supplierId, businessId }
    });
    if (!supplier) throw new Error('Proveedor no encontrado o no pertenece al negocio.');

    return await db.supplier.update({
      where: { id: supplierId },
      data: { active, updatedAt: new Date() }
    });
  }

  /**
   * Crear Orden de Compra (DRAFT o PENDING_APPROVAL) con cálculo aritmético Decimal riguroso
   */
  public static async createPurchaseOrder(input: CreatePurchaseOrderInput, autoReceive = false) {
    const { businessId, supplierId, items } = input;
    const db = input.prismaClient || prisma;

    if (!items || items.length === 0) {
      throw new Error('La orden de compra debe contener al menos un producto.');
    }

    // Verificar proveedor
    const supplier = await db.supplier.findFirst({
      where: { id: supplierId, businessId, active: true }
    });
    if (!supplier) {
      throw new Error('El proveedor especificado no existe, está inactivo o no pertenece a este negocio.');
    }

    // Resolver sucursal y bodega si se proporcionan
    let branchId = input.branchId || null;
    let warehouseId = input.warehouseId || null;

    if (warehouseId) {
      const wh = await db.warehouse.findFirst({
        where: { id: warehouseId, businessId, active: true }
      });
      if (!wh) throw new Error('La bodega receptora no existe o está inactiva.');
      if (wh.type === 'TRANSIT' || wh.type === 'SCRAP_WASTE') {
        throw new Error('No se pueden recibir compras en bodegas virtuales (tránsito o merma).');
      }
      if (branchId && wh.branchId && wh.branchId !== branchId) {
        throw new Error('La bodega seleccionada no pertenece a la sucursal indicada.');
      }
      if (!branchId && wh.branchId) {
        branchId = wh.branchId;
      }
    }

    // Cálculos de líneas con Decimal
    let grossSubtotalDec = toDecimal(0);
    let totalLineDiscountDec = toDecimal(0);
    let totalTaxAmountDec = toDecimal(0);

    const processedItems = items.map(it => {
      const qtyDec = roundQty(it.quantity);
      if (qtyDec.lte(0)) throw new Error(`La cantidad del producto "${it.productName}" debe ser mayor a 0.`);

      const unitCostDec = roundCost(it.unitCost);
      if (unitCostDec.lt(0)) throw new Error(`El costo del producto "${it.productName}" no puede ser negativo.`);

      const lineGrossDec = roundMoney(mulDecimal(qtyDec, unitCostDec));
      const lineDiscDec = roundMoney(toDecimal(it.discount || 0));
      const lineNetDec = roundMoney(subDecimal(lineGrossDec, lineDiscDec));
      if (lineNetDec.lt(0)) throw new Error(`El descuento de "${it.productName}" excede el subtotal de la línea.`);

      const rateDec = toDecimal(it.taxRate !== undefined ? it.taxRate : 0.15); // 15% IVA default
      const lineTaxDec = roundMoney(mulDecimal(lineNetDec, rateDec));
      const lineTotalDec = roundMoney(addDecimal(lineNetDec, lineTaxDec));

      grossSubtotalDec = addDecimal(grossSubtotalDec, lineGrossDec);
      totalLineDiscountDec = addDecimal(totalLineDiscountDec, lineDiscDec);
      totalTaxAmountDec = addDecimal(totalTaxAmountDec, lineTaxDec);

      return {
        productId: it.productId,
        variantId: it.variantId || null,
        productName: it.productName,
        unit: it.unit || 'UNIDAD',
        quantity: qtyDec.toNumber(),
        receivedQuantity: 0,
        unitCost: unitCostDec.toNumber(),
        discount: lineDiscDec.toNumber(),
        taxRate: rateDec.toNumber(),
        subtotal: lineNetDec.toNumber(),
        total: lineTotalDec.toNumber()
      };
    });

    const globalDiscountDec = roundMoney(toDecimal(input.discount || 0));
    const shippingCostDec = roundMoney(toDecimal(input.shippingCost || 0));
    const otherCostsDec = roundMoney(toDecimal(input.otherCosts || 0));

    const totalDiscountDec = addDecimal(totalLineDiscountDec, globalDiscountDec);
    const netSubtotalDec = roundMoney(subDecimal(grossSubtotalDec, totalDiscountDec));
    if (netSubtotalDec.lt(0)) throw new Error('El descuento global excede el subtotal neto de la compra.');

    // Total = Subtotal Neto + Impuestos + Flete + Otros Costos
    const finalTotalDec = roundMoney(addDecimal(addDecimal(addDecimal(netSubtotalDec, totalTaxAmountDec), shippingCostDec), otherCostsDec));

    // Determinar estado inicial
    const initialStatus = input.requireApproval ? 'PENDING_APPROVAL' : 'DRAFT';

    // Generar consecutivo si no viene provisto
    let orderNum = input.orderNumber;
    if (!orderNum) {
      const count = await db.purchaseOrder.count({ where: { businessId } });
      orderNum = `OC-${String(count + 1).padStart(5, '0')}`;
    }

    const purchase = await db.purchaseOrder.create({
      data: {
        businessId,
        branchId,
        warehouseId,
        supplierId,
        orderNumber: orderNum,
        invoiceNumber: input.invoiceNumber || null,
        status: initialStatus,
        issueDate: new Date(),
        expectedDate: input.expectedDate ? new Date(input.expectedDate) : null,
        currency: input.currency || 'USD',
        subtotal: netSubtotalDec.toNumber(),
        discount: totalDiscountDec.toNumber(),
        shippingCost: shippingCostDec.toNumber(),
        otherCosts: otherCostsDec.toNumber(),
        taxAmount: totalTaxAmountDec.toNumber(),
        total: finalTotalDec.toNumber(),
        paymentMethod: input.paymentMethod || supplier.paymentTerms || 'TRANSFERENCIA',
        paymentStatus: (input.paymentMethod === 'CREDITO' || supplier.paymentTerms === 'CREDITO') ? 'PENDING' : (input.paymentStatus || 'PAID'),
        notes: input.notes || null,
        createdById: input.createdById || null,
        createdByName: input.createdByName || null,
        items: {
          create: processedItems
        }
      },
      include: {
        supplier: true,
        items: true,
        branch: true
      }
    });

    if (autoReceive) {
      return await this.receivePurchase({
        purchaseId: purchase.id,
        businessId,
        receivedById: input.createdById,
        receivedByName: input.createdByName,
        prismaClient: db
      });
    }

    return purchase;
  }

  /**
   * Aprobar Orden de Compra (PENDING_APPROVAL / DRAFT -> APPROVED)
   */
  public static async approvePurchaseOrder(
    purchaseId: string,
    businessId: string,
    approverId?: string,
    approverName?: string,
    prismaClient?: any
  ) {
    const db = prismaClient || prisma;
    const purchase = await db.purchaseOrder.findFirst({
      where: { id: purchaseId, businessId }
    });
    if (!purchase) throw new Error('Orden de compra no encontrada.');
    if (purchase.status === 'APPROVED') return purchase;
    if (purchase.status === 'RECEIVED' || purchase.status === 'PARTIALLY_RECEIVED') {
      throw new Error('La orden de compra ya está recibida y no requiere aprobación.');
    }
    if (purchase.status === 'CANCELLED') {
      throw new Error('No se puede aprobar una orden de compra cancelada.');
    }

    // Reclamo atómico condicional (idempotente ante doble clic / concurrencia)
    await db.purchaseOrder.updateMany({
      where: { id: purchaseId, businessId, status: { in: ['DRAFT', 'PENDING_APPROVAL'] } },
      data: {
        status: 'APPROVED',
        approvedById: approverId || null,
        approvedByName: approverName || 'Aprobador',
        approvedAt: new Date(),
        updatedAt: new Date()
      }
    });

    return await db.purchaseOrder.findFirst({
      where: { id: purchaseId, businessId },
      include: { supplier: true, items: true, branch: true }
    });
  }

  /**
   * Cancelar Orden de Compra en DRAFT, PENDING_APPROVAL o APPROVED sin recepciones físicas
   */
  public static async cancelPurchaseOrder(
    purchaseId: string,
    businessId: string,
    userId?: string,
    userName?: string,
    prismaClient?: any
  ) {
    const db = prismaClient || prisma;
    const purchase = await db.purchaseOrder.findFirst({
      where: { id: purchaseId, businessId },
      include: { items: true }
    });
    if (!purchase) throw new Error('Orden de compra no encontrada.');

    if (purchase.status === 'RECEIVED' || purchase.status === 'PARTIALLY_RECEIVED') {
      throw new Error('No se puede cancelar una compra que ya tiene recepciones físicas. Utilice una devolución a proveedor.');
    }

    const hasReceived = purchase.items.some((it: any) => toDecimal(it.receivedQuantity || 0).gt(0));
    if (hasReceived) {
      throw new Error('La orden de compra tiene líneas con recepciones físicas registradas. Cancelación rechazada.');
    }

    return await db.purchaseOrder.update({
      where: { id: purchaseId },
      data: {
        status: 'CANCELLED',
        notes: purchase.notes ? `${purchase.notes} (Cancelada por ${userName || 'Usuario'})` : `Cancelada por ${userName || 'Usuario'}`,
        updatedAt: new Date()
      },
      include: { supplier: true, items: true }
    });
  }

  /**
   * Recepción Física (completa o parcial) en UNA transacción atómica:
   * - Validación estricta contra sobre-recepción.
   * - Prorrateo de Landed Cost (flete y costos adicionales).
   * - Ingreso físico mediante InventoryEngine.recordMovement({ type: 'COMPRA' }).
   * - Actualización de PMP de sucursal vía CostingEngine.
   * - Generación/actualización de Cuenta por Pagar (AccountPayable) si es a crédito.
   * - Idempotencia y protección de concurrencia.
   */
  public static async receivePurchase(input: ReceivePurchaseInput) {
    const { purchaseId, businessId, receivedItems, receivedById, receivedByName } = input;
    if (!businessId) throw new Error('Negocio no especificado.');

    const db = input.prismaClient || prisma;

    return await db.$transaction(async (tx: any) => {
      const purchase = await tx.purchaseOrder.findFirst({
        where: { id: purchaseId, businessId },
        include: { items: true, supplier: true, branch: true }
      });

      if (!purchase) throw new Error('Orden de compra no encontrada.');

      if (purchase.status === 'CANCELLED') {
        throw new Error('No se puede recibir mercadería de una orden cancelada.');
      }
      if (purchase.status === 'RECEIVED') {
        throw new Error('Esta orden de compra ya ha sido recibida al 100%. Doble recepción bloqueada.');
      }

      // Resolver bodega física receptora
      let targetWarehouse: any = null;
      if (purchase.warehouseId) {
        targetWarehouse = await tx.warehouse.findFirst({
          where: { id: purchase.warehouseId, businessId, active: true }
        });
        if (!targetWarehouse) throw new Error('La bodega receptora especificada no existe o está inactiva.');
        if (targetWarehouse.type === 'TRANSIT' || targetWarehouse.type === 'SCRAP_WASTE') {
          throw new Error('No se pueden recibir compras en bodegas virtuales del sistema (tránsito o merma).');
        }
      } else {
        targetWarehouse = await tx.warehouse.findFirst({
          where: { businessId, isDefault: true, active: true, type: { notIn: ['TRANSIT', 'SCRAP_WASTE'] } }
        });
        if (!targetWarehouse) {
          targetWarehouse = await tx.warehouse.findFirst({
            where: { businessId, active: true, type: { notIn: ['TRANSIT', 'SCRAP_WASTE'] } }
          });
        }
      }

      if (!targetWarehouse || !targetWarehouse.branchId) {
        throw new Error('El negocio no tiene una bodega física configurada con sucursal para la recepción de compras.');
      }

      // Validar concordancia de sucursal
      const targetBranchId = purchase.branchId || targetWarehouse.branchId;
      if (purchase.branchId && targetWarehouse.branchId !== purchase.branchId) {
        throw new Error('La bodega seleccionada no pertenece a la sucursal de la orden de compra.');
      }

      // Si la compra no tenía warehouseId o branchId, persistirlos
      if (!purchase.warehouseId || !purchase.branchId) {
        await tx.purchaseOrder.update({
          where: { id: purchaseId },
          data: {
            warehouseId: targetWarehouse.id,
            branchId: targetBranchId
          }
        });
      }

      // Determinar qué ítems y cantidades se reciben
      let receptionList: Array<{ item: any; recvQtyDec: any }> = [];

      if (receivedItems && receivedItems.length > 0) {
        for (const rcv of receivedItems) {
          const item = purchase.items.find((it: any) =>
            it.productId === rcv.productId &&
            (it.variantId === (rcv.variantId || null) || (!it.variantId && !rcv.variantId))
          );
          if (!item) throw new Error(`El producto "${rcv.productId}" no pertenece a esta orden de compra.`);

          const recvQtyDec = roundQty(rcv.receivedQuantity);
          if (recvQtyDec.lte(0)) continue;

          const orderedDec = roundQty(item.quantity);
          const alreadyRecvDec = roundQty(item.receivedQuantity || 0);
          const pendingDec = subDecimal(orderedDec, alreadyRecvDec);

          // Validación estricta contra sobre-recepción
          if (decimalGt(recvQtyDec, pendingDec)) {
            throw new Error(
              `La cantidad a recibir de "${item.productName}" (${recvQtyDec.toString()}) excede el saldo pendiente (${pendingDec.toString()}). Sobre-recepción rechazada.`
            );
          }

          receptionList.push({ item, recvQtyDec });
        }
      } else {
        // Recepción total de todo lo pendiente
        for (const item of purchase.items) {
          const orderedDec = roundQty(item.quantity);
          const alreadyRecvDec = roundQty(item.receivedQuantity || 0);
          const pendingDec = subDecimal(orderedDec, alreadyRecvDec);
          if (pendingDec.gt(0)) {
            receptionList.push({ item, recvQtyDec: pendingDec });
          }
        }
      }

      if (receptionList.length === 0) {
        throw new Error('No hay ítems ni cantidades válidas para recepcionar.');
      }

      // Prorrateo de Descuentos Globales y Costos Adicionales (Landed Cost: flete + otros costos)
      const orderSubtotalNetDec = toDecimal(purchase.subtotal || 0);
      // PurchaseOrder.discount almacena el descuento TOTAL (líneas + global).
      // El descuento global puro = total - Σ descuentos de línea (evita doble conteo).
      const sumLineDiscountsDec = purchase.items.reduce(
        (acc: any, it: any) => addDecimal(acc, toDecimal(it.discount || 0)),
        toDecimal(0)
      );
      const rawGlobalDiscDec = subDecimal(toDecimal(purchase.discount || 0), sumLineDiscountsDec);
      const globalDiscountDec = rawGlobalDiscDec.lt(0) ? toDecimal(0) : roundMoney(rawGlobalDiscDec);
      const extraCostsDec = addDecimal(toDecimal(purchase.shippingCost || 0), toDecimal(purchase.otherCosts || 0));

      // Calcular suma bruta de todos los ítems de la orden para prorrateo del descuento
      const orderGrossTotalDec = purchase.items.reduce(
        (acc: any, it: any) => addDecimal(acc, mulDecimal(roundQty(it.quantity), roundCost(it.unitCost))),
        toDecimal(0)
      );

      let totalBatchReceptionValue = toDecimal(0);

      for (const { item, recvQtyDec } of receptionList) {
        const itemUnitCostDec = roundCost(item.unitCost);
        const totalLineQtyDec = roundQty(item.quantity);
        const lineGross = roundMoney(mulDecimal(recvQtyDec, itemUnitCostDec));
        const lineItemDisc = totalLineQtyDec.gt(0)
          ? roundMoney(mulDecimal(toDecimal(item.discount || 0), divDecimal(recvQtyDec, totalLineQtyDec)))
          : toDecimal(0);

        // Proporción de descuento global aplicable a esta recepción
        let proportionalGlobalDisc = toDecimal(0);
        if (globalDiscountDec.gt(0) && orderGrossTotalDec.gt(0)) {
          const discRatio = divDecimal(lineGross, orderGrossTotalDec);
          proportionalGlobalDisc = roundMoney(mulDecimal(globalDiscountDec, discRatio));
        }

        const itemLineNet = roundMoney(subDecimal(subDecimal(lineGross, lineItemDisc), proportionalGlobalDisc));

        // Proporción de flete/adicionales para esta cantidad recibida
        let proportionalExtraDec = toDecimal(0);
        if (extraCostsDec.gt(0) && orderSubtotalNetDec.gt(0)) {
          const extraRatio = divDecimal(itemLineNet, orderSubtotalNetDec);
          proportionalExtraDec = roundMoney(mulDecimal(extraCostsDec, extraRatio));
        }

        const effectiveTotalCostDec = roundMoney(addDecimal(itemLineNet, proportionalExtraDec));
        const effectiveUnitCostDec = roundCost(divDecimal(effectiveTotalCostDec, recvQtyDec));

        totalBatchReceptionValue = addDecimal(totalBatchReceptionValue, effectiveTotalCostDec);

        // 1. Ingresar existencias exclusivamente mediante InventoryEngine
        await InventoryEngine.recordMovement({
          businessId,
          branchId: targetBranchId,
          warehouseId: targetWarehouse.id,
          productId: item.productId,
          variantId: item.variantId || null,
          quantity: recvQtyDec,
          type: 'COMPRA',
          unitCost: effectiveUnitCostDec.toNumber(),
          totalCost: effectiveTotalCostDec.toNumber(),
          reason: `Recepción de Compra #${purchase.orderNumber || purchase.id.slice(0, 8)} de ${purchase.supplier.name}`,
          reference: purchase.invoiceNumber || purchase.orderNumber || purchase.id,
          sourceDocType: 'COMPRA',
          sourceDocId: purchase.id,
          createdBy: receivedByName || 'COMPRAS'
        }, tx);

        // 2. Actualizar costo de referencia comercial en Producto (sin alterar PMP)
        await tx.producto.update({
          where: { id: item.productId },
          data: {
            costoUnitario: itemUnitCostDec.toNumber(),
            updatedAt: new Date()
          }
        });

        // 3. Actualizar PurchaseOrderItem acumulado
        const newAlreadyRecvDec = addDecimal(roundQty(item.receivedQuantity || 0), recvQtyDec);
        await tx.purchaseOrderItem.update({
          where: { id: item.id },
          data: {
            receivedQuantity: newAlreadyRecvDec.toNumber(),
            landedUnitCost: effectiveUnitCostDec.toNumber()
          }
        });
      }

      // Evaluar si la orden quedó completa o parcialmente recibida
      const freshItems = await tx.purchaseOrderItem.findMany({
        where: { purchaseOrderId: purchase.id }
      });
      const allCompleted = freshItems.every((it: any) =>
        decimalGte(roundQty(it.receivedQuantity || 0), roundQty(it.quantity))
      );

      const nextStatus = allCompleted ? 'RECEIVED' : 'PARTIALLY_RECEIVED';

      const updatedOrder = await tx.purchaseOrder.update({
        where: { id: purchase.id },
        data: {
          status: nextStatus,
          receptionDate: new Date(),
          updatedAt: new Date()
        },
        include: { items: true, supplier: true, branch: true }
      });

      // 4. Integración con Cuentas por Pagar (AccountPayable) si la compra es a CREDITO
      if (purchase.paymentMethod === 'CREDITO') {
        const creditDays = Number(purchase.supplier.creditDays || 30);
        const issueDate = purchase.issueDate || new Date();
        const dueDate = new Date(issueDate);
        dueDate.setDate(dueDate.getDate() + creditDays);

        const orderTotalDec = roundMoney(toDecimal(purchase.total));

        const existingPayable = await tx.accountPayable.findFirst({
          where: { purchaseId: purchase.id }
        });

        if (!existingPayable) {
          await tx.accountPayable.create({
            data: {
              businessId,
              supplierId: purchase.supplierId,
              purchaseId: purchase.id,
              branchId: targetBranchId,
              invoiceNumber: purchase.invoiceNumber || purchase.orderNumber || null,
              issueDate,
              dueDate,
              originalAmount: orderTotalDec.toNumber(),
              paidAmount: 0,
              balance: orderTotalDec.toNumber(),
              status: 'PENDING',
              notes: `Cuenta por pagar generada automáticamente por Compra #${purchase.orderNumber || purchase.id.slice(0, 8)}`
            }
          });
        }
      }

      return updatedOrder;
    }, { maxWait: 10000, timeout: 30000 });
  }

  /**
   * Registrar Pago en Cuenta por Pagar (con validación de no sobrepago e idempotencia)
   */
  public static async registerPayment(input: RegisterPaymentInput) {
    const { payableId, businessId, amount, paymentMethod, reference, notes, registeredById, registeredByName } = input;
    const db = input.prismaClient || prisma;

    const paymentAmountDec = roundMoney(toDecimal(amount));
    if (paymentAmountDec.lte(0)) throw new Error('El monto del pago debe ser mayor a 0.');

    return await db.$transaction(async (tx: any) => {
      const payable = await tx.accountPayable.findFirst({
        where: { id: payableId, businessId },
        include: { purchase: true, supplier: true }
      });

      if (!payable) throw new Error('Cuenta por pagar no encontrada.');
      if (payable.status === 'PAID') throw new Error('Esta cuenta por pagar ya se encuentra liquidada en su totalidad.');
      if (payable.status === 'CANCELLED') throw new Error('No se pueden aplicar pagos a una cuenta por pagar cancelada.');

      const currentBalanceDec = roundMoney(toDecimal(payable.balance));

      // Regla Absoluta 26: Prohibido sobrepago (paidAmount > originalAmount)
      if (decimalGt(paymentAmountDec, currentBalanceDec)) {
        throw new Error(
          `El monto del pago ($${paymentAmountDec.toString()}) excede el saldo pendiente ($${currentBalanceDec.toString()}). Sobrepago rechazado.`
        );
      }

      const newPaidDec = roundMoney(addDecimal(toDecimal(payable.paidAmount || 0), paymentAmountDec));
      const newBalanceDec = roundMoney(subDecimal(currentBalanceDec, paymentAmountDec));
      const newStatus = isZeroDecimal(newBalanceDec) ? 'PAID' : 'PARTIALLY_PAID';

      // 1. Crear registro de pago
      const paymentRecord = await tx.accountPayablePayment.create({
        data: {
          payableId: payable.id,
          businessId,
          paymentDate: input.paymentDate ? new Date(input.paymentDate) : new Date(),
          amount: paymentAmountDec.toNumber(),
          paymentMethod: paymentMethod || 'TRANSFERENCIA',
          reference: reference || null,
          notes: notes || null,
          registeredById: registeredById || null,
          registeredByName: registeredByName || 'Admin'
        }
      });

      // 2. Actualizar balance y estado en AccountPayable
      const updatedPayable = await tx.accountPayable.update({
        where: { id: payable.id },
        data: {
          paidAmount: newPaidDec.toNumber(),
          balance: newBalanceDec.toNumber(),
          status: newStatus,
          updatedAt: new Date()
        },
        include: { payments: true, supplier: true }
      });

      // 3. Sincronizar estado en PurchaseOrder asociada si aplica
      if (payable.purchaseId) {
        await tx.purchaseOrder.update({
          where: { id: payable.purchaseId },
          data: {
            paymentStatus: newStatus === 'PAID' ? 'PAID' : 'PARTIALLY_PAID',
            updatedAt: new Date()
          }
        });
      }

      return {
        payment: paymentRecord,
        payable: updatedPayable
      };
    });
  }

  /**
   * Devolución a Proveedor (Supplier Return) con movimiento compensatorio trazable
   */
  public static async returnToSupplier(input: ReturnToSupplierInput) {
    const { purchaseId, businessId, items, returnedById, returnedByName } = input;
    const db = input.prismaClient || prisma;

    return await db.$transaction(async (tx: any) => {
      const purchase = await tx.purchaseOrder.findFirst({
        where: { id: purchaseId, businessId },
        include: { items: true, supplier: true }
      });

      if (!purchase) throw new Error('Orden de compra no encontrada.');
      const warehouseId = input.warehouseId || purchase.warehouseId;
      if (!warehouseId) throw new Error('Bodega física no especificada para la devolución.');

      const wh = await tx.warehouse.findFirst({
        where: { id: warehouseId, businessId, active: true }
      });
      if (!wh) throw new Error('Bodega receptora no existe o está inactiva.');

      let totalReturnValueDec = toDecimal(0);

      for (const ret of items) {
        const retQtyDec = roundQty(ret.quantity);
        if (retQtyDec.lte(0)) continue;

        const originalItem = purchase.items.find((it: any) => it.productId === ret.productId);
        const unitCostDec = roundCost(ret.unitCost !== undefined ? ret.unitCost : (originalItem?.landedUnitCost || originalItem?.unitCost || 0));
        const totalLineCostDec = roundMoney(mulDecimal(retQtyDec, unitCostDec));

        totalReturnValueDec = addDecimal(totalReturnValueDec, totalLineCostDec);

        // Disminución física auditable en Kardex
        await InventoryEngine.recordMovement({
          businessId,
          branchId: wh.branchId || undefined,
          warehouseId: wh.id,
          productId: ret.productId,
          variantId: ret.variantId || null,
          quantity: retQtyDec.times(-1),
          type: 'DEVOLUCION_PROVEEDOR',
          unitCost: unitCostDec.toNumber(),
          totalCost: totalLineCostDec.toNumber(),
          reason: ret.reason || `Devolución a proveedor ${purchase.supplier.name} por Compra #${purchase.orderNumber || purchase.id.slice(0, 8)}`,
          reference: purchase.orderNumber || purchase.id,
          sourceDocType: 'COMPRA',
          sourceDocId: purchase.id,
          createdBy: returnedByName || 'DEVOLUCIONES'
        }, tx);
      }

      // Si existe cuenta por pagar asociada, reducir balance compensatoriamente
      const payable = await tx.accountPayable.findFirst({
        where: { purchaseId: purchase.id }
      });

      if (payable && totalReturnValueDec.gt(0)) {
        const newBal = roundMoney(subDecimal(toDecimal(payable.balance), totalReturnValueDec));
        const finalBal = newBal.lt(0) ? toDecimal(0) : newBal;
        const newStatus = isZeroDecimal(finalBal) ? 'PAID' : (toDecimal(payable.paidAmount).gt(0) ? 'PARTIALLY_PAID' : 'PENDING');

        await tx.accountPayable.update({
          where: { id: payable.id },
          data: {
            balance: finalBal.toNumber(),
            status: newStatus,
            notes: payable.notes ? `${payable.notes} | Saldo reducido por devolución: -$${totalReturnValueDec.toString()}` : `Saldo reducido por devolución: -$${totalReturnValueDec.toString()}`
          }
        });
      }

      return {
        success: true,
        returnedValue: totalReturnValueDec.toNumber(),
        purchaseId: purchase.id
      };
    });
  }
}
