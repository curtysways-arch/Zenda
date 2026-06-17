const { PrismaClient } = require('@prisma/client');
const { PrismaLibSql } = require('@prisma/adapter-libsql');

async function main() {
    const libsqlUrl = "file:///D:/Documentos/antigravity/spa/Spa/dev.db";
    const adapter = new PrismaLibSql({ url: libsqlUrl });
    const prisma = new PrismaClient({ adapter });

    try {
        const id = "course-1";
        
        const courseClass = await prisma.course_classes.create({
            data: {
                course_id: id,
                title: "Clase de Prueba Automática",
                description: "Generada desde el script",
                class_date: new Date(),
            }
        });

        console.log("Creado:", courseClass);
        
        await prisma.course_classes.delete({
            where: { id: courseClass.id }
        });
        console.log("Limpiado.");

    } catch (e) {
        console.error("ERROR", e);
    } finally {
        await prisma.$disconnect();
    }
}

main().catch(console.error);
