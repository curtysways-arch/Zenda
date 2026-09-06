#!/bin/bash
set -e
echo "=== INICIANDO DESPLIEGUE EN VPS ==="
cd /opt/Zenda

echo "1. Creando backup preventivo de dev.db..."
cp dev.db dev.db.bak.$(date +%s)

echo "2. Descartando cambios locales para pull limpio..."
git checkout -- dev.db snapshots/ || true
git stash || true

echo "3. Actualizando código desde origin/main..."
git pull origin main

echo "4. Sincronizando esquema de base de datos con Prisma..."
npx prisma generate
npx prisma db push

echo "5. Compilando aplicación..."
npm run build

echo "6. Reiniciando servicio PM2 zenda-app..."
pm2 restart 3

echo "7. Estado de PM2:"
pm2 status

echo "=== DESPLIEGUE COMPLETADO EXITOSAMENTE ==="
