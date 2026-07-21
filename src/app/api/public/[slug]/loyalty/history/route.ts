import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const { slug } = await params;
        const cookieStore = await cookies();
        const token = cookieStore.get("customer_token")?.value;

        if (!token) {
            return NextResponse.json({ error: "Sesión no válida o expirada" }, { status: 401 });
        }

        const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || "default_otp_secret_key_change_me");
        let payload;
        try {
            const verification = await jwtVerify(token, secret);
            payload = verification.payload;
        } catch (e) {
            return NextResponse.json({ error: "Sesión expirada" }, { status: 401 });
        }

        const phone = payload.telefono as string;
        const negocioId = payload.negocioId as string;

        // Variaciones del teléfono para máxima compatibilidad
        const localTelefono = phone.replace(/^\+(\d{1,4})/, ''); 
        const digitsOnly = phone.replace(/\D/g, ''); 
        const localNoZero = localTelefono.replace(/^0+/, '');

        // Buscar el usuario con soporte de múltiples formatos
        const user = await prisma.usuario.findFirst({
            where: {
                OR: [
                    { phone: phone },
                    { phone: localTelefono },
                    { phone: digitsOnly },
                    { phone: { endsWith: localNoZero } }
                ]
            }
        });

        if (!user) {
            return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
        }

        // Consultar el historial completo de puntos
        const history = await prisma.pointsHistory.findMany({
            where: {
                userId: user.id,
                negocioId: negocioId
            },
            orderBy: {
                createdAt: "desc"
            }
        });

        // Mapear conceptos para que se vean más amigables
        const mappedHistory = history.map(item => {
            let label = "Bono de lealtad";
            let color = "indigo"; // color por defecto
            
            switch (item.concepto) {
                case "RESERVA":
                    label = "Cita completada";
                    color = "emerald";
                    break;
                case "REFERIDO":
                    label = "Amigo recomendado";
                    color = "purple";
                    break;
                case "CUMPLEANOS":
                    label = "Bono de cumpleaños";
                    color = "amber";
                    break;
                case "QUEST_COMPLETED":
                    label = "Misión completada";
                    color = "pink";
                    break;
                case "CANJE":
                    label = "Canje de premio";
                    color = "rose";
                    break;
                case "AJUSTE":
                    label = "Ajuste administrativo";
                    color = "slate";
                    break;
            }

            return {
                id: item.id,
                puntos: item.puntos,
                concepto: item.concepto,
                label,
                color,
                notas: item.notas || "",
                fecha: item.createdAt
            };
        });

        return NextResponse.json({ success: true, history: mappedHistory });
    } catch (error: any) {
        console.error("Error in public/loyalty/history:", error);
        return NextResponse.json({ error: "Internal Error", details: error.message }, { status: 500 });
    }
}
