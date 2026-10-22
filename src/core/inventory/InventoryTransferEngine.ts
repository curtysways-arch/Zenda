import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { InventoryEngine } from './InventoryEngine';
import { CostingEngine } from '../costing/CostingEngine';
import {
  toDecimal,
  addDecimal,
  subDecimal,
  mulDecimal,
  divDecimal,
  decimalGt,
  decimalLt,
  decimalLte,
  roundQty,
  roundCost,
  roundMoney,
  DecimalInput
} from '../../lib/math/money';

export interface CreateTransferItemInput {
  productId: string;
  variantId?: string | null;
  quantity: DecimalInput;
}

export interface CreateTransferInput {
  businessId: string;
  sourceBranchId: string;
  sourceWarehouseId: string;
  targetBranchId: string;
  targetWarehouseId: string;
  items: CreateTransferItemInput[];
  notes?: string;
  createdById?: string;
  createdByName?: string;
  idempotencyKey?: string;
}

export interface DispatchTransferInput {
  transferId: string;
  businessId: string;
  dispatchedById?: string;
  dispatchedByName?: string;
  idempotencyKey?: string;
}

export interface ReceiveTransferItemInput {
  productId: string;
  variantId?: string | null;
  receivedQty: DecimalInput;
  lossQty?: DecimalInput;
  lossReason?: string;
}

export interface ReceiveTransferInput {
  transferId: string;
  businessId: string;
  receivedItems: ReceiveTransferItemInput[];
  receivedById?: string;
  receivedByName?: string;
  idempotencyKey?: string;
}

export class InventoryTransferEngine {
  /**
   * Resuelve de forma determinística la bodega virtual de tránsito del negocio.
   * Si no existe una bodega de tipo TRANSIT, crea una oficial para el sistema.
   */
  public static async resolveTransitWarehouse(businessId: string, branchId?: string, client?: any) {
    const db = client || prisma;

    // 1. Buscar bodega TRANSIT activa existente en el negocio
    let transitWh = await (db as any).warehouse.findFirst({
      where: {
        businessId,
        type: 'TRANSIT',
        active: true
      }
    });

    if (!transitWh) {
      // Crear bodega TRANSIT formal para custodia
      transitWh = await (db as any).warehouse.create({
        data: {
          businessId,
          branchId: branchId || null,
          name: 'Bodega de Tránsito Corporativa',
          type: 'TRANSIT',
          active: true,
          isDefault: false
        }
      });
    }

    return transitWh;
  }

