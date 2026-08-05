import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    activa: true,
    mensaje: "Retiramos y entregamos tus zapatos dentro de nuestra zona de cobertura.",
    poligono: [
      [-0.170, -78.485],
      [-0.150, -78.470],
      [-0.160, -78.440],
      [-0.200, -78.450],
      [-0.220, -78.480],
      [-0.190, -78.500]
    ]
  });
}
