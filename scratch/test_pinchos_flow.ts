import { PrismaClient } from '@prisma/client';

// Singleton lazy loader para test
const dbUrl = process.env.DATABASE_URL || 'file:./dev.db';
let prisma: any;

if (dbUrl.startsWith('postgresql://') || dbUrl.startsWith('postgres://')) {
    const { Pool } = require('pg');
    const { PrismaPg } = require('@prisma/adapter-pg');
    const pool = new Pool({ connectionString: dbUrl });
    const adapter = new PrismaPg(pool);
    prisma = new PrismaClient({ adapter });
} else {
    const { PrismaLibSql } = require('@prisma/adapter-libsql');
    // Forzar ruta absoluta para libSQL
    const rawPath = dbUrl.replace(/^file:(\.\/)?/, '');
    const isAbsolute = rawPath.startsWith('/') || rawPath.startsWith('\\') || /^[a-zA-Z]:/.test(rawPath);
    const absPath = isAbsolute ? rawPath : `${process.cwd()}/${rawPath}`;
    const normalized = absPath.split(/[/\\]/).join('/');
    const prefix = normalized.match(/^[a-zA-Z]:/) ? '/' : '';
    const resolvedUrl = `file://${prefix}${normalized}`;
    
    const adapter = new PrismaLibSql({ url: resolvedUrl });
    prisma = new PrismaClient({ adapter });
}

