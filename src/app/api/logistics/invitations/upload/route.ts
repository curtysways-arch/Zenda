import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import path from 'path';
import crypto from 'crypto';
import { ALLOWED_EXT, saveDoc } from '@/lib/logistics/driverDocs';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const token = formData.get('token') as string | null;
    const docType = (formData.get('docType') as string) || 'documento';
    const file = formData.get('file') as File | null;

    if (!token) {
      return NextResponse.json({ error: 'Token de invitación requerido' }, { status: 400 });
    }

    const invitation = await (prisma as any).deliveryInvitation.findUnique({
      where: { token },
      select: { id: true, expiresAt: true, status: true }
    });

    if (!invitation) {
      return NextResponse.json({ error: 'Invitación no válida' }, { status: 404 });
    }

    if (invitation.status === 'CANCELLED') {
      return NextResponse.json({ error: 'Invitación cancelada' }, { status: 404 });
    }

    if (new Date() > new Date(invitation.expiresAt)) {
      return NextResponse.json({ error: 'La invitación ha expirado' }, { status: 410 });
    }

    if (!file) {
      return NextResponse.json({ error: 'No se ha proporcionado ningún archivo' }, { status: 400 });
    }

    // Máximo 10 MB
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'El archivo excede el tamaño máximo permitido de 10MB' }, { status: 400 });
    }

    // Validar tipo de archivo (imágenes y PDFs)
    const mime = file.type || '';
    if (!mime.startsWith('image/') && mime !== 'application/pdf') {
      return NextResponse.json({ error: 'Formato no admitido. Sube una foto (JPG, PNG) o PDF.' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let ext = (path.extname(file.name) || '').toLowerCase();
    if (!ALLOWED_EXT.has(ext)) ext = mime === 'application/pdf' ? '.pdf' : '.jpg';
    const safeDocType = docType.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40) || 'documento';
    const safeFilename = `${safeDocType}_${crypto.randomUUID()}${ext}`;

    // Se guarda fuera de /public: solo se sirve por /api/logistics/driver-docs con permisos
    const publicUrl = await saveDoc(token, safeFilename, buffer);

    return NextResponse.json({
      success: true,
      url: publicUrl,
      filename: safeFilename
    });
  } catch (error: any) {
    console.error('Error al subir documento de repartidor:', error);
    return NextResponse.json({ error: error.message || 'Error al procesar archivo' }, { status: 500 });
  }
}
