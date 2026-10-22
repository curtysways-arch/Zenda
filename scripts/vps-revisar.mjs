// Revisión del servidor (SOLO LECTURA): no modifica nada en el VPS.
// Usa las mismas variables que deploy-node.mjs. En PowerShell, desde la carpeta Spa:
//   $env:VPS_HOST="citiox.com"; $env:VPS_PASS="tu-clave"; node scripts/vps-revisar.mjs
// El resultado queda en _diagnostico_vps.txt (no incluye contraseñas ni el .env).
import { Client } from 'ssh2';
import fs from 'fs';

const HOST = process.env.VPS_HOST;
const USER = process.env.VPS_USER || 'root';
const PASS = process.env.VPS_PASS;
const KEY = process.env.VPS_KEY; // opcional: ruta a una llave privada
if (!HOST || (!PASS && !KEY)) {
  console.error('Faltan VPS_HOST y VPS_PASS (o VPS_KEY). Ejemplo: $env:VPS_HOST="citiox.com"; $env:VPS_PASS="..."');
  process.exit(1);
}

const DIR = '/opt/Zenda';
const sh = String.raw;

// Cada paso: [título, comando]. Todos son de lectura.
const steps = [
  ['Fecha del servidor', 'date; uptime'],
  ['Espacio en disco', 'df -h / | tail -1'],
  ['Node y PM2', 'node -v; pm2 -v'],
  ['Procesos PM2', 'pm2 ls --no-color'],
  ['Versión del código (git)', `cd ${DIR} && (git log -1 --format='%h %ad %s' --date=iso 2>/dev/null || echo 'sin git') && git status --short 2>/dev/null | head -20`],
  ['¿Está el módulo de páginas nuevo?', `cd ${DIR} && for f in src/lib/customPages.ts src/lib/pageTemplates.ts src/components/admin/pages/PageEditor.tsx scripts/crear-paginas-demo.ts src/components/public/landings/DentalEsmalteLanding.tsx src/modules/dental/components/admin/agenda/DentalAgenda.tsx; do [ -f "$f" ] && echo "SI  $f" || echo "NO  $f"; done`],
  ['¿Hay build de Next?', `cd ${DIR} && ls -la .next/BUILD_ID 2>/dev/null && cat .next/BUILD_ID; echo; stat -c '%y' .next/BUILD_ID 2>/dev/null`],
  ['Ruta de la base (sin secretos)', sh`cd ${DIR} && grep -E '^DATABASE_URL=' .env | sed -E 's#(postgres(ql)?://)[^@]*@#\1***@#'`],
  ['Archivos de base', `cd ${DIR} && ls -la dev.db* 2>/dev/null`],
  ['Integridad de la base', `cd ${DIR} && (command -v sqlite3 >/dev/null && sqlite3 dev.db 'PRAGMA integrity_check;' || echo 'sqlite3 no instalado')`],
  ['Negocios', `cd ${DIR} && sqlite3 -header -column dev.db "SELECT slug, substr(nombre,1,34) AS nombre, tipoNegocio AS tipo, isDemo AS demo, (SELECT COUNT(*) FROM Page p WHERE p.businessId=n.id) AS paginas, (SELECT COUNT(*) FROM Cancha s WHERE s.negocioId=n.id) AS servicios FROM Negocio n ORDER BY isDemo, slug;"`],
  ['Totales', `cd ${DIR} && sqlite3 dev.db "SELECT 'negocios', COUNT(*) FROM Negocio UNION ALL SELECT 'demos', COUNT(*) FROM Negocio WHERE isDemo=1 UNION ALL SELECT 'paginas', COUNT(*) FROM Page UNION ALL SELECT 'reservas', COUNT(*) FROM Reserva UNION ALL SELECT 'clientes', COUNT(*) FROM Cliente UNION ALL SELECT 'media', COUNT(*) FROM Media;"`],
  ['Carpetas de fotos', `cd ${DIR} && du -sh storage public/uploads 2>/dev/null; ls storage 2>/dev/null; [ -d storage/clinical ] && echo 'storage/clinical OK' || echo 'FALTA storage/clinical'`],
  ['Fotos locales que faltan (muestra)', `cd ${DIR} && sqlite3 dev.db "SELECT url FROM Media WHERE url NOT LIKE 'http%' ORDER BY rowid DESC LIMIT 400;" | while read p; do case "$p" in /api/*) continue;; esac; [ -f "public$p" ] || echo "$p"; done | head -15; echo '(fin)'`],
  ['Respuesta de cada negocio (local)', `cd ${DIR} && for s in $(sqlite3 dev.db "SELECT slug FROM Negocio ORDER BY isDemo, slug;"); do c=$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 http://localhost:3000/$s); echo "$c  /$s"; done`],
  ['Páginas públicas clave', `for u in / /demo-spa/paginas /dental-chip /vortex-fitness; do c=$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 http://localhost:3000$u); echo "$c  $u"; done`],
  ['Errores recientes de la app', 'pm2 logs zenda-app --lines 80 --nostream --no-color 2>&1 | tail -80'],
  ['Dependencias del bot', `cd ${DIR}/bot/whatsapp-bot && for d in qrcode qrcode-terminal @whiskeysockets/baileys; do [ -d node_modules/$d ] && echo "SI  $d" || echo "NO  $d"; done`],
  ['Errores recientes del bot', 'pm2 logs zenda-bot --lines 25 --nostream --no-color 2>&1 | tail -25'],
  ['Respaldos en /root', 'ls -la /root/*.db /root/*.tar.gz 2>/dev/null | tail -10'],
];

const out = [`DIAGNÓSTICO VPS · ${new Date().toISOString()} · host ${HOST}`, ''];
const conn = new Client();

function run(cmd) {
  return new Promise((resolve) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return resolve(`ERROR: ${err.message}`);
      let data = '';
      stream.on('data', (d) => (data += d)).stderr.on('data', (d) => (data += d));
      stream.on('close', () => resolve(data.trim()));
    });
  });
}

conn.on('ready', async () => {
  for (const [title, cmd] of steps) {
    process.stdout.write(`• ${title}… `);
    const res = await run(cmd);
    out.push(`===== ${title} =====`, res || '(sin salida)', '');
    console.log('listo');
  }
  conn.end();
  fs.writeFileSync('_diagnostico_vps.txt', out.join('\n'), 'utf8');
  console.log('\nGuardado en _diagnostico_vps.txt. Avísale a Claude que ya está.');
});
conn.on('error', (e) => { console.error('No se pudo conectar:', e.message); process.exit(1); });
conn.connect({
  host: HOST, port: 22, username: USER, readyTimeout: 20000,
  ...(KEY ? { privateKey: fs.readFileSync(KEY) } : { password: PASS }),
});
