const { Client } = require('d:\\Documentos\\antigravity\\spa\\Spa\\node_modules\\ssh2');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const LOCAL_ROOT = 'd:\\Documentos\\antigravity\\spa\\Spa';
const REMOTE_ROOT = '/opt/Zenda';

// Obtener estado de git
const gitStatus = execSync('git status --porcelain', { cwd: LOCAL_ROOT }).toString();

const filesToUpload = [];
const filesToDelete = [];

function getFilesRecursively(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
            getFilesRecursively(filePath, fileList);
        } else {
            fileList.push(filePath);
        }
    }
    return fileList;
}

gitStatus.split('\n').forEach(line => {
    if (!line.trim()) return;
    const status = line.substring(0, 2).trim();
    const relPath = line.substring(3).trim();

    // Ignorar bases de datos locales, temporales, scripts de scratch y configs de build
    if (
        relPath === 'dev.db' ||
        relPath === 'tsconfig.tsbuildinfo' ||
        relPath.startsWith('scratch/') ||
        relPath.startsWith('check') ||
        relPath.endsWith('.log') ||
        relPath.includes('.gemini')
    ) {
        return;
    }

    // Solo subir carpetas y archivos dentro de src, public, prisma
    if (!relPath.startsWith('src/') && !relPath.startsWith('public/') && !relPath.startsWith('prisma/')) {
        return;
    }

    const localPath = path.join(LOCAL_ROOT, relPath);

    if (status === 'D') {
        filesToDelete.push(relPath);
    } else {
        if (fs.existsSync(localPath)) {
            const stat = fs.statSync(localPath);
            if (stat.isDirectory()) {
                const innerFiles = getFilesRecursively(localPath);
                innerFiles.forEach(f => {
                    const innerRel = path.relative(LOCAL_ROOT, f);
                    filesToUpload.push({
                        local: f,
                        remote: path.join(REMOTE_ROOT, innerRel).replace(/\\/g, '/')
                    });
                });
            } else {
                filesToUpload.push({
                    local: localPath,
                    remote: path.join(REMOTE_ROOT, relPath).replace(/\\/g, '/')
                });
            }
        }
    }
});

// Asegurar que no haya duplicados en filesToUpload
const uniqueFilesMap = new Map();
filesToUpload.forEach(f => uniqueFilesMap.set(f.remote, f.local));
const finalUploadList = Array.from(uniqueFilesMap.entries()).map(([remote, local]) => ({ local, remote }));

console.log(`📋 Total de archivos a subir: ${finalUploadList.length}`);
console.log(`🗑️ Total de archivos a borrar: ${filesToDelete.length}`);

if (finalUploadList.length === 0 && filesToDelete.length === 0) {
    console.log('✨ No hay cambios pendientes de subir.');
    process.exit(0);
}

// Obtener todas las carpetas remotas únicas que necesitamos crear
const remoteDirs = new Set();
finalUploadList.forEach(f => {
    remoteDirs.add(path.dirname(f.remote).replace(/\\/g, '/'));
});
const sortedDirs = Array.from(remoteDirs).sort((a, b) => a.length - b.length);

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
        // 1. Eliminar archivos remotos marcados para borrar en Git
        if (filesToDelete.length > 0) {
            console.log('▶ Eliminando archivos remotos...');
            for (const file of filesToDelete) {
                const remoteDeletePath = path.join(REMOTE_ROOT, file).replace(/\\/g, '/');
                await exec(conn, `rm -f "${remoteDeletePath}"`);
                console.log(`   └─ Borrado: ${file}`);
            }
        }

        // 2. Crear directorios necesarios
        console.log('▶ Creando directorios remotos necesarios...');
        for (const dir of sortedDirs) {
            await exec(conn, `mkdir -p "${dir}"`);
        }

        // 3. Subir archivos modificados/nuevos por SFTP
        await new Promise((resolve, reject) => {
            conn.sftp(async (err, sftp) => {
                if (err) return reject(err);
                console.log('▶ Subiendo archivos modificados por SFTP...');
                for (const file of finalUploadList) {
                    await new Promise((res, rej) => {
                        sftp.fastPut(file.local, file.remote, {}, (err) => {
                            if (err) {
                                console.error(`❌ Error al subir: ${file.remote}`, err);
                                rej(err);
                            } else {
                                console.log(`   └─ Subido: ${path.relative(LOCAL_ROOT, file.local)}`);
                                res();
                            }
                        });
                    });
                }
                resolve();
            });
        });

        // 4. Ejecutar comandos de construcción en el VPS
        console.log('▶ Actualizando esquema de la base de datos y generando cliente de Prisma...');
        await exec(conn, 'cd /opt/Zenda && npx prisma db push --accept-data-loss && npx prisma generate');

        console.log('▶ Recompilando la aplicación Next.js en el VPS...');
        await exec(conn, 'cd /opt/Zenda && rm -rf .next && npm run build && pm2 restart zenda-app');

        console.log('\n🚀 ¡Despliegue dinámico completado con éxito!');
        
    } catch (e) {
        console.error('❌ Error durante el despliegue:', e);
    }
    conn.end();
}).connect({ host: '157.173.203.174', port: 22, username: 'root', password: 'Elmassuelto005624' });
conn.on('error', e => { console.error('Error SSH:', e.message); process.exit(1); });
