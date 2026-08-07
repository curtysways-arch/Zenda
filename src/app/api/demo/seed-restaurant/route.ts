// src/app/api/demo/seed-restaurant/route.ts
// Endpoint Idempotente para sembrar la demo completa del restaurante "La Parrilla Citiox"
// Arquitectura: Manifest JSON → ProvisioningEngine → Runtime Context → Catalog + Mesas + Pedidos históricos

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import manifest from '@/core/templates/manifests/restaurant-demo.manifest.json';

export const dynamic = 'force-dynamic';

const DEMO_SLUG = 'parrilla-citiox-demo';

export async function GET() {
  try {
    // ── 1. Idempotencia: verificar si ya existe el negocio ─────────────────────
    const existing = await prisma.negocio.findUnique({ where: { slug: DEMO_SLUG } });
    if (existing) {

      const hashedPassword = await bcrypt.hash('CitioxDemo2026!', 10);
      const demoAdminEmail = 'demo.restaurante@citiox.com';

      let demoUser = await (prisma as any).usuario.findUnique({ where: { email: demoAdminEmail } });
      if (!demoUser) {
        await (prisma as any).usuario.create({
          data: {
            id: crypto.randomUUID(),
            email: demoAdminEmail,
            password: hashedPassword,
            nombre: 'Admin La Parrilla',
            role: 'ADMIN_NEGOCIO',
            negocioId: existing.id,
            updatedAt: new Date()
          }
        });
      } else {
        await (prisma as any).usuario.update({
          where: { email: demoAdminEmail },
          data: { negocioId: existing.id, role: 'ADMIN_NEGOCIO', password: hashedPassword, updatedAt: new Date() }
        });
      }

      const productCount = await (prisma as any).producto.count({ where: { negocioId: existing.id } });
      const tableCount = await (prisma as any).operableResource.count({ where: { negocioId: existing.id, category: 'TABLE' } });
      const orderCount = await (prisma as any).pedido.count({ where: { negocioId: existing.id } });
      const clientCount = await prisma.cliente.count({ where: { negocioId: existing.id } });
      return NextResponse.json({
        status: 'ALREADY_EXISTS',
        negocioId: existing.id,
        slug: existing.slug,
        credentials: {
          email: demoAdminEmail,
          password: 'CitioxDemo2026!',
          role: 'ADMIN_NEGOCIO'
        },
        stats: { productCount, tableCount, orderCount, clientCount }
      });
    }

    const businessId = crypto.randomUUID();
    const now = new Date();

    // ── 2. Crear el Negocio desde el Manifest ─────────────────────────────────
    const runtimeConfig = {
      blueprintId: manifest.blueprint,
      channels: manifest.channels,
      activeCapabilities: manifest.capabilities,
      activeModules: [],
      bannerUrl: null,
      timezone: 'America/Guayaquil',
      currency: 'USD',
      language: 'es',
      provisionedAt: now.toISOString(),
      isDemo: true,
      useEnterpriseRuntime: true,
      enterpriseRuntime: true
    };

    await prisma.negocio.create({
      data: {
        id: businessId,
        nombre: manifest.businessName,
        slug: DEMO_SLUG,
        tipoNegocio: 'PRODUCTOS', // Restaurante/Delivery → módulo ORDERS habilitado
        whatsapp: manifest.contacto.whatsapp,
        emailContacto: manifest.contacto.emailContacto,
        direccion: manifest.contacto.direccion,
        ciudad: manifest.contacto.ciudad,
        propietario: 'Citiox Demo',
        horarioApertura: manifest.contacto.horarioApertura,
        horarioCierre: manifest.contacto.horarioCierre,
        precioHora: 0,
        colorPrimario: manifest.branding.colorPrimario,
        colorSecundario: manifest.branding.colorSecundario,
        colorTerciario: manifest.branding.colorTerciario,
        colorNeutral: manifest.branding.colorNeutral,
        colorTexto: manifest.branding.colorTexto,
        heroTitulo: manifest.branding.heroTitulo,
        heroSubtitulo: manifest.branding.heroSubtitulo,
        logoUrl: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=200',
        isDemo: true,
        configuracion: runtimeConfig as any,
        updatedAt: now
      }
    });

    // ── 3. Crear Categorías de Productos ─────────────────────────────────────
    const categoryIds: Record<string, string> = {};
    for (const cat of manifest.catalog.categories) {
      const catId = crypto.randomUUID();
      categoryIds[cat.id] = catId;
      await (prisma as any).categoriaProducto.create({
        data: {
          id: catId,
          nombre: cat.nombre,
          orden: cat.orden,
          activo: true,
          negocioId: businessId
        }
      });
    }

    // ── 4. Crear Productos del Catálogo ──────────────────────────────────────
    const productIds: string[] = [];
    const productPrices: number[] = [];
    for (let i = 0; i < manifest.catalog.products.length; i++) {
      const p = manifest.catalog.products[i];
      const productId = crypto.randomUUID();
      productIds.push(productId);
      productPrices.push(p.precio);
      await (prisma as any).producto.create({
        data: {
          id: productId,
          nombre: p.nombre,
          descripcion: p.descripcion,
          precio: p.precio,
          imagenUrl: p.imagenUrl,
          activo: true,
          orden: i,
          negocioId: businessId,
          categoriaId: categoryIds[p.categoriaKey] || null
        }
      });
    }

    // ── 5. Crear 20 Mesas (OperableResource genérico) ─────────────────────────
    const tableIds: string[] = [];
    for (let i = 1; i <= manifest.initialResources.tables; i++) {
      const tableNum = String(i).padStart(2, '0');
      const tableId = crypto.randomUUID();
      tableIds.push(tableId);
      await (prisma as any).operableResource.create({
        data: {
          id: tableId,
          negocioId: businessId,
          name: `Mesa ${tableNum}`,
          resourceType: 'INFRASTRUCTURE',
          category: 'TABLE',
          capacity: manifest.initialResources.tableCapacity,
          estado: 'DISPONIBLE',
          metadata: { code: `MESA${tableNum}`, number: i }
        }
      });
    }

    // ── 6. Crear 50 Clientes Ficticios ───────────────────────────────────────
    const clienteNames = [
      'Carlos Ramírez', 'María González', 'Luis Pérez', 'Ana Martínez', 'Pedro López',
      'Laura Sánchez', 'Jorge Díaz', 'Carmen Torres', 'Roberto Flores', 'Isabel Vargas',
      'Miguel Castro', 'Sofía Moreno', 'Alejandro Herrera', 'Daniela Jiménez', 'Fernando Ruiz',
      'Valentina Cruz', 'Eduardo Morales', 'Patricia Reyes', 'Antonio Silva', 'Gabriela Ortiz',
      'Ricardo Mendoza', 'Natalia Guerrero', 'Javier Muñoz', 'Carolina Ramos', 'Sergio Aguilar',
      'Adriana Vega', 'Marcos Suárez', 'Lucía Delgado', 'Felipe Cabrera', 'Diana Medina',
      'Andrés Romero', 'Paula Guzmán', 'Héctor Navarro', 'Camila Rojas', 'Pablo Fuentes',
      'Valeria Espinoza', 'Rafael Castillo', 'Mónica Parra', 'Cristian Ríos', 'Stephanie Lara',
      'Guillermo Alvarado', 'Verónica Soto', 'Mauricio Córdoba', 'Rebeca Villanueva', 'César Peña',
      'Michelle Ibáñez', 'Rodrigo Heredia', 'Pamela Molina', 'Ernesto Trujillo', 'Katherine Arias'
    ];

    const clienteIds: string[] = [];
    for (let i = 0; i < 50; i++) {
      const clientId = crypto.randomUUID();
      clienteIds.push(clientId);
      const telefono = `+5939${String(91000000 + i).padStart(8, '0')}`;
      await (prisma as any).cliente.create({
        data: {
          id: clientId,
          nombre: clienteNames[i] || `Cliente ${i + 1}`,
          telefono,
          email: `cliente${i + 1}@demo.citiox.com`,
          negocioId: businessId,
          updatedAt: now
        }
      });
    }

    // ── 7. Crear 30 Pedidos Históricos para Métricas ─────────────────────────
    const estados = ['ENTREGADO', 'ENTREGADO', 'ENTREGADO', 'ENTREGADO', 'CANCELADO'];
    const tiposEntrega = ['RETIRO', 'DOMICILIO', 'MESA'];
    const diasAtras = [0, 0, 1, 1, 2, 2, 3, 4, 5, 6, 7, 7, 8, 9, 10, 10, 11, 12, 13, 14, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];

    for (let i = 0; i < 30; i++) {
      const pedidoId = crypto.randomUUID();
      const clientIdx = i % clienteIds.length;
      const prodIdx1 = i % productIds.length;
      const prodIdx2 = (i + 1) % productIds.length;
      const precio1 = productPrices[prodIdx1] || 10;
      const precio2 = productPrices[prodIdx2] || 5;
      const subtotal = precio1 + precio2;
      const tipoEntrega = tiposEntrega[i % tiposEntrega.length];
      const costoEnvio = tipoEntrega === 'DOMICILIO' ? 2.50 : 0;
      const total = subtotal + costoEnvio;
      const estadoPedido = estados[i % estados.length];
      const fechaPedido = new Date(now.getTime() - diasAtras[i] * 24 * 60 * 60 * 1000 - Math.random() * 8 * 60 * 60 * 1000);
      const tableNum = (i % 5) + 1;
      const mesaName = `Mesa ${String(tableNum).padStart(2, '0')}`;

      await (prisma as any).pedido.create({
        data: {
          id: pedidoId,
          negocioId: businessId,
          numeroPedido: i + 1,
          tipoEntrega,
          nombreCliente: clienteNames[clientIdx],
          telefonoCliente: `+5939${String(91000000 + clientIdx).padStart(8, '0')}`,
          direccionCliente: tipoEntrega === 'DOMICILIO' ? 'Av. Demo 456, Quito' : null,
          fechaEntrega: new Date(fechaPedido.getTime() + 30 * 60 * 1000),
          franjaHoraria: '12-14',
          subtotal,
          costoEnvio,
          total,
          estado: estadoPedido,
          notas: tipoEntrega === 'MESA' ? `Mesa: ${mesaName}` : null,
          extraInfo: tipoEntrega === 'MESA' 
            ? { tableName: mesaName, tableNumber: tableNum, origin: 'MESA', channel: 'MESA' }
            : { origin: 'POS_CAJA', channel: 'POS' },
          createdAt: fechaPedido,
          updatedAt: fechaPedido,
          items: {
            create: [
              {
                id: crypto.randomUUID(),
                productoId: productIds[prodIdx1],
                nombreProducto: manifest.catalog.products[prodIdx1]?.nombre || 'Producto 1',
                precioUnitario: precio1,
                cantidad: 1
              },
              {
                id: crypto.randomUUID(),
                productoId: productIds[prodIdx2],
                nombreProducto: manifest.catalog.products[prodIdx2]?.nombre || 'Producto 2',
                precioUnitario: precio2,
                cantidad: 1
              }
            ]
          }
        }
      });
    }

    // Crear 2 Pedidos Demo Exclusivos para Landing Web
    await (prisma as any).pedido.create({
      data: {
        id: crypto.randomUUID(),
        negocioId: businessId,
        numeroPedido: 99,
        tipoEntrega: 'DELIVERY_ORDER',
        nombreCliente: 'Sofía Benítez (Landing Web)',
        telefonoCliente: '+593998765432',
        direccionCliente: 'Av. 6 de Diciembre y Orellana, Quito',
        referenciaCliente: 'Frente al parque, apto 402',
        fechaEntrega: new Date(),
        franjaHoraria: 'Inmediata',
        subtotal: 24.50,
        costoEnvio: 2.50,
        total: 27.00,
        estado: 'PENDIENTE',
        extraInfo: { channel: 'WEB', origin: 'LANDING_WEB' },
        createdAt: new Date(),
        updatedAt: new Date(),
        items: {
          create: [
            {
              id: crypto.randomUUID(),
              productoId: productIds[0],
              nombreProducto: manifest.catalog.products[0]?.nombre || 'Parrillada Familiar',
              precioUnitario: 24.50,
              cantidad: 1
            }
          ]
        }
      }
    });

    // ── 8. Crear Usuario Administrador de la Demo ──────────────────────────────
    const hashedPassword = await bcrypt.hash('CitioxDemo2026!', 10);
    const demoAdminEmail = 'demo.restaurante@citiox.com';

    let demoUser = await (prisma as any).usuario.findUnique({ where: { email: demoAdminEmail } });
    if (!demoUser) {
      demoUser = await (prisma as any).usuario.create({
        data: {
          id: crypto.randomUUID(),
          email: demoAdminEmail,
          password: hashedPassword,
          nombre: 'Admin La Parrilla',
          role: 'ADMIN_NEGOCIO',
          negocioId: businessId,
          updatedAt: new Date()
        }
      });
    } else {
      await (prisma as any).usuario.update({
        where: { email: demoAdminEmail },
        data: { negocioId: businessId, role: 'ADMIN_NEGOCIO', password: hashedPassword, updatedAt: new Date() }
      });
    }

    return NextResponse.json({
      status: 'SEEDED',
      negocioId: businessId,
      slug: DEMO_SLUG,
      message: `Demo "${manifest.businessName}" creada exitosamente desde el manifest declarativo.`,
      credentials: {
        email: demoAdminEmail,
        password: 'CitioxDemo2026!',
        role: 'ADMIN_NEGOCIO'
      },
      stats: {
        categories: manifest.catalog.categories.length,
        products: manifest.catalog.products.length,
        tables: manifest.initialResources.tables,
        clients: 50,
        historicalOrders: 30
      },
      urls: {
        landing: `/${DEMO_SLUG}`,
        mesa: `/${DEMO_SLUG}/mesa/01`,
        cocina: `/${DEMO_SLUG}/cocina`,
        mesero: `/${DEMO_SLUG}/mesero`,
        admin: `/admin`
      }
    });

  } catch (err: any) {
    console.error('[SEED_RESTAURANT_ERROR]', err);
    return NextResponse.json({ error: err.message || 'Error al sembrar la demo' }, { status: 500 });
  }
}
