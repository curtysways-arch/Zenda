const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  console.log('SSH conectado! Consultando colores de barber-co en producción...');
  
  const command = 'cd /opt/Zenda && npx tsx -e "' +
    'import \\"dotenv/config\\"; ' +
    'import prisma from \\"./src/lib/prisma\\"; ' +
    'prisma.negocio.findUnique({ ' +
    '  where: { slug: \\"barber-co\\" }, ' +
    '  select: { id: true, nombre: true, colorPrimario: true, colorSecundario: true, colorTerciario: true, colorNeutral: true, colorTexto: true, colorSubTexto: true } ' +
    '}).then(res => { ' +
    '  console.log(\\"=== COLORES BARBER-CO ===\\"); ' +
    '  console.log(JSON.stringify(res, null, 2)); ' +
    '}).catch(console.error);' +
    '"';

  conn.exec(command, (err, stream) => {
    if (err) { console.error(err); return; }
    stream.on('close', () => {
      conn.end();
    })
    .on('data', d => process.stdout.write(d.toString() + '\n'))
    .stderr.on('data', d => process.stderr.write(d.toString()));
  });
}).connect({ host: '157.173.203.174', port: 22, username: 'root', password: 'Elmassuelto005624', readyTimeout: 15000 });
conn.on('error', e => console.error('Error:', e.message));
