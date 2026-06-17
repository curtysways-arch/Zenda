import prisma from './src/lib/prisma.ts';

async function main() {
    const email = 'admin@spa.com';
    const passwordHash = '$2b$10$miI7AjVeLti3ynZtqYf/X.rtm82jJudeMawU4lAbJx4HjuujXcc5G';
    
    await prisma.usuario.update({
        where: { email },
        data: { password: passwordHash }
    });
    
    console.log(`Hash updated for ${email}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
