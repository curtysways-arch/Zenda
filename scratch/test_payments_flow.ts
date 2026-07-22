import { PaymentService } from '../src/lib/payments/PaymentService';
import { prisma } from '../src/lib/prisma';

async function testPaymentFlow() {
    console.log('🧪 Iniciando prueba del Sistema de Pagos Clean Architecture...\n');

    try {
        // 1. Obtener cualquier negocio existente
        const negocio = await prisma.negocio.findFirst();

        if (!negocio) {
            console.error('❌ Ningún negocio encontrado en la BD. Abortando test.');
            return;
        }

        console.log(`✅ Negocio encontrado: ${negocio.nombre} (${negocio.id})`);

        // 2. Crear un pedido de prueba
        const testOrder = await prisma.pedido.create({
            data: {
                negocioId: negocio.id,
                numeroPedido: Math.floor(9000 + Math.random() * 900),
                tipoEntrega: 'DOMICILIO',
                nombreCliente: 'Cliente Prueba OTP',
                telefonoCliente: '0991234567',
                direccionCliente: 'Av. Amazonas y Colón, Quito',
                fechaEntrega: new Date(),
                franjaHoraria: '18-20',
                subtotal: 12.00,
                costoEnvio: 2.00,
                total: 14.00,
                estado: 'PENDIENTE_PAGO',
                items: {
                    create: [
                        { nombreProducto: 'Pincho de Res Especial', cantidad: 2, precioUnitario: 6.00 }
                    ]
                }
            }
        });

        console.log(`✅ Pedido de prueba creado: #${testOrder.numeroPedido} (ID: ${testOrder.id})`);

        // 3. Crear el Pago inicial (PaymentService)
        const initialPayment = await PaymentService.createInitialPayment({
            pedidoId: testOrder.id,
            negocioId: negocio.id,
            monto: testOrder.total
        });

        console.log(`✅ Pago inicial creado en estado: ${initialPayment.estado} | Código de Pago: ${initialPayment.codigoPago}`);

        // 4. Probar Guard: Intentar cambiar el pedido a EN_PREPARACION sin pago verificado (debe fallar)
        console.log('\n🔒 Probando Guard de producción (Intento de pasar a EN_PREPARACION sin pago)...');
        try {
            await PaymentService.guardOrderProduction(testOrder.id, 'EN_PREPARACION');
            console.error('❌ ERROR CRÍTICO: El guard falló, permitió pasar a producción sin pago confirmado.');
        } catch (guardErr: any) {
            console.log(`🛡️ GUARD FUNCIONANDO CORRECTAMENTE: "${guardErr.message}"`);
        }

        // 5. Cargar Comprobante de Pago (Simulación de Subida)
        console.log('\n📤 Registrando comprobante de pago...');
        const evidenceResult = await PaymentService.uploadEvidence({
            paymentId: initialPayment.id,
            fileUrl: '/uploads/comprobantes/test_receipt.png',
            fileType: 'IMAGE',
            mimeType: 'image/png',
            fileSize: 1024 * 500, // 500 KB
            uploadedBy: 'Cliente Prueba OTP'
        });

        console.log(`✅ Comprobante registrado. Estado de Pago: ${evidenceResult.payment.estado}`);

        // 6. Aprobar Pago por el Administrador
        console.log('\n👑 Aprobando pago desde el Panel de Administración...');
        const approvalResult = await PaymentService.changePaymentStatus({
            paymentId: initialPayment.id,
            newStatus: 'CONFIRMADO',
            observacion: 'Pago verificado exitosamente en la cuenta bancaria de Pichincha.',
            responsableNombre: 'Admin Pinchos'
        });

        console.log(`✅ Estado de Pago actualizado a: ${approvalResult.updatedPayment.estado}`);
        console.log(`🚀 Estado del Pedido actualizado automáticamente a: ${approvalResult.nuevoEstadoPedido}`);

        // 7. Verificar Guard después de Aprobación
        console.log('\n🔒 Re-evaluando Guard de producción después de confirmación...');
        await PaymentService.guardOrderProduction(testOrder.id, 'EN_PREPARACION');
        console.log('✅ GUARD PERMITIDO: El pedido tiene su pago CONFIRMADO.');

        // Limpieza de datos de prueba
        await prisma.pedido.delete({ where: { id: testOrder.id } });
        console.log('\n🧹 Limpieza de pedido de prueba completada con éxito.');
        console.log('🎉 ¡Todas las pruebas del flujo de pagos pasaron exitosamente!');

    } catch (e: any) {
        console.error('❌ Error en el test de pagos:', e);
    } finally {
        if (prisma) {
            await prisma.$disconnect();
        }
    }
}

testPaymentFlow();
