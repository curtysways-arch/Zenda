import prisma from './src/lib/prisma.ts';
import hasher from 'bcryptjs';

async function main() {
    const hashedPassword = await hasher.hash('admin123', 10);
    
    const user = await prisma.usuario.update({
        where: { email: 'curtysways@gmail.com' },
        data: { password: hashedPassword }
    });
    
    console.log(`Password reset for ${user.email} to: admin123`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
