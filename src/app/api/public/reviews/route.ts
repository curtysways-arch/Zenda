import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { productoId, autor, rating, comentario } = body;

        if (!productoId || !autor || !comentario) {
            return NextResponse.json(
                { error: "El producto, tu nombre y tu comentario son obligatorios." },
                { status: 400 }
            );
        }

        const califNumber = Math.min(5, Math.max(1, parseInt(rating) || 5));
        const cleanAutor = String(autor).trim().slice(0, 50);
        const cleanComentario = String(comentario).trim().slice(0, 500);

        const producto = await (prisma as any).producto.findUnique({
            where: { id: productoId },
            select: { id: true, extraInfo: true }
        });

        if (!producto) {
            return NextResponse.json({ error: "Producto no encontrado." }, { status: 404 });
        }

        let extra: any = {};
        if (producto.extraInfo && typeof producto.extraInfo === "object") {
            extra = { ...producto.extraInfo };
        }

        const currentRc = extra.resenasConfig && typeof extra.resenasConfig === "object"
            ? extra.resenasConfig
            : { rating: 5.0, totalOpiniones: 0, reviews: [] };

        const currentReviews = Array.isArray(currentRc.reviews) ? [...currentRc.reviews] : [];

        const newReview = {
            autor: cleanAutor,
            calif: califNumber,
            comentario: cleanComentario,
            fecha: new Date().toISOString(),
            verificada: true
        };

        // Insertar al inicio de las opiniones
        currentReviews.unshift(newReview);

        // Recalcular promedio de estrellas
        const totalReviewsCount = currentReviews.length;
        const sumRatings = currentReviews.reduce((acc: number, r: any) => acc + (Number(r.calif) || 5), 0);
        const newRating = Number((sumRatings / totalReviewsCount).toFixed(1));

        extra.resenasConfig = {
            rating: newRating,
            totalOpiniones: Math.max(totalReviewsCount, (currentRc.totalOpiniones || 0) + 1),
            reviews: currentReviews
        };

        await (prisma as any).producto.update({
            where: { id: productoId },
            data: { extraInfo: extra }
        });

        return NextResponse.json({
            success: true,
            message: "¡Gracias! Tu opinión ha sido publicada.",
            review: newReview,
            resenasConfig: extra.resenasConfig
        });
    } catch (error: any) {
        console.error("Error al publicar reseña pública:", error);
        return NextResponse.json({ error: "Error al procesar la opinión." }, { status: 500 });
    }
}
