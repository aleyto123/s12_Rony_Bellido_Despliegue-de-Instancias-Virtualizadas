import { NextResponse } from 'next/server';
import { booksByAuthor } from '@/lib/repository';
import { handleError, type RouteContext } from '@/lib/http';
export async function GET(_req: Request, ctx: RouteContext) {
  try {
    return NextResponse.json(await booksByAuthor((await ctx.params).id));
  } catch (e) {
    return handleError(e);
  }
}
