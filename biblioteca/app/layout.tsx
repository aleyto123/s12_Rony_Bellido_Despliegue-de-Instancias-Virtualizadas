import type { Metadata } from 'next';
import { Shell } from '@/components/shell';
import './globals.css';
import './theme.css';
export const metadata: Metadata = {
  title: 'Índice RB | Biblioteca',
  description:
    'Biblioteca de Rony Bellido. Registro de autores, consulta de libros y estadísticas.',
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
