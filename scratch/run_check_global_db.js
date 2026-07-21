const { Client } = require('d:\\Documentos\\antigravity\\spa\\Spa\\node_modules\\ssh2');
const fs = require('fs');

const FILE_LOCAL = 'd:\\Documentos\\antigravity\\spa\\Spa\\scratch\\check_global_gamification_db.js';
const FILE_REMOTE = '/opt/Zenda/check-global-gamification-db.js';

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

    console.log('\n🚀 Verificando tablas Globales en VPS...\n');
    await exec(conn, 'cd /opt/Zenda && node check-global-gamification-db.js');
    await exec(conn, 'rm -f /opt/Zenda/check-global-gamification-db.js');
  } catch (e) {
    console.error('❌ Error:', e.message);
  }
  conn.end();
}).connect({ host: '157.173.203.174', port: 22, username: 'root', password: 'Elmassuelto005624' });

conn.on('error', e => { console.error('Error SSH:', e.message); process.exit(1); });
