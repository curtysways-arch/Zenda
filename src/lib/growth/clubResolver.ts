import prisma from '../prisma';
import { BusinessInheritanceMode, InheritanceResource } from '@prisma/client';

// ─── TIPOS RESUELTOS ──────────────────────────────────────────────────────────
// El ClubResolver siempre devuelve un tipo normalizado con:
//   source: de dónde viene el dato (GLOBAL | LOCAL)
//   mode: cómo está configurado (INHERITED | CUSTOMIZED | DISABLED)
//   data: el recurso ya resuelto
// ─────────────────────────────────────────────────────────────────────────────

export type InheritanceSource = 'GLOBAL' | 'LOCAL';

export interface ResolvedResource<T> {
    source: InheritanceSource;
    mode: BusinessInheritanceMode;
    resourceId: string;   // ID del recurso global original
    data: T;
}

// ─── CLUB RESOLVER ───────────────────────────────────────────────────────────
// Servicio de resolución del estado del Club Citiox para un negocio dado.
// 
// Principios:
//   - NUNCA copia registros.
//   - NUNCA sincroniza datos.
//   - Si no existe registro en BusinessInheritance → INHERITED automático.
//   - Si mode = INHERITED → devuelve el recurso global.
//   - Si mode = CUSTOMIZED → devuelve el recurso local (customId).
//   - Si mode = DISABLED → lo omite del resultado.
// ─────────────────────────────────────────────────────────────────────────────

export class ClubResolver {

    /**
     * Resuelve los niveles globales del Club para un negocio.
     * Retorna los GlobalLevels activos, cada uno con su modo de herencia.
     * Si mode=CUSTOMIZED, retorna el LoyaltyLevel local en su lugar.
     */
    static async resolveLevels(negocioId: string): Promise<ResolvedResource<any>[]> {
        // 1. Obtener todos los GlobalLevels activos
        const globalLevels = await prisma.globalLevel.findMany({
            where: { activo: true },
            include: { Presentation: true, Rewards: { include: { Reward: true } } },
            orderBy: { orden: 'asc' },
        });

        if (globalLevels.length === 0) return [];

        // 2. Obtener todos los registros de herencia de este negocio para GLOBAL_LEVEL
        const inheritances = await prisma.businessInheritance.findMany({
            where: { negocioId, resourceType: InheritanceResource.GLOBAL_LEVEL },
        });

        const inheritanceMap = new Map(inheritances.map(i => [i.resourceId, i]));

        const resolved: ResolvedResource<any>[] = [];

        for (const level of globalLevels) {
            const inheritance = inheritanceMap.get(level.id);
            const mode = inheritance?.mode ?? BusinessInheritanceMode.INHERITED;

            if (mode === BusinessInheritanceMode.DISABLED) continue;

            if (mode === BusinessInheritanceMode.CUSTOMIZED && inheritance?.customId) {
                // Copy-On-Write: usar el LoyaltyLevel local
                const localLevel = await prisma.loyaltyLevel.findUnique({
                    where: { id: inheritance.customId },
                });
                if (localLevel) {
                    resolved.push({
                        source: 'LOCAL',
                        mode,
                        resourceId: level.id,
                        data: localLevel,
                    });
                    continue;
                }
            }

            // INHERITED o CUSTOMIZED sin customId: usar el recurso global
            resolved.push({
                source: 'GLOBAL',
                mode,
                resourceId: level.id,
                data: level,
            });
        }

        return resolved;
    }

