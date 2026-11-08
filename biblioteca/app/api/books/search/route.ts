import { NextResponse } from 'next/server';
import { searchBooks } from '@/lib/repository';
import { searchSchema } from '@/lib/validation';
import { handleError } from '@/lib/http';
export const dynamic = 'force-dynamic';
export async function GET(req: Request) {
  try {
    return NextResponse.json(
      await searchBooks(searchSchema.parse(Object.fromEntries(new URL(req.url).searchParams))),
    );
  } catch (e) {
    return handleError(e);
  }
}
