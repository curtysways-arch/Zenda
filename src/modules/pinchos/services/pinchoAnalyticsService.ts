import prisma from '@/lib/prisma';

export type CheckoutStepName = 
    | 'ADD_TO_CART'
    | 'CHECKOUT_START'
    | 'OTP_VALIDATED'
    | 'ADDRESS_ENTERED'
    | 'PAYMENT_PAGE_VIEW'
    | 'EVIDENCE_UPLOADED'
    | 'PAYMENT_CONFIRMED'
    | 'ABANDONED';

export class PinchoAnalyticsService {
    public static async trackStep(payload: {
        storeId: string;
        sessionId: string;
        stepName: CheckoutStepName;
        stepIndex: number;
        timeSpentMs?: number;
        metadata?: any;
    }) {
        const { storeId, sessionId, stepName, stepIndex, timeSpentMs, metadata } = payload;
        try {
            return await (prisma as any).pinchoCheckoutAnalytics.create({
                data: {
                    negocioId: storeId,
                    sessionId,
                    stepName,
                    stepIndex,
                    timeSpentMs: timeSpentMs || null,
                    metadata: metadata ? (metadata as any) : undefined
                }
            });
        } catch (e) {
            console.error('[PinchoAnalyticsService] Error tracking step:', e);
            return null;
        }
    }

    public static async getFunnelMetrics(storeId: string) {
        const events = await (prisma as any).pinchoCheckoutAnalytics.findMany({
            where: { negocioId: storeId }
        });

        const stepCounts: Record<string, number> = {
            ADD_TO_CART: 0,
            CHECKOUT_START: 0,
            OTP_VALIDATED: 0,
            ADDRESS_ENTERED: 0,
            PAYMENT_PAGE_VIEW: 0,
            EVIDENCE_UPLOADED: 0,
            PAYMENT_CONFIRMED: 0,
            ABANDONED: 0
        };

        events.forEach((ev: any) => {
            if (stepCounts[ev.stepName] !== undefined) {
                stepCounts[ev.stepName]++;
            }
        });

        const totalCheckoutStarts = stepCounts.CHECKOUT_START || 1;
        const totalConfirmed = stepCounts.PAYMENT_CONFIRMED || 0;
        const conversionRate = parseFloat(((totalConfirmed / totalCheckoutStarts) * 100).toFixed(2));
        const abandonmentRate = parseFloat((100 - conversionRate).toFixed(2));

        return {
            stepCounts,
            totalEvents: events.length,
            conversionRate,
            abandonmentRate
        };
    }
}
