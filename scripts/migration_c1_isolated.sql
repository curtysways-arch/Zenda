-- =====================================================================
-- CITIOX FASE C1: DDL AISLADO PARA test_c1.db
-- Ampliación Multi-Sucursal, Cocina Central, Bodegas de Tránsito y Transferencias
-- =====================================================================

-- 1. Ampliación de Branch
ALTER TABLE "Branch" ADD COLUMN "isCentralKitchen" BOOLEAN DEFAULT 0;
ALTER TABLE "Branch" ADD COLUMN "branchType" TEXT DEFAULT 'STORE';

-- 2. Ampliación de Warehouse
ALTER TABLE "Warehouse" ADD COLUMN "type" TEXT DEFAULT 'GENERAL';

-- 3. Ampliación de BranchInventory
ALTER TABLE "BranchInventory" ADD COLUMN "costoPromedio" DECIMAL(18, 6) DEFAULT NULL;
ALTER TABLE "BranchInventory" ADD COLUMN "lastKnownCost" DECIMAL(18, 6) DEFAULT NULL;

-- 4. Ampliación de ProductionOrder (Preservando 100% de las 14 órdenes históricas)
ALTER TABLE "ProductionOrder" ADD COLUMN "branchId" TEXT DEFAULT NULL;
ALTER TABLE "ProductionOrder" ADD COLUMN "costStatus" TEXT DEFAULT 'KNOWN';
ALTER TABLE "ProductionOrder" ADD COLUMN "reversalOfId" TEXT DEFAULT NULL;
ALTER TABLE "ProductionOrder" ADD COLUMN "reversalReason" TEXT DEFAULT NULL;

-- 5. Ampliación de InventoryTransfer
ALTER TABLE "InventoryTransfer" ADD COLUMN "sourceBranchId" TEXT DEFAULT NULL;
ALTER TABLE "InventoryTransfer" ADD COLUMN "sourceWarehouseId" TEXT DEFAULT NULL;
ALTER TABLE "InventoryTransfer" ADD COLUMN "targetBranchId" TEXT DEFAULT NULL;
ALTER TABLE "InventoryTransfer" ADD COLUMN "targetWarehouseId" TEXT DEFAULT NULL;
UPDATE "InventoryTransfer" SET "sourceWarehouseId" = "sourceId", "targetWarehouseId" = "targetId";
ALTER TABLE "InventoryTransfer" ADD COLUMN "dispatchedAt" DATETIME DEFAULT NULL;
ALTER TABLE "InventoryTransfer" ADD COLUMN "dispatchedById" TEXT DEFAULT NULL;
ALTER TABLE "InventoryTransfer" ADD COLUMN "dispatchedByName" TEXT DEFAULT NULL;
ALTER TABLE "InventoryTransfer" ADD COLUMN "receivedAt" DATETIME DEFAULT NULL;
ALTER TABLE "InventoryTransfer" ADD COLUMN "receivedById" TEXT DEFAULT NULL;
ALTER TABLE "InventoryTransfer" ADD COLUMN "receivedByName" TEXT DEFAULT NULL;
ALTER TABLE "InventoryTransfer" ADD COLUMN "idempotencyKey" TEXT DEFAULT NULL;

-- 6. Reestructuración de InventoryTransferItem (0 registros históricos)
DROP TABLE IF EXISTS "InventoryTransferItem";
CREATE TABLE "InventoryTransferItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "transferId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT DEFAULT NULL,
    "dispatchedQty" DECIMAL(18, 4) NOT NULL DEFAULT 0.0,
    "receivedQty" DECIMAL(18, 4) NOT NULL DEFAULT 0.0,
    "lossQty" DECIMAL(18, 4) NOT NULL DEFAULT 0.0,
    "lossReason" TEXT DEFAULT NULL,
    "unitCost" DECIMAL(18, 6) NOT NULL DEFAULT 0.0,
    "totalCost" DECIMAL(18, 2) NOT NULL DEFAULT 0.0,
    FOREIGN KEY ("transferId") REFERENCES "InventoryTransfer" ("id") ON DELETE CASCADE,
    FOREIGN KEY ("productId") REFERENCES "Producto" ("id") ON DELETE RESTRICT
);

-- 7. Índices de optimización y aislamiento
CREATE INDEX IF NOT EXISTS "idx_prod_order_branch" ON "ProductionOrder" ("branchId");
CREATE INDEX IF NOT EXISTS "idx_prod_order_status" ON "ProductionOrder" ("status");
CREATE INDEX IF NOT EXISTS "idx_wh_type_branch" ON "Warehouse" ("type", "branchId");
CREATE INDEX IF NOT EXISTS "idx_transfer_branches" ON "InventoryTransfer" ("sourceBranchId", "targetBranchId");
CREATE INDEX IF NOT EXISTS "idx_transfer_status" ON "InventoryTransfer" ("status");
CREATE INDEX IF NOT EXISTS "idx_transfer_item_tx" ON "InventoryTransferItem" ("transferId");
CREATE INDEX IF NOT EXISTS "idx_transfer_idempotency" ON "InventoryTransfer" ("idempotencyKey");
