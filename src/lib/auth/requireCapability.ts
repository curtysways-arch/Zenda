import { NextResponse } from 'next/server';
import { EntitlementsService } from '@/core/entitlements/EntitlementsService';

/**
 * Helper de seguridad universal para validar que un negocio posea una capability contratada.
 * Retorna NextResponse con HTTP 403 si la capacidad está inhabilitada en su plan/suscripción,
 * o null si está autorizado para continuar.
 */
export async function requireCapability(
    businessId: string, 
    capabilityCode: string
): Promise<NextResponse | null> {
    if (!businessId) {
        return NextResponse.json(
            { error: 'Identificador de negocio requerido', code: 'BUSINESS_REQUIRED' },
            { status: 400 }
        );
    }

    const hasCap = await EntitlementsService.hasCapability(businessId, capabilityCode);
    if (!hasCap) {
        return NextResponse.json(
            {
                error: `Módulo no contratado en tu plan actual: ${capabilityCode.toUpperCase()}. Mejora tu plan en tu panel de administración.`,
                code: 'CAPABILITY_NOT_ENTITLED',
                requiredCapability: capabilityCode.toUpperCase()
            },
            { status: 403 }
        );
    }

    return null;
}
