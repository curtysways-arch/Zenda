import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { DataParserService } from '@/core/catalog/importer/DataParserService';
import crypto from 'crypto';

// Limpieza y normalización de textos y números
function cleanString(val: any): string {
    if (val === null || val === undefined) return '';
    return String(val).trim();
}

function parseDuration(val: any): number {
    if (val === null || val === undefined) return 60;
    const num = parseInt(String(val).replace(/[^\d]/g, ''), 10);
    return isNaN(num) || num <= 0 ? 60 : num;
}

function parsePrice(val: any): number {
    if (val === null || val === undefined) return 0;
    let s = String(val).replace(/[$€\s]/g, '').trim();
    // Si tiene coma como decimal y no punto (ej: "35,50")
    if (s.includes(',') && !s.includes('.')) {
        s = s.replace(',', '.');
    } else if (s.includes(',') && s.includes('.')) {
        // Formato 1,250.00
        s = s.replace(/,/g, '');
    }
    const num = parseFloat(s);
    return isNaN(num) || num < 0 ? 0 : num;
}

function parseActive(val: any): boolean {
    if (val === null || val === undefined || String(val).trim() === '') return true;
    const s = String(val).toLowerCase().trim();
    if (['no', '0', 'falso', 'false', 'inactivo', 'off'].includes(s)) return false;
    return true;
}

function resolveGoogleDriveUrl(url: string): string {
    if (!url) return '';
    const trimmed = url.trim();
    if (trimmed.includes('drive.google.com')) {
        const fileIdMatch = trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/) || trimmed.match(/id=([a-zA-Z0-9_-]+)/);
        if (fileIdMatch && fileIdMatch[1]) {
            return `https://lh3.googleusercontent.com/d/${fileIdMatch[1]}=w1000`;
        }
    }
    return trimmed;
}

