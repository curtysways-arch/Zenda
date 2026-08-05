import ShoeCareBackoffice from '@/modules/shoe-care/components/ShoeCareBackoffice';

export const metadata = {
  title: 'Backoffice Shoe Care Operations — CitiOx',
  description: 'Administrador oficial del módulo de órdenes de servicio de calzado y lavado.'
};

export default function AdminLavadoPage() {
  const negocioDemo = {
    id: 'demo-canchas',
    nombre: 'Sneaker Wash Premium',
    slug: 'demo-canchas'
  };

  return <ShoeCareBackoffice negocio={negocioDemo} />;
}
