const { Client } = require('d:\\Documentos\\antigravity\\spa\\Spa\\node_modules\\ssh2');
const fs = require('fs');

const SEED_LOCAL = 'd:\\Documentos\\antigravity\\spa\\Spa\\scratch\\seed_loyalty_universal.js';
const SEED_REMOTE = '/opt/Zenda/seed-loyalty-universal.js';

const conn = new Client();

function exec(conn, cmd) {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, { pty: false }, (err, stream) => {
      if (err) return reject(err);
      let out = '';
      stream.on('data', d => { process.stdout.write(d.toString()); out += d.toString(); });
      stream.stderr.on('data', d => { process.stderr.write(d.toString()); out += d.toString(); });
      stream.on('close', code => resolve({ code, out }));
    });
  });
}

conn.on('ready', async () => {
  console.log('✅ Conectado al VPS por SSH');
  try {
    // Subir el script vía SFTP
    await new Promise((resolve, reject) => {
      conn.sftp((err, sftp) => {
        if (err) return reject(err);
        sftp.fastPut(SEED_LOCAL, SEED_REMOTE, {}, (err) => {
          if (err) return reject(err);
          console.log('📤 Script subido al VPS');
          resolve();
        });
      });
    });

    // Ejecutar el script en el directorio del proyecto
    console.log('\n🚀 Ejecutando seed de lealtad (Universal) en VPS...\n');
    const result = await exec(conn, 'cd /opt/Zenda && node seed-loyalty-universal.js');

    // Limpiar el script del VPS
    await exec(conn, 'rm -f /opt/Zenda/seed-loyalty-universal.js');
    console.log('\n🧹 Script eliminado del VPS');

    if (result.code !== 0) {
      console.error('\n❌ El script terminó con errores');
      process.exit(1);
    }

    console.log('\n✅ ¡Niveles y Temporada de lealtad creados con éxito en el VPS!');
  } catch (e) {
    console.error('❌ Error:', e.message);
  }
  conn.end();
}).connect({ host: '157.173.203.174', port: 22, username: 'root', password: 'Elmassuelto005624' });

conn.on('error', e => { console.error('Error SSH:', e.message); process.exit(1); });
