const { Client } = require('d:\\Documentos\\antigravity\\spa\\Spa\\node_modules\\ssh2');
const fs = require('fs');

const FILE_LOCAL = 'd:\\Documentos\\antigravity\\spa\\Spa\\scratch\\seed_global_gamification.js';
const FILE_REMOTE = '/opt/Zenda/seed-global-gamification.js';

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
  console.log('✅ Conectado al VPS');
  try {
    await new Promise((resolve, reject) => {
      conn.sftp((err, sftp) => {
        if (err) return reject(err);
        sftp.fastPut(FILE_LOCAL, FILE_REMOTE, {}, (err) => {
          if (err) return reject(err);
          resolve();
        });
      });
    });

    console.log('\n🚀 Sembrando Niveles Globales y Temporadas en VPS...\n');
    await exec(conn, 'cd /opt/Zenda && node seed-global-gamification.js');
    await exec(conn, 'rm -f /opt/Zenda/seed-global-gamification.js');
    console.log('\n✅ ¡Sembrado completado con éxito!');
  } catch (e) {
    console.error('❌ Error:', e.message);
  }
  conn.end();
}).connect({ host: '157.173.203.174', port: 22, username: 'root', password: 'Elmassuelto005624' });

conn.on('error', e => { console.error('Error SSH:', e.message); process.exit(1); });
