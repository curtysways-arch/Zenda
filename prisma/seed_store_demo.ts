import * as dotenv from 'dotenv';
import * as path from 'path';
import hasher from 'bcryptjs';

dotenv.config({ path: path.join(process.cwd(), '.env') });

import prisma from '../src/lib/prisma';

export async function seedStoreDemo() {
  console.log('🌱 Sembrando datos del negocio demo "Citiox Urban Store" (/tienda)...');

  try {
    await prisma.$connect();

    const slug = 'tienda';

    // 1. Crear o actualizar Negocio Demo "tienda"
    const negocio = await (prisma as any).negocio.upsert({
      where: { slug },
      update: {
        nombre: 'Citiox Urban Store',
        tipoNegocio: 'TIENDA',
        whatsapp: '+593999887766',
        direccion: 'Av. de los Shyris y Naciones Unidas, Quito',
        horarioApertura: '09:00',
        horarioCierre: '20:00',
        colorPrimario: '#06b6d4',
        colorSecundario: '#0f172a',
        precioHora: 0,
        heroTitulo: 'COLECCIÓN URBANA CITIOX',
        heroSubtitulo: 'Descubre nuestra selección exclusiva de ropa, accesorios y calzado con entrega a domicilio o retiro en tienda.',
        isDemo: true,
        updatedAt: new Date(),
        configuracion: JSON.stringify({
          blueprintId: 'STORE',
          tipoNegocio: 'TIENDA',
          heroTitulo: 'COLECCIÓN URBANA CITIOX',
          heroSubtitulo: 'Descubre nuestra selección exclusiva de ropa, accesorios y calzado con entrega a domicilio o retiro en tienda.',
          bannerUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&q=80&w=1200',
          allowDelivery: true,
          allowPickup: true,
          costoEnvio: 2.50,
          costoEnvioPorKm: 0.30,
          montoMinimoPedido: 10.00,
          packagingRequirement: 'NOT_REQUIRED',
          latitudNegocio: -0.180653,
          longitudNegocio: -78.467838,
          capabilities: {
            store: true,
            products: true,
            categories: true,
            orders: true,
            cart: true,
            payments: true,
            delivery: true,
            pickup: true,
            inventory: true,
            variants: true,
            promotions: true,
            coupons: true,
            dispatch: true
          }
        })
      },
      create: {
        id: 'citiox-store-demo-id',
        nombre: 'Citiox Urban Store',
        slug,
        tipoNegocio: 'TIENDA',
        whatsapp: '+593999887766',
        direccion: 'Av. de los Shyris y Naciones Unidas, Quito',
        horarioApertura: '09:00',
        horarioCierre: '20:00',
        colorPrimario: '#06b6d4',
        colorSecundario: '#0f172a',
        precioHora: 0,
        heroTitulo: 'COLECCIÓN URBANA CITIOX',
        heroSubtitulo: 'Descubre nuestra selección exclusiva de ropa, accesorios y calzado con entrega a domicilio o retiro en tienda.',
        isDemo: true,
        updatedAt: new Date(),
        configuracion: JSON.stringify({
          blueprintId: 'STORE',
          tipoNegocio: 'TIENDA',
          heroTitulo: 'COLECCIÓN URBANA CITIOX',
          heroSubtitulo: 'Descubre nuestra selección exclusiva de ropa, accesorios y calzado con entrega a domicilio o retiro en tienda.',
          bannerUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&q=80&w=1200',
          allowDelivery: true,
          allowPickup: true,
          costoEnvio: 2.50,
          costoEnvioPorKm: 0.30,
          montoMinimoPedido: 10.00,
          packagingRequirement: 'NOT_REQUIRED',
          latitudNegocio: -0.180653,
          longitudNegocio: -78.467838,
          capabilities: {
            store: true,
            products: true,
            categories: true,
            orders: true,
            cart: true,
            payments: true,
            delivery: true,
            pickup: true,
            inventory: true,
            variants: true,
            promotions: true,
            coupons: true,
            dispatch: true
          }
        })
      }
    });

    console.log('✅ Negocio demo verificado:', negocio.nombre, `(slug: ${negocio.slug})`);

    // 2. Crear o actualizar Usuario Admin de la Tienda
    const hashedPassword = await hasher.hash('admin123', 10);
    const adminUser = await (prisma as any).usuario.upsert({
      where: { email: 'admin@tienda.com' },
      update: {
        nombre: 'Admin Citiox Store',
        password: hashedPassword,
        role: 'ADMIN_NEGOCIO',
        negocioId: negocio.id,
        updatedAt: new Date()
      },
      create: {
        id: 'usr-admin-tienda',
        nombre: 'Admin Citiox Store',
        email: 'admin@tienda.com',
        password: hashedPassword,
        role: 'ADMIN_NEGOCIO',
        negocioId: negocio.id,
        updatedAt: new Date()
      }
    });

    console.log('✅ Usuario Admin verificado:', adminUser.email);

    // 3. Crear o actualizar Categorías
    const catRopa = await (prisma as any).categoriaProducto.upsert({
      where: { id: 'cat-ropa' },
      update: { nombre: 'Ropa & Moda', orden: 1, activo: true, negocioId: negocio.id },
      create: { id: 'cat-ropa', nombre: 'Ropa & Moda', orden: 1, activo: true, negocioId: negocio.id }
    });

    const catCalzado = await (prisma as any).categoriaProducto.upsert({
      where: { id: 'cat-calzado' },
      update: { nombre: 'Calzado & Sneakers', orden: 2, activo: true, negocioId: negocio.id },
      create: { id: 'cat-calzado', nombre: 'Calzado & Sneakers', orden: 2, activo: true, negocioId: negocio.id }
    });

    const catTech = await (prisma as any).categoriaProducto.upsert({
      where: { id: 'cat-tech' },
      update: { nombre: 'Accesorios Tech', orden: 3, activo: true, negocioId: negocio.id },
      create: { id: 'cat-tech', nombre: 'Accesorios Tech', orden: 3, activo: true, negocioId: negocio.id }
    });

    console.log('✅ Categorías verificadas: Ropa & Moda, Calzado & Sneakers, Accesorios Tech');

    // 4. Crear o actualizar Producto Simple 1: Mochila Waterproof Tech
    const prodMochila = await (prisma as any).producto.upsert({
      where: { id: 'prod-mochila' },
      update: {
        nombre: 'Mochila Waterproof Tech',
        descripcion: 'Mochila impermeable con compartimento acolchado para laptop de 15.6" y puerto USB externo.',
        precio: 45.00,
        stock: 15,
        activo: true,
        negocioId: negocio.id,
        categoriaId: catTech.id,
        extraInfo: { sku: 'MCH-WPF-01', tieneVariantes: false, llevaEmpaque: false, precioEmpaque: 0 }
      },
      create: {
        id: 'prod-mochila',
        nombre: 'Mochila Waterproof Tech',
        descripcion: 'Mochila impermeable con compartimento acolchado para laptop de 15.6" y puerto USB externo.',
        precio: 45.00,
        stock: 15,
        activo: true,
        negocioId: negocio.id,
        categoriaId: catTech.id,
        extraInfo: { sku: 'MCH-WPF-01', tieneVariantes: false, llevaEmpaque: false, precioEmpaque: 0 }
      }
    });

    // 5. Crear o actualizar Producto Simple 2: Gorra Urbana Citiox
    const prodGorra = await (prisma as any).producto.upsert({
      where: { id: 'prod-gorra' },
      update: {
        nombre: 'Gorra Urbana Citiox',
        descripcion: 'Gorra de béisbol con visera curva, bordado frontal de alta densidad y correa ajustable.',
        precio: 20.00,
        stock: 8,
        activo: true,
        negocioId: negocio.id,
        categoriaId: catRopa.id,
        extraInfo: { sku: 'GOR-URB-01', tieneVariantes: false, llevaEmpaque: false, precioEmpaque: 0 }
      },
      create: {
        id: 'prod-gorra',
        nombre: 'Gorra Urbana Citiox',
        descripcion: 'Gorra de béisbol con visera curva, bordado frontal de alta densidad y correa ajustable.',
        precio: 20.00,
        stock: 8,
        activo: true,
        negocioId: negocio.id,
        categoriaId: catRopa.id,
        extraInfo: { sku: 'GOR-URB-01', tieneVariantes: false, llevaEmpaque: false, precioEmpaque: 0 }
      }
    });

    console.log('✅ Productos simples verificados: Mochila Waterproof Tech ($45.00), Gorra Urbana Citiox ($20.00)');

    // 6. Crear o actualizar Producto con Variantes: Camiseta Oversize Premium
    const prodCamiseta = await (prisma as any).producto.upsert({
      where: { id: 'prod-camiseta' },
      update: {
        nombre: 'Camiseta Oversize Premium',
        descripcion: 'Camiseta confeccionada en 100% algodón pesado de 240g, corte oversize y costuras reforzadas.',
        precio: 25.00,
        stock: 18,
        activo: true,
        negocioId: negocio.id,
        categoriaId: catRopa.id,
        extraInfo: { sku: 'TSH-OVS-BASE', tieneVariantes: true, llevaEmpaque: false, precioEmpaque: 0 }
      },
      create: {
        id: 'prod-camiseta',
        nombre: 'Camiseta Oversize Premium',
        descripcion: 'Camiseta confeccionada en 100% algodón pesado de 240g, corte oversize y costuras reforzadas.',
        precio: 25.00,
        stock: 18,
        activo: true,
        negocioId: negocio.id,
        categoriaId: catRopa.id,
        extraInfo: { sku: 'TSH-OVS-BASE', tieneVariantes: true, llevaEmpaque: false, precioEmpaque: 0 }
      }
    });

    // 7. Intentar sembrar las 4 Variantes si el modelo ProductoVariante existe
    try {
      const variantesData = [
        { id: 'var-tsh-blk-m', nombre: 'Negro / M', sku: 'TSH-BLK-M', atributos: { color: 'Negro', talla: 'M' }, precio: 25.00, stock: 10, activo: true },
        { id: 'var-tsh-blk-l', nombre: 'Negro / L', sku: 'TSH-BLK-L', atributos: { color: 'Negro', talla: 'L' }, precio: 25.00, stock: 5, activo: true },
        { id: 'var-tsh-wht-m', nombre: 'Blanco / M', sku: 'TSH-WHT-M', atributos: { color: 'Blanco', talla: 'M' }, precio: 25.00, stock: 3, activo: true },
        { id: 'var-tsh-wht-l', nombre: 'Blanco / L', sku: 'TSH-WHT-L', atributos: { color: 'Blanco', talla: 'L' }, precio: 25.00, stock: 0, activo: true }
      ];

      for (const vData of variantesData) {
        await (prisma as any).productoVariante.upsert({
          where: { id: vData.id },
          update: {
            productoId: prodCamiseta.id,
            nombre: vData.nombre,
            sku: vData.sku,
            atributos: vData.atributos,
            precio: vData.precio,
            stock: vData.stock,
            activo: vData.activo
          },
          create: {
            id: vData.id,
            productoId: prodCamiseta.id,
            nombre: vData.nombre,
            sku: vData.sku,
            atributos: vData.atributos,
            precio: vData.precio,
            stock: vData.stock,
            activo: vData.activo
          }
        });
      }
      console.log('✅ 4 Variantes verificadas para Camiseta Oversize Premium');
    } catch (vErr) {
      console.warn('⚠️ No se pudieron sembrar variantes individuales (se usará producto base):', (vErr as any)?.message || vErr);
    }

    console.log('🎉 Siembra del demo "Citiox Urban Store" (/tienda) completada con éxito.');
    return {
      status: 'SEEDED',
      negocioId: negocio.id,
      slug: negocio.slug,
      nombre: negocio.nombre
    };
  } catch (error) {
    console.error('❌ Error sembrando demo de tienda:', error);
    throw error;
  }
}

if (require.main === module) {
  seedStoreDemo()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
