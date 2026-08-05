const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const conn = new Client();

const clientePageFile = fs.readFileSync(path.join(__dirname, '..', 'src', 'app', 'admin', 'clientes', 'page.tsx'), 'utf8');
const clienteDetailFile = fs.readFileSync(path.join(__dirname, '..', 'src', 'app', 'admin', 'clientes', '[id]', 'page.tsx'), 'utf8');
const mobileClientsFile = fs.readFileSync(path.join(__dirname, '..', 'src', 'components', 'admin', 'mobile', 'MobileClients.tsx'), 'utf8');

conn.on('ready', () => {
    console.log('🚀 Desplegando vista a pantalla completa de Ficha del Cliente al VPS...');
    conn.sftp((err, sftp) => {
        if (err) {
            console.error('Error sftp:', err);
            conn.end();
            return;
        }

        // Crear directorio [id] si no existe
        sftp.mkdir('/opt/Zenda/src/app/admin/clientes/[id]', (err) => {
            // Ignorar error si ya existe

            sftp.writeFile('/opt/Zenda/src/app/admin/clientes/page.tsx', clientePageFile, (err) => {
                if (err) console.error('Error clientes page:', err);
                else console.log('✅ clientes/page.tsx subido.');

                sftp.writeFile('/opt/Zenda/src/app/admin/clientes/[id]/page.tsx', clienteDetailFile, (err) => {
                    if (err) console.error('Error cliente detail page:', err);
                    else console.log('✅ clientes/[id]/page.tsx subido.');

                    sftp.writeFile('/opt/Zenda/src/components/admin/mobile/MobileClients.tsx', mobileClientsFile, (err) => {
                        if (err) console.error('Error MobileClients:', err);
                        else console.log('✅ MobileClients.tsx subido.');

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
                                console.log('🎉 Ficha de cliente a pantalla completa desplegada exitosamente.');
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
