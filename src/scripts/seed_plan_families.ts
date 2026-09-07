/**
 * @file seed_plan_families.ts
 * @description Seed unificado, canónico e idempotente para el ecosistema de Planes de Citiox.
 * 
 * Reglas de Arquitectura:
 * - 5 Familias: RESTAURANTE, SERVICIOS, CANCHAS, LAVANDERIA, TIENDA
 * - 4 Planes por familia: FREE, INICIO, CRECIMIENTO, PRO (Total: 20 planes)
 * - FREE: $0.00 | 0d trial | isFree: true | isPublic: false | DataPolicies protegidas
 * - INICIO: $7.99/mes | 30d trial | isFree: false | isPublic: true
 * - CRECIMIENTO: $19.99/mes (Founder $10.00) | 30d trial | isDefault: true | isPublic: true
 * - PRO: Precio TBD (configurable) | 30d trial | Límites ilimitados (-1) | isPublic: true
 */

import prisma from '../lib/prisma';
import { DATA_RESOURCES, DATA_ACTIONS } from '../core/security/dataPolicyTypes';

export const CANONICAL_MODULES = [
    // CORE & PLATAFORMA
    { code: 'LANDING', name: 'Presencia Web y Landing', icon: 'Globe', description: 'Sitio web profesional y presencia digital pública' },
    { code: 'HERO', name: 'Banners y Hero Destacado', icon: 'Sparkles', description: 'Personalización de cabecera visual y promociones' },
    { code: 'CUSTOMERS', name: 'Directorio de Clientes', icon: 'Users', description: 'Base de datos y fichas de clientes' },
    { code: 'USERS', name: 'Equipo y Colaboradores', icon: 'Shield', description: 'Roles, permisos y personal administrativo' },
    { code: 'NOTIFICATIONS', name: 'Notificaciones del Sistema', icon: 'Bell', description: 'Avisos automáticos de plataforma' },
    { code: 'OTP', name: 'Acceso por Código OTP', icon: 'Lock', description: 'Autenticación rápida de clientes sin contraseña' },
    { code: 'PUSH', name: 'Notificaciones Push a la App', icon: 'Smartphone', description: 'Alertas directas a dispositivos móviles de clientes' },

    // COMERCIO & TRANSACCIONES
    { code: 'PRODUCTS', name: 'Catálogo de Productos', icon: 'Package', description: 'Gestión de productos y precios' },
    { code: 'CATEGORIES', name: 'Categorías de Productos', icon: 'Layers', description: 'Organización taxonómica del catálogo' },
    { code: 'VARIANTS', name: 'Variantes de Productos', icon: 'Sliders', description: 'Tallas, colores y combinaciones de productos' },
    { code: 'CART', name: 'Carrito de Compra', icon: 'ShoppingCart', description: 'Flujo de compra y checkout digital' },
    { code: 'ORDERS', name: 'Recepción de Pedidos', icon: 'ShoppingBag', description: 'Gestión y seguimiento de pedidos' },
    { code: 'PAYMENTS', name: 'Pasarela y Métodos de Pago', icon: 'CreditCard', description: 'Cobro digital, transferencias y pasarelas' },
    { code: 'DELIVERY', name: 'Logística de Delivery', icon: 'Truck', description: 'Despacho a domicilio y zonas de cobertura' },
    { code: 'PICKUP', name: 'Retiro en Local', icon: 'Store', description: 'Retiro para llevar en tienda o sucursal' },

    // RESTAURANTE & GASTRONOMÍA
    { code: 'TABLES', name: 'Control de Mesas', icon: 'LayoutGrid', description: 'Salones, sectores y asignación de mesas' },
    { code: 'QR_TABLE', name: 'Pedido QR en Mesa', icon: 'QrCode', description: 'Menú digital y comanda por QR en mesa' },
    { code: 'KITCHEN', name: 'Comandas y Cocina', icon: 'Utensils', description: 'Envío de pedidos a producción culinaria' },
    { code: 'KDS', name: 'Pantalla KDS en Vivo', icon: 'Monitor', description: 'Pantalla interactiva en tiempo real para cocineros' },
    { code: 'POS', name: 'Punto de Venta Táctil', icon: 'Laptop', description: 'Terminal de ventas para salón y mostrador' },

    // SERVICIOS & CITAS
    { code: 'APPOINTMENTS', name: 'Agenda y Citas 24/7', icon: 'Calendar', description: 'Reservas de turnos y citas en línea' },
    { code: 'SERVICES', name: 'Catálogo de Servicios', icon: 'Scissors', description: 'Servicios, duraciones y tarifas' },
    { code: 'STAFF', name: 'Profesionales y Especialistas', icon: 'UserCheck', description: 'Especialistas con horarios y comisiones' },
    { code: 'REMINDERS', name: 'Recordatorios Automáticos WhatsApp', icon: 'Clock', description: 'Recordatorios de citas y avisos por WhatsApp' },

    // CANCHAS & CLUBES
    { code: 'COURTS', name: 'Canchas e Infraestructura', icon: 'Trophy', description: 'Canchas sintéticas, tenis, pádel o espacios' },
    { code: 'SCHEDULES', name: 'Grilla de Turnos por Hora', icon: 'CalendarDays', description: 'Disponibilidad por bloques horarios y bloqueo' },
    { code: 'COURSES', name: 'Cursos y Escuelas', icon: 'GraduationCap', description: 'Academias deportivas, ciclos y clases' },
    { code: 'STUDENTS', name: 'Registro de Alumnos', icon: 'BookOpen', description: 'Ficha del alumno, asistencia y matrícula' },
    { code: 'INSTRUCTORS', name: 'Profesores y Entrenadores', icon: 'Award', description: 'Asignación de profesores por disciplina' },
    { code: 'TOURNAMENTS', name: 'Torneos y Competencias', icon: 'Medal', description: 'Gestión de llaves, fixture y resultados' },

    // LAVANDERÍA & CUIDADO
    { code: 'LAUNDRY_ORDERS', name: 'Tickets de Lavandería', icon: 'FileText', description: 'Recepción de prendas y tickets digitales' },
    { code: 'INSPECTION_PHOTOS', name: 'Fotos de Inspección', icon: 'Camera', description: 'Registro fotográfico del estado de prendas' },
    { code: 'WORKFLOW', name: 'Flujo de Estados de Lavado', icon: 'Activity', description: 'Lavado, centrifugado, planchado y entrega' },

    // MARKETING & FIDELIZACIÓN
    { code: 'PROMOTIONS', name: 'Promociones y Ofertas', icon: 'Tag', description: 'Banners, descuentos y promociones dinámicas' },
    { code: 'COUPONS', name: 'Cupones de Descuento', icon: 'Ticket', description: 'Códigos promocionales con límites de uso' },
    { code: 'LOYALTY', name: 'Programa de Puntos y Fidelización', icon: 'Star', description: 'Acumulación de puntos por compras' },
    { code: 'COMMUNICATION_CENTER', name: 'Centro de Comunicación', icon: 'MessageSquare', description: 'Campañas de difusión masiva por WhatsApp y Push' },

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

export const CANONICAL_PLANS = [
    // ══════════════════════════════════════════════════════════════════════════════
    // 1. FAMILIA SERVICIOS
    // ══════════════════════════════════════════════════════════════════════════════
    {
        id: 'plan_servicios_free',
        familyCode: 'SERVICIOS',
        name: 'Citas & Servicios Free',
        slug: 'servicios-free',
        description: 'Plan gratuito inicial para profesionales de belleza, salud y estética con recepción protegida.',
        price: 0.0,
        trial_days: 0,
        isFree: true,
        isDefault: false,
        isPublic: false,
        displayOrder: 0,
        modules: ['STAFF', 'SERVICES', 'APPOINTMENTS', 'SCHEDULES', 'HERO', 'LANDING', 'OTP', 'PUSH'],
        limits: { MAX_STAFF: 2, MAX_SERVICES: 10, MAX_APPOINTMENTS_MONTHLY: 40, MAX_USERS: 1 }
    },
    {
        id: 'plan_servicios_inicio',
        familyCode: 'SERVICIOS',
        name: 'Servicios Inicio',
        slug: 'servicios-inicio',
        description: 'Ideal para profesionales independientes o consultorios individuales.',
        price: 7.99,
        trial_days: 30,
        isFree: false,
        isDefault: false,
        isPublic: true,
        displayOrder: 1,
        modules: ['LANDING', 'HERO', 'STAFF', 'SERVICES', 'APPOINTMENTS', 'SCHEDULES', 'CUSTOMERS', 'REMINDERS', 'LOYALTY', 'OTP', 'PUSH'],
        limits: { MAX_STAFF: 4, MAX_SERVICES: 50, MAX_APPOINTMENTS_MONTHLY: 100, MAX_USERS: 2 }
    },
    {
        id: 'plan_servicios_crecimiento',
        familyCode: 'SERVICIOS',
        name: 'Servicios Crecimiento',
        slug: 'servicios-crecimiento',
        description: 'Para salones, spas y centros estéticos con equipo y promociones activas.',
        price: 19.99,
        trial_days: 30,
        isFree: false,
        isDefault: true,
        isPublic: true,
        displayOrder: 2,
        modules: ['LANDING', 'HERO', 'STAFF', 'SERVICES', 'APPOINTMENTS', 'SCHEDULES', 'CUSTOMERS', 'REMINDERS', 'LOYALTY', 'PROMOTIONS', 'COUPONS', 'COMMUNICATION_CENTER', 'PAYMENTS', 'OTP', 'PUSH'],
        limits: { MAX_STAFF: 10, MAX_SERVICES: 500, MAX_APPOINTMENTS_MONTHLY: 500, MAX_USERS: 5 }
    },
    {
        id: 'plan_servicios_pro',
        familyCode: 'SERVICIOS',
        name: 'Servicios Pro',
        slug: 'servicios-pro',
        description: 'Plataforma integral con cursos, inventarios, métricas y capacidad ilimitada.',
        price: 39.99,
        trial_days: 30,
        isFree: false,
        isDefault: false,
        isPublic: true,
        displayOrder: 3,
        modules: ['LANDING', 'HERO', 'STAFF', 'SERVICES', 'APPOINTMENTS', 'SCHEDULES', 'CUSTOMERS', 'REMINDERS', 'LOYALTY', 'PROMOTIONS', 'COUPONS', 'COMMUNICATION_CENTER', 'PAYMENTS', 'COURSES', 'INVENTORY', 'REPORTS', 'OTP', 'PUSH'],
        limits: { MAX_STAFF: -1, MAX_SERVICES: -1, MAX_APPOINTMENTS_MONTHLY: -1, MAX_USERS: 15 }
    },

    // ══════════════════════════════════════════════════════════════════════════════
    // 2. FAMILIA RESTAURANTE
    // ══════════════════════════════════════════════════════════════════════════════
    {
        id: 'plan_restaurantes_free',
        familyCode: 'RESTAURANTE',
        name: 'Restaurantes & Gastronomía Free',
        slug: 'restaurantes-free',
        description: 'Menú digital y recepción protegida de comandas para locales gastronómicos.',
        price: 0.0,
        trial_days: 0,
        isFree: true,
        isDefault: false,
        isPublic: false,
        displayOrder: 0,
        modules: ['PRODUCTS', 'CATEGORIES', 'TABLES', 'QR_TABLE', 'ORDERS', 'CART', 'LANDING', 'HERO', 'POS', 'OTP', 'PUSH'],
        limits: { MAX_PRODUCTS: 30, MAX_CATEGORIES: 10, MAX_TABLES: 5, MAX_ORDERS_MONTHLY: 50, MAX_DELIVERY_DRIVERS: 0, MAX_USERS: 1 }
    },
    {
        id: 'plan_restaurante_inicio',
        familyCode: 'RESTAURANTE',
        name: 'Restaurante Inicio',
        slug: 'restaurante-inicio',
        description: 'Para cafeterías, food trucks y locales con delivery propio y pedidos en mesa.',
        price: 7.99,
        trial_days: 30,
        isFree: false,
        isDefault: false,
        isPublic: true,
        displayOrder: 1,
        modules: ['LANDING', 'HERO', 'CUSTOMERS', 'PRODUCTS', 'CATEGORIES', 'TABLES', 'QR_TABLE', 'ORDERS', 'DELIVERY', 'PICKUP', 'POS', 'REMINDERS', 'OTP', 'PUSH'],
        limits: { MAX_PRODUCTS: 100, MAX_CATEGORIES: 30, MAX_TABLES: 15, MAX_ORDERS_MONTHLY: 150, MAX_DELIVERY_DRIVERS: 2, MAX_USERS: 2 }
    },
    {
        id: 'plan_restaurante_crecimiento',
        familyCode: 'RESTAURANTE',
        name: 'Restaurante Crecimiento',
        slug: 'restaurante-crecimiento',
        description: 'Control de múltiples salones, flota de repartidores, promociones y fidelización.',
        price: 19.99,
        trial_days: 30,
        isFree: false,
        isDefault: true,
        isPublic: true,
        displayOrder: 2,
        modules: ['LANDING', 'HERO', 'CUSTOMERS', 'PRODUCTS', 'CATEGORIES', 'TABLES', 'QR_TABLE', 'ORDERS', 'DELIVERY', 'PICKUP', 'POS', 'REMINDERS', 'PROMOTIONS', 'COUPONS', 'COMMUNICATION_CENTER', 'LOYALTY', 'PAYMENTS', 'OTP', 'PUSH'],
        limits: { MAX_PRODUCTS: 500, MAX_CATEGORIES: 100, MAX_TABLES: 50, MAX_ORDERS_MONTHLY: 1000, MAX_DELIVERY_DRIVERS: 10, MAX_USERS: 5 }
    },
    {
        id: 'plan_restaurante_pro',
        familyCode: 'RESTAURANTE',
        name: 'Restaurante Pro',
        slug: 'restaurante-pro',
        description: 'Solución gastronómica total: KDS de cocina, inventario, reportes y operaciones ilimitadas.',
        price: 39.99,
        trial_days: 30,
        isFree: false,
        isDefault: false,
        isPublic: true,
        displayOrder: 3,
        modules: ['LANDING', 'HERO', 'CUSTOMERS', 'PRODUCTS', 'CATEGORIES', 'TABLES', 'QR_TABLE', 'ORDERS', 'DELIVERY', 'PICKUP', 'POS', 'REMINDERS', 'PROMOTIONS', 'COUPONS', 'COMMUNICATION_CENTER', 'LOYALTY', 'PAYMENTS', 'KITCHEN', 'KDS', 'INVENTORY', 'REPORTS', 'OTP', 'PUSH'],
        limits: { MAX_PRODUCTS: -1, MAX_CATEGORIES: -1, MAX_TABLES: -1, MAX_ORDERS_MONTHLY: -1, MAX_DELIVERY_DRIVERS: -1, MAX_USERS: 15 }
    },

    // ══════════════════════════════════════════════════════════════════════════════
    // 3. FAMILIA CANCHAS
    // ══════════════════════════════════════════════════════════════════════════════
    {
        id: 'plan_canchas_free',
        familyCode: 'CANCHAS',
        name: 'Canchas & Clubes Deportivos Free',
        slug: 'canchas-free',
        description: 'Recepción y bloqueo de turnos deportivos con información protegida.',
        price: 0.0,
        trial_days: 0,
        isFree: true,
        isDefault: false,
        isPublic: false,
        displayOrder: 0,
        modules: ['COURTS', 'SCHEDULES', 'APPOINTMENTS', 'LANDING', 'HERO', 'OTP', 'PUSH'],
        limits: { MAX_COURTS: 2, MAX_APPOINTMENTS_MONTHLY: 40, MAX_STAFF: 2, MAX_USERS: 1 }
    },
    {
        id: 'plan_canchas_inicio',
        familyCode: 'CANCHAS',
        name: 'Canchas Inicio',
        slug: 'canchas-inicio',
        description: 'Para complejos deportivos de hasta 5 canchas con reservas y recordatorios WhatsApp.',
        price: 7.99,
        trial_days: 30,
        isFree: false,
        isDefault: false,
        isPublic: true,
        displayOrder: 1,
        modules: ['LANDING', 'HERO', 'COURTS', 'SCHEDULES', 'APPOINTMENTS', 'CUSTOMERS', 'REMINDERS', 'OTP', 'PUSH'],
        limits: { MAX_COURTS: 5, MAX_APPOINTMENTS_MONTHLY: 150, MAX_STAFF: 4, MAX_USERS: 2 }
    },
    {
        id: 'plan_canchas_gestion',
        familyCode: 'CANCHAS',
        name: 'Canchas Crecimiento',
        slug: 'canchas-gestion',
        description: 'Gestión multicancha con cobro digital, promociones, fidelización y difusión.',
        price: 19.99,
        trial_days: 30,
        isFree: false,
        isDefault: true,
        isPublic: true,
        displayOrder: 2,
        modules: ['LANDING', 'HERO', 'COURTS', 'SCHEDULES', 'APPOINTMENTS', 'CUSTOMERS', 'REMINDERS', 'PAYMENTS', 'PROMOTIONS', 'COUPONS', 'COMMUNICATION_CENTER', 'LOYALTY', 'OTP', 'PUSH'],
        limits: { MAX_COURTS: 15, MAX_APPOINTMENTS_MONTHLY: 500, MAX_STAFF: 10, MAX_USERS: 5 }
    },
    {
        id: 'plan_canchas_academia',
        familyCode: 'CANCHAS',
        name: 'Canchas Academia',
        slug: 'canchas-academia',
        description: 'Clubes integrales con academias, escuelas deportivas, torneos y finanzas completas.',
        price: 49.99,
        trial_days: 30,
        isFree: false,
        isDefault: false,
        isPublic: true,
        displayOrder: 3,
        modules: ['LANDING', 'HERO', 'COURTS', 'SCHEDULES', 'APPOINTMENTS', 'CUSTOMERS', 'REMINDERS', 'PAYMENTS', 'PROMOTIONS', 'COUPONS', 'COMMUNICATION_CENTER', 'LOYALTY', 'COURSES', 'STUDENTS', 'INSTRUCTORS', 'TOURNAMENTS', 'REPORTS', 'OTP', 'PUSH'],
        limits: { MAX_COURTS: -1, MAX_APPOINTMENTS_MONTHLY: -1, MAX_STAFF: -1, MAX_USERS: 15 }
    },

    // ══════════════════════════════════════════════════════════════════════════════
    // 4. FAMILIA LAVANDERÍA
    // ══════════════════════════════════════════════════════════════════════════════
    {
        id: 'plan_lavanderias_free',
        familyCode: 'LAVANDERIA',
        name: 'Lavanderías & Cuidado Free',
        slug: 'lavanderias-free',
        description: 'Recepción protegida de tickets y seguimiento digital de prendas para tintorerías y lavanderías.',
        price: 0.0,
        trial_days: 0,
        isFree: true,
        isDefault: false,
        isPublic: false,
        displayOrder: 0,
        modules: ['SERVICES', 'LAUNDRY_ORDERS', 'WORKFLOW', 'LANDING', 'HERO', 'OTP', 'PUSH'],
        limits: { MAX_SERVICES: 10, MAX_ORDERS_MONTHLY: 40, MAX_STAFF: 2, MAX_USERS: 1 }
    },
    {
        id: 'plan_lavanderia_inicio',
        familyCode: 'LAVANDERIA',
        name: 'Lavandería Inicio',
        slug: 'lavanderia-inicio',
        description: 'Recepción digital de prendas, control de estados y notificaciones WhatsApp.',
        price: 7.99,
        trial_days: 30,
        isFree: false,
        isDefault: false,
        isPublic: true,
        displayOrder: 1,
        modules: ['LANDING', 'HERO', 'SERVICES', 'LAUNDRY_ORDERS', 'WORKFLOW', 'CUSTOMERS', 'REMINDERS', 'OTP', 'PUSH'],
        limits: { MAX_SERVICES: 50, MAX_ORDERS_MONTHLY: 150, MAX_STAFF: 4, MAX_USERS: 2 }
    },
    {
        id: 'plan_lavanderia_crecimiento',
        familyCode: 'LAVANDERIA',
        name: 'Lavandería Crecimiento',
        slug: 'lavanderia-crecimiento',
        description: 'Para lavanderías y tintorerías con servicio a domicilio, promociones y fidelización.',
        price: 19.99,
        trial_days: 30,
        isFree: false,
        isDefault: true,
        isPublic: true,
        displayOrder: 2,
        modules: ['LANDING', 'HERO', 'SERVICES', 'LAUNDRY_ORDERS', 'WORKFLOW', 'CUSTOMERS', 'REMINDERS', 'PROMOTIONS', 'COUPONS', 'COMMUNICATION_CENTER', 'LOYALTY', 'DELIVERY', 'PICKUP', 'OTP', 'PUSH'],
        limits: { MAX_SERVICES: 500, MAX_ORDERS_MONTHLY: 500, MAX_STAFF: 10, MAX_USERS: 5 }
    },
    {
        id: 'plan_lavanderia_pro',
        familyCode: 'LAVANDERIA',
        name: 'Lavandería Pro',
        slug: 'lavanderia-pro',
        description: 'Operación industrial de lavado: inspección fotográfica, flota y métricas completas.',
        price: 29.99,
        trial_days: 30,
        isFree: false,
        isDefault: false,
        isPublic: true,
        displayOrder: 3,
        modules: ['LANDING', 'HERO', 'SERVICES', 'LAUNDRY_ORDERS', 'WORKFLOW', 'CUSTOMERS', 'REMINDERS', 'PROMOTIONS', 'COUPONS', 'COMMUNICATION_CENTER', 'LOYALTY', 'DELIVERY', 'PICKUP', 'INSPECTION_PHOTOS', 'REPORTS', 'OTP', 'PUSH'],
        limits: { MAX_SERVICES: -1, MAX_ORDERS_MONTHLY: -1, MAX_STAFF: -1, MAX_USERS: 10 }
    },

    // ══════════════════════════════════════════════════════════════════════════════
    // 5. FAMILIA TIENDA
    // ══════════════════════════════════════════════════════════════════════════════
    {
        id: 'plan_tiendas_free',
        familyCode: 'TIENDA',
        name: 'Tiendas & Comercio Free',
        slug: 'tiendas-free',
        description: 'Catálogo online y recepción protegida de pedidos para comercios y boutiques.',
        price: 0.0,
        trial_days: 0,
        isFree: true,
        isDefault: false,
        isPublic: false,
        displayOrder: 0,
        modules: ['PRODUCTS', 'CATEGORIES', 'CART', 'ORDERS', 'LANDING', 'HERO', 'OTP', 'PUSH'],
        limits: { MAX_PRODUCTS: 30, MAX_CATEGORIES: 10, MAX_ORDERS_MONTHLY: 50, MAX_VARIANTS: 100, MAX_STAFF: 2, MAX_USERS: 1 }
    },
    {
        id: 'plan_tienda_inicio',
        familyCode: 'TIENDA',
        name: 'Tienda Inicio',
        slug: 'tienda-inicio',
        description: 'Ventas online con delivery, retiro en tienda y avisos por WhatsApp.',
        price: 7.99,
        trial_days: 30,
        isFree: false,
        isDefault: false,
        isPublic: true,
        displayOrder: 1,
        modules: ['LANDING', 'HERO', 'PRODUCTS', 'CATEGORIES', 'CART', 'ORDERS', 'DELIVERY', 'PICKUP', 'CUSTOMERS', 'REMINDERS', 'OTP', 'PUSH'],
        limits: { MAX_PRODUCTS: 100, MAX_CATEGORIES: 30, MAX_ORDERS_MONTHLY: 150, MAX_VARIANTS: 500, MAX_STAFF: 4, MAX_DELIVERY_DRIVERS: 2, MAX_USERS: 2 }
    },
    {
        id: 'plan_tienda_crecimiento',
        familyCode: 'TIENDA',
        name: 'Tienda Crecimiento',
        slug: 'tienda-crecimiento',
        description: 'Comercio electrónico multicanal con cupones, promociones, fidelización y pagos.',
        price: 19.99,
        trial_days: 30,
        isFree: false,
        isDefault: true,
        isPublic: true,
        displayOrder: 2,
        modules: ['LANDING', 'HERO', 'PRODUCTS', 'CATEGORIES', 'CART', 'ORDERS', 'DELIVERY', 'PICKUP', 'CUSTOMERS', 'REMINDERS', 'PROMOTIONS', 'COUPONS', 'COMMUNICATION_CENTER', 'LOYALTY', 'PAYMENTS', 'OTP', 'PUSH'],
        limits: { MAX_PRODUCTS: 500, MAX_CATEGORIES: 100, MAX_ORDERS_MONTHLY: 500, MAX_VARIANTS: 2000, MAX_STAFF: 10, MAX_DELIVERY_DRIVERS: 10, MAX_USERS: 5 }
    },
    {
        id: 'plan_tienda_pro',
        familyCode: 'TIENDA',
        name: 'Tienda Pro',
        slug: 'tienda-pro',
        description: 'Retail avanzado con punto de venta (POS), inventario multi-bodega y reportes financieros.',
        price: 39.99,
        trial_days: 30,
        isFree: false,
        isDefault: false,
        isPublic: true,
        displayOrder: 3,
        modules: ['LANDING', 'HERO', 'PRODUCTS', 'CATEGORIES', 'CART', 'ORDERS', 'DELIVERY', 'PICKUP', 'CUSTOMERS', 'REMINDERS', 'PROMOTIONS', 'COUPONS', 'COMMUNICATION_CENTER', 'LOYALTY', 'PAYMENTS', 'POS', 'INVENTORY', 'REPORTS', 'OTP', 'PUSH'],
        limits: { MAX_PRODUCTS: -1, MAX_CATEGORIES: -1, MAX_ORDERS_MONTHLY: -1, MAX_VARIANTS: -1, MAX_STAFF: -1, MAX_DELIVERY_DRIVERS: -1, MAX_USERS: 15 }
    }
];

// Asignación de recursos primarios por familia para generación de DataPolicies
const FAMILY_PRIMARY_RESOURCE: Record<string, string> = {
    RESTAURANTE: DATA_RESOURCES.ORDERS,
    SERVICIOS: DATA_RESOURCES.APPOINTMENTS,
    CANCHAS: DATA_RESOURCES.RESERVATIONS,
    LAVANDERIA: DATA_RESOURCES.SERVICE_ORDERS,
    TIENDA: DATA_RESOURCES.STORE_ORDERS
};

async function main() {
    console.log("🌱 INICIANDO SIEMBRA CANÓNICA DE PLANES, ENTITLEMENTS, LÍMITES Y POLÍTICAS...");

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
    console.log(`✅ ${CANONICAL_MODULES.length} módulos sincronizados en BusinessModuleCatalog.`);

    // 2. Dependencias
    for (const dep of CANONICAL_DEPENDENCIES) {
        await prisma.moduleDependency.upsert({
            where: { moduleCode_dependsOnCode: { moduleCode: dep.moduleCode, dependsOnCode: dep.dependsOnCode } },
            update: {},
            create: { moduleCode: dep.moduleCode, dependsOnCode: dep.dependsOnCode }
        });
    }
    console.log(`✅ ${CANONICAL_DEPENDENCIES.length} dependencias sincronizadas en ModuleDependency.`);

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

    // 4. Vincular BusinessType a Familias
    for (const [slug, famCode] of Object.entries(BUSINESS_TYPE_MAPPINGS)) {
        const familyId = familyMap.get(famCode);
        if (familyId) {
            await prisma.businessType.updateMany({
                where: { slug },
                data: { planFamilyId: familyId }
            });
        }
    }
    console.log(`✅ BusinessTypes vinculados a sus Familias correspondientes.`);

    // 5. Configurar GlobalConfig canónicos (Founder Price = 10, Founder Max = 25, Trial = 30)
    await prisma.globalConfig.upsert({
        where: { clave: 'FOUNDER_LOCKED_PRICE' },
        update: { valor: '10' },
        create: { id: 'cfg_founder_locked_price', clave: 'FOUNDER_LOCKED_PRICE', valor: '10' }
    });
    await prisma.globalConfig.upsert({
        where: { clave: 'FOUNDER_MAX' },
        update: { valor: '25' },
        create: { id: 'cfg_founder_max', clave: 'FOUNDER_MAX', valor: '25' }
    });
    console.log(`✅ GlobalConfig de Founder actualizado a tarifa $10/mes.`);

    // 6. Procesar los 20 Planes Canónicos
    console.log(`\n📦 Procesando los 20 planes canónicos (5 familias x 4 niveles)...`);
    
    for (const p of CANONICAL_PLANS) {
        const familyId = familyMap.get(p.familyCode);
        if (!familyId) continue;

        // Upsert del Plan
        const plan = await prisma.plan.upsert({
            where: { id: p.id },
            update: {
                name: p.name,
                slug: p.slug,
                description: p.description,
                price: p.price,
                trial_days: p.trial_days,
                familyId: familyId,
                isFree: p.isFree,
                isDefault: p.isDefault,
                isPublic: p.isPublic,
                displayOrder: p.displayOrder,
                activo: true,
                active: true,
                updated_at: new Date()
            },
            create: {
                id: p.id,
                name: p.name,
                slug: p.slug,
                description: p.description,
                price: p.price,
                trial_days: p.trial_days,
                familyId: familyId,
                isFree: p.isFree,
                isDefault: p.isDefault,
                isPublic: p.isPublic,
                displayOrder: p.displayOrder,
                activo: true,
                active: true,
                updated_at: new Date()
            }
        });

        // Upsert de PlanLimits
        for (const [limitKey, limitValue] of Object.entries(p.limits)) {
            await prisma.planLimit.upsert({
                where: { planId_limitKey: { planId: plan.id, limitKey } },
                update: { limitValue: Number(limitValue) },
                create: { planId: plan.id, limitKey, limitValue: Number(limitValue) }
            });
        }

        // Upsert de PlanEntitlements
        for (const modCode of p.modules) {
            const moduleId = moduleMap.get(modCode);
            if (!moduleId) continue;

            await prisma.planEntitlement.upsert({
                where: { planId_moduleId: { planId: plan.id, moduleId } },
                update: { enabled: true },
                create: { planId: plan.id, moduleId, enabled: true }
            });
        }

        // Deshabilitar entitlements que no correspondan al plan si ya existían
        const allPlanEntitlements = await prisma.planEntitlement.findMany({
            where: { planId: plan.id },
            include: { module: true }
        });
        const currentModCodes = new Set(p.modules);
        for (const pe of allPlanEntitlements) {
            if (pe.module?.code && !currentModCodes.has(pe.module.code)) {
                await prisma.planEntitlement.update({
                    where: { id: pe.id },
                    data: { enabled: false }
                });
            }
        }

        // Upsert de DataPolicies
        const isFreePlan = Boolean(p.isFree);
        const primaryResource = FAMILY_PRIMARY_RESOURCE[p.familyCode];

        for (const resource of Object.values(DATA_RESOURCES)) {
            for (const action of Object.values(DATA_ACTIONS)) {
                let effect = 'ALLOW';

                if (isFreePlan) {
                    if (action === DATA_ACTIONS.RECEIVE) {
                        // El público puede crear reservas/pedidos/citas
                        effect = 'ALLOW';
                    } else if (resource === primaryResource && action === DATA_ACTIONS.VIEW) {
                        // Vista básica de lista de pedidos permitida en restaurante según spec
                        effect = p.familyCode === 'RESTAURANTE' ? 'ALLOW' : 'DENY';
                    } else {
                        // Todo detalle estratégico protegido en FREE
                        effect = 'DENY';
                    }
                }

                await prisma.planDataPolicy.upsert({
                    where: { planId_resource_action: { planId: plan.id, resource, action } },
                    update: { effect },
                    create: { planId: plan.id, resource, action, effect }
                });
            }
        }

        console.log(`  ✓ Plan [${plan.id}] "${plan.name}" sincronizado: $${plan.price} (Trial: ${plan.trial_days}d, Default: ${plan.isDefault})`);
    }

    // 7. Configurar FounderProgram en cada familia vinculado al plan CRECIMIENTO
    const growthPlanMap: Record<string, string> = {
        RESTAURANTE: 'plan_restaurante_crecimiento',
        SERVICIOS: 'plan_servicios_crecimiento',
        CANCHAS: 'plan_canchas_gestion',
        LAVANDERIA: 'plan_lavanderia_crecimiento',
        TIENDA: 'plan_tienda_crecimiento'
    };

    for (const fam of CANONICAL_FAMILIES) {
        const familyId = familyMap.get(fam.code);
        if (!familyId) continue;

        const growthPlanId = growthPlanMap[fam.code];

        await prisma.founderProgram.upsert({
            where: { familyId },
            update: {
                founderPlanId: growthPlanId,
                maxMembers: 25,
                founderPrice: 10.00,
                enabled: true
            },
            create: {
                familyId,
                founderPlanId: growthPlanId,
                maxMembers: 25,
                founderPrice: 10.00,
                enabled: true
            }
        });
    }
    console.log(`✅ FounderProgram sincronizado para las 5 familias (Plan Crecimiento a $10/mes).`);

    console.log("\n=================================================================");
    console.log("🚀 SIEMBRA CANÓNICA FINALIZADA CON ÉXITO: 20 PLANES OPERATIVOS");
    console.log("=================================================================\n");
}

main()
    .catch(err => {
        console.error("Error en seed canónico:", err);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
