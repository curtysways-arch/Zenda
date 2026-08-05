import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export const dynamic = 'force-dynamic';

async function checkAuth() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  const roles = (session?.user as any)?.roles || [];
  const isSuper = role === 'SUPERADMIN' || role === 'SUPER_ADMIN' || role === 'ADMIN' || roles.includes('SUPERADMIN') || (session?.user as any)?.isAdminUser;
  return { session, isSuper };
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const profiles = await prisma.businessProfile.findMany({
      where: { businessTypeId: id },
      orderBy: { sortOrder: 'asc' }
    });
    return NextResponse.json(profiles);
  } catch (error) {
    console.error('Error fetching profiles:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session, isSuper } = await checkAuth();
    if (!session || !isSuper) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { name, description, icon, settingsOverride } = body;

    if (!name) {
      return NextResponse.json({ error: 'El nombre del perfil es requerido' }, { status: 400 });
    }

    const nuevoPerfil = await prisma.businessProfile.create({
      data: {
        businessTypeId: id,
        name,
        description: description || null,
        icon: icon || "Star",
        settingsOverride: settingsOverride || null
      }
    });

    return NextResponse.json(nuevoPerfil, { status: 201 });
  } catch (error) {
    console.error('Error creando perfil:', error);
    return NextResponse.json({ error: 'Error al crear perfil' }, { status: 500 });
  }
}
