import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    success: true,
    isCovered: true,
    message: "Cobertura de entrega disponible"
  });
}
