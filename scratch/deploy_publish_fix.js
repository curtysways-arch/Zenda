const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const conn = new Client();
const LOCAL_BASE = 'd:/Documentos/antigravity/spa/Spa';
const VPS_BASE = '/opt/Zenda';

const filesToDeploy = [
    'src/components/superadmin/MisionesUnificadasClient.tsx',
    'src/app/api/superadmin/mission-definitions/[id]/publish/route.ts'
];

conn.on('ready', () => {
    console.log('✅ Conexión SSH establecida con el VPS (157.173.203.174)...');
    
    conn.sftp((err, sftp) => {
        if (err) {
            console.error('❌ Error abriendo SFTP:', err);
            conn.end();
            process.exit(1);
        }

        let completed = 0;
        filesToDeploy.forEach((relPath) => {
            const localPath = path.join(LOCAL_BASE, relPath);
            const remotePath = `${VPS_BASE}/${relPath.replace(/\\/g, '/')}`;

            if (fs.existsSync(localPath)) {
                sftp.fastPut(localPath, remotePath, (err) => {
                    if (err) {
                        console.error(`❌ Error al subir ${relPath}:`, err.message);
                    } else {
                        console.log(`📤 Desplegado en VPS (SFTP): ${relPath}`);
                    }
                    completed++;
                    if (completed === filesToDeploy.length) {
                        onUploadsFinished();
                    }
                });
            } else {
                console.warn(`⚠️ Archivo local no encontrado: ${localPath}`);
                completed++;
                if (completed === filesToDeploy.length) {
                    onUploadsFinished();
                }
            }
        });
    });
});

function onUploadsFinished() {
    console.log('🔨 Compilando la aplicación Next.js en el VPS y reiniciando PM2...');
    conn.exec(`cd ${VPS_BASE} && npm run build && pm2 restart zenda-app`, (err, stream) => {
        if (err) {
            console.error('❌ Error de compilación:', err);
            conn.end();
            process.exit(1);
        }
        let out = '';
        stream.on('data', d => { process.stdout.write(d.toString()); out += d.toString(); });
        stream.stderr.on('data', d => { process.stderr.write(d.toString()); out += d.toString(); });
        stream.on('close', (code) => {
            console.log(`\n🚀 ¡Despliegue y reinicio en producción completados! (Código final: ${code})`);
            conn.end();
        });
    });
}

conn.on('error', (err) => {
    console.error('❌ Error SSH:', err.message);
    process.exit(1);
}).connect({ 
    host: '157.173.203.174', 
    port: 22, 
    username: 'root', 
    password: 'Elmassuelto005624',
    keepaliveInterval: 10000
});
