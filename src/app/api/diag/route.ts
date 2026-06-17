import { NextResponse } from 'next/server';

export async function GET() {
    return NextResponse.json({
        has_db_url: !!process.env.DATABASE_URL,
        db_url_start: process.env.DATABASE_URL?.substring(0, 10),
        node_env: process.env.NODE_ENV
    });
}
