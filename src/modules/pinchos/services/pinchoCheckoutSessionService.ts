import prisma from '@/lib/prisma';
import { PinchoCartState } from './pinchoCartService';

export interface PinchoSessionPayload {
    storeId: string;
    sessionId: string;
    clientPhone?: string;
    clientName?: string;
    stepIndex: number;
    cartState: PinchoCartState;
}

export class PinchoCheckoutSessionService {
    public static async saveSession(payload: PinchoSessionPayload) {
        const { storeId, sessionId, clientPhone, clientName, stepIndex, cartState } = payload;

        return await (prisma as any).pinchoCheckoutSession.upsert({
            where: { sessionId },
            create: {
                negocioId: storeId,
                sessionId,
                clienteTelefono: clientPhone || null,
                clienteNombre: clientName || null,
                pasoActual: stepIndex,
                items: cartState.items as any,
                cuponCodigo: cartState.couponCode || null,
                tipoEntrega: cartState.deliveryType,
                direccion: cartState.deliveryAddress || null,
                referencia: cartState.deliveryReference || null,
                latitud: cartState.lat || null,
                longitud: cartState.lng || null,
                metodoPago: null,
                observaciones: cartState.observations || null
            },
            update: {
                clienteTelefono: clientPhone || null,
                clienteNombre: clientName || null,
                pasoActual: stepIndex,
                items: cartState.items as any,
                cuponCodigo: cartState.couponCode || null,
                tipoEntrega: cartState.deliveryType,
                direccion: cartState.deliveryAddress || null,
                referencia: cartState.deliveryReference || null,
                latitud: cartState.lat || null,
                longitud: cartState.lng || null,
                observaciones: cartState.observations || null
            }
        });
    }

    public static async getSession(sessionId: string) {
        if (!sessionId) return null;
        return await (prisma as any).pinchoCheckoutSession.findUnique({
            where: { sessionId }
        });
    }

    public static async deleteSession(sessionId: string) {
        if (!sessionId) return;
        try {
            await (prisma as any).pinchoCheckoutSession.delete({
                where: { sessionId }
            });
        } catch (e) {
            // Ignore if already deleted
        }
    }
}
