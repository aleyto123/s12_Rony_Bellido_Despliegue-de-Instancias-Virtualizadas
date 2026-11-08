'use client';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Plus,
  Search,
  SlidersHorizontal,
  LayoutGrid,
  List,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
  ArrowUpRight,
  X,
  BookOpen,
  ArrowDownUp,
} from 'lucide-react';
import type { Book, SearchResult } from '@/lib/types';
import type { Catalog } from '@/lib/catalog';
import { number, request } from '@/lib/client';
import { BookForm } from '@/components/forms';
import { ConfirmDelete, Empty, ErrorState, Loading, Modal, Toast } from '@/components/ui';
import { BookCover } from '@/components/book-cover';

export default function BooksPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Books />
    </Suspense>
  );
}
function Books() {
  const params = useSearchParams();
  const [search, setSearch] = useState(params.get('search') || '');
  const [genre, setGenre] = useState('');
  const [authorId, setAuthorId] = useState(params.get('authorId') || '');
  const [sort, setSort] = useState('createdAt:desc');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(8);
  const [view, setView] = useState('grid');
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [catalogError, setCatalogError] = useState('');
  const [revision, setRevision] = useState(0);
  const [form, setForm] = useState<Book | 'new' | null>(null);
  const [detail, setDetail] = useState<Book | null>(null);
  const [remove, setRemove] = useState<Book | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [toast, setToast] = useState('');
  const dismiss = useCallback(() => setToast(''), []);
  useEffect(() => {
    const controller = new AbortController();
    request<Catalog>('/api/catalog', { signal: controller.signal })
      .then((data) => {
        setCatalog(data);
        setCatalogError('');
      })
      .catch((e) => {
        if (e.name !== 'AbortError') setCatalogError(e.message);
      });
    return () => controller.abort();
  }, [revision]);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    const timer = setTimeout(async () => {
      const [sortBy, order] = sort.split(':');
      const q = new URLSearchParams({
        search,
        genre,
        authorId,
        page: String(page),
        limit: String(limit),
        sortBy,
        order,
      });
      try {
        const data = await request<SearchResult>('/api/books/search?' + q, {
          signal: controller.signal,
        });
        if (data.pagination.total > 0 && page > data.pagination.totalPages) {
          setPage(data.pagination.totalPages);
          return;
        }
        setResult(data);
      } catch (e) {
        if ((e as Error).name !== 'AbortError') setError((e as Error).message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [search, genre, authorId, sort, page, limit, revision]);
  function clearFilters() {
    setSearch('');
    setGenre('');
    setAuthorId('');
    setPage(1);
  }
  async function deleteRecord() {
    if (!remove) return;
    setBusy(true);
    setDeleteError('');
    try {
      await request('/api/books/' + remove.id, { method: 'DELETE' });
      setRemove(null);
      setRevision((v) => v + 1);
      setToast('Libro eliminado del catálogo.');
    } catch (e) {
      setDeleteError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const hasFilters = Boolean(search || genre || authorId);
  function actions(b: Book) {
    return (
      <div className="card-actions">
        <button
          className="icon-button"
          aria-label={'Editar ' + b.title}
          title="Editar libro"
          onClick={() => setForm(b)}
        >
          <Pencil size={15} />
        </button>
        <button
          className="icon-button delete-action"
          aria-label={'Eliminar ' + b.title}
          title="Eliminar libro"
          onClick={() => {
            setRemove(b);
            setDeleteError('');
          }}
        >
          <Trash2 size={15} />
        </button>
      </div>
    );
  }
  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">EXPLORA TU COLECCIÓN</p>
          <h1>Tu catálogo de libros</h1>
          <p className="page-subtitle">
            Encuentra tu próxima lectura. Cada título tiene su lugar en tu biblioteca.
          </p>
        </div>
        <button
          className="button primary"
          disabled={!catalog?.authors.length}
          title={!catalog?.authors.length ? 'Crea primero un autor en el resumen' : undefined}
          onClick={() => setForm('new')}
        >
          <Plus size={17} />
          Nuevo libro
        </button>
      </div>
      {catalog?.demo && (
        <div className="demo-notice">
          <span className="status-dot" />
          Demostración local <span>·</span> Los cambios se guardan en este equipo.
        </div>
      )}
      {catalogError && (
        <ErrorState message={catalogError} retry={() => setRevision((v) => v + 1)} />
      )}
      {catalog && !catalog.authors.length && (
        <div className="inline-notice">
          Para registrar un libro, primero <Link href="/">crea un autor en el resumen</Link>.
        </div>
      )}
      <div className="catalog-workspace">
        <aside className="catalog-search">
          <div className="filter-panel-heading">
            <span className="tiny-label">TU PRÓXIMA LECTURA</span>
            <h2>Buscar y filtrar</h2>
            <p>Combina los campos para precisar la consulta.</p>
          </div>
          <div className="catalog-search-main">
            <Search size={22} />
            <input
              aria-label="Buscar libros por título"
              type="search"
              placeholder="Escribe parte del título"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
            <span className="search-hint">Por título · búsqueda en tiempo real</span>
          </div>
          <div className="catalog-filters">
            <span className="filter-label">
              <SlidersHorizontal size={16} />
              Filtrar por
            </span>
            <label>
              <span className="filter-field-label">Género literario</span>
              <select
                value={genre}
                onChange={(e) => {
                  setGenre(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">Todos los géneros</option>
                {catalog?.genres.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="filter-field-label">Autor</span>
              <select
                value={authorId}
                onChange={(e) => {
                  setAuthorId(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">Todos los autores</option>
                {catalog?.authors.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </label>
            {hasFilters && (
              <button className="clear-filters" onClick={clearFilters}>
                <X size={14} />
                Limpiar filtros
              </button>
            )}
          </div>
        </aside>
        <section className="catalog-results">
          <div className="results-toolbar">
            <div>
              <h2>
                Tu colección <span className="count-badge">{result?.pagination.total ?? '—'}</span>
              </h2>
              <p aria-live="polite">
                {loading
                  ? 'Buscando en tu biblioteca…'
                  : result
                    ? number(result.pagination.total) + ' libros encontrados'
                    : 'Explora tu catálogo'}
              </p>
            </div>
            <div className="results-controls">
              <label className="sort-control">
                <ArrowDownUp size={15} />
                <span className="sr-only">Ordenar libros</span>
                <select
                  value={sort}
                  onChange={(e) => {
                    setSort(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="createdAt:desc">Más recientes</option>
                  <option value="createdAt:asc">Primeros añadidos</option>
                  <option value="title:asc">Título: A a Z</option>
                  <option value="title:desc">Título: Z a A</option>
                  <option value="publishedYear:desc">Año: más nuevo</option>
                  <option value="publishedYear:asc">Año: más antiguo</option>
                </select>
              </label>
              <div className="view-toggle" aria-label="Presentación del catálogo">
                <button
                  className={view === 'grid' ? 'selected' : ''}
                  aria-label="Vista de tarjetas"
                  aria-pressed={view === 'grid'}
                  onClick={() => setView('grid')}
                >
                  <LayoutGrid size={17} />
                </button>
                <button
                  className={view === 'list' ? 'selected' : ''}
                  aria-label="Vista de tabla"
                  aria-pressed={view === 'list'}
                  onClick={() => setView('list')}
                >
                  <List size={19} />
                </button>
              </div>
            </div>
          </div>
          {loading ? (
            <div className="book-skeletons" role="status" aria-label="Cargando resultados">
              {[1, 2, 3, 4].map((v) => (
                <div key={v} className="book-skeleton">
                  <i />
                  <span />
                  <span />
                </div>
              ))}
            </div>
          ) : error ? (
            <ErrorState message={error} retry={() => setRevision((v) => v + 1)} />
          ) : !result?.data.length ? (
            <Empty
              title={hasFilters ? 'No hay historias con esos filtros' : 'Catálogo vacío'}
              description={
                hasFilters
                  ? 'Prueba un título diferente o amplía tu búsqueda.'
                  : 'Registra un libro para empezar a explorar tu colección.'
              }
            >
              {hasFilters ? (
                <button className="button secondary" onClick={clearFilters}>
                  Limpiar filtros
                </button>
              ) : catalog?.authors.length ? (
                <button className="button primary" onClick={() => setForm('new')}>
                  Añadir libro
                </button>
              ) : (
                <Link className="button primary" href="/">
                  Crear autor
                </Link>
              )}
            </Empty>
          ) : view === 'grid' ? (
            <div className="books-grid">
              {result.data.map((b) => (
                <article className="book-card" key={b.id}>
                  <button
                    className="book-cover-button"
                    onClick={() => setDetail(b)}
                    aria-label={'Ver detalle de ' + b.title}
                  >
                    <BookCover title={b.title} author={b.author?.name} />
                  </button>
                  <div className="book-card-body">
                    <div className="book-meta-top">
                      <span className="genre-pill">{b.genre}</span>
                      <span>{b.publishedYear}</span>
                    </div>
                    <button className="book-title" onClick={() => setDetail(b)}>
                      {b.title}
                    </button>
                    <Link className="book-author" href={'/authors/' + b.authorId}>
                      {b.author?.name}
                    </Link>
                    <div className="book-card-footer">
                      <span>
                        <BookOpen size={13} />
                        {number(b.pages)} págs.
                      </span>
                      {actions(b)}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="table-scroll">
              <table className="books-table">
                <thead>
                  <tr>
                    <th>Libro</th>
                    <th>Autor</th>
                    <th>Género</th>
                    <th>Año</th>
                    <th>Páginas</th>
                    <th>
                      <span className="sr-only">Acciones</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {result.data.map((b) => (
                    <tr key={b.id}>
                      <td>
                        <button className="table-book-title" onClick={() => setDetail(b)}>
                          {b.title}
                        </button>
                        <small>ISBN {b.isbn}</small>
                      </td>
                      <td>
                        <Link href={'/authors/' + b.authorId}>{b.author?.name}</Link>
                      </td>
                      <td>
                        <span className="genre-pill">{b.genre}</span>
                      </td>
                      <td>{b.publishedYear}</td>
                      <td>{number(b.pages)}</td>
                      <td>{actions(b)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {result && !error && (
            <div className="pagination">
              <label>
                Mostrar{' '}
                <select
                  aria-label="Libros por página"
                  value={limit}
                  onChange={(e) => {
                    setLimit(Number(e.target.value));
                    setPage(1);
                  }}
                >
                  {[8, 10, 20, 50].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>{' '}
                por página
              </label>
              <span>
                {result.pagination.total
                  ? (page - 1) * limit + 1 + '–' + Math.min(page * limit, result.pagination.total)
                  : '0'}{' '}
                de {number(result.pagination.total)} libros
              </span>
              <div>
                <button
                  className="pagination-button"
                  aria-label="Página anterior"
                  disabled={loading || !result.pagination.hasPrev}
                  onClick={() => setPage((v) => v - 1)}
                >
                  <ChevronLeft size={17} />
                </button>
                <span className="page-indicator">
                  {page} <small>/ {Math.max(1, result.pagination.totalPages)}</small>
                </span>
                <button
                  className="pagination-button"
                  aria-label="Página siguiente"
                  disabled={loading || !result.pagination.hasNext}
                  onClick={() => setPage((v) => v + 1)}
                >
                  <ChevronRight size={17} />
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
      {form && catalog && (
        <BookForm
          book={form === 'new' ? undefined : form}
          authors={catalog.authors}
          genres={catalog.genres}
          authorId={authorId}
          onClose={() => setForm(null)}
          onSaved={() => {
            setForm(null);
            setRevision((v) => v + 1);
            setToast(
              form === 'new' ? 'Libro añadido a tu colección.' : 'Datos del libro actualizados.',
            );
          }}
        />
      )}
      {detail && (
        <Modal title={detail.title} subtitle={detail.author?.name} onClose={() => setDetail(null)}>
          <div className="book-detail">
            <BookCover title={detail.title} author={detail.author?.name} />
            <div>
              <span className="genre-pill">{detail.genre}</span>
              <p>{detail.description || 'Este libro todavía no tiene una descripción.'}</p>
              <dl>
                <dt>Publicación</dt>
                <dd>{detail.publishedYear}</dd>
                <dt>Páginas</dt>
                <dd>{number(detail.pages)}</dd>
                <dt>ISBN</dt>
                <dd>{detail.isbn}</dd>
              </dl>
            </div>
          </div>
          <div className="form-actions">
            <Link className="button secondary" href={'/authors/' + detail.authorId}>
              Ver autor <ArrowUpRight size={15} />
            </Link>
            <button
              className="button primary"
              onClick={() => {
                setForm(detail);
                setDetail(null);
              }}
            >
              Editar libro
            </button>
          </div>
        </Modal>
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
