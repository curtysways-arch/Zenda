import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const { slug } = await params;
        const userId = '3c5c60ea-670e-4b23-b2c4-07d8de2bdcb2';
        const negocioId = 'bceea0c8-e464-4a9e-b944-dd8bcef8f179'; // demo-spa

        const pointsRecord = await (prisma as any).userPoints.findUnique({
            where: { userId_negocioId: { userId, negocioId } }
        });

        const puntos = pointsRecord?.puntos ?? 0;
        const cashback = pointsRecord?.cashback ?? 0;

        const html = `
            <html>
                <head>
                    <title>Diagnostico de Saldo - Carlos Caicedo</title>
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <style>
                        body {
                            font-family: system-ui, -apple-system, sans-serif;
                            background: #0f172a;
                            color: #f1f5f9;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            min-height: 100vh;
                            margin: 0;
                        }
                        .card {
                            background: #1e293b;
                            border: 1px solid #334155;
                            border-radius: 24px;
                            padding: 40px;
                            text-align: center;
                            box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.5);
                            max-width: 90%;
                            width: 400px;
                        }
                        h1 {
                            font-size: 20px;
                            color: #94a3b8;
                            margin: 0 0 20px 0;
                            text-transform: uppercase;
                            letter-spacing: 0.1em;
                        }
                        .value {
                            font-size: 64px;
                            font-weight: 800;
                            color: #10b981;
                            margin: 10px 0;
                        }
                        .label {
                            color: #64748b;
                            font-size: 14px;
                            margin-bottom: 30px;
                        }
                        .details {
                            font-size: 12px;
                            color: #94a3b8;
                            border-top: 1px solid #334155;
                            padding-top: 20px;
                            text-align: left;
                        }
                    </style>
                </head>
                <body>
                    <div class="card">
                        <h1>Saldo Cashback Real</h1>
                        <div class="value">$${Number(cashback).toFixed(2)}</div>
                        <div class="label">Registrado en el Servidor</div>
                        
                        <div class="details">
                            <strong>Usuario:</strong> Carlos Caicedo<br>
                            <strong>ID:</strong> ${userId}<br>
                            <strong>Diamantes:</strong> ${puntos} 💎<br>
                            <strong>Negocio Slug:</strong> ${slug}<br>
                            <strong>Actualizado:</strong> ${new Date().toLocaleString()}
                        </div>
                    </div>
                </body>
            </html>
        `;

        return new NextResponse(html, {
            headers: {
                "Content-Type": "text/html; charset=utf-8",
                "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate"
            }
        });
    } catch (e: any) {
        return new NextResponse(`Error en diagnóstico: ${e.message}`, { status: 500 });
    }
}