    /**
     * Resuelve la temporada activa del Club para un negocio.
     * Si no hay GlobalSeason activa, retorna null.
     */
    static async resolveSeason(negocioId: string): Promise<ResolvedResource<any> | null> {
        // 1. Buscar la GlobalSeason activa (status = ACTIVE)
        const globalSeason = await prisma.globalSeason.findFirst({
            where: { status: 'ACTIVE' },
            orderBy: { fechaInicio: 'desc' },
        });

        if (!globalSeason) return null;

        // 2. Buscar si el negocio tiene un registro de herencia para esta temporada
        const inheritance = await prisma.businessInheritance.findUnique({
            where: {
                negocioId_resourceType_resourceId: {
                    negocioId,
                    resourceType: InheritanceResource.GLOBAL_SEASON,
                    resourceId: globalSeason.id,
                },
            },
        });

        const mode = inheritance?.mode ?? BusinessInheritanceMode.INHERITED;

        if (mode === BusinessInheritanceMode.DISABLED) return null;

        if (mode === BusinessInheritanceMode.CUSTOMIZED && inheritance?.customId) {
            // Copy-On-Write: usar la LoyaltySeason local
            const localSeason = await prisma.loyaltySeason.findUnique({
                where: { id: inheritance.customId },
            });
            if (localSeason) {
                return { source: 'LOCAL', mode, resourceId: globalSeason.id, data: localSeason };
            }
        }

        // INHERITED: usar la temporada global
        return { source: 'GLOBAL', mode, resourceId: globalSeason.id, data: globalSeason };
    }

    /**
     * Resuelve el catálogo de premios del Club para un negocio.
     * Combina RewardCatalog globales (habilitados) + LoyaltyRewards locales.
     */
    static async resolveRewards(negocioId: string): Promise<ResolvedResource<any>[]> {
        // 1. Obtener todos los RewardCatalog activos
        const globalRewards = await prisma.rewardCatalog.findMany({
            where: { activo: true },
            orderBy: { createdAt: 'asc' },
        });

        // 2. Obtener registros de herencia para REWARD
        const inheritances = await prisma.businessInheritance.findMany({
            where: { negocioId, resourceType: InheritanceResource.REWARD },
        });
        const inheritanceMap = new Map(inheritances.map(i => [i.resourceId, i]));

        const resolved: ResolvedResource<any>[] = [];

        for (const reward of globalRewards) {
            const inheritance = inheritanceMap.get(reward.id);
            const mode = inheritance?.mode ?? BusinessInheritanceMode.INHERITED;

            if (mode === BusinessInheritanceMode.DISABLED) continue;

            if (mode === BusinessInheritanceMode.CUSTOMIZED && inheritance?.customId) {
                // El negocio tiene su propio LoyaltyReward personalizado
                const localReward = await prisma.loyaltyReward.findUnique({
                    where: { id: inheritance.customId },
                });
                if (localReward) {
                    resolved.push({ source: 'LOCAL', mode, resourceId: reward.id, data: localReward });
                    continue;
                }
            }

            // INHERITED: exponer el RewardCatalog global
            resolved.push({
                source: 'GLOBAL',
                mode,
                resourceId: reward.id,
                data: {
                    ...reward,
                    // Campos extra de configuración del negocio
                    ...((inheritance?.config as Record<string, any>) ?? {}),
                },
            });
        }

        // 3. Agregar LoyaltyRewards puramente locales (sin vínculo a recurso global)
        const localRewards = await prisma.loyaltyReward.findMany({
            where: { negocioId },
            orderBy: { createdAt: 'asc' },
        });

        for (const lr of localRewards) {
            // Si ya fue incluido como CUSTOMIZED de un global, saltarlo
            const alreadyIncluded = resolved.some(
                r => r.source === 'LOCAL' && r.data?.id === lr.id
            );
            if (!alreadyIncluded) {
                resolved.push({
                    source: 'LOCAL',
                    mode: BusinessInheritanceMode.CUSTOMIZED,
                    resourceId: lr.id,
                    data: lr,
                });
            }
        }

        return resolved;
    }

