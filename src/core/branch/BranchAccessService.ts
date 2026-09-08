/**
 * @file BranchAccessService.ts
 * @module core/branch
 * @description Guardia de seguridad para acceso a sucursales y prevención de vulnerabilidades multi-inquilino.
 * Asegura aislamiento total entre negocios y entre sucursales asignadas a usuarios operativos.
 */

import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export interface AuthContext {
  id: string;
  role?: string;
  businessId?: string;
  negocioId?: string;
}

export class BranchAccessService {
  /**
   * Valida que el usuario pertenezca al negocio indicado.
   * Lanza un error o retorna una respuesta 403 si hay intento de acceso cruzado.
   */
  public static async requireBusinessAccess(
    user: AuthContext | null | undefined,
    targetBusinessId: string
  ): Promise<void> {
    if (!user) {
      throw new Response('No autenticado', { status: 401 });
    }

    const userRole = (user.role || '').toUpperCase();
    if (userRole === 'SUPERADMIN') {
      return; // El superadministrador global tiene acceso transversal
    }

    const userBizId = user.businessId || user.negocioId;
    if (!userBizId || userBizId !== targetBusinessId) {
      console.error(`[BranchAccessSecurity] Intento de acceso cruzado a negocio: User ${user.id} (${userBizId}) -> Target ${targetBusinessId}`);
      throw new Response('Acceso no autorizado al negocio', { status: 403 });
    }
  }

  /**
   * Valida que el usuario tenga permiso para operar en la sucursal especificada.
   * @param user Usuario autenticado
   * @param businessId ID del negocio
   * @param branchId ID de la sucursal o 'ALL'
   */
  public static async requireBranchAccess(
    user: AuthContext | null | undefined,
    businessId: string,
    branchId: string
  ): Promise<void> {
    await this.requireBusinessAccess(user, businessId);

    const userRole = (user?.role || '').toUpperCase();
    if (userRole === 'SUPERADMIN') {
      return;
    }

    // Si solicita scope 'ALL'
    if (branchId === 'ALL' || branchId === 'all') {
      if (userRole === 'OWNER' || userRole === 'ADMIN') {
        return;
      }
      console.error(`[BranchAccessSecurity] Usuario no privilegiado ${user?.id} (${userRole}) intentó operar en scope ALL`);
      throw new Response('No tienes permisos para operar en todas las sedes simultáneamente', { status: 403 });
    }

    // Si es OWNER del negocio, tiene acceso irrestricto a todas las sucursales de su negocio
    if (userRole === 'OWNER' || userRole === 'ADMIN') {
      // Verificar que la sucursal pertenezca efectivamente a su negocio
      const branch = await prisma.branch.findFirst({
        where: { id: branchId, businessId }
      });
      if (!branch) {
        throw new Response('La sucursal especificada no existe en tu negocio', { status: 404 });
      }
      return;
    }

    // Para usuarios operativos (STAFF, RECEPCIONISTA, MESERO, etc.):
    // Debe existir un registro explícito en BranchAccess
    const access = await prisma.branchAccess.findFirst({
      where: {
        userId: user!.id,
        branchId,
        branch: {
          businessId,
          active: true
        }
      }
    });

    if (!access) {
      console.error(`[BranchAccessSecurity] Acceso denegado: Usuario ${user?.id} no tiene asignación en sucursal ${branchId}`);
      throw new Response('No tienes permisos asignados para operar en esta sucursal', { status: 403 });
    }
  }

  /**
   * Wrapper seguro para controladores de API de Next.js.
   * Ejecuta la comprobación y retorna una respuesta JSON de error si falla.
   */
  public static async guard(
    user: AuthContext | null | undefined,
    businessId: string,
    branchId?: string | null
  ): Promise<NextResponse | null> {
    try {
      if (branchId) {
        await this.requireBranchAccess(user, businessId, branchId);
      } else {
        await this.requireBusinessAccess(user, businessId);
      }
      return null;
    } catch (err: any) {
      const status = err instanceof Response ? err.status : 403;
      const message = err instanceof Response ? err.statusText || 'Acceso denegado' : err.message || 'Acceso denegado';
      return NextResponse.json({ error: message, code: 'FORBIDDEN_BRANCH_ACCESS' }, { status });
    }
  }
}
