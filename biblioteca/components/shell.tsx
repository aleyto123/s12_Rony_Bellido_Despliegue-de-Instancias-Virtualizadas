'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowUpRight, HelpCircle, Menu, X, BookOpen, Users } from 'lucide-react';
import { useState } from 'react';
import { Modal } from './ui';

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [menu, setMenu] = useState(false);
  const [help, setHelp] = useState(false);
  return (
    <div className="app">
      <a className="skip-link" href="#main-content">
        Ir al contenido
      </a>
      <header className="site-header">
        <div className="header-inner">
          <Link
            href="/"
            className="brand"
            aria-label="Índice RB, inicio"
            onClick={() => setMenu(false)}
          >
            <span className="brand-symbol">
              <BookOpen size={24} strokeWidth={1.8} />
            </span>
            <span className="brand-wordmark">
              índice<span className="brand-dot">.</span>
              <small>TU BIBLIOTECA PERSONAL</small>
            </span>
          </Link>
          <nav
            className={'primary-nav ' + (menu ? 'nav-open' : '')}
            aria-label="Navegación principal"
          >
            <Link
              href="/"
              className={
                pathname === '/' || pathname.startsWith('/authors') ? 'nav-item active' : 'nav-item'
              }
              aria-current={
                pathname === '/' || pathname.startsWith('/authors') ? 'page' : undefined
              }
              onClick={() => setMenu(false)}
            >
              <Users size={17} />
              Autores
            </Link>
            <Link
              href="/books"
              className={pathname === '/books' ? 'nav-item active' : 'nav-item'}
              aria-current={pathname === '/books' ? 'page' : undefined}
              onClick={() => setMenu(false)}
            >
              <BookOpen size={17} />
              Libros
            </Link>
          </nav>
          <div className="header-identity">
            <button
              className="icon-button"
              aria-label="Ayuda de la biblioteca"
              title="Ayuda"
              onClick={() => setHelp(true)}
            >
              <HelpCircle size={20} />
            </button>
            <span className="identity-divider" />
            <span className="profile-avatar">RB</span>
            <span>
              Rony Bellido<small>Mi espacio de lectura</small>
            </span>
          </div>
          <button
            className="mobile-menu icon-button"
            aria-label={menu ? 'Cerrar navegación' : 'Abrir navegación'}
            aria-expanded={menu}
            onClick={() => setMenu(!menu)}
          >
            {menu ? <X size={21} /> : <Menu size={21} />}
          </button>
        </div>
      </header>
      <main id="main-content">{children}</main>
      <footer className="footer">
        <span>
          <BookOpen size={14} />
          <strong>índice.</strong>
          <span>Una biblioteca, muchas posibilidades.</span>
        </span>
        <div>
          <Link href="/">Autores</Link>
          <Link href="/books">
            Explorar libros <ArrowUpRight size={13} />
          </Link>
        </div>
      </footer>
      {help && (
        <Modal
          title="Tu biblioteca, en orden."
          subtitle="Registra, organiza y encuentra tus próximas lecturas."
          onClose={() => setHelp(false)}
        >
          <ol className="help-steps">
            <li>
              <strong>Empieza por sus autores.</strong>
              <p>Crea un perfil con su nombre, nacionalidad y biografía.</p>
            </li>
            <li>
              <strong>Añade sus libros.</strong>
              <p>Registra el título y sus datos, y vincúlalo con el autor correspondiente.</p>
            </li>
            <li>
              <strong>Encuentra lo que buscas.</strong>
              <p>Combina filtros, ordena el catálogo y consulta las estadísticas de cada autor.</p>
            </li>
          </ol>
          <p className="inline-notice">
            Un autor puede eliminarse cuando ya no tiene libros asociados.
          </p>
          <div className="form-actions">
            <button className="button primary" onClick={() => setHelp(false)}>
              Entendido
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
