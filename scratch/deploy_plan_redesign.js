const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const conn = new Client();

const helperFile = fs.readFileSync(path.join(__dirname, '..', 'src', 'lib', 'planFeaturesHelper.ts'), 'utf8');
const adminPlanFile = fs.readFileSync(path.join(__dirname, '..', 'src', 'app', 'admin', 'plan', 'PlanDashboardClient.tsx'), 'utf8');
const superadminPlanesFile = fs.readFileSync(path.join(__dirname, '..', 'src', 'app', 'superadmin', 'planes', 'page.tsx'), 'utf8');

conn.on('ready', () => {
    console.log('🚀 Desplegando diseño de planes con emojis y viñetas al VPS...');
    conn.sftp((err, sftp) => {
        if (err) {
            console.error('Error sftp:', err);
            conn.end();
            return;
        }

        sftp.writeFile('/opt/Zenda/src/lib/planFeaturesHelper.ts', helperFile, (err) => {
            if (err) console.error('Error helper:', err);
            else console.log('✅ planFeaturesHelper.ts subido.');

            sftp.writeFile('/opt/Zenda/src/app/admin/plan/PlanDashboardClient.tsx', adminPlanFile, (err) => {
                if (err) console.error('Error admin plan:', err);
                else console.log('✅ PlanDashboardClient.tsx subido.');

                sftp.writeFile('/opt/Zenda/src/app/superadmin/planes/page.tsx', superadminPlanesFile, (err) => {
                    if (err) console.error('Error superadmin planes:', err);
                    else console.log('✅ superadmin/planes/page.tsx subido.');

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
                            console.log('🎉 Despliegue de planes completado exitosamente.');
                            conn.end();
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
