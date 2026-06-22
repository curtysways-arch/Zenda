import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import planLimitValidator from "@/lib/planLimitValidator";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const negocioId = (session.user as any).negocioId;

    // Validar plan
    const validation = await planLimitValidator.canAccessCourses(negocioId);
    if (!validation.allowed) {
      return NextResponse.json(
        { error: validation.message },
        { status: 403 }
      );
    }

    const body = await req.json();

    const {
      name,
      description,
      imageUrl,
      imageMediaId,
      min_age,
      max_age,
      coach,
      price,
      payment_type,
      capacity,
      status,
      start_date,
      end_date,
      content,
      instructor_id,
    } = body;

    // Validación mínima
    if (!name || price === undefined || !payment_type || capacity === undefined) {
      return NextResponse.json(
        { error: "Faltan campos obligatorios" },
        { status: 400 }
      );
    }

    // Helpers seguros
    const toInt = (v: any) =>
      v === null || v === undefined || v === "" ? null : Number(v);

    const toFloat = (v: any) =>
      v === null || v === undefined || v === "" ? null : Number(v);

    const safeDate = (d: any) =>
      d && d !== "" ? new Date(d) : null;

    // Crear curso
    const course = await prisma.course.create({
      data: {
        name,
        description: description || null,
        imageUrl: imageUrl || null,
        imageMediaId: imageMediaId || null,

        min_age: toInt(min_age),
        max_age: toInt(max_age),

        coach: coach || null,

        price: toFloat(price),
        payment_type,

        capacity: toInt(capacity),

        status: status || "active",

        start_date: safeDate(start_date),
        end_date: safeDate(end_date),

        content: content || null,

        // 🔥 FIX IMPORTANTE PRISMA RELATION
        business: {
          connect: {
            id: negocioId,
          },
        },

        instructor_id: instructor_id || null,
      },
    });

    return NextResponse.json(course);
  } catch (error: any) {
    console.error("Error creando curso:", error);

    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
