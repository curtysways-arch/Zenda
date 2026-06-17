import prisma from './prisma';
import { randomUUID } from 'crypto';

async function main() {
    const negocio = await prisma.negocio.findUnique({
        where: { slug: 'demo-spa' }
    });

    if (!negocio) {
        console.log('Negocio demo-spa no encontrado');
        await prisma.$disconnect();
        return;
    }

    console.log('Negocio encontrado:', negocio.id);

    // Verificar páginas existentes
    const existingPages = await prisma.page.findMany({
        where: { businessId: negocio.id }
    });
    console.log('Páginas existentes:', existingPages.length);
    existingPages.forEach(p => console.log(`  - "${p.title}" (${p.status}) slug: ${p.slug}`));

    if (existingPages.length === 0) {
        // Crear una página demo
        const page = await prisma.page.create({
            data: {
                id: randomUUID(),
                updatedAt: new Date(),
                title: 'Nuestra Filosofía de Bienestar',
                slug: 'nuestra-filosofia',
                status: 'published',
                contentHtml: `
                    <h2>Descubre el Arte del Bienestar</h2>
                    <p>En nuestro spa, cada tratamiento es una experiencia transformadora diseñada para restaurar el equilibrio entre cuerpo y mente. Nuestro equipo de profesionales certificados utiliza técnicas ancestrales combinadas con la última tecnología en cuidado personal.</p>
                    
                    <blockquote>El verdadero lujo es tomarse el tiempo para cuidar de uno mismo. Cada sesión en nuestro spa es una invitación a reconectar con tu esencia.</blockquote>
                    
                    <h3>Nuestros Pilares</h3>
                    <ul>
                        <li><strong>Excelencia:</strong> Solo utilizamos productos premium de origen natural, seleccionados cuidadosamente para garantizar resultados visibles.</li>
                        <li><strong>Personalización:</strong> Cada cliente es único. Diseñamos tratamientos a medida según tus necesidades específicas.</li>
                        <li><strong>Innovación:</strong> Constantemente actualizamos nuestras técnicas y equipamiento para ofrecerte lo mejor de la industria.</li>
                        <li><strong>Ambiente:</strong> Nuestros espacios están diseñados para transportarte a un oasis de calma y serenidad.</li>
                    </ul>
                    
                    <h3>Tu Experiencia Premium</h3>
                    <p>Desde el momento en que cruzas nuestra puerta, cada detalle ha sido pensado para tu comodidad. Aromaterapia sutil, música ambiental cuidadosamente seleccionada y un equipo dedicado a hacer de tu visita un momento inolvidable.</p>
                    
                    <p>Te invitamos a explorar nuestro catálogo de servicios y encontrar el tratamiento perfecto para ti. ¡Tu bienestar es nuestra pasión!</p>
                `,
                featuredImage: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&q=80&w=1200',
                buttonText: 'Reservar Ahora',
                buttonUrl: '/#servicios',
                businessId: negocio.id
            }
        });
        console.log('✅ Página demo creada:', page.title, '- slug:', page.slug);
    } else {
        console.log('Ya hay páginas existentes, no se crearon nuevas.');
    }

    await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
