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
ssh root@citiox.com "cd /opt/Zenda || cd /root/zenda || cd /var/www/zenda ; git fetch origin main && git reset --hard origin/main ; sed -i 's#DATABASE_URL=.*#DATABASE_URL=\"file:./dev.db\"#g' .env ; export DATABASE_URL=\"file:./dev.db\" ; npx prisma db push ; npm run build ; pm2 restart all --update-env"

echo.
echo ===================================================
echo   DESPLIEGUE FINALIZADO CON EXITO
echo   Tienda: https://citiox.com/pinchos
echo   Admin:  https://citiox.com/admin/pedidos
echo ===================================================
pause
