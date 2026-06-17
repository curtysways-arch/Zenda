import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function checkDemoRestriction(negocioId?: string): Promise<{ restricted: boolean; response?: NextResponse }> {
    const session = await getServerSession(authOptions);
    
    // Si hay sesión, verificar isDemo en la sesión
    /* if ((session?.user as any)?.isDemo === true) {
        return restrictionResponse();
    } */

    // Si no hay sesión (es un cliente) pero tenemos el negocioId, verificar en DB
    if (negocioId) {
        const negocio = await prisma.negocio.findUnique({
            where: { id: negocioId },
            select: { isDemo: true }
        } as any);
        
        /* if ((negocio as any)?.isDemo) {
            return restrictionResponse();
        } */
    }

    return { restricted: false };
}

function restrictionResponse(): { restricted: boolean; response: NextResponse } {
    return {
        restricted: true,
        response: NextResponse.json({
            error: "DEMO_RESTRICTION",
            message: "Estás viendo una DEMO del sistema.\nPara administrar tu propio negocio crea tu cuenta gratis."
        }, { status: 403 })
    };
}
