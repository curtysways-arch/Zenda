import prisma from '../lib/prisma';

export const CANONICAL_MODULES = [
    // CORE
    { code: 'LANDING', name: 'Presencia Web y Landing', icon: 'Globe', description: 'Sitio web profesional y presencia digital pública' },
    { code: 'CUSTOMERS', name: 'Directorio de Clientes', icon: 'Users', description: 'Base de datos y fichas de clientes' },
    { code: 'USERS', name: 'Equipo y Colaboradores', icon: 'Shield', description: 'Roles, permisos y personal administrativo' },
    { code: 'NOTIFICATIONS', name: 'Notificaciones del Sistema', icon: 'Bell', description: 'Avisos automáticos por correo o WhatsApp' },
    // COMERCIO
    { code: 'PRODUCTS', name: 'Catálogo de Productos', icon: 'Package', description: 'Gestión de productos, variantes y precios' },
    { code: 'CATEGORIES', name: 'Categorías de Productos', icon: 'Layers', description: 'Organización taxonómica del catálogo' },
    { code: 'CART', name: 'Carrito de Compra', icon: 'ShoppingCart', description: 'Flujo de compra y checkout digital' },
    { code: 'ORDERS', name: 'Recepción de Pedidos', icon: 'ShoppingBag', description: 'Gestión y seguimiento de pedidos' },
    { code: 'PAYMENTS', name: 'Pasarela y Métodos de Pago', icon: 'CreditCard', description: 'Cobro digital, transferencias y pasarelas' },
    { code: 'DELIVERY', name: 'Logística de Delivery', icon: 'Truck', description: 'Despacho a domicilio y zonas de cobertura' },
    { code: 'PICKUP', name: 'Retiro en Local', icon: 'Store', description: 'Retiro para llevar en tienda o sucursal' },
    // RESTAURANTE
    { code: 'TABLES', name: 'Control de Mesas', icon: 'LayoutGrid', description: 'Salones, sectores y asignación de mesas' },
    { code: 'QR_TABLE', name: 'Pedido QR en Mesa', icon: 'QrCode', description: 'Menú digital y comanda por QR en mesa' },
    { code: 'KITCHEN', name: 'Comandas y Cocina', icon: 'Utensils', description: 'Envío de pedidos a producción culinaria' },
    { code: 'KDS', name: 'Pantalla KDS en Vivo', icon: 'Monitor', description: 'Pantalla interactiva en tiempo real para cocineros' },
    { code: 'POS', name: 'Punto de Venta Táctil', icon: 'Laptop', description: 'Terminal de ventas para salón y mostrador' },
    // SERVICIOS
    { code: 'APPOINTMENTS', name: 'Agenda y Citas 24/7', icon: 'Calendar', description: 'Reservas de turnos y citas en línea' },
    { code: 'SERVICES', name: 'Catálogo de Servicios', icon: 'Scissors', description: 'Servicios, duraciones y tarifas' },
    { code: 'STAFF', name: 'Profesionales y Especialistas', icon: 'UserCheck', description: 'Especialistas con horarios y comisiones' },
    { code: 'REMINDERS', name: 'Recordatorios Automáticos', icon: 'Clock', description: 'Recordatorios de citas previas por WhatsApp' },
    // CANCHAS
    { code: 'COURTS', name: 'Canchas e Infraestructura', icon: 'Trophy', description: 'Canchas sintéticas, tenis, pádel o espacios' },
    { code: 'SCHEDULES', name: 'Grilla de Turnos por Hora', icon: 'CalendarDays', description: 'Disponibilidad por bloques horarios' },
    { code: 'COURSES', name: 'Cursos y Escuelas', icon: 'GraduationCap', description: 'Academias deportivas, ciclos y clases' },
    { code: 'STUDENTS', name: 'Registro de Alumnos', icon: 'BookOpen', description: 'Ficha del alumno, asistencia y matrícula' },
    { code: 'INSTRUCTORS', name: 'Profesores y Entrenadores', icon: 'Award', description: 'Asignación de profesores por disciplina' },
    // LAVANDERIA
    { code: 'LAUNDRY_ORDERS', name: 'Tickets de Lavandería', icon: 'FileText', description: 'Recepción de prendas y tickets digitales' },
    { code: 'INSPECTION_PHOTOS', name: 'Fotos de Inspección', icon: 'Camera', description: 'Registro fotográfico del estado de prendas' },
    { code: 'WORKFLOW', name: 'Flujo de Estados de Lavado', icon: 'Activity', description: 'Lavado, centrifugado, planchado y entrega' },
    // MARKETING
    { code: 'PROMOTIONS', name: 'Promociones y Ofertas', icon: 'Tag', description: 'Banners, descuentos y promociones dinámicas' },
    { code: 'COUPONS', name: 'Cupones de Descuento', icon: 'Ticket', description: 'Códigos promocionales con límites de uso' },
    { code: 'LOYALTY', name: 'Programa de Puntos y Fidelización', icon: 'Star', description: 'Acumulación de puntos por compras' },
    { code: 'COMMUNICATION_CENTER', name: 'Centro de Comunicación', icon: 'MessageSquare', description: 'Campañas de difusión por WhatsApp' },
    // OPERACIONES
    { code: 'INVENTORY', name: 'Control de Inventarios', icon: 'Boxes', description: 'Control de existencias y alertas de stock bajo' },
    { code: 'REPORTS', name: 'Métricas y Reportes Financieros', icon: 'BarChart3', description: 'Informes detallados de ventas y rendimiento' }
];

