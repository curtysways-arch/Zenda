/**
 * ¿Este negocio puede vender productos online y enviarlos a domicilio?
 *
 * Fuente única para todo el sistema (tienda pública, API de pedidos, mis pedidos,
 * repartidores). Antes había dos lógicas que no coincidían:
 *  - por tipo de negocio (BusinessModuleResolver.hasModule): un spa NUNCA podía recibir pedidos;
 *  - por plan + add-ons (EntitlementsService): el add-on "Venta de productos" sí lo habilitaba.
 * Resultado: un spa que compraba el add-on veía los menús en su panel pero sus clientes no
 * podían comprar. Ahora vale cualquiera de las dos.
 *
 * Reglas:
 *  - Restaurantes, tiendas y lavanderías: pedidos y delivery incluidos por su tipo.
 *  - Cualquier otro negocio (spa, barbería, consultorio…): con el add-on "Venta de productos"
 *    (E-commerce) obtiene pedidos + envío a domicilio con sus propios repartidores.
 *  - El add-on "Delivery" activa solo el envío a domicilio.
 */
import { hasModule } from '@/lib/business/BusinessModuleResolver';
import { EntitlementsService } from '@/core/entitlements/EntitlementsService';

export type CommerceAccess = {
  /** Puede vender productos y recibir pedidos online. */
  orders: boolean;
  /** Puede enviar pedidos a domicilio con repartidores. */
  delivery: boolean;
  /** De dónde viene el permiso (para mensajes y soporte). */
  source: 'TIPO' | 'ADDON' | 'NINGUNO';
};

type NegocioLike = { id: string; tipoNegocio?: string | null; configuracion?: any };

function parseConfig(raw: any) {
  if (!raw) return {};
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } catch { return {}; }
  }
  return raw;
}

export async function getCommerceAccess(negocio: NegocioLike): Promise<CommerceAccess> {
  const byTypeOrders = hasModule(negocio.tipoNegocio, 'ORDERS');
  const byTypeDelivery = hasModule(negocio.tipoNegocio, 'DELIVERY');
  const cfg = parseConfig(negocio.configuracion);
  const enterprise = Boolean(cfg.useEnterpriseRuntime || cfg.enterpriseRuntime);

  if (byTypeOrders && byTypeDelivery) return { orders: true, delivery: true, source: 'TIPO' };

  let caps: Record<string, boolean> = {};
  try {
    const ent = await EntitlementsService.resolve(negocio.id);
    caps = ent?.capabilities || {};
  } catch {
    caps = {};
  }
  const capOrders = Boolean(caps.ORDERS || caps.orders || caps.ECOMMERCE || caps.ecommerce);
  const capDelivery = Boolean(caps.DELIVERY || caps.delivery || caps.ECOMMERCE || caps.ecommerce);

  const orders = byTypeOrders || capOrders || enterprise;
  const delivery = orders && (byTypeDelivery || capDelivery || enterprise);
  return {
    orders,
    delivery,
    source: byTypeOrders ? 'TIPO' : capOrders || capDelivery ? 'ADDON' : 'NINGUNO',
  };
}
