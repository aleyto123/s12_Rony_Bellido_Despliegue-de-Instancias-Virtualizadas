'use client';
import { useState } from 'react';
import { LoaderCircle, Check } from 'lucide-react';
import type { Author, Book } from '@/lib/types';
import { request } from '@/lib/client';
import { Modal } from './ui';

export function AuthorForm({
  author,
  onClose,
  onSaved,
}: {
  author?: Author;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setBusy(true);
    const data = new FormData(event.currentTarget);
    try {
      await request('/api/authors' + (author ? '/' + author.id : ''), {
        method: author ? 'PUT' : 'POST',
        body: JSON.stringify({
          name: data.get('name'),
          email: data.get('email'),
          nationality: data.get('nationality'),
          birthYear: Number(data.get('birthYear')),
          bio: data.get('bio'),
        }),
      });
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={author ? 'Editar autor' : 'Registrar autor'}
      subtitle="Completa su información para añadirlo a tu biblioteca."
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <form onSubmit={submit} className="edit-form">
        <div className="form-grid">
          <label className="full">
            Nombre completo{' '}
            <input
              name="name"
              autoFocus
              required
              minLength={2}
              maxLength={120}
              placeholder="Ej. Gabriel García Márquez"
              defaultValue={author?.name}
            />
          </label>
          <label className="full">
            Correo electrónico{' '}
            <input
              name="email"
              type="email"
              required
              maxLength={254}
              placeholder="autor@ejemplo.com"
              defaultValue={author?.email}
            />
          </label>
          <label>
            Nacionalidad{' '}
            <input
              name="nationality"
              required
              minLength={2}
              maxLength={80}
              placeholder="Ej. Colombia"
              defaultValue={author?.nationality}
            />
          </label>
          <label>
            Año de nacimiento{' '}
            <input
              name="birthYear"
              type="number"
              required
              min={1}
              max={new Date().getFullYear()}
              placeholder="1927"
              defaultValue={author?.birthYear}
            />
          </label>
          <label className="full">
            Biografía <span className="optional">Opcional</span>
            <textarea
              name="bio"
              maxLength={5000}
              rows={4}
              placeholder="Una breve reseña de su vida y obra…"
              defaultValue={author?.bio}
            />
          </label>
        </div>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="form-actions">
          <button className="button secondary" type="button" disabled={busy} onClick={onClose}>
            Cancelar
          </button>
          <button className="button primary" disabled={busy}>
            {busy ? <LoaderCircle className="spin" size={16} /> : <Check size={16} />}{' '}
            {author ? 'Guardar cambios' : 'Crear autor'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function BookForm({
  book,
  authors,
  genres = [],
  authorId,
  onClose,
  onSaved,
}: {
  book?: Book;
  authors: Author[];
  genres?: string[];
  authorId?: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setBusy(true);
    const data = new FormData(event.currentTarget);
    try {
      await request('/api/books' + (book ? '/' + book.id : ''), {
        method: book ? 'PUT' : 'POST',
        body: JSON.stringify({
          title: data.get('title'),
          description: data.get('description'),
          isbn: data.get('isbn'),
          publishedYear: Number(data.get('publishedYear')),
          genre: data.get('genre'),
          pages: Number(data.get('pages')),
          authorId: data.get('authorId'),
        }),
      });
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const allGenres = [
    ...new Set([...genres, 'Novela', 'Cuento', 'Poesía', 'Ensayo', 'Memorias', 'Novela histórica']),
  ];
  return (
    <Modal
      title={book ? 'Editar libro' : 'Registrar libro'}
      subtitle="Registra los datos del libro y elige a su autor."
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <form onSubmit={submit} className="edit-form">
        <div className="form-grid">
          <label className="full">
            Título del libro
            <input
              autoFocus
              name="title"
              required
              maxLength={250}
              placeholder="Ej. Cien años de soledad"
              defaultValue={book?.title}
            />
          </label>
          <label className="full">
            Autor
            <select name="authorId" required defaultValue={book?.authorId || authorId || ''}>
              <option value="" disabled>
                Selecciona un autor
              </option>
              {authors.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            ISBN
            <input
              name="isbn"
              required
              maxLength={32}
              placeholder="978-0307474728"
              defaultValue={book?.isbn}
            />
          </label>
          <label>
            Año de publicación
            <input
              name="publishedYear"
              type="number"
              required
              min={1}
              max={new Date().getFullYear() + 1}
              placeholder="1967"
              defaultValue={book?.publishedYear}
            />
          </label>
          <label>
            Género
            <input
              name="genre"
              list="book-genres"
              required
              maxLength={80}
              placeholder="Selecciona o escribe"
              defaultValue={book?.genre}
            />
            <datalist id="book-genres">
              {allGenres.map((g) => (
                <option key={g} value={g} />
              ))}
            </datalist>
          </label>
          <label>
            Número de páginas
            <input
              name="pages"
              type="number"
              required
              min={1}
              max={100000}
              placeholder="417"
              defaultValue={book?.pages}
            />
          </label>
          <label className="full">
            Descripción <span className="optional">Opcional</span>
            <textarea
              name="description"
              rows={3}
              maxLength={5000}
              placeholder="¿De qué trata esta historia?"
              defaultValue={book?.description}
            />
          </label>
        </div>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="form-actions">
          <button className="button secondary" type="button" onClick={onClose} disabled={busy}>
            Cancelar
          </button>
          <button className="button primary" disabled={busy}>
            {busy ? <LoaderCircle className="spin" size={16} /> : <Check size={16} />}{' '}
            {book ? 'Guardar cambios' : 'Crear libro'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
