@echo off
echo ===================================================
echo   DESPLIEGUE AUTOMATICO DE CITIOX / ZENDA AL VPS
echo ===================================================

echo.
echo 1. Subiendo cambios locales a Git...
git add .
git commit -m "despliegue manual"
git push origin main

echo.
echo 2. Conectando al VPS, compilando y reiniciando app...
ssh root@citiox.com "cd /opt/Zenda || cd /root/zenda || cd /var/www/zenda ; git fetch origin main && git reset --hard origin/main && npx tsx prisma/seed_demo_canchas.ts && npm run build && pm2 restart all"

echo.
echo ===================================================
echo   DESPLIEGUE FINALIZADO CON EXITO
echo   Tienda: https://citiox.com/pinchos
echo   Admin:  https://citiox.com/admin/pedidos
echo ===================================================
pause
