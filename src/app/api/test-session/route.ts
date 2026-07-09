import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    return NextResponse.json({
        session,
        headers: Object.fromEntries(req.headers.entries())
    });
}
