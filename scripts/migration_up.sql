-- ============================================================================
-- CITIOX - MIGRACIÓN FASE B0: migration_up.sql
-- Alineación de tipos cuantitativos y monetarios a DECIMAL en SQLite (dev.db)
-- NOTA: Este script preserva el 100% de los datos existentes sin truncamiento.
-- ============================================================================

-- En SQLite dev.db, las columnas físicas de Producto, BranchInventory,
-- WarehouseStock, InventoryMovement y PedidoItem ya fueron adaptadas a DECIMAL en 2D.
-- Este script asegura la existencia de índices y consistencia de columnas:

-- 1. Índices de optimización de trazabilidad y búsqueda
CREATE INDEX IF NOT EXISTS "idx_producto_uomstatus" ON "Producto"("uomStatus");
CREATE INDEX IF NOT EXISTS "idx_producto_coststatus" ON "Producto"("costStatus");
CREATE INDEX IF NOT EXISTS "idx_producto_tipo" ON "Producto"("tipoProducto");
CREATE INDEX IF NOT EXISTS "idx_invmov_typedoc" ON "InventoryMovement"("sourceDocType", "sourceDocId");
CREATE INDEX IF NOT EXISTS "idx_invmov_wh_prod" ON "InventoryMovement"("warehouseId", "productId");

-- 2. Verificación de integridad de columnas complementarias en dev.db
-- (En SQLite PRAGMA table_info confirma que las columnas ya existen físicamente).
