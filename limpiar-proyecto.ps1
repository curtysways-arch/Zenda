<#
  limpiar-proyecto.ps1 — Limpieza segura del proyecto Citiox

  NO borra nada. Mueve los archivos sobrantes (scripts de prueba, respaldos de base
  de datos, copias viejas, zips de build) a la carpeta  _basura_revisar\<fecha>\
  conservando su ruta, para que los revises y luego borres esa carpeta a mano.

  Uso (desde la carpeta del proyecto, en PowerShell):
      .\limpiar-proyecto.ps1            -> SOLO muestra lo que movería (simulación)
      .\limpiar-proyecto.ps1 -Aplicar   -> mueve de verdad

  Si Windows bloquea el script:  powershell -ExecutionPolicy Bypass -File .\limpiar-proyecto.ps1
#>
param([switch]$Aplicar)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

$stamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$dest = Join-Path $root "_basura_revisar\$stamp"

# ── 1. Archivos sueltos en la raíz ───────────────────────────────────
$rootFiles = @(
  '{', 'Nuevo Documento de texto.txt', '.env.save',
  'build_files.js', 'check.js', 'check-role.js', 'clean_bom.js', 'clean_demo_bookings.js', 'clean-citiox.js',
  'clear_cache.ts', 'create_growth_tables.ts', 'create_spa_admin.ts', 'create_tables.ts', 'create-demo.ts',
  'db_slugs.json', 'delete_demo_reserva.js', 'dump.js', 'dump_schema.cjs', 'dump_schema.ts', 'find-all-orders.js',
  'fix_config.ts', 'fix_db.js', 'fix_user.ts', 'fix-encoding.ps1', 'fix-encoding.py', 'gen_steps_1_3.js',
  'legacy-usage-report.json', 'migrate.ts', 'migrate2.ts', 'migrate_bloqueo.ts', 'migrate_court.ts',
  'migrate_promotion.ts', 'migrate_remaining.ts', 'migrate_reserva.ts', 'migrate_states.js', 'migrate-referrals-sqlite.ts',
  'next-build.zip', 'quick_deploy.tar.gz', 'pre_migration_snapshot.json', 'snapshot_pre_migration.json',
  'query_config.cjs', 'rename_all.ts', 'rename_courtId.ts', 'rename_fieldId.ts', 'reset_pass.ts',
  'run-seed.mjs', 'seed-begin-plan.mjs', 'seed_gamification.ts', 'seed_spa.ts', 'seed_spa2.ts',
  'search.js', 'search_banner.js', 'search_banner_comp.js', 'search_src.js', 'simple_check.ts',
  'step1.js', 'step2.js', 'step3.js', 'tables.txt', 'tmp_save_fpk.ts', 'tmp_save_real_fpk.ts', 'tmp_schema.prisma',
  'tsconfig.tsbuildinfo', 'update_db.ts', 'update_hash.ts', 'update-plans.js', 'update-plans.ts',
  'users_output.txt', 'write_chunk.js', 'test_output.txt', 'test_out2.txt', 'test_query_out.txt',
  'prisma\schema.prisma.bak_c4_1_pre', 'prisma\check_canchas.ts'
)

# Patrones (respaldos de BD, auditorías, pruebas). dev.db NO se toca.
$rootPatterns = @(
  'dev.db.bak*', 'dev.db.backup*', 'test*.db', 'test_*.ts', 'test_*.json',
  'check_*.ts', 'check_*.js', 'check_*.sql', 'audit_*.json', 'c2_*.json', 'c3_*.json'
)

# Carpetas completas que no forman parte de la app
#  - scratch:  ~430 scripts de prueba y despliegue (varios con contraseñas del servidor)
#  - Zenda:    copia vieja completa del proyecto (junio)
#  - brain, artifacts, snapshots: notas y maquetas antiguas
$folders = @('scratch', 'Zenda', 'brain', 'artifacts', 'snapshots')

