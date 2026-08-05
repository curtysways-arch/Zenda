import prisma from './lib/prisma';

async function seedFeaturesPage() {
  const negocio = await prisma.negocio.findFirst({
    where: { OR: [{ slug: 'lavado' }, { tipoNegocio: 'SHOE_CARE' }] }
  });

  if (!negocio) return;

  const contentHtml = `
  <div style="font-family: system-ui, sans-serif; max-width: 1100px; margin: 0 auto; padding: 20px;">
    <h2 style="text-align: center; font-size: 28px; font-weight: 900; color: #0f172a; margin-bottom: 28px;">¿Por qué elegirnos y Resultados?</h2>
    
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 24px;">
      <!-- Antes y Después -->
      <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 24px; padding: 24px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
        <h3 style="font-size: 18px; font-weight: 900; color: #0f172a; margin-bottom: 16px;">Antes y después</h3>
        <img src="/images/bubblewash/before_after.jpg" alt="Antes y después" style="width: 100%; height: 200px; object-fit: cover; border-radius: 16px; border: 1px solid #e2e8f0;" />
        <div style="margin-top: 12px; font-size: 13px; font-weight: 700; color: #334155; display: flex; justify-content: space-between;">
          <span>👟 Lavado Completo</span>
          <span>⏱️ Tiempo: 2 días</span>
        </div>
      </div>

      <!-- Por qué elegirnos -->
      <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 24px; padding: 24px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
        <h3 style="font-size: 18px; font-weight: 900; color: #0f172a; margin-bottom: 16px;">¿Por qué elegirnos?</h3>
        <ul style="list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 12px; font-size: 13px; font-weight: 700; color: #334155;">
          <li>🛡️ Productos profesionales</li>
          <li>👟 Cuidado de materiales delicados</li>
          <li>📷 Fotos del estado del calzado</li>
          <li>💬 Seguimiento por WhatsApp</li>
          <li>🚚 Entrega puntual</li>
          <li>👤 Personal capacitado</li>
        </ul>
      </div>
    </div>
  </div>
  `;

  const p = await prisma.page.upsert({
    where: { id: 'page_por_que_elegirnos_' + negocio.id },
    update: {
      title: '¿Por qué elegirnos y Resultados?',
      slug: 'por-que-elegirnos',
      contentHtml,
      status: 'published',
      updatedAt: new Date()
    },
    create: {
      id: 'page_por_que_elegirnos_' + negocio.id,
      businessId: negocio.id,
      title: '¿Por qué elegirnos y Resultados?',
      slug: 'por-que-elegirnos',
      contentHtml,
      status: 'published',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  });

  console.log('Página ¿Por qué elegirnos? creada exitosamente con ID:', p.id);
}

seedFeaturesPage()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
