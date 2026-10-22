import { NextResponse } from 'next/server';
import { getEffectiveAdminSession } from '@/lib/delegatedAuth';
import { lookup } from '@/lib/logistics/driverNetwork';

export const dynamic = 'force-dynamic';

// GET: ¿Este teléfono ya es repartidor en la red Citiox? (solo para negocios, sin datos sensibles)
export async function GET(req: Request) {
  const session = await getEffectiveAdminSession();
  const negocioId = (session?.user as any)?.negocioId;
  if (!negocioId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const phone = new URL(req.url).searchParams.get('phone') || '';
  try {
    const r = await lookup(negocioId, phone);
    return NextResponse.json({
      exists: r.existe,
      driverName: (r as any).nombre || null,
      tipoVehiculo: (r as any).vehiculo || null,
      isGlobalVerified: Boolean((r as any).verificado),
      negociosCount: (r as any).negocios || 0,
      enMiEquipo: (r as any).enMiEquipo || null,
    });
  } catch (error) {
    console.error('[SEARCH DRIVER API ERROR]', error);
    return NextResponse.json({ exists: false }, { status: 500 });
  }
}
