import { NextResponse } from 'next/server';
import { getBook, saveBook, deleteBook } from '@/lib/repository';
import { bookSchema } from '@/lib/validation';
import { handleError, type RouteContext } from '@/lib/http';
export async function GET(_req: Request, ctx: RouteContext) {
  try {
    return NextResponse.json(await getBook((await ctx.params).id));
  } catch (e) {
    return handleError(e);
  }
}
export async function PUT(req: Request, ctx: RouteContext) {
  try {
    return NextResponse.json(
      await saveBook(bookSchema.partial().parse(await req.json()), (await ctx.params).id),
    );
  } catch (e) {
    return handleError(e);
  }
}
export async function DELETE(_req: Request, ctx: RouteContext) {
  try {
    await deleteBook((await ctx.params).id);
    return new Response(null, { status: 204 });
  } catch (e) {
    return handleError(e);
  }
}
