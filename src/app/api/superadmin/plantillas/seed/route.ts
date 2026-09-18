import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        const user = session?.user as any;
        const isSuperAdmin = user?.role === 'SUPERADMIN' || user?.role === 'SUPER_ADMIN' || user?.isAdminUser === true;

        if (!isSuperAdmin) {
            return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
        }

        const businessTypes = await prisma.businessType.findMany();
        const btMap: Record<string, string> = {};
        businessTypes.forEach(bt => {
            btMap[bt.slug] = bt.id;
        });

        const landingTemplates = [
            {
                businessTypeSlug: 'citas',
                name: 'Landing Spa, Belleza & Servicios',
                slug: 'landing-spa-beauty',
                description: 'Hero carousel con catálogo de servicios por categorías, profesionales asignados, calendario de citas y opiniones de clientes.',
                component: 'HomeServicesClient',
                previewImage: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=800&q=80',
                isDefault: true,
                sortOrder: 1
            },
            {
                businessTypeSlug: 'citas',
                name: 'Landing Minimalista Express',
                slug: 'landing-services-minimal',
                description: 'Diseño limpio y directo enfocado en conversión rápida para peluquerías, barberías y estética.',
                component: 'UniversalHeroCarousel',
                previewImage: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=800&q=80',
                isDefault: false,
                sortOrder: 2
            },
            {
                businessTypeSlug: 'reservas',
                name: 'Landing Sports Club & Canchas',
                slug: 'landing-sports-courts',
                description: 'Muestra de canchas por superficie, selector de turnos en tiempo real, academias, torneos y reserva con seña.',
                component: 'SportsLanding',
                previewImage: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&w=800&q=80',
                isDefault: true,
                sortOrder: 1
            },
            {
                businessTypeSlug: 'ordenes-servicio',
                name: 'Landing ShoeCare & Lavandería Express',
                slug: 'landing-shoecare-wash',
                description: 'Wizard multi-paso para retiro y entrega a domicilio, calculadora interactiva de prendas y calzado con tracking de estado.',
                component: 'ShoeCareLanding',
                previewImage: 'https://images.unsplash.com/photo-1517677208171-0bc6725a3e60?auto=format&fit=crop&w=800&q=80',
                isDefault: true,
                sortOrder: 1
            },
            {
                businessTypeSlug: 'comandas',
                name: 'Landing Gastro Menú & Restaurante',
                slug: 'landing-restaurant-menu',
                description: 'Menú digital interactivo por secciones, personalización de platos, carrito de pedidos para mesa, delivery o retiro.',
                component: 'RestaurantLanding',
                previewImage: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80',
                isDefault: true,
                sortOrder: 1
            },
            {
                businessTypeSlug: 'comandas',
                name: 'Landing Pinchos & Fast Food Express',
                slug: 'landing-pinchos-fastfood',
                description: 'Experiencia optimizada para comida rápida, parrilladas y pinchos. Cuenta con catálogo dinámico, carrito flotante interactivo, flujo checkout en 6 pasos y tracking en vivo de pedidos.',
                component: 'PinchosStoreModule',
                previewImage: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=800&q=80',
                isDefault: false,
                sortOrder: 2
            },
            {
                businessTypeSlug: 'ecommerce',
                name: 'Landing Boutique & E-commerce Store',
                slug: 'landing-ecommerce-store',
                description: 'Vitrina moderna de productos con variantes (tallas, colores), control de stock, carrito y pagos en línea.',
                component: 'StoreLanding',
                previewImage: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=800&q=80',
                isDefault: true,
                sortOrder: 1
            }
        ];

        for (const lt of landingTemplates) {
            const btId = btMap[lt.businessTypeSlug];
            if (!btId) continue;

            const existing = await prisma.businessLandingTemplate.findFirst({
                where: { businessTypeId: btId, slug: lt.slug }
            });

            if (!existing) {
                await prisma.businessLandingTemplate.create({
                    data: {
                        businessTypeId: btId,
                        name: lt.name,
                        slug: lt.slug,
                        description: lt.description,
                        component: lt.component,
                        previewImage: lt.previewImage,
                        isDefault: lt.isDefault,
                        sortOrder: lt.sortOrder,
                        active: true
                    }
                });
            }
        }

        const adminTemplates = [
            {
                businessTypeSlug: 'citas',
                name: 'Admin Sidebar Citas & Especialistas',
                component: 'AdminSidebarStandard',
                layoutType: 'SIDEBAR',
                previewImage: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80',
                isDefault: true,
                sortOrder: 1
            },
            {
                businessTypeSlug: 'reservas',
                name: 'Admin Sports Grid Canchas',
                component: 'SportsAdminGrid',
                layoutType: 'GRID',
                previewImage: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80',
                isDefault: true,
                sortOrder: 1
            },
            {
                businessTypeSlug: 'ordenes-servicio',
                name: 'Admin Kanban Ciclo de Lavado & Taller',
                component: 'ServiceKanbanBoard',
                layoutType: 'KANBAN',
                previewImage: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
                isDefault: true,
                sortOrder: 1
            },
            {
                businessTypeSlug: 'comandas',
                name: 'Admin KDS Monitor de Cocina & Comandas',
                component: 'KDSKitchenMonitor',
                layoutType: 'KDS',
                previewImage: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=800&q=80',
                isDefault: true,
                sortOrder: 1
            },
            {
                businessTypeSlug: 'ecommerce',
                name: 'Admin E-commerce Store & Stock',
                component: 'StoreAdminManager',
                layoutType: 'SIDEBAR',
                previewImage: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80',
                isDefault: true,
                sortOrder: 1
            }
        ];

        for (const at of adminTemplates) {
            const btId = btMap[at.businessTypeSlug];
            if (!btId) continue;

            const existing = await prisma.businessAdminTemplate.findFirst({
                where: { businessTypeId: btId, component: at.component }
            });

            if (!existing) {
                await prisma.businessAdminTemplate.create({
                    data: {
                        businessTypeId: btId,
                        name: at.name,
                        component: at.component,
                        layoutType: at.layoutType,
                        previewImage: at.previewImage,
                        isDefault: at.isDefault,
                        sortOrder: at.sortOrder,
                        active: true
                    }
                });
            }
        }

        return NextResponse.json({ success: true, message: 'Plantillas oficiales aseguradas con éxito' });
    } catch (error: any) {
        console.error('Error al poblar plantillas:', error);
        return NextResponse.json({ error: 'Error al asegurar plantillas', details: error.message }, { status: 500 });
    }
}
