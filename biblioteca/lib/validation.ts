import { z } from 'zod';
const year = z
  .number()
  .int()
  .min(1)
  .max(new Date().getFullYear() + 1);
export const authorSchema = z
  .object({
    name: z.string().trim().min(2, 'Escribe un nombre de al menos 2 caracteres.').max(120),
    email: z
      .string()
      .trim()
      .email('Escribe un correo válido.')
      .max(254)
      .transform((v) => v.toLowerCase()),
    nationality: z.string().trim().min(2, 'Indica la nacionalidad.').max(80),
    birthYear: z.number().int().min(1).max(new Date().getFullYear()),
    bio: z.string().trim().max(5000).default(''),
  })
  .strict();
export const bookSchema = z
  .object({
    title: z.string().trim().min(1, 'El título es obligatorio.').max(250),
    description: z.string().trim().max(5000).default(''),
    isbn: z.string().trim().min(1, 'El ISBN es obligatorio.').max(32),
    publishedYear: year,
    genre: z.string().trim().min(1, 'El género es obligatorio.').max(80),
    pages: z.number().int().min(1, 'Las páginas deben ser mayores que cero.').max(100000),
    authorId: z.string().min(1, 'Selecciona un autor.').max(100),
  })
  .strict();
const positiveInt = (fallback: number, max: number) =>
  z.preprocess(
    (value) => (value === undefined || value === null || value === '' ? fallback : Number(value)),
    z.number().int().min(1).max(max),
  );
export const searchSchema = z.object({
  search: z.string().max(250).default(''),
  genre: z.string().max(80).default(''),
  authorName: z.string().max(120).default(''),
  authorId: z.string().max(100).default(''),
  page: positiveInt(1, 1000000),
  limit: positiveInt(10, 50),
  sortBy: z.enum(['title', 'publishedYear', 'createdAt']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
});
export type SearchQuery = z.infer<typeof searchSchema>;
