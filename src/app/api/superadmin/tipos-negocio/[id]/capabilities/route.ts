import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export const dynamic = 'force-dynamic';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role;
    const roles = (session?.user as any)?.roles || [];
    const isSuper = role === 'SUPERADMIN' || role === 'SUPER_ADMIN' || role === 'ADMIN' || roles.includes('SUPERADMIN') || (session?.user as any)?.isAdminUser;

    if (!session || !isSuper) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { capabilities } = body; // Array de strings: ['booking', 'crm', etc]

    if (!Array.isArray(capabilities)) {
      return NextResponse.json({ error: 'Lista de capabilities no válida' }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.businessTypeCapability.deleteMany({
        where: { businessTypeId: id }
      });

      for (const cap of capabilities) {
        await tx.businessTypeCapability.create({
          data: {
            businessTypeId: id,
            capability: cap,
            active: true
          }
        });
      }
    });

    const updatedCaps = await prisma.businessTypeCapability.findMany({
      where: { businessTypeId: id }
    });

    return NextResponse.json(updatedCaps);
  } catch (error) {
    console.error('Error actualizando capabilities:', error);
    return NextResponse.json({ error: 'Error al actualizar capabilities' }, { status: 500 });
  }
}
