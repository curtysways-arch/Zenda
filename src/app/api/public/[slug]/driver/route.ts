import { getCanonicalLogistics } from '@/core/logistics/CanonicalLogisticsService';
/**
 * @file route.ts
 * @module app/api/public/[slug]/driver
 * @description Endpoint público para la App de Repartidores (FASE 5E).
 * @responsibility Permitir a los repartidores consultar pedidos asignados, cambiar su disponibilidad (DISPONIBLE, DESCANSO, DESCONECTADO), y Aceptar o Rechazar tareas mediante el DeliveryEngine.
 * @dependencies BusinessRuntimeResolver, DeliveryEngine
 * @status Stable (Core Runtime API - v1.0)
 */

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { BusinessRuntimeResolver } from '@/core/runtime/BusinessRuntimeResolver';
import { notificationService } from '@/lib/notifications';
import { sendWhatsAppMessage } from '@/lib/whatsapp-client';
import { v4 as uuidv4 } from 'uuid';
import { randomInt } from 'crypto';
import { wordsFor } from '@/lib/laundry/wording';

import { getEffectiveAdminSession } from '@/lib/delegatedAuth';
import {
  getDriverSession,
  driverResources,
  isApprovedResource,
  setDriverCookie,
  clearDriverCookie,
  otpLocked,
  otpFail,
  otpReset,
  type DriverSession,
} from '@/lib/logistics/driverSession';
import { phoneKey } from '@/lib/logistics/driverNetwork';
import { normalizeDocUrl } from '@/lib/logistics/driverDocs';

export const dynamic = 'force-dynamic';

/* ── Autorización ──────────────────────────────────────────────────────────────
 * Esta API la usan dos tipos de usuario:
 *  - el repartidor (app /driver) → cookie firmada que se entrega al verificar el OTP;
 *  - el panel del negocio (pedidos online, delivery) → sesión de administrador.
 * Sin una de las dos no se devuelve nada (antes cualquiera veía pedidos con datos de clientes).
 */
type DriverCtx = { session: DriverSession; ownIds: string[]; approvedBizIds: string[]; resources: any[] };
type AdminCtx = { negocioId: string | null; superadmin: boolean };

async function loadAuth(): Promise<{ driver: DriverCtx | null; admin: AdminCtx | null }> {
  let driver: DriverCtx | null = null;
  let admin: AdminCtx | null = null;
  const ds = await getDriverSession();
  if (ds) {
    const resources = await driverResources(ds);
    if (resources.length) {
      driver = {
        session: ds,
        resources,
        ownIds: resources.map((r: any) => r.id),
        approvedBizIds: resources.filter(isApprovedResource).map((r: any) => r.negocioId).filter(Boolean),
      };
    }
  }
  try {
    const s = await getEffectiveAdminSession();
    const u = s?.user as any;
    const role = String(u?.role || '').toUpperCase();
    const superadmin = role === 'SUPERADMIN' || (Array.isArray(u?.roles) && u.roles.includes('SUPERADMIN'));
    if (u && (u.negocioId || superadmin) && !u.isExpired) admin = { negocioId: u.negocioId || null, superadmin };
  } catch {}
  return { driver, admin };
}

const ADMIN_ONLY_ACTIONS = new Set(['SETTLE_DRIVER_COLLECTION', 'PAY_DRIVER_COMPENSATION', 'SETTLE_NET_COLLECTION']);
const PUBLIC_ACTIONS = new Set(['REQUEST_OTP', 'VERIFY_OTP', 'LOGOUT']);
const ASSIGNED_ONLY_ACTIONS = new Set(['MARK_ARRIVED', 'UPDATE_DELIVERY_STATE', 'RESEND_CUSTOMER_NOTIFICATION', 'CANCEL_TASK', 'CANCEL_ASSIGNED_MISSION']);

/** ¿La petición viene de la app del repartidor? (decide el modo cuando hay sesión de admin y de repartidor a la vez) */
function fromDriverApp(request: Request) {
  if (request.headers.get('x-citiox-app') === 'driver') return true;
  try {
    const ref = request.headers.get('referer');
    return !!ref && new URL(ref).pathname.startsWith('/driver');
  } catch { return false; }
}

function deny(msg: string, status = 403) {
  return NextResponse.json({ success: false, error: msg }, { status });
}

function parseExtra(raw: any) {
  if (!raw) return {};
  if (typeof raw === 'string') { try { return JSON.parse(raw); } catch { return {}; } }
  return raw;
}

/** Código de 4 dígitos aleatorio (antes se derivaba del id del pedido y era predecible). */
function randomCode(): string {
  return String(randomInt(1000, 10000));
}

/** Garantiza que el pedido tenga sus dos códigos: retiro (cliente → repartidor) y entrega (cliente → repartidor). */
function ensureCodes(extra: any): { pickupCode: string; deliveryCode: string } {
  if (!extra.pickupCode) extra.pickupCode = randomCode();
  if (!extra.deliveryCode) extra.deliveryCode = randomCode();
  return { pickupCode: String(extra.pickupCode), deliveryCode: String(extra.deliveryCode) };
}

/**
 * El código de entrega lo tiene solo el cliente. En lavandería el de retiro también
 * (el cliente se lo da al repartidor); en restaurante el de retiro lo dice el repartidor en el local.
 */
function stripCodes<T extends Record<string, any>>(extra: T, isLaundry = true, keepDriverCode = false): T {
  const copy: any = { ...(extra || {}) };
  delete copy.deliveryCode;
  if (isLaundry) delete copy.pickupCode;
  if (!keepDriverCode) delete copy.driverCode;
  delete copy.pickupAttempts;
  delete copy.handoverAttempts;
  return copy;
}

const APP_URL = () => process.env.NEXT_PUBLIC_APP_URL || 'https://citiox.com';

