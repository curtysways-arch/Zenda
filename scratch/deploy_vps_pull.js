const { Client } = require('d:\\Documentos\\antigravity\\spa\\Spa\\node_modules\\ssh2');

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
    console.log('✅ Conectado al VPS por SSH para desplegar...');
    try {
        // 1. Sincronizar código limpiando conflictos locales
        console.log('▶ Ejecutando git fetch y reset hard en el VPS...');
        await exec(conn, 'cd /opt/Zenda && git fetch origin main && git reset --hard origin/main && git clean -fd');

        // 2. Actualizar esquema de base de datos
        console.log('▶ Actualizando esquema de la base de datos (Prisma db push)...');
        await exec(conn, 'cd /opt/Zenda && npx prisma generate && npx prisma db push --accept-data-loss');

        // 3. Recompilar Next.js en producción
        console.log('▶ Compilando la aplicación Next.js en el servidor...');
        await exec(conn, 'cd /opt/Zenda && rm -rf .next && npm run build');

        // 4. Reiniciar PM2
        console.log('▶ Reiniciando el servidor de Node con PM2...');
        await exec(conn, 'cd /opt/Zenda && pm2 restart zenda-app');

        console.log('\n🚀 ¡Despliegue del VPS completado con éxito!');

    } catch (e) {
        console.error('❌ Error durante el despliegue del VPS:', e);
    }
    conn.end();
}).connect({ host: '157.173.203.174', port: 22, username: 'root', password: 'Elmassuelto005624' });

conn.on('error', e => { 
    console.error('Error SSH:', e.message); 
    process.exit(1); 
});
