import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { CatalogImportExecutor } from '@/core/catalog/importer/CatalogImportExecutor';
import { ImageResolverService } from '@/core/catalog/importer/ImageResolverService';
import { ImportExecutionOptions, NormalizedProductRow } from '@/core/catalog/importer/types';

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const negocioId = (session.user as any).negocioId;
    if (!negocioId) {
        return NextResponse.json({ error: 'No tienes un negocio asociado' }, { status: 400 });
    }
    const userId = (session.user as any).id;

    try {
        const contentType = req.headers.get('content-type') || '';
        let rows: NormalizedProductRow[] = [];
        let options: ImportExecutionOptions = {
            productMode: 'UPDATE',
            categoryMode: 'AUTO_CREATE',
            imageMode: 'KEEP',
            stockMode: 'REPLACE'
        };
        let zipMap: Map<string, { buffer: Buffer; filename: string }> | undefined = undefined;
        let sourceName = 'Manual';

        if (contentType.includes('multipart/form-data')) {
            const formData = await req.formData();
            const rowsJson = formData.get('rows') as string;
            const optionsJson = formData.get('options') as string;
            const zipFile = formData.get('zipFile') as File | null;
            sourceName = (formData.get('sourceName') as string) || 'Archivo ZIP / Subida';

            if (rowsJson) rows = JSON.parse(rowsJson);
            if (optionsJson) options = { ...options, ...JSON.parse(optionsJson) };

            if (zipFile) {
                const arrayBuffer = await zipFile.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);
                zipMap = ImageResolverService.extractZipImages(buffer);
            }
        } else {
            const body = await req.json();
            rows = body.rows || [];
            if (body.options) options = { ...options, ...body.options };
            if (body.sourceName) sourceName = body.sourceName;
        }

        if (!Array.isArray(rows) || rows.length === 0) {
            return NextResponse.json({ error: 'No hay filas normalizadas para importar.' }, { status: 400 });
        }

        // Crear registro de auditoría en la tabla CatalogImport
        const catalogImport = await (prisma as any).catalogImport.create({
            data: {
                businessId: negocioId,
                userId: userId || null,
                sourceType: zipMap ? 'ZIP' : 'FILE',
                sourceFileName: sourceName,
                status: 'PROCESSING',
                totalRows: rows.length,
                options: options as any
            }
        });

        // Ejecutar importación canónica
        const result = await CatalogImportExecutor.execute(
            catalogImport.id,
            rows,
            negocioId,
            userId,
            options,
            zipMap
        );

        return NextResponse.json({
            success: result.success,
            result
        });
    } catch (e: any) {
        console.error('[API_CATALOG_IMPORT_EXECUTE_ERROR]', e);
        return NextResponse.json({ error: e?.message || 'Error al ejecutar la importación.' }, { status: 500 });
    }
}
