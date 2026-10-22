/**
 * Ajustes del servicio de lavandería guardados en la configuración del negocio:
 *  - tipoArticulo: qué lava (ZAPATOS | ROPA | AMBOS) → cambia los textos para cliente, repartidor y local.
 */
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getEffectiveAdminSession } from '@/lib/delegatedAuth';
import { requireBusinessAccess } from '@/lib/auth/requireBusinessAccess';

export const dynamic = 'force-dynamic';

export async function PUT(req: Request) {
  const session = await getEffectiveAdminSession();
  const negocioId = (session?.user as any)?.negocioId;
  if (!negocioId) return NextResponse.json({ error: 'Inicia sesión para continuar.' }, { status: 401 });
  const access = await requireBusinessAccess(negocioId);
  if (!access.ok) return access.response;

  const body = await req.json().catch(() => ({}));
  const tipo = String(body?.tipoArticulo || '').toUpperCase();
  if (!['ZAPATOS', 'ROPA', 'AMBOS'].includes(tipo)) {
    return NextResponse.json({ error: 'Elige zapatos, ropa o ambos.' }, { status: 400 });
  }

  const negocio = await prisma.negocio.findUnique({ where: { id: negocioId }, select: { configuracion: true } });
  let cfg: any = negocio?.configuracion || {};
  if (typeof cfg === 'string') {
    try { cfg = JSON.parse(cfg); } catch { cfg = {}; }
  }
  const next = { ...cfg, tipoArticulo: tipo };
  await prisma.negocio.update({ where: { id: negocioId }, data: { configuracion: next } });
  return NextResponse.json({ ok: true, tipoArticulo: tipo });
}
