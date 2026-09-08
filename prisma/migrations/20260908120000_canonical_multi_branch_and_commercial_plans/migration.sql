-- AlterTable Bloqueo
ALTER TABLE "Bloqueo" ADD COLUMN "branchId" TEXT;

-- AlterTable Reserva (Appointment)
ALTER TABLE "Reserva" ADD COLUMN "branchId" TEXT;
CREATE INDEX IF NOT EXISTS "Reserva_branchId_idx" ON "Reserva"("branchId");
CREATE INDEX IF NOT EXISTS "Reserva_negocioId_branchId_idx" ON "Reserva"("negocioId", "branchId");

-- AlterTable StaffSchedule
ALTER TABLE "StaffSchedule" ADD COLUMN "branchId" TEXT;
CREATE INDEX IF NOT EXISTS "StaffSchedule_branchId_idx" ON "StaffSchedule"("branchId");

-- AlterTable Promotion
ALTER TABLE "Promotion" ADD COLUMN "branchScope" TEXT NOT NULL DEFAULT 'ALL';
ALTER TABLE "Promotion" ADD COLUMN "branchIds" TEXT;

-- AlterTable Coupon
ALTER TABLE "Coupon" ADD COLUMN "branchScope" TEXT NOT NULL DEFAULT 'ALL';
ALTER TABLE "Coupon" ADD COLUMN "branchIds" TEXT;

-- AlterTable Pedido
ALTER TABLE "Pedido" ADD COLUMN "branchId" TEXT;
CREATE INDEX IF NOT EXISTS "Pedido_branchId_idx" ON "Pedido"("branchId");
CREATE INDEX IF NOT EXISTS "Pedido_negocioId_branchId_idx" ON "Pedido"("negocioId", "branchId");

-- AlterTable RestaurantTable
ALTER TABLE "RestaurantTable" ADD COLUMN "branchId" TEXT;
CREATE INDEX IF NOT EXISTS "RestaurantTable_branchId_idx" ON "RestaurantTable"("branchId");
CREATE INDEX IF NOT EXISTS "RestaurantTable_negocioId_branchId_idx" ON "RestaurantTable"("negocioId", "branchId");

-- CreateTable Branch
CREATE TABLE IF NOT EXISTS "Branch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "code" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "latitude" REAL,
    "longitude" REAL,
    "timezone" TEXT NOT NULL DEFAULT 'America/Guayaquil',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "isMain" BOOLEAN NOT NULL DEFAULT false,
    "settings" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Branch_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Negocio" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "Branch_businessId_slug_key" ON "Branch"("businessId", "slug");
CREATE INDEX IF NOT EXISTS "Branch_businessId_idx" ON "Branch"("businessId");
CREATE INDEX IF NOT EXISTS "Branch_businessId_active_idx" ON "Branch"("businessId", "active");

-- CreateTable BranchAccess
CREATE TABLE IF NOT EXISTS "BranchAccess" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "roleId" TEXT,
    "role" TEXT NOT NULL DEFAULT 'STAFF',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BranchAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Usuario" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BranchAccess_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BranchAccess_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Negocio" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BranchAccess_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "BranchAccess_userId_branchId_key" ON "BranchAccess"("userId", "branchId");
CREATE INDEX IF NOT EXISTS "BranchAccess_userId_idx" ON "BranchAccess"("userId");
CREATE INDEX IF NOT EXISTS "BranchAccess_branchId_idx" ON "BranchAccess"("branchId");
CREATE INDEX IF NOT EXISTS "BranchAccess_businessId_idx" ON "BranchAccess"("businessId");

-- CreateTable StaffBranch
CREATE TABLE IF NOT EXISTS "StaffBranch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "staffId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StaffBranch_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StaffBranch_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StaffBranch_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Negocio" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "StaffBranch_staffId_branchId_key" ON "StaffBranch"("staffId", "branchId");
CREATE INDEX IF NOT EXISTS "StaffBranch_staffId_idx" ON "StaffBranch"("staffId");
CREATE INDEX IF NOT EXISTS "StaffBranch_branchId_idx" ON "StaffBranch"("branchId");
CREATE INDEX IF NOT EXISTS "StaffBranch_businessId_idx" ON "StaffBranch"("businessId");