  /**
   * Crea una nueva transferencia en estado DRAFT con validación rigurosa de pertenencia de sucursales y bodegas.
   */
  public static async createTransfer(input: CreateTransferInput, client?: any) {
    const db = client || (input as any)?.prismaClient || prisma;
    const {
      businessId,
      sourceBranchId,
      sourceWarehouseId,
      targetBranchId,
      targetWarehouseId,
      items,
      notes,
      createdById,
      createdByName,
      idempotencyKey
    } = input;

    if (!businessId) throw new Error('El identificador de negocio es obligatorio.');
    if (!sourceBranchId || !targetBranchId) throw new Error('Las sucursales de origen y destino son obligatorias.');
    if (!sourceWarehouseId || !targetWarehouseId) throw new Error('Las bodegas de origen y destino son obligatorias.');
    if (sourceWarehouseId === targetWarehouseId) {
      throw new Error('La bodega de origen y destino no pueden ser la misma.');
    }
    if (!items || items.length === 0) {
      throw new Error('La transferencia debe contener al menos un producto.');
    }

    // Idempotencia: Si ya existe una transferencia con la misma clave para este negocio, retornarla
    if (idempotencyKey) {
      const existing = await (db as any).inventoryTransfer.findFirst({
        where: { businessId, idempotencyKey },
        include: { items: true, source: true, target: true }
      });
      if (existing) return existing;
    }

    // Validar sucursales dentro del negocio
    const [sourceBranch, targetBranch] = await Promise.all([
      (db as any).branch.findFirst({ where: { id: sourceBranchId, businessId, active: true } }),
      (db as any).branch.findFirst({ where: { id: targetBranchId, businessId, active: true } })
    ]);
    if (!sourceBranch) throw new Error('La sucursal de origen no existe o no pertenece al negocio.');
    if (!targetBranch) throw new Error('La sucursal de destino no existe o no pertenece al negocio.');

    // Validar bodegas operativas
    const [sourceWh, targetWh] = await Promise.all([
      (db as any).warehouse.findFirst({ where: { id: sourceWarehouseId, businessId, branchId: sourceBranchId, active: true } }),
      (db as any).warehouse.findFirst({ where: { id: targetWarehouseId, businessId, branchId: targetBranchId, active: true } })
    ]);
    if (!sourceWh) throw new Error('La bodega de origen no existe, está inactiva o no pertenece a la sucursal de origen.');
    if (!targetWh) throw new Error('La bodega de destino no existe, está inactiva o no pertenece a la sucursal de destino.');

    if (sourceWh.type === 'TRANSIT' || sourceWh.type === 'SCRAP_WASTE') {
      throw new Error(`La bodega de origen no puede ser de tipo "${sourceWh.type}".`);
    }
    if (targetWh.type === 'TRANSIT' || targetWh.type === 'SCRAP_WASTE') {
      throw new Error(`La bodega de destino no puede ser de tipo "${targetWh.type}".`);
    }

    // Validar líneas y cantidades
    const parsedItems = items.map((it) => {
      const q = roundQty(it.quantity);
      if (q.lte(0)) {
        throw new Error('La cantidad a transferir debe ser mayor a 0.');
      }
      return {
        productId: it.productId,
        variantId: it.variantId || null,
        dispatchedQty: q.toNumber(),
        receivedQty: 0,
        lossQty: 0,
        unitCost: 0,
        totalCost: 0
      };
    });

    const transfer = await (db as any).inventoryTransfer.create({
      data: {
        businessId,
        sourceId: sourceWarehouseId,
        targetId: targetWarehouseId,
        sourceBranchId,
        sourceWarehouseId,
        targetBranchId,
        targetWarehouseId,
        status: 'DRAFT',
        notes: notes || null,
        idempotencyKey: idempotencyKey || null,
        createdById: createdById || null,
        createdByName: createdByName || null,
        items: {
          create: parsedItems
        }
      },
      include: {
        items: true,
        source: true,
        target: true
      }
    });

    return transfer;
  }

  /**
   * Cancela una transferencia en estado DRAFT sin generar movimientos de inventario.
   */
  public static async cancelDraftTransfer(transferId: string, businessId: string, client?: any) {
    const db = client || prisma;
    const transfer = await (db as any).inventoryTransfer.findFirst({
      where: { id: transferId, businessId }
    });

    if (!transfer) throw new Error('Transferencia no encontrada.');
    if (transfer.status !== 'DRAFT') {
      throw new Error(`No se puede cancelar una transferencia que está en estado "${transfer.status}". Solo transferencias en DRAFT pueden ser canceladas.`);
    }

    return await (db as any).inventoryTransfer.update({
      where: { id: transfer.id },
      data: { status: 'CANCELLED', updatedAt: new Date() }
    });
  }

