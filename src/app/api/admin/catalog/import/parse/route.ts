import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { DataParserService } from '@/core/catalog/importer/DataParserService';
import { ColumnMappingService } from '@/core/catalog/importer/ColumnMappingService';
import { ImageResolverService } from '@/core/catalog/importer/ImageResolverService';
import AdmZip from 'adm-zip';

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
        const contentType = req.headers.get('content-type') || '';

        // Modo Google Sheets URL
        if (contentType.includes('application/json')) {
            const body = await req.json();
            const { googleSheetUrl, sheetGid } = body;

            if (!googleSheetUrl || !googleSheetUrl.trim()) {
                return NextResponse.json({ error: 'Debes proporcionar la URL del documento de Google Sheets.' }, { status: 400 });
            }

            const parsed = await DataParserService.parseGoogleSheets(googleSheetUrl, sheetGid);
            const suggestedMapping = ColumnMappingService.generateSuggestedMapping(parsed.columns);

            return NextResponse.json({
                success: true,
                sourceType: 'GOOGLE_SHEETS',
                columns: parsed.columns,
                suggestedMapping,
                previewRows: parsed.rows.slice(0, 10),
                totalRows: parsed.rows.length,
                rows: parsed.rows
            });
        }

        // Modo Archivo (multipart/form-data)
        const formData = await req.formData();
        const file = formData.get('file') as File | null;
        const sheetName = formData.get('sheetName') as string | null;

        if (!file) {
            return NextResponse.json({ error: 'No se envió ningún archivo.' }, { status: 400 });
        }

        const filename = file.name.toLowerCase();
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        let columns: string[] = [];
        let rows: any[] = [];
        let sheets: string[] = [];
        let selectedSheet = '';
        let zipImagesCount = 0;
        let sourceType = 'EXCEL';

        if (filename.endsWith('.xlsx') || filename.endsWith('.xls')) {
            sourceType = 'EXCEL';
            const parsed = DataParserService.parseExcel(buffer, sheetName || undefined);
            columns = parsed.columns;
            rows = parsed.rows;
            sheets = parsed.sheets;
            selectedSheet = parsed.selectedSheet;
        } else if (filename.endsWith('.csv') || filename.endsWith('.txt')) {
            sourceType = 'CSV';
            const parsed = DataParserService.parseCSV(buffer);
            columns = parsed.columns;
            rows = parsed.rows;
        } else if (filename.endsWith('.zip')) {
            sourceType = 'ZIP';
            const zip = new AdmZip(buffer);
            const entries = zip.getEntries();

            // Buscar un archivo de datos dentro del ZIP (.csv, .xlsx, .xls)
            const dataEntry = entries.find(e => {
                const name = e.entryName.toLowerCase();
                return !e.isDirectory && (name.endsWith('.csv') || name.endsWith('.xlsx') || name.endsWith('.xls'));
            });

            // Contar imágenes dentro del ZIP
            const imageEntries = entries.filter(e => {
                const name = e.entryName.toLowerCase();
                return !e.isDirectory && (name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.png') || name.endsWith('.webp'));
            });
            zipImagesCount = imageEntries.length;

            if (dataEntry) {
                const dataBuffer = dataEntry.getData();
                if (dataEntry.entryName.toLowerCase().endsWith('.csv')) {
                    const parsed = DataParserService.parseCSV(dataBuffer);
                    columns = parsed.columns;
                    rows = parsed.rows;
                } else {
                    const parsed = DataParserService.parseExcel(dataBuffer);
                    columns = parsed.columns;
                    rows = parsed.rows;
                    sheets = parsed.sheets;
                    selectedSheet = parsed.selectedSheet;
                }
            } else {
                return NextResponse.json({
                    error: 'El archivo ZIP contiene imágenes pero no incluye un archivo de datos (.xlsx o .csv). Sube el archivo de datos junto con el ZIP o selecciona ambos.'
                }, { status: 400 });
            }
        } else {
            return NextResponse.json({ error: 'Formato no soportado. Formatos admitidos: .xlsx, .xls, .csv, .zip' }, { status: 400 });
        }

        const suggestedMapping = ColumnMappingService.generateSuggestedMapping(columns);

        return NextResponse.json({
            success: true,
            sourceType,
            filename: file.name,
            sheets,
            selectedSheet,
            columns,
            suggestedMapping,
            previewRows: rows.slice(0, 10),
            totalRows: rows.length,
            zipImagesCount,
            rows
        });
    } catch (e: any) {
        console.error('[API_CATALOG_IMPORT_PARSE_ERROR]', e);
        return NextResponse.json({ error: e?.message || 'Error al procesar el archivo.' }, { status: 500 });
    }
}
