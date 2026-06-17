import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { storageService } from '@/lib/storage/storageService';

export async function POST(req: NextRequest) {
  try {
    // 1. Validar sesión
    const session = await getServerSession(authOptions);
    const negocioId = (session?.user as any)?.negocioId;
    if (!session || !negocioId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const businessId = negocioId;

    // 2. Parsear FormData
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const category = (formData.get('category') as string) || 'generic';

    if (!file) {
      return NextResponse.json({ error: 'No se ha proporcionado ningún archivo' }, { status: 400 });
    }

    // Validar tamaño (10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'El archivo excede el tamaño máximo permitido de 10MB' }, { status: 400 });
    }

    // Convertir File a Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 3. Subir y procesar
    const result = await storageService.handleUpload(buffer, businessId, category);

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
