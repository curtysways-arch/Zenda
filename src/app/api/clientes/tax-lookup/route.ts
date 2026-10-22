import { NextResponse } from 'next/server';
import { getEffectiveAdminSession } from '@/lib/delegatedAuth';
import { CustomerEngine } from '@/core/customers/CustomerEngine';
import { TipoIdentificacion } from '@/core/customers/TaxPayerTypes';

export async function POST(req: Request) {
  try {
    const session = await getEffectiveAdminSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const negocioId = (session.user as any).negocioId;
    if (!negocioId) {
      return NextResponse.json({ error: 'Sin negocio asociado' }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const { identificacion, tipoIdentificacion } = body;

    if (!identificacion) {
      return NextResponse.json(
        { error: 'El número de identificación es requerido' },
        { status: 400 }
      );
    }

    const result = await CustomerEngine.lookupCustomerTax(
      negocioId,
      identificacion,
      tipoIdentificacion as TipoIdentificacion
    );

    return NextResponse.json({
      success: true,
      ...result
    });
  } catch (error: any) {
    console.error('[API /api/clientes/tax-lookup] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Error en la búsqueda tributaria' },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const session = await getEffectiveAdminSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const negocioId = (session.user as any).negocioId;
    if (!negocioId) {
      return NextResponse.json({ error: 'Sin negocio asociado' }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const identificacion = searchParams.get('identificacion') || searchParams.get('q');
    const tipoIdentificacion = searchParams.get('tipo') as TipoIdentificacion | undefined;

    if (!identificacion) {
      return NextResponse.json(
        { error: 'El número de identificación es requerido' },
        { status: 400 }
      );
    }

    const result = await CustomerEngine.lookupCustomerTax(
      negocioId,
      identificacion,
      tipoIdentificacion
    );

    return NextResponse.json({
      success: true,
      ...result
    });
  } catch (error: any) {
    console.error('[API /api/clientes/tax-lookup GET] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Error en la búsqueda tributaria' },
      { status: 500 }
    );
  }
}
