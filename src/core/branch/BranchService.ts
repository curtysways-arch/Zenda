/**
 * @file BranchService.ts
 * @module core/branch
 * @description Gestión comercial y operativa de sucursales para Citiox.
 * Controla estrictamente los límites de plan (MAX_BRANCHES) y el aprovisionamiento de entidades base.
 */

import prisma from '@/lib/prisma';
import { EntitlementsService } from '@/core/entitlements/EntitlementsService';

export interface CreateBranchInput {
  name: string;
  code?: string;
  address?: string;
  city?: string;
  phone?: string;
  email?: string;
  mapUrl?: string;
  imagenUrl?: string;
  isDefault?: boolean;
}

export interface UpdateBranchInput {
  name?: string;
  code?: string;
  address?: string;
  city?: string;
  phone?: string;
  email?: string;
  mapUrl?: string;
  imagenUrl?: string;
  isDefault?: boolean;
  active?: boolean;
}

function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export class BranchService {
  /**
   * Obtiene todas las sucursales del negocio.
   */
  public static async listBranches(businessId: string, includeInactive = false) {
    return prisma.branch.findMany({
      where: {
        businessId,
        ...(includeInactive ? {} : { active: true })
      },
      include: {
        cashRegisters: true,
        _count: {
          select: {
            staffBranches: true,
            accesses: true
          }
        }
      },
      orderBy: [
        { isMain: 'desc' },
        { createdAt: 'asc' }
      ]
    });
  }

  /**
   * Obtiene una sucursal específica asegurando aislamiento por negocio.
   */
  public static async getBranch(branchId: string, businessId: string) {
    const branch = await prisma.branch.findFirst({
      where: { id: branchId, businessId },
      include: {
        cashRegisters: true,
        staffBranches: {
          include: { staff: true }
        }
      }
    });

    if (!branch) {
      throw new Error('Sucursal no encontrada');
    }

    return branch;
  }

  /**
   * Crea una nueva sucursal verificando estrictamente los límites del plan comercial.
   */
  public static async createBranch(businessId: string, input: CreateBranchInput) {
    if (!input.name || input.name.trim() === '') {
      throw new Error('El nombre de la sucursal es obligatorio');
    }

    // 1. Verificación comercial canónica de límites de sucursales activas
    const limitCheck = await EntitlementsService.checkBranchLimit(businessId);
    if (!limitCheck.allowed) {
      throw new Error(limitCheck.message || `Has alcanzado el límite de sucursales (${limitCheck.current}/${limitCheck.limit}) permitidas en tu plan.`);
    }

    // 2. Contar sucursales existentes para decidir el flag isMain
    const existingCount = await prisma.branch.count({
      where: { businessId }
    });

    const isFirstBranch = existingCount === 0;
    const shouldBeMain = isFirstBranch || Boolean(input.isDefault);

    // 3. Generar slug único para la sede
    let baseSlug = slugify(input.name);
    if (!baseSlug) baseSlug = 'sucursal';
    let finalSlug = baseSlug;
    let suffix = 1;
    while (await prisma.branch.findFirst({ where: { businessId, slug: finalSlug } })) {
      finalSlug = `${baseSlug}-${suffix++}`;
    }

    // 4. Ejecutar creación atómica dentro de una transacción
    return prisma.$transaction(async (tx) => {
      // Si esta será la sucursal matriz/principal, desmarcar las anteriores
      if (shouldBeMain && !isFirstBranch) {
        await tx.branch.updateMany({
          where: { businessId, isMain: true },
          data: { isMain: false }
        });
      }

      // Consolidar settings adicionales (city, email, mapUrl, imagenUrl)
      const settingsData: Record<string, any> = {};
      if (input.city) settingsData.city = input.city.trim();
      if (input.email) settingsData.email = input.email.trim();
      if (input.mapUrl) settingsData.mapUrl = input.mapUrl.trim();
      if (input.imagenUrl) settingsData.imagenUrl = input.imagenUrl.trim();

      // Crear la nueva sucursal
      const newBranch = await tx.branch.create({
        data: {
          businessId,
          name: input.name.trim(),
          slug: finalSlug,
          code: input.code?.trim() || null,
          address: input.address?.trim() || null,
          phone: input.phone?.trim() || null,
          isMain: shouldBeMain,
          active: true,
          settings: Object.keys(settingsData).length > 0 ? settingsData : undefined
        }
      });

      // Crear automáticamente la caja registradora inicial de la sede
      await tx.cashRegister.create({
        data: {
          businessId,
          branchId: newBranch.id,
          name: `Caja Principal - ${newBranch.name}`,
          code: 'CAJA-01',
          active: true
        }
      });

      // Asignar acceso automático a los administradores / dueños del negocio
      const ownersAndAdmins = await tx.usuario.findMany({
        where: {
          negocioId: businessId,
          role: { in: ['OWNER', 'ADMIN', 'superadmin', 'dueño', 'administrador'] }
        }
      });

      for (const adminUser of ownersAndAdmins) {
        await tx.branchAccess.upsert({
          where: {
            userId_branchId: {
              userId: adminUser.id,
              branchId: newBranch.id
            }
          },
          create: {
            userId: adminUser.id,
            branchId: newBranch.id,
            businessId,
            role: 'ADMIN',
            active: true
          },
          update: {}
        });
      }

      return newBranch;
    });
  }

  /**
   * Actualiza los datos de una sucursal existente.
   */
  public static async updateBranch(branchId: string, businessId: string, input: UpdateBranchInput) {
    const existing = await prisma.branch.findFirst({
      where: { id: branchId, businessId }
    });

    if (!existing) {
      throw new Error('Sucursal no encontrada');
    }

    // Si se está reactivando una sucursal inactiva, validar el límite comercial
    if (input.active === true && !existing.active) {
      const limitCheck = await EntitlementsService.checkBranchLimit(businessId);
      if (!limitCheck.allowed) {
        throw new Error(`No puedes activar esta sucursal: has alcanzado el límite de tu plan (${limitCheck.current}/${limitCheck.limit}).`);
      }
    }

    return prisma.$transaction(async (tx) => {
      // Si se marca como matriz/principal, desmarcar otras
      if (input.isDefault === true && !existing.isMain) {
        await tx.branch.updateMany({
          where: { businessId, isMain: true },
          data: { isMain: false }
        });
      }

      let existingSettings: any = {};
      if (existing.settings && typeof existing.settings === 'object') {
        existingSettings = { ...existing.settings };
      }
      if (input.city !== undefined) existingSettings.city = input.city?.trim() || null;
      if (input.email !== undefined) existingSettings.email = input.email?.trim() || null;
      if (input.mapUrl !== undefined) existingSettings.mapUrl = input.mapUrl?.trim() || null;
      if (input.imagenUrl !== undefined) existingSettings.imagenUrl = input.imagenUrl?.trim() || null;

      return tx.branch.update({
        where: { id: branchId },
        data: {
          ...(input.name !== undefined ? { name: input.name.trim() } : {}),
          ...(input.code !== undefined ? { code: input.code.trim() || null } : {}),
          ...(input.address !== undefined ? { address: input.address?.trim() || null } : {}),
          ...(input.phone !== undefined ? { phone: input.phone?.trim() || null } : {}),
          ...(input.isDefault !== undefined ? { isMain: input.isDefault } : {}),
          ...(input.active !== undefined ? { active: input.active } : {}),
          settings: existingSettings
        }
      });
    });
  }

  /**
   * Desactiva (soft-delete) una sucursal.
   */
  public static async deactivateBranch(branchId: string, businessId: string) {
    const existing = await prisma.branch.findFirst({
      where: { id: branchId, businessId }
    });

    if (!existing) {
      throw new Error('Sucursal no encontrada');
    }

    return prisma.$transaction(async (tx) => {
      // Si era matriz, transferir la matriz a otra sucursal activa
      if (existing.isMain) {
        const otherActive = await tx.branch.findFirst({
          where: {
            businessId,
            id: { not: branchId },
            active: true
          }
        });

        if (otherActive) {
          await tx.branch.update({
            where: { id: otherActive.id },
            data: { isMain: true }
          });
        }
      }

      return tx.branch.update({
        where: { id: branchId },
        data: {
          active: false,
          isMain: false
        }
      });
    });
  }
}
