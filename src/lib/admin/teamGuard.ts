/**
 * Contexto del usuario del equipo Citiox en las rutas del superadmin:
 * quién es, si es el dueño de la plataforma y qué negocios puede ver.
 *
 * El middleware ya validó el permiso de la sección (lib/admin/teamAccessMap). Aquí se
 * resuelve la cartera: un vendedor con alcance "NEGOCIOS_ASIGNADOS" solo ve y gestiona
 * los negocios que creó o que le asignaron.
 */
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { isPlatformOwner, tokenHasPermission } from '@/lib/admin/teamAccessMap';

export type TeamContext = {
  userId: string | null;
  isOwner: boolean;
  isAdminUser: boolean;
  scope: string;
  roleName: string | null;
  permisos: string[];
  can: (perm: string) => boolean;
};

export async function getTeamContext(): Promise<TeamContext | null> {
  const session: any = await getServerSession(authOptions);
  const u = session?.user;
  if (!u) return null;
  const tokenLike = {
    role: u.role,
    roles: u.roles,
    isAdminUser: u.isAdminUser,
    adminRolJerarquia: u.adminRolJerarquia,
    permisos: u.permisos,
  };
  const isOwner = isPlatformOwner(tokenLike);
  if (!isOwner && !u.isAdminUser) return null;
  return {
    userId: u.isAdminUser ? u.id : null,
    isOwner,
    isAdminUser: Boolean(u.isAdminUser),
    scope: isOwner ? 'GLOBAL' : u.scope || 'GLOBAL',
    roleName: u.adminRolNombre || null,
    permisos: Array.isArray(u.permisos) ? u.permisos : [],
    can: (perm: string) => tokenHasPermission(tokenLike, perm),
  };
}

/** IDs de negocios visibles para el usuario (null = todos). */
export async function visibleBusinessIds(ctx: TeamContext): Promise<string[] | null> {
  if (ctx.isOwner || ctx.scope === 'GLOBAL' || ctx.scope === 'REGIONAL') return null;
  if (!ctx.userId) return [];
  const rows = await prisma.adminUserNegocio.findMany({ where: { adminUserId: ctx.userId }, select: { negocioId: true } });
  return rows.map((r) => r.negocioId);
}

export async function canAccessBusinessId(ctx: TeamContext, negocioId: string) {
  const ids = await visibleBusinessIds(ctx);
  return ids === null || ids.includes(negocioId);
}

/** Respuesta estándar 403 para negocios fuera de la cartera. */
export function outsidePortfolio() {
  return NextResponse.json({ error: 'Este negocio no está en tu cartera.' }, { status: 403 });
}

/** Deja al vendedor como responsable del negocio que acaba de crear. */
export async function assignBusinessToCreator(ctx: TeamContext | null, negocioId: string) {
  if (!ctx?.userId || ctx.isOwner) return;
  try {
    await prisma.adminUserNegocio.upsert({
      where: { adminUserId_negocioId: { adminUserId: ctx.userId, negocioId } },
      update: {},
      create: { adminUserId: ctx.userId, negocioId },
    });
  } catch (e) {
    console.warn('[teamGuard] No se pudo asignar el negocio al vendedor:', e);
  }
}

/** Precio mínimo que un vendedor puede negociar (configurable en GlobalConfig: VENDOR_MIN_PRICE). */
export async function vendorMinPrice(): Promise<number> {
  try {
    const row = await prisma.globalConfig.findUnique({ where: { clave: 'VENDOR_MIN_PRICE' } });
    const n = row ? parseFloat(row.valor) : NaN;
    return Number.isFinite(n) ? n : 14.99;
  } catch {
    return 14.99;
  }
}
