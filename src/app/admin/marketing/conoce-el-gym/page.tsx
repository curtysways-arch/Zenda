import { getEffectiveAdminSession } from '@/lib/delegatedAuth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import GymKnowTheGymAdmin from '@/components/admin/gym/GymKnowTheGymAdmin';
import { isGymBusiness } from '@/modules/gym/utils/gymHelper';

export const dynamic = 'force-dynamic';

export default async function ConoceElGymPage() {
  const session = await getEffectiveAdminSession();
  if (!session?.user) redirect('/login');

  const negocioId = (session.user as any).negocioId;
  if (!negocioId) redirect('/login');

  const negocio = await (prisma as any).negocio.findUnique({
    where: { id: negocioId },
    select: { id: true, slug: true, nombre: true, tipoNegocio: true, configuracion: true }
  });

  if (!negocio) redirect('/login');

  // Solo accesible para gimnasios
  const config = typeof negocio.configuracion === 'string'
    ? (() => { try { return JSON.parse(negocio.configuracion); } catch { return {}; } })()
    : negocio.configuracion || {};

  const tipoUpper = (negocio.tipoNegocio || '').toUpperCase();
  const nameUpper = (negocio.nombre || '').toUpperCase();
  const blueprintId = (config?.blueprintId || '').toUpperCase();

  const isGym = isGymBusiness(negocio) ||
    ['GIMNASIO', 'GYM', 'FITNESS'].includes(tipoUpper) ||
    blueprintId === 'GYM' || blueprintId === 'GIMNASIO' ||
    nameUpper.includes('VORTEX') || nameUpper.includes('FITNESS') || nameUpper.includes('GYM');

  if (!isGym) redirect('/admin');

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <GymKnowTheGymAdmin negocioSlug={negocio.slug} />
    </div>
  );
}
