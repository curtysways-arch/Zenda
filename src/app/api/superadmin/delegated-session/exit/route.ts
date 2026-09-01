import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { destroyDelegatedSession, getDelegatedSession, logDelegatedAudit } from '@/lib/delegatedAuth';

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        const { payload } = await getDelegatedSession();

        const user = session?.user as any;
        const adminUserId = user?.id || payload?.superadminId || 'SUPERADMIN';
        const targetBusinessId = payload?.targetBusinessId;

        const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1';

        // Destruir cookie de delegación
        await destroyDelegatedSession();

        // Registrar auditoría de cierre de delegación
        if (adminUserId) {
            await logDelegatedAudit({
                adminUserId,
                accion: 'DELEGATED_ADMIN_ACCESS_ENDED',
                targetBusinessId,
                descripcion: `Salida de la sesión delegada del negocio (${targetBusinessId || 'desconocido'}) por el SuperAdmin`,
                ipAddress: ip,
            });
        }

        return NextResponse.json({
            success: true,
            redirectUrl: '/superadmin',
        });
    } catch (error: any) {
        console.error('Error al salir de la sesión delegada:', error);
        return NextResponse.json(
            { error: 'Error al finalizar la sesión delegada' },
            { status: 500 }
        );
    }
}
