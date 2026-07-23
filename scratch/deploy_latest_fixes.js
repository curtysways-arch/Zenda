const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const conn = new Client();
const LOCAL_BASE = 'd:/Documentos/antigravity/spa/Spa';
const VPS_BASE = '/opt/Zenda';

const filesToDeploy = [
    'src/app/admin/layout.tsx',
    'src/components/public/ProductsStoreClient.tsx',
    'src/app/api/[slug]/perfil/route.ts',
    'src/app/api/public/[slug]/misiones/route.ts',
    'src/lib/growth/globalMissionEngine.ts'
];

conn.on('ready', async () => {
    console.log('SSH connection established for deployment.');
    
    for (const relPath of filesToDeploy) {
        const localPath = path.join(LOCAL_BASE, relPath);
        const remotePath = `${VPS_BASE}/${relPath.replace(/\\/g, '/')}`;
        
        if (fs.existsSync(localPath)) {
            const content = fs.readFileSync(localPath, 'utf8');
            await new Promise((resolve, reject) => {
                conn.exec(`cat << 'EOF' > "${remotePath}"\n${content}\nEOF`, (err, stream) => {
                    if (err) return reject(err);
                    stream.on('close', resolve);
                    stream.on('data', () => {});
                });
            });
            console.log(`Deployed: ${relPath}`);
        } else {
            console.warn(`Local file missing: ${localPath}`);
        }
    }

    console.log('Building and restarting PM2 on VPS...');
    conn.exec(`cd ${VPS_BASE} && npm run build && pm2 restart all`, (err, stream) => {
        if (err) throw err;
        let out = '';
        stream.on('data', d => { out += d.toString(); });
        stream.stderr.on('data', d => { out += d.toString(); });
        stream.on('close', () => {
            console.log('BUILD & PM2 RESTART OUTPUT:');
            console.log(out.slice(-1000));
            conn.end();
        });
    });
}).connect({ host: '157.173.203.174', port: 22, username: 'root', password: 'Elmassuelto005624' });
