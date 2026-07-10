import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { GLOBAL_QUEST_TEMPLATES } from '@/lib/growth/globalTemplates';

/**
 * Retorna la biblioteca global de plantillas de misiones del SuperAdmin (Marketplace).
 */
export async function GET() {
    try {
        // 1. Validar autenticación de administrador
        const session = await getServerSession(authOptions);
        
        if (!(session?.user as any)?.id) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        // Retornar las plantillas del Marketplace
        return NextResponse.json({
            success: true,
            templates: GLOBAL_QUEST_TEMPLATES
        });

    } catch (err: any) {
        console.error('[Misiones-TemplatesAPI] Error:', err.message);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
