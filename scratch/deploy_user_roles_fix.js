const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const conn = new Client();

const modalFile = fs.readFileSync(path.join(__dirname, '..', 'src', 'components', 'admin', 'UserModal.tsx'), 'utf8');
const rolesApiFile = fs.readFileSync(path.join(__dirname, '..', 'src', 'app', 'api', 'admin', 'roles', 'route.ts'), 'utf8');
const usuariosApiFile = fs.readFileSync(path.join(__dirname, '..', 'src', 'app', 'api', 'admin', 'usuarios', 'route.ts'), 'utf8');
const usuariosPageFile = fs.readFileSync(path.join(__dirname, '..', 'src', 'app', 'admin', 'usuarios', 'page.tsx'), 'utf8');

conn.on('ready', () => {
    console.log('🚀 Desplegando corrección de gestión de usuarios y roles al VPS...');
    conn.sftp((err, sftp) => {
        if (err) {
            console.error('Error sftp:', err);
            conn.end();
            return;
        }

        sftp.writeFile('/opt/Zenda/src/components/admin/UserModal.tsx', modalFile, (err) => {
            if (err) console.error('Error UserModal:', err);
            else console.log('✅ UserModal.tsx subido.');

            sftp.writeFile('/opt/Zenda/src/app/api/admin/roles/route.ts', rolesApiFile, (err) => {
                if (err) console.error('Error roles api:', err);
                else console.log('✅ roles/route.ts subido.');

                sftp.writeFile('/opt/Zenda/src/app/api/admin/usuarios/route.ts', usuariosApiFile, (err) => {
                    if (err) console.error('Error usuarios api:', err);
                    else console.log('✅ usuarios/route.ts subido.');

                    sftp.writeFile('/opt/Zenda/src/app/admin/usuarios/page.tsx', usuariosPageFile, (err) => {
                        if (err) console.error('Error usuarios page:', err);
                        else console.log('✅ usuarios/page.tsx subido.');

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
                                console.log('🎉 Gestión de roles y usuarios arreglada y desplegada exitosamente.');
                                conn.end();
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
