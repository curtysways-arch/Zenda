import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

try {
  const courses = await prisma.course.findMany({ select: { id: true, name: true, imageUrl: true } });
  console.log('Courses found:', courses.length);
  if (courses[0]) {
    console.log('First course has imageUrl:', 'imageUrl' in courses[0]);
    console.log('Value:', courses[0].imageUrl);
  }
  process.exit(0);
} catch (e) {
  console.error('Test error:', e.message);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
