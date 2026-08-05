import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const tipos = await prisma.businessType.findMany({
      where: { active: true },
      include: {
        capabilities: { where: { active: true } },
        states: { orderBy: { sortOrder: 'asc' } },
        profiles: { where: { active: true }, orderBy: { sortOrder: 'asc' } }
      },
      orderBy: { sortOrder: 'asc' }
    });

    return NextResponse.json(tipos);
  } catch (error) {
    console.error('Error fetching public business types:', error);
    return NextResponse.json({ error: 'Error obteniendo tipos de negocio' }, { status: 500 });
  }
}
