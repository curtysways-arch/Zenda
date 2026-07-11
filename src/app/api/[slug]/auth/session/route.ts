import { NextResponse } from "next/server";
import { cookies } from "next/headers";

/**
 * GET /api/[slug]/auth/session
 * Verifica si hay sesión activa del cliente y setea la cookie cs=1 si corresponde.
 * Esta ruta existe para que el JS del cliente pueda sincronizar el estado de sesión
 * cuando el customer_token es httpOnly (no accesible desde JS directamente).
 */
export async function GET(
    req: Request,
    { params }: { params: Promise<{ slug: string }> }
) {
    const cookieStore = await cookies();
    const token = cookieStore.get("customer_token")?.value;
    const hasSession = !!token;

    const response = NextResponse.json({ active: hasSession });

    if (hasSession) {
        // Renovar cookie de señal para JS cliente
        response.cookies.set("cs", "1", {
            httpOnly: false,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 60 * 60 * 24,
            path: "/",
        });
    } else {
        // Limpiar si no hay sesión
        response.cookies.set("cs", "", {
            httpOnly: false,
            maxAge: 0,
            path: "/",
        });
    }

    return response;
}
