const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

// Cargar .env manualmente si existe
try {
    const envPath = path.join(__dirname, '../.env');
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        envContent.split(/\r?\n/).forEach(line => {
            const match = line.match(/^\s*([^#=]+)\s*=\s*(.*)$/);
            if (match) {
                const key = match[1].trim();
                let val = match[2].trim();
                if (val.startsWith('"') && val.endsWith('"')) {
                    val = val.substring(1, val.length - 1);
                } else if (val.startsWith("'") && val.endsWith("'")) {
                    val = val.substring(1, val.length - 1);
                }
                process.env[key] = val;
            }
        });
    }
} catch (e) {
    console.error('Error al cargar .env:', e);
}

function createPrismaClient() {
    const dbUrl = process.env.DATABASE_URL || 'file:./dev.db';

    if (dbUrl.startsWith('postgresql://') || dbUrl.startsWith('postgres://')) {
        const { Pool } = require('pg');
        const { PrismaPg } = require('@prisma/adapter-pg');
        const pool = new Pool({ connectionString: dbUrl });
        const adapter = new PrismaPg(pool);
        return new PrismaClient({ adapter });
    } else {
        const { createClient } = require('@libsql/client');
        const { PrismaLibSql } = require('@prisma/adapter-libsql');
        
        let resolvedUrl = dbUrl;
        if (!dbUrl.startsWith('file://')) {
            const rawPath = dbUrl.replace(/^file:(\.\/)?/, '');
            const isAbsolute = rawPath.startsWith('/') || rawPath.startsWith('\\') || /^[a-zA-Z]:/.test(rawPath);
            const absPath = isAbsolute ? rawPath : `${process.cwd()}/${rawPath}`;
            const normalized = absPath.split(/[/\\]/).join('/');
            const prefix = normalized.match(/^[a-zA-Z]:/) ? '/' : '';
            resolvedUrl = `file://${prefix}${normalized}`;
        }
        
        const client = createClient({ url: resolvedUrl });
        const adapter = new PrismaLibSql(client);
        return new PrismaClient({ adapter });
    }
}

const prisma = createPrismaClient();

async function main() {
  console.log('[Migración] Iniciando migración de campañas de referidos a fidelización...');
  
  // 1. Obtener todas las campañas existentes
  const campaigns = await prisma.referralCampaign.findMany();
  
  console.log(`[Migración] Encontradas ${campaigns.length} campañas en total.`);
  
  let migratedCount = 0;
  for (const campaign of campaigns) {
    // Si los nuevos campos están nulos, inicializarlos con el comportamiento heredado
    const updates = {};
    
    if (!campaign.estado) {
      updates.estado = campaign.activa ? 'ACTIVA' : 'PAUSADA';
    }
    if (!campaign.tipoCampana) {
      updates.tipoCampana = 'CLIENTES_NUEVOS';
    }
    if (campaign.permitirRepetir === null) {
      updates.permitirRepetir = false;
    }
    if (campaign.prioridad === null) {
      updates.prioridad = 0;
    }
    if (campaign.combinable === null) {
      updates.combinable = false;
    }

    if (Object.keys(updates).length > 0) {
      await prisma.referralCampaign.update({
        where: { id: campaign.id },
        data: updates
      });
      migratedCount++;
    }
  }
  
  console.log(`[Migración] ✅ Migradas con éxito ${migratedCount} campañas.`);
}

main()
  .catch(e => {
    console.error('[Migración] Error ejecutando la migración:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