    /**
     * Resuelve el catálogo de cupones del Club para un negocio.
     * Combina CouponTemplates globales (habilitados) + Coupons locales.
     */
    static async resolveCoupons(negocioId: string): Promise<ResolvedResource<any>[]> {
        // 1. Obtener todos los CouponTemplates activos
        const globalTemplates = await prisma.couponTemplate.findMany({
            where: { activo: true },
            orderBy: { createdAt: 'asc' },
        });

        // 2. Obtener registros de herencia para COUPON_TEMPLATE
        const inheritances = await prisma.businessInheritance.findMany({
            where: { negocioId, resourceType: InheritanceResource.COUPON_TEMPLATE },
        });
        const inheritanceMap = new Map(inheritances.map(i => [i.resourceId, i]));

        const resolved: ResolvedResource<any>[] = [];

        for (const template of globalTemplates) {
            const inheritance = inheritanceMap.get(template.id);
            const mode = inheritance?.mode ?? BusinessInheritanceMode.INHERITED;

            if (mode === BusinessInheritanceMode.DISABLED) continue;

            if (mode === BusinessInheritanceMode.CUSTOMIZED && inheritance?.customId) {
                // El negocio tiene su propio Coupon personalizado
                const localCoupon = await prisma.coupon.findUnique({
                    where: { id: inheritance.customId },
                });
                if (localCoupon) {
                    resolved.push({ source: 'LOCAL', mode, resourceId: template.id, data: localCoupon });
                    continue;
                }
            }

            // INHERITED: exponer el CouponTemplate global
            resolved.push({
                source: 'GLOBAL',
                mode,
                resourceId: template.id,
                data: template,
            });
        }

        // 3. Agregar Coupons puramente locales
        const localCoupons = await prisma.coupon.findMany({
            where: { negocioId },
            orderBy: { createdAt: 'asc' },
        });

        for (const coupon of localCoupons) {
            const alreadyIncluded = resolved.some(
                r => r.source === 'LOCAL' && r.data?.id === coupon.id
            );
            if (!alreadyIncluded) {
                resolved.push({
                    source: 'LOCAL',
                    mode: BusinessInheritanceMode.CUSTOMIZED,
                    resourceId: coupon.id,
                    data: coupon,
                });
            }
        }

        return resolved;
    }

    /**
     * Resuelve el estado completo del Club Citiox para un negocio.
     * Retorna todos los recursos ya resueltos.
     */
    static async resolveClub(negocioId: string): Promise<{
        season: ResolvedResource<any> | null;
        levels: ResolvedResource<any>[];
        rewards: ResolvedResource<any>[];
        coupons: ResolvedResource<any>[];
    }> {
        const [season, levels, rewards, coupons] = await Promise.all([
            this.resolveSeason(negocioId),
            this.resolveLevels(negocioId),
            this.resolveRewards(negocioId),
            this.resolveCoupons(negocioId),
        ]);

        return { season, levels, rewards, coupons };
    }

    // ─── GESTIÓN DE HERENCIA ─────────────────────────────────────────────────
    // Métodos para cambiar el modo de herencia de un recurso global.
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Configura un recurso global como INHERITED para un negocio.
     * Crea o actualiza el registro en BusinessInheritance.
     */
    static async useGlobal(
        negocioId: string,
        resourceType: InheritanceResource,
        resourceId: string
    ) {
        return prisma.businessInheritance.upsert({
            where: { negocioId_resourceType_resourceId: { negocioId, resourceType, resourceId } },
            update: { mode: BusinessInheritanceMode.INHERITED, customId: null },
            create: { negocioId, resourceType, resourceId, mode: BusinessInheritanceMode.INHERITED },
        });
    }

    /**
     * Configura un recurso como DISABLED para un negocio.
     */
    static async disableResource(
        negocioId: string,
        resourceType: InheritanceResource,
        resourceId: string
    ) {
        return prisma.businessInheritance.upsert({
            where: { negocioId_resourceType_resourceId: { negocioId, resourceType, resourceId } },
            update: { mode: BusinessInheritanceMode.DISABLED },
            create: { negocioId, resourceType, resourceId, mode: BusinessInheritanceMode.DISABLED },
        });
    }

    /**
     * Configura un recurso como CUSTOMIZED para un negocio, guardando el customId.
     * Este método es llamado DESPUÉS de que la capa superior crea el recurso local.
     */
    static async setCustomized(
        negocioId: string,
        resourceType: InheritanceResource,
        resourceId: string,
        customId: string,
        config?: any
    ) {
        return prisma.businessInheritance.upsert({
            where: { negocioId_resourceType_resourceId: { negocioId, resourceType, resourceId } },
            update: { mode: BusinessInheritanceMode.CUSTOMIZED, customId, config: config ?? undefined },
            create: {
                negocioId,
                resourceType,
                resourceId,
                mode: BusinessInheritanceMode.CUSTOMIZED,
                customId,
                config: config ?? undefined,
            },
        });
    }
}
