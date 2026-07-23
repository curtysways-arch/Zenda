const { Client } = require('ssh2');
const conn = new Client();
const PROJECT_DIR = '/opt/Zenda';

const vpsScriptContent = `
const fs = require('fs');

const envPath = '/opt/Zenda/.env';
if (fs.existsSync(envPath)) {
    const envLines = fs.readFileSync(envPath, 'utf8').split('\\n');
    envLines.forEach(line => {
        const m = line.trim().match(/^([^#=]+)=(.*)$/);
        if (m) {
            const key = m[1].trim();
            let val = m[2].trim();
            if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
            if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
            process.env[key] = val;
        }
    });
}

const { PrismaClient } = require('@prisma/client');
let prisma;

const dbUrl = process.env.DATABASE_URL || 'file:./dev.db';

if (dbUrl.startsWith('postgresql://') || dbUrl.startsWith('postgres://')) {
    const { Pool } = require('pg');
    const { PrismaPg } = require('@prisma/adapter-pg');
    const pool = new Pool({ connectionString: dbUrl });
    const adapter = new PrismaPg(pool);
    prisma = new PrismaClient({ adapter });
} else {
    const { PrismaLibSql } = require('@prisma/adapter-libsql');
    const adapter = new PrismaLibSql({ url: dbUrl });
    prisma = new PrismaClient({ adapter });
}

async function main() {
    try {
        console.log("=== COMPLETING PROFILE MISSION DIRECTLY IN DB ===");
        const negocioId = "bceea0c8-e464-4a9e-b944-dd8bcef8f179";
        const userId = "3c5c60ea-670e-4b23-b2c4-07d8de2bdcb2";

        // Find profile business mission
        const profilebm = await prisma.businessMission.findFirst({
            where: {
                negocioId,
                MissionDefinition: {
                    triggerEvent: 'PROFILE_COMPLETED'
                }
            }
        });

        if (!profilebm) {
            console.log("No profile BusinessMission found for negocio", negocioId);
            return;
        }

        console.log("Found profile BusinessMission:", profilebm.id);

        const existing = await prisma.businessMissionProgress.findUnique({
            where: {
                businessMissionId_userId: {
                    businessMissionId: profilebm.id,
                    userId
                }
            }
        });

        if (existing) {
            await prisma.businessMissionProgress.update({
                where: { id: existing.id },
                data: {
                    progresoActual: 1,
                    progresoRequerido: 1,
                    estado: 'RECOMPENSADA',
                    recompensaDada: true,
                    fechaCompletada: new Date()
                }
            });
            console.log("Updated BusinessMissionProgress to RECOMPENSADA!");
        } else {
            await prisma.businessMissionProgress.create({
                data: {
                    businessMissionId: profilebm.id,
                    userId,
                    progresoActual: 1,
                    progresoRequerido: 1,
                    estado: 'RECOMPENSADA',
                    recompensaDada: true,
                    fechaCompletada: new Date()
                }
            });
            console.log("Created BusinessMissionProgress as RECOMPENSADA!");
        }
    } catch (e) {
        console.error("Error in DB mission update:", e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
`;

conn.on('ready', () => {
    conn.exec(`cat << 'EOF' > ${PROJECT_DIR}/scratch/complete-profile-db.js\n${vpsScriptContent}\nEOF`, (err, stream) => {
        if (err) throw err;
        stream.on('close', () => {
            conn.exec(`node ${PROJECT_DIR}/scratch/complete-profile-db.js`, (err2, stream2) => {
                if (err2) throw err2;
                let out = '';
                stream2.on('data', d => { out += d.toString(); });
                stream2.stderr.on('data', d => { console.error('STDERR:', d.toString()); });
                stream2.on('close', () => {
                    console.log('OUTPUT FROM VPS:');
                    console.log(out);
                    conn.end();
                });
            });
        });
        stream.on('data', () => {});
    });
}).connect({ host: '157.173.203.174', port: 22, username: 'root', password: 'Elmassuelto005624' });
