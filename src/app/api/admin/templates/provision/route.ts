// src/app/api/admin/templates/provision/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { BusinessProvisioningService } from '@/core/services/BusinessProvisioningService';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !(session.user as any)?.negocioId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const negocioId = (session.user as any).negocioId;
    const body = await request.json();
    const { templateId } = body;

    if (!templateId) {
      return NextResponse.json({ error: 'Falta templateId' }, { status: 400 });
    }

    const result = await BusinessProvisioningService.provisionTemplate(negocioId, templateId);

    return NextResponse.json({
      success: true,
      message: 'Plantilla aprovisionada correctamente en 1-Click',
      data: result,
    });
  } catch (error: any) {
    console.error('Error provisioning template:', error);
    return NextResponse.json({ error: error.message || 'Error al aprovisionar la plantilla' }, { status: 500 });
  }
}
