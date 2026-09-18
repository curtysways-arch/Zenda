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
    initialServices: [
      { nombre: 'Menú Ejecutivo Almuerzo', precio: 18000, categoria: 'Almuerzos' },
      { nombre: 'Bebida Refrescante Especial', precio: 6000, categoria: 'Bebidas' },
    ],
  },

  STORE_STANDARD: {
    id: 'store_standard',
    templateVersion: '1.0.0',
    name: '🛍️ Tienda & E-Commerce / Retail',
    description: 'Venta de productos físicos, control de stock, variantes de talla/color, carrito de compras y envíos a domicilio.',
    badge: 'Comercio',
    icon: 'ShoppingBag',
    module: 'STORE',
    profile: 'RetailStore',
    capabilities: {
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
    settings: {
      labels: {
        resourceNameSingular: 'Punto de Venta / Bodega',
        resourceNamePlural: 'Puntos de Venta / Bodegas',
        itemNameSingular: 'Pedido',
      },
      channels: {
        availableInDelivery: true,
        availableInPickup: true,
      },
    },
    suggestedColors: { primaryColor: '#0ea5e9', secondaryColor: '#0369a1' },
    initialResources: [
      { name: 'Mostrador Principal (POS)', resourceType: 'EQUIPMENT', category: 'POS', active: true },
      { name: 'Bodega Central de Despacho', resourceType: 'INFRASTRUCTURE', category: 'WAREHOUSE', active: true },
    ],
    initialServices: [
      { nombre: 'Envío Estándar a Domicilio', precio: 8000, categoria: 'Logística' },
      { nombre: 'Empaque de Regalo Personalizado', precio: 4000, categoria: 'Adicionales' },
    ],
  },

  FAST_FOOD_STANDARD: {
    id: 'fast_food_standard',
    templateVersion: '1.0.0',
    name: '⚡ Comida Rápida & PinchoListo Express',
    description: 'Producción ultrarrápida, despacho express, pedidos por WhatsApp o QR y cocina KDS sin comanda de mesa obligatoria.',
    badge: 'Rápido',
    icon: 'Zap',
    module: 'FOOD_DELIVERY',
    profile: 'FastFoodExpress',
    capabilities: {
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
    settings: {
      orderSettings: {
        enableKDSView: true,
        allowTakeaway: true,
        deliveryRadiusKm: 12,
      },
      orderWorkflow: {
        customStatuses: ['NUEVA', 'PREPARANDO', 'EMPACADO', 'EN_CAMINO', 'ENTREGADO'],
      },
      labels: {
        resourceNameSingular: 'Estación de Cocina',
        resourceNamePlural: 'Estaciones de Cocina',
        itemNameSingular: 'Orden Express',
      },
      channels: {
        availableInDelivery: true,
        availableInPickup: true,
      },
    },
    suggestedColors: { primaryColor: '#f59e0b', secondaryColor: '#b45309' },
    initialResources: [
      { name: 'Estación de Plancha / Cocina Rápida', resourceType: 'EQUIPMENT', category: 'KITCHEN', active: true },
      { name: 'Mostrador de Despacho Express', resourceType: 'INFRASTRUCTURE', category: 'DISPATCH', active: true },
      { name: 'Caja POS Express', resourceType: 'EQUIPMENT', category: 'POS', active: true },
    ],
    initialServices: [
      { nombre: 'Combo Pincho Clásico + Bebida', precio: 15000, categoria: 'Combos' },
      { nombre: 'Despacho Express Prioritario', precio: 5000, categoria: 'Envíos' },
    ],
  },

  BARBERSHOP_STANDARD: {
    id: 'barbershop_standard',
    templateVersion: '1.0.0',
    name: '💈 Barbería & Peluquería',
    description: 'Gestión de sillones de corte, barberos y estilistas, citas rápidas de 30-45 min, lavados y catálogo de productos.',
    badge: 'Estilo',
    icon: 'Scissors',
    module: 'BARBER',
    profile: 'ModernBarbershop',
    capabilities: {
      booking: true,
      service: true,
      crm: true,
      inventory: true,
      customers: true,
      payments: true,
    },
    settings: {
      bookingSettings: {
        slotGranularityMinutes: 30,
        enableNightLightingFee: false,
      },
      labels: {
        resourceNameSingular: 'Barbero / Estilista',
        resourceNamePlural: 'Barberos / Estilistas',
        itemNameSingular: 'Turno de Corte',
      },
    },
    suggestedColors: { primaryColor: '#6366f1', secondaryColor: '#312e81' },
    initialResources: [
      { name: 'Sillón de Barbería 1', resourceType: 'EQUIPMENT', category: 'BARBER_CHAIR', active: true },
      { name: 'Sillón de Barbería 2', resourceType: 'EQUIPMENT', category: 'BARBER_CHAIR', active: true },
      { name: 'Estación de Lavado Capilar', resourceType: 'INFRASTRUCTURE', category: 'WASHING_STATION', active: true },
    ],
    initialServices: [
      { nombre: 'Corte Clásico & Fade', precio: 25000, duracionMinutos: 35, categoria: 'Cortes' },
      { nombre: 'Perfilado de Barba con Toalla Caliente', precio: 18000, duracionMinutos: 25, categoria: 'Barba' },
      { nombre: 'Combo Completo: Corte + Barba + Mascarilla', precio: 38000, duracionMinutos: 55, categoria: 'Combos VIP' },
    ],
  },

  CLINIC_MEDICAL_STANDARD: {
    id: 'clinic_medical_standard',
    templateVersion: '1.0.0',
    name: '🩺 Clínica, Odontología & Salud',
    description: 'Consultorios médicos y sillones odontológicos, agenda de pacientes, fichas clínicas y agendamiento por turnos.',
    badge: 'Salud',
    icon: 'Stethoscope',
    module: 'DENTAL',
    profile: 'MedicalClinic',
    capabilities: {
      booking: true,
      service: true,
      crm: true,
      customers: true,
      payments: true,
    },
    settings: {
      bookingSettings: {
        slotGranularityMinutes: 45,
        enableNightLightingFee: false,
      },
      labels: {
        resourceNameSingular: 'Doctor / Consultorio',
        resourceNamePlural: 'Doctores / Consultorios',
        itemNameSingular: 'Consulta Médica',
      },
    },
    suggestedColors: { primaryColor: '#06b6d4', secondaryColor: '#0e7490' },
    initialResources: [
      { name: 'Consultorio Médico 1', resourceType: 'INFRASTRUCTURE', category: 'CONSULTING_ROOM', active: true },
      { name: 'Sillón Odontológico / Camilla', resourceType: 'EQUIPMENT', category: 'DENTAL_CHAIR', active: true },
    ],
    initialServices: [
      { nombre: 'Consulta de Valoración Médica', precio: 60000, duracionMinutos: 45, categoria: 'Consultas' },
      { nombre: 'Limpieza Dental Profiláctica', precio: 85000, duracionMinutos: 40, categoria: 'Odontología' },
      { nombre: 'Evaluación y Diagnóstico Especializado', precio: 70000, duracionMinutos: 45, categoria: 'Especialidades' },
    ],
  },

  ACADEMY_COURSES_STANDARD: {
    id: 'academy_courses_standard',
    templateVersion: '1.0.0',
    name: '🎓 Academia, Clases & Cursos',
    description: 'Inscripción de estudiantes, venta de talleres y cursos, control de asistencia, profesores y cupos por aula.',
    badge: 'Educación',
    icon: 'GraduationCap',
    module: 'ACADEMY',
    profile: 'SportsAcademy',
    capabilities: {
      academy: true,
      booking: true,
      crm: true,
      payments: true,
      customers: true,
    },
    settings: {
      bookingSettings: {
        slotGranularityMinutes: 60,
        enableNightLightingFee: false,
      },
      labels: {
        resourceNameSingular: 'Instructor / Aula',
        resourceNamePlural: 'Instructores / Aulas',
        itemNameSingular: 'Inscripción / Clase',
      },
    },
    suggestedColors: { primaryColor: '#8b5cf6', secondaryColor: '#5b21b6' },
    initialResources: [
      { name: 'Aula Principal / Salón de Clases', resourceType: 'INFRASTRUCTURE', category: 'CLASSROOM', active: true },
      { name: 'Instructor Principal', resourceType: 'HUMAN', category: 'INSTRUCTOR', active: true },
    ],
    initialServices: [
      { nombre: 'Mensualidad Clases Regulares (2 Días/Semana)', precio: 120000, duracionMinutos: 60, categoria: 'Membresías' },
      { nombre: 'Taller Intensivo Fin de Semana', precio: 75000, duracionMinutos: 120, categoria: 'Talleres' },
      { nombre: 'Clase Suelta de Nivelación', precio: 25000, duracionMinutos: 60, categoria: 'Clases Individuales' },
    ],
  },
};

export function getTemplateManifest(templateId: string): BusinessTemplateManifest {
  if (!templateId) return TEMPLATE_REGISTRY.PADEL_CLUB_STANDARD;
  const match = TEMPLATE_REGISTRY[templateId] || 
    Object.values(TEMPLATE_REGISTRY).find(t => 
      t.id.toLowerCase() === templateId.toLowerCase() || 
      t.module.toLowerCase() === templateId.toLowerCase()
    );
  return match || TEMPLATE_REGISTRY.PADEL_CLUB_STANDARD;
}