function normalizePhone(phone: string): string {
  let clean = phone.replace(/\D/g, '');
  if (clean.startsWith('0') && clean.length === 10) {
    clean = '593' + clean.substring(1);
  } else if (clean.length === 9 && clean.startsWith('9')) {
    clean = '593' + clean;
  } else if (clean.startsWith('5930')) {
    clean = '593' + clean.substring(4);
  }
  return clean;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const { searchParams } = new URL(request.url);
  let driverId = searchParams.get('driverId');

  try {
    const auth = await loadAuth();
    let negocio: any = await prisma.negocio.findUnique({ where: { slug } });

    // Modo repartidor: solo puede consultar su propia ficha (y nunca la de otro driverId)
    const driverMode = !!auth.driver && (!!driverId || !auth.admin || fromDriverApp(request));
    if (driverMode) {
      const d = auth.driver!;
      if (driverId && !d.ownIds.includes(driverId)) return deny('Esta sesión no corresponde a ese repartidor.');
      driverId = driverId || d.session.driverId;
      if (!negocio) {
        const home = d.resources.find(isApprovedResource) || d.resources[0];
        negocio = home?.negocioId ? await prisma.negocio.findUnique({ where: { id: home.negocioId } }) : null;
      }
    } else if (auth.admin) {
      if (!negocio && auth.admin.negocioId) negocio = await prisma.negocio.findUnique({ where: { id: auth.admin.negocioId } });
      if (negocio && !auth.admin.superadmin && negocio.id !== auth.admin.negocioId) return deny('No autorizado para este negocio.');
      // Un administrador solo puede consultar repartidores de su propio negocio
      if (driverId) {
        const r = await (prisma as any).operableResource.findFirst({ where: { id: driverId }, select: { negocioId: true } });
        if (!r || (!auth.admin.superadmin && r.negocioId !== auth.admin.negocioId)) driverId = null;
      }
    } else {
      return deny('Inicia sesión para ver tus pedidos.', 401);
    }

    if (!negocio) {
      return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 });
    }

    let drivers: any[] = [];
    let tasks: any[] = [];
    try {
      const resolved = await BusinessRuntimeResolver.resolve(negocio);
      if (resolved?.kernel) {
        const deliveryEngine = resolved.kernel.getDeliveryEngine();
        if (deliveryEngine) {
          drivers = deliveryEngine.getDrivers() || [];
          tasks = deliveryEngine.getAllTasks(negocio.id) || [];
        }
      }
    } catch (err) {
      console.warn('[API Driver GET Kernel Resolver Warning]:', err);
    }

    // Si se pasa driverId, consultar la información del perfil del repartidor y su elegibilidad
    let driverProfileInfo: any = null;
    let isGlobalBlocked = false;
    let globalBlockReason: string | null = null;
    let driverApprovedBusinessIds: string[] = [];

    if (driverId) {
      const res = await (prisma as any).operableResource.findFirst({
        where: { id: driverId },
        include: { profile: true, negocio: true }
      });
      if (res) {
        isGlobalBlocked = res.profile?.activo === false || res.profile?.verificationStatus === 'SUSPENDED';
        globalBlockReason = isGlobalBlocked ? (res.profile?.motivoRechazo || 'Cuenta inhabilitada a nivel de plataforma por administración de Citiox') : null;

        driverProfileInfo = {
          driverId: res.id,
          driverName: res.name,
          driverPhone: res.profile?.telefono || '',
          vehicleType: res.profile?.tipoVehiculo || 'MOTO',
          vehicleName: res.profile?.vehiculo || 'Motocicleta',
          placa: res.profile?.placa || '',
          verificationStatus: res.profile?.verificationStatus || (res.active ? 'APPROVED' : 'SUSPENDED'),
          isGlobalBlocked,
          globalBlockReason
        };

        // Identificar los negocios donde este repartidor está legalmente registrado y aprobado
        const rawPhone = (res.profile?.telefono || '').replace(/\D/g, '');
        const last8 = rawPhone.length >= 8 ? rawPhone.slice(-8) : rawPhone;

        const linkedRaw = await (prisma as any).operableResource.findMany({
          where: {
            OR: [
              { id: driverId },
              ...(last8 ? [{ profile: { telefono: { contains: last8 } } }] : [])
            ]
          },
          include: { 
            profile: true,
            negocio: {
              select: { id: true, nombre: true, slug: true, logoUrl: true, direccion: true, tipoNegocio: true, branches: true, colorPrimario: true, whatsapp: true, ciudad: true }
            }
          }
        });
        // Misma persona = mismos últimos 9 dígitos; fichas eliminadas por el negocio no cuentan
        const myKey = phoneKey(res.profile?.telefono);
        const linkedResources = linkedRaw.filter((lr: any) =>
          (lr.id === driverId || (myKey && phoneKey(lr.profile?.telefono) === myKey)) && !(lr.metadata as any)?.removedAt
        );
        const myResourceIds: string[] = linkedResources.map((lr: any) => lr.id);

        // Bloqueo global = Citiox lo suspendió en TODOS sus negocios (una pausa de un negocio no cuenta)
        isGlobalBlocked = linkedResources.length > 0 && linkedResources.every((lr: any) => lr.profile?.verificationStatus === 'SUSPENDED');
        const blockedRec = linkedResources.find((lr: any) => lr.profile?.motivoRechazo);
        globalBlockReason = isGlobalBlocked ? (blockedRec?.profile?.motivoRechazo || 'Tu cuenta fue suspendida por Citiox. Escríbenos para revisarlo.') : null;
        const p0 = res.profile || {};
        driverProfileInfo = {
          ...driverProfileInfo,
          isGlobalBlocked,
          globalBlockReason,
          avatarUrl: normalizeDocUrl(p0.selfieUrl) || res.avatar || null,
          vehicleName: [p0.marca, p0.modelo, p0.color].filter(Boolean).join(' ') || p0.vehiculo || '',
          disponibleNuevosNegocios: !linkedResources.some((lr: any) => (lr.metadata as any)?.disponibleNuevosNegocios === false),
          documentosCompletos: Boolean(p0.cedulaFrenteUrl && p0.cedulaReversoUrl && p0.selfieUrl),
        };

        driverApprovedBusinessIds = linkedResources
          .filter((lr: any) => lr.active !== false && (lr.profile?.verificationStatus || 'APPROVED') === 'APPROVED' && lr.profile?.activo !== false)
          .map((lr: any) => lr.negocioId)
          .filter(Boolean);

        // Negocios reales asociados al repartidor
        const realNegociosAsociados = linkedResources
          .filter((lr: any) => lr.negocio)
          .map((lr: any) => ({
            id: lr.negocio.id,
            nombre: lr.negocio.nombre,
            slug: lr.negocio.slug,
            direccion: lr.negocio.direccion || '',
            ciudad: lr.negocio.ciudad || '',
            telefono: lr.negocio.whatsapp || lr.negocio.branches?.[0]?.telefono || '',
            logoUrl: lr.negocio.logoUrl,
            color: lr.negocio.colorPrimario || null,
            status: lr.profile?.verificationStatus || (lr.active ? 'APPROVED' : 'SUSPENDED'),
            isApproved: lr.active !== false && (lr.profile?.verificationStatus || 'APPROVED') === 'APPROVED' && lr.profile?.activo !== false,
            pausado: lr.active === false && (lr.profile?.verificationStatus || 'APPROVED') === 'APPROVED',
            activo: lr.active && lr.profile?.activo !== false,
            tipoNegocio: lr.negocio.tipoNegocio
          }));

        // Ganancias reales del repartidor, por TRAMO:
        //  · Restaurante: 1 tramo (entrega) cuando el pedido se entregó.
        //  · Lavandería: retiro y entrega se pagan por separado y pueden ser repartidores distintos.
        const LAUNDRY_AFTER_PICKUP = [
          'RECIBIDO', 'RETIRADO', 'INSPECCIONADO', 'EN_PROCESO', 'EN_LAVADO', 'EN_SECADO', 'EN_ACABADOS', 'LAVANDO', 'SECANDO', 'DETALLADO',
          'LISTO', 'LISTO_PARA_ENTREGA', 'ESPERANDO_REPARTIDOR_ENTREGA', 'REPARTIDOR_ASIGNADO', 'REPARTIDOR_EN_LOCAL',
          'ENTREGADO_A_REPARTIDOR', 'EN_RUTA_ENTREGA', 'ESPERANDO_CLIENTE', 'ENTREGADO', 'FINALIZADA', 'FINALIZADO'
        ];
        const realDeliveredOrders = await (prisma as any).pedido.findMany({
          where: {
            negocioId: { in: driverApprovedBusinessIds.length > 0 ? driverApprovedBusinessIds : ['NO_MATCH_BUSINESS_ID'] },
            estado: { in: LAUNDRY_AFTER_PICKUP }
          },
          include: {
            negocio: {
              select: { id: true, nombre: true, slug: true, logoUrl: true, colorPrimario: true, tipoNegocio: true }
            }
          },
          orderBy: { updatedAt: 'desc' },
          take: 400
        });

        const isMe = (id?: string | null, ph?: string | null) => {
          if (id && myResourceIds.includes(id)) return true;
          const p = String(ph || '').replace(/\D/g, '');
          return Boolean(rawPhone && p && p.length >= 8 && (p.endsWith(last8) || last8.endsWith(p.slice(-8))));
        };

        type Leg = { ord: any; tipo: 'RETIRO' | 'ENTREGA'; fee: number; tip: number; at: Date; pagado: boolean };
        const legs: Leg[] = [];
        for (const ord of realDeliveredOrders) {
          const extra = parseExtra(ord.extraInfo);
          const canonical = getCanonicalLogistics(ord);
          const laundry = canonical.tipoMision === 'ROUND_TRIP_SERVICE';
          const delivered = ['ENTREGADO', 'FINALIZADA', 'FINALIZADO'].includes(ord.estado);
          const tip = Number(extra.pricingBreakdown?.tip || extra.tip || 0);
          if (laundry) {
            const pd = canonical.pickupDriver;
            const pickupBy = extra.retiroCompletadoPor || {};
            if (pd && isMe(pd.driverId || pickupBy.driverId, pd.driverPhone)) {
              legs.push({
                ord, tipo: 'RETIRO', fee: Number(canonical.pickupFee || 0), tip: 0,
                at: new Date(pickupBy.completedAt || ord.updatedAt), pagado: pd.estadoCompensacion === 'PAID'
              });
            }
            const dd = canonical.deliveryDriver;
            if (delivered && dd && isMe(dd.driverId || extra.assignedDriverId, dd.driverPhone || extra.assignedDriverPhone)) {
              legs.push({
                ord, tipo: 'ENTREGA', fee: Number(canonical.deliveryFee || 0), tip,
                at: new Date(ord.updatedAt), pagado: dd.estadoCompensacion === 'PAID'
              });
            }
          } else if (delivered && isMe(extra.assignedDriverId || extra.repartidorId, extra.assignedDriverPhone)) {
            legs.push({
              ord, tipo: 'ENTREGA',
              fee: Number(extra.pricingBreakdown?.driverFee || extra.realDriverFee || ord.costoEnvio || 0),
              tip, at: new Date(ord.updatedAt || ord.createdAt),
              pagado: canonical.deliveryDriver?.estadoCompensacion === 'PAID'
            });
          }
        }
        legs.sort((x, y) => y.at.getTime() - x.at.getTime());

        let totalGanancias = 0;
        let totalPropinas = 0;
        let porCobrar = 0;
        const daysGroup: Record<string, { label: string; count: number; total: number }> = {};

        legs.forEach((leg) => {
          totalGanancias += leg.fee;
          totalPropinas += leg.tip;
          if (!leg.pagado) porCobrar += leg.fee;
          const dateKey = leg.at.toISOString().split('T')[0];
          if (!daysGroup[dateKey]) {
            const dayName = leg.at.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' });
            daysGroup[dateKey] = { label: dayName.charAt(0).toUpperCase() + dayName.slice(1), count: 0, total: 0 };
          }
          daysGroup[dateKey].count += 1;
          daysGroup[dateKey].total += leg.fee;
        });
        const myDeliveredOrders = legs;
        const recentDays = Object.values(daysGroup);

        driverProfileInfo = {
          ...driverProfileInfo,
          negociosAsociados: realNegociosAsociados,
          metricas: {
            totalGanado: Number(totalGanancias.toFixed(2)),
            totalEntregas: myDeliveredOrders.length,
            totalPropinas: Number(totalPropinas.toFixed(2)),
            porCobrarNegocios: Number(porCobrar.toFixed(2)),
            tasaCumplimiento: myDeliveredOrders.length > 0 ? 100 : 0,
            desgloseDias: recentDays
          },
          historialEntregas: legs.map((leg) => {
            const ord = leg.ord;
            return {
            id: `${ord.id}:${leg.tipo}`,
            numeroPedido: ord.numeroPedido,
            codigo: ord.codigo,
            tipoTramo: leg.tipo,
            pagadoPorNegocio: leg.pagado,
            cliente: ord.nombreCliente || 'Cliente',
            direccion: ord.direccionCliente || '',
            negocio: ord.negocio?.nombre || 'Negocio',
            negocioId: ord.negocioId,
            negocioLogo: ord.negocio?.logoUrl || null,
            negocioColor: ord.negocio?.colorPrimario || null,
            gananciaNum: leg.fee,
            propinaNum: leg.tip,
            fechaISO: leg.at.toISOString(),
            monto: `$${Number(ord.total || 0).toFixed(2)}`,
            ganancia: `+$${leg.fee.toFixed(2)}`,
            fecha: leg.at.toLocaleDateString('es-ES', {
              day: '2-digit',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit'
            })
            };
          })
        };
      }
    }

    // Filtro de aislamiento multi-negocio: un repartidor solo ve pedidos de los negocios donde está aprobado
    let businessWhereFilter: any = {};
    if (driverId) {
      businessWhereFilter = {
        negocioId: { in: driverApprovedBusinessIds.length > 0 ? driverApprovedBusinessIds : ['NO_MATCH_BUSINESS_ID'] }
      };
    } else if (negocio?.id) {
      businessWhereFilter = { negocioId: negocio.id };
    }

    // Obtener pedidos de delivery activos (si el repartidor no está bloqueado)
    const rawDeliveryOrders = isGlobalBlocked ? [] : await (prisma as any).pedido.findMany({
      where: {
        ...businessWhereFilter,
        tipoEntrega: { in: ['DELIVERY_ORDER', 'DOMICILIO', 'DELIVERY', 'RETIRO_SOLO', 'DESPACHO_SOLO'] },
        estado: { in: [
          // Estados de Restaurante
          'EN_PREPARACION', 'ACEPTADO', 'LISTO', 'REPARTIDOR_ASIGNADO', 'REPARTIDOR_EN_LOCAL', 'ENTREGADO_A_REPARTIDOR', 'EN_CAMINO', 'EN_RUTA', 'WAITING_CLIENT', 'ESPERANDO_CLIENTE',
          // Estados de Lavandería / Shoe-Care (Retiro / Recogida en cliente) - Solo órdenes ya aprobadas por el negocio
          'ESPERANDO_REPARTIDOR_RETIRO', 'ESPERANDO_ACEPTACION_REPARTIDOR', 'REPARTIDOR_EN_CAMINO', 'RECOGIDO',
          // Estados de Lavandería / Shoe-Care (Entrega al cliente)
          'ESPERANDO_REPARTIDOR_ENTREGA', 'LISTO_PARA_ENTREGA', 'EN_RUTA_ENTREGA'
        ] }
      },
      include: {
        items: true,
        payment: true,
        branch: true,
        negocio: {
          select: {
            id: true,
            nombre: true,
            slug: true,
            logoUrl: true,
            direccion: true,
            configuracion: true,
            tipoNegocio: true,
            colorPrimario: true,
            whatsapp: true,
            branches: true,
            Ubicacion: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Mapear y clasificar misiones (RETIRO vs ENTREGA) para vertical Lavandería
    const dbDeliveryOrders = rawDeliveryOrders
      .filter((ord: any) => {
        const extra = typeof ord.extraInfo === 'string' ? (() => { try { return JSON.parse(ord.extraInfo); } catch { return {}; } })() : (ord.extraInfo || {});
        const isLaundry = ord.negocio?.tipoNegocio === 'SHOE_CARE' || 
                          ord.negocio?.tipoNegocio === 'LAVANDERIA' || 
                          ord.negocio?.tipoNegocio === 'ORDENES-SERVICIO' || 
                          Boolean(extra.servicioNombre || extra.modoIngreso || extra.cantidadPares);
        
        // Si es lavandería, SOLO debe ser visible en bolsa de drivers si está en misión logística activa
        // Las órdenes en taller/producción (RECIBIDO, EN_PROCESO, LAVANDO, SECANDO, DETALLADO, LISTO) NO deben estar en el driver
        if (isLaundry) {
          const validLaundryStates = [
            // Retiro donde el cliente
            'ESPERANDO_REPARTIDOR_RETIRO', 'ESPERANDO_ACEPTACION_REPARTIDOR', 'REPARTIDOR_EN_CAMINO', 'RECOGIDO',
            // Entrega: buscando repartidor → va al local → el local le entrega → va al cliente
            'ESPERANDO_REPARTIDOR_ENTREGA', 'REPARTIDOR_ASIGNADO', 'REPARTIDOR_EN_LOCAL', 'ENTREGADO_A_REPARTIDOR',
            'EN_RUTA_ENTREGA', 'ESPERANDO_CLIENTE'
          ];
          return validLaundryStates.includes(ord.estado);
        }
        return true;
      })
      .map((ord: any) => {
        const extra = typeof ord.extraInfo === 'string' ? (() => { try { return JSON.parse(ord.extraInfo); } catch { return {}; } })() : (ord.extraInfo || {});
        const isLaundry = ord.negocio?.tipoNegocio === 'SHOE_CARE' || 
                          ord.negocio?.tipoNegocio === 'LAVANDERIA' || 
                          ord.negocio?.tipoNegocio === 'ORDENES-SERVICIO' || 
                          Boolean(extra.servicioNombre || extra.modoIngreso || extra.cantidadPares);
        
        let tipoMision: 'RETIRO' | 'ENTREGA' = 'ENTREGA';
        if (isLaundry) {
          if (['ESPERANDO_REPARTIDOR_RETIRO', 'ESPERANDO_ACEPTACION_REPARTIDOR', 'REPARTIDOR_EN_CAMINO', 'RECOGIDO'].includes(ord.estado)) {
            tipoMision = 'RETIRO';
          } else {
            tipoMision = 'ENTREGA';
          }
        }

        // SEGURIDAD: los códigos del cliente nunca llegan al repartidor; el código del repartidor
        // solo lo ve el repartidor asignado (lo muestra al cliente o al local)
        const ownIds: string[] = (auth.driver as any)?.ownIds || (driverId ? [driverId] : []);
        const isMine = Boolean(extra.assignedDriverId && ownIds.includes(extra.assignedDriverId));
        const safeExtra = stripCodes(extra, isLaundry, isMine);

        return {
          ...ord,
          isLaundry,
          tipoMision,
          extraInfo: {
            ...safeExtra,
            tipoMision,
            isLaundry
          }
        };
      });

    const driverTasks = driverId
      ? tasks.filter(t => t.driverId === driverId)
      : tasks;

    // El repartidor no ve la lista de otros repartidores; la cola solo si trabaja para ese negocio
    const canSeeQueue = !driverMode || auth.driver!.approvedBizIds.includes(negocio.id);
    return NextResponse.json({
      success: true,
      drivers: driverMode ? [] : drivers,
      tasks: driverTasks,
      driverProfile: driverProfileInfo,
      pendingQueue: canSeeQueue ? tasks.filter(t => t.state === 'WAITING_DISPATCH') : [],
      availableDbOrders: dbDeliveryOrders,
    });
  } catch (e: any) {
    console.error('[API Driver GET Error]:', e);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}

// Función auxiliar para buscar repartidor por teléfono y verificar su estado oficial
async function findVerifiedDriverByPhone(phoneInput: string) {
  if (!phoneInput) return null;
  const digitsOnly = phoneInput.replace(/\D/g, '');
  const last8or9 = digitsOnly.length >= 8 ? digitsOnly.slice(-8) : digitsOnly;

  // 1. Buscar en OperableResource + ResourceProfile
  const resources = await (prisma as any).operableResource.findMany({
    where: {
      OR: [
        { category: 'DELIVERY_DRIVER' },
        { resourceType: { in: ['HUMAN', 'VEHICLE'] } }
      ]
    },
    include: {
      profile: true,
      negocio: {
        select: { id: true, nombre: true, logoUrl: true }
      }
    }
  });

  const matchedResource = resources.find((r: any) => {
    const profPhone = (r.profile?.telefono || '').replace(/\D/g, '');
    return profPhone && (profPhone.endsWith(last8or9) || last8or9.endsWith(profPhone.slice(-8)));
  });

  if (matchedResource) {
    const allMatchingResources = resources.filter((r: any) => {
      const profPhone = (r.profile?.telefono || '').replace(/\D/g, '');
      return profPhone && (profPhone.endsWith(last8or9) || last8or9.endsWith(profPhone.slice(-8)));
    });

    const approvedResources = allMatchingResources.filter(
      (r: any) => (r.profile?.verificationStatus || 'APPROVED') === 'APPROVED' && r.active !== false
    );

    return {
      type: 'OPERABLE_RESOURCE',
      resource: matchedResource,
      approvedResources,
      isApproved: approvedResources.length > 0,
      status: matchedResource.profile?.verificationStatus || (matchedResource.active ? 'APPROVED' : 'INVITED'),
      driverId: matchedResource.id,
      driverName: matchedResource.name,
      driverPhone: matchedResource.profile?.telefono || phoneInput,
      vehicleType: matchedResource.profile?.tipoVehiculo || 'MOTO',
      vehicleName: matchedResource.profile?.vehiculo || 'Motocicleta',
      placa: matchedResource.profile?.placa || '',
      negociosAsignados: approvedResources.map((r: any) => ({
        id: r.negocioId,
        nombre: r.negocio?.nombre || 'Negocio',
        logoUrl: r.negocio?.logoUrl
      }))
    };
  }

  // 2. Buscar en Staff si no está en OperableResource
  const staffMembers = await (prisma as any).staff.findMany({
    where: {
      role: { in: ['REPARTIDOR', 'DRIVER', 'ENTREGA', 'DELIVERY'] }
    }
  });

  const matchedStaff = staffMembers.find((s: any) => {
    const sPhone = (s.phone || '').replace(/\D/g, '');
    return sPhone && (sPhone.endsWith(last8or9) || last8or9.endsWith(sPhone.slice(-8)));
  });

  if (matchedStaff) {
    return {
      type: 'STAFF',
      resource: matchedStaff,
      approvedResources: [matchedStaff],
      isApproved: matchedStaff.active !== false,
      status: matchedStaff.active ? 'APPROVED' : 'SUSPENDED',
      driverId: matchedStaff.id,
      driverName: matchedStaff.name,
      driverPhone: matchedStaff.phone || phoneInput,
      vehicleType: 'MOTO',
      vehicleName: 'Moto Oficial',
      placa: '',
      negociosAsignados: [{ id: matchedStaff.negocioId, nombre: 'Negocio Asignado' }]
    };
  }

  return null;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  try {
    const body = await request.json().catch(() => ({}));
    const action = body?.action;

    if (action === 'LOGOUT') {
      return clearDriverCookie(NextResponse.json({ success: true }));
    }

    let negocio: any = await prisma.negocio.findUnique({ where: { slug } });
    let mode: 'driver' | 'admin' | 'public' = 'public';
    let auth: Awaited<ReturnType<typeof loadAuth>> = { driver: null, admin: null };

    if (!PUBLIC_ACTIONS.has(action)) {
      auth = await loadAuth();
      if (ADMIN_ONLY_ACTIONS.has(action)) {
        if (!auth.admin) return deny('Solo el negocio puede registrar cobros y pagos.', auth.driver ? 403 : 401);
        mode = 'admin';
      } else if (auth.driver && (body.driverId || !auth.admin || fromDriverApp(request))) {
        mode = 'driver';
      } else if (auth.admin) {
        mode = 'admin';
      } else {
        return deny('Tu sesión expiró. Vuelve a ingresar con tu número.', 401);
      }

      if (mode === 'driver') {
        const d = auth.driver!;
        if (body.driverId && !d.ownIds.includes(body.driverId)) return deny('Esta sesión no corresponde a ese repartidor.');
        body.driverId = body.driverId || d.session.driverId;
      }

      // Alcance de la orden: el repartidor solo actúa en negocios donde está aprobado (y en sus
      // propias misiones); el administrador solo en pedidos de su negocio.
      const targetId = body.orderId || body.taskId;
      if (targetId) {
        const ord = await (prisma as any).pedido.findUnique({ where: { id: targetId }, select: { negocioId: true, extraInfo: true } });
        if (ord) {
          if (mode === 'driver') {
            const d = auth.driver!;
            if (!d.approvedBizIds.includes(ord.negocioId)) {
              return deny('Aún no estás aprobado como repartidor de este negocio.');
            }
            if (ASSIGNED_ONLY_ACTIONS.has(action)) {
              const ex = parseExtra(ord.extraInfo);
              const assigned = ex.assignedDriverId || ex.repartidorId;
              if (assigned && !d.ownIds.includes(assigned)) return deny('Esta misión está asignada a otro repartidor.');
            }
          } else if (!auth.admin!.superadmin && ord.negocioId !== auth.admin!.negocioId) {
            return deny('Este pedido no pertenece a tu negocio.');
          }
          // El motor de entregas debe ser el del negocio dueño del pedido (no el del slug de la URL)
          if (!negocio || negocio.id !== ord.negocioId) {
            negocio = await prisma.negocio.findUnique({ where: { id: ord.negocioId } });
          }
        }
      }

      if (!negocio) {
        if (mode === 'driver') {
          const d = auth.driver!;
          const home = d.resources.find(isApprovedResource) || d.resources[0];
          if (home?.negocioId) negocio = await prisma.negocio.findUnique({ where: { id: home.negocioId } });
        } else if (auth.admin?.negocioId) {
          negocio = await prisma.negocio.findUnique({ where: { id: auth.admin.negocioId } });
        }
      } else if (mode === 'admin' && !auth.admin!.superadmin && negocio.id !== auth.admin!.negocioId) {
        return deny('No autorizado para este negocio.');
      }
    } else if (!negocio && body?.phone) {
      // Inicio de sesión desde la app: el negocio es el del propio repartidor
      const found = await findVerifiedDriverByPhone(String(body.phone));
      const res: any = (found as any)?.approvedResources?.[0] || found?.resource;
      if (res?.negocioId) negocio = await prisma.negocio.findUnique({ where: { id: res.negocioId } });
    }

    if (!negocio) {
      if (action === 'REQUEST_OTP' || action === 'VERIFY_OTP') {
        return NextResponse.json({
          error: `El número ${body?.phone || ''} no está registrado como repartidor. Pide a tu negocio que te envíe una invitación.`
        }, { status: 404 });
      }
      return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 });
    }

    const { driverId, name, phone, vehicleType, status, taskId, orderId, nextState } = body;

    let deliveryEngine: any = null;
    try {
      const resolved = await BusinessRuntimeResolver.resolve(negocio);
      if (resolved?.kernel) {
        deliveryEngine = resolved.kernel.getDeliveryEngine();
      }
    } catch (err) {
      console.warn('[API Driver POST Kernel Resolver Warning]:', err);
    }

    // 0. Solicitud de código OTP para Inicio de Sesión
    if (action === 'REQUEST_OTP') {
      const { phone: rawPhone } = body;
      if (!rawPhone) {
        return NextResponse.json({ error: 'Teléfono requerido' }, { status: 400 });
      }

      const driverData = await findVerifiedDriverByPhone(rawPhone);

      // Si existe pero no está registrado ni invitado
      if (!driverData) {
        return NextResponse.json({
          error: `El número ${rawPhone} no está registrado como repartidor. Solicita a tu negocio que te envíe una invitación de registro.`
        }, { status: 404 });
      }

      // Si existe pero aún no ha sido invitado/registrado en ningún local
      if (driverData.status === 'INVITED' && !driverData.isApproved) {
        return NextResponse.json({
          error: 'Tu registro de repartidor está pendiente. Revisa el enlace de invitación enviado por tu negocio para completar tus documentos.'
        }, { status: 403 });
      }

      // Generar código OTP real de 4 dígitos
      const generatedOtp = Math.floor(1000 + Math.random() * 9000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // Válido 10 minutos

      // Guardar OTP en la base de datos
      try {
        await (prisma as any).otpCode.create({
          data: {
            id: uuidv4(),
            telefono: rawPhone,
            businessId: negocio.id,
            code: generatedOtp,
            expires_at: expiresAt
          }
        });
      } catch (dbErr) {
        console.warn('[OTP Driver DB Warning]:', dbErr);
      }

      // Enviar por el servicio oficial de WhatsApp
      console.log(`\n=========================================\n🔑 OTP DRIVER WHATSAPP [${slug}] para ${rawPhone}: ${generatedOtp}\n=========================================\n`);

      try {
        await notificationService.sendOTP(negocio.id, rawPhone, generatedOtp, negocio.nombre);
      } catch (waErr) {
        console.warn('[OTP Driver WA Provider Warning]:', waErr);
      }

      return NextResponse.json({
        success: true,
        message: 'Código de verificación enviado por WhatsApp.',
        phone: rawPhone,
        driverName: String(driverData.driverName || '').split(' ')[0]
      });
    }

    if (action === 'VERIFY_OTP') {
      const { phone: rawPhone, otp } = body;

      if (!otp || String(otp).length < 4) {
        return NextResponse.json({ error: 'Código OTP inválido (debe tener 4 dígitos)' }, { status: 400 });
      }

      const lockKey = phoneKey(rawPhone) || String(rawPhone || '');
      if (otpLocked(lockKey)) {
        return NextResponse.json({ error: 'Demasiados intentos. Espera 10 minutos y pide un código nuevo.' }, { status: 429 });
      }
      let usedOtpId: string | null = null;

      // Buscar si el código es válido en la base de datos o es 1234
      // El código maestro 1234 solo existe en desarrollo (en producción permitía entrar como cualquier repartidor)
      let isVerified = process.env.NODE_ENV !== 'production' && String(otp) === '1234';

      if (!isVerified) {
        try {
          const otpEntry = await (prisma as any).otpCode.findFirst({
            where: {
              telefono: rawPhone,
              code: String(otp),
              expires_at: { gte: new Date() }
            },
            orderBy: { created_at: 'desc' }
          });
          if (otpEntry) {
            isVerified = true;
            usedOtpId = otpEntry.id;
          }
        } catch (_) {}
      }

      if (!isVerified) {
        otpFail(lockKey);
        return NextResponse.json({ error: 'Código de verificación incorrecto o expirado. Revisa tu WhatsApp e intenta de nuevo.' }, { status: 400 });
      }
      otpReset(lockKey);
      // Un código solo sirve una vez
      if (usedOtpId) {
        try { await (prisma as any).otpCode.delete({ where: { id: usedOtpId } }); } catch (_) {}
      }

      const driverData = await findVerifiedDriverByPhone(rawPhone);

      if (!driverData) {
        return NextResponse.json({ error: 'Tu cuenta de repartidor no fue encontrada.' }, { status: 404 });
      }

      const isGlobalBlocked = driverData.status === 'BLOQUEADO' || driverData.resource?.profile?.activo === false;
      const sessionDriverId = (driverData as any).approvedResources?.[0]?.id || driverData.driverId;
      const sessionKey = phoneKey(driverData.driverPhone) || phoneKey(rawPhone);
      if (!sessionKey) {
        return NextResponse.json({ error: 'Número de teléfono inválido.' }, { status: 400 });
      }

      const verifyRes = NextResponse.json({
        success: true,
        session: {
          driverId: sessionDriverId,
          driverName: driverData.driverName,
          driverPhone: driverData.driverPhone,
          vehicleType: driverData.vehicleType,
          vehicleName: driverData.vehicleName,
          placa: driverData.placa,
          verificationStatus: driverData.status,
          negociosAsignados: driverData.negociosAsignados,
          isGlobalBlocked,
          globalBlockReason: isGlobalBlocked ? (driverData.resource?.profile?.motivoRechazo || 'Bloqueo global aplicado por administración central Citiox') : null
        }
      });
      // Sesión real: cookie httpOnly firmada (ya no basta con un driverId en localStorage)
      return setDriverCookie(verifyRes, { phoneKey: sessionKey, driverId: sessionDriverId });
    }

    // Visibilidad en la red Citiox: ¿otros negocios pueden encontrarlo y recomendarlo?
    if (action === 'SET_NETWORK_AVAILABILITY') {
      if (mode !== 'driver') return deny('Solo el repartidor puede cambiar esta preferencia.');
      const value = body.value !== false;
      for (const r of auth.driver!.resources) {
        const meta = (r.metadata && typeof r.metadata === 'object') ? r.metadata : {};
        await (prisma as any).operableResource.update({
          where: { id: r.id },
          data: { metadata: { ...meta, disponibleNuevosNegocios: value } },
        });
      }
      return NextResponse.json({ success: true, disponibleNuevosNegocios: value });
    }

    // 1. Registro / Actualización de repartidor
    if (action === 'REGISTER_OR_UPDATE_DRIVER') {
      if (!driverId || !name) {
        return NextResponse.json({ error: 'driverId y name son requeridos.' }, { status: 400 });
      }

      if (deliveryEngine) {
        deliveryEngine.registerDriver({
          driverId,
          name,
          phone: phone || '',
          vehicleType: vehicleType || 'MOTO',
          status: status || 'DISPONIBLE',
        });
      }

      return NextResponse.json({
        success: true,
        message: 'Repartidor actualizado.',
        driver: deliveryEngine ? deliveryEngine.getDriver(driverId) : { driverId, name, status: status || 'DISPONIBLE' },
      });
    }

    // 2. Cambio de estado de repartidor (DISPONIBLE, DESCANSO, DESCONECTADO)
    if (action === 'SET_STATUS') {
      if (!driverId || !status) {
        return NextResponse.json({ error: 'driverId y status son requeridos.' }, { status: 400 });
      }

      if (deliveryEngine) {
        deliveryEngine.setDriverStatus(driverId, status);
      }

      return NextResponse.json({
        success: true,
        message: `Estado actualizado a ${status}`,
        driver: deliveryEngine ? deliveryEngine.getDriver(driverId) : { driverId, status },
      });
    }

    // 3. Aceptar pedido por repartidor
    if (action === 'ACCEPT_TASK') {
      const targetId = orderId || taskId;
      if (!targetId || !driverId) {
        return NextResponse.json({ error: 'orderId/taskId y driverId son requeridos.' }, { status: 400 });
      }

      const currentOrder = await (prisma as any).pedido.findUnique({ 
        where: { id: targetId },
        include: { negocio: true }
      });

      if (!currentOrder) {
        return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 });
      }

      // Validar que el repartidor esté debidamente aprobado en el negocio de esta orden
      const driverRes = await (prisma as any).operableResource.findFirst({
        where: { id: driverId },
        include: { profile: true }
      });

      if (driverRes) {
        const dPhone = (driverRes.profile?.telefono || '').replace(/\D/g, '');
        const last8 = dPhone.length >= 8 ? dPhone.slice(-8) : dPhone;
        const authResource = await (prisma as any).operableResource.findFirst({
          where: {
            negocioId: currentOrder.negocioId,
            OR: [
              { id: driverId },
              ...(last8 ? [{ profile: { telefono: { contains: last8 } } }] : [])
            ],
            active: true
          },
          include: { profile: true }
        });

        const isApprovedForBiz = authResource && (authResource.profile?.verificationStatus || 'APPROVED') === 'APPROVED' && authResource.profile?.activo !== false;

        if (!isApprovedForBiz) {
          return NextResponse.json({ 
            error: 'No tienes autorización activa para repartir en este negocio. Solo puedes tomar pedidos de negocios donde estés aprobado.' 
          }, { status: 403 });
        }
      }

      let currentExtra: any = {};
      if (currentOrder?.extraInfo) {
        currentExtra = typeof currentOrder.extraInfo === 'string' ? JSON.parse(currentOrder.extraInfo) : currentOrder.extraInfo;
      }

      if (['PENDIENTE_RETIRO', 'SOLICITADA'].includes(currentOrder.estado)) {
        return NextResponse.json({ 
          error: 'Esta orden aún está pendiente de confirmación y aceptación por el negocio.' 
        }, { status: 400 });
      }

      const driverName = name || 'Repartidor Citiox';
      const isLaundry = currentOrder?.negocio?.tipoNegocio === 'SHOE_CARE' || 
                        currentOrder?.negocio?.tipoNegocio === 'LAVANDERIA' || 
                        currentOrder?.negocio?.tipoNegocio === 'ORDENES-SERVICIO' || 
                        Boolean(currentExtra.servicioNombre || currentExtra.modoIngreso || currentExtra.cantidadPares);

      let nuevoEstado = 'REPARTIDOR_ASIGNADO';
      let tipoMisionAsignacion = 'ENTREGA';

      if (isLaundry) {
        if (['ESPERANDO_REPARTIDOR_RETIRO', 'ESPERANDO_ACEPTACION_REPARTIDOR'].includes(currentOrder.estado)) {
          // El repartidor toma la misión de ir al cliente a retirar
          nuevoEstado = 'REPARTIDOR_EN_CAMINO';
          tipoMisionAsignacion = 'RETIRO';
        } else if (['ESPERANDO_REPARTIDOR_ENTREGA', 'LISTO', 'LISTO_PARA_ENTREGA'].includes(currentOrder.estado)) {
          // Entrega: el repartidor primero va al local a recoger las prendas listas
          nuevoEstado = 'REPARTIDOR_ASIGNADO';
          tipoMisionAsignacion = 'ENTREGA';
        } else {
          return NextResponse.json({ error: 'Este pedido ya no está disponible.' }, { status: 409 });
        }
        if (currentExtra.assignedDriverId && currentExtra.assignedDriverId !== driverId) {
          return NextResponse.json({ error: 'Otro repartidor ya tomó este pedido.' }, { status: 409 });
        }
      }

      // Códigos de seguridad (aleatorios, se guardan una sola vez por pedido)
      const { pickupCode, deliveryCode } = ensureCodes(currentExtra);
      // Código del repartidor para este viaje: quien le entrega los artículos lo ingresa
      // (el cliente en el retiro, el local en la entrega)
      if (isLaundry) {
        currentExtra.driverCode = String(randomInt(1000, 10000));
        currentExtra.driverCodeLeg = tipoMisionAsignacion;
        currentExtra.pickupAttempts = 0;
        currentExtra.handoverAttempts = 0;
        currentExtra.isHandedOver = tipoMisionAsignacion === 'ENTREGA' ? false : currentExtra.isHandedOver;
      }

      const assignedDriverPhone = phone || currentExtra.assignedDriverPhone || '0991234567';

      const updatedOrder = await (prisma as any).pedido.update({
        where: { id: targetId },
        data: {
          estado: nuevoEstado,
          extraInfo: {
            ...currentExtra,
            tipoMision: tipoMisionAsignacion,
            assignedDriverId: driverId,
            assignedDriverName: driverName,
            assignedDriver: driverName,
            assignedDriverPhone: assignedDriverPhone,
            driverAcceptedAt: new Date().toISOString(),
            pickupCode,
            deliveryCode,
            ...(isLaundry ? {
              driverCode: currentExtra.driverCode,
              driverCodeLeg: currentExtra.driverCodeLeg,
              pickupAttempts: 0,
              handoverAttempts: 0,
              isHandedOver: currentExtra.isHandedOver,
            } : {})
          }
        }
      });

      // Crear/actualizar asignación logística para vincular con panel admin
      try {
        const orderNegocioId = currentOrder.negocioId || negocio.id;
        let assignedResource = await (prisma as any).operableResource.findFirst({
          where: { id: driverId }
        });
        if (!assignedResource) {
          assignedResource = await (prisma as any).operableResource.findFirst({
            where: { negocioId: orderNegocioId, category: 'DELIVERY_DRIVER' }
          });
        }

        // Lavandería: un registro por tramo (retiro y entrega los pueden hacer repartidores distintos)
        const existingAsgn = await (prisma as any).deliveryAssignment.findFirst({
          where: { ordenReferenciaId: targetId, ...(isLaundry ? { tipo: tipoMisionAsignacion } : {}) }
        });

        if (existingAsgn) {
          await (prisma as any).deliveryAssignment.update({
            where: { id: existingAsgn.id },
            data: {
              resourceId: assignedResource?.id || driverId,
              tipo: tipoMisionAsignacion,
              estado: 'ACEPTADO'
            }
          });
        } else {
          await (prisma as any).deliveryAssignment.create({
            data: {
              negocioId: orderNegocioId,
              resourceId: assignedResource?.id || driverId,
              tipo: tipoMisionAsignacion,
              estado: 'ACEPTADO',
              ordenReferenciaId: targetId,
              ordenReferenciaTipo: isLaundry ? 'SERVICE_ORDER' : 'PEDIDO_ONLINE',
              clienteNombre: currentOrder?.nombreCliente,
              clienteTelefono: currentOrder?.telefonoCliente,
              clienteDireccion: currentOrder?.direccionCliente
            }
          });
        }
      } catch (asgnErr) {
        console.warn('[DRIVER_ACCEPT_ASGN_WARN]', asgnErr);
      }

      // ── ENVIAR NOTIFICACIÓN WHATSAPP AUTOMÁTICA AL CLIENTE AL ACEPTAR EL REPARTIDOR ──
      try {
        if (currentOrder.telefonoCliente) {
          const cleanPhone = normalizePhone(currentOrder.telefonoCliente);
          const bizName = currentOrder.negocio?.nombre || negocio?.nombre || 'Citiox';
          const trackingUrl = `https://citiox.com/${currentOrder.negocio?.slug || negocio?.slug || 'lavado'}/pedidos`;
          const driverPhoneDisplay = phone || assignedDriverPhone || '';

          if (tipoMisionAsignacion === 'RETIRO') {
            const fechaRetiroStr = currentExtra.fechaHoraRetiro || currentExtra.fechaRetiro || 'Inmediato / En camino (30-45 min)';
            const w = wordsFor(currentOrder.negocio);
            const privateLink = `${APP_URL()}/${currentOrder.negocio?.slug || negocio?.slug}/pedidos/${currentOrder.id}`;
            const msgRetiro = [
              `🛵 *Tu repartidor va a retirar ${w.tusCosas}*`,
              ``,
              `Orden *#${currentOrder.numeroPedido}* en *${bizName}*`,
              `👤 *Repartidor:* ${driverName}`,
              driverPhoneDisplay ? `📱 *Teléfono:* ${driverPhoneDisplay}` : '',
              `⏰ *Retiro:* ${fechaRetiroStr}`,
              ``,
              `🔐 Al llegar, el repartidor te mostrará un código. *Ingrésalo aquí* para entregarle ${w.tusCosas}:`,
              privateLink,
            ].filter(Boolean).join('\n');

            sendWhatsAppMessage(cleanPhone, msgRetiro, 'driver_accept_pickup').catch(e => console.error('[WA_ACCEPT_RETIRO_ERR]', e));
          } else {
            const msgEntrega = [
              `🛵 *¡TU PEDIDO YA TIENE REPARTIDOR ASIGNADO!* 📦`,
              ``,
              `Hola *${currentOrder.nombreCliente || 'Cliente'}*, tu orden *#${currentOrder.numeroPedido}* en *${bizName}* fue tomada por nuestro repartidor:`,
              ``,
              `👤 *Repartidor:* ${driverName}`,
              driverPhoneDisplay ? `📱 *Teléfono:* ${driverPhoneDisplay}` : '',
              ``,
              `🔐 *TU CÓDIGO PIN DE ENTREGA:* *${deliveryCode}*`,
              ``,
              `👉 Ten a mano este código (*${deliveryCode}*) para dictárselo al repartidor al momento de recibir tu entrega.`,
              ``,
              `📍 Sigue tu pedido en vivo aquí:`,
              `${trackingUrl}`
            ].filter(Boolean).join('\n');

            sendWhatsAppMessage(cleanPhone, msgEntrega, 'driver_accept_delivery').catch(e => console.error('[WA_ACCEPT_ENTREGA_ERR]', e));
          }
        }
      } catch (waErr) {
        console.warn('[DRIVER_ACCEPT_WA_WARN]', waErr);
      }

      return NextResponse.json({ success: true, order: { ...updatedOrder, extraInfo: stripCodes(parseExtra(updatedOrder.extraInfo), isLaundry, true) } });
    }

    // 3.B. Cancelar pedido por repartidor antes de retirar el producto
    if (action === 'CANCEL_TASK' || action === 'CANCEL_ASSIGNED_MISSION') {
      const targetId = orderId || taskId;
      if (!targetId || !driverId) {
        return NextResponse.json({ error: 'orderId y driverId son requeridos.' }, { status: 400 });
      }

      const currentOrder = await (prisma as any).pedido.findUnique({
        where: { id: targetId },
        include: { negocio: true }
      });

      if (!currentOrder) {
        return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 });
      }

      let currentExtra: any = {};
      if (currentOrder.extraInfo) {
        currentExtra = typeof currentOrder.extraInfo === 'string' ? JSON.parse(currentOrder.extraInfo) : currentOrder.extraInfo;
      }

      // Validar si el repartidor solicitante es quien tiene la orden asignada
      const assignedId = currentExtra.assignedDriverId || currentExtra.repartidorId;
      if (assignedId && assignedId !== driverId) {
        return NextResponse.json({ error: 'No tienes esta orden asignada a tu perfil.' }, { status: 403 });
      }

      // ── REGLA CANÓNICA DE CANCELACIÓN ──
      // Solo puede cancelar si aún NO ha retirado el producto/prendas.
      const nonCancellableStates = [
        'RECOGIDO', 'RECIBIDO', 'EN_PROCESO', 'LISTO_PARA_ENTREGA', 
        'ENTREGADO', 'ENTREGADO_A_REPARTIDOR'
      ];

      if (nonCancellableStates.includes(currentOrder.estado)) {
        return NextResponse.json({
          error: 'No es posible cancelar esta misión porque ya has retirado las prendas/productos del cliente. Por favor haz la entrega en el taller o comunícate con recepción.'
        }, { status: 400 });
      }

      const isLaundry = currentOrder?.negocio?.tipoNegocio === 'SHOE_CARE' || 
                        currentOrder?.negocio?.tipoNegocio === 'LAVANDERIA' || 
                        currentOrder?.negocio?.tipoNegocio === 'ORDENES-SERVICIO' || 
                        Boolean(currentExtra.servicioNombre || currentExtra.modoIngreso || currentExtra.cantidadPares);

      const isRetiro = currentExtra.tipoMision === 'RETIRO' || ['REPARTIDOR_EN_CAMINO', 'ESPERANDO_REPARTIDOR_RETIRO', 'PENDIENTE_RETIRO'].includes(currentOrder.estado);

      // Determinar a qué estado regresa la orden para que vuelva a estar disponible en la bolsa
      let estadoRegreso = 'ESPERANDO_REPARTIDOR_RETIRO';
      if (isLaundry) {
        estadoRegreso = isRetiro ? 'ESPERANDO_REPARTIDOR_RETIRO' : 'ESPERANDO_REPARTIDOR_ENTREGA';
      } else {
        estadoRegreso = 'LISTO';
      }

      const reasonCode = body.reasonCode || 'OTHER';
      const reasonLabel = body.reasonLabel || body.reason || 'Cancelado por repartidor';
      const reasonNotes = body.notes || body.reasonDetails || '';

      const cancellationRecord = {
        driverId,
        driverName: currentExtra.assignedDriverName || currentExtra.assignedDriver || name || 'Repartidor',
        driverPhone: phone || currentExtra.assignedDriverPhone || '',
        cancelledAt: new Date().toISOString(),
        missionType: isRetiro ? 'RETIRO' : 'ENTREGA',
        previousState: currentOrder.estado,
        reasonCode,
        reasonLabel,
        notes: reasonNotes
      };

      const cancellationHistory = Array.isArray(currentExtra.cancellations) 
        ? [...currentExtra.cancellations, cancellationRecord] 
        : [cancellationRecord];

      // Liberar al repartidor de la orden
      const updatedExtra = {
        ...currentExtra,
        assignedDriverId: null,
        assignedDriverName: null,
        assignedDriver: null,
        assignedDriverPhone: null,
        driverAcceptedAt: null,
        lastCancellation: cancellationRecord,
        cancellations: cancellationHistory
      };

      const updatedOrder = await (prisma as any).pedido.update({
        where: { id: targetId },
        data: {
          estado: estadoRegreso,
          extraInfo: updatedExtra
        }
      });

      // Actualizar asignación logística
      try {
        await (prisma as any).deliveryAssignment.updateMany({
          where: { ordenReferenciaId: targetId },
          data: {
            estado: 'CANCELADO'
          }
        });
      } catch (asgnErr) {
        console.warn('[CANCEL_ASGN_WARN]', asgnErr);
      }

      // Notificar al cliente según el motivo de la cancelación si aplica
      try {
        if (currentOrder.telefonoCliente) {
          const cleanPhone = normalizePhone(currentOrder.telefonoCliente);
          const bizName = currentOrder.negocio?.nombre || negocio?.nombre || 'Citiox';
          let clientNotice = '';

          if (reasonCode === 'CLIENT_NO_ANSWER') {
            clientNotice = [
              `⚠️ *NOVEDAD CON TU SERVICIO - ${bizName.toUpperCase()}* 📍`,
              ``,
              `Hola *${currentOrder.nombreCliente || 'Cliente'}*, nuestro repartidor estuvo en tu dirección para la orden *#${currentOrder.numeroPedido}*, pero no fue posible contactarte por llamada ni WhatsApp.`,
              ``,
              `📞 Por favor responde a este mensaje para coordinar un nuevo horario de retiro.`
            ].join('\n');
          } else if (reasonCode === 'WRONG_ADDRESS') {
            clientNotice = [
              `📍 *NOVEDAD CON TU DIRECCIÓN - ${bizName.toUpperCase()}* 🧭`,
              ``,
              `Hola *${currentOrder.nombreCliente || 'Cliente'}*, nuestro repartidor tuvo dificultades para ubicar tu dirección para la orden *#${currentOrder.numeroPedido}*.`,
              ``,
              `🗺️ Por favor confírmanos tu ubicación exacta o referencias respondiendo a este mensaje para reprogramar la recogida.`
            ].join('\n');
          }

          if (clientNotice) {
            sendWhatsAppMessage(cleanPhone, clientNotice, 'driver_cancellation_notice').catch(e => console.error('[WA_CANCEL_NOTICE_ERR]', e));
          }
        }
      } catch (waErr) {}

      // Emitir evento en tiempo real para el panel de administración
      try {
        const { sseEmitter } = require('@/lib/notifications/notificationService');
        sseEmitter.emit('realtime_event', {
          negocioId: currentOrder.negocioId || negocio.id,
          type: 'ORDEN_CANCELADA_POR_REPARTIDOR',
          pedidoId: targetId,
          estado: estadoRegreso,
          reasonLabel
        });
      } catch (sseErr) {}

      return NextResponse.json({
        success: true,
        message: 'Misión cancelada y liberada para reasignación.',
        order: updatedOrder
      });
    }

    // 4. Marcar Llegada al Restaurante o al Taller por repartidor
    // ── ACCIONES CANÓNICAS DE RECAUDACIÓN Y COMPENSACIÓN ──
    if (action === 'SETTLE_DRIVER_COLLECTION') {
      const targetId = orderId || taskId;
      if (!targetId) return NextResponse.json({ error: 'orderId es requerido' }, { status: 400 });
      const order = await (prisma as any).pedido.findUnique({ where: { id: targetId } });
      if (!order) return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 });
      const extra = (order.extraInfo && typeof order.extraInfo === 'object') ? order.extraInfo : JSON.parse(order.extraInfo || '{}');
      const canonical = getCanonicalLogistics(order);
      canonical.recaudacion.estado = 'LIQUIDATED';
      canonical.recaudacion.liquidadoAt = new Date().toISOString();
      canonical.recaudacion.liquidadoPor = body.liquidatedBy || 'Administración';
      extra.canonicalLogistics = canonical;
      await (prisma as any).pedido.update({
        where: { id: targetId },
        data: { extraInfo: extra }
      });
      return NextResponse.json({ success: true, message: 'Recaudación liquidada en caja exitosamente.', canonicalLogistics: canonical });
    }

    if (action === 'PAY_DRIVER_COMPENSATION') {
      const targetId = orderId || taskId;
      const missionType = body.missionType || 'ENTREGA'; // 'RECOGIDA' | 'ENTREGA'
      if (!targetId) return NextResponse.json({ error: 'orderId es requerido' }, { status: 400 });
      const order = await (prisma as any).pedido.findUnique({ where: { id: targetId } });
      if (!order) return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 });
      const extra = (order.extraInfo && typeof order.extraInfo === 'object') ? order.extraInfo : JSON.parse(order.extraInfo || '{}');
      const canonical = getCanonicalLogistics(order);
      if (missionType === 'RECOGIDA' && canonical.pickupDriver) {
        canonical.pickupDriver.estadoCompensacion = 'PAID';
        canonical.pickupDriver.pagadoAt = new Date().toISOString();
        canonical.pickupDriver.pagadoPor = body.paidBy || 'Administración';
      } else if (canonical.deliveryDriver) {
        canonical.deliveryDriver.estadoCompensacion = 'PAID';
        canonical.deliveryDriver.pagadoAt = new Date().toISOString();
        canonical.deliveryDriver.pagadoPor = body.paidBy || 'Administración';
      }
      extra.canonicalLogistics = canonical;
      await (prisma as any).pedido.update({
        where: { id: targetId },
        data: { extraInfo: extra }
      });
      return NextResponse.json({ success: true, message: 'Compensación de repartidor pagada exitosamente.', canonicalLogistics: canonical });
    }

    if (action === 'SETTLE_NET_COLLECTION') {
      const targetId = orderId || taskId;
      if (!targetId) return NextResponse.json({ error: 'orderId es requerido' }, { status: 400 });
      const order = await (prisma as any).pedido.findUnique({ where: { id: targetId } });
      if (!order) return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 });
      const extra = (order.extraInfo && typeof order.extraInfo === 'object') ? order.extraInfo : JSON.parse(order.extraInfo || '{}');
      const canonical = getCanonicalLogistics(order);
      canonical.recaudacion.estado = 'LIQUIDATED';
      canonical.recaudacion.liquidadoAt = new Date().toISOString();
      canonical.recaudacion.liquidadoPor = body.liquidatedBy || 'Administración';
      if (canonical.deliveryDriver) {
        canonical.deliveryDriver.estadoCompensacion = 'PAID';
        canonical.deliveryDriver.pagadoAt = new Date().toISOString();
        canonical.deliveryDriver.pagadoPor = body.liquidatedBy || 'Administración';
      }
      extra.canonicalLogistics = canonical;
      await (prisma as any).pedido.update({
        where: { id: targetId },
        data: { extraInfo: extra }
      });
      return NextResponse.json({ success: true, message: 'Liquidación neta completada.', canonicalLogistics: canonical });
    }

    if (action === 'MARK_ARRIVED') {
      const targetId = orderId || taskId;
      if (!targetId) {
        return NextResponse.json({ error: 'orderId/taskId es requerido.' }, { status: 400 });
      }

      const currentOrder = await (prisma as any).pedido.findUnique({ where: { id: targetId } });
      let currentExtra = {};
      if (currentOrder?.extraInfo) {
        currentExtra = typeof currentOrder.extraInfo === 'string' ? JSON.parse(currentOrder.extraInfo) : currentOrder.extraInfo;
      }

      const driverName = name || (currentExtra as any)?.assignedDriver || 'Marco Proaño';

      const updatedOrder = await (prisma as any).pedido.update({
        where: { id: targetId },
        data: {
          estado: 'REPARTIDOR_EN_LOCAL',
          extraInfo: {
            ...currentExtra,
            assignedDriverName: driverName,
            assignedDriver: driverName,
            driverArrivedAt: new Date().toISOString()
          }
        }
      });

      return NextResponse.json({ success: true, order: updatedOrder });
    }

    // 5. Actualizar estado de entrega (ON_ROUTE -> EN_CAMINO, WAITING_CLIENT -> ESPERANDO_CLIENTE, DELIVERED -> ENTREGADO)
    if (action === 'UPDATE_DELIVERY_STATE') {
      const targetId = orderId || taskId;
      if (!targetId || !nextState) {
        return NextResponse.json({ error: 'orderId/taskId y nextState son requeridos.' }, { status: 400 });
      }

      const currentOrder = await (prisma as any).pedido.findUnique({ 
        where: { id: targetId },
        include: { negocio: true }
      });
      let currentExtra: any = {};
      if (currentOrder?.extraInfo) {
        currentExtra = typeof currentOrder.extraInfo === 'string' ? JSON.parse(currentOrder.extraInfo) : currentOrder.extraInfo;
      }

      const isLaundry = currentOrder?.negocio?.tipoNegocio === 'SHOE_CARE' || 
                        currentOrder?.negocio?.tipoNegocio === 'LAVANDERIA' || 
                        currentOrder?.negocio?.tipoNegocio === 'ORDENES-SERVICIO' || 
                        Boolean(currentExtra.servicioNombre || currentExtra.modoIngreso || currentExtra.cantidadPares);

      let dbState = nextState;

      if (isLaundry) {
        const isRetiro = currentExtra.tipoMision === 'RETIRO' || ['REPARTIDOR_EN_CAMINO', 'ESPERANDO_REPARTIDOR_RETIRO', 'PENDIENTE_RETIRO', 'RECOGIDO'].includes(currentOrder?.estado);
        
        if (isRetiro) {
          if (nextState === 'PICKED_UP' || nextState === 'RECOGIDO') {
            // El retiro lo confirma QUIEN ENTREGA: el cliente ingresa el código del repartidor en su teléfono
            return NextResponse.json({
              error: 'El cliente confirma el retiro ingresando tu código en su teléfono. Muéstrale tu código.'
            }, { status: 400 });
            dbState = 'RECOGIDO'; // Repartidor retiró calzado/ropa en casa del cliente
          } else if (nextState === 'DELIVERED_TO_WORKSHOP' || nextState === 'DELIVERED' || nextState === 'RECIBIDO') {
            dbState = 'RECIBIDO'; // Entregado en taller -> entra formalmente a producción
            // El repartidor de retiro completó su labor. Desvincular de la orden para que no figure en entrega futura.
            currentExtra.retiroCompletadoPor = {
              driverId: currentExtra.assignedDriverId || currentExtra.repartidorId,
              driverName: currentExtra.assignedDriverName || currentExtra.assignedDriver || 'Repartidor',
              completedAt: new Date().toISOString()
            };
            currentExtra.assignedDriverId = null;
            currentExtra.assignedDriverName = null;
            currentExtra.assignedDriver = null;
            currentExtra.assignedDriverPhone = null;
            currentExtra.repartidorId = null;
            currentExtra.driverAcceptedAt = null;
          } else if (nextState === 'ON_ROUTE') {
            dbState = 'REPARTIDOR_EN_CAMINO';
          }
        } else {
          // Es Entrega Final: primero el local le entrega las prendas al repartidor
          if (nextState === 'ON_ROUTE' || nextState === 'EN_RUTA') {
            const handedOver = currentOrder?.estado === 'ENTREGADO_A_REPARTIDOR' || Boolean(currentExtra.isHandedOver);
            if (!handedOver) {
              return NextResponse.json({
                error: 'Espera a que el local te entregue las prendas y lo confirme en su panel.'
              }, { status: 400 });
            }
            dbState = 'EN_RUTA_ENTREGA';
          } else if (nextState === 'WAITING_CLIENT') {
            dbState = 'ESPERANDO_CLIENTE';
          } else if (nextState === 'DELIVERED') {
            dbState = 'ENTREGADO';
          }
        }
      } else {
        // Restaurante Estándar
        const dbStatusMap: Record<string, string> = {
          'ON_ROUTE': 'EN_CAMINO',
          'EN_RUTA': 'EN_CAMINO',
          'WAITING_CLIENT': 'ESPERANDO_CLIENTE',
          'ESPERANDO_CLIENTE': 'ESPERANDO_CLIENTE',
          'DELIVERED': 'ENTREGADO',
          'ENTREGADO': 'ENTREGADO',
          'PICKED_UP': 'ENTREGADO_A_REPARTIDOR'
        };
        dbState = dbStatusMap[nextState] || nextState;

        // El repartidor no puede pasar a EN_CAMINO / EN_RUTA hasta que el restaurante entregue la comanda
        if (nextState === 'ON_ROUTE' || nextState === 'EN_RUTA' || nextState === 'EN_CAMINO') {
          const isHandedOver = currentOrder?.estado === 'ENTREGADO_A_REPARTIDOR' || 
            currentOrder?.estado === 'EN_CAMINO' || 
            currentOrder?.estado === 'EN_RUTA' || 
            Boolean(currentExtra.isHandedOver || currentExtra.dispatchStatus === 'DESPACHADO');

          if (!isHandedOver) {
            return NextResponse.json({ 
              error: 'Debes esperar a que el restaurante entregue la comanda y confirme el despacho.' 
            }, { status: 400 });
          }
        }
      }

      const { pickupCode, deliveryCode } = ensureCodes(currentExtra);

      // SEGURIDAD: Si se va a finalizar la entrega, validar el PIN ingresado por el chofer
      if (dbState === 'ENTREGADO') {
        const receivedPin = String(body?.pin || body?.deliveryPin || body?.code || '').trim();
        if (!receivedPin || receivedPin !== String(deliveryCode).trim()) {
          return NextResponse.json({ 
            error: 'El código PIN de seguridad es incorrecto. Pide al cliente el código de 4 dígitos que ve en su pantalla o WhatsApp.' 
          }, { status: 400 });
        }
      }

      // Actualizar estado canónico de logística
      const canonical = getCanonicalLogistics(currentOrder, driverId);
      if (dbState === 'ENTREGADO') {
        if (canonical.recaudacion.requerida) {
          canonical.recaudacion.estado = 'COLLECTED';
          canonical.recaudacion.montoRecaudado = Number(currentOrder?.total || 0);
          canonical.recaudacion.recaudadoAt = new Date().toISOString();
        }
        if (!canonical.deliveryDriver) {
          canonical.deliveryDriver = {
            driverId: driverId || null,
            driverName: currentExtra.assignedDriverName || currentExtra.assignedDriver || 'Repartidor',
            driverPhone: currentExtra.assignedDriverPhone || null,
            misionTipo: 'ENTREGA',
            compensacion: canonical.deliveryFee,
            estadoCompensacion: 'PENDING'
          };
        } else {
          canonical.deliveryDriver.driverId = driverId || canonical.deliveryDriver.driverId;
        }
      } else if (dbState === 'RECIBIDO' && isLaundry) {
        if (!canonical.pickupDriver) {
          canonical.pickupDriver = {
            driverId: driverId || null,
            driverName: currentExtra.assignedDriverName || currentExtra.assignedDriver || 'Repartidor',
            misionTipo: 'RECOGIDA',
            compensacion: canonical.pickupFee,
            estadoCompensacion: 'PENDING'
          };
        } else {
          canonical.pickupDriver.driverId = driverId || canonical.pickupDriver.driverId;
        }
      }
      currentExtra.canonicalLogistics = canonical;

      const updatedOrder = await (prisma as any).pedido.update({
        where: { id: targetId },
        data: {
          estado: dbState,
          extraInfo: {
            ...currentExtra,
            stateUpdatedAt: new Date().toISOString()
          }
        }
      });

      if (dbState === 'ENTREGADO' || dbState === 'RECIBIDO') {
        try {
          // Lavandería: se cierra solo el tramo que terminó (retiro al llegar al local, entrega al cliente)
          await (prisma as any).deliveryAssignment.updateMany({
            where: {
              ordenReferenciaId: targetId,
              ...(isLaundry ? { tipo: dbState === 'RECIBIDO' ? 'RETIRO' : 'ENTREGA' } : {})
            },
            data: { estado: 'COMPLETADO' }
          });
        } catch (asgnErr) {}
      }

      // Enviar notificaciones automáticas de WhatsApp al Cliente según el nuevo estado
      try {
        const clienteTel = currentOrder?.telefonoCliente;
        const clienteNom = currentOrder?.nombreCliente || 'Cliente';
        const numPed = currentOrder?.numeroPedido || '';
        const bizName = currentOrder?.negocio?.nombre || negocio?.nombre || 'Citiox';
        const trackingUrl = `https://citiox.com/${negocio?.slug || 'lavado'}/pedidos`;

        if (clienteTel) {
          const cleanPhone = normalizePhone(clienteTel);

          // 1. Repartidor llegó afuera de la dirección (ESPERANDO_CLIENTE)
          if (dbState === 'ESPERANDO_CLIENTE') {
            const msgLlegada = [
              `🛵 *¡TU REPARTIDOR HA LLEGADO!* 📍`,
              ``,
              `Hola *${clienteNom}*, tu repartidor ya se encuentra afuera de tu dirección con tu orden *#${numPed}*.`,
              ``,
              `🔐 *TU CÓDIGO PIN DE ENTREGA:* *${deliveryCode}*`,
              ``,
              `👉 Por favor acércate a recibir tu pedido y *dicta este código de 4 dígitos* al repartidor para finalizar la entrega.`,
              ``,
              `¡Gracias por confiar en *${bizName}*! ✨`
            ].join('\n');
            sendWhatsAppMessage(cleanPhone, msgLlegada, 'delivery_llegada').catch(e => console.error('[WA_LLEGADA_ERR]', e));
          }

          // 2. Repartidor salió en ruta hacia la dirección del cliente (EN_RUTA_ENTREGA / EN_CAMINO)
          else if (dbState === 'EN_RUTA_ENTREGA' || dbState === 'EN_CAMINO') {
            const msgEnCamino = [
              `🛵 *¡TU PEDIDO VA EN CAMINO!* 🚀`,
              ``,
              `Hola *${clienteNom}*, tu repartidor ya ha salido hacia tu dirección con tu orden *#${numPed}*.`,
              ``,
              `🔐 *Tu código PIN de seguridad:* *${deliveryCode}*`,
              `_(Ten listo este código de 4 dígitos para dictarlo al repartidor cuando llegue a tu puerta)_`,
              ``,
              `📍 Sigue tu pedido en vivo aquí:`,
              `${trackingUrl}`
            ].join('\n');
            sendWhatsAppMessage(cleanPhone, msgEnCamino, 'delivery_en_camino').catch(e => console.error('[WA_EN_CAMINO_ERR]', e));
          }

          // 3. Repartidor en camino a retirar prendas en cliente (REPARTIDOR_EN_CAMINO)
          else if (dbState === 'REPARTIDOR_EN_CAMINO') {
            const pCode = currentExtra?.pickupCode || pickupCode;
            const w = wordsFor(currentOrder?.negocio);
            const privateLink = `${APP_URL()}/${currentOrder?.negocio?.slug || negocio?.slug}/pedidos/${currentOrder?.id}`;
            const msgRetiro = [
              `🛵 *El repartidor va a retirar ${w.tusCosas}* (orden #${numPed})`,
              ``,
              `Al llegar te mostrará un código. *Ingrésalo aquí* para entregarle ${w.tusCosas}:`,
              privateLink
            ].join('\n');
            sendWhatsAppMessage(cleanPhone, msgRetiro, 'delivery_retiro').catch(e => console.error('[WA_RETIRO_ERR]', e));
          }

          // 4. Entrega completada (ENTREGADO)
          else if (dbState === 'ENTREGADO') {
            const msgEntregado = [
              `✅ *¡ORDEN ENTREGADA CON ÉXITO!* 🎉`,
              ``,
              `Hola *${clienteNom}*, tu orden *#${numPed}* ha sido entregada exitosamente.`,
              ``,
              `¡Muchas gracias por preferir a *${bizName}*! ✨ Esperamos que disfrutes de tu servicio.`
            ].join('\n');
            sendWhatsAppMessage(cleanPhone, msgEntregado, 'delivery_entregado').catch(e => console.error('[WA_ENTREGADO_ERR]', e));
          }
        }
      } catch (waErr) {
        console.warn('[DRIVER_WHATSAPP_NOTIF_WARN]', waErr);
      }

      // Emitir evento en tiempo real para actualización instantánea en el cliente y admin
      try {
        const { sseEmitter } = require('@/lib/notifications/notificationService');
        sseEmitter.emit('realtime_event', {
          negocioId: negocio.id,
          type: 'ESTADO_CAMBIADO',
          pedidoId: targetId,
          estado: dbState
        });
      } catch (sseErr) {}

      // Sanitizar extraInfo: los códigos son solo del cliente
      const safeExtra = stripCodes({ ...currentExtra, stateUpdatedAt: new Date().toISOString() }, isLaundry, true);
      const safeUpdatedOrder = {
        ...updatedOrder,
        extraInfo: safeExtra
      };

      return NextResponse.json({ success: true, order: safeUpdatedOrder });
    }

    // 6. Reenviar Notificación / PIN por WhatsApp al Cliente bajo demanda del repartidor
    if (action === 'RESEND_CUSTOMER_NOTIFICATION') {
      const targetId = orderId || taskId;
      if (!targetId) {
        return NextResponse.json({ error: 'orderId es requerido.' }, { status: 400 });
      }

      const ord = await (prisma as any).pedido.findUnique({
        where: { id: targetId },
        include: { negocio: true }
      });

      if (!ord || !ord.telefonoCliente) {
        return NextResponse.json({ error: 'Pedido sin teléfono de cliente registrado.' }, { status: 400 });
      }

      const extra = typeof ord.extraInfo === 'string' ? JSON.parse(ord.extraInfo) : (ord.extraInfo || {});
      const cleanPhone = normalizePhone(ord.telefonoCliente);
      const bizName = ord.negocio?.nombre || negocio?.nombre || 'Citiox';

      const isLaundry = ord.negocio?.tipoNegocio === 'SHOE_CARE' ||
                        ord.negocio?.tipoNegocio === 'LAVANDERIA' ||
                        ord.negocio?.tipoNegocio === 'ORDENES-SERVICIO' ||
                        Boolean(extra.servicioNombre || extra.modoIngreso || extra.cantidadPares);

      const isRetiroPhase = isLaundry && (
        body.missionType
          ? body.missionType === 'RETIRO'
          : extra.tipoMision
            ? extra.tipoMision === 'RETIRO'
            : ['PENDIENTE_RETIRO', 'ESPERANDO_REPARTIDOR_RETIRO', 'REPARTIDOR_EN_CAMINO'].includes(ord.estado)
      );
      const hadCodes = Boolean(extra.pickupCode && extra.deliveryCode);
      const codes = ensureCodes(extra);
      if (!hadCodes) {
        try { await (prisma as any).pedido.update({ where: { id: targetId }, data: { extraInfo: extra } }); } catch {}
      }

      let msg = '';
      if (isRetiroPhase) {
        const w = wordsFor(ord.negocio);
        const privateLink = `${APP_URL()}/${ord.negocio?.slug || negocio?.slug}/pedidos/${ord.id}`;
        msg = [
          `🛵 *Tu repartidor está afuera para retirar ${w.tusCosas}* (orden #${ord.numeroPedido})`,
          ``,
          `Pídele que te muestre su código e *ingrésalo aquí* para entregarle ${w.tusCosas}:`,
          privateLink,
          ``,
          `¡Gracias por confiar en *${bizName}*!`
        ].join('\n');
      } else {
        const deliveryCode = codes.deliveryCode;
        msg = [
          `🛵 *¡TU REPARTIDOR ESTÁ AFUERA!* 📍`,
          ``,
          `Hola *${ord.nombreCliente || 'Cliente'}*, tu repartidor te está esperando afuera de tu dirección con tu orden *#${ord.numeroPedido}*.`,
          ``,
          `🔐 *TU CÓDIGO PIN DE ENTREGA:* *${deliveryCode}*`,
          ``,
          `👉 Por favor acércate a recibir tu pedido y *dicta este código* al repartidor para finalizar la entrega.`,
          ``,
          `¡Gracias por confiar en *${bizName}*! ✨`
        ].join('\n');
      }

      const waRes = await sendWhatsAppMessage(cleanPhone, msg, isRetiroPhase ? 'resend_pin_retiro' : 'resend_pin_entrega');
      return NextResponse.json({ success: true, waResult: waRes, isRetiro: isRetiroPhase });
    }

    if (action === 'REJECT_TASK') {
      if (!taskId || !driverId) {
        return NextResponse.json({ error: 'taskId y driverId son requeridos.' }, { status: 400 });
      }

      const updatedTask = await deliveryEngine.rejectTask(taskId, driverId);
      return NextResponse.json({
        success: true,
        message: 'Pedido rechazado. Devuelto a la cola de asignación.',
        task: updatedTask,
      });
    }

    return NextResponse.json({ error: 'Acción no válida.' }, { status: 400 });
  } catch (e: any) {
    console.error('[API Driver POST Error]:', e);
    return NextResponse.json({ error: e.message || 'Error interno' }, { status: 500 });
  }
}

