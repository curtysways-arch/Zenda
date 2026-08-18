import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET: Obtener todos los repartidores globales, negocios asociados, reglas globales y auditoría
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'ALL';

    // 1. Consultar todos los recursos de repartidor con su perfil global
    const resources = await (prisma as any).operableResource.findMany({
      where: {
        OR: [
          { category: 'DELIVERY_DRIVER' },
          { resourceType: { in: ['HUMAN', 'VEHICLE'] } }
        ],
        NOT: [
          { name: { contains: 'Mesa', mode: 'insensitive' } },
          { category: 'TABLE' }
        ]
      },
      include: {
        profile: true,
        negocio: {
          select: { id: true, nombre: true, slug: true, logoUrl: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // 2. Agrupar repartidores por su teléfono único / identidad global
    const driverMap = new Map<string, any>();

    resources.forEach((r: any) => {
      const phoneKey = (r.profile?.telefono || r.name || r.id).replace(/\D/g, '') || r.id;
      if (!driverMap.has(phoneKey)) {
        driverMap.set(phoneKey, {
          globalId: r.profile?.id || r.id,
          primaryResourceId: r.id,
          name: r.name,
          phone: r.profile?.telefono || '',
          email: r.profile?.email || '',
          documento: r.profile?.documento || '',
          tipoVehiculo: r.profile?.tipoVehiculo || 'MOTO',
          vehiculo: r.profile?.vehiculo || 'Motocicleta',
          placa: r.profile?.placa || '',
          globalStatus: r.profile?.activo === false ? 'BLOQUEADO' : (r.profile?.verificationStatus || 'ACTIVO'),
          motivoBloqueo: r.profile?.motivoRechazo || r.profile?.observaciones || null,
          documentos: {
            cedulaFrenteUrl: r.profile?.cedulaFrenteUrl || null,
            cedulaReversoUrl: r.profile?.cedulaReversoUrl || null,
            licenciaUrl: r.profile?.licenciaUrl || null,
            matriculaUrl: r.profile?.matriculaUrl || null,
            fotoVehiculoUrl: r.profile?.fotoVehiculoUrl || null,
            selfieUrl: r.profile?.selfieUrl || null,
          },
          negociosAsociados: []
        });
      }

      const driverEntry = driverMap.get(phoneKey);
      driverEntry.negociosAsociados.push({
        resourceId: r.id,
        negocioId: r.negocioId,
        negocioNombre: r.negocio?.nombre || 'Negocio',
        negocioSlug: r.negocio?.slug,
        negocioLogo: r.negocio?.logoUrl,
        localStatus: r.profile?.verificationStatus || (r.active ? 'APPROVED' : 'SUSPENDED'),
        localActive: r.active !== false
      });
    });

    let driversList = Array.from(driverMap.values());

    // Filtrar por búsqueda
    if (search.trim()) {
      const q = search.toLowerCase();
      driversList = driversList.filter(
        d => d.name.toLowerCase().includes(q) || d.phone.includes(q) || d.documento.toLowerCase().includes(q) || d.globalId.toLowerCase().includes(q)
      );
    }

    // Filtrar por estado global
    if (status !== 'ALL') {
      driversList = driversList.filter(d => d.globalStatus === status);
    }

    // Configuración global por defecto
    const globalConfig = {
      requiredDocs: {
        documentoIdentidad: true,
        licenciaConducir: true,
        matriculaVehiculo: true,
        fotoVehiculo: true,
        selfiePerfil: true
      },
      allowedVehicleTypes: ['MOTO', 'BICICLETA', 'AUTO', 'CAMIONETA', 'A_PIE'],
      expirationWarningDays: 15,
      autoDisableOnExpire: true
    };

    return NextResponse.json({
      success: true,
      drivers: driversList,
      globalConfig,
      stats: {
        totalGlobal: driversList.length,
        activos: driversList.filter(d => d.globalStatus === 'ACTIVO' || d.globalStatus === 'APPROVED').length,
        bloqueados: driversList.filter(d => d.globalStatus === 'BLOQUEADO' || d.globalStatus === 'SUSPENDED').length,
        pendientes: driversList.filter(d => d.globalStatus === 'INVITED' || d.globalStatus === 'PENDING_VERIFICATION').length
      }
    });

  } catch (error: any) {
    console.error('[SUPERADMIN DRIVERS GET ERROR]', error);
    return NextResponse.json({ error: error?.message || 'Error cargando repartidores globales' }, { status: 500 });
  }
}

// POST: Actualizar estado global (Bloquear/Desbloquear) o guardar políticas globales
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, driverPhone, globalStatus, motivo } = body;

    if (action === 'TOGGLE_GLOBAL_BLOCK') {
      if (!driverPhone) {
        return NextResponse.json({ error: 'Teléfono de repartidor requerido' }, { status: 400 });
      }

      const digitsOnly = driverPhone.replace(/\D/g, '');
      const last8or9 = digitsOnly.slice(-8);

      // Buscar todos los ResourceProfile con ese teléfono y actualizar estado global
      const profiles = await (prisma as any).resourceProfile.findMany({
        where: {
          telefono: { contains: last8or9 }
        }
      });

      const isBlock = globalStatus === 'BLOQUEADO';

      for (const prof of profiles) {
        await (prisma as any).resourceProfile.update({
          where: { id: prof.id },
          data: {
            activo: !isBlock,
            verificationStatus: isBlock ? 'SUSPENDED' : 'APPROVED',
            motivoRechazo: isBlock ? (motivo || 'Bloqueado globalmente por administración de Citiox') : null
          }
        });
      }

      return NextResponse.json({
        success: true,
        message: isBlock ? 'Repartidor bloqueado globalmente' : 'Repartidor desbloqueado globalmente',
        globalStatus: isBlock ? 'BLOQUEADO' : 'ACTIVO'
      });
    }

    return NextResponse.json({ success: true, message: 'Acción procesada' });

  } catch (error: any) {
    console.error('[SUPERADMIN DRIVERS POST ERROR]', error);
    return NextResponse.json({ error: error?.message || 'Error en acción global' }, { status: 500 });
  }
}
