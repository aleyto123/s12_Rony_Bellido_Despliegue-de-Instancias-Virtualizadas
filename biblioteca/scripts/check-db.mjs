import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
try {
  await prisma.$queryRaw`SELECT 1`;
  console.log('Conexión PostgreSQL OK. No se han modificado tablas ni datos.');
} catch (error) {
  console.error(
    'No se pudo conectar a PostgreSQL. Revisa las URI, la contraseña y que el proyecto Supabase esté activo.',
  );
  console.error('Código:', typeof error.code === 'string' ? error.code : 'CONNECTION_ERROR');
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
