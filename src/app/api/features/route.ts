import { NextResponse } from 'next/server';
import { featureService } from '@/lib/services/featureService';
import { getEffectiveAdminSession } from '@/lib/delegatedAuth';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const session = await getEffectiveAdminSession();
        const negocioId = (session?.user as any)?.negocioId;
        if (!session?.user || !negocioId) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }
        
        // Obtener todas las features + límites en una sola llamada optimizada
        const features = await featureService.getAllFeatures(negocioId);
        const planMeta = await featureService.getPlanMeta(negocioId);

        return NextResponse.json({
            ...features,
            planName: planMeta?.planName || 'BEGIN',
            estado: planMeta?.estado || 'unknown',
            daysLeft: planMeta?.daysLeft ?? 0,
            fechaFin: planMeta?.fechaFin || null
        });
    } catch (error) {
        return NextResponse.json({ error: 'Error al obtener features' }, { status: 500 });
    }
}
