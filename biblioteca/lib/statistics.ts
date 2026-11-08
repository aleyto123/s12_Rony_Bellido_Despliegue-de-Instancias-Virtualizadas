import type { Author, AuthorStats, Book } from './types';
export function authorStatistics(author: Author, books: Book[]): AuthorStats {
  const years = [...books].sort(
    (a, b) => a.publishedYear - b.publishedYear || a.title.localeCompare(b.title),
  );
  const pages = [...books].sort((a, b) => a.pages - b.pages || a.title.localeCompare(b.title));
  return {
    authorId: author.id,
    authorName: author.name,
    totalBooks: books.length,
    firstBook: years.length ? { title: years[0].title, year: years[0].publishedYear } : null,
    latestBook: years.length
      ? { title: years[years.length - 1].title, year: years[years.length - 1].publishedYear }
      : null,
    averagePages: books.length
      ? Math.round(books.reduce((sum, b) => sum + b.pages, 0) / books.length)
      : 0,
    genres: [...new Set(books.map((b) => b.genre))].sort((a, b) => a.localeCompare(b, 'es')),
    longestBook: pages.length
      ? { title: pages[pages.length - 1].title, pages: pages[pages.length - 1].pages }
      : null,
    shortestBook: pages.length ? { title: pages[0].title, pages: pages[0].pages } : null,
  };
}
