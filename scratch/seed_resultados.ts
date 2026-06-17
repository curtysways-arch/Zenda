
import * as dotenv from 'dotenv';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
    console.error('DATABASE_URL not found');
    process.exit(1);
}

let finalUrl = dbUrl;
if (dbUrl.startsWith('file:')) {
    const relativePath = dbUrl.replace('file:', '');
    const absolutePath = path.resolve(process.cwd(), relativePath).replace(/\\/g, '/');
    if (absolutePath.match(/^[a-zA-Z]:/)) {
        finalUrl = `file:///${absolutePath}`;
    } else {
        finalUrl = `file://${absolutePath}`;
    }
}

const adapter = new PrismaLibSql({ url: finalUrl });
const prisma = new PrismaClient({ adapter });

async function main() {
    const businessId = "cmnpcm84s00002cw58bnwkqb0";
    const serviceId = "cmnpfn4zl000pmkw54v5mhgsw";
    const staffId = "cmnpfpuhp0019mkw5xg21zsvf";

    const resultados = [
        {
            businessId,
            serviceId,
            staffId,
            title: "Balayage Rubio Ceniza",
            description: "Transformación completa de color con técnica de balayage para un acabado natural y luminoso.",
            type: "BEFORE_AFTER",
            beforeImage: "https://images.unsplash.com/photo-1522337660859-02fbefad157b?auto=format&fit=crop&q=80&w=600",
            afterImage: "https://images.unsplash.com/photo-1560869713-7d0a29430803?auto=format&fit=crop&q=80&w=600",
            featured: true,
            published: true,
            showInLanding: true,
            clientName: "Laura G.",
            date: new Date()
        },
        {
            businessId,
            serviceId,
            staffId,
            title: "Corte Bob Desfilado",
            description: "Un estilo moderno y fresco que resalta las facciones, ideal para cabellos finos.",
            type: "BEFORE_AFTER",
            beforeImage: "https://images.unsplash.com/photo-1595476108010-b4d1f102b1b1?auto=format&fit=crop&q=80&w=600",
            afterImage: "https://images.unsplash.com/photo-1620331311520-246422fd82f9?auto=format&fit=crop&q=80&w=600",
            featured: false,
            published: true,
            showInLanding: true,
            clientName: "Ana M.",
            date: new Date()
        },
        {
            businessId,
            serviceId,
            staffId,
            title: "Galería de Peinados para Novias",
            description: "Colección de estilos recogidos y semi-recogidos realizados durante la temporada de bodas.",
            type: "GALLERY",
            gallery: [
                "https://images.unsplash.com/photo-1519735810596-a95ad0552588?auto=format&fit=crop&q=80&w=600",
                "https://images.unsplash.com/photo-1522337363627-5beeaf5a0d9c?auto=format&fit=crop&q=80&w=600",
                "https://images.unsplash.com/photo-1519415510236-8557bada8b0d?auto=format&fit=crop&q=80&w=600"
            ],
            featured: true,
            published: true,
            showInLanding: true,
            clientName: "Varios Clientes",
            date: new Date()
        }
    ];

    console.log('🌱 Sembrando ejemplos de resultados...');
    for (const res of resultados) {
        try {
            await prisma.resultado.create({ data: res });
            console.log(`✅ Creado: ${res.title}`);
        } catch (e) {
            console.error(`❌ Error creando ${res.title}:`, e);
        }
    }
    console.log('✨ Seed completado.');
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
