import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { PaymentService } from '@/lib/payments/PaymentService';
import path from 'path';
import fs from 'fs';

export async function POST(
    req: NextRequest,
    context: { params: Promise<{ slug: string; id: string }> }
) {
    try {
        const { id: pedidoId } = await context.params;

        // Buscar el pedido y su pago
        const payment = await prisma.orderPayment.findUnique({
            where: { pedidoId },
            include: { pedido: true }
        });

        if (!payment) {
            return NextResponse.json(
                { success: false, error: 'No se encontró registro de pago para este pedido.' },
                { status: 404 }
            );
        }

        const formData = await req.formData();
        const file = formData.get('file') as File | null;

        if (!file) {
            return NextResponse.json(
                { success: false, error: 'Debe adjuntar un archivo comprobante.' },
                { status: 400 }
            );
        }

        // 1. Validar Tipo MIME
        const allowedMimeTypes = [
            'image/jpeg',
            'image/png',
            'image/webp',
            'application/pdf'
        ];
        if (!allowedMimeTypes.includes(file.type.toLowerCase())) {
            return NextResponse.json(
                { success: false, error: 'Tipo de archivo no permitido. Solo se aceptan imágenes (JPG, PNG, WEBP) o documentos PDF.' },
                { status: 400 }
            );
        }

        // 2. Validar tamaño (máximo 5MB)
        const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
        if (file.size > MAX_SIZE) {
            return NextResponse.json(
                { success: false, error: 'El archivo supera el tamaño máximo permitido de 5 MB.' },
                { status: 400 }
            );
        }

        // 3. Guardar archivo en disco
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'comprobantes');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        const ext = file.name.split('.').pop() || (file.type === 'application/pdf' ? 'pdf' : 'png');
        const filename = `comprobante_${payment.id}_${Date.now()}.${ext}`;
        const filePath = path.join(uploadDir, filename);

        fs.writeFileSync(filePath, buffer);

        const publicUrl = `/uploads/comprobantes/${filename}`;
        const fileType = file.type === 'application/pdf' ? 'PDF' : 'IMAGE';

        // 4. Invocar PaymentService
        const result = await PaymentService.uploadEvidence({
            paymentId: payment.id,
            fileUrl: publicUrl,
            fileType,
            mimeType: file.type,
            fileSize: file.size,
            uploadedBy: payment.pedido.nombreCliente || 'CLIENTE'
        });

        return NextResponse.json({
            success: true,
            message: 'Comprobante subido y enviado a revisión exitosamente.',
            evidence: result.evidence,
            payment: result.payment
        });

    } catch (error: any) {
        console.error('Error al subir comprobante de pago:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Error interno al procesar comprobante.' },
            { status: 500 }
        );
    }
}
