const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const conn = new Client();
const LOCAL_BASE = 'd:/Documentos/antigravity/spa/Spa';
const VPS_BASE = '/opt/Zenda';

const filesToDeploy = [
    'src/app/api/superadmin/misiones-globales/[id]/route.ts',
    'src/app/api/admin/misiones/route.ts',
    'src/components/superadmin/MisionesGlobalesClient.tsx',
    'src/app/admin/misiones/page.tsx',
    'src/components/superadmin/MisionesUnificadasClient.tsx',
    'src/app/api/superadmin/mission-definitions/[id]/route.ts',
    'src/app/api/superadmin/mission-definitions/[id]/publish/route.ts',
    'src/app/api/superadmin/mission-definitions/[id]/rewards/route.ts',
    'src/components/superadmin/mission-editor/MissionEditorClient.tsx'
];

conn.on('ready', async () => {
    console.log('✅ Conexión SSH establecida con el servidor VPS (157.173.203.174)...');
    
    for (const relPath of filesToDeploy) {
        const localPath = path.join(LOCAL_BASE, relPath);
        const remotePath = `${VPS_BASE}/${relPath.replace(/\\/g, '/')}`;
        
        if (fs.existsSync(localPath)) {
            const content = fs.readFileSync(localPath, 'utf8');
            const remoteDir = path.dirname(remotePath).replace(/\\/g, '/');
            
            // Asegurar directorio remoto
            await new Promise((resolve) => {
                conn.exec(`mkdir -p "${remoteDir}"`, (err, stream) => {
                    if (err) return resolve();
                    stream.on('close', resolve);
                    stream.on('data', () => {});
                });
            });

            await new Promise((resolve, reject) => {
                conn.exec(`cat << 'EOF' > "${remotePath}"\n${content}\nEOF`, (err, stream) => {
                    if (err) return reject(err);
                    stream.on('close', resolve);
                    stream.on('data', () => {});
                });
            });
            console.log(`📤 Desplegado en VPS: ${relPath}`);
        } else {
            console.warn(`⚠️ Archivo local no encontrado: ${localPath}`);
        }
    }

    console.log('🔨 Compilando la aplicación Next.js en el VPS y reiniciando PM2...');
    conn.exec(`cd ${VPS_BASE} && npx prisma generate && npm run build && pm2 restart all`, (err, stream) => {
        if (err) throw err;
        let out = '';
        stream.on('data', d => { process.stdout.write(d.toString()); out += d.toString(); });
        stream.stderr.on('data', d => { process.stderr.write(d.toString()); out += d.toString(); });
        stream.on('close', () => {
            console.log('\n🚀 ¡Despliegue y reinicio en producción completados con éxito!');
            conn.end();
        });
    });
}).on('error', (err) => {
    console.error('❌ Error de conexión SSH:', err.message);
    process.exit(1);
}).connect({ 
    host: '157.173.203.174', 
    port: 22, 
    username: 'root', 
    password: 'Elmassuelto005624' 
});