  /**
   * Despacha una transferencia:
   * 1. Descuenta existencias de sourceWarehouseId.
   * 2. Ingresa existencias a la bodega virtual de tránsito (TRANSIT).
   * 3. Congela el costo unitario histórico certificado en cada línea.
   * 4. Cambia estado a IN_TRANSIT.
   */
  public static async dispatchTransfer(input: DispatchTransferInput, client?: any) {
    const db = client || (input as any)?.prismaClient || prisma;
    const { transferId, businessId, dispatchedById, dispatchedByName, idempotencyKey } = input;

    if (!transferId || !businessId) throw new Error('Parámetros de despacho insuficientes.');

    return await (db as any).$transaction(async (tx: any) => {
      const transfer = await tx.inventoryTransfer.findFirst({
        where: { id: transferId, businessId },
        include: { items: true, source: true, target: true }
      });

      if (!transfer) throw new Error('Transferencia no encontrada.');

      if (transfer.status === 'IN_TRANSIT' || transfer.status === 'DISPATCHED') {
        if (idempotencyKey && transfer.idempotencyKey === idempotencyKey) {
          return transfer; // Idempotencia confirmada
        }
        throw new Error('Esta transferencia ya ha sido despachada previamente. Prevención de doble despacho activa.');
      }
      if (transfer.status === 'RECEIVED' || transfer.status === 'COMPLETED') {
        throw new Error('Esta transferencia ya ha sido completada.');
      }
      if (transfer.status !== 'DRAFT') {
        throw new Error(`La transferencia no puede ser despachada porque está en estado "${transfer.status}".`);
      }

      // Reclamo condicional atómico
      const claim = await tx.inventoryTransfer.updateMany({
        where: { id: transfer.id, businessId, status: 'DRAFT' },
        data: { status: 'IN_TRANSIT', updatedAt: new Date() }
      });
      if (claim.count !== 1) {
        throw new Error('La transferencia ya fue despachada por otra solicitud simultánea.');
      }

      // Resolver bodega de tránsito
      const transitWh = await this.resolveTransitWarehouse(businessId, transfer.sourceBranchId || undefined, tx);

      // Despachar cada producto
      for (const item of transfer.items) {
        const qtyToDispatch = roundQty(item.dispatchedQty);
        if (qtyToDispatch.lte(0)) continue;

        // Validar existencia física EXCLUSIVAMENTE en WarehouseStock de sourceWarehouseId
        const ws = await tx.warehouseStock.findFirst({
          where: {
            warehouseId: transfer.sourceWarehouseId,
            productId: item.productId,
            variantId: item.variantId || null
          }
        });
        const available = ws ? roundQty(toDecimal(ws.quantity)) : toDecimal(0);

        if (decimalLt(available, qtyToDispatch)) {
          const prod = await tx.producto.findUnique({ where: { id: item.productId }, select: { nombre: true } });
          throw new Error(
            `Stock insuficiente en bodega origen para despachar: "${prod?.nombre || item.productId}" (disponible: ${available.toString()}, solicitado: ${qtyToDispatch.toString()}).`
          );
        }

        // Resolver costo unitario certificado desde BranchInventory de la sucursal de origen
        const bi = await tx.branchInventory.findFirst({
          where: {
            branchId: transfer.sourceBranchId,
            productId: item.productId,
            varianteId: item.variantId || null
          }
        });
        const unitCostDec: Prisma.Decimal | null = bi?.costoPromedio !== null && bi?.costoPromedio !== undefined
          ? roundCost(toDecimal(bi.costoPromedio))
          : null;
        const totalCostDec: Prisma.Decimal | null = unitCostDec
          ? roundMoney(mulDecimal(qtyToDispatch, unitCostDec))
          : null;

        // 1. Salida física de la bodega de origen
        await InventoryEngine.recordMovement({
          businessId,
          branchId: transfer.sourceBranchId || undefined,
          warehouseId: transfer.sourceWarehouseId || undefined,
          productId: item.productId,
          variantId: item.variantId || null,
          quantity: qtyToDispatch.times(-1),
          type: 'TRANSFERENCIA_SALIDA',
          unitCost: unitCostDec ? unitCostDec.toNumber() : undefined,
          totalCost: totalCostDec ? totalCostDec.toNumber() : undefined,
          reason: `Despacho de transferencia #${transfer.id.slice(0, 8)}`,
          reference: transfer.id,
          sourceDocType: 'TRANSFERENCIA',
          sourceDocId: transfer.id,
          createdBy: dispatchedByName || 'DISPATCH'
        }, tx);

        // 2. Ingreso físico a custodia en bodega de tránsito
        await InventoryEngine.recordMovement({
          businessId,
          branchId: transfer.sourceBranchId || undefined,
          warehouseId: transitWh.id,
          productId: item.productId,
          variantId: item.variantId || null,
          quantity: qtyToDispatch,
          type: 'TRANSFERENCIA_ENTRADA',
          unitCost: unitCostDec ? unitCostDec.toNumber() : undefined,
          totalCost: totalCostDec ? totalCostDec.toNumber() : undefined,
          reason: `Custodia en tránsito para transferencia #${transfer.id.slice(0, 8)}`,
          reference: transfer.id,
          sourceDocType: 'TRANSFERENCIA',
          sourceDocId: transfer.id,
          createdBy: dispatchedByName || 'DISPATCH'
        }, tx);

        // Actualizar línea con costo histórico congelado
        await tx.inventoryTransferItem.update({
          where: { id: item.id },
          data: {
            unitCost: unitCostDec ? unitCostDec.toNumber() : 0,
            totalCost: totalCostDec ? totalCostDec.toNumber() : 0
          }
        });
      }

      // Actualizar metadata de transferencia
      const updated = await tx.inventoryTransfer.update({
        where: { id: transfer.id },
        data: {
          status: 'IN_TRANSIT',
          dispatchedAt: new Date(),
          dispatchedById: dispatchedById || null,
          dispatchedByName: dispatchedByName || null,
          updatedAt: new Date()
        },
        include: { items: true, source: true, target: true }
      });

      return updated;
    }, { maxWait: 15000, timeout: 35000 });
  }

