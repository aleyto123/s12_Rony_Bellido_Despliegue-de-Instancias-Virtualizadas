import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import path from 'node:path';
import { prisma } from './prisma';
import { seedAuthors, seedBooks } from './seed-data';
import type { Author, Book, AuthorInput, BookInput, SearchResult } from './types';
import type { SearchQuery } from './validation';

export class AppError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export const demoMode = () => {
  if (process.env.VERCEL && process.env.LIBRARY_DEMO === 'true') {
    throw new AppError(
      'En Vercel configura LIBRARY_DEMO=false y las conexiones a Supabase. El modo demo solo guarda datos en un equipo local.',
      503,
    );
  }
  return process.env.LIBRARY_DEMO === 'true';
};
type Data = { authors: Author[]; books: Book[] };
const globalStore = globalThis as unknown as { libraryQueue?: Promise<unknown> };
const dataPath = () =>
  process.env.LIBRARY_DATA_FILE || path.join(process.cwd(), '.data', 'library.json');
async function readDemo(): Promise<Data> {
  try {
    return JSON.parse(await readFile(dataPath(), 'utf8'));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    return structuredClone({ authors: seedAuthors, books: seedBooks });
  }
}
async function mutateDemo<T>(fn: (data: Data) => T): Promise<T> {
  const operation = (globalStore.libraryQueue || Promise.resolve())
    .catch(() => {})
    .then(async () => {
      const data = await readDemo();
      const result = fn(data);
      await mkdir(path.dirname(dataPath()), { recursive: true });
      const temp = dataPath() + '.' + randomUUID() + '.tmp';
      await writeFile(temp, JSON.stringify(data, null, 2), 'utf8');
      await rename(temp, dataPath());
      return result;
    });
  globalStore.libraryQueue = operation;
  return operation;
}
const serialize = <T>(value: unknown): T => JSON.parse(JSON.stringify(value));
const requireDatabase = () => {
  if (!process.env.DATABASE_URL)
    throw new AppError(
      'Configura la conexión a la base de datos o activa el modo demo local.',
      503,
    );
};
export async function listAuthors(): Promise<Author[]> {
  if (!demoMode()) {
    requireDatabase();
    return serialize(
      await prisma.author.findMany({
        include: { _count: { select: { books: true } } },
        orderBy: { name: 'asc' },
      }),
    );
  }
  const data = await readDemo();
  return data.authors
    .map((a) => ({ ...a, _count: { books: data.books.filter((b) => b.authorId === a.id).length } }))
    .sort((a, b) => a.name.localeCompare(b.name, 'es'));
}
export async function getAuthor(id: string): Promise<Author> {
  if (!demoMode()) {
    requireDatabase();
    const author = await prisma.author.findUnique({
      where: { id },
      include: { _count: { select: { books: true } } },
    });
    if (!author) throw new AppError('Autor no encontrado.', 404);
    return serialize(author);
  }
  const author = (await listAuthors()).find((a) => a.id === id);
  if (!author) throw new AppError('Autor no encontrado.', 404);
  return author;
}
export async function saveAuthor(
  input: AuthorInput | Partial<AuthorInput>,
  id?: string,
): Promise<Author> {
  if (!demoMode()) {
    requireDatabase();
    return serialize(
      id
        ? await prisma.author.update({ where: { id }, data: input })
        : await prisma.author.create({ data: input as AuthorInput }),
    );
  }
  return mutateDemo((data) => {
    const current = id ? data.authors.find((a) => a.id === id) : undefined;
    if (id && !current) throw new AppError('Autor no encontrado.', 404);
    if (
      input.email &&
      data.authors.some((a) => a.email.toLowerCase() === input.email!.toLowerCase() && a.id !== id)
    )
      throw new AppError('Ya existe un autor con este correo.', 409);
    const date = new Date().toISOString();
    const author = {
      ...(current || { id: randomUUID(), createdAt: date }),
      ...input,
      updatedAt: date,
    } as Author;
    data.authors = current
      ? data.authors.map((a) => (a.id === id ? author : a))
      : [...data.authors, author];
    return author;
  });
}
export async function deleteAuthor(id: string) {
  if (!demoMode()) {
    requireDatabase();
    await prisma.author.delete({ where: { id } });
    return;
  }
  return mutateDemo((data) => {
    if (!data.authors.some((a) => a.id === id)) throw new AppError('Autor no encontrado.', 404);
    if (data.books.some((b) => b.authorId === id))
      throw new AppError(
        'Este autor tiene libros. Elimina o reasigna sus libros antes de eliminarlo.',
        409,
      );
    data.authors = data.authors.filter((a) => a.id !== id);
  });
}
export async function listBooks(): Promise<Book[]> {
  if (!demoMode()) {
    requireDatabase();
    return serialize(
      await prisma.book.findMany({ include: { author: true }, orderBy: { createdAt: 'desc' } }),
    );
  }
  const data = await readDemo();
  return data.books.map((b) => ({ ...b, author: data.authors.find((a) => a.id === b.authorId) }));
}
export async function getBook(id: string): Promise<Book> {
  if (!demoMode()) {
    requireDatabase();
    const book = await prisma.book.findUnique({ where: { id }, include: { author: true } });
    if (!book) throw new AppError('Libro no encontrado.', 404);
    return serialize(book);
  }
  const book = (await listBooks()).find((b) => b.id === id);
  if (!book) throw new AppError('Libro no encontrado.', 404);
  return book;
}
export async function booksByAuthor(id: string): Promise<Book[]> {
  await getAuthor(id);
  if (!demoMode())
    return serialize(
      await prisma.book.findMany({
        where: { authorId: id },
        orderBy: { publishedYear: 'asc' },
        include: { author: true },
      }),
    );
  return (await listBooks())
    .filter((b) => b.authorId === id)
    .sort((a, b) => a.publishedYear - b.publishedYear);
}
export async function saveBook(input: BookInput | Partial<BookInput>, id?: string): Promise<Book> {
  if (!demoMode()) {
    requireDatabase();
    return serialize(
      id
        ? await prisma.book.update({ where: { id }, data: input, include: { author: true } })
        : await prisma.book.create({ data: input as BookInput, include: { author: true } }),
    );
  }
  return mutateDemo((data) => {
    const current = id ? data.books.find((b) => b.id === id) : undefined;
    if (id && !current) throw new AppError('Libro no encontrado.', 404);
    if (input.authorId && !data.authors.some((a) => a.id === input.authorId))
      throw new AppError('El autor seleccionado no existe.', 404);
    if (input.isbn && data.books.some((b) => b.isbn === input.isbn && b.id !== id))
      throw new AppError('Ya existe un libro con este ISBN.', 409);
    const date = new Date().toISOString();
    const book = {
      ...(current || { id: randomUUID(), createdAt: date }),
      ...input,
      updatedAt: date,
    } as Book;
    data.books = current ? data.books.map((b) => (b.id === id ? book : b)) : [...data.books, book];
    return { ...book, author: data.authors.find((a) => a.id === book.authorId) };
  });
}
export async function deleteBook(id: string) {
  if (!demoMode()) {
    requireDatabase();
    await prisma.book.delete({ where: { id } });
    return;
  }
  return mutateDemo((data) => {
    if (!data.books.some((b) => b.id === id)) throw new AppError('Libro no encontrado.', 404);
    data.books = data.books.filter((b) => b.id !== id);
  });
}
export function searchLocalBooks(books: Book[], query: SearchQuery): SearchResult {
  const filtered = books.filter(
    (b) =>
      b.title.toLocaleLowerCase('es').includes(query.search.toLocaleLowerCase('es')) &&
      (!query.genre || b.genre === query.genre) &&
      (!query.authorId || b.authorId === query.authorId) &&
      (b.author?.name || '')
        .toLocaleLowerCase('es')
        .includes(query.authorName.toLocaleLowerCase('es')),
  );
  filtered.sort((a, b) => {
    const x = a[query.sortBy],
      y = b[query.sortBy];
    const value = typeof x === 'number' ? x - Number(y) : String(x).localeCompare(String(y), 'es');
    return (query.order === 'asc' ? value : -value) || a.id.localeCompare(b.id);
  });
  const total = filtered.length;
  return {
    data: filtered.slice((query.page - 1) * query.limit, query.page * query.limit),
    pagination: pagination(query, total),
  };
}
export function pagination(query: Pick<SearchQuery, 'page' | 'limit'>, total: number) {
  return {
    page: query.page,
    limit: query.limit,
    total,
    totalPages: Math.ceil(total / query.limit),
    hasNext: query.page * query.limit < total,
    hasPrev: query.page > 1,
  };
}
export async function searchBooks(query: SearchQuery): Promise<SearchResult> {
  if (demoMode()) return searchLocalBooks(await listBooks(), query);
  requireDatabase();
  const where = {
    title: { contains: query.search, mode: 'insensitive' as const },
    ...(query.genre ? { genre: query.genre } : {}),
    ...(query.authorId ? { authorId: query.authorId } : {}),
    ...(query.authorName
      ? { author: { name: { contains: query.authorName, mode: 'insensitive' as const } } }
      : {}),
  };
  const [books, total] = await prisma.$transaction(
    [
      prisma.book.findMany({
        where,
        include: { author: true },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: [{ [query.sortBy]: query.order }, { id: 'asc' }],
      }),
      prisma.book.count({ where }),
    ],
    { isolationLevel: 'RepeatableRead' },
  );
  return { data: serialize(books), pagination: pagination(query, total) };
}
