// src/core/runtime/LegacyRuntimeAdapter.ts
// Adaptador transparente que garantiza 100% retrocompatibilidad con negocios legacy

import { BusinessRuntime } from './types';

export class LegacyRuntimeAdapter {
  static createRuntimeFromNegocio(negocio: any): BusinessRuntime {
    const config = (typeof negocio?.configuracion === 'string'
      ? (() => { try { return JSON.parse(negocio.configuracion); } catch { return {}; } })()
      : negocio?.configuracion) || {};

    const rawCaps = config.capabilities || config.businessCapabilities || {};
    const tipo = (negocio?.tipoNegocio || config.tipoNegocio || 'RESERVA').toUpperCase();
    const isShoeCare = tipo === 'SHOE_CARE' || negocio?.slug === 'lavado';
    const isSports = tipo === 'SPORTS_COURTS' || (negocio?.slug || '').includes('canchas');

    const capabilities: Record<string, boolean> = {
      booking: Boolean(rawCaps.booking ?? (isSports || tipo === 'RESERVA')),
      service: Boolean(rawCaps.service ?? isShoeCare),
      orders: Boolean(rawCaps.orders ?? tipo === 'PRODUCTOS'),
      delivery: Boolean(rawCaps.delivery ?? config.capabilities?.delivery ?? isShoeCare),
      inventory: Boolean(rawCaps.inventory ?? true),
      crm: Boolean(rawCaps.crm ?? true),
    };

    const modules: string[] = [];
    if (capabilities['booking']) modules.push('BOOKING');
    if (capabilities['service']) modules.push('SERVICE');
    if (capabilities['orders']) modules.push('ORDERS');
    if (capabilities['delivery']) modules.push('DELIVERY');

    return {
      blueprint: {
        id: `blueprint_legacy_${negocio?.id || 'default'}`,
        name: negocio?.nombre || 'Negocio Legacy',
        code: `LEGACY_${tipo}`,
        slug: negocio?.slug || 'legacy',
        category: tipo,
        version: '1.0.0',
        active: true,
        isDefault: true,
      },
      definition: {
        modules,
        capabilities,
        workflow: {
          id: `wf_${tipo}`,
          name: `Workflow ${tipo}`,
          statuses: isShoeCare
            ? ['RECIBIDO', 'EN_LAVADO', 'LISTO', 'ENTREGADO']
            : ['PENDIENTE', 'CONFIRMADO', 'COMPLETADO', 'CANCELADO']
        },
        resources: negocio?.services || [],
        plans: ['STARTER', 'GROWTH', 'PRO'],
        settings: config,
        roles: ['ADMINISTRADOR', 'RECEPCION', 'CLIENTE'],
        permissions: ['READ', 'WRITE', 'DELETE']
      },
      experience: {
        landing: {
          component: isShoeCare ? 'ShoeCareLanding' : (isSports ? 'CanchaPublicLanding' : 'DefaultLanding'),
          theme: negocio?.landingThemeId || config.landingThemeId || 'modern'
        },
        admin: {
          component: 'AdminSidebarLayout',
          layoutType: negocio?.adminThemeId || config.adminThemeId || 'SIDEBAR'
        },
        dashboard: {
          layoutType: isShoeCare ? 'KANBAN' : (isSports ? 'CALENDAR' : 'CARDS')
        },
        navigation: {
          items: ['INICIO', 'RESERVAS', 'SERVICIOS', 'CLIENTES', 'CONFIGURACION']
        },
        forms: { pack: 'MINIMAL_ROUNDED' },
        cards: { pack: 'GLASS' },
        tables: { pack: 'COMPACT' },
        widgets: { pack: 'DEFAULT' },
        theme: {
          primaryColor: negocio?.colorPrimario || '#7c3aed',
          secondaryColor: negocio?.colorSecundario || '#4f46e5',
          fontHeading: 'Inter',
          fontBody: 'Inter'
        },
        mobile: { appType: 'PWA_RESPONSIVE' }
      },
      operations: {
        policies: [
          { code: 'PAYMENT_POLICY', name: 'Pago al agendar o entregar', active: true }
        ],
        integrations: [
          { code: 'WHATSAPP', active: Boolean(negocio?.whatsapp) },
          { code: 'MAPS', active: true }
        ]
      },
      intelligence: {
        skills: [
          { code: 'AUTO_REMINDER', name: 'Recordatorio WhatsApp', active: true }
        ],
        assistants: [
          { code: 'RECEPTION_AI', name: 'Asistente de Recepción', active: true }
        ],
        models: [],
        prompts: []
      }
    };
  }
}
