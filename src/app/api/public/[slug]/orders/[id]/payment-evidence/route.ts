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

        // Notificar al negocio (Push + SSE + WhatsApp oficial del Bot)
        try {
            const { sseEmitter, notificationService } = require('@/lib/notifications/notificationService');
            const { whatsappService } = require('@/lib/whatsapp');

            // 1. Notificación Push al negocio
            await notificationService.sendPushToBusiness(
                payment.negocioId,
                `💳 Comprobante Recibido #${payment.pedido.numeroPedido}`,
                `El cliente ${payment.pedido.nombreCliente} ha subido su comprobante de pago por $${payment.monto.toFixed(2)}.`
            ).catch(() => {});

            // 2. Evento SSE en tiempo real
            sseEmitter.emit('realtime_event', {
                negocioId: payment.negocioId,
                type: 'PAGO_SUBIDO',
                title: `💳 Comprobante Recibido #${payment.pedido.numeroPedido}`,
                message: `Cliente: ${payment.pedido.nombreCliente} | $${payment.monto.toFixed(2)}`,
                pedidoId: payment.pedidoId
            });

            // 3. Mensaje de WhatsApp al teléfono del negocio
            const negocio = await prisma.negocio.findUnique({
                where: { id: payment.negocioId },
                select: { whatsapp: true, nombre: true }
            });

            const bizPhone = negocio?.whatsapp;
            if (bizPhone) {
                const fullPedido = await prisma.pedido.findUnique({
                    where: { id: payment.pedidoId },
                    include: { items: true }
                });

                if (fullPedido) {
                    const origin = req.nextUrl.origin || process.env.NEXTAUTH_URL || 'https://app.citiox.com';
                    const fullEvidenceUrl = publicUrl.startsWith('http') ? publicUrl : `${origin}${publicUrl}`;
                    const itemsList = fullPedido.items ? fullPedido.items.map((i: any) => `• ${i.cantidad}x ${i.nombreProducto} ($${(i.precioUnitario * i.cantidad).toFixed(2)})`).join('\n') : '';

                    let gpsLocation = '';
                    if (fullPedido.latitud && fullPedido.longitud) {
                        gpsLocation = `📍 *Ubicación GPS:* https://maps.google.com/?q=${fullPedido.latitud},${fullPedido.longitud}\n`;
                    }

                    let bizMsg = `💳 *¡COMPROBANTE DE PAGO RECIBIDO!* (Pedido #${fullPedido.numeroPedido})\n\n`;
                    bizMsg += `👤 *Cliente:* ${fullPedido.nombreCliente}\n`;
                    bizMsg += `📞 *Teléfono:* ${fullPedido.telefonoCliente}\n`;
                    bizMsg += `🚚 *Tipo:* ${fullPedido.tipoEntrega === 'DOMICILIO' ? 'Entrega a Domicilio' : 'Retiro en Local'}\n`;
                    if (fullPedido.tipoEntrega === 'DOMICILIO') {
                        bizMsg += `🏠 *Dirección:* ${fullPedido.direccionCliente || 'No especificada'}\n`;
                        if (fullPedido.referenciaCliente) bizMsg += `📝 *Referencia:* ${fullPedido.referenciaCliente}\n`;
                        if (gpsLocation) bizMsg += gpsLocation;
                    }
                    bizMsg += `\n📦 *Detalle del Pedido:*\n${itemsList}\n\n`;
                    bizMsg += `💰 *Monto a Verificar:* $${payment.monto.toFixed(2)}\n`;
                    bizMsg += `📄 *Comprobante Adjunto:* ${fullEvidenceUrl}\n\n`;
                    bizMsg += `⚠️ *Por favor verifica la transferencia en tu banca y confirma la fecha/hora de entrega en tu panel de control.*`;

                    await whatsappService.sendWhatsApp(bizPhone, bizMsg).catch((wErr: any) => {
                        console.error('[EVIDENCE_WHATSAPP_SEND_ERROR]', wErr);
                    });
                }
            }
        } catch (nErr) {
            console.error('[EVIDENCE_NOTIF_ERROR]', nErr);
        }

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
