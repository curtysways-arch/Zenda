import { NextResponse } from 'next/server';
import { getEffectiveAdminSession } from '@/lib/delegatedAuth';
import { recommendations, inviteRecommended, inviteDriver, HttpError } from '@/lib/logistics/driverNetwork';

export const dynamic = 'force-dynamic';

async function negocioId() {
  const session = await getEffectiveAdminSession();
  return ((session?.user as any)?.negocioId as string) || null;
}

// GET: repartidores verificados de la red recomendados para este negocio (sin teléfonos ni documentos)
export async function GET() {
  const id = await negocioId();
  if (!id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  try {
    return NextResponse.json({ success: true, drivers: await recommendations(id, 30) });
  } catch (error) {
    console.error('[DIRECTORY GET ERROR]', error);
    return NextResponse.json({ error: 'Error cargando recomendaciones' }, { status: 500 });
  }
}

// POST: invitar a un repartidor recomendado
export async function POST(req: Request) {
  const id = await negocioId();
  if (!id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  try {
    const body = await req.json().catch(() => ({}));
    const result = body.candidateId
      ? await inviteRecommended(id, String(body.candidateId))
      : await inviteDriver(id, { nombre: body.driverName, telefono: String(body.driverPhone || '') });
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    if (error instanceof HttpError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error('[DIRECTORY POST ERROR]', error);
    return NextResponse.json({ error: 'Error al enviar invitación' }, { status: 500 });
  }
}
