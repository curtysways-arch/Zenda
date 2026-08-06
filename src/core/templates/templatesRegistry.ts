// src/core/templates/templatesRegistry.ts
import { BusinessTemplateManifest } from './types';

export const TEMPLATE_REGISTRY: Record<string, BusinessTemplateManifest> = {
  PADEL_CLUB_STANDARD: {
    id: 'padel_club_standard',
    templateVersion: '1.0.0',
    name: '🏓 Club de Pádel & Tenis',
    description: 'Sistema completo para clubes deportivos: reserva de canchas por 90 min, iluminación nocturna y torneos.',
    badge: 'Popular',
    icon: 'Trophy',
    module: 'SPORTS_COURTS',
    profile: 'PadelClub',
    capabilities: { booking: true, academy: true, crm: true },
    settings: {
      bookingSettings: {
        slotGranularityMinutes: 90,
        enableNightLightingFee: true,
        allowMultipleConsecutiveSlots: true,
      },
      labels: {
        resourceNameSingular: 'Cancha',
        resourceNamePlural: 'Canchas',
        itemNameSingular: 'Turno',
      },
    },
    suggestedColors: { primaryColor: '#059669', secondaryColor: '#064e3b' },
    initialResources: [
      { name: 'Cancha 1 (Cristal)', resourceType: 'INFRASTRUCTURE', category: 'Pádel', active: true },
      { name: 'Cancha 2 (Cristal)', resourceType: 'INFRASTRUCTURE', category: 'Pádel', active: true },
      { name: 'Cancha 3 (Pared)', resourceType: 'INFRASTRUCTURE', category: 'Pádel', active: true },
    ],
    initialServices: [
      { nombre: 'Reserva Cancha Pádel 90 Min', precio: 25000, duracionMinutos: 90, categoria: 'Alquiler Cancha' },
      { nombre: 'Clase Particular Pádel 60 Min', precio: 35000, duracionMinutos: 60, categoria: 'Clases' },
    ],
  },

  SPA_LUXURY_STANDARD: {
    id: 'spa_luxury_standard',
    templateVersion: '1.0.0',
    name: '💆 Spa & Centro Estético',
    description: 'Gestión de cabinas, especialistas, agendamiento de masajes y tratamientos faciales.',
    badge: 'Recomendado',
    icon: 'Sparkles',
    module: 'APPOINTMENTS',
    profile: 'LuxurySpa',
    capabilities: { booking: true, crm: true, inventory: true },
    settings: {
      bookingSettings: {
        slotGranularityMinutes: 30,
        enableNightLightingFee: false,
      },
      labels: {
        resourceNameSingular: 'Especialista',
        resourceNamePlural: 'Especialistas',
        itemNameSingular: 'Servicio',
      },
    },
    suggestedColors: { primaryColor: '#ec4899', secondaryColor: '#831843' },
    initialResources: [
      { name: 'Dra. María Silva', resourceType: 'HUMAN', category: 'Fisioterapia', active: true },
      { name: 'Cabina VIP 1', resourceType: 'INFRASTRUCTURE', category: 'Masajes', active: true },
    ],
    initialServices: [
      { nombre: 'Masaje Relajante 60 Min', precio: 50000, duracionMinutos: 60, categoria: 'Masajes' },
      { nombre: 'Tratamiento Facial Profundo', precio: 75000, duracionMinutos: 45, categoria: 'Facial' },
    ],
  },

  SHOE_CARE_STANDARD: {
    id: 'shoe_care_standard',
    templateVersion: '1.0.0',
    name: '👟 Lavado & Restauración de Calzado',
    description: 'Recepción de sneakers, diagnóstico de manchas, fotos al ingresar y tablero Kanban de entrega.',
    badge: 'Nuevo',
    icon: 'Footprints',
    module: 'SHOE_CARE',
    profile: 'SneakerCare',
    capabilities: { service: true, inventory: true, crm: true },
    settings: {
      serviceSettings: {
        requiresItemPhotos: true,
        customStatuses: ['RECIBIDO', 'EN_DIAGNOSTICO', 'EN_LAVADO', 'LISTO_PARA_ENTREGA', 'ENTREGADO'],
      },
      labels: {
        resourceNameSingular: 'Estación',
        resourceNamePlural: 'Estaciones',
        itemNameSingular: 'Orden',
      },
    },
    suggestedColors: { primaryColor: '#2563eb', secondaryColor: '#1e3a8a' },
    initialResources: [
      { name: 'Estación de Limpieza 1', resourceType: 'EQUIPMENT', category: 'Limpieza', active: true },
    ],
    initialServices: [
      { nombre: 'Limpieza Deep Clean Sneakers', precio: 30000, categoria: 'Limpieza' },
      { nombre: 'Restauración y Repintado de Cuero', precio: 60000, categoria: 'Restauración' },
    ],
  },

  RESTAURANT_STANDARD: {
    id: 'restaurant_standard',
    templateVersion: '1.0.0',
    name: '🍽️ Restaurante, Bar & Cafetería',
    description: 'Comanda interactiva para meseros, pantalla KDS de cocina, pedidos QR a mesa y delivery integrado.',
    badge: 'Completo',
    icon: 'Utensils',
    module: 'RESTAURANT',
    profile: 'RestaurantExperience',
    capabilities: {
      orders: true,
      products: true,
      categories: true,
      tables: true,
      waiters: true,
      kitchen: true,
      delivery: true,
      pickup: true,
      payments: true,
      inventory: true,
      customers: true,
      qr_ordering: true
    },
    settings: {
      orderWorkflow: {
        customStatuses: ['NUEVA', 'CONFIRMADA', 'EN_COCINA', 'PREPARANDO', 'LISTA', 'ENTREGADA', 'PAGADA', 'FINALIZADA'],
      },
      labels: {
        resourceNameSingular: 'Mesa',
        resourceNamePlural: 'Mesas',
        itemNameSingular: 'Comanda',
      },
      channels: {
        availableInTable: true,
        availableInDelivery: true,
        availableInPickup: true,
        availableInWaiter: true
      }
    },
    suggestedColors: { primaryColor: '#ea580c', secondaryColor: '#7c2d12' },
    initialResources: [
      { name: 'Mesa 1', resourceType: 'INFRASTRUCTURE', category: 'TABLE', capacity: 4, active: true },
      { name: 'Mesa 2', resourceType: 'INFRASTRUCTURE', category: 'TABLE', capacity: 2, active: true },
      { name: 'Mesa 3 (Terraza)', resourceType: 'INFRASTRUCTURE', category: 'TABLE', capacity: 6, active: true },
    ],
    initialServices: [],
  },
};

export function getTemplateManifest(templateId: string): BusinessTemplateManifest {
  return TEMPLATE_REGISTRY[templateId] || TEMPLATE_REGISTRY.PADEL_CLUB_STANDARD;
}
