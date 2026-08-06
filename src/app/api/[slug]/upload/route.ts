// src/app/api/[slug]/upload/route.ts
// API genérica de subida de imágenes/archivos para el negocio por [slug]
// Guarda archivos en public/uploads/[slug]/ y retorna la URL pública local

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const negocio = await prisma.negocio.findUnique({ where: { slug } });
    if (!negocio) return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 });

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No se ha proporcionado ningún archivo.' }, { status: 400 });
    }

    // Validar tamaño (10MB máx)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'El archivo no debe exceder 10MB.' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Sanitize filename & extension
    const ext = path.extname(file.name) || '.jpg';
    const safeFilename = `${crypto.randomUUID()}${ext.toLowerCase()}`;

    const uploadDir = path.join(process.cwd(), 'public', 'uploads', slug);
    await fs.mkdir(uploadDir, { recursive: true });

    const filePath = path.join(uploadDir, safeFilename);
    await fs.writeFile(filePath, buffer);

    const publicUrl = `/uploads/${slug}/${safeFilename}`;

    return NextResponse.json({
      success: true,
      url: publicUrl,
      filename: safeFilename
    });
  } catch (error: any) {
    console.error('Error al subir archivo:', error);
    return NextResponse.json({ error: error.message || 'Error interno al procesar imagen' }, { status: 500 });
  }
}
