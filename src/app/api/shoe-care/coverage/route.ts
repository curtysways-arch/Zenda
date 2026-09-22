import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    activa: false,
    mensaje: "Cobertura amplia para retiro a domicilio.",
    poligono: []
  });
}
