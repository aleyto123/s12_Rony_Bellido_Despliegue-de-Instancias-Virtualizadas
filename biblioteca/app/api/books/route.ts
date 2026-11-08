import { NextResponse } from 'next/server';
import { listBooks, saveBook } from '@/lib/repository';
import { bookSchema } from '@/lib/validation';
import { handleError } from '@/lib/http';
export const dynamic = 'force-dynamic';
export async function GET(req: Request) {
  try {
    const genre = new URL(req.url).searchParams.get('genre');
    const books = await listBooks();
    return NextResponse.json(genre ? books.filter((b) => b.genre === genre) : books);
  } catch (e) {
    return handleError(e);
  }
}
export async function POST(req: Request) {
  try {
    return NextResponse.json(await saveBook(bookSchema.parse(await req.json())), { status: 201 });
  } catch (e) {
    return handleError(e);
  }
}
