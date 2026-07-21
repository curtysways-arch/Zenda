import prisma from '../prisma';
import crypto from 'crypto';

export interface UnifiedRewardData {
    id: string;
    tipoOrigen: 'PUNTOS' | 'REFERIDO';
    rewardType: 'PRODUCTO' | 'SERVICIO' | 'CUPON' | 'CASHBACK' | 'SERVICIO_GRATIS' | 'REGALO_FISICO' | string;
    nombre: string;
    descripcion: string;
    claimCode: string | null;
    claimToken: string | null;
    claimTokenExpiresAt: Date | null;
    claimTokenRevokedAt: Date | null;
    scanCount: number;
    estado: string;
    fechaSolicitud: Date | null;
    fechaRetiro: Date | null;
    negocioId: string;
    negocioNombre: string;
    userId: string;
    clienteNombre: string;
    clienteTelefono: string;
    entregadoPorId: string | null;
    entregadoPorNombre?: string | null;
}

export class RewardService {
    
    // Generar la firma criptográfica HMAC del claimToken para validar el QR
    static generateHMAC(claimToken: string): string {
        const secret = process.env.NEXTAUTH_SECRET || 'c1t10x-s3cr3t-k3y-2026-f1d3l1ty';
        return crypto.createHmac('sha256', secret).update(claimToken).digest('hex').substring(0, 16);
    }

    // Validar la firma recibida en el query string del QR
    static verifySignature(claimToken: string, sig?: string): boolean {
        if (!sig) return false;
        return this.generateHMAC(claimToken) === sig;
    }

    // Búsqueda unificada por claimToken
    static async findByClaimToken(token: string): Promise<UnifiedRewardData | null> {
        // 1. Buscar en LoyaltyRedemption (Canje de puntos o misiones)
        const loyalty = await prisma.loyaltyRedemption.findUnique({
            where: { claimToken: token },
            include: {
                Usuario: true,
                Negocio: true,
                Reward: true
            }
        });

        if (loyalty) {
            return {
                id: loyalty.id,
                tipoOrigen: 'PUNTOS',
                rewardType: loyalty.Reward.tipo,
                nombre: loyalty.Reward.nombre,
                descripcion: loyalty.Reward.descripcion,
                claimCode: loyalty.claimCode,
                claimToken: loyalty.claimToken,
                claimTokenExpiresAt: loyalty.claimTokenExpiresAt,
                claimTokenRevokedAt: loyalty.claimTokenRevokedAt,
                scanCount: loyalty.scanCount,
                estado: loyalty.estado,
                fechaSolicitud: loyalty.fechaSolicitud,
                fechaRetiro: loyalty.fechaRetiro,
                negocioId: loyalty.negocioId,
                negocioNombre: loyalty.Negocio.nombre,
                userId: loyalty.userId,
                clienteNombre: loyalty.Usuario.nombre || 'Cliente',
                clienteTelefono: loyalty.Usuario.phone || '',
                entregadoPorId: loyalty.entregadoPorId
            };
        }

        // 2. Buscar en ReferralReward (Premios por referidos)
        const referral = await prisma.referralReward.findUnique({
            where: { claimToken: token },
            include: {
                Usuario: true,
                Negocio: true,
                Campaign: true
            }
        });

        if (referral) {
            return {
                id: referral.id,
                tipoOrigen: 'REFERIDO',
                rewardType: referral.Campaign.rewardType || 'REGALO_FISICO',
                nombre: referral.Campaign.nombre || 'Premio de Referido',
                descripcion: referral.Campaign.descripcion || '',
                claimCode: referral.claimCode,
                claimToken: referral.claimToken,
                claimTokenExpiresAt: referral.claimTokenExpiresAt,
                claimTokenRevokedAt: referral.claimTokenRevokedAt,
                scanCount: referral.scanCount,
                estado: referral.estado,
                fechaSolicitud: referral.fechaSolicitud,
                fechaRetiro: referral.fechaRetiro,
                negocioId: referral.negocioId,
                negocioNombre: referral.Negocio.nombre,
                userId: referral.userId,
                clienteNombre: referral.Usuario.nombre || 'Cliente',
                clienteTelefono: referral.Usuario.phone || '',
                entregadoPorId: referral.entregadoPorId
            };
        }

        return null;
    }