// Búsqueda inteligente de columnas por sinónimos
function getColumnValue(row: any, candidates: string[]): string {
    const keys = Object.keys(row);
    for (const cand of candidates) {
        const matchedKey = keys.find(k => k.toLowerCase().trim() === cand.toLowerCase().trim());
        if (matchedKey && row[matchedKey] !== undefined && row[matchedKey] !== null) {
            return String(row[matchedKey]).trim();
        }
    }
    // Búsqueda parcial si no hubo exacta
    for (const cand of candidates) {
        const matchedKey = keys.find(k => k.toLowerCase().trim().includes(cand.toLowerCase().trim()));
        if (matchedKey && row[matchedKey] !== undefined && row[matchedKey] !== null) {
            return String(row[matchedKey]).trim();
        }
    }
    return '';
}

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const negocioId = (session.user as any).negocioId;
    if (!negocioId) {
        return NextResponse.json({ error: 'No tienes un negocio asociado' }, { status: 400 });
    }

    try {
        let rawRows: any[] = [];
        let action = 'execute'; // 'preview' | 'execute'

        const contentType = req.headers.get('content-type') || '';

        if (contentType.includes('application/json')) {
            const body = await req.json();
            action = body.action || 'execute';

            if (body.googleSheetUrl) {
                const parsed = await DataParserService.parseGoogleSheets(body.googleSheetUrl, body.sheetGid);
                rawRows = parsed.rows;
            } else if (Array.isArray(body.rows)) {
                rawRows = body.rows;
            } else {
                return NextResponse.json({ error: 'Formato de datos JSON no válido' }, { status: 400 });
            }
        } else {
            const formData = await req.formData();
            const file = formData.get('file') as File | null;
            action = (formData.get('action') as string) || 'execute';

            if (!file) {
                return NextResponse.json({ error: 'No se envió ningún archivo' }, { status: 400 });
            }

            const filename = file.name.toLowerCase();
            const arrayBuffer = await file.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            if (filename.endsWith('.xlsx') || filename.endsWith('.xls')) {
                const parsed = DataParserService.parseExcel(buffer);
                rawRows = parsed.rows;
            } else if (filename.endsWith('.csv') || filename.endsWith('.txt')) {
                const parsed = DataParserService.parseCSV(buffer);
                rawRows = parsed.rows;
            } else {
                return NextResponse.json({ error: 'Formato no soportado. Debe ser .xlsx, .xls o .csv' }, { status: 400 });
            }
        }

        if (!rawRows || rawRows.length === 0) {
            return NextResponse.json({ error: 'El archivo no contiene filas con datos' }, { status: 400 });
        }

        // Mapeo y validación de filas
        const nameCandidates = ['nombre', 'servicio', 'service', 'name', 'título', 'titulo', 'item'];
        const durationCandidates = ['duracion (min)', 'duracion (minutos)', 'duración (min)', 'duracion', 'duración', 'tiempo', 'minutos', 'duration'];
        const priceCandidates = ['precio', 'price', 'costo', 'tarifa', 'valor', 'monto'];
        const categoryCandidates = ['categoria', 'categoría', 'category', 'tipo', 'grupo', 'sección', 'seccion'];
        const descriptionCandidates = ['descripcion', 'descripción', 'description', 'detalle', 'detalles'];
        const imageCandidates = ['imagen', 'imagen principal', 'foto', 'image', 'url imagen', 'imagen_url', 'img'];
        const activeCandidates = ['activo', 'estado', 'status', 'active', 'habilitado'];

        const processedRows = rawRows.map((r, index) => {
            const rawName = getColumnValue(r, nameCandidates);
            const rawDuration = getColumnValue(r, durationCandidates);
            const rawPrice = getColumnValue(r, priceCandidates);
            const rawCategory = getColumnValue(r, categoryCandidates);
            const rawDescription = getColumnValue(r, descriptionCandidates);
            const rawImage = getColumnValue(r, imageCandidates);
            const rawActive = getColumnValue(r, activeCandidates);

            const nombre = cleanString(rawName);
            const duracion = parseDuration(rawDuration);
            const precio = parsePrice(rawPrice);
            const categoria = cleanString(rawCategory);
            const descripcion = cleanString(rawDescription);
            const imagen = resolveGoogleDriveUrl(cleanString(rawImage));
            const activo = parseActive(rawActive);

            const errors: string[] = [];
            if (!nombre) {
                errors.push('El nombre del servicio es obligatorio');
            }

            return {
                rowIndex: index + 1,
                nombre,
                duracion,
                precio,
                categoria,
                descripcion,
                imagen,
                activo,
                isValid: errors.length === 0,
                errors
            };
        });

        const validRows = processedRows.filter(r => r.isValid);
        const invalidRows = processedRows.filter(r => !r.isValid);

        // Si solo se solicitó previsualización / validación
        if (action === 'preview') {
            return NextResponse.json({
                success: true,
                totalRows: processedRows.length,
                validCount: validRows.length,
                invalidCount: invalidRows.length,
                preview: processedRows.slice(0, 15),
                allRows: processedRows
            });
        }

        // Ejecución de la importación masiva
        if (validRows.length === 0) {
            return NextResponse.json({
                error: 'No se encontraron servicios válidos para importar en el archivo.',
                invalidRows
            }, { status: 400 });
        }

        // Obtener servicios existentes para este negocio
        const existingServices = await prisma.service.findMany({
            where: { negocioId },
            include: { Imagen: true }
        });

        let createdCount = 0;
        let updatedCount = 0;
        const errorsList: { row: number; error: string }[] = [];

        for (const item of validRows) {
            try {
                // Comparación case-insensitive de nombre
                const existing = existingServices.find(
                    s => s.nombre.trim().toLowerCase() === item.nombre.toLowerCase()
                );

                if (existing) {
                    // ACTUALIZAR SERVICIO EXISTENTE
                    const existingExtra = (existing.extraInfo as any) || {};
                    const updatedExtra = {
                        ...existingExtra,
                        descripcion: item.descripcion || existingExtra.descripcion || '',
                        imagenUrl: item.imagen || existingExtra.imagenUrl || '',
                        tipo: item.categoria || existingExtra.tipo || null
                    };

                    await prisma.service.update({
                        where: { id: existing.id },
                        data: {
                            duracion: item.duracion,
                            precio: item.precio,
                            estaActivo: item.activo,
                            extraInfo: updatedExtra,
                            updatedAt: new Date()
                        }
                    });

                    // Si trae imagen y no la tiene registrada en la tabla Imagen, crearla
                    if (item.imagen) {
                        const hasImg = existing.Imagen?.some(img => img.url === item.imagen);
                        if (!hasImg) {
                            await (prisma as any).imagen.create({
                                data: {
                                    id: crypto.randomUUID(),
                                    url: item.imagen,
                                    tipo: 'SERVICE',
                                    serviceId: existing.id,
                                    negocioId
                                }
                            });
                        }
                    }

                    updatedCount++;
                } else {
                    // CREAR NUEVO SERVICIO
                    const newId = crypto.randomUUID();
                    const newService = await prisma.service.create({
                        data: {
                            id: newId,
                            nombre: item.nombre,
                            duracion: item.duracion,
                            precio: item.precio,
                            estaActivo: item.activo,
                            negocioId,
                            extraInfo: {
                                descripcion: item.descripcion || '',
                                imagenUrl: item.imagen || '',
                                tipo: item.categoria || null,
                                categoryId: null,
                                puntosOtorgados: 10
                            },
                            updatedAt: new Date()
                        } as any
                    });

                    if (item.imagen) {
                        await (prisma as any).imagen.create({
                            data: {
                                id: crypto.randomUUID(),
                                url: item.imagen,
                                tipo: 'SERVICE',
                                serviceId: newId,
                                negocioId
                            }
                        });
                    }

                    createdCount++;
                }
            } catch (err: any) {
                console.error(`Error procesando fila ${item.rowIndex} (${item.nombre}):`, err);
                errorsList.push({
                    row: item.rowIndex,
                    error: err.message || 'Error al persistir servicio'
                });
            }
        }

        return NextResponse.json({
            success: true,
            message: `Importación completada: ${createdCount} creados, ${updatedCount} actualizados.`,
            totalProcessed: validRows.length,
            createdCount,
            updatedCount,
            failedCount: errorsList.length,
            errors: errorsList
        });
    } catch (error: any) {
        console.error('[API_SERVICES_IMPORT_ERROR]', error);
        return NextResponse.json({ error: error.message || 'Error al procesar la importación' }, { status: 500 });
    }
}
