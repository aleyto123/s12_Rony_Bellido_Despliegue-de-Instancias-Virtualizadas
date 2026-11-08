import { NextResponse } from 'next/server';
import { demoMode, listAuthors, listBooks } from '@/lib/repository';
import { handleError } from '@/lib/http';
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    const [authors, books] = await Promise.all([listAuthors(), listBooks()]);
    return NextResponse.json({
      authors,
      genres: [...new Set(books.map((b) => b.genre))].sort((a, b) => a.localeCompare(b, 'es')),
      demo: demoMode(),
      stats: {
        authors: authors.length,
        books: books.length,
        genres: new Set(books.map((b) => b.genre)).size,
        pages: books.reduce((s, b) => s + b.pages, 0),
      },
      recentBooks: [...books].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 4),
    });
  } catch (e) {
    return handleError(e);
  }
}
