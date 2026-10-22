-- ============================================================================
-- CITIOX - MIGRACIÓN FASE B0: migration_down.sql
-- Script de Reversión (Rollback DDL) para SQLite (dev.db)
-- ============================================================================

-- Eliminación de índices auxiliares creados durante la alineación
DROP INDEX IF EXISTS "idx_producto_uomstatus";
DROP INDEX IF EXISTS "idx_producto_coststatus";
DROP INDEX IF EXISTS "idx_producto_tipo";
DROP INDEX IF EXISTS "idx_invmov_typedoc";
DROP INDEX IF EXISTS "idx_invmov_wh_prod";

-- NOTA DE CONTINGENCIA:
-- Dado que la estructura física de dev.db ya opera con afinidad NUMERIC,
-- la reversión a nivel de aplicación consiste en restituir prisma/schema.prisma original
-- y re-ejecutar 'npx prisma generate' para volver a tipar los modelos como Int/Float.
