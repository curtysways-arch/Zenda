const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const conn = new Client();

const comunicacionFile = fs.readFileSync(path.join(__dirname, '..', 'src', 'app', 'admin', 'comunicacion', 'page.tsx'), 'utf8');

conn.on('ready', () => {
    console.log('🚀 Desplegando corrección de color de texto en Sistema de Comunicación al VPS...');
    conn.sftp((err, sftp) => {
        if (err) {
            console.error('Error sftp:', err);
            conn.end();
            return;
        }

        sftp.writeFile('/opt/Zenda/src/app/admin/comunicacion/page.tsx', comunicacionFile, (err) => {
            if (err) {
                console.error('Error comunicacion page:', err);
                conn.end();
                return;
            }
            console.log('✅ page.tsx subido.');

            console.log('🔨 Compilando Next.js en VPS y reiniciando zenda-app...');
            const buildCmd = 'cd /opt/Zenda && npm run build && pm2 restart zenda-app';
            conn.exec(buildCmd, (err, stream) => {
                if (err) {
                    console.error('Error exec build:', err);
                    conn.end();
                    return;
                }
                stream.on('data', d => process.stdout.write(d.toString()));
                stream.stderr.on('data', d => process.stderr.write(d.toString()));
                stream.on('close', () => {
                    console.log('🎉 Corrección de color desplegada exitosamente.');
                    conn.end();
                });
            });
        });
    });
}).connect({ 
    host: '157.173.203.174', 
    port: 22, 
    username: 'root', 
    password: 'Elmassuelto005624'
});
