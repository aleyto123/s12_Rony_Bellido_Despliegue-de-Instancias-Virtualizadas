import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, unlink, rmdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { authorStatistics } from '../lib/statistics';
import { authorSchema, bookSchema, searchSchema } from '../lib/validation';
import { seedAuthors, seedBooks } from '../lib/seed-data';
import {
  searchLocalBooks,
  saveAuthor,
  saveBook,
  deleteAuthor,
  deleteBook,
  getAuthor,
  getBook,
  listAuthors,
  listBooks,
  AppError,
} from '../lib/repository';
const books = seedBooks.map((b) => ({
  ...b,
  author: seedAuthors.find((a) => a.id === b.authorId),
}));
test('búsqueda por título y autor es parcial e insensible a mayúsculas', () => {
  const result = searchLocalBooks(
    books,
    searchSchema.parse({ search: 'AMOR', authorName: 'GARCÍA' }),
  );
  assert.equal(result.pagination.total, 1);
  assert.equal(result.data[0].id, 'amor-colera');
});
test('género coincide exactamente y se combina con autor', () => {
  const result = searchLocalBooks(
    books,
    searchSchema.parse({ genre: 'Novela', authorId: 'gabriel-garcia-marquez' }),
  );
  assert.equal(result.pagination.total, 4);
  assert.equal(
    searchLocalBooks(books, searchSchema.parse({ genre: 'novela' })).pagination.total,
    0,
  );
});
test('paginación no duplica resultados y respeta los límites', () => {
  const first = searchLocalBooks(books, searchSchema.parse({ limit: 5, page: 1 }));
  const last = searchLocalBooks(books, searchSchema.parse({ limit: 5, page: 4 }));
  assert.deepEqual(first.pagination, {
    page: 1,
    limit: 5,
    total: 16,
    totalPages: 4,
    hasNext: true,
    hasPrev: false,
  });
  assert.equal(last.data.length, 1);
  assert.equal(last.pagination.hasNext, false);
  assert.equal(last.pagination.hasPrev, true);
  assert.ok(!first.data.some((b) => b.id === last.data[0].id));
});
test('parámetros inválidos producen errores en lugar de valores silenciosos', () => {
  for (const input of [
    { page: 0 },
    { page: 1.5 },
    { limit: 51 },
    { limit: 'abc' },
    { sortBy: 'isbn' },
    { order: 'random' },
  ])
    assert.equal(searchSchema.safeParse(input).success, false);
  const query = searchSchema.parse({});
  assert.equal(query.page, 1);
  assert.equal(query.limit, 10);
  assert.equal(query.sortBy, 'createdAt');
  assert.equal(query.order, 'desc');
});
test('los tres campos de ordenamiento funcionan en ambas direcciones', () => {
  for (const sortBy of ['title', 'publishedYear', 'createdAt'] as const) {
    const asc = searchLocalBooks(
      books,
      searchSchema.parse({ sortBy, order: 'asc', limit: 50 }),
    ).data;
    const desc = searchLocalBooks(
      books,
      searchSchema.parse({ sortBy, order: 'desc', limit: 50 }),
    ).data;
    assert.equal(asc.length, 16);
    for (let i = 1; i < asc.length; i++) {
      if (sortBy === 'publishedYear') assert.ok(asc[i - 1][sortBy] <= asc[i][sortBy]);
      else assert.ok(String(asc[i - 1][sortBy]).localeCompare(String(asc[i][sortBy]), 'es') <= 0);
    }
    assert.deepEqual(
      desc.map((b) => b[sortBy]),
      asc.map((b) => b[sortBy]).reverse(),
    );
  }
});
test('sin coincidencias devuelve página vacía y totalPages cero', () => {
  const result = searchLocalBooks(books, searchSchema.parse({ search: 'inexistente' }));
  assert.equal(result.data.length, 0);
  assert.equal(result.pagination.totalPages, 0);
  assert.equal(result.pagination.hasNext, false);
});
test('estadísticas completas del autor y libros extremos correctos', () => {
  const author = seedAuthors[0];
  const stats = authorStatistics(
    author,
    books.filter((b) => b.authorId === author.id),
  );
  assert.equal(stats.totalBooks, 4);
  assert.deepEqual(stats.firstBook, { title: 'La hojarasca', year: 1955 });
  assert.deepEqual(stats.latestBook, { title: 'El amor en los tiempos del cólera', year: 1985 });
  assert.equal(stats.averagePages, 292);
  assert.deepEqual(stats.genres, ['Novela']);
  assert.equal(stats.longestBook?.pages, 464);
  assert.equal(stats.shortestBook?.pages, 128);
});
test('autor sin libros no produce NaN ni referencias indefinidas', () => {
  const stats = authorStatistics(seedAuthors[0], []);
  assert.equal(stats.totalBooks, 0);
  assert.equal(stats.averagePages, 0);
  assert.equal(stats.firstBook, null);
  assert.equal(stats.latestBook, null);
  assert.equal(stats.longestBook, null);
  assert.equal(stats.shortestBook, null);
  assert.deepEqual(stats.genres, []);
});
test('validación evita páginas negativas, correos inválidos y campos desconocidos', () => {
  const author = {
    name: 'Nombre válido',
    email: 'valid@example.com',
    nationality: 'Perú',
    birthYear: 1990,
    bio: '',
  };
  assert.equal(authorSchema.safeParse(author).success, true);
  assert.equal(authorSchema.safeParse({ ...author, email: 'bad' }).success, false);
  assert.equal(authorSchema.safeParse({ ...author, role: 'admin' }).success, false);
  assert.equal(
    bookSchema.safeParse({
      title: 'X',
      description: '',
      isbn: 'X',
      publishedYear: 2020,
      genre: 'Novela',
      pages: -1,
      authorId: 'x',
    }).success,
    false,
  );
});
test('CRUD persistente, duplicados, integridad referencial y concurrencia local', async () => {
  const folder = await mkdtemp(path.join(os.tmpdir(), 'folio-test-'));
  process.env.LIBRARY_DEMO = 'true';
  process.env.LIBRARY_DATA_FILE = path.join(folder, 'library.json');
  try {
    const input = {
      name: 'Autora de prueba',
      email: 'test@example.com',
      nationality: 'Perú',
      birthYear: 1990,
      bio: 'Prueba',
    };
    const author = await saveAuthor(input);
    assert.equal((await getAuthor(author.id)).name, input.name);
    await assert.rejects(
      saveAuthor(input),
      (e: unknown) => e instanceof AppError && e.status === 409,
    );
    const updated = await saveAuthor({ name: 'Nombre actualizado' }, author.id);
    assert.equal(updated.email, input.email);
    const book = await saveBook({
      title: 'Libro de prueba',
      description: '',
      isbn: 'TEST-UNIQUE',
      publishedYear: 2020,
      genre: 'Ensayo',
      pages: 100,
      authorId: author.id,
    });
    await assert.rejects(
      deleteAuthor(author.id),
      (e: unknown) => e instanceof AppError && e.status === 409,
    );
    await assert.rejects(
      saveBook({
        title: 'Duplicado',
        description: '',
        isbn: 'TEST-UNIQUE',
        publishedYear: 2020,
        genre: 'Ensayo',
        pages: 100,
        authorId: author.id,
      }),
    );
    await assert.rejects(
      saveBook({
        title: 'Sin autor',
        description: '',
        isbn: 'TEST-ORPHAN',
        publishedYear: 2020,
        genre: 'Ensayo',
        pages: 100,
        authorId: 'missing',
      }),
    );
    await saveBook({ pages: 200 }, book.id);
    assert.equal((await getBook(book.id)).pages, 200);
    const concurrent = await Promise.all(
      [1, 2, 3].map((i) => saveAuthor({ ...input, email: 'concurrent' + i + '@example.com' })),
    );
    const authors = await listAuthors();
    for (const a of concurrent) assert.ok(authors.some((record) => record.id === a.id));
    assert.equal((await listBooks()).length, 17);
    await deleteBook(book.id);
    await deleteAuthor(author.id);
    await assert.rejects(getAuthor(author.id));
    await assert.rejects(getBook(book.id));
  } finally {
    await unlink(process.env.LIBRARY_DATA_FILE);
    await rmdir(folder);
    delete process.env.LIBRARY_DATA_FILE;
  }
});
