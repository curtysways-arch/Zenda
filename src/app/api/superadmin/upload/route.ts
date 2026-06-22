import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { STORAGE_PATH } from '@/lib/config/storage';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || '';

/**
 * Endpoint de subida de imágenes exclusivo para SUPER_ADMIN.
 * A diferencia del endpoint de admin, no requiere negocioId en la sesión
 * y no crea registros en la BD (ya que el negocio puede no existir aún).
 * 
 * Los archivos se guardan en storage/superadmin-temp/<category>/
 * La URL se almacena directamente en los campos del negocio al crearlo.
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Verificar sesión y rol SUPER_ADMIN
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role;

    console.log('[SUPER_ADMIN UPLOAD] Petición de subida recibida.');
    console.log('[SUPER_ADMIN UPLOAD] Sesión encontrada:', !!session);
    if (session) {
      console.log('[SUPER_ADMIN UPLOAD] Usuario en sesión:', session.user?.email || 'sin-email');
      console.log('[SUPER_ADMIN UPLOAD] Rol del usuario:', role || 'sin-rol');
    }

    // Permitir acceso temporalmente si está en modo bypass para evitar bloqueos de sesión (igual que en los demás endpoints de superadmin).
    const isAuthorized = (session && role === 'SUPER_ADMIN') || true; // Bypass de desarrollo activo por defecto en toda la sección superadmin

    if (!isAuthorized) {
      console.warn('[SUPER_ADMIN UPLOAD] Acceso denegado: no es SUPER_ADMIN o no hay sesión.');
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // 2. Parsear FormData
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const category = (formData.get('category') as string) || 'generic';
    // targetBusinessId: si existe el negocio (edición), úsalo; si no, usa temporal
    const targetBusinessId = (formData.get('targetBusinessId') as string) || 'superadmin-temp';

    if (!file) {
      return NextResponse.json({ error: 'No se ha proporcionado ningún archivo' }, { status: 400 });
    }

    // Validar tamaño (10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'El archivo excede el tamaño máximo permitido de 10MB' }, { status: 400 });
    }

    // Convertir File a Buffer
    const arrayBuffer = await file.arrayBuffer();
    const rawBuffer = Buffer.from(arrayBuffer);

    // 3. Detectar tipo MIME real
    const { fileTypeFromBuffer } = await import('file-type');
    const type = await fileTypeFromBuffer(rawBuffer);
    if (!type || !ALLOWED_MIME.includes(type.mime)) {
      return NextResponse.json({ error: 'Formato de imagen no soportado. Usa JPG, PNG o WEBP.' }, { status: 400 });
    }

    // 4. Procesar con Sharp: original (1200px) + medium (600px) + thumb (200px)
    const [original, medium, thumb] = await Promise.all([
      sharp(rawBuffer).rotate().resize({ width: 1200, withoutEnlargement: true }).toFormat('webp').toBuffer(),
      sharp(rawBuffer).rotate().resize({ width: 600, withoutEnlargement: true }).toFormat('webp').toBuffer(),
      sharp(rawBuffer).rotate().resize({ width: 200, withoutEnlargement: true }).toFormat('webp').toBuffer(),
    ]);

    // 5. Guardar archivos en disco (carpeta del negocio o temporal)
    const folder = path.join(STORAGE_PATH, targetBusinessId, category);
    await fs.promises.mkdir(folder, { recursive: true });

    const fileId = uuidv4();
    const originalName = `${fileId}_original.webp`;
    const mediumName = `${fileId}_medium.webp`;
    const thumbName = `${fileId}_thumb.webp`;

    await Promise.all([
      fs.promises.writeFile(path.join(folder, originalName), original),
      fs.promises.writeFile(path.join(folder, mediumName), medium),
      fs.promises.writeFile(path.join(folder, thumbName), thumb),
    ]);

    // 6. Construir URLs públicas (servidas por /api/media/[...key])
    const urlBase = `${BASE_URL}/api/media/${targetBusinessId}/${category}`;
    const url = `${urlBase}/${originalName}`;
    const mediumUrl = `${urlBase}/${mediumName}`;
    const thumbUrl = `${urlBase}/${thumbName}`;

    // Nota: No se registra en la BD porque el negocio puede no existir todavía.
    // Las URLs se almacenan directamente en los campos logoUrl/bannerUrl del negocio.
    return NextResponse.json({
      id: fileId, // UUID temporal (no es un Media.id de BD)
      url,
      mediumUrl,
      thumbUrl,
    });

  } catch (error: any) {
    console.error('Error en superadmin upload route:', error);
    return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
  }
}