export const CANONICAL_DEPENDENCIES = [
    { moduleCode: 'KDS', dependsOnCode: 'ORDERS' },
    { moduleCode: 'KDS', dependsOnCode: 'KITCHEN' },
    { moduleCode: 'QR_TABLE', dependsOnCode: 'TABLES' },
    { moduleCode: 'QR_TABLE', dependsOnCode: 'PRODUCTS' },
    { moduleCode: 'DELIVERY', dependsOnCode: 'ORDERS' },
    { moduleCode: 'PICKUP', dependsOnCode: 'ORDERS' },
    { moduleCode: 'COURSES', dependsOnCode: 'COURTS' },
    { moduleCode: 'COURSES', dependsOnCode: 'CUSTOMERS' },
    { moduleCode: 'COMMUNICATION_CENTER', dependsOnCode: 'CUSTOMERS' }
];

export const CANONICAL_FAMILIES = [
    { code: 'RESTAURANTE', name: 'Restaurantes & Gastronomía', slug: 'restaurantes', icon: 'UtensilsCrossed', displayOrder: 1 },
    { code: 'SERVICIOS', name: 'Citas & Servicios', slug: 'servicios', icon: 'Scissors', displayOrder: 2 },
    { code: 'CANCHAS', name: 'Canchas & Clubes Deportivos', slug: 'canchas', icon: 'Trophy', displayOrder: 3 },
    { code: 'LAVANDERIA', name: 'Lavanderías & Cuidado', slug: 'lavanderias', icon: 'Shirt', displayOrder: 4 },
    { code: 'TIENDA', name: 'Tiendas & Comercio', slug: 'tiendas', icon: 'ShoppingBag', displayOrder: 5 }
];

export const BUSINESS_TYPE_MAPPINGS: Record<string, string> = {
    'citas': 'SERVICIOS',
    'comandas': 'RESTAURANTE',
    'reservas': 'CANCHAS',
    'ordenes-servicio': 'LAVANDERIA',
    'ecommerce': 'TIENDA'
};