    // Búsqueda unificada por claimCode (Código corto) y negocioId
    static async findByClaimCode(negocioId: string, code: string): Promise<UnifiedRewardData | null> {
        // Limpiar código de espacios y guiones
        const cleanCode = code.trim().toUpperCase();

        // 1. Buscar en LoyaltyRedemption
        const loyalty = await prisma.loyaltyRedemption.findFirst({
            where: { negocioId, claimCode: cleanCode },
            include: {
                Usuario: true,
                Negocio: true,
                Reward: true
            }
        });

        if (loyalty) {
            return {
                id: loyalty.id,
                tipoOrigen: 'PUNTOS',
                rewardType: loyalty.Reward.tipo,
                nombre: loyalty.Reward.nombre,
                descripcion: loyalty.Reward.descripcion,
                claimCode: loyalty.claimCode,
                claimToken: loyalty.claimToken,
                claimTokenExpiresAt: loyalty.claimTokenExpiresAt,
                claimTokenRevokedAt: loyalty.claimTokenRevokedAt,
                scanCount: loyalty.scanCount,
                estado: loyalty.estado,
                fechaSolicitud: loyalty.fechaSolicitud,
                fechaRetiro: loyalty.fechaRetiro,
                negocioId: loyalty.negocioId,
                negocioNombre: loyalty.Negocio.nombre,
                userId: loyalty.userId,
                clienteNombre: loyalty.Usuario.nombre || 'Cliente',
                clienteTelefono: loyalty.Usuario.phone || '',
                entregadoPorId: loyalty.entregadoPorId
            };
        }

        // 2. Buscar en ReferralReward
        const referral = await prisma.referralReward.findFirst({
            where: { negocioId, claimCode: cleanCode },
            include: {
                Usuario: true,
                Negocio: true,
                Campaign: true
            }
        });

        if (referral) {
            return {
                id: referral.id,
                tipoOrigen: 'REFERIDO',
                rewardType: referral.Campaign.rewardType || 'REGALO_FISICO',
                nombre: referral.Campaign.nombre || 'Premio de Referido',
                descripcion: referral.Campaign.descripcion || '',
                claimCode: referral.claimCode,
                claimToken: referral.claimToken,
                claimTokenExpiresAt: referral.claimTokenExpiresAt,
                claimTokenRevokedAt: referral.claimTokenRevokedAt,
                scanCount: referral.scanCount,
                estado: referral.estado,
                fechaSolicitud: referral.fechaSolicitud,
                fechaRetiro: referral.fechaRetiro,
                negocioId: referral.negocioId,
                negocioNombre: referral.Negocio.nombre,
                userId: referral.userId,
                clienteNombre: referral.Usuario.nombre || 'Cliente',
                clienteTelefono: referral.Usuario.phone || '',
                entregadoPorId: referral.entregadoPorId
            };
        }

        return null;
    }

    // Actualización de estado, control de entrega e invalidación del token
    static async updateStatus(
        rewardId: string,
        type: 'PUNTOS' | 'REFERIDO',
        newStatus: string,
        employeeId?: string
    ): Promise<any> {
        const updateData: any = { estado: newStatus };

        if (newStatus === 'ENTREGADO') {
            const now = new Date();
            updateData.fechaRetiro = now;
            updateData.fechaEntrega = now;
            updateData.fechaEntregaConfirmada = now;
            updateData.entregadoPorId = employeeId || null;
            updateData.claimTokenRevokedAt = now; // Revocar token del QR al entregar
        } else if (newStatus === 'LISTO_PARA_RETIRAR') {
            updateData.fechaEntrega = null; // Resetear fechas por si se revierte
        }

        if (type === 'PUNTOS') {
            return await prisma.loyaltyRedemption.update({
                where: { id: rewardId },
                data: updateData,
                include: { Reward: true, Usuario: true }
            });
        } else {
            return await prisma.referralReward.update({
                where: { id: rewardId },
                data: updateData,
                include: { Campaign: true, Usuario: true }
            });
        }
    }

    // Incrementar el contador de escaneos de un QR
    static async incrementScanCount(rewardId: string, type: 'PUNTOS' | 'REFERIDO'): Promise<void> {
        if (type === 'PUNTOS') {
            await prisma.loyaltyRedemption.update({
                where: { id: rewardId },
                data: { scanCount: { increment: 1 } }
            });
        } else {
            await prisma.referralReward.update({
                where: { id: rewardId },
                data: { scanCount: { increment: 1 } }
            });
        }
    }

    // Registrar auditoría en la tabla RewardAudit
    static async createAudit(
        rewardId: string,
        type: 'PUNTOS' | 'REFERIDO',
        action: string,
        data: {
            employeeId?: string;
            ip?: string;
            userAgent?: string;
            oldStatus?: string;
            newStatus?: string;
            claimCode?: string | null;
            negocioId: string;
        }
    ): Promise<void> {
        try {
            await prisma.rewardAudit.create({
                data: {
                    rewardId,
                    rewardType: type,
                    accion: action,
                    claimCode: data.claimCode || null,
                    estadoAnterior: data.oldStatus || null,
                    estadoNuevo: data.newStatus || null,
                    empleadoId: data.employeeId || null,
                    negocioId: data.negocioId,
                    ip: data.ip || null,
                    userAgent: data.userAgent || null
                }
            });
        } catch (auditError) {
            console.error('[RewardService] Error al crear registro de auditoría:', auditError);
        }
    }
}
