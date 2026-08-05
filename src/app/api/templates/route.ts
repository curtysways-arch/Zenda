// src/app/api/templates/route.ts
import { NextResponse } from 'next/server';
import { TEMPLATE_REGISTRY } from '@/core/templates/templatesRegistry';

export async function GET() {
  try {
    const templates = Object.values(TEMPLATE_REGISTRY);
    return NextResponse.json({
      success: true,
      templates,
    });
  } catch (error: any) {
    console.error('Error fetching template registry:', error);
    return NextResponse.json({ error: 'Error al obtener plantillas' }, { status: 500 });
  }
}
