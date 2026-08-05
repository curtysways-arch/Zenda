import ShoeCareLanding from '@/modules/shoe-care/components/ShoeCareLanding';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'BubbleWash — Lavado de Zapatos Premium | CitiOx',
  description: 'Lavamos, desinfectamos y restauramos tus zapatos con procesos profesionales.'
};

export default async function LavadoPage() {
  const negocio = await prisma.negocio.findFirst({
    where: { tipoNegocio: 'SHOE_CARE' }
  });

  let services: any[] = [];
  if (negocio?.id) {
    try {
      services = await prisma.service.findMany({
        where: { negocioId: negocio.id }
      });
    } catch (e) {
      console.error(e);
    }
  }

  const negocioData = negocio
    ? { ...negocio, services }
    : {
        id: 'sneaker-wash-id',
        nombre: 'BubbleWash',
        slug: 'lavado',
        whatsapp: '0991234567',
        services: []
      };

  return <ShoeCareLanding negocio={negocioData} />;
}
