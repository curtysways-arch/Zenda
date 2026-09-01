import { NextResponse } from 'next/server';
import { seedStoreDemo } from '../../../../../prisma/seed_store_demo';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const result = await seedStoreDemo();
        return NextResponse.json({
            success: true,
            message: 'Tienda Demo "Citiox Urban Store" sembrada exitosamente.',
            data: result
        });
    } catch (error: any) {
        console.error('[SEED_STORE_ERROR]', error);
        return NextResponse.json({ error: error.message || 'Error al sembrar la tienda demo' }, { status: 500 });
    }
}