  /**
   * Recibe una transferencia (total o parcialmente) y registra mermas con conservación de masa:
   * dispatchedQty = receivedQty + lossQty
   */
  public static async receiveTransfer(input: ReceiveTransferInput, client?: any) {
    const db = client || (input as any)?.prismaClient || prisma;
    const { transferId, businessId, receivedItems, receivedById, receivedByName, idempotencyKey } = input;

    if (!transferId || !businessId) throw new Error('Parámetros de recepción insuficientes.');
    if (!receivedItems || receivedItems.length === 0) {
      throw new Error('Debe especificar al menos un producto a recibir.');
    }

    return await (db as any).$transaction(async (tx: any) => {
      const transfer = await tx.inventoryTransfer.findFirst({
        where: { id: transferId, businessId },
        include: { items: true, source: true, target: true }
      });

      if (!transfer) throw new Error('Transferencia no encontrada.');

      if (transfer.status === 'RECEIVED' || transfer.status === 'COMPLETED') {
        throw new Error('Esta transferencia ya ha sido completada/recibida previamente. Prevención de doble recepción activa.');
      }
      if (transfer.status !== 'IN_TRANSIT' && transfer.status !== 'DISPATCHED') {
        throw new Error(`La transferencia no puede ser recibida porque está en estado "${transfer.status}".`);
      }

      // Resolver bodega de tránsito
      const transitWh = await this.resolveTransitWarehouse(businessId, transfer.sourceBranchId || undefined, tx);

      // Procesar cada ítem recibido
      for (const rcv of receivedItems) {
        const item = transfer.items.find((it: any) =>
          it.productId === rcv.productId &&
          (it.variantId === (rcv.variantId || null) || (!it.variantId && !rcv.variantId))
        );

        if (!item) {
          throw new Error(`El producto "${rcv.productId}" no pertenece a las líneas de esta transferencia.`);
        }

        const recvQty = roundQty(rcv.receivedQty);
        const lossQty = roundQty(rcv.lossQty || 0);

        if (recvQty.isNegative()) throw new Error('La cantidad recibida no puede ser negativa.');
        if (lossQty.isNegative()) throw new Error('La cantidad de pérdida no puede ser negativa.');

        const totalToProcess = addDecimal(recvQty, lossQty);
        if (totalToProcess.lte(0)) continue;

        const dispatched = roundQty(item.dispatchedQty);
        const alreadyReceived = roundQty(item.receivedQty);
        const alreadyLoss = roundQty(item.lossQty);
        const pending = subDecimal(dispatched, addDecimal(alreadyReceived, alreadyLoss));

        // Validación de conservación estricta
        if (decimalGt(totalToProcess, pending)) {
          throw new Error(
            `La suma de cantidad recibida (${recvQty.toString()}) y pérdida (${lossQty.toString()}) excede el saldo pendiente en tránsito (${pending.toString()}).`
          );
        }

        const lineUnitCost = toDecimal(item.unitCost);
        const unitCostNum = lineUnitCost.isZero() ? undefined : lineUnitCost.toNumber();

        // 1. Retirar cantidad total (recibida + pérdida) de la bodega de tránsito
        await InventoryEngine.recordMovement({
          businessId,
          branchId: transfer.sourceBranchId || undefined,
          warehouseId: transitWh.id,
          productId: item.productId,
          variantId: item.variantId || null,
          quantity: totalToProcess.times(-1),
          type: 'TRANSFERENCIA_SALIDA',
          unitCost: unitCostNum,
          reason: `Salida de tránsito por recepción de transferencia #${transfer.id.slice(0, 8)}`,
          reference: transfer.id,
          sourceDocType: 'TRANSFERENCIA',
          sourceDocId: transfer.id,
          createdBy: receivedByName || 'RECEIVE'
        }, tx);

        // 2. Ingresar cantidad efectiva recibida a la bodega destino en targetBranchId
        if (recvQty.gt(0)) {
          await InventoryEngine.recordMovement({
            businessId,
            branchId: transfer.targetBranchId || undefined,
            warehouseId: transfer.targetWarehouseId || undefined,
            productId: item.productId,
            variantId: item.variantId || null,
            quantity: recvQty,
            type: 'TRANSFERENCIA_ENTRADA',
            unitCost: unitCostNum,
            totalCost: unitCostNum ? roundMoney(mulDecimal(recvQty, lineUnitCost)).toNumber() : undefined,
            reason: `Ingreso por transferencia recibida #${transfer.id.slice(0, 8)}`,
            reference: transfer.id,
            sourceDocType: 'TRANSFERENCIA',
            sourceDocId: transfer.id,
            createdBy: receivedByName || 'RECEIVE'
          }, tx);
        }

        // 3. Registrar pérdida formal en Kardex si aplica (TRANSFER_LOSS)
        if (lossQty.gt(0)) {
          const lossTotal = lineUnitCost.isZero() ? null : roundMoney(mulDecimal(lossQty, lineUnitCost)).toNumber();
          await tx.inventoryMovement.create({
            data: {
              businessId,
              branchId: transfer.targetBranchId || undefined,
              warehouseId: transfer.targetWarehouseId || undefined,
              productId: item.productId,
              varianteId: item.variantId || null,
              quantity: lossQty.times(-1).toNumber(),
              type: 'TRANSFER_LOSS',
              unitCost: unitCostNum || null,
              totalCost: lossTotal,
              reason: rcv.lossReason || `Pérdida en tránsito de transferencia #${transfer.id.slice(0, 8)}`,
              reference: transfer.id,
              sourceDocType: 'TRANSFERENCIA',
              sourceDocId: transfer.id,
              createdBy: receivedByName || 'RECEIVE'
            }
          });
        }

        // 4. Actualizar acumulados de la línea
        await tx.inventoryTransferItem.update({
          where: { id: item.id },
          data: {
            receivedQty: addDecimal(alreadyReceived, recvQty).toNumber(),
            lossQty: addDecimal(alreadyLoss, lossQty).toNumber(),
            lossReason: rcv.lossReason || item.lossReason
          }
        });
      }

      // 5. Verificar si todas las líneas están 100% completadas (dispatched === received + loss)
      const freshItems = await tx.inventoryTransferItem.findMany({
        where: { transferId: transfer.id }
      });
      const allCompleted = freshItems.every((it: any) => {
        const disp = roundQty(it.dispatchedQty);
        const processed = addDecimal(roundQty(it.receivedQty), roundQty(it.lossQty));
        return decimalLte(disp, processed);
      });

      const newStatus = allCompleted ? 'RECEIVED' : 'IN_TRANSIT';

      const updated = await tx.inventoryTransfer.update({
        where: { id: transfer.id },
        data: {
          status: newStatus,
          receivedAt: allCompleted ? new Date() : transfer.receivedAt,
          receivedById: receivedById || transfer.receivedById,
          receivedByName: receivedByName || transfer.receivedByName,
          updatedAt: new Date()
        },
        include: { items: true, source: true, target: true }
      });

      return updated;
    }, { maxWait: 15000, timeout: 35000 });
  }
}
