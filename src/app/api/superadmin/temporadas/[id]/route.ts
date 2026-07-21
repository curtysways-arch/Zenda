import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.globalSeason.delete({
      where: { id }
    });

    return NextResponse.json({ success: true, message: 'Temporada global eliminada correctamente' });
  } catch (error: any) {
    console.error('[API Superadmin Temporadas DELETE] Error:', error.message);
    return NextResponse.json({ error: 'Error al eliminar temporada' }, { status: 500 });
  }
}
