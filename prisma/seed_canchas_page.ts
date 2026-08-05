import prisma from '../src/lib/prisma';

async function seedCanchasPage() {
  await prisma.page.upsert({
    where: { id: 'page_reglamento_canchas' },
    update: {
      businessId: 'demo-canchas-id-100',
      title: 'Reglamento y Normas del Complejo',
      slug: 'reglamento-canchas',
      status: 'published',
      updatedAt: new Date(),
      contentHtml: `<div style="max-width: 1200px; margin: 0 auto; display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 2rem;">
        <div style="background: #0f172a; border: 1px solid #1e293b; border-radius: 1.5rem; padding: 1.75rem; color: #f8fafc;">
          <h3 style="font-size: 1.25rem; font-weight: 900; color: #10b981; margin-bottom: 1rem;">🏆 Normas de Uso de Canchas</h3>
          <ul style="list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.5rem; font-size: 0.875rem; color: #cbd5e1;">
            <li style="background: #1e293b; padding: 0.6rem 0.85rem; border-radius: 0.75rem;">👟 Calzado deportivo adecuado (Pádel / Calzado Sintético)</li>
            <li style="background: #1e293b; padding: 0.6rem 0.85rem; border-radius: 0.75rem;">⏱️ Presentarse 10 minutos antes de su turno asignado</li>
            <li style="background: #1e293b; padding: 0.6rem 0.85rem; border-radius: 0.75rem;">💧 Hidratación permitida dentro de las instalaciones</li>
          </ul>
        </div>
        <div style="background: #0f172a; border: 1px solid #1e293b; border-radius: 1.5rem; padding: 1.75rem; color: #f8fafc;">
          <h3 style="font-size: 1.25rem; font-weight: 900; color: #10b981; margin-bottom: 1rem;">⭐ Beneficios de la Membresía</h3>
          <ul style="list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.5rem; font-size: 0.875rem; color: #cbd5e1;">
            <li style="background: #1e293b; padding: 0.6rem 0.85rem; border-radius: 0.75rem;">🎉 Descuentos exclusivos en alquiler de luces nocturnas</li>
            <li style="background: #1e293b; padding: 0.6rem 0.85rem; border-radius: 0.75rem;">🥇 Prioridad en inscripción a Torneos de Pádel & Fútbol</li>
            <li style="background: #1e293b; padding: 0.6rem 0.85rem; border-radius: 0.75rem;">📱 Reservas rápidas con confirmación instantánea</li>
          </ul>
        </div>
      </div>`
    },
    create: {
      id: 'page_reglamento_canchas',
      businessId: 'demo-canchas-id-100',
      title: 'Reglamento y Normas del Complejo',
      slug: 'reglamento-canchas',
      status: 'published',
      updatedAt: new Date(),
      contentHtml: `<div style="max-width: 1200px; margin: 0 auto; display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 2rem;">
        <div style="background: #0f172a; border: 1px solid #1e293b; border-radius: 1.5rem; padding: 1.75rem; color: #f8fafc;">
          <h3 style="font-size: 1.25rem; font-weight: 900; color: #10b981; margin-bottom: 1rem;">🏆 Normas de Uso de Canchas</h3>
          <ul style="list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.5rem; font-size: 0.875rem; color: #cbd5e1;">
            <li style="background: #1e293b; padding: 0.6rem 0.85rem; border-radius: 0.75rem;">👟 Calzado deportivo adecuado (Pádel / Calzado Sintético)</li>
            <li style="background: #1e293b; padding: 0.6rem 0.85rem; border-radius: 0.75rem;">⏱️ Presentarse 10 minutos antes de su turno asignado</li>
            <li style="background: #1e293b; padding: 0.6rem 0.85rem; border-radius: 0.75rem;">💧 Hidratación permitida dentro de las instalaciones</li>
          </ul>
        </div>
        <div style="background: #0f172a; border: 1px solid #1e293b; border-radius: 1.5rem; padding: 1.75rem; color: #f8fafc;">
          <h3 style="font-size: 1.25rem; font-weight: 900; color: #10b981; margin-bottom: 1rem;">⭐ Beneficios de la Membresía</h3>
          <ul style="list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.5rem; font-size: 0.875rem; color: #cbd5e1;">
            <li style="background: #1e293b; padding: 0.6rem 0.85rem; border-radius: 0.75rem;">🎉 Descuentos exclusivos en alquiler de luces nocturnas</li>
            <li style="background: #1e293b; padding: 0.6rem 0.85rem; border-radius: 0.75rem;">🥇 Prioridad en inscripción a Torneos de Pádel & Fútbol</li>
            <li style="background: #1e293b; padding: 0.6rem 0.85rem; border-radius: 0.75rem;">📱 Reservas rápidas con confirmación instantánea</li>
          </ul>
        </div>
      </div>`
    }
  });
  console.log('✅ Página de Reglamento de Canchas creada exitosamente para demo-canchas-id-100');
}

seedCanchasPage()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
