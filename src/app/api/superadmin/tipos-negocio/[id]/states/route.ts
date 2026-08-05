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
    const { states } = body;

    if (!Array.isArray(states)) {
      return NextResponse.json({ error: 'La lista de estados no es válida' }, { status: 400 });
    }

    // Reemplazar la lista de estados dentro de una transacción Prisma
    await prisma.$transaction(async (tx) => {
      // Eliminar estados anteriores
      await tx.businessTypeState.deleteMany({
        where: { businessTypeId: id }
      });

      // Crear nuevos estados
      for (let index = 0; index < states.length; index++) {
        const st = states[index];
        await tx.businessTypeState.create({
          data: {
            businessTypeId: id,
            name: st.name,
            slug: st.slug || st.name.toLowerCase().replace(/[^a-z0-9]/g, '_'),
            color: st.color || "#6366f1",
            icon: st.icon || "Circle",
            tipo: st.tipo || "NORMAL",
            sortOrder: st.sortOrder !== undefined ? st.sortOrder : index + 1,
            transitions: st.transitions ? JSON.stringify(st.transitions) : null
          }
        });
      }
    });

    const updatedStates = await prisma.businessTypeState.findMany({
      where: { businessTypeId: id },
      orderBy: { sortOrder: 'asc' }
    });

    return NextResponse.json(updatedStates);
  } catch (error) {
    console.error('Error actualizando estados del tipo de negocio:', error);
    return NextResponse.json({ error: 'Error al guardar estados' }, { status: 500 });
  }
}
