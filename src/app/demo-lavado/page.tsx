import ShoeCareLanding from '@/modules/shoe-care/components/ShoeCareLanding';

export const metadata = {
  title: 'Lavado de Zapatos Premium — Sneaker Wash | CitiOx',
  description: 'Servicio profesional de restauración, lavado profundo e impermeabilización de calzado.'
};

export default function DemoLavadoPage() {
  const negocioDemo = {
    id: 'demo-canchas',
    nombre: 'Sneaker Wash Premium',
    slug: 'demo-lavado',
    whatsapp: '0991234567'
  };

  return <ShoeCareLanding negocio={negocioDemo} />;
}
