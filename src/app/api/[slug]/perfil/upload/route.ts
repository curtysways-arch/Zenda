import { NextResponse } from 'next/server';
import { jwtVerify } from "jose";
import { cookies } from "next/headers";
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export async function POST(
    req: Request,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const { slug } = await params;
        const cookieStore = await cookies();
        const token = cookieStore.get("customer_token")?.value;

        if (!token) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || "default_otp_secret_key_change_me");

        try {
            await jwtVerify(token, secret);
        } catch (e) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No se subió ningún archivo' }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());

        // Determinar la ruta de guardado
        const publicDir = path.join(process.cwd(), 'public');
        const uploadDir = path.join(publicDir, 'uploads', 'profiles');

        // Intentar crear los directorios si no existen
        try {
            await mkdir(uploadDir, { recursive: true });
        } catch (e) { }

        const filename = `${uuidv4()}-${file.name.replace(/\s+/g, '-')}`;
        const filePath = path.join(uploadDir, filename);

        await writeFile(filePath, buffer);

        // Devolver la URL pública
        const url = `/uploads/profiles/${filename}`;

        return NextResponse.json({ url });
    } catch (error) {
        console.error('[PROFILE_UPLOAD_ERROR]', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
