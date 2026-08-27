const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  conn.exec('cat /opt/Zenda/.env', (err, stream) => {
    let out = '';
    stream.on('data', d => { out += d.toString(); });
    stream.stderr.on('data', d => { out += d.toString(); });
    stream.on('close', () => {
      console.log('=== VPS .ENV ===');
      console.log(out);
      conn.end();
    });
  });
}).connect({ host: '157.173.203.174', port: 22, username: 'root', password: 'Elmassuelto005624' });
