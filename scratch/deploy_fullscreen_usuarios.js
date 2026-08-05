const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const conn = new Client();

const nuevoPageFile = fs.readFileSync(path.join(__dirname, '..', 'src', 'app', 'admin', 'usuarios', 'nuevo', 'page.tsx'), 'utf8');
const usuariosPageFile = fs.readFileSync(path.join(__dirname, '..', 'src', 'app', 'admin', 'usuarios', 'page.tsx'), 'utf8');
const clienteDetailFile = fs.readFileSync(path.join(__dirname, '..', 'src', 'app', 'admin', 'clientes', '[id]', 'page.tsx'), 'utf8');
const usuarioIdApiFile = fs.readFileSync(path.join(__dirname, '..', 'src', 'app', 'api', 'admin', 'usuarios', '[id]', 'route.ts'), 'utf8');

conn.on('ready', () => {
    console.log('🚀 Desplegando pantalla completa de Gestión de Usuarios y Roles al VPS...');
    conn.sftp((err, sftp) => {
        if (err) {
            console.error('Error sftp:', err);
            conn.end();
            return;
        }

        // Crear carpeta /opt/Zenda/src/app/admin/usuarios/nuevo en VPS si no existe
        conn.exec('mkdir -p /opt/Zenda/src/app/admin/usuarios/nuevo', (err) => {
            sftp.writeFile('/opt/Zenda/src/app/admin/usuarios/nuevo/page.tsx', nuevoPageFile, (err) => {
                if (err) console.error('Error nuevo page:', err);
                else console.log('✅ usuarios/nuevo/page.tsx subido.');

                sftp.writeFile('/opt/Zenda/src/app/admin/usuarios/page.tsx', usuariosPageFile, (err) => {
                    if (err) console.error('Error usuarios page:', err);
                    else console.log('✅ usuarios/page.tsx subido.');

                    sftp.writeFile('/opt/Zenda/src/app/admin/clientes/[id]/page.tsx', clienteDetailFile, (err) => {
                        if (err) console.error('Error cliente detail page:', err);
                        else console.log('✅ clientes/[id]/page.tsx subido.');

                        sftp.writeFile('/opt/Zenda/src/app/api/admin/usuarios/[id]/route.ts', usuarioIdApiFile, (err) => {
                            if (err) console.error('Error usuario id api:', err);
                            else console.log('✅ api/admin/usuarios/[id]/route.ts subido.');

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
                                    console.log('🎉 Pantalla completa de Personal y Roles desplegada exitosamente.');
                                    conn.end();
                                });
                            });
                        });
                    });
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
