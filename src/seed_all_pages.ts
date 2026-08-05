import prisma from './lib/prisma';

async function seedPages() {
  const negocios = await prisma.negocio.findMany();
  console.log('Negocios encontrados:', negocios.map(n => ({ id: n.id, slug: n.slug, nombre: n.nombre })));

  const contentHtml = `
  <div style="font-family: system-ui, sans-serif; max-width: 1100px; margin: 0 auto; padding: 20px;">
    <h2 style="text-align: center; font-size: 28px; font-weight: 900; color: #0f172a; margin-bottom: 28px;">¿Cómo funciona?</h2>
    
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: 24px;">
      {/* Card 1: Local */}
      <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 24px; p-6; padding: 24px; display: flex; flex-direction: column; gap: 16px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
        <img src="/images/bubblewash/store_front.jpg" alt="Entrega en local" style="width: 100%; height: 220px; object-fit: cover; border-radius: 16px; border: 1px solid #cbd5e1;" />
        <div>
          <h3 style="font-size: 18px; font-weight: 900; color: #0f172a; margin-bottom: 12px; display: flex; items-center; gap: 8px;">🏪 Entrega en el local</h3>
          <ol style="line-height: 1.8; font-weight: 600; color: #334155; padding-left: 20px; font-size: 13px;">
            <li>Traes tus zapatos.</li>
            <li>Los inspeccionamos.</li>
            <li>Tomamos fotografías.</li>
            <li>Creamos tu orden.</li>
            <li>Indicamos fecha de entrega.</li>
            <li>Recibes WhatsApp cuando estén listos.</li>
          </ol>
        </div>
      </div>

      {/* Card 2: Domicilio */}
      <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 24px; padding: 24px; display: flex; flex-direction: column; gap: 16px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
        <img src="/images/bubblewash/delivery_driver.jpg" alt="Retiro a domicilio" style="width: 100%; height: 220px; object-fit: cover; border-radius: 16px; border: 1px solid #cbd5e1;" />
        <div>
          <h3 style="font-size: 18px; font-weight: 900; color: #0f172a; margin-bottom: 12px; display: flex; items-center; gap: 8px;">🛵 Retiro a domicilio</h3>
          <ol style="line-height: 1.8; font-weight: 600; color: #334155; padding-left: 20px; font-size: 13px;">
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
  </div>
  `;

  for (const neg of negocios) {
    const p = await prisma.page.upsert({
      where: { id: 'page_como_funciona_' + neg.id },
      update: {
        title: '¿Cómo funciona?',
        slug: 'como-funciona',
        contentHtml,
        status: 'published',
        updatedAt: new Date()
      },
      create: {
        id: 'page_como_funciona_' + neg.id,
        businessId: neg.id,
        title: '¿Cómo funciona?',
        slug: 'como-funciona',
        contentHtml,
        status: 'published',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
    console.log('Página creada para negocio:', neg.nombre, '-> ID:', p.id);
  }
}

seedPages()
  .then(() => {
    console.log('SEED_EXITOSO_COMPLETADO');
    process.exit(0);
  })
  .catch(err => {
    console.error('Error en seed:', err);
    process.exit(1);
  });
