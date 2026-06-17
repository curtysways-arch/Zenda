import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { 
    getWhatsAppStatus, 
    getWhatsAppQR, 
    whatsappConnect, 
    whatsappDisconnect 
} from '@/lib/whatsapp-client';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

        const [status, qrData] = await Promise.all([
            getWhatsAppStatus(),
            getWhatsAppQR()
        ]);

        return NextResponse.json({
            ...status,
            qr: qrData.qr
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

        const { action } = await req.json();

        if (action === 'connect') {
            await whatsappConnect();
            return NextResponse.json({ success: true });
        }

        if (action === 'disconnect') {
            await whatsappDisconnect();
            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
