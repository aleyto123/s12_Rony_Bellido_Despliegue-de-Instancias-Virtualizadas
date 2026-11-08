'use client';
import { ErrorState } from '@/components/ui';
export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="page">
      <ErrorState
        message="Ocurrió un error al abrir esta página. Puedes volver a intentarlo."
        retry={reset}
      />
    </div>
  );
}
