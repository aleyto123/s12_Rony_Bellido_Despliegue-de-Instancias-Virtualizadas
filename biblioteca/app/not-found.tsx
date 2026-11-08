import Link from 'next/link';
import { BookOpen } from 'lucide-react';
export default function NotFound() {
  return (
    <div className="page empty-state">
      <BookOpen size={36} />
      <h1>Esta página aún no se ha escrito.</h1>
      <p>No encontramos la dirección que buscas.</p>
      <Link className="button primary" href="/">
        Volver a la biblioteca
      </Link>
    </div>
  );
}
