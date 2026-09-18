// src/core/modules/registry.ts
import { BusinessModuleManifest, BusinessModuleType } from './types';

export const MODULE_REGISTRY: Record<string, BusinessModuleManifest> = {
  APPOINTMENTS: {
    id: 'APPOINTMENTS',
    name: 'Agenda & Servicios General',
    description: 'Gestión de citas por tiempo y profesionales.',
    icon: 'CalendarDays',
    defaultCapabilities: { booking: true, crm: true },
    compatibleAddons: ['loyalty', 'whatsapp', 'academy'],
    navigation: {
      adminSidebar: [
        { name: 'Dashboard', href: '/admin', icon: 'LayoutDashboard', section: 'GESTIÓN OPERATIVA' },
        { name: 'Citas', href: '/admin/citas', icon: 'CalendarDays', section: 'GESTIÓN OPERATIVA' },
        { name: 'Servicios', href: '/admin/servicios', icon: 'Scissors', section: 'GESTIÓN OPERATIVA' },
        { name: 'Profesionales', href: '/admin/staff', icon: 'Users', section: 'GESTIÓN OPERATIVA' },
        { name: 'Clientes', href: '/admin/clientes', icon: 'Contact', section: 'ADMINISTRACIÓN' },
        { name: 'Configuración', href: '/admin/config', icon: 'Settings', section: 'CONFIGURACIÓN' },
      ],
    },
  },

  FOOD_DELIVERY: {
    id: 'FOOD_DELIVERY',
    name: 'Restaurante & Delivery',
    description: 'Menú interactivo, comanda, cocina y entregas.',
    icon: 'Utensils',
    defaultCapabilities: { orders: true, inventory: true, delivery: true, tables: true, waiters: true, kitchen: true, qr_ordering: true },
    compatibleAddons: ['loyalty', 'whatsapp', 'ecommerce'],
    navigation: {
      adminSidebar: [
        { name: 'Dashboard', href: '/admin', icon: 'LayoutDashboard', section: 'GESTIÓN OPERATIVA' },
        { name: 'Cocina (KDS)', href: '/admin/cocina', icon: 'ChefHat', section: 'GESTIÓN OPERATIVA', requiredCapability: 'kitchen' },
        { name: 'Mesas & QR', href: '/admin/mesas', icon: 'Grid', section: 'GESTIÓN OPERATIVA', requiredCapability: 'tables' },
        { name: 'Meseros', href: '/admin/meseros', icon: 'Users', section: 'GESTIÓN OPERATIVA', requiredCapability: 'waiters' },
        { name: 'Pedidos', href: '/admin/pedidos', icon: 'Package', section: 'GESTIÓN OPERATIVA' },
        { name: 'Logística', href: '/admin/logistica', icon: 'Truck', section: 'GESTIÓN OPERATIVA', requiredCapability: 'delivery' },
        { name: 'Menú & Productos', href: '/admin/productos', icon: 'UtensilsCrossed', section: 'CATÁLOGO' },
        { name: 'Categorías', href: '/admin/categorias', icon: 'Tags', section: 'CATÁLOGO' },
        { name: 'Clientes', href: '/admin/clientes', icon: 'Contact', section: 'ADMINISTRACIÓN' },
        { name: 'Configuración', href: '/admin/config', icon: 'Settings', section: 'CONFIGURACIÓN' },
      ],
    },
  },

  RESTAURANT: {
    id: 'RESTAURANT',
    name: 'Restaurante Blueprint',
    description: 'Composición universal para restaurantes, cafeterías, bares, food trucks y dark kitchens.',
    icon: 'UtensilsCrossed',
    defaultCapabilities: { orders: true, inventory: true, delivery: true, tables: true, waiters: true, kitchen: true, qr_ordering: true, pickup: true, payments: true, customers: true },
    compatibleAddons: ['loyalty', 'whatsapp', 'ecommerce'],
    navigation: {
      adminSidebar: [
        { name: 'Dashboard', href: '/admin', icon: 'LayoutDashboard', section: 'GESTIÓN OPERATIVA' },
        { name: 'Cocina (KDS)', href: '/admin/cocina', icon: 'ChefHat', section: 'GESTIÓN OPERATIVA' },
        { name: 'Mesas & QR', href: '/admin/mesas', icon: 'Grid', section: 'GESTIÓN OPERATIVA' },
        { name: 'Meseros', href: '/admin/meseros', icon: 'Users', section: 'GESTIÓN OPERATIVA' },
        { name: 'Pedidos', href: '/admin/pedidos', icon: 'Package', section: 'GESTIÓN OPERATIVA' },
        { name: 'Logística', href: '/admin/logistica', icon: 'Truck', section: 'GESTIÓN OPERATIVA', requiredCapability: 'delivery' },
        { name: 'Menú & Productos', href: '/admin/productos', icon: 'UtensilsCrossed', section: 'CATÁLOGO' },
        { name: 'Categorías', href: '/admin/categorias', icon: 'Tags', section: 'CATÁLOGO' },
        { name: 'Clientes', href: '/admin/clientes', icon: 'Contact', section: 'ADMINISTRACIÓN' },
        { name: 'Configuración', href: '/admin/config', icon: 'Settings', section: 'CONFIGURACIÓN' },
      ],
    },
  },

  SPORTS_COURTS: {
    id: 'SPORTS_COURTS',
    name: 'Canchas & Clubes Deportivos',
    description: 'Reserva de canchas de pádel, fútbol, tenis e iluminación nocturna.',
    icon: 'Trophy',
    defaultCapabilities: { booking: true, academy: true },
    compatibleAddons: ['loyalty', 'whatsapp', 'academy'],
    navigation: {
      adminSidebar: [
        { name: 'Dashboard', href: '/admin', icon: 'LayoutDashboard', section: 'GESTIÓN OPERATIVA' },
        { name: 'Grilla de Canchas', href: '/admin/canchas/grilla', icon: 'CalendarDays', section: 'GESTIÓN OPERATIVA' },
        { name: 'Canchas & Tarifas', href: '/admin/canchas', icon: 'Trophy', section: 'GESTIÓN OPERATIVA' },
        { name: 'Bloqueos', href: '/admin/bloqueos', icon: 'Lock', section: 'GESTIÓN OPERATIVA' },
        { name: 'Academia / Clases', href: '/admin/cursos', icon: 'GraduationCap', section: 'ACADEMIA Y TORNEOS' },
        { name: 'Clientes / Jugadores', href: '/admin/clientes', icon: 'Contact', section: 'ADMINISTRACIÓN' },
        { name: 'Configuración', href: '/admin/config', icon: 'Settings', section: 'CONFIGURACIÓN' },
      ],
    },
  },

  SHOE_CARE: {
    id: 'SHOE_CARE',
    name: 'Lavado & Restauración de Calzado',
    description: 'Recepción de sneakers, diagnóstico con fotos y tablero Kanban de entrega.',
    icon: 'Footprints',
    defaultCapabilities: { service: true, inventory: true, delivery: true },
    compatibleAddons: ['whatsapp', 'loyalty'],
    navigation: {
      adminSidebar: [
        { name: 'Dashboard', href: '/admin', icon: 'LayoutDashboard', section: 'GESTIÓN OPERATIVA' },
        { name: 'Recepciones', href: '/admin/ordenes-servicio?tab=recepciones', icon: 'Store', section: 'GESTIÓN OPERATIVA' },
        { name: 'Órdenes', href: '/admin/ordenes-servicio', icon: 'ClipboardList', section: 'GESTIÓN OPERATIVA' },
        { name: 'Logística', href: '/admin/logistica', icon: 'Truck', section: 'GESTIÓN OPERATIVA', requiredCapability: 'delivery' },
        { name: 'Clientes', href: '/admin/clientes', icon: 'Contact', section: 'ADMINISTRACIÓN' },
        { name: 'Servicios', href: '/admin/servicios', icon: 'Scissors', section: 'ADMINISTRACIÓN' },
        { name: 'Configuración', href: '/admin/config', icon: 'Settings', section: 'CONFIGURACIÓN' },
      ],
    },
  },

  STORE: {
    id: 'STORE',
    name: 'Tienda & E-Commerce',
    description: 'Catálogo de productos, inventario con variantes, logística y ventas en línea.',
    icon: 'ShoppingBag',
    defaultCapabilities: {
      store: true,
      products: true,
      categories: true,
      inventory: true,
      delivery: true,
      pickup: true,
      variants: true,
      payments: true,
      crm: true,
      customers: true,
    },
    compatibleAddons: ['loyalty', 'whatsapp', 'promotions'],
    navigation: {
      adminSidebar: [
        { name: 'Dashboard', href: '/admin', icon: 'LayoutDashboard', section: 'GESTIÓN OPERATIVA' },
        { name: 'Pedidos', href: '/admin/pedidos', icon: 'Package', section: 'GESTIÓN OPERATIVA' },
        { name: 'Catálogo de Productos', href: '/admin/productos', icon: 'ShoppingBag', section: 'CATÁLOGO' },
        { name: 'Categorías', href: '/admin/categorias', icon: 'Tags', section: 'CATÁLOGO' },
        { name: 'Logística & Envíos', href: '/admin/logistica', icon: 'Truck', section: 'LOGÍSTICA', requiredCapability: 'delivery' },
        { name: 'Clientes', href: '/admin/clientes', icon: 'Contact', section: 'ADMINISTRACIÓN' },
        { name: 'Configuración', href: '/admin/config', icon: 'Settings', section: 'CONFIGURACIÓN' },
      ],
    },
  },

  FAST_FOOD: {
    id: 'FAST_FOOD',
    name: 'Comida Rápida & Despacho Express',
    description: 'Producción rápida, mostrador express, KDS ágil y entregas a domicilio.',
    icon: 'Zap',
    defaultCapabilities: {
      orders: true,
      products: true,
      categories: true,
      kitchen: true,
      delivery: true,
      pickup: true,
      payments: true,
      qr_ordering: true,
      dispatch: true,
      customers: true,
    },
    compatibleAddons: ['loyalty', 'whatsapp', 'ecommerce'],
    navigation: {
      adminSidebar: [
        { name: 'Dashboard', href: '/admin', icon: 'LayoutDashboard', section: 'GESTIÓN OPERATIVA' },
        { name: 'Cocina & Despacho', href: '/admin/cocina', icon: 'ChefHat', section: 'GESTIÓN OPERATIVA' },
        { name: 'Pedidos Activos', href: '/admin/pedidos', icon: 'Package', section: 'GESTIÓN OPERATIVA' },
        { name: 'Logística', href: '/admin/logistica', icon: 'Truck', section: 'GESTIÓN OPERATIVA', requiredCapability: 'delivery' },
        { name: 'Menú Rápido', href: '/admin/productos', icon: 'UtensilsCrossed', section: 'CATÁLOGO' },
        { name: 'Categorías', href: '/admin/categorias', icon: 'Tags', section: 'CATÁLOGO' },
        { name: 'Clientes', href: '/admin/clientes', icon: 'Contact', section: 'ADMINISTRACIÓN' },
        { name: 'Configuración', href: '/admin/config', icon: 'Settings', section: 'CONFIGURACIÓN' },
      ],
    },
  },

  BARBER: {
    id: 'BARBER',
    name: 'Barbería & Salón Masculino',
    description: 'Gestión ágil de sillones, barberos y turnos por intervalos de 30-45 min.',
    icon: 'Scissors',
    defaultCapabilities: {
      booking: true,
      service: true,
      crm: true,
      inventory: true,
      customers: true,
      payments: true,
    },
    compatibleAddons: ['loyalty', 'whatsapp', 'promotions'],
    navigation: {
      adminSidebar: [
        { name: 'Dashboard', href: '/admin', icon: 'LayoutDashboard', section: 'GESTIÓN OPERATIVA' },
        { name: 'Agenda de Turnos', href: '/admin/citas', icon: 'CalendarDays', section: 'GESTIÓN OPERATIVA' },
        { name: 'Cortes & Servicios', href: '/admin/servicios', icon: 'Scissors', section: 'GESTIÓN OPERATIVA' },
        { name: 'Barberos & Staff', href: '/admin/staff', icon: 'Users', section: 'GESTIÓN OPERATIVA' },
        { name: 'Clientes', href: '/admin/clientes', icon: 'Contact', section: 'ADMINISTRACIÓN' },
        { name: 'Configuración', href: '/admin/config', icon: 'Settings', section: 'CONFIGURACIÓN' },
      ],
    },
  },

  DENTAL: {
    id: 'DENTAL',
    name: 'Clínica, Odontología & Salud',
    description: 'Gestión integral de consultorios dentales, odontograma interactivo, pacientes y fichas clínicas.',
    icon: 'Activity',
    defaultCapabilities: {
      booking: true,
      service: true,
      crm: true,
      customers: true,
      payments: true,
      dental_clinical_record: true,
      dental_odontogram: true,
      dental_treatment_plan: true,
      dental_diagnosis: true,
      dental_documents: true,
    },
    compatibleAddons: ['whatsapp', 'promotions'],
    navigation: {
      adminSidebar: [
        { name: 'Dashboard', href: '/admin', icon: 'LayoutDashboard', section: 'GESTIÓN CLÍNICA' },
        { name: 'Pacientes', href: '/admin/pacientes', icon: 'Contact', section: 'GESTIÓN CLÍNICA' },
        { name: 'Agenda & Citas', href: '/admin/citas', icon: 'CalendarDays', section: 'GESTIÓN CLÍNICA' },
        { name: 'Historias Clínicas', href: '/admin/historia-clinica', icon: 'FileText', section: 'GESTIÓN CLÍNICA' },
        { name: 'Tratamientos', href: '/admin/tratamientos', icon: 'Activity', section: 'GESTIÓN CLÍNICA' },
        { name: 'Documentos', href: '/admin/documentos', icon: 'Folder', section: 'GESTIÓN CLÍNICA' },
        { name: 'Servicios & Tarifario', href: '/admin/servicios', icon: 'Stethoscope', section: 'CATÁLOGO' },
        { name: 'Doctores & Especialistas', href: '/admin/staff', icon: 'Users', section: 'ADMINISTRACIÓN' },
        { name: 'Configuración', href: '/admin/config', icon: 'Settings', section: 'CONFIGURACIÓN' },
      ],
    },
  },

  ACADEMY: {
    id: 'ACADEMY',
    name: 'Academia & Clases Deportivas',
    description: 'Inscripción de alumnos, control de clases, cursos y profesores.',
    icon: 'GraduationCap',
    defaultCapabilities: {
      academy: true,
      booking: true,
      crm: true,
      payments: true,
      customers: true,
    },
    compatibleAddons: ['loyalty', 'whatsapp', 'promotions'],
    navigation: {
      adminSidebar: [
        { name: 'Dashboard', href: '/admin', icon: 'LayoutDashboard', section: 'GESTIÓN OPERATIVA' },
        { name: 'Cursos & Talleres', href: '/admin/cursos', icon: 'GraduationCap', section: 'GESTIÓN OPERATIVA' },
        { name: 'Alumnos Inscritos', href: '/admin/clientes', icon: 'Contact', section: 'ADMINISTRACIÓN' },
        { name: 'Profesores / Coaches', href: '/admin/staff', icon: 'Users', section: 'ADMINISTRACIÓN' },
        { name: 'Configuración', href: '/admin/config', icon: 'Settings', section: 'CONFIGURACIÓN' },
      ],
    },
  },

  GYM: {
    id: 'GYM',
    name: 'Gimnasio & Centro Fitness',
    description: 'Gestión especializada de socios, membresías recurrentes, accesos QR y asistencias.',
    icon: 'Dumbbell',
    defaultCapabilities: {
      memberships: true,
      membership_plans: true,
      access: true,
      attendance: true,
      payments: true,
      customers: true,
    },
    compatibleAddons: ['loyalty', 'whatsapp', 'promotions'],
    navigation: {
      adminSidebar: [
        { name: 'Dashboard', href: '/admin', icon: 'LayoutDashboard', section: 'GESTIÓN OPERATIVA' },
        { name: 'Socios', href: '/admin/socios', icon: 'Contact', section: 'GESTIÓN OPERATIVA' },
        { name: 'Membresías', href: '/admin/membresias', icon: 'CreditCard', section: 'GESTIÓN OPERATIVA' },
        { name: 'Planes', href: '/admin/membresias/planes', icon: 'Tags', section: 'GESTIÓN OPERATIVA' },
        { name: 'Control de Acceso', href: '/admin/accesos', icon: 'QrCode', section: 'GESTIÓN OPERATIVA' },
        { name: 'Asistencias', href: '/admin/asistencias', icon: 'CalendarDays', section: 'GESTIÓN OPERATIVA' },
        { name: 'Promociones', href: '/admin/promociones', icon: 'Sparkles', section: 'MARKETING' },
        { name: 'Club de Beneficios', href: '/admin/misiones', icon: 'Trophy', section: 'MARKETING' },
        { name: 'Reportes', href: '/admin/reportes', icon: 'BarChart3', section: 'ADMINISTRACIÓN' },
        { name: 'Configuración', href: '/admin/config', icon: 'Settings', section: 'CONFIGURACIÓN' },
      ],
    },
  },
};

export function getModuleManifest(moduleType: string): BusinessModuleManifest {
  return MODULE_REGISTRY[moduleType] || MODULE_REGISTRY.APPOINTMENTS;
}
