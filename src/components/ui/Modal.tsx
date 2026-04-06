import type { PropsWithChildren } from "react";

type ModalProps = PropsWithChildren<{
  title: string;
  description?: string;
  open: boolean;
  onClose: () => void;
  maxWidthClass?: string;
}>;

export const Modal = ({
  title,
  description,
  open,
  onClose,
  children,
  maxWidthClass = "max-w-2xl",
}: ModalProps) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-2 py-2 sm:px-4 sm:py-6">
      <div className="absolute inset-0" onClick={onClose} />
      <div className={`ui-card relative z-10 flex w-full flex-col overflow-hidden sm:max-h-[88vh] ${maxWidthClass}`}>
        <div className="border-b border-[var(--border)] bg-[var(--surface-muted)]">
          <div className="flex items-start justify-between gap-4 px-4 py-5 sm:px-5 md:px-6">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--primary)]">
                Workspace Form
              </p>
              <h2 className="mt-2 text-xl font-semibold text-slate-900 sm:text-2xl">{title}</h2>
              {description ? <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{description}</p> : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="ui-button ui-button-outline h-11 w-11 shrink-0 rounded-xl p-0 text-slate-500 hover:text-slate-900"
              aria-label="Close modal"
            >
              ×
            </button>
          </div>
        </div>
        <div className="overflow-y-auto px-4 py-5 sm:px-5 md:px-6 md:py-6">{children}</div>
      </div>
    </div>
  );
};

export default Modal;
