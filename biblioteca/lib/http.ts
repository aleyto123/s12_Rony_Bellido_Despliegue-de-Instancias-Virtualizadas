import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { AppError } from './repository';
export function handleError(error: unknown) {
  if (error instanceof AppError)
    return NextResponse.json({ error: error.message }, { status: error.status });
  if (error instanceof ZodError)
    return NextResponse.json(
      { error: error.issues.map((i) => i.message).join(' '), details: error.flatten() },
      { status: 400 },
    );
  if (error instanceof SyntaxError)
    return NextResponse.json({ error: 'El cuerpo debe ser un JSON válido.' }, { status: 400 });
  const code = (error as { code?: string })?.code;
  if (code === 'P2002')
    return NextResponse.json(
      { error: 'Ya existe un registro con ese correo o ISBN.' },
      { status: 409 },
    );
  if (code === 'P2003')
    return NextResponse.json(
      {
        error:
          'La relación con el autor no es válida. Si lo eliminas, primero elimina o reasigna sus libros.',
      },
      { status: 409 },
    );
  if (code === 'P2025')
    return NextResponse.json({ error: 'Registro no encontrado.' }, { status: 404 });
  console.error('[biblioteca]', error);
  return NextResponse.json(
    { error: 'No se pudo acceder a la biblioteca. Comprueba la conexión a la base de datos.' },
    { status: 503 },
  );
}
export type RouteContext = { params: Promise<{ id: string }> };
