import { NextResponse } from 'next/server';
import { booksByAuthor, getAuthor } from '@/lib/repository';
import { authorStatistics } from '@/lib/statistics';
import { handleError, type RouteContext } from '@/lib/http';
export async function GET(_req: Request, ctx: RouteContext) {
  try {
    const id = (await ctx.params).id;
    const [author, books] = await Promise.all([getAuthor(id), booksByAuthor(id)]);
    return NextResponse.json(authorStatistics(author, books));
  } catch (e) {
    return handleError(e);
  }
}
