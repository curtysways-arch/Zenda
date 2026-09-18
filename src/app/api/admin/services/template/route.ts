import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import * as XLSX from 'xlsx';

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const format = searchParams.get('format') || 'xlsx';

    const sampleServices = [
        {
            'Nombre': 'Hidratación Facial con Colágeno',
            'Duracion (min)': 45,
            'Precio': 35.00,
            'Categoria': 'Tratamientos Faciales',
            'Descripcion': 'Tratamiento intensivo con colágeno para revitalizar, hidratar y aportar elasticidad a la piel.',
            'Imagen': 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=800',
            'Activo': 'SI'
        },
        {
            'Nombre': 'Masaje Relajante Corporal con Aromaterapia',
            'Duracion (min)': 60,
            'Precio': 50.00,
            'Categoria': 'Masajes & Terapias',
            'Descripcion': 'Sesión relajante de cuerpo completo con aceites esenciales para aliviar la fatiga y el estrés.',
            'Imagen': 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800',
            'Activo': 'SI'
        },
        {
            'Nombre': 'Limpieza Facial Profunda',
            'Duracion (min)': 60,
            'Precio': 45.00,
            'Categoria': 'Tratamientos Faciales',
            'Descripcion': 'Exfoliación, vaporización, extracción suave de impurezas y mascarilla calmante.',
            'Imagen': 'https://images.unsplash.com/photo-1512290900672-1f551b9e248b?w=800',
            'Activo': 'SI'
        },
        {
            'Nombre': 'Exfoliación y Envoltura Corporal',
            'Duracion (min)': 50,
            'Precio': 40.00,
            'Categoria': 'Tratamientos Corporales',
            'Descripcion': 'Renovación de células muertas con sales minerales y envoltura hidratante nutritiva.',
            'Imagen': 'https://images.unsplash.com/photo-1519823551278-64ac92734fb1?w=800',
            'Activo': 'SI'
        },
        {
            'Nombre': 'Masaje Descontracturante de Espalda',
            'Duracion (min)': 40,
            'Precio': 35.00,
            'Categoria': 'Masajes & Terapias',
            'Descripcion': 'Técnica terapéutica con presión media-alta para soltar contracturas cervicales y lumbares.',
            'Imagen': 'https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?w=800',
            'Activo': 'SI'
        }
    ];

    const instructionsData = [
        {
            'Columna': 'Nombre',
            'Obligatorio': 'SÍ',
            'Descripción': 'Nombre del servicio visible para los clientes (ej: Masaje Relajante, Limpieza Facial).'
        },
        {
            'Columna': 'Duracion (min)',
            'Obligatorio': 'SÍ',
            'Descripción': 'Tiempo estimado en minutos que toma el servicio (ej: 30, 45, 60, 90). Si se deja vacío, tomará 60.'
        },
        {
            'Columna': 'Precio',
            'Obligatorio': 'SÍ',
            'Descripción': 'Precio en dólares (ej: 35.00 o 50). Solo números con punto o coma decimal.'
        },
        {
            'Columna': 'Categoria',
            'Obligatorio': 'RECOMENDADO',
            'Descripción': 'Grupo o categoría del servicio (ej: Faciales, Masajes, Peluquería, Uñas).'
        },
        {
            'Columna': 'Descripcion',
            'Obligatorio': 'OPCIONAL',
            'Descripción': 'Detalle de los beneficios o procedimiento del servicio.'
        },
        {
            'Columna': 'Imagen',
            'Obligatorio': 'OPCIONAL',
            'Descripción': 'Enlace web (URL https://...) de la fotografía del servicio o imagen de Google Drive.'
        },
        {
            'Columna': 'Activo',
            'Obligatorio': 'OPCIONAL',
            'Descripción': 'Escribe "SI" para que esté visible inmediatamente para agendamiento, o "NO" para guardarlo inactivo.'
        }
    ];

    const filenameBase = 'plantilla_servicios_citiox';

    if (format === 'csv') {
        const worksheet = XLSX.utils.json_to_sheet(sampleServices);
        const csvOutput = XLSX.utils.sheet_to_csv(worksheet, { FS: ',' });
        return new NextResponse(csvOutput, {
            status: 200,
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename="${filenameBase}.csv"`
            }
        });
    }

    const workbook = XLSX.utils.book_new();
    const dataSheet = XLSX.utils.json_to_sheet(sampleServices);
    const instructionsSheet = XLSX.utils.json_to_sheet(instructionsData);

    dataSheet['!cols'] = [
        { wch: 38 }, // Nombre
        { wch: 16 }, // Duración
        { wch: 12 }, // Precio
        { wch: 25 }, // Categoría
        { wch: 60 }, // Descripción
        { wch: 45 }, // Imagen
        { wch: 10 }  // Activo
    ];

    instructionsSheet['!cols'] = [
        { wch: 20 },
        { wch: 16 },
        { wch: 75 }
    ];

    XLSX.utils.book_append_sheet(workbook, dataSheet, 'Servicios');
    XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'Instrucciones');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(buffer, {
        status: 200,
        headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="${filenameBase}.xlsx"`
        }
    });
}
