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

  const isSuperAdminArea =
    typeof window !== "undefined" && window.location.pathname.startsWith("/super-admin");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-2 py-2 sm:px-4 sm:py-6">
      <div className="absolute inset-0" onClick={onClose} />
      <div className={`relative z-10 flex w-full flex-col overflow-hidden border border-slate-200/80 bg-white shadow-2xl sm:max-h-[88vh] sm:rounded-[2rem] ${maxWidthClass}`}>
        <div className={isSuperAdminArea ? "border-b border-slate-200/80 bg-gradient-to-r from-slate-50 via-white to-sky-50/70" : "border-b border-slate-200/80 bg-slate-50/90"}>
          <div className="flex items-start justify-between gap-4 px-4 py-5 sm:px-5 md:px-6">
            <div className="min-w-0">
              <p className={`text-[11px] font-semibold uppercase tracking-[0.24em] ${isSuperAdminArea ? "text-sky-700" : "text-blue-700"}`}>
                {isSuperAdminArea ? "Superadmin Form" : "Workspace Form"}
              </p>
              <h2 className="mt-2 text-xl font-semibold text-slate-900 sm:text-2xl">{title}</h2>
              {description ? <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{description}</p> : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
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
