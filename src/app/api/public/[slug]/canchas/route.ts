/**
 * Disponibilidad pública de todas las canchas de un negocio para un día.
 * GET /api/public/{slug}/canchas?fecha=YYYY-MM-DD
 * Devuelve cada cancha con su precio, promociones y los horarios ocupados (sin datos de clientes).
 */
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { loadBusy } from '@/lib/courts/busy';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const { searchParams } = new URL(req.url);
    const fecha = String(searchParams.get('fecha') || '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return NextResponse.json({ error: 'Fecha inválida' }, { status: 400 });

    const negocio = await prisma.negocio.findUnique({
      where: { slug },
      select: { id: true, horarioApertura: true, horarioCierre: true, precioHora: true },
    });
    if (!negocio) return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 });

    const [services, autos] = await Promise.all([
      prisma.service.findMany({
        where: { negocioId: negocio.id, estaActivo: true },
        include: {
          Imagen: { select: { url: true }, take: 1 },
          imageMedia: { select: { url: true } },
          PromotionToService: {
            include: {
              Promotion: {
                select: {
                  precioPromo: true, precioAnterior: true, estado: true, fechaInicio: true, fechaFin: true,
                  diasValidos: true, horaInicioValida: true, horaFinValida: true, tipoPromo: true,
                },
              },
            },
          },
        },
        orderBy: { nombre: 'asc' },
      }),
      prisma.automaticDiscount.findMany({ where: { businessId: negocio.id, enabled: true } }),
    ]);

    const busy = await loadBusy(negocio.id, fecha, services.map((s) => s.id));

    const courts = services.map((s: any) => {
      const extra = typeof s.extraInfo === 'string' ? (() => { try { return JSON.parse(s.extraInfo); } catch { return {}; } })() : s.extraInfo || {};
      const auto = autos.find((a) => a.serviceId === s.id) || autos.find((a) => a.serviceId === null) || null;
      return {
        id: s.id,
        nombre: s.nombre,
        tipo: extra.tipo || null,
        capacidad: extra.capacidad || null,
        features: Array.isArray(extra.features) ? extra.features.map((f: any) => (typeof f === 'string' ? f : String(f?.title || f?.content || '')).trim()).filter(Boolean) : [],
        precioHora: Number(s.precio ?? negocio.precioHora ?? 0),
        duracionMin: Number(s.duracion) || 60,
        imagen: s.imageMedia?.url || s.Imagen?.[0]?.url || null,
        promos: (s.PromotionToService || []).map((p: any) => p.Promotion).filter(Boolean),
        auto: auto
          ? { enabled: auto.enabled, discountPercentage: auto.discountPercentage, daysOfWeek: auto.daysOfWeek, startTime: auto.startTime, endTime: auto.endTime }
          : null,
        ocupado: (busy.get(s.id) || []).map((b) => ({ inicio: b.inicio, fin: b.fin })),
      };
    });

    return NextResponse.json({
      fecha,
      apertura: negocio.horarioApertura || '08:00',
      cierre: negocio.horarioCierre || '22:00',
      canchas: courts,
    });
  } catch (e) {
    console.error('[public canchas]', e);
    return NextResponse.json({ error: 'No se pudo cargar la disponibilidad' }, { status: 500 });
  }
}
