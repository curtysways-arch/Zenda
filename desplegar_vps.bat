@echo off
echo ===================================================
echo   DESPLIEGUE DIRECTO AL VPS - CITIOX / ZENDA
echo ===================================================

echo.
echo Conectando al VPS y ejecutando build...

"C:\Program Files\PuTTY\plink.exe" -batch -hostkey SHA256:jeceUmI/LedHRvwzzLZti9QyqhKqZNAGqJpULEn5zPM -pw "Citiox2024*" root@citiox.com "cd /opt/Zenda && git fetch origin main && git reset --hard origin/main && npm run build && pm2 restart all && echo DEPLOY_EXITOSO"

echo.
echo ===================================================
echo   DEPLOY FINALIZADO
echo   Tienda: https://citiox.com/pinchos
echo ===================================================
pause
