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
ssh -t root@citiox.com "cd /root/spa/Spa 2>/dev/null || cd /root/Spa 2>/dev/null || cd /root/citiox-spa 2>/dev/null || cd /root/citiox/spa/Spa 2>/dev/null; git pull origin main && npm run build && pm2 restart zenda-app"

echo.
echo ===================================================
echo   DESPLIEGUE FINALIZADO CON EXITO
echo   Tienda: https://citiox.com/pinchos
echo   Admin:  https://citiox.com/admin/pedidos
echo ===================================================
pause
