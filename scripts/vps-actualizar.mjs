// Cambios en el servidor, por pasos. Cada paso muestra qué va a hacer y pide confirmación.
// En PowerShell, desde la carpeta Spa (con $env:VPS_HOST y $env:VPS_PASS puestos):
//   node scripts/vps-actualizar.mjs bot            → instala lo que le falta al bot de WhatsApp y lo reinicia
//   node scripts/vps-actualizar.mjs codigo         → baja el último código de GitHub, compila y reinicia la app
//   node scripts/vps-actualizar.mjs paginas-demo   → muestra y luego crea las páginas de ejemplo en los demos
//   node scripts/vps-actualizar.mjs reparar        → vuelve a compilar con más memoria y reinicia (si una compilación falló)
//   node scripts/vps-actualizar.mjs datos          → marca los 3 demos y pasa Bubble Wash a lavandería (tipo, rubro y plan)
//   node scripts/vps-actualizar.mjs demos          → marca demo-canchas, tienda y parrilla como demo y muestra datos de Bubble Wash
// Todo lo que pasa queda en _vps_actualizar.log
import { Client } from 'ssh2';
import fs from 'fs';
import readline from 'readline';

const HOST = process.env.VPS_HOST;
const USER = process.env.VPS_USER || 'root';
const PASS = process.env.VPS_PASS;
const KEY = process.env.VPS_KEY;
const DIR = '/opt/Zenda';
const mode = process.argv[2];

if (!HOST || (!PASS && !KEY)) {
  console.error('Faltan VPS_HOST y VPS_PASS. Ejemplo: $env:VPS_HOST="citiox.com"; $env:VPS_PASS="..."');
  process.exit(1);
}

const LOG = '_vps_actualizar.log';
const log = (t) => { fs.appendFileSync(LOG, t + '\n', 'utf8'); };
log(`\n===== ${new Date().toISOString()} · ${mode} =====`);

const ask = (q) => new Promise((res) => {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  rl.question(q, (a) => { rl.close(); res(a.trim().toLowerCase()); });
});

const conn = new Client();
function run(title, cmd, { allowFail = false } = {}) {
  return new Promise((resolve, reject) => {
    console.log(`\n▶ ${title}`);
    log(`\n▶ ${title}\n$ ${cmd}`);
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err);
      let out = '';
      const onData = (d) => { const s = d.toString(); out += s; process.stdout.write(s); fs.appendFileSync(LOG, s, 'utf8'); };
      stream.on('data', onData).stderr.on('data', onData);
      stream.on('close', (code) => {
        log(`(código de salida: ${code})`);
        if (code !== 0 && !allowFail) return reject(new Error(`«${title}» falló (código ${code}). No se hizo nada más.`));
        resolve(out);
      });
    });
  });
}

// Compila con más memoria (según la RAM del servidor) y, solo si sale bien, reinicia la app.
async function compilarYReiniciar() {
  await run('Memoria del servidor', 'free -m');
  const build = `cd ${DIR} && TOTAL=$(free -m | awk '/^Mem:/{print $2}'); SWAP=$(free -m | awk '/^Swap:/{print $2}'); `
    + `HEAP=$(( (TOTAL + SWAP) * 70 / 100 )); [ $HEAP -gt 6144 ] && HEAP=6144; [ $HEAP -lt 2048 ] && HEAP=2048; `
    + `echo "Usando $HEAP MB para compilar"; NODE_OPTIONS="--max-old-space-size=$HEAP" npm run build 2>&1 | tail -40; exit \${PIPESTATUS[0]}`;
  await run('Compilar con más memoria (tarda unos minutos)', build);
  await run('Reiniciar la app', 'pm2 restart zenda-app && sleep 10 && pm2 save');
  await run('Comprobar respuestas', `for u in / /register /login /superadmin /demo-spa /demo-spa/paginas /bubblewashuio; do echo "$(curl -s -o /dev/null -w '%{http_code}' --max-time 30 http://localhost:3000$u)  $u"; done`, { allowFail: true });
}

