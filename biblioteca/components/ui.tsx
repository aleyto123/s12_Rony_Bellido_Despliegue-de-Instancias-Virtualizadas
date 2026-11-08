'use client';
import { useEffect, useId, useRef } from 'react';
import { AlertCircle, BookOpen, LoaderCircle, X } from 'lucide-react';
export function Modal({
  title,
  subtitle,
  children,
  onClose,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  const id = useId();
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = ref.current;
    el?.showModal();
    return () => el?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal"
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      aria-labelledby={id}
    >
      <button className="modal-close icon-button" onClick={onClose} aria-label="Cerrar formulario">
        <X size={20} />
      </button>
      <span className="eyebrow">ÍNDICE RB / FICHA DE REGISTRO</span>
      <h2 id={id}>{title}</h2>
      {subtitle && <p className="modal-subtitle">{subtitle}</p>}
      {children}
    </dialog>
  );
}
export function Loading({ label = 'Cargando biblioteca…' }: { label?: string }) {
  return (
    <div className="loading-state" role="status">
      <LoaderCircle className="spin" size={23} />
      <span>{label}</span>
    </div>
  );
}
export function ErrorState({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <div className="error-state" role="alert">
      <AlertCircle size={22} />
      <h3>No pudimos completar la solicitud</h3>
      <p>{message}</p>
      {retry && (
        <button className="button secondary" onClick={retry}>
          Volver a intentar
        </button>
      )}
    </div>
  );
}
export function Empty({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <BookOpen size={28} />
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
      {children}
    </div>
  );
}
export function Toast({ message, dismiss }: { message: string; dismiss: () => void }) {
  useEffect(() => {
    const timer = setTimeout(dismiss, 5000);
    return () => clearTimeout(timer);
  }, [message, dismiss]);
  return (
    <div className="toast" role="status">
      <span>✓</span>
      {message}
      <button className="icon-button" aria-label="Cerrar aviso" onClick={dismiss}>
        <X size={16} />
      </button>
    </div>
  );
}
export function ConfirmDelete({
  name,
  busy,
  error,
  onConfirm,
  onClose,
}: {
  name: string;
  busy: boolean;
  error: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal
      title="¿Eliminar este registro?"
      subtitle="Esta acción es permanente."
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <p className="delete-description">
        Se eliminará <strong>{name}</strong> de tu biblioteca.
      </p>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="form-actions">
        <button className="button secondary" disabled={busy} onClick={onClose}>
          Cancelar
        </button>
        <button className="button danger" disabled={busy} onClick={onConfirm}>
          {busy ? <LoaderCircle className="spin" size={16} /> : null}Eliminar registro
        </button>
      </div>
    </Modal>
  );
}
