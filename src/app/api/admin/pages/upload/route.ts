import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return new NextResponse('Unauthorized', { status: 401 });

        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No se subió ningún archivo' }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());

        // Determinar la ruta de guardado
        const publicDir = path.join(process.cwd(), 'public');
        const uploadDir = path.join(publicDir, 'uploads', 'pages');

        // Intentar crear los directorios si no existen
        try {
            await mkdir(uploadDir, { recursive: true });
        } catch (e) { }

        const filename = `${uuidv4()}-${file.name.replace(/\s+/g, '-')}`;
        const filePath = path.join(uploadDir, filename);

        await writeFile(filePath, buffer);

        // Devolver la URL pública
        const url = `/uploads/pages/${filename}`;

        return NextResponse.json({ url });
    } catch (error) {
        console.error('[UPLOAD_ERROR]', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
