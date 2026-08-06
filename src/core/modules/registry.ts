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
};

export function getModuleManifest(moduleType: string): BusinessModuleManifest {
  return MODULE_REGISTRY[moduleType] || MODULE_REGISTRY.APPOINTMENTS;
}