const plans = {
  // Vuelve a compilar el código que ya está en el servidor y reinicia (sin bajar nada de GitHub).
  async reparar() {
    console.log('Esto vuelve a compilar el código que ya está en el servidor, con más memoria, y reinicia la app. No toca la base de datos.');
    if ((await ask('¿Continuar? escribe "si": ')) !== 'si') return;
    await compilarYReiniciar();
  },
  async bot() {
    console.log('Esto instalará las dependencias del bot de WhatsApp (bot/whatsapp-bot) y reiniciará solo el bot.\nNo toca la base de datos ni la página.');
    if ((await ask('¿Continuar? escribe "si": ')) !== 'si') return;
    await run('Instalar dependencias del bot', `cd ${DIR}/bot/whatsapp-bot && npm install --no-audit --no-fund`);
    await run('Reiniciar el bot', 'pm2 restart zenda-bot && sleep 8');
    await run('Últimos mensajes del bot', 'pm2 logs zenda-bot --lines 30 --nostream --no-color 2>&1 | tail -30', { allowFail: true });
    await run('Guardar lista de PM2', 'pm2 save', { allowFail: true });
  },

  async codigo() {
    console.log('Esto hará en el servidor: respaldo de la base → bajar el último código de GitHub (main) → instalar → compilar → reiniciar la app.\nSi la compilación falla, NO se reinicia y la app sigue con la versión actual.\nAntes, el código nuevo tiene que estar subido a GitHub (git push desde tu PC).');
    if ((await ask('¿Continuar? escribe "si": ')) !== 'si') return;
    const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '');
    await run('Respaldo de la base', `cd ${DIR} && sqlite3 dev.db ".backup '/root/respaldo_antes_actualizar_${stamp}.db'" && ls -la /root/respaldo_antes_actualizar_${stamp}.db`);
    await run('Versión actual', `cd ${DIR} && git log -1 --format='%h %s'`);
    await run('Descartar cambios locales del servidor en archivos generados', `cd ${DIR} && git checkout -- package-lock.json next-env.d.ts 2>/dev/null; git status --short | head`);
    await run('Bajar el código nuevo', `cd ${DIR} && git fetch origin main && git merge --ff-only origin/main && git log -1 --format='%h %s'`);
    await run('Revisar que llegó el módulo de páginas', `cd ${DIR} && ls src/lib/customPages.ts src/lib/pageTemplates.ts scripts/crear-paginas-demo.ts`);
    await run('Instalar dependencias (solo si cambiaron)', `cd ${DIR} && if git diff --quiet HEAD@{1} HEAD -- package-lock.json; then echo 'Sin cambios en dependencias.'; else npm ci --no-audit --no-fund; fi`);
    await run('Generar cliente de Prisma', `cd ${DIR} && npx prisma generate`);
    await compilarYReiniciar();
    await run('Comprobar respuestas', `for u in / /demo-spa /demo-spa/paginas /dental-chip /vortex-fitness; do echo "$(curl -s -o /dev/null -w '%{http_code}' --max-time 30 http://localhost:3000$u)  $u"; done`, { allowFail: true });
  },

  async 'paginas-demo'() {
    await run('Simulación (no guarda nada)', `cd ${DIR} && npx tsx scripts/crear-paginas-demo.ts --dry`);
    if ((await ask('\n¿Crear estas páginas publicadas en los demos? escribe "si": ')) !== 'si') return;
    await run('Respaldo de la base', `cd ${DIR} && sqlite3 dev.db ".backup '/root/respaldo_antes_paginas_demo.db'"`);
    await run('Crear páginas', `cd ${DIR} && npx tsx scripts/crear-paginas-demo.ts`);
  },

  async demos() {
    const SLUGS = ['demo-canchas', 'tienda', 'parrilla-citiox-demo'];
    const IN = SLUGS.map((x) => `'${x}'`).join(',');
    const q = (sql) => `cd ${DIR} && sqlite3 -header -column dev.db "${sql}"`;
    await run('Así están ahora', q(`SELECT slug, substr(nombre,1,30) AS nombre, isDemo, tipoNegocio FROM Negocio WHERE slug IN (${IN},'bubblewashuio');`));
    console.log(`\nSe marcarán como DEMO solo estos 3: ${SLUGS.join(', ')}. Antes se respalda la base.`);
    if ((await ask('¿Continuar? escribe "si": ')) !== 'si') return;
    await run('Respaldo de la base', `cd ${DIR} && sqlite3 dev.db ".backup '/root/respaldo_antes_demos.db'"`);
    await run('Marcar como demo', q(`UPDATE Negocio SET isDemo=1 WHERE slug IN (${IN}); SELECT slug, isDemo FROM Negocio WHERE slug IN (${IN});`));

    // Solo lectura: datos de Bubble Wash para corregir su plan en el siguiente paso.
    const B = `(SELECT id FROM Negocio WHERE slug='bubblewashuio')`;
    await run('Bubble Wash: negocio', `cd ${DIR} && sqlite3 -line dev.db "SELECT id, nombre, slug, tipoNegocio, businessTypeId, isDemo, planExpiresAt, json_extract(configuracion,'$.tipoNegocio') AS cfg_tipo FROM Negocio WHERE slug='bubblewashuio';"`, { allowFail: true });
    await run('Bubble Wash: tipo de negocio', `cd ${DIR} && sqlite3 -line dev.db "SELECT * FROM BusinessType WHERE id=(SELECT businessTypeId FROM Negocio WHERE slug='bubblewashuio');"`, { allowFail: true });
    await run('Bubble Wash: suscripción', `cd ${DIR} && sqlite3 -line dev.db "SELECT s.id, s.estado, s.fechaInicio, s.fechaFin, s.isFounder, s.lockedPrice, s.pagoPendiente, p.id AS plan_id, p.name AS plan, p.price, p.familyId, f.code AS familia FROM Suscripcion s JOIN Plan p ON p.id=s.planId LEFT JOIN PlanFamily f ON f.id=p.familyId WHERE s.negocioId=${B};"`, { allowFail: true });
    await run('Planes disponibles por familia', q(`SELECT f.code AS familia, p.id, substr(p.name,1,28) AS plan, p.price, p.active, p.isPublic, p.isDefault FROM Plan p LEFT JOIN PlanFamily f ON f.id=p.familyId ORDER BY f.code, p.price;`), { allowFail: true });
    await run('Tipos de negocio', q(`SELECT id, slug, substr(name,1,28) AS name FROM BusinessType ORDER BY slug;`), { allowFail: true });
  },

  // Marca los demos y pasa Bubble Wash a lavandería (tipo, rubro y plan). Muestra todo antes de cambiar.
  async datos() {
    const sqlJson = async (title, sql) => {
      const out = await run(title, `cd ${DIR} && sqlite3 -json dev.db "${sql}"`, { allowFail: true });
      const start = out.indexOf('[');
      try { return start >= 0 ? JSON.parse(out.slice(start)) : []; } catch { return []; }
    };
    const esc = (v) => String(v).replace(/'/g, "''");
    const DEMOS = ['demo-canchas', 'tienda', 'parrilla-citiox-demo'];

    const demos = await sqlJson('Demos a marcar', `SELECT slug, nombre, isDemo FROM Negocio WHERE slug IN (${DEMOS.map((d) => `'${d}'`).join(',')});`);
    const [neg] = await sqlJson('Bubble Wash ahora', `SELECT id, nombre, tipoNegocio, businessTypeId, json_extract(configuracion,'$.tipoNegocio') AS cfgTipo FROM Negocio WHERE slug='bubblewashuio';`);
    if (!neg) throw new Error('No encontré el negocio bubblewashuio.');
    const [sus] = await sqlJson('Su suscripción', `SELECT s.id, s.estado, s.fechaFin, p.id AS planId, p.name AS plan, f.code AS familia FROM Suscripcion s JOIN Plan p ON p.id=s.planId LEFT JOIN PlanFamily f ON f.id=p.familyId WHERE s.negocioId='${esc(neg.id)}';`);
    const fams = await sqlJson('Familia de planes de lavandería', `SELECT id, code, name FROM PlanFamily WHERE upper(code) LIKE 'LAVAND%' OR lower(slug) LIKE '%lavand%';`);
    const fam = fams[0];
    const plans = fam ? await sqlJson('Planes de lavandería', `SELECT id, name, price, active, activo, isPublic FROM Plan WHERE familyId='${esc(fam.id)}' ORDER BY (active AND activo) DESC, price DESC;`) : [];
    const btCols = (await sqlJson('Columnas de BusinessType', `PRAGMA table_info(BusinessType);`)).map((c) => c.name);
    const famCol = ['planFamilyId', 'familyId'].find((c) => btCols.includes(c));
    const famFilter = fam && famCol ? ` OR ${famCol}='${esc(fam.id)}'` : '';
    const bts = await sqlJson('Tipos de negocio de lavandería', `SELECT id, slug, name FROM BusinessType WHERE lower(slug) LIKE '%lavand%' OR lower(name) LIKE '%lavand%'${famFilter} ORDER BY (lower(slug) LIKE 'lavanderia%') DESC;`);

    const plan = plans[0];
    const bt = bts[0];
    const hasta = '2036-12-31T23:59:59.000+00:00'; // mismo formato que guarda Prisma

    console.log('\n──────── CAMBIOS PROPUESTOS ────────');
    console.log(`Marcar como demo: ${demos.map((d) => `${d.slug} (ahora isDemo=${d.isDemo})`).join(', ') || 'ninguno encontrado'}`);
    console.log(`Bubble Wash · tipo: ${neg.tipoNegocio} → LAVANDERIA${neg.cfgTipo ? ` (también en configuración: ${neg.cfgTipo} → LAVANDERIA)` : ''}`);
    console.log(`Bubble Wash · rubro: ${neg.businessTypeId || '(ninguno)'} → ${bt ? `${bt.slug} (${bt.name})` : 'NO ENCONTRADO, se deja igual'}`);
    console.log(`Bubble Wash · plan: ${sus ? `${sus.plan} [${sus.familia || 'sin familia'}]` : '(sin suscripción)'} → ${plan ? `${plan.name} [${fam.code}] $${plan.price}` : 'NO HAY PLAN DE LAVANDERÍA, se deja igual'}`);
    if (sus && plan) console.log(`Bubble Wash · suscripción: estado ${sus.estado} → active, vence ${String(sus.fechaFin).slice(0, 10)} → 2036-12-31, sin pago pendiente`);
    console.log('Antes se respalda la base en /root/respaldo_antes_datos.db');
    if ((await ask('\n¿Aplicar estos cambios? escribe "si": ')) !== 'si') return;

    const sql = [
      'BEGIN;',
      `UPDATE Negocio SET isDemo=1 WHERE slug IN (${DEMOS.map((d) => `'${d}'`).join(',')});`,
      `UPDATE Negocio SET tipoNegocio='LAVANDERIA'${bt ? `, businessTypeId='${esc(bt.id)}'` : ''}${plan ? `, planExpiresAt='${hasta}'` : ''} WHERE id='${esc(neg.id)}';`,
      neg.cfgTipo ? `UPDATE Negocio SET configuracion=json_set(configuracion,'$.tipoNegocio','LAVANDERIA') WHERE id='${esc(neg.id)}';` : '',
      sus && plan ? `UPDATE Suscripcion SET planId='${esc(plan.id)}', estado='active', fechaFin='${hasta}', pagoPendiente=0, solicitudPlanId=NULL, updatedAt=strftime('%Y-%m-%dT%H:%M:%f+00:00','now') WHERE id='${esc(sus.id)}';` : '',
      'COMMIT;',
    ].filter(Boolean).join(' ');

    await run('Respaldo de la base', `cd ${DIR} && sqlite3 dev.db ".backup '/root/respaldo_antes_datos.db'"`);
    await run('Aplicar cambios', `cd ${DIR} && cat > /tmp/citiox_datos.sql <<'SQLEOF'\n${sql}\nSQLEOF\nsqlite3 dev.db < /tmp/citiox_datos.sql && rm /tmp/citiox_datos.sql`);
    await run('Resultado', `cd ${DIR} && sqlite3 -header -column dev.db "SELECT n.slug, n.isDemo, n.tipoNegocio, b.slug AS rubro, p.name AS plan, s.estado, substr(s.fechaFin,1,10) AS vence FROM Negocio n LEFT JOIN BusinessType b ON b.id=n.businessTypeId LEFT JOIN Suscripcion s ON s.negocioId=n.id LEFT JOIN Plan p ON p.id=s.planId WHERE n.slug IN ('bubblewashuio',${DEMOS.map((d) => `'${d}'`).join(',')});"`, { allowFail: true });
    await run('Comprobar página de Bubble Wash', `echo "$(curl -s -o /dev/null -w '%{http_code}' --max-time 30 http://localhost:3000/bubblewashuio)  /bubblewashuio"`, { allowFail: true });
  },
};

if (!plans[mode]) {
  console.log('Uso: node scripts/vps-actualizar.mjs bot | codigo | paginas-demo | demos | datos | reparar');
  process.exit(1);
}

conn.on('ready', async () => {
  try {
    await plans[mode]();
    console.log('\nListo. Detalle guardado en ' + LOG);
  } catch (e) {
    console.error('\n✖ ' + e.message);
    log('ERROR: ' + e.message);
    process.exitCode = 1;
  } finally {
    conn.end();
  }
});
conn.on('error', (e) => { console.error('No se pudo conectar:', e.message); process.exit(1); });
conn.connect({ host: HOST, port: 22, username: USER, readyTimeout: 20000, ...(KEY ? { privateKey: fs.readFileSync(KEY) } : { password: PASS }) });
