const { Client } = require('ssh2');

const conn = new Client();
const PG = `PGPASSWORD="CitioxProd2024!" psql -U zenda_user -h 127.0.0.1 -d zenda_db`;

conn.on('ready', () => {
  console.log('Conectado al VPS. Auditando tabla Promotion y Negocio en PostgreSQL...\n');

  const cmd = `
    echo "=== TODAS LAS PROMOCIONES EN PRODUCCIÓN ==="
    ${PG} -c 'SELECT id, "businessId", titulo, estado, "precioPromo" FROM "Promotion";' 2>&1

    echo ""
    echo "=== NEGOCIOS Y CONTEO DE PROMOCIONES ==="
    ${PG} -c '
      SELECT n.id, n.nombre, n.slug, COUNT(p.id) as total_promos,
             COUNT(CASE WHEN p.estado IN ('"'"'activa'"'"', '"'"'activo'"'"', '"'"'ACTIVA'"'"', '"'"'ACTIVO'"'"') THEN 1 END) as promos_activas
      FROM "Negocio" n
      LEFT JOIN "Promotion" p ON p."businessId" = n.id
      GROUP BY n.id, n.nombre, n.slug
      ORDER BY total_promos DESC;
    ' 2>&1
  `;

  conn.exec(cmd, (err, stream) => {
    if (err) { console.error(err); conn.end(); return; }
    let out = '';
    stream.on('data', (d) => { out += d; process.stdout.write(d); });
    stream.stderr.on('data', (d) => { process.stderr.write(d); });
    stream.on('close', () => {
      conn.end();
    });
  });
}).connect({ host: '157.173.203.174', port: 22, username: 'root', password: 'Elmassuelto005624' });
