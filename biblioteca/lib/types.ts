export type Author = {
  id: string;
  name: string;
  email: string;
  nationality: string;
  birthYear: number;
  bio: string;
  createdAt: string;
  updatedAt: string;
  _count?: { books: number };
};
export type Book = {
  id: string;
  title: string;
  description: string;
  isbn: string;
  publishedYear: number;
  genre: string;
  pages: number;
  authorId: string;
  createdAt: string;
  updatedAt: string;
  author?: Author;
};
export type AuthorInput = Pick<Author, 'name' | 'email' | 'nationality' | 'birthYear' | 'bio'>;
export type BookInput = Pick<
  Book,
  'title' | 'description' | 'isbn' | 'publishedYear' | 'genre' | 'pages' | 'authorId'
>;
export type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
};
export type SearchResult = { data: Book[]; pagination: Pagination };
export type AuthorStats = {
  authorId: string;
  authorName: string;
  totalBooks: number;
  firstBook: { title: string; year: number } | null;
  latestBook: { title: string; year: number } | null;
  averagePages: number;
  genres: string[];
  longestBook: { title: string; pages: number } | null;
  shortestBook: { title: string; pages: number } | null;
};
