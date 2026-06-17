import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { planLimitValidator } from "@/lib/services/planLimitValidator";

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    const negocioId = (session?.user as any)?.negocioId;

    if (!negocioId) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const feature = searchParams.get('feature');

    let validation: { allowed: boolean; message?: string } = { allowed: true, message: "" };

    switch (feature) {
        case 'tournaments':
            validation = await planLimitValidator.canAccessTournaments(negocioId);
            break;
        case 'locations':
            validation = await planLimitValidator.canCreateLocation(negocioId);
            break;
        case 'fields':
            validation = await planLimitValidator.canCreateField(negocioId);
            break;
        case 'reservations':
            validation = await planLimitValidator.canCreateReservation(negocioId);
            break;
        case 'courses':
            validation = await planLimitValidator.canAccessCourses(negocioId);
            break;
        case 'automatic-discounts':
            validation = await planLimitValidator.canAccessAutomaticDiscounts(negocioId);
            break;
        default:
            return NextResponse.json({ error: "Feature no especificada" }, { status: 400 });
    }

    return NextResponse.json(validation);
}
