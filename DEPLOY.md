# Zenda – Guía de Despliegue en VPS Ubuntu 24.04

> **Stack**: Next.js 15 (App Router) · PostgreSQL 16 · PM2 · Nginx · Node.js 20 LTS

---

## 📋 Índice

1. [Requisitos previos](#1-requisitos-previos)
2. [Preparación del servidor](#2-preparación-del-servidor)
3. [Instalación de dependencias del sistema](#3-instalación-de-dependencias-del-sistema)
4. [Configuración de PostgreSQL](#4-configuración-de-postgresql)
5. [Configurar el schema de Prisma para PostgreSQL](#5-configurar-el-schema-de-prisma-para-postgresql)
6. [Subir el proyecto al VPS](#6-subir-el-proyecto-al-vps)
7. [Instalar dependencias Node](#7-instalar-dependencias-node)
8. [Variables de entorno](#8-variables-de-entorno)
9. [Migraciones de base de datos](#9-migraciones-de-base-de-datos)
10. [Build de producción](#10-build-de-producción)
11. [PM2 – Gestión de procesos](#11-pm2--gestión-de-procesos)
12. [Nginx – Reverse proxy](#12-nginx--reverse-proxy)
13. [SSL con Certbot](#13-ssl-con-certbot)
14. [Verificación final de rutas](#14-verificación-final-de-rutas)
15. [Mantenimiento](#15-mantenimiento)

---

## 1. Requisitos previos

- VPS con Ubuntu 24.04 LTS (mínimo 2 GB RAM, 2 vCPU)
- Acceso root o usuario con sudo
- Dominio apuntando al IP del VPS (DNS configurado)
- Credenciales de Firebase (cliente y admin)
- Proyecto de base de datos limpio o exportado

---

## 2. Preparación del servidor

```bash
# Actualizar sistema
sudo apt update && sudo apt upgrade -y

# Crear usuario dedicado (opcional pero recomendado)
sudo adduser zenda
sudo usermod -aG sudo zenda
su - zenda
```

---

## 3. Instalación de dependencias del sistema

### Node.js 20 LTS (via nvm)

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20
nvm alias default 20
node -v  # debe mostrar v20.x.x
```

### PM2

```bash
npm install -g pm2
```

### Nginx

```bash
sudo apt install nginx -y
sudo systemctl enable nginx
```

### Certbot (Let's Encrypt)

```bash
sudo apt install certbot python3-certbot-nginx -y
```

---

## 4. Configuración de PostgreSQL

```bash
sudo apt install postgresql postgresql-contrib -y
sudo systemctl enable postgresql

# Acceder a psql
sudo -u postgres psql

# Dentro de psql:
CREATE DATABASE zenda_db;
CREATE USER zenda_user WITH ENCRYPTED PASSWORD 'STRONG_PASSWORD_HERE';
GRANT ALL PRIVILEGES ON DATABASE zenda_db TO zenda_user;
ALTER DATABASE zenda_db OWNER TO zenda_user;
\q
```

> ⚠️ Guarda el password — lo necesitarás en `DATABASE_URL`.

---

## 5. Configurar el schema de Prisma para PostgreSQL

> [!IMPORTANT]
> El schema de Prisma en desarrollo usa `provider = "sqlite"`. **Antes de hacer deploy**, debes cambiar esto a PostgreSQL:

Editar `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

También editar `src/lib/prisma.ts` para usar el cliente estándar sin el adaptador libSQL:

```typescript
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
```

---

## 6. Subir el proyecto al VPS

### Opción A: Git (recomendado)

```bash
# En el servidor
mkdir -p /var/www/zenda
cd /var/www/zenda
git clone https://github.com/TU_USUARIO/TU_REPO.git .
```

### Opción B: rsync desde local (Windows PowerShell → WSL o SCP)

```bash
# Desde tu máquina local (WSL/Linux)
rsync -avz --exclude node_modules --exclude .next --exclude .env \
  /ruta/local/Spa/ usuario@IP_VPS:/var/www/zenda/
```

---

## 7. Instalar dependencias Node

```bash
cd /var/www/zenda
npm install --omit=dev
```

> ℹ️ En producción, omitir devDependencies. Si hay problemas con el build, ejecutar primero con todas las deps y luego limpiar.

---

## 8. Variables de entorno

```bash
cd /var/www/zenda
cp .env.example .env
nano .env
```

Completar los valores reales (ver tabla en `.env.example`). Variables críticas:

```env
DATABASE_URL="postgresql://zenda_user:STRONG_PASSWORD@localhost:5432/zenda_db?schema=public"
NEXTAUTH_SECRET="GENERAR_CON_openssl_rand_-base64_32"
NEXTAUTH_URL="https://tu-dominio.com"
NEXT_PUBLIC_APP_URL="https://tu-dominio.com"
NEXT_PUBLIC_BASE_URL="https://tu-dominio.com"
BOT_HTTP_URL="http://127.0.0.1:3001"
STORAGE_PATH="/var/www/zenda/storage/uploads"
STORAGE_PROVIDER="local"
```

### Crear directorio de uploads

```bash
mkdir -p /var/www/zenda/storage/uploads
chmod 755 /var/www/zenda/storage/uploads
```

### Crear directorio de logs de PM2

```bash
sudo mkdir -p /var/log/pm2
sudo chown $USER:$USER /var/log/pm2
```

---

## 9. Migraciones de base de datos

### Primera vez (schema nuevo desde cero)

Si no tienes una carpeta `prisma/migrations/` con migraciones existentes:

```bash
# Opción 1 (recomendada si empiezas desde cero): 
# Generar la migración inicial desde el schema actual
npx prisma migrate dev --name init --schema=prisma/schema.prisma

# Opción 2 (más rápida pero sin historial de migraciones):
npx prisma db push --schema=prisma/schema.prisma
```

### Deployments subsecuentes

```bash
# Aplicar migraciones pendientes (sin interactividad)
npx prisma migrate deploy

# Regenerar el cliente Prisma
npx prisma generate
```

### Verificar conexión

```bash
node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.\$connect().then(() => { console.log('✅ PostgreSQL conectado'); p.\$disconnect(); }).catch(e => { console.error('❌ Error:', e.message); });
"
```

---

## 10. Build de producción

```bash
cd /var/www/zenda

# Generar cliente Prisma
npx prisma generate

# Build de Next.js
npm run build
```

> El build puede tardar 2–5 minutos dependiendo de los recursos del VPS.

Si hay errores de memoria:

```bash
NODE_OPTIONS="--max-old-space-size=2048" npm run build
```

---

## 11. PM2 – Gestión de procesos

```bash
cd /var/www/zenda

# Iniciar ambos procesos (Next.js + Bot WA)
pm2 start ecosystem.config.js

# Ver estado
pm2 status

# Ver logs en tiempo real
pm2 logs zenda-app
pm2 logs zenda-bot

# Guardar configuración para autostart
pm2 save
pm2 startup  # Ejecutar el comando que genere este output

# Reiniciar después de actualizar código
pm2 restart zenda-app
```

### Comandos útiles de PM2

```bash
pm2 stop all          # Detener todos
pm2 reload zenda-app  # Reload zero-downtime (para Next.js)
pm2 delete all        # Eliminar de la lista
pm2 monit             # Monitor interactivo
```

---

## 12. Nginx – Reverse proxy

Crear configuración del sitio:

```bash
sudo nano /etc/nginx/sites-available/zenda
```

Pegar la siguiente configuración:

```nginx
# /etc/nginx/sites-available/zenda

# Configuración de límites de subida
client_max_body_size 20M;

server {
    listen 80;
    server_name tu-dominio.com www.tu-dominio.com;

    # Redirigir a HTTPS (se actualiza automáticamente con Certbot)
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name tu-dominio.com www.tu-dominio.com;

    # SSL (completado por Certbot)
    # ssl_certificate /etc/letsencrypt/live/tu-dominio.com/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/tu-dominio.com/privkey.pem;

    # Seguridad
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Archivos estáticos de Next.js (.next/static)
    location /_next/static/ {
        alias /var/www/zenda/.next/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Archivos del directorio public/
    location /public/ {
        alias /var/www/zenda/public/;
        expires 30d;
    }

    # Archivos de media/uploads locales
    # Nota: Next.js los sirve a través de /api/media/[...key]
    # Si quieres servir directamente con Nginx para mejor performance:
    # location /uploads/ {
    #     alias /var/www/zenda/storage/uploads/;
    #     expires 7d;
    #     add_header Cache-Control "public";
    # }

    # Todo lo demás → Next.js
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 60s;
        proxy_connect_timeout 60s;
    }
}
```

```bash
# Habilitar el sitio
sudo ln -s /etc/nginx/sites-available/zenda /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default  # eliminar config por defecto si existe

# Verificar configuración
sudo nginx -t

# Recargar Nginx
sudo systemctl reload nginx
```

---

## 13. SSL con Certbot

```bash
sudo certbot --nginx -d tu-dominio.com -d www.tu-dominio.com
# Seguir instrucciones interactivas

# Verificar renovación automática
sudo certbot renew --dry-run
```

---

## 14. Verificación final de rutas

Una vez el servidor esté corriendo, verificar que estas rutas respondan correctamente:

| Ruta | Descripción | Estado esperado |
|------|-------------|-----------------|
| `GET /` | Landing page | 200 OK |
| `GET /[slug]` | Página pública del negocio | 200 OK |
| `GET /[slug]/servicio/[id]` | Detalle de servicio | 200 OK |
| `GET /admin` | Dashboard admin (requiere login) | 302 → /login |
| `GET /superadmin` | Panel superadmin | 302 → /login |
| `GET /login` | Página de login | 200 OK |
| `GET /api/media/[businessId]/[category]/[file]` | Servir imagen subida | 200 OK |
| `GET /api/pwa/manifest?slug=[slug]` | Manifest PWA por negocio | 200 OK |

```bash
# Test rápido desde el servidor
curl -I http://localhost:3000
curl -I http://localhost:3000/login
curl -I http://localhost:3001/status  # Bot WA
```

---

## 15. Mantenimiento

### Actualizar el código

```bash
cd /var/www/zenda
git pull origin main
npm install --omit=dev
npx prisma generate
npx prisma migrate deploy
npm run build
pm2 reload zenda-app
```

### Backups de PostgreSQL

```bash
# Backup manual
pg_dump -U zenda_user -d zenda_db > backup_$(date +%Y%m%d).sql

# Restore
psql -U zenda_user -d zenda_db < backup_20260616.sql
```

### Backup de uploads/storage

```bash
tar -czf uploads_backup_$(date +%Y%m%d).tar.gz /var/www/zenda/storage/uploads/
```

### Ver logs

```bash
# Logs de la app Next.js
pm2 logs zenda-app --lines 100

# Logs del bot
pm2 logs zenda-bot --lines 100

# Logs de Nginx
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log

# Logs del sistema
journalctl -u nginx -f
```

---

## 🛡️ Seguridad adicional recomendada

- Configurar firewall UFW: `ufw allow 22,80,443/tcp && ufw enable`
- No exponer el puerto 3001 (bot) ni 5432 (PostgreSQL) al exterior
- Usar contraseñas fuertes para PostgreSQL
- Configurar fail2ban para proteger SSH
- Revisar permisos de archivos: `chmod 600 .env`

---

*Generado para Zenda · Versión del despliegue: 2026-06-16*
