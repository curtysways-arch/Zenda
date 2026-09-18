/**
 * @file DataParserService.ts
 * @module core/catalog/importer
 * @description Parser universal de datos: Google Sheets, Excel (.xlsx/.xls) y CSV con auto-delimitador.
 */

import * as XLSX from 'xlsx';
import { RawRowData } from './types';

export class DataParserService {
    /**
     * Parsea un buffer de archivo Excel (.xlsx / .xls)
     */
    public static parseExcel(buffer: Buffer, sheetName?: string): { sheets: string[]; selectedSheet: string; columns: string[]; rows: RawRowData[] } {
        const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true, dense: true });
        const sheetNames = workbook.SheetNames;

        if (sheetNames.length === 0) {
            throw new Error('El archivo Excel no contiene ninguna hoja.');
        }

        const targetSheet = (sheetName && sheetNames.includes(sheetName)) ? sheetName : sheetNames[0];
        const worksheet = workbook.Sheets[targetSheet];

        if (!worksheet) {
            throw new Error(`No se pudo leer la hoja "${targetSheet}" en el archivo Excel.`);
        }

        // Convertir hoja a JSON con cabeceras en primera fila
        const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '', raw: false });

        if (rawJson.length === 0) {
            throw new Error('La hoja seleccionada está vacía o no contiene filas con datos.');
        }

        const columns = Object.keys(rawJson[0]).filter(k => k && !k.startsWith('__EMPTY'));

        const rows: RawRowData[] = rawJson.map((r, idx) => ({
            __rowNumber: idx + 2, // Fila 1 es cabecera en Excel
            ...r
        })).filter(r => {
            // Filtrar filas completamente vacías
            return Object.entries(r).some(([k, v]) => k !== '__rowNumber' && String(v).trim() !== '');
        });

        return {
            sheets: sheetNames,
            selectedSheet: targetSheet,
            columns,
            rows
        };
    }

    /**
     * Parsea un buffer o string CSV con autodetección de delimitador (, o ;)
     */
    public static parseCSV(contentOrBuffer: string | Buffer): { columns: string[]; rows: RawRowData[] } {
        let text = typeof contentOrBuffer === 'string' ? contentOrBuffer : contentOrBuffer.toString('utf8');

        // Remover BOM de UTF-8 si existe
        if (text.charCodeAt(0) === 0xFEFF) {
            text = text.slice(1);
        }

        // Detectar delimitador inspeccionando la primera línea
        const firstLine = text.split(/\r\n|\n|\r/)[0] || '';
        const semicolonCount = (firstLine.match(/;/g) || []).length;
        const commaCount = (firstLine.match(/,/g) || []).length;
        const tabCount = (firstLine.match(/\t/g) || []).length;

        let delimiter = ',';
        if (semicolonCount > commaCount && semicolonCount > tabCount) delimiter = ';';
        else if (tabCount > commaCount && tabCount > semicolonCount) delimiter = '\t';

        const workbook = XLSX.read(text, { type: 'string', FS: delimiter });
        const firstSheet = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheet];

        const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '', raw: false });

        if (rawJson.length === 0) {
            throw new Error('El archivo CSV está vacío o no contiene filas con datos.');
        }

        const columns = Object.keys(rawJson[0]).filter(k => k && !k.startsWith('__EMPTY'));

        const rows: RawRowData[] = rawJson.map((r, idx) => ({
            __rowNumber: idx + 2,
            ...r
        })).filter(r => {
            return Object.entries(r).some(([k, v]) => k !== '__rowNumber' && String(v).trim() !== '');
        });

        return {
            columns,
            rows
        };
    }

    /**
     * Resuelve y descarga datos desde una URL de Google Sheets
     */
    public static async parseGoogleSheets(url: string, gid: string = '0'): Promise<{ columns: string[]; rows: RawRowData[]; spreadsheetId: string }> {
        // Extraer spreadsheet ID de URL
        // https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit...
        const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
        if (!match || !match[1]) {
            throw new Error('URL de Google Sheets no válida. Asegúrate de incluir el enlace completo del spreadsheet.');
        }

        const spreadsheetId = match[1];

        // Extraer gid si está en la URL
        const gidMatch = url.match(/[?&#]gid=([0-9]+)/);
        const resolvedGid = gidMatch ? gidMatch[1] : gid;

        const exportUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${resolvedGid}`;

        const res = await fetch(exportUrl, {
            headers: {
                'User-Agent': 'CitioxCatalogImporter/1.0'
            },
            signal: AbortSignal.timeout(12000)
        });

        if (!res.ok) {
            if (res.status === 404) {
                throw new Error('No se encontró el documento de Google Sheets. Verifica el enlace.');
            }
            if (res.status === 401 || res.status === 403) {
                throw new Error('Acceso denegado a Google Sheets. Asegúrate de que el documento esté compartido como "Cualquier persona con el enlace puede ver".');
            }
            throw new Error(`Error al consultar Google Sheets (${res.status} ${res.statusText})`);
        }

        const csvText = await res.text();
        const parsed = this.parseCSV(csvText);

        return {
            spreadsheetId,
            columns: parsed.columns,
            rows: parsed.rows
        };
    }
}
