import { NextRequest, NextResponse } from 'next/server';
import { getEffectiveAdminSession } from '@/lib/delegatedAuth';
import { storageService } from '@/lib/storage/storageService';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // 1. Validar sesión (soporta sesión normal y modo delegado)
    const session = await getEffectiveAdminSession();
    if (!session || !session.user || (session.user as any).isDelegatedExpired) {
      return NextResponse.json({ error: 'No autorizado. Por favor inicia sesión.' }, { status: 401 });
    }

    // 2. Parsear FormData
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const category = (formData.get('category') as string) || 'generic';
    const targetBusinessId = formData.get('targetBusinessId') as string | null;

    let businessId = (session.user as any)?.negocioId || targetBusinessId;
    if (!businessId && session.user.email) {
      const user = await prisma.usuario.findUnique({ where: { email: session.user.email } });
      businessId = user?.negocioId;
    }

    // Nunca adjuntar archivos a un negocio ajeno: si no sabemos de quién es, rechazamos.
    if (!businessId) {
      return NextResponse.json({ error: 'No se pudo identificar tu negocio. Vuelve a iniciar sesión.' }, { status: 400 });
    }

    if (!file) {
      return NextResponse.json({ error: 'No se ha proporcionado ningún archivo' }, { status: 400 });
    }

    // Validar tipo y tamaño (Videos hasta 60MB, Imágenes hasta 20MB)
    const isVideo = file.type?.startsWith('video/') || /\.(mp4|webm|mov|m4v|ogg)$/i.test(file.name);
    const maxSizeBytes = isVideo ? 60 * 1024 * 1024 : 20 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return NextResponse.json({ 
        error: `El archivo excede el tamaño máximo permitido (${isVideo ? '60MB para videos' : '20MB para imágenes'})` 
      }, { status: 400 });
    }

    // Convertir File a Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 3. Subir y procesar
    const result = await storageService.handleUpload(buffer, businessId, category, file.type, file.name);

    return NextResponse.json({
      id: result.id,
      url: result.url,
      mediumUrl: result.mediumUrl,
      thumbUrl: result.thumbUrl,
    });
  } catch (error: any) {
    console.error('Error en upload route:', error);
    return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
  }
}
