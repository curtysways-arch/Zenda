-- AlterTable
ALTER TABLE "Producto" ADD COLUMN "sku" TEXT;
ALTER TABLE "Producto" ADD COLUMN "tieneVariantes" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "PedidoItem" ADD COLUMN "varianteId" TEXT;
ALTER TABLE "PedidoItem" ADD COLUMN "varianteNombre" TEXT;
ALTER TABLE "PedidoItem" ADD COLUMN "sku" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "ProductoVariante" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productoId" TEXT NOT NULL,
    "sku" TEXT,
    "nombre" TEXT NOT NULL,
    "atributos" TEXT,
    "precio" REAL,
    "precioAnterior" REAL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "imagenUrl" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProductoVariante_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ProductoVariante_productoId_idx" ON "ProductoVariante"("productoId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ProductoVariante_sku_idx" ON "ProductoVariante"("sku");