-- CreateTable BranchProduct
CREATE TABLE IF NOT EXISTS "BranchProduct" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "branchId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "price" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BranchProduct_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BranchProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Producto" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BranchProduct_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Negocio" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "BranchProduct_branchId_productId_key" ON "BranchProduct"("branchId", "productId");
CREATE INDEX IF NOT EXISTS "BranchProduct_branchId_idx" ON "BranchProduct"("branchId");
CREATE INDEX IF NOT EXISTS "BranchProduct_productId_idx" ON "BranchProduct"("productId");
CREATE INDEX IF NOT EXISTS "BranchProduct_businessId_idx" ON "BranchProduct"("businessId");

-- CreateTable BranchService
CREATE TABLE IF NOT EXISTS "BranchService" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "branchId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "price" REAL,
    "duracion" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BranchService_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BranchService_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Cancha" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BranchService_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Negocio" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "BranchService_branchId_serviceId_key" ON "BranchService"("branchId", "serviceId");
CREATE INDEX IF NOT EXISTS "BranchService_branchId_idx" ON "BranchService"("branchId");
CREATE INDEX IF NOT EXISTS "BranchService_serviceId_idx" ON "BranchService"("serviceId");
CREATE INDEX IF NOT EXISTS "BranchService_businessId_idx" ON "BranchService"("businessId");

-- CreateTable BranchInventory
CREATE TABLE IF NOT EXISTS "BranchInventory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "branchId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "varianteId" TEXT,
    "businessId" TEXT NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "minStock" INTEGER NOT NULL DEFAULT 0,
    "maxStock" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BranchInventory_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BranchInventory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Producto" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BranchInventory_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Negocio" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "BranchInventory_branchId_productId_varianteId_key" ON "BranchInventory"("branchId", "productId", "varianteId");
CREATE INDEX IF NOT EXISTS "BranchInventory_branchId_idx" ON "BranchInventory"("branchId");
CREATE INDEX IF NOT EXISTS "BranchInventory_productId_idx" ON "BranchInventory"("productId");
CREATE INDEX IF NOT EXISTS "BranchInventory_businessId_idx" ON "BranchInventory"("businessId");

-- CreateTable InventoryMovement
CREATE TABLE IF NOT EXISTS "InventoryMovement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "businessId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "varianteId" TEXT,
    "quantity" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "reference" TEXT,
    "createdBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InventoryMovement_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "InventoryMovement_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Negocio" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "InventoryMovement_businessId_idx" ON "InventoryMovement"("businessId");
CREATE INDEX IF NOT EXISTS "InventoryMovement_branchId_idx" ON "InventoryMovement"("branchId");
CREATE INDEX IF NOT EXISTS "InventoryMovement_productId_idx" ON "InventoryMovement"("productId");
CREATE INDEX IF NOT EXISTS "InventoryMovement_createdAt_idx" ON "InventoryMovement"("createdAt");

-- CreateTable CashRegister
CREATE TABLE IF NOT EXISTS "CashRegister" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "businessId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CashRegister_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CashRegister_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Negocio" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "CashRegister_businessId_idx" ON "CashRegister"("businessId");
CREATE INDEX IF NOT EXISTS "CashRegister_branchId_idx" ON "CashRegister"("branchId");

-- CreateTable CashRegisterSession
CREATE TABLE IF NOT EXISTS "CashRegisterSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "businessId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "cashRegisterId" TEXT NOT NULL,
    "openedBy" TEXT NOT NULL,
    "openedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "openingAmount" REAL NOT NULL DEFAULT 0,
    "closedBy" TEXT,
    "closedAt" DATETIME,
    "closingAmount" REAL,
    "expectedAmount" REAL,
    "difference" REAL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CashRegisterSession_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CashRegisterSession_cashRegisterId_fkey" FOREIGN KEY ("cashRegisterId") REFERENCES "CashRegister" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CashRegisterSession_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Negocio" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "CashRegisterSession_businessId_idx" ON "CashRegisterSession"("businessId");
CREATE INDEX IF NOT EXISTS "CashRegisterSession_branchId_idx" ON "CashRegisterSession"("branchId");
CREATE INDEX IF NOT EXISTS "CashRegisterSession_cashRegisterId_idx" ON "CashRegisterSession"("cashRegisterId");
CREATE INDEX IF NOT EXISTS "CashRegisterSession_status_idx" ON "CashRegisterSession"("status");
