'use client';
import { use, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowUpRight,
  Pencil,
  Plus,
  Globe2,
  CalendarDays,
  Mail,
  BookOpen,
  Layers3,
  Files,
  TrendingUp,
  Trash2,
  Feather,
} from 'lucide-react';
import type { Author, Book, AuthorStats } from '@/lib/types';
import type { Catalog } from '@/lib/catalog';
import { initials, number, request } from '@/lib/client';
import { AuthorForm, BookForm } from '@/components/forms';
import { ConfirmDelete, Empty, ErrorState, Loading, Toast } from '@/components/ui';
import { BookCover } from '@/components/book-cover';

export default function AuthorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [author, setAuthor] = useState<Author | null>(null);
  const [stats, setStats] = useState<AuthorStats | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [edit, setEdit] = useState(false);
  const [bookForm, setBookForm] = useState<Book | 'new' | null>(null);
  const [remove, setRemove] = useState<Book | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [toast, setToast] = useState('');
  const dismiss = useCallback(() => setToast(''), []);
  const load = useCallback(async () => {
    setError('');
    try {
      const [a, s, b, c] = await Promise.all([
        request<Author>('/api/authors/' + id),
        request<AuthorStats>('/api/authors/' + id + '/stats'),
        request<Book[]>('/api/authors/' + id + '/books'),
        request<Catalog>('/api/catalog'),
      ]);
      setAuthor(a);
      setStats(s);
      setBooks(b);
      setCatalog(c);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [id]);
  useEffect(() => {
    load();
  }, [load]);
  async function deleteRecord() {
    if (!remove) return;
    setBusy(true);
    setDeleteError('');
    try {
      await request('/api/books/' + remove.id, { method: 'DELETE' });
      setRemove(null);
      setToast('Libro eliminado. Estadísticas actualizadas.');
      await load();
    } catch (e) {
      setDeleteError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (loading)
    return (
      <div className="page">
        <Loading label="Abriendo la historia de este autor…" />
      </div>
    );
  if (error || !author || !stats)
    return (
      <div className="page">
        <Link className="back-link" href="/">
          <ArrowLeft size={16} />
          Volver a autores
        </Link>
        <ErrorState message={error || 'Autor no encontrado.'} retry={load} />
      </div>
    );
  return (
    <div className="page author-detail-page">
      <Link className="back-link" href="/">
        <ArrowLeft size={16} />
        Volver al directorio
      </Link>
      <section className="author-profile">
        <div className="profile-main">
          <span className="author-avatar profile-large">{initials(author.name)}</span>
          <div>
            <p className="eyebrow">DETRÁS DE CADA HISTORIA</p>
            <h1>
              {author.name}
              <span>.</span>
            </h1>
            <div className="profile-facts">
              <span>
                <Globe2 size={15} />
                {author.nationality}
              </span>
              <span>
                <CalendarDays size={15} />
                Nacimiento: {author.birthYear}
              </span>
              <a href={'mailto:' + author.email}>
                <Mail size={15} />
                {author.email}
              </a>
            </div>
          </div>
        </div>
        <button className="button secondary" onClick={() => setEdit(true)}>
          <Pencil size={15} />
          Editar autor
        </button>
      </section>
      <div className="detail-layout">
        <aside className="bio-panel">
          <span className="stat-icon green">
            <Feather size={20} />
          </span>
          <h2>Sobre el autor</h2>
          <p>
            {author.bio || 'Todavía no hay una biografía. Edita el autor para contar su historia.'}
          </p>
          <div className="bio-fact">
            <span>EN LA BIBLIOTECA DESDE</span>
            <strong>
              {new Date(author.createdAt).toLocaleDateString('es-PE', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </strong>
          </div>
          <div className="bio-genres">
            <span className="tiny-label">GÉNEROS REGISTRADOS</span>
            <div>
              {stats.genres.length ? (
                stats.genres.map((g) => (
                  <span className="genre-pill" key={g}>
                    {g}
                  </span>
                ))
              ) : (
                <small>Aún sin géneros registrados</small>
              )}
            </div>
          </div>
        </aside>
        <section className="author-statistics">
          <div className="section-heading">
            <div>
              <h2>Estadísticas del autor</h2>
              <p>Cálculos basados en sus libros dentro de esta biblioteca.</p>
            </div>
          </div>
          <div className="detail-stats-grid">
            {[
              { label: 'Libros publicados', value: stats.totalBooks, icon: BookOpen },
              { label: 'Promedio de páginas', value: stats.averagePages, icon: Files },
              { label: 'Géneros explorados', value: stats.genres.length, icon: Layers3 },
            ].map(({ label, value, icon: Icon }) => (
              <article className="stat-card" key={label}>
                <Icon size={17} />
                <strong>{number(value)}</strong>
                <small>{label}</small>
              </article>
            ))}
          </div>
          <div className="milestone-grid">
            <article>
              <span className="tiny-label">SU PRIMER LIBRO</span>
              <strong>{stats.firstBook?.title || 'Sin libros registrados'}</strong>
              <span className="milestone-year">{stats.firstBook?.year || '—'}</span>
            </article>
            <article>
              <span className="tiny-label">SU LIBRO MÁS RECIENTE</span>
              <strong>{stats.latestBook?.title || 'Sin libros registrados'}</strong>
              <span className="milestone-year">{stats.latestBook?.year || '—'}</span>
            </article>
          </div>
          <div className="length-stats">
            <div>
              <TrendingUp size={17} />
              <span>
                La lectura más larga<strong>{stats.longestBook?.title || '—'}</strong>
              </span>
              <b>
                {stats.longestBook?.pages || 0}
                <small> págs.</small>
              </b>
            </div>
            <div>
              <Files size={17} />
              <span>
                La lectura más breve<strong>{stats.shortestBook?.title || '—'}</strong>
              </span>
              <b>
                {stats.shortestBook?.pages || 0}
                <small> págs.</small>
              </b>
            </div>
          </div>
        </section>
      </div>
      <section className="author-books">
        <div className="section-heading">
          <div>
            <h2>
              Libros registrados <span className="count-badge">{books.length}</span>
            </h2>
            <p>Todos los libros de {author.name} en tu biblioteca.</p>
          </div>
          <button className="button primary" onClick={() => setBookForm('new')}>
            <Plus size={16} />
            Añadir libro
          </button>
        </div>
        {books.length ? (
          <div className="author-books-list">
            {books.map((b) => (
              <article key={b.id} className="author-book-row">
                <BookCover title={b.title} author={author.name} small />
                <div className="author-book-info">
                  <span className="genre-pill">{b.genre}</span>
                  <h3>{b.title}</h3>
                  <p>
                    {b.publishedYear} <span>·</span> {number(b.pages)} páginas
                  </p>
                </div>
                <span className="isbn-label">ISBN {b.isbn}</span>
                <div className="card-actions">
                  <button
                    className="icon-button"
                    title="Editar libro"
                    aria-label={'Editar ' + b.title}
                    onClick={() => setBookForm(b)}
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    className="icon-button delete-action"
                    title="Eliminar libro"
                    aria-label={'Eliminar ' + b.title}
                    onClick={() => {
                      setRemove(b);
                      setDeleteError('');
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <Empty
            title="Una obra por descubrir"
            description="Este autor todavía no tiene libros en la biblioteca."
          >
            <button className="button secondary" onClick={() => setBookForm('new')}>
              Añadir su primer libro
            </button>
          </Empty>
        )}
        <Link href={'/books?authorId=' + author.id} className="text-link author-catalog-link">
          Explorar en el catálogo <ArrowUpRight size={16} />
        </Link>
      </section>
      {edit && (
        <AuthorForm
          author={author}
          onClose={() => setEdit(false)}
          onSaved={() => {
            setEdit(false);
            setToast('Información del autor actualizada.');
            load();
          }}
        />
      )}
      {bookForm && catalog && (
        <BookForm
          book={bookForm === 'new' ? undefined : bookForm}
          authors={catalog.authors}
          genres={catalog.genres}
          authorId={author.id}
          onClose={() => setBookForm(null)}
          onSaved={() => {
            setBookForm(null);
            setToast('Libro guardado. Estadísticas actualizadas.');
            load();
          }}
        />
      )}
      {remove && (
        <ConfirmDelete
          name={remove.title}
          busy={busy}
          error={deleteError}
          onConfirm={deleteRecord}
          onClose={() => setRemove(null)}
        />
      )}
      {toast && <Toast message={toast} dismiss={dismiss} />}
    </div>
  );
}
