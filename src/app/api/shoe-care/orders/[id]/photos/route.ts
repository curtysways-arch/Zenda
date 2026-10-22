import { NextResponse } from 'next/server';
import { requireOrderAccess } from '@/lib/laundry/orderAccess';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { storageService } from '@/lib/storage/storageService';

export const dynamic = 'force-dynamic';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const access = await requireOrderAccess(id);
    if (!access.ok) return access.response;
    const session = await getServerSession(authOptions);
    const userName = session?.user?.name || 'Administrador';

    const order = await prisma.pedido.findUnique({
      where: { id },
    });

    if (!order) {
      return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const stage = (formData.get('stage') as string) || 'recepcion'; // 'recepcion' | 'proceso' | 'entrega'

    if (!file) {
      return NextResponse.json({ error: 'No se envió ningún archivo de imagen' }, { status: 400 });
    }

    const isVideo = file.type?.startsWith('video/') || /\.(mp4|webm|mov|m4v|ogg)$/i.test(file.name || '');
    const maxSize = isVideo ? 60 * 1024 * 1024 : 20 * 1024 * 1024;

    if (file.size > maxSize) {
      return NextResponse.json({ error: `El archivo excede el tamaño máximo permitido (${isVideo ? '60MB' : '20MB'})` }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    let imageUrl = '';
    try {
      const uploadRes = await storageService.handleUpload(buffer, order.negocioId, 'order-inspection', file.type, file.name);
      imageUrl = uploadRes.url;
    } catch (storageErr: any) {
      console.warn('StorageService falló, usando guardado local directo:', storageErr);
      const fsModule = await import('fs');
      const pathModule = await import('path');
      const uploadDir = pathModule.join(process.cwd(), 'public', 'uploads', 'orders', order.id);
      await fsModule.promises.mkdir(uploadDir, { recursive: true });
      const ext = file.name.split('.').pop() || 'jpg';
      const fileName = `${stage}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;
      const filePath = pathModule.join(uploadDir, fileName);
      await fsModule.promises.writeFile(filePath, buffer);
      imageUrl = `/uploads/orders/${order.id}/${fileName}`;
    }

    // Actualizar JSON de extraInfo en Pedido
    const currentExtra = (order.extraInfo as any) || {};
    const key = stage === 'entrega' ? 'fotosEntrega' : stage === 'proceso' ? 'fotosProceso' : 'fotosRecepcion';
    const currentList = Array.isArray(currentExtra[key]) ? currentExtra[key] : [];
    const updatedList = [...currentList, imageUrl];

    const currentTimeline = Array.isArray(currentExtra.timeline) ? currentExtra.timeline : [];
    const stageLabel = stage === 'entrega' ? 'Entrega / Resultado' : stage === 'proceso' ? 'En Proceso' : 'Recepción / Ingreso';
    currentTimeline.push({
      id: `tl_${Date.now()}`,
      type: 'PHOTO_AUDIT',
      action: `Fotografía agregada a: ${stageLabel}`,
      user: userName,
      timestamp: new Date().toISOString(),
    });

    const newExtra = {
      ...currentExtra,
      [key]: updatedList,
      timeline: currentTimeline,
    };

    await prisma.pedido.update({
      where: { id },
      data: {
        extraInfo: newExtra,
      },
    });

    return NextResponse.json({
      success: true,
      url: imageUrl,
      fotos: {
        recepcion: newExtra.fotosRecepcion || [],
        proceso: newExtra.fotosProceso || [],
        entrega: newExtra.fotosEntrega || [],
      },
    });
  } catch (err: any) {
    console.error('Error al subir fotografía de auditoría:', err);
    return NextResponse.json({ error: err.message || 'Error al procesar la fotografía' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const access = await requireOrderAccess(id);
    if (!access.ok) return access.response;
    const session = await getServerSession(authOptions);
    const userName = session?.user?.name || 'Administrador';

    const order = await prisma.pedido.findUnique({
      where: { id },
    });

    if (!order) {
      return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 });
    }

    const body = await req.json();
    const { photoUrl, stage } = body;

    if (!photoUrl || !stage) {
      return NextResponse.json({ error: 'photoUrl y stage son requeridos' }, { status: 400 });
    }

    const currentExtra = (order.extraInfo as any) || {};
    const key = stage === 'entrega' ? 'fotosEntrega' : stage === 'proceso' ? 'fotosProceso' : 'fotosRecepcion';
    const currentList = Array.isArray(currentExtra[key]) ? currentExtra[key] : [];
    const updatedList = currentList.filter((u: string) => u !== photoUrl);

    const currentTimeline = Array.isArray(currentExtra.timeline) ? currentExtra.timeline : [];
    const stageLabel = stage === 'entrega' ? 'Entrega / Resultado' : stage === 'proceso' ? 'En Proceso' : 'Recepción / Ingreso';
    currentTimeline.push({
      id: `tl_${Date.now()}`,
      type: 'PHOTO_AUDIT',
      action: `Fotografía eliminada de: ${stageLabel}`,
      user: userName,
      timestamp: new Date().toISOString(),
    });

    const newExtra = {
      ...currentExtra,
      [key]: updatedList,
      timeline: currentTimeline,
    };

    await prisma.pedido.update({
      where: { id },
      data: {
        extraInfo: newExtra,
      },
    });

    // Intentar borrar archivo físico y registro de media
    try {
      const media = await (prisma as any).media.findFirst({ where: { url: photoUrl } });
      if (media) {
        await storageService.deleteMedia(media.id);
      }
    } catch (e) {
      // Ignorar si falla el borrado físico
    }

    return NextResponse.json({
      success: true,
      fotos: {
        recepcion: newExtra.fotosRecepcion || [],
        proceso: newExtra.fotosProceso || [],
        entrega: newExtra.fotosEntrega || [],
      },
    });
  } catch (err: any) {
    console.error('Error al eliminar fotografía de auditoría:', err);
    return NextResponse.json({ error: err.message || 'Error al eliminar la fotografía' }, { status: 500 });
  }
}
