import type { Author, Book } from './types';
export type Catalog = {
  authors: Author[];
  genres: string[];
  demo: boolean;
  stats: { authors: number; books: number; genres: number; pages: number };
  recentBooks: Book[];
};
