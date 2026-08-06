import { Client } from "ssh2";

const VPS = "157.173.203.174";
const USER = "root";
const PASS = "Elmassuelto005624";

const conn = new Client();
conn.on("ready", () => {
  console.log("Conectado al VPS. Regenerando Prisma Client limpio para PostgreSQL...");
  
  const cmd = `
    cd /opt/Zenda
    
    echo "=== PASO 1: Verificar schema.prisma en VPS ==="
    grep -A5 'datasource db' prisma/schema.prisma
    
    echo ""
    echo "=== PASO 2: Limpiar cache de Prisma Client ==="
    rm -rf node_modules/@prisma/client node_modules/.prisma
    echo "Cache limpiado"
    
    echo ""
    echo "=== PASO 3: Regenerar Prisma Client con provider=postgresql ==="
    DATABASE_URL="postgresql://zenda_user:CitioxProd2024!@127.0.0.1:5432/zenda_db?schema=public" npx prisma generate 2>&1
    
    echo ""
    echo "=== PASO 4: Verificar que el provider del cliente generado es postgresql ==="
    cat node_modules/.prisma/client/schema.prisma 2>/dev/null | grep provider || echo "Revisando en node_modules/@prisma/client..."
    grep -r "provider" node_modules/@prisma/client/runtime/*.js 2>/dev/null | head -5 || true
    
    echo ""
    echo "=== PASO 5: Reiniciar aplicación con --update-env ==="
    pm2 restart zenda-app --update-env
    
    echo ""
    echo "Esperando 8 segundos para que arranque..."
    sleep 8
    
    echo ""
    echo "=== PASO 6: Probar endpoints ==="
    curl -s -o /dev/null -w "symechas-peluquera HTTP: %{http_code}\\n" http://127.0.0.1:3000/api/public/negocio/symechas-peluquera
    curl -s -o /dev/null -w "pinchos HTTP: %{http_code}\\n" http://127.0.0.1:3000/api/public/negocio/pinchos
    curl -s -o /dev/null -w "barber-men HTTP: %{http_code}\\n" http://127.0.0.1:3000/api/public/negocio/barber-men
    
    echo ""
    echo "=== PASO 7: Log de errores recientes ==="
    tail -n 20 /root/.pm2/logs/zenda-app-error.log
    
    echo ""
    echo "=== PM2 STATUS ==="
    pm2 list
  `;

  conn.exec(cmd, (err, stream) => {
    if (err) { console.error(err); conn.end(); return; }
    let out = "";
    stream.on("data", (data) => { out += data; process.stdout.write(data); });
    stream.stderr.on("data", (data) => { out += data; process.stderr.write(data); });
    stream.on("close", () => { console.log("\n=== FINALIZADO ==="); conn.end(); });
  });
}).connect({ host: VPS, port: 22, username: USER, password: PASS });
