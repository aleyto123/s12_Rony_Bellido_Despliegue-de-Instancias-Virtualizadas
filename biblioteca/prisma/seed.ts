import { PrismaClient } from '@prisma/client';
import { seedAuthors, seedBooks } from '../lib/seed-data';
const prisma = new PrismaClient();
async function main() {
  await prisma.$transaction(async (tx) => {
    for (const { createdAt, updatedAt, _count, ...author } of seedAuthors) {
      await tx.author.upsert({
        where: { id: author.id },
        create: { ...author, createdAt: new Date(createdAt) },
        update: {},
      });
    }
    for (const { createdAt, updatedAt, author, ...book } of seedBooks) {
      await tx.book.upsert({
        where: { id: book.id },
        create: { ...book, createdAt: new Date(createdAt) },
        update: {},
      });
    }
  });
  console.log('Catálogo de ejemplo cargado.');
}
main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
