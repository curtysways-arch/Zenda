/**
 * @file BranchContext.ts
 * @module core/branch
 * @description Contexto y resolución segura de sucursal para operaciones y consultas en Citiox.
 * 
 * REGLA FUNDAMENTAL:
 * 'ALL' es un scope de consulta exclusivo de roles autorizados (OWNER, SUPERADMIN),
 * NUNCA una entidad ni ID de base de datos.
 */

import prisma from '@/lib/prisma';

export type BranchScope = 
  | { type: 'BRANCH'; branchId: string; branchName: string; isMain?: boolean; isDefault?: boolean }
  | { type: 'ALL' };

export interface BranchContextUser {
  id: string;
  role?: string;
  businessId?: string;
  negocioId?: string;
}

export class BranchContextResolver {
  /**
   * Resuelve el BranchScope efectivo a partir de la petición y el usuario.
   * @param user Usuario autenticado
   * @param businessId ID del negocio
   * @param requestedBranchId ID solicitado por header 'x-branch-id', query o cookie
   */
  public static async resolveScope(
    user: BranchContextUser | null | undefined,
    businessId: string,
    requestedBranchId?: string | null
  ): Promise<BranchScope> {
    if (!businessId) {
      throw new Error('[BranchContext] businessId es requerido para resolver el contexto.');
    }

    const role = (user?.role || '').toUpperCase();
    const isPrivileged = role === 'OWNER' || role === 'SUPERADMIN' || role === 'ADMIN';

    // 1. Si se solicita 'ALL' (Todas las sucursales)
    if (requestedBranchId === 'ALL' || requestedBranchId === 'all') {
      if (isPrivileged) {
        return { type: 'ALL' };
      }
      // Si un rol no autorizado solicita ALL, degradamos a su sede asignada
      console.warn(`[BranchContext] Usuario ${user?.id} con rol ${role} intentó acceder al scope ALL sin privilegios.`);
    }

    // 2. Obtener todas las sucursales activas del negocio
    const branches = await prisma.branch.findMany({
      where: {
        businessId,
        active: true
      },
      orderBy: [
        { isMain: 'desc' },
        { createdAt: 'asc' }
      ]
    });

    if (branches.length === 0) {
      // Fallback seguro: sin sucursales físicas creadas aún
      return {
        type: 'BRANCH',
        branchId: 'default',
        branchName: 'Sucursal Principal',
        isMain: true,
        isDefault: true
      };
    }

    // 3. Si el usuario tiene acceso específico a través de BranchAccess
    if (user?.id && !isPrivileged) {
      const userAccesses = await prisma.branchAccess.findMany({
        where: {
          userId: user.id,
          active: true,
          branch: {
            businessId,
            active: true
          }
        },
        include: {
          branch: true
        }
      });

      if (userAccesses.length > 0) {
        // Si solicitó una específica y tiene permiso
        if (requestedBranchId) {
          const match = userAccesses.find(a => a.branchId === requestedBranchId);
          if (match) {
            return {
              type: 'BRANCH',
              branchId: match.branch.id,
              branchName: match.branch.name,
              isMain: match.branch.isMain,
              isDefault: match.branch.isMain
            };
          }
        }

        // Si solo tiene 1 sede o no especificó, usar su sede principal o primera
        const defaultAccess = userAccesses.find(a => a.branch.isMain) || userAccesses[0];
        return {
          type: 'BRANCH',
          branchId: defaultAccess.branch.id,
          branchName: defaultAccess.branch.name,
          isMain: defaultAccess.branch.isMain,
          isDefault: defaultAccess.branch.isMain
        };
      }
    }

    // 4. Si es OWNER / ADMIN o usuario sin restricciones explícitas
    if (requestedBranchId && requestedBranchId !== 'ALL' && requestedBranchId !== 'all') {
      const targetBranch = branches.find(b => b.id === requestedBranchId);
      if (targetBranch) {
        return {
          type: 'BRANCH',
          branchId: targetBranch.id,
          branchName: targetBranch.name,
          isMain: targetBranch.isMain,
          isDefault: targetBranch.isMain
        };
      }
    }

    // 5. Default para el negocio: sucursal isMain o la primera
    const defaultBranch = branches.find(b => b.isMain) || branches[0];
    return {
      type: 'BRANCH',
      branchId: defaultBranch.id,
      branchName: defaultBranch.name,
      isMain: defaultBranch.isMain,
      isDefault: defaultBranch.isMain
    };
  }

  /**
   * Extrae el ID de sucursal para usar en cláusulas 'where' de Prisma.
   * Retorna branchId o undefined si el scope es ALL (para no filtrar por sucursal).
   */
  public static getWhereFilter(scope: BranchScope): { branchId?: string } {
    if (scope.type === 'ALL') {
      return {};
    }
    return { branchId: scope.branchId };
  }
}
