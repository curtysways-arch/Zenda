import { NextResponse } from "next/server";

export async function POST(
    req: Request,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const response = NextResponse.json({ success: true, message: "Sesión cerrada correctamente" });

        // Limpiar la cookie de sesión del cliente
        response.cookies.set("customer_token", "", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 0, // Expira inmediatamente
            path: "/",
        });

        return response;
    } catch (error) {
        return NextResponse.json({ error: "Ocurrió un error al cerrar sesión" }, { status: 500 });
    }
}