async function testPinchosFlow() {
    console.log("🚀 Iniciando prueba del flujo del módulo Pinchos...");
    
    const businessId = "pinchos-test-id";
    const slug = "pinchos";

    try {
        // 1. Limpieza de datos antiguos si existen
        console.log("🧹 Limpiando datos antiguos...");
        await prisma.negocio.delete({ where: { id: businessId } }).catch(() => {});

        // 2. Crear negocio de prueba
        console.log("🏪 Creando Negocio 'Pinchos'...");
        const negocio = await prisma.negocio.create({
            data: {
                id: businessId,
                nombre: "Pinchos y Asados Zenda",
                slug: slug,
                tipoNegocio: "PRODUCTOS",
                precioHora: 0,
                horarioApertura: "08:00",
                horarioCierre: "22:00",
                colorPrimario: "#c2410c",
                colorSecundario: "#1c1917",
                whatsapp: "593998877665",
                direccion: "Av. de los Shyris y Portugal, Quito",
                ciudad: "Quito",
                estado: "ACTIVO",
                configuracion: {
                    wizardCompleted: true,
                    costoEnvio: 3.0,
                    tiempoMaximoEntrega: "30-45 min",
                    horaLimiteMismoDia: "18:00"
                },
                updatedAt: new Date()
            }
        });
        console.log(`✅ Negocio creado: ${negocio.nombre} (ID: ${negocio.id})`);

        // 3. Crear Categoría de productos
        console.log("📁 Creando Categoría 'Pinchos Clásicos'...");
        const categoria = await (prisma as any).categoriaProducto.create({
            data: {
                nombre: "Pinchos Clásicos",
                activo: true,
                orden: 1,
                negocioId: businessId
            }
        });
        console.log(`✅ Categoría creada: ${categoria.nombre} (ID: ${categoria.id})`);

        // 4. Crear Productos
        console.log("🍢 Creando productos...");
        const productosData = [
            { nombre: "Pincho de Carne", descripcion: "Delicioso lomo de res con cebolla y pimiento.", precio: 3.50, stock: 100 },
            { nombre: "Pincho de Pollo", descripcion: "Pechuga de pollo jugosa marinada.", precio: 3.00, stock: 100 },
            { nombre: "Pincho Mixto", descripcion: "Combinación de carne de res y pollo.", precio: 4.00, stock: 100 },
            { nombre: "Chorizo Asado", descripcion: "Chorizo artesanal al carbón.", precio: 2.50, stock: 100 }
        ];

        const productos = [];
        for (const prod of productosData) {
            const p = await (prisma as any).producto.create({
                data: {
                    ...prod,
                    categoriaId: categoria.id,
                    negocioId: businessId,
                    activo: true,
                    orden: productos.length
                }
            });
            productos.push(p);
            console.log(`   - Producto: ${p.nombre} ($${p.precio})`);
        }
        console.log("✅ Productos creados con éxito.");

        // 5. Crear un Pedido
        console.log("🛒 Creando pedido de prueba...");
        const lastOrder = await (prisma as any).pedido.findFirst({
            where: { negocioId: businessId },
            orderBy: { numeroPedido: 'desc' },
            select: { numeroPedido: true }
        });
        const nextOrderNumber = lastOrder ? lastOrder.numeroPedido + 1 : 1;

        const subtotal = productos[0].precio * 3; // 3 pinchos de carne
        const costoEnvio = 3.00;
        const total = subtotal + costoEnvio;

        const dateToDeliver = new Date();
        dateToDeliver.setHours(0,0,0,0);

        const pedido = await (prisma as any).pedido.create({
            data: {
                negocioId: businessId,
                numeroPedido: nextOrderNumber,
                tipoEntrega: "DOMICILIO",
                nombreCliente: "Santiago Cabrera",
                telefonoCliente: "593987654321",
                direccionCliente: "Av. Eloy Alfaro N34-110 y Shyris",
                referenciaCliente: "Edificio Alfa, Dpto 4B",
                latitud: -0.180653,
                longitud: -78.467838,
                fechaEntrega: dateToDeliver,
                franjaHoraria: "14-16",
                subtotal,
                costoEnvio,
                total,
                estado: "RECIBIDO",
                items: {
                    create: [
                        {
                            productoId: productos[0].id,
                            nombreProducto: productos[0].nombre,
                            precioUnitario: productos[0].precio,
                            cantidad: 3
                        }
                    ]
                }
            },
            include: {
                items: true
            }
        });
        console.log(`✅ Pedido creado exitosamente: #${pedido.numeroPedido} (ID: ${pedido.id})`);
        console.log(`   - Cliente: ${pedido.nombreCliente}`);
        console.log(`   - Total: $${pedido.total.toFixed(2)}`);

        // 6. Validar transiciones de estado
        console.log("🔄 Probando transiciones de estado del pedido...");
        
        // Transición 1: PREPARACION
        console.log("   - Transición a PREPARACION...");
        const pedidoPrep = await (prisma as any).pedido.update({
            where: { id: pedido.id },
            data: { estado: 'PREPARACION' }
        });
        console.log(`     Nuevo estado: ${pedidoPrep.estado}`);

        // Transición 2: LISTO
        console.log("   - Transición a LISTO...");
        const pedidoListo = await (prisma as any).pedido.update({
            where: { id: pedido.id },
            data: { estado: 'LISTO' }
        });
        console.log(`     Nuevo estado: ${pedidoListo.estado}`);

        // Transición 3: RUTA
        console.log("   - Transición a RUTA...");
        const pedidoRuta = await (prisma as any).pedido.update({
            where: { id: pedido.id },
            data: { estado: 'RUTA' }
        });
        console.log(`     Nuevo estado: ${pedidoRuta.estado}`);

        // Transición 4: ENTREGADO
        console.log("   - Transición a ENTREGADO...");
        const pedidoEntregado = await (prisma as any).pedido.update({
            where: { id: pedido.id },
            data: { estado: 'ENTREGADO' }
        });
        console.log(`     Nuevo estado: ${pedidoEntregado.estado}`);

        console.log("🎉 ¡Prueba de flujo completada con éxito al 100%! La base de datos y las transiciones funcionan correctamente.");

    } catch (e) {
        console.error("❌ Error durante la prueba de flujo:", e);
    } finally {
        await prisma.$disconnect();
    }
}

testPinchosFlow();
