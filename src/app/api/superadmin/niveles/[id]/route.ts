import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { LevelResolver } from '@/lib/growth/levelResolver';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.globalLevel.delete({
      where: { id }
    });

    LevelResolver.invalidateCache();

    return NextResponse.json({ success: true, message: 'Nivel global eliminado correctamente' });
  } catch (error: any) {
    console.error('[API Superadmin Niveles DELETE] Error:', error.message);
    return NextResponse.json({ error: 'Error al eliminar nivel' }, { status: 500 });
  }
}