async function main() {
    console.log("🌱 INICIANDO SIEMBRA CANÓNICA DE MÓDULOS, DEPENDENCIAS Y FAMILIAS...");

    // 1. Módulos
    const moduleMap = new Map<string, string>();
    for (const mod of CANONICAL_MODULES) {
        const record = await prisma.businessModuleCatalog.upsert({
            where: { code: mod.code },
            update: { name: mod.name, icon: mod.icon, description: mod.description, active: true },
            create: { code: mod.code, name: mod.name, icon: mod.icon, description: mod.description, active: true }
        });
        moduleMap.set(mod.code, record.id);
    }
    console.log(`✅ ${CANONICAL_MODULES.length} módulos canónicos sincronizados en BusinessModuleCatalog.`);

    // 2. Dependencias
    for (const dep of CANONICAL_DEPENDENCIES) {
        await prisma.moduleDependency.upsert({
            where: { moduleCode_dependsOnCode: { moduleCode: dep.moduleCode, dependsOnCode: dep.dependsOnCode } },
            update: {},
            create: { moduleCode: dep.moduleCode, dependsOnCode: dep.dependsOnCode }
        });
    }
    console.log(`✅ ${CANONICAL_DEPENDENCIES.length} dependencias de módulos registradas en ModuleDependency.`);

    // 3. Familias de Planes
    const familyMap = new Map<string, string>();
    for (const fam of CANONICAL_FAMILIES) {
        const record = await prisma.planFamily.upsert({
            where: { code: fam.code },
            update: { name: fam.name, slug: fam.slug, icon: fam.icon, displayOrder: fam.displayOrder, active: true },
            create: { code: fam.code, name: fam.name, slug: fam.slug, icon: fam.icon, displayOrder: fam.displayOrder, active: true }
        });
        familyMap.set(fam.code, record.id);
    }
    console.log(`✅ 5 Familias canónicas sincronizadas en PlanFamily.`);

    // 4. Vincular BusinessType existentes a sus Familias
    for (const [slug, famCode] of Object.entries(BUSINESS_TYPE_MAPPINGS)) {
        const familyId = familyMap.get(famCode);
        if (familyId) {
            await prisma.businessType.updateMany({
                where: { slug },
                data: { planFamilyId: familyId }
            });
        }
    }
    console.log(`✅ BusinessTypes de producción vinculados a sus Familias correspondientes.`);

    // 5. Crear Planes Canónicos con sus Entitlements y Límites
    const canonicalPlansData = [
        // RESTAURANTE
        {
            id: 'plan_restaurante_inicio',
            familyCode: 'RESTAURANTE',
            name: 'Restaurante Inicio',
            slug: 'restaurante-inicio',
            price: 9.99,
            trial_days: 15,
            isDefault: true,
            displayOrder: 1,
            modules: ['LANDING', 'CUSTOMERS', 'PRODUCTS', 'CATEGORIES', 'TABLES', 'QR_TABLE', 'ORDERS'],
            limits: { MAX_USERS: 2, MAX_PRODUCTS: 50, MAX_TABLES: 10, MAX_ORDERS_MONTHLY: 300 }
        },
        {
            id: 'plan_restaurante_crecimiento',
            familyCode: 'RESTAURANTE',
            name: 'Restaurante Crecimiento',
            slug: 'restaurante-crecimiento',
            price: 19.99,
            trial_days: 15,
            featured: true,
            displayOrder: 2,
            modules: ['LANDING', 'CUSTOMERS', 'PRODUCTS', 'CATEGORIES', 'TABLES', 'QR_TABLE', 'ORDERS', 'DELIVERY', 'PICKUP', 'PROMOTIONS', 'COUPONS'],
            limits: { MAX_USERS: 5, MAX_PRODUCTS: 200, MAX_TABLES: 25, MAX_ORDERS_MONTHLY: 1000 }
        },
        {
            id: 'plan_restaurante_pro',
            familyCode: 'RESTAURANTE',
            name: 'Restaurante Pro',
            slug: 'restaurante-pro',
            price: 39.99,
            trial_days: 15,
            displayOrder: 3,
            modules: ['LANDING', 'CUSTOMERS', 'PRODUCTS', 'CATEGORIES', 'TABLES', 'QR_TABLE', 'ORDERS', 'DELIVERY', 'PICKUP', 'PROMOTIONS', 'COUPONS', 'KITCHEN', 'KDS', 'POS', 'INVENTORY', 'REPORTS', 'LOYALTY'],
            limits: { MAX_USERS: 15, MAX_PRODUCTS: -1, MAX_TABLES: -1, MAX_ORDERS_MONTHLY: -1 }
        },
        // SERVICIOS
        {
            id: 'plan_servicios_inicio',
            familyCode: 'SERVICIOS',
            name: 'Servicios Inicio',
            slug: 'servicios-inicio',
            price: 9.99,
            trial_days: 15,
            isDefault: true,
            displayOrder: 1,
            modules: ['LANDING', 'CUSTOMERS', 'SERVICES', 'STAFF', 'APPOINTMENTS'],
            limits: { MAX_USERS: 2, MAX_STAFF: 2, MAX_APPOINTMENTS_MONTHLY: 100 }
        },
        {
            id: 'plan_servicios_crecimiento',
            familyCode: 'SERVICIOS',
            name: 'Servicios Crecimiento',
            slug: 'servicios-crecimiento',
            price: 19.99,
            trial_days: 15,
            featured: true,
            displayOrder: 2,
            modules: ['LANDING', 'CUSTOMERS', 'SERVICES', 'STAFF', 'APPOINTMENTS', 'REMINDERS', 'PROMOTIONS', 'COUPONS', 'PAYMENTS'],
            limits: { MAX_USERS: 5, MAX_STAFF: 5, MAX_APPOINTMENTS_MONTHLY: 500 }
        },
        {
            id: 'plan_servicios_pro',
            familyCode: 'SERVICIOS',
            name: 'Servicios Pro',
            slug: 'servicios-pro',
            price: 39.99,
            trial_days: 15,
            displayOrder: 3,
            modules: ['LANDING', 'CUSTOMERS', 'SERVICES', 'STAFF', 'APPOINTMENTS', 'REMINDERS', 'PROMOTIONS', 'COUPONS', 'PAYMENTS', 'COMMUNICATION_CENTER', 'LOYALTY', 'REPORTS', 'INVENTORY'],
            limits: { MAX_USERS: 15, MAX_STAFF: -1, MAX_APPOINTMENTS_MONTHLY: -1 }
        },
        // CANCHAS
        {
            id: 'plan_canchas_inicio',
            familyCode: 'CANCHAS',
            name: 'Canchas Inicio',
            slug: 'canchas-inicio',
            price: 9.99,
            trial_days: 15,
            isDefault: true,
            displayOrder: 1,
            modules: ['LANDING', 'CUSTOMERS', 'COURTS', 'SCHEDULES', 'APPOINTMENTS'],
            limits: { MAX_USERS: 2, MAX_COURTS: 2, MAX_APPOINTMENTS_MONTHLY: 100 }
        },
        {
            id: 'plan_canchas_gestion',
            familyCode: 'CANCHAS',
            name: 'Canchas Gestión',
            slug: 'canchas-gestion',
            price: 24.99,
            trial_days: 15,
            featured: true,
            displayOrder: 2,
            modules: ['LANDING', 'CUSTOMERS', 'COURTS', 'SCHEDULES', 'APPOINTMENTS', 'PAYMENTS', 'PROMOTIONS', 'REMINDERS'],
            limits: { MAX_USERS: 5, MAX_COURTS: 6, MAX_APPOINTMENTS_MONTHLY: 500 }
        },
        {
            id: 'plan_canchas_academia',
            familyCode: 'CANCHAS',
            name: 'Canchas Academia',
            slug: 'canchas-academia',
            price: 49.99,
            trial_days: 15,
            displayOrder: 3,
            modules: ['LANDING', 'CUSTOMERS', 'COURTS', 'SCHEDULES', 'APPOINTMENTS', 'PAYMENTS', 'PROMOTIONS', 'REMINDERS', 'COURSES', 'STUDENTS', 'INSTRUCTORS', 'REPORTS'],
            limits: { MAX_USERS: 15, MAX_COURTS: -1, MAX_APPOINTMENTS_MONTHLY: -1 }
        },
        // LAVANDERIA
        {
            id: 'plan_lavanderia_inicio',
            familyCode: 'LAVANDERIA',
            name: 'Lavandería Inicio',
            slug: 'lavanderia-inicio',
            price: 9.99,
            trial_days: 15,
            isDefault: true,
            displayOrder: 1,
            modules: ['LANDING', 'CUSTOMERS', 'SERVICES', 'LAUNDRY_ORDERS', 'WORKFLOW'],
            limits: { MAX_USERS: 2, MAX_ORDERS_MONTHLY: 200 }
        },
        {
            id: 'plan_lavanderia_pro',
            familyCode: 'LAVANDERIA',
            name: 'Lavandería Pro',
            slug: 'lavanderia-pro',
            price: 29.99,
            trial_days: 15,
            featured: true,
            displayOrder: 2,
            modules: ['LANDING', 'CUSTOMERS', 'SERVICES', 'LAUNDRY_ORDERS', 'WORKFLOW', 'INSPECTION_PHOTOS', 'DELIVERY', 'PICKUP', 'PROMOTIONS', 'REPORTS'],
            limits: { MAX_USERS: 10, MAX_ORDERS_MONTHLY: -1 }
        },
        // TIENDA
        {
            id: 'plan_tienda_inicio',
            familyCode: 'TIENDA',
            name: 'Tienda Inicio',
            slug: 'tienda-inicio',
            price: 9.99,
            trial_days: 15,
            isDefault: true,
            displayOrder: 1,
            modules: ['LANDING', 'CUSTOMERS', 'PRODUCTS', 'CATEGORIES', 'CART', 'ORDERS'],
            limits: { MAX_USERS: 2, MAX_PRODUCTS: 50, MAX_ORDERS_MONTHLY: 200 }
        },
        {
            id: 'plan_tienda_crecimiento',
            familyCode: 'TIENDA',
            name: 'Tienda Crecimiento',
            slug: 'tienda-crecimiento',
            price: 19.99,
            trial_days: 15,
            featured: true,
            displayOrder: 2,
            modules: ['LANDING', 'CUSTOMERS', 'PRODUCTS', 'CATEGORIES', 'CART', 'ORDERS', 'DELIVERY', 'PICKUP', 'PAYMENTS', 'PROMOTIONS', 'COUPONS'],
            limits: { MAX_USERS: 5, MAX_PRODUCTS: 300, MAX_ORDERS_MONTHLY: 1000 }
        },
        {
            id: 'plan_tienda_pro',
            familyCode: 'TIENDA',
            name: 'Tienda Pro',
            slug: 'tienda-pro',
            price: 39.99,
            trial_days: 15,
            displayOrder: 3,
            modules: ['LANDING', 'CUSTOMERS', 'PRODUCTS', 'CATEGORIES', 'CART', 'ORDERS', 'DELIVERY', 'PICKUP', 'PAYMENTS', 'PROMOTIONS', 'COUPONS', 'POS', 'INVENTORY', 'REPORTS', 'LOYALTY', 'COMMUNICATION_CENTER'],
            limits: { MAX_USERS: 15, MAX_PRODUCTS: -1, MAX_ORDERS_MONTHLY: -1 }
        }
    ];

    for (const p of canonicalPlansData) {
        const familyId = familyMap.get(p.familyCode);
        const plan = await prisma.plan.upsert({
            where: { id: p.id },
            update: {
                name: p.name,
                slug: p.slug,
                price: p.price,
                trial_days: p.trial_days,
                familyId: familyId,
                featured: p.featured || false,
                isDefault: p.isDefault || false,
                displayOrder: p.displayOrder,
                activo: true
            },
            create: {
                id: p.id,
                name: p.name,
                slug: p.slug,
                price: p.price,
                trial_days: p.trial_days,
                familyId: familyId,
                featured: p.featured || false,
                isDefault: p.isDefault || false,
                displayOrder: p.displayOrder,
                activo: true,
                updated_at: new Date()
            }
        });

        // Entitlements
        for (const modCode of p.modules) {
            const modId = moduleMap.get(modCode);
            if (modId) {
                await prisma.planEntitlement.upsert({
                    where: { planId_moduleId: { planId: plan.id, moduleId: modId } },
                    update: { enabled: true },
                    create: { planId: plan.id, moduleId: modId, enabled: true }
                });
            }
        }

        // Limits
        for (const [key, val] of Object.entries(p.limits)) {
            await prisma.planLimit.upsert({
                where: { planId_limitKey: { planId: plan.id, limitKey: key } },
                update: { limitValue: val },
                create: { planId: plan.id, limitKey: key, limitValue: val }
            });
        }
    }

    console.log(`✅ ${canonicalPlansData.length} Planes Canónicos creados con sus Entitlements y Límites.`);
    console.log("🚀 SIEMBRA CANÓNICA COMPLETADA SATISFACTORIAMENTE.");
}

main().catch(err => {
    console.error("Error en seed:", err);
    process.exit(1);
}).finally(() => prisma.$disconnect());