# Archivos dentro de src/ que no son parte de la app (se verifica que nadie los importe)
$srcFiles = @(
  'src\check_db_pages.ts', 'src\check_db_pages_detail.ts', 'src\clean-citiox-orders.ts', 'src\fix_pages_slugs.ts',
  'src\scratch_seed_page.js', 'src\seed_all_pages.ts', 'src\seed_features_page.ts',
  'src\lib\check_db.cjs', 'src\lib\check_db.ts', 'src\lib\check_prisma_keys.cjs', 'src\lib\direct_sqlite_check.cjs',
  'src\lib\inspect_db.cjs', 'src\lib\set_admin_wa.ts', 'src\lib\create_demo_page.ts', 'src\lib\add_services.ts',
  'src\lib\test_admin.ts', 'src\lib\test_negocio.ts', 'src\lib\test_notify.ts', 'src\lib\test_reject.ts',
  'src\lib\test_req.ts', 'src\lib\test_user.ts', 'src\lib\test_wa.ts',
  'src\app\admin\debug-session\page.tsx'
)

# ── Recolectar candidatos ───────────────────────────────────────────
$candidates = New-Object System.Collections.Generic.List[string]
foreach ($f in $rootFiles) { if (Test-Path -LiteralPath (Join-Path $root $f)) { $candidates.Add($f) } }
foreach ($p in $rootPatterns) {
  Get-ChildItem -Path $root -Filter $p -File -ErrorAction SilentlyContinue | ForEach-Object {
    if ($_.Name -ne 'dev.db' -and -not $candidates.Contains($_.Name)) { $candidates.Add($_.Name) }
  }
}
foreach ($d in $folders) { if (Test-Path -LiteralPath (Join-Path $root $d)) { $candidates.Add($d) } }

# src: solo si ningún otro archivo de src lo importa
$skipped = @()
$srcCode = Get-ChildItem -Path (Join-Path $root 'src') -Recurse -File -Include *.ts, *.tsx, *.js, *.mjs, *.cjs -ErrorAction SilentlyContinue
foreach ($f in $srcFiles) {
  $full = Join-Path $root $f
  if (-not (Test-Path -LiteralPath $full)) { continue }
  $base = [System.IO.Path]::GetFileNameWithoutExtension($f)
  if ($f -like '*debug-session*') { $base = 'debug-session' }
  $refs = $srcCode | Where-Object { $_.FullName -ne $full } | Select-String -SimpleMatch -Pattern $base -List -ErrorAction SilentlyContinue
  if ($refs) { $skipped += "$f  (lo usa: $($refs[0].Path.Replace($root + '\', '')))" } else { $candidates.Add($f) }
}

# ── Mostrar / mover ─────────────────────────────────────────────────
Write-Host ""
Write-Host "Elementos a mover a _basura_revisar\${stamp}: $($candidates.Count)" -ForegroundColor Cyan
$candidates | ForEach-Object { Write-Host "  - $_" }
if ($skipped.Count -gt 0) {
  Write-Host ""
  Write-Host "Se dejan en su lugar porque algo los usa:" -ForegroundColor Yellow
  $skipped | ForEach-Object { Write-Host "  - $_" }
}

if (-not $Aplicar) {
  Write-Host ""
  Write-Host "Simulación: no se movió nada. Ejecuta con -Aplicar para hacerlo." -ForegroundColor Green
  exit 0
}

New-Item -ItemType Directory -Force -Path $dest | Out-Null
foreach ($rel in $candidates) {
  $src = Join-Path $root $rel
  $target = Join-Path $dest $rel
  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $target) | Out-Null
  Move-Item -LiteralPath $src -Destination $target -Force
}

Write-Host ""
Write-Host "Listo. Todo quedó en: $dest" -ForegroundColor Green
Write-Host "1) Prueba la app (npm run dev)."
Write-Host "2) Si todo funciona, borra la carpeta _basura_revisar."
Write-Host "   Si algo falla, devuelve el archivo desde esa carpeta a su lugar."
