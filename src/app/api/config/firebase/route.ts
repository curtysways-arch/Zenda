import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const configs = await (prisma as any).globalConfig.findMany({
            where: {
                clave: {
                    startsWith: 'NEXT_PUBLIC_FIREBASE_'
                }
            }
        });

        const configMap = configs.reduce((acc: any, curr: any) => {
            acc[curr.clave] = curr.valor;
            return acc;
        }, {});

        return NextResponse.json(configMap);
    } catch (error) {
        return NextResponse.json({ error: "Error fetch config" }, { status: 500 });
    }
}
