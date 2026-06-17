import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { storageService } from '@/lib/storage/storageService';
import prisma from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const businessId = (session?.user as any)?.businessId;
    if (!session || !businessId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { mediaId } = await req.json();
    if (!mediaId) {
      return NextResponse.json({ error: 'Media ID requerido' }, { status: 400 });
    }

    // Verificar que el media pertenezca al negocio para evitar hackeos
    const media = await prisma.media.findUnique({
      where: { id: mediaId },
    });

    if (!media) {
      return NextResponse.json({ error: 'Archivo no encontrado' }, { status: 404 });
    }

    if (media.businessId !== businessId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    // Borrado físico y en DB usando el servicio
    await storageService.deleteMedia(mediaId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error al eliminar media:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
