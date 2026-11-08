import { NextResponse } from 'next/server';
import { listAuthors, saveAuthor } from '@/lib/repository';
import { authorSchema } from '@/lib/validation';
import { handleError } from '@/lib/http';
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    return NextResponse.json(await listAuthors());
  } catch (e) {
    return handleError(e);
  }
}
export async function POST(req: Request) {
  try {
    return NextResponse.json(await saveAuthor(authorSchema.parse(await req.json())), {
      status: 201,
    });
  } catch (e) {
    return handleError(e);
  }
}
