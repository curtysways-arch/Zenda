import { NextResponse } from 'next/server';
import { getWhatsAppStatus, getWhatsAppQR, whatsappConnect, whatsappDisconnect } from '@/lib/whatsapp-client';
import { getServerSession } from "next-auth";
// Importar authOptions si es necesario, o usar una verificación de rol manual
// Para simplificar, asumiremos que el middleware protege esta ruta o verificaremos el rol aquí.

export async function GET() {
    try {
        const status = await getWhatsAppStatus();
        let qr = null;
        
        if (!status.connected && status.hasQR) {
            const qrRes = await getWhatsAppQR();
            qr = qrRes.qr;
        }

        return NextResponse.json({ ...status, qr });
    } catch (error) {
        return NextResponse.json({ status: 'error', error: 'No se pudo contactar con el bot' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const { action } = await req.json();

        if (action === 'connect') {
            const success = await whatsappConnect();
            return NextResponse.json({ success });
        }

        if (action === 'disconnect') {
            const success = await whatsappDisconnect();
            return NextResponse.json({ success });
        }

        return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
    } catch (error) {
        return NextResponse.json({ error: 'Error interno' }, { status: 500 });
    }
}
