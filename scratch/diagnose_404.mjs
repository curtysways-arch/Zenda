import { Client } from "ssh2";

const VPS = "157.173.203.174";
const USER = "root";
const PASS = "Elmassuelto005624";

const conn = new Client();
conn.on("ready", () => {
  const cmd = `
    echo "=== PROBAR RUTAS FRONTEND (páginas) ==="
    curl -s -o /dev/null -w "/ (raíz): %{http_code}\\n" http://127.0.0.1:3000/
    curl -s -o /dev/null -w "/symechas-peluquera (slug page): %{http_code}\\n" http://127.0.0.1:3000/symechas-peluquera
    curl -s -o /dev/null -w "/pinchos (slug page): %{http_code}\\n" http://127.0.0.1:3000/pinchos
    curl -s -o /dev/null -w "/barber-men (slug page): %{http_code}\\n" http://127.0.0.1:3000/barber-men
    curl -s -o /dev/null -w "/demo-spa (slug page): %{http_code}\\n" http://127.0.0.1:3000/demo-spa
    curl -s -o /dev/null -w "/login: %{http_code}\\n" http://127.0.0.1:3000/login
    
    echo ""
    echo "=== PROBAR SI NGINX ESTÁ CORRIENDO ==="
    systemctl status nginx 2>&1 | head -10
    
    echo ""
    echo "=== CONFIGURACIÓN NGINX ==="
    cat /etc/nginx/sites-enabled/* 2>/dev/null || cat /etc/nginx/nginx.conf 2>/dev/null | head -60
    
    echo ""
    echo "=== PROBAR RESPUESTA COMPLETA DE symechas ==="
    curl -s -L -w "\\n\\nHTTP: %{http_code}" http://127.0.0.1:3000/symechas-peluquera | head -20
    
    echo ""
    echo "=== VER RUTAS GENERADAS EN .next ==="
    ls /opt/Zenda/.next/server/app/ 2>/dev/null | head -20
    
    echo ""
    echo "=== VERIFICAR SLUG ROUTE EXISTE ==="
    ls /opt/Zenda/.next/server/app/\\[slug\\]/ 2>/dev/null || echo "No existe [slug] route"
    ls /opt/Zenda/src/app/ 2>/dev/null | head -20
  `;

  conn.exec(cmd, (err, stream) => {
    if (err) { console.error(err); conn.end(); return; }
    let out = "";
    stream.on("data", (d) => { out += d; process.stdout.write(d); });
    stream.stderr.on("data", (d) => { out += d; });
    stream.on("close", () => conn.end());
  });
}).connect({ host: VPS, port: 22, username: USER, password: PASS });
