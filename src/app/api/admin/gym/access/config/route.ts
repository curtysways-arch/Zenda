import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { 
  getGymAccessConfig, 
  generateStaticTotemToken, 
  ALLOWED_DYNAMIC_INTERVALS,
  GymAccessConfig 
} from '@/modules/gym/types/gymAccessConfig';

/**
 * GET /api/admin/gym/access/config
 * Devuelve la configuración de acceso del gimnasio autenticado.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const negocioId = (session.user as any).negocioId;
  if (!negocioId) {
    return NextResponse.json({ error: 'No tienes un negocio asociado' }, { status: 400 });
  }

  try {
    const negocio = await prisma.negocio.findUnique({
      where: { id: negocioId },
      select: { id: true, nombre: true, logoUrl: true, slug: true, configuracion: true }
    });

    if (!negocio) {
      return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 });
    }

    const config = getGymAccessConfig(negocio.configuracion);
    const staticToken = generateStaticTotemToken(negocio.id);

    return NextResponse.json({
      success: true,
      config: {
        ...config,
        adminQr: {
          ...config.adminQr,
          staticToken
        }
      },
      business: {
        id: negocio.id,
        nombre: negocio.nombre,
        logoUrl: negocio.logoUrl,
        slug: negocio.slug
      }
    });
  } catch (error: any) {
    console.error('[API_ADMIN_GYM_ACCESS_CONFIG_GET_ERROR]', error);
    return NextResponse.json({ error: 'Error al obtener la configuración de acceso' }, { status: 500 });
  }
}

/**
 * PUT /api/admin/gym/access/config
 * Actualiza la configuración de métodos de acceso y registra auditoría.
 */
export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const negocioId = (session.user as any).negocioId;
  const adminUserId = (session.user as any).id;
  if (!negocioId) {
    return NextResponse.json({ error: 'No tienes un negocio asociado' }, { status: 400 });
  }

  try {
    const body = await req.json();
    const { primaryMethod, backupMethods, adminQr } = body;

    // 1. Validar método principal
    const validPrimary = primaryMethod === 'MANUAL' ? 'MANUAL' : 'QR';

    // 2. Validar métodos de respaldo
    const manualBackup = backupMethods?.manual !== undefined ? Boolean(backupMethods.manual) : true;
    const qrBackup = backupMethods?.qr !== undefined ? Boolean(backupMethods.qr) : false;

    // Regla de seguridad: Debe haber al menos un método habilitado
    const isManualAllowed = validPrimary === 'MANUAL' || manualBackup;
    const isQrAllowed = validPrimary === 'QR' || qrBackup;

    if (!isManualAllowed && !isQrAllowed) {
      return NextResponse.json({ 
        error: 'Debe existir al menos un método de acceso activo (QR o Registro Manual)' 
      }, { status: 400 });
    }

    // 3. Validar seguridad de QR Admin / Tótem
    const adminQrMode = adminQr?.mode === 'STATIC_PRINTABLE' ? 'STATIC_PRINTABLE' : 'DYNAMIC';
    const rawInterval = Number(adminQr?.dynamicIntervalSeconds);
    const dynamicIntervalSeconds = ALLOWED_DYNAMIC_INTERVALS.includes(rawInterval) ? rawInterval : 90;

    // 4. Obtener estado actual para auditoría
    const currentNegocio = await prisma.negocio.findUnique({
      where: { id: negocioId },
      select: { id: true, configuracion: true, nombre: true }
    });

    if (!currentNegocio) {
      return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 });
    }

    let parsedConfig: Record<string, any> = {};
    if (typeof currentNegocio.configuracion === 'string') {
      try {
        parsedConfig = JSON.parse(currentNegocio.configuracion);
      } catch {
        parsedConfig = {};
      }
    } else if (currentNegocio.configuracion && typeof currentNegocio.configuracion === 'object') {
      parsedConfig = { ...(currentNegocio.configuracion as any) };
    }

    const previousGymConfig = getGymAccessConfig(parsedConfig);

    const newGymConfig: GymAccessConfig = {
      primaryMethod: validPrimary,
      backupMethods: {
        manual: manualBackup,
        qr: qrBackup
      },
      adminQr: {
        mode: adminQrMode,
        dynamicIntervalSeconds
      }
    };

    parsedConfig.gymAccessConfig = newGymConfig;

    // 5. Guardar en Base de Datos
    const updatedNegocio = await prisma.negocio.update({
      where: { id: negocioId },
      data: {
        configuracion: JSON.stringify(parsedConfig)
      },
      select: { id: true, configuracion: true }
    });

    // 6. Registrar en Auditoría (AdminAuditLog)
    try {
      if (adminUserId) {
        await (prisma as any).adminAuditLog.create({
          data: {
            adminUserId,
            accion: 'GYM_ACCESS_CONFIG_UPDATE',
            modulo: 'GIMNASIO',
            descripcion: `Actualización de métodos de acceso: Principal (${validPrimary}), Respaldo Manual (${manualBackup ? 'Sí' : 'No'}), Respaldo QR (${qrBackup ? 'Sí' : 'No'}), Tótem (${adminQrMode === 'DYNAMIC' ? 'Dinámico ' + dynamicIntervalSeconds + 's' : 'Fijo Impreso'})`,
            targetId: negocioId,
            targetType: 'NEGOCIO',
            datosAntes: JSON.stringify(previousGymConfig),
            datosDespues: JSON.stringify(newGymConfig),
            resultado: 'EXITOSO'
          }
        });
      }
    } catch (auditError) {
      console.warn('[AUDIT_LOG_ERROR]', auditError);
    }

    return NextResponse.json({
      success: true,
      message: 'Configuración de acceso guardada correctamente',
      config: newGymConfig
    });
  } catch (error: any) {
    console.error('[API_ADMIN_GYM_ACCESS_CONFIG_PUT_ERROR]', error);
    return NextResponse.json({ error: 'Error al actualizar la configuración de acceso' }, { status: 500 });
  }
}
