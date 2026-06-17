import { NextRequest, NextResponse } from 'next/server';
import { STORAGE_PATH } from '@/lib/config/storage';
import fs from 'fs';
import path from 'path';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ key: string[] }> }
) {
  try {
    const { key } = await params;
    if (!key || key.length === 0) {
      return NextResponse.json({ error: 'Ruta no válida' }, { status: 400 });
    }

    // Unir los segmentos de la key para formar la ruta relativa
    const relativePath = key.join('/');
    const filePath = path.resolve(STORAGE_PATH, relativePath);

    // Evitar Path Traversal: asegurar que está dentro de STORAGE_PATH
    if (!filePath.startsWith(path.resolve(STORAGE_PATH))) {
      return NextResponse.json({ error: 'Prohibido' }, { status: 403 });
    }

    // Verificar si el archivo existe y es legible
    try {
      await fs.promises.access(filePath, fs.constants.R_OK);
    } catch {
      return NextResponse.json({ error: 'Archivo no encontrado' }, { status: 404 });
    }

    // Detectar el tipo de contenido basado en la extensión
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.webp': 'image/webp',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
    };
    const mimeType = mimeTypes[ext] || 'application/octet-stream';

    // Leer el archivo
    const fileBuffer = await fs.promises.readFile(filePath);

    return new Response(fileBuffer, {
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error: any) {
    console.error('Error sirviendo media:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
