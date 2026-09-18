import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { CatalogImportValidator } from '@/core/catalog/importer/CatalogImportValidator';
import { ImportExecutionOptions } from '@/core/catalog/importer/types';

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
        const body = await req.json();
        const { rows, mapping, options = {} } = body;

        if (!Array.isArray(rows) || rows.length === 0) {
            return NextResponse.json({ error: 'No hay filas de datos para validar.' }, { status: 400 });
        }
        if (!mapping || typeof mapping !== 'object') {
            return NextResponse.json({ error: 'Mapeo de columnas no proporcionado.' }, { status: 400 });
        }

        const executionOptions: ImportExecutionOptions = {
            productMode: options.productMode || 'UPDATE',
            categoryMode: options.categoryMode || 'AUTO_CREATE',
            imageMode: options.imageMode || 'KEEP',
            stockMode: options.stockMode || 'REPLACE',
            defaultCategoryId: options.defaultCategoryId,
            branchId: options.branchId
        };

        const previewResult = await CatalogImportValidator.validateImport(
            rows,
            mapping,
            negocioId,
            executionOptions
        );

        return NextResponse.json({
            success: true,
            preview: previewResult
        });
    } catch (e: any) {
        console.error('[API_CATALOG_IMPORT_VALIDATE_ERROR]', e);
        return NextResponse.json({ error: e?.message || 'Error al validar datos del catálogo.' }, { status: 500 });
    }
}
