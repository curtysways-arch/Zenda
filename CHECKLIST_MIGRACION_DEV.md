# CHECKLIST DE MIGRACIÓN CONTROLADA — dev.db (FASE B)

> **Estado actual**: PRE-FLIGHT COMPLETADO (FASE B0)  
> **Veredicto**: `🟡 READY_AFTER_CODE_FIXES`  
> **Objetivo**: Guía estricta paso a paso para aplicar la alineación de Prisma y esquema Decimal en `dev.db` una vez adaptados los tipos en TypeScript.

---

## 1. PRE-REQUISITOS OBLIGATORIOS (BLOQUEANTES)

- [ ] **Corrección de tipos en código**: Todos los puntos de impacto crítico (197) y alto (132) identificados en `scratch/preflight_findings.json` han sido adaptados para manejar `Prisma.Decimal` (uso de helpers de serialización y operaciones aritméticas con `Decimal`).
- [ ] **Regresión de pruebas Core**: 26/26 pruebas de Core y 10/10 pruebas de integridad en verde antes de iniciar.
- [ ] **Escáner de Bypasses**: 0 bypasses de inventario detectados.
- [ ] **Servidor de desarrollo detenido**: Next.js (`npm run dev`) y cualquier proceso que bloquee `dev.db` (SQLite locks) deben estar terminados.

---

## 2. FASE DE RESPALDO (BACKUP BINARIO)

- [ ] **Ejecutar backup binario estricto**:
  ```powershell
  $TIMESTAMP = Get-Date -Format "yyyyMMdd_HHmmss"
  Copy-Item prisma/dev.db "prisma/dev.db.backup_$TIMESTAMP"
  ```
- [ ] **Calcular y registrar SHA-256 del backup y de la base activa**:
  ```powershell
  Get-FileHash prisma/dev.db -Algorithm SHA256
  Get-FileHash "prisma/dev.db.backup_$TIMESTAMP" -Algorithm SHA256
  ```
  *(Ambos hashes deben ser idénticos).*

---

## 3. APLICACIÓN DE MIGRACIÓN DDL Y ESQUEMA

- [ ] **Verificar estructura física previa**:
  Confirmar que las columnas cuantitativas ya poseen afinidad `DECIMAL(18,4)`, `DECIMAL(18,6)` o `DECIMAL(18,2)` según `scripts/migration_up.sql`.
- [ ] **Sustituir o alinear `prisma/schema.prisma`**:
  Promover los cambios tipados de `prisma/schema.aligned.prisma` a `prisma/schema.prisma`.
- [ ] **Regenerar el cliente oficial de Prisma**:
  ```powershell
  npx prisma generate
  ```
- [ ] **Compilación de TypeScript**:
  ```powershell
  npx tsc --noEmit
  ```
  *(Debe terminar con 0 errores de tipo).*

---

## 4. BATERÍA DE VERIFICACIÓN POST-MIGRACIÓN

- [ ] **Pruebas de precisión decimal**:
  Ejecutar el test de lectura y escritura decimal (validando `0.4500`, `2.3500`, etc.):
  ```powershell
  npx ts-node scripts/test_phase_a_decimal_alignment.ts
  ```
- [ ] **Pruebas Core de inventario y conciliación**:
  ```powershell
  npx ts-node scripts/test_phase2_core_services.ts
  npx ts-node scripts/test_phase2f_reconciliation.ts
  ```
- [ ] **Verificación de consistencia de datos**:
  Verificar que el número de productos (23), stock físico y movimientos en Kardex no hayan variado.
  Verificar que `costoPromedio` no tenga valores inventados y los productos sin costeo continúen en `PENDING_VALUATION`.

---

## 5. CRITERIO DE ACEPTACIÓN / DECISIÓN

- Si todos los pasos del punto 4 son **100% PASS**: La migración se declara **EXITOSA**.
- Si se detecta cualquier discrepancia, error de compilación no resuelto o fallo de precisión: **EJECUTAR INMEDIATAMENTE `ROLLBACK_DEV.md`**.
