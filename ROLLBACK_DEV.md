# PROTOCOLO DE ROLLBACK INMEDIATO — dev.db (FASE B)

> **Propósito**: Restaurar el estado operativo exacto de `dev.db`, el esquema Prisma y el cliente generado en caso de cualquier fallo durante la migración.

---

## 1. CRITERIOS DE DISPARO DEL ROLLBACK

El rollback debe ejecutarse de forma **inmediata e incondicional** si ocurre cualquiera de los siguientes eventos:
1. Fallo en la suite de pruebas decimales o pérdida de precisión fraccionaria.
2. Discrepancia no justificada en los conteos de stock o costos históricos.
3. Fallo en las pruebas Core (`test_phase2_core_services.ts` < 26/26).
4. Errores no resueltos de ejecución en endpoints API tras generar el cliente Prisma.
5. Corrupción o bloqueo irrecuperable de base de datos.

---

## 2. PROCEDIMIENTO DE ROLLBACK PASO A PASO

### Paso 1: Detener procesos concurrentes
Asegurar que ninguna instancia de Node.js / Next.js o script de migración esté accediendo a la base de datos:
```powershell
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force
```

### Paso 2: Restaurar archivo de base de datos `dev.db`
Reemplazar el archivo activo con el backup binario generado en el Paso 2 del Checklist:
```powershell
# Identificar el último backup válido
$LATEST_BACKUP = Get-ChildItem prisma/dev.db.backup_* | Sort-Object LastWriteTime -Descending | Select-Object -First 1

if ($LATEST_BACKUP) {
    Copy-Item $LATEST_BACKUP.FullName prisma/dev.db -Force
    Write-Host "dev.db restaurada exitosamente desde $($LATEST_BACKUP.Name)"
} else {
    Write-Error "No se encontró archivo de backup en prisma/"
}
```

### Paso 3: Validar Hash de Integridad
Verificar que el hash SHA-256 de `dev.db` coincide exactamente con el hash del backup:
```powershell
Get-FileHash prisma/dev.db -Algorithm SHA256
Get-FileHash $LATEST_BACKUP.FullName -Algorithm SHA256
```

### Paso 4: Restaurar `prisma/schema.prisma` previo
Revertir cualquier cambio en `prisma/schema.prisma` utilizando Git:
```powershell
git checkout HEAD -- prisma/schema.prisma
```

### Paso 5: Regenerar Cliente Prisma previo
Volver a compilar el cliente Prisma con el esquema original:
```powershell
npx prisma generate
```

### Paso 6: Verificación de Estado Operativo
Ejecutar la suite de regresión para confirmar que el sistema volvió a su estado estable:
```powershell
npx ts-node scripts/scan_inventory_bypasses.ts
npx ts-node scripts/test_phase2_core_services.ts
npx ts-node scripts/test_phase2f_reconciliation.ts
```
*(Todos los tests deben reportar 100% PASS).*

---

## 3. DECLARACIÓN DE RESTAURACIÓN

Una vez superado el Paso 6, documentar el incidente, registrar los hashes SHA-256 verificados y notificar al equipo técnico antes de cualquier nuevo intento.
