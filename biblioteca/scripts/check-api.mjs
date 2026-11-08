import assert from 'node:assert/strict';
const base = process.env.BASE_URL || 'http://127.0.0.1:3000';
async function api(path, method = 'GET', data) {
  const response = await fetch(base + '/api' + path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: data ? JSON.stringify(data) : undefined,
  });
  return { status: response.status, data: response.status === 204 ? null : await response.json() };
}
let authorId, bookId;
try {
  const invalid = await api('/books/search?limit=51');
  assert.equal(invalid.status, 400);
  const search = await api('/books/search?search=AMOR&authorName=GARC&page=1&limit=1');
  assert.equal(search.status, 200);
  assert.ok(Array.isArray(search.data.data));
  assert.equal(search.data.pagination.limit, 1);
  assert.equal((await api('/authors/missing-author/stats')).status, 404);
  const a = await api('/authors', 'POST', {
    name: 'Autor integración',
    email: 'test-' + Date.now() + '@example.com',
    nationality: 'Perú',
    birthYear: 1990,
    bio: 'Datos temporales de prueba.',
  });
  assert.equal(a.status, 201);
  authorId = a.data.id;
  assert.equal((await api('/authors/' + authorId, 'PUT', { bio: 'Actualizado' })).status, 200);
  const emptyStats = await api('/authors/' + authorId + '/stats');
  assert.equal(emptyStats.data.totalBooks, 0);
  assert.equal(emptyStats.data.firstBook, null);
  const b = await api('/books', 'POST', {
    title: 'Libro integración',
    description: 'Prueba temporal',
    isbn: 'TEST-' + Date.now(),
    publishedYear: 2020,
    genre: 'Ensayo',
    pages: 100,
    authorId,
  });
  assert.equal(b.status, 201);
  bookId = b.data.id;
  assert.equal((await api('/authors/' + authorId, 'DELETE')).status, 409);
  assert.equal((await api('/books/' + bookId, 'PUT', { pages: 200 })).status, 200);
  const stats = await api('/authors/' + authorId + '/stats');
  assert.equal(stats.data.totalBooks, 1);
  assert.equal(stats.data.averagePages, 200);
  const filtered = await api('/books/search?authorId=' + authorId);
  assert.equal(filtered.data.pagination.total, 1);
  const byAuthor = await api('/authors/' + authorId + '/books');
  assert.equal(byAuthor.data[0].pages, 200);
  assert.equal((await api('/books/' + bookId, 'DELETE')).status, 204);
  bookId = null;
  assert.equal((await api('/authors/' + authorId, 'DELETE')).status, 204);
  authorId = null;
  console.log(
    'API OK: búsqueda, validación, 404, CRUD, estadísticas, filtros e integridad referencial.',
  );
} finally {
  if (bookId) await api('/books/' + bookId, 'DELETE');
  if (authorId) await api('/authors/' + authorId, 'DELETE');
}
