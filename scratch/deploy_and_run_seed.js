const { Client } = require('d:\\Documentos\\antigravity\\spa\\Spa\\node_modules\\ssh2');
const fs = require('fs');
const path = require('path');

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
    console.log('✅ Conectado al VPS por SSH para la siembra...');
    try {
        const localSeedPath = path.join(__dirname, 'seed_marketplace_templates_vps.js');
        const remoteSeedPath = '/opt/Zenda/seed_marketplace_templates_vps.js';

        // 1. Subir el archivo de siembra al VPS
        await new Promise((resolve, reject) => {
            conn.sftp((err, sftp) => {
                if (err) return reject(err);
                console.log('▶ Subiendo script de siembra al VPS por SFTP...');
                sftp.fastPut(localSeedPath, remoteSeedPath, {}, (err) => {
                    if (err) {
                        console.error('❌ Error al subir script de siembra:', err);
                        reject(err);
                    } else {
                        console.log('   └─ Subido con éxito.');
                        resolve();
                    }
                });
            });
        });

        // 2. Ejecutar el script en el VPS localmente
        console.log('▶ Ejecutando el script de siembra en la base de datos de producción...');
        const res = await exec(conn, 'cd /opt/Zenda && node seed_marketplace_templates_vps.js');
        
        if (res.code === 0) {
            console.log('✅ Siembra completada con éxito en el servidor de producción.');
        } else {
            console.error('❌ La ejecución del script de siembra falló con código:', res.code);
        }

        // 3. Limpiar y eliminar el script de siembra del servidor
        console.log('▶ Limpiando archivos temporales en el VPS...');
        await exec(conn, 'rm -f /opt/Zenda/seed_marketplace_templates_vps.js');
        console.log('   └─ Archivo temporal eliminado.');

    } catch (e) {
        console.error('❌ Error durante el proceso de siembra remota:', e);
    }
    conn.end();
}).connect({ host: '157.173.203.174', port: 22, username: 'root', password: 'Elmassuelto005624' });

conn.on('error', e => { 
    console.error('Error SSH:', e.message); 
    process.exit(1); 
});
