const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const negocio = await prisma.negocio.findFirst({
    where: { OR: [{ slug: 'lavado' }, { tipoNegocio: 'SHOE_CARE' }] }
  });

  if (!negocio) {
    console.log('No negocio found');
    return;
  }

  const contentHtml = `
  <div style="font-family: system-ui, sans-serif; max-width: 1000px; margin: 0 auto; padding: 20px;">
    <h2 style="text-align: center; font-size: 28px; font-weight: 900; color: #0f172a; margin-bottom: 24px;">¿Cómo funciona?</h2>
    
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 24px;">
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 24px; padding: 24px;">
        <h3 style="font-size: 18px; font-weight: 900; color: #0f172a; margin-bottom: 16px;">🏪 Entrega en el local</h3>
        <ol style="line-height: 1.8; font-weight: 600; color: #334155; padding-left: 20px;">
          <li>Traes tus zapatos.</li>
          <li>Los inspeccionamos.</li>
          <li>Tomamos fotografías.</li>
          <li>Creamos tu orden.</li>
          <li>Indicamos fecha de entrega.</li>
          <li>Recibes WhatsApp cuando estén listos.</li>
        </ol>
      </div>

      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 24px; padding: 24px;">
        <h3 style="font-size: 18px; font-weight: 900; color: #0f172a; margin-bottom: 16px;">🛵 Retiro a domicilio</h3>
        <ol style="line-height: 1.8; font-weight: 600; color: #334155; padding-left: 20px;">
          <li>Solicitas retiro.</li>
          <li>Elegimos horario.</li>
          <li>Recogemos tus zapatos.</li>
          <li>Los inspeccionamos.</li>
          <li>Confirmamos el precio.</li>
          <li>Los lavamos.</li>
          <li>Te notificamos.</li>
          <li>Te los entregamos.</li>
        </ol>
      </div>
    </div>
  </div>
  `;

  const p = await prisma.page.upsert({
    where: { id: 'cm_como_funciona_lavado' },
    update: { title: '¿Cómo funciona?', contentHtml, status: 'published', updatedAt: new Date() },
    create: {
      id: 'cm_como_funciona_lavado',
      businessId: negocio.id,
      title: '¿Cómo funciona?',
      slug: 'como-funciona',
      contentHtml,
      status: 'published',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  });

  console.log('SUCCESS_CREATED_PAGE:', p.id);
}

run().catch(console.error).finally(() => prisma.$disconnect());
