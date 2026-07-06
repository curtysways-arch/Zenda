const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

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
