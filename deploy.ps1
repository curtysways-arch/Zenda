# SCRIPT DE DESPLIEGUE ZENDA
# Ejecutar desde: d:\Documentos\antigravity\spa\Spa
$VPS = "root@157.173.203.174"
$REMOTE = "/opt/Zenda"

Write-Host "Desplegando cambios a Zenda VPS..." -ForegroundColor Cyan

$files = @(
    "src/app/[slug]/page.tsx",
    "src/app/admin/staff/page.tsx",
    "src/app/admin/clientes/page.tsx",
    "src/app/admin/usuarios/page.tsx",
    "src/app/admin/perfil/page.tsx",
    "src/components/admin/mobile/MobileStaff.tsx",
    "src/components/admin/mobile/MobileClients.tsx",
    "src/app/api/superadmin/negocios/route.ts",
    "src/app/api/onboarding/route.ts"
)

foreach ($file in $files) {
    $remote_path = $REMOTE + "/" + $file
    Write-Host "  Subiendo $file..." -ForegroundColor Yellow
    scp -o StrictHostKeyChecking=no $file "${VPS}:${remote_path}"
    if ($LASTEXITCODE -eq 0) { Write-Host "     OK" -ForegroundColor Green }
    else { Write-Host "     ERROR" -ForegroundColor Red }
}

Write-Host "Reiniciando PM2..." -ForegroundColor Cyan
ssh -o StrictHostKeyChecking=no $VPS "pm2 restart zenda-app"
Write-Host "Despliegue completado!" -ForegroundColor Green
