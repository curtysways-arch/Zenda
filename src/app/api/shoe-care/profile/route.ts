import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const negocioId = searchParams.get('negocioId') || 'sneaker-wash-id';

    const negocio = await prisma.negocio.findUnique({
      where: { id: negocioId }
    });

    return NextResponse.json(negocio);
  } catch (error) {
    console.error('Error fetching business profile:', error);
    return NextResponse.json({ error: 'Error al obtener perfil' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { 
      negocioId = 'sneaker-wash-id',
      nombre,
      logoUrl,
      colorPrimario,
      colorSecundario,
      heroTitulo,
      heroSubtitulo,
      horarioApertura,
      horarioCierre,
      direccion,
      whatsapp
    } = body;

    const updated = await prisma.negocio.update({
      where: { id: negocioId },
      data: {
        ...(nombre && { nombre }),
        ...(logoUrl !== undefined && { logoUrl }),
        ...(colorPrimario && { colorPrimario }),
        ...(colorSecundario && { colorSecundario }),
        ...(heroTitulo !== undefined && { heroTitulo }),
        ...(heroSubtitulo !== undefined && { heroSubtitulo }),
        ...(horarioApertura && { horarioApertura }),
        ...(horarioCierre && { horarioCierre }),
        ...(direccion !== undefined && { direccion }),
        ...(whatsapp !== undefined && { whatsapp }),
        updatedAt: new Date()
      }
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating business profile:', error);
    return NextResponse.json({ error: 'Error al actualizar perfil del negocio' }, { status: 500 });
  }
}
