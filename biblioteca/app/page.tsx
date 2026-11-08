'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import {
  ArrowUpRight,
  Plus,
  Search,
  Pencil,
  Trash2,
  ArrowRight,
  BookOpen,
  Users,
  Layers3,
  Files,
  Sparkles,
  Globe2,
} from 'lucide-react';
import type { Author } from '@/lib/types';
import type { Catalog } from '@/lib/catalog';
import { request, number, initials } from '@/lib/client';
import { AuthorForm } from '@/components/forms';
import { ConfirmDelete, Empty, ErrorState, Loading, Toast } from '@/components/ui';
import { BookCover } from '@/components/book-cover';
import { LibraryArt } from '@/components/library-art';

export default function Dashboard() {
  const [data, setData] = useState<Catalog | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<Author | 'new' | null>(null);
  const [remove, setRemove] = useState<Author | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [toast, setToast] = useState('');
  const dismiss = useCallback(() => setToast(''), []);
  const load = useCallback(async () => {
    setError('');
    try {
      setData(await request<Catalog>('/api/catalog'));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  const authors =
    data?.authors.filter((a) =>
      (a.name + ' ' + a.nationality)
        .toLocaleLowerCase('es')
        .includes(search.toLocaleLowerCase('es')),
    ) || [];
  async function deleteRecord() {
    if (!remove) return;
    setBusy(true);
    setDeleteError('');
    try {
      await request('/api/authors/' + remove.id, { method: 'DELETE' });
      setRemove(null);
      setToast('Autor eliminado.');
      await load();
    } catch (e) {
      setDeleteError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="page dashboard-page">
      <section className="dashboard-hero">
        <div className="hero-copy">
          <p className="eyebrow">
            <Sparkles size={13} />
            UN ESPACIO PARA TUS HISTORIAS
          </p>
          <h1>
            Tu biblioteca,
            <br />
            <span>a tu manera.</span>
          </h1>
          <p className="page-subtitle">
            Reúne a tus autores favoritos, organiza sus obras y descubre todo lo que guarda tu
            colección.
          </p>
          <div className="hero-actions">
            <button className="button primary" onClick={() => setForm('new')}>
              <Plus size={17} />
              Nuevo autor
            </button>
            <Link className="button hero-link" href="/books">
              Explorar libros <ArrowUpRight size={17} />
            </Link>
          </div>
        </div>
        <LibraryArt />
      </section>
      {data?.demo && (
        <div className="demo-notice">
          Demostración local · Los cambios se guardan en este equipo.
        </div>
      )}
      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorState message={error} retry={load} />
      ) : (
        data && (
          <>
            <section className="collection-summary" aria-label="Estadísticas generales">
              {[
                {
                  label: 'Autores',
                  value: data.stats.authors,
                  note: 'Voces en tu biblioteca',
                  icon: Users,
                  tone: 'blue',
                },
                {
                  label: 'Libros',
                  value: data.stats.books,
                  note: 'Historias en la colección',
                  icon: BookOpen,
                  tone: 'violet',
                },
                {
                  label: 'Géneros',
                  value: data.stats.genres,
                  note: 'Formas de contar el mundo',
                  icon: Layers3,
                  tone: 'cyan',
                },
                {
                  label: 'Páginas',
                  value: data.stats.pages,
                  note: 'Un universo de palabras',
                  icon: Files,
                  tone: 'amber',
                },
              ].map(({ label, value, note, icon: Icon, tone }) => (
                <article className={'summary-metric metric-' + tone} key={label}>
                  <div className="metric-heading">
                    <span className="metric-icon">
                      <Icon size={19} />
                    </span>
                    <span>{label}</span>
                  </div>
                  <strong>{number(value)}</strong>
                  <small>{note}</small>
                  <span className="metric-decoration" aria-hidden="true" />
                </article>
              ))}
            </section>
            <div className="directory-workspace">
              <section className="authors-section">
                <div className="section-heading">
                  <div>
                    <h2>
                      Autores de tu colección{' '}
                      <span className="count-badge">{data.authors.length}</span>
                    </h2>
                    <p>Las personas detrás de cada historia.</p>
                  </div>
                  <label className="search-box">
                    <Search size={17} />
                    <input
                      type="search"
                      placeholder="Buscar autor…"
                      aria-label="Buscar autores"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </label>
                </div>
                {authors.length ? (
                  <div className="author-directory">
                    {authors.map((a, index) => (
                      <article className="directory-row" key={a.id}>
                        <div className="author-card-top">
                          <span className={'author-avatar avatar-' + (index % 4)}>
                            {initials(a.name)}
                          </span>
                          <div className="card-actions">
                            <button
                              className="icon-button"
                              title="Editar autor"
                              aria-label={'Editar a ' + a.name}
                              onClick={() => setForm(a)}
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              className="icon-button delete-action"
                              title="Eliminar autor"
                              aria-label={'Eliminar a ' + a.name}
                              onClick={() => {
                                setRemove(a);
                                setDeleteError('');
                              }}
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>
                        <div className="directory-author">
                          <Link href={'/authors/' + a.id} className="author-name">
                            {a.name}
                          </Link>
                          <p className="author-origin">
                            <Globe2 size={13} />
                            {a.nationality}
                            <span>·</span>
                            {a.birthYear}
                          </p>
                          <p className="author-bio">
                            {a.bio ||
                              'Este autor todavía no tiene una biografía. Puedes añadirla desde su ficha.'}
                          </p>
                        </div>
                        <div className="author-card-bottom">
                          <span className="directory-book-count">
                            <BookOpen size={14} />
                            <strong>{a._count?.books || 0}</strong>{' '}
                            {(a._count?.books || 0) === 1 ? 'libro' : 'libros'}
                          </span>
                          <Link className="record-link" href={'/authors/' + a.id}>
                            Ver perfil <ArrowUpRight size={15} />
                          </Link>
                        </div>
                      </article>
                    ))}
                    {!search && (
                      <button className="new-author-card" onClick={() => setForm('new')}>
                        <span className="new-author-icon">
                          <Plus size={25} strokeWidth={1.5} />
                        </span>
                        <strong>Siempre hay otra voz por descubrir.</strong>
                        <span>Añade un autor y amplía tu colección.</span>
                        <span className="new-author-link">
                          Registrar autor <ArrowUpRight size={15} />
                        </span>
                      </button>
                    )}
                  </div>
                ) : (
                  <Empty
                    title={
                      search ? 'No encontramos ese autor' : 'Tu colección empieza con un autor'
                    }
                    description={
                      search
                        ? 'Prueba otro nombre o una nacionalidad diferente.'
                        : 'Registra su perfil y empieza a añadir sus libros favoritos.'
                    }
                  >
                    <button
                      className="button secondary"
                      onClick={() => (search ? setSearch('') : setForm('new'))}
                    >
                      {search ? 'Limpiar búsqueda' : 'Añadir primer autor'}
                    </button>
                  </Empty>
                )}
              </section>
              <aside className="collection-aside">
                <section className="recent-section">
                  <div className="section-heading">
                    <div>
                      <h2>Últimos libros</h2>
                      <p>Lo más reciente de tu estante.</p>
                    </div>
                    <span className="section-icon">
                      <BookOpen size={18} />
                    </span>
                  </div>
                  {data.recentBooks.length ? (
                    <div className="recent-list">
                      {data.recentBooks.map((b) => (
                        <Link
                          href={'/books?search=' + encodeURIComponent(b.title)}
                          key={b.id}
                          className="recent-book"
                        >
                          <BookCover title={b.title} author={b.author?.name} small />
                          <div>
                            <span className="tiny-label">{b.genre}</span>
                            <h3>{b.title}</h3>
                            <p>{b.author?.name}</p>
                            <small>
                              {b.publishedYear} · {b.pages} páginas
                            </small>
                          </div>
                          <ArrowUpRight size={14} />
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-recent">
                      <div className="empty-book-symbol">
                        <BookOpen size={34} strokeWidth={1.4} />
                        <span>+</span>
                      </div>
                      <h3>
                        El próximo capítulo
                        <br />
                        lo eliges tú.
                      </h3>
                      <p>Añade tu primer libro y dale vida a tu colección.</p>
                    </div>
                  )}
                  <Link href="/books" className="aside-link">
                    Ver catálogo completo <ArrowRight size={15} />
                  </Link>
                </section>
                <div className="collection-tip">
                  <Sparkles size={21} />
                  <div>
                    <strong>Todo empieza con curiosidad.</strong>
                    <p>
                      Explora por autor, género o título. Tu próxima lectura puede estar a una
                      búsqueda.
                    </p>
                  </div>
                </div>
              </aside>
            </div>
          </>
        )
      )}
      {form && (
        <AuthorForm
          author={form === 'new' ? undefined : form}
          onClose={() => setForm(null)}
          onSaved={() => {
            setForm(null);
            setToast(
              form === 'new'
                ? 'Autor añadido a tu colección.'
                : 'Información del autor actualizada.',
            );
            load();
          }}
        />
      )}
      {remove && (
        <ConfirmDelete
          name={remove.name}
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
