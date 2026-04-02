import type { ButtonHTMLAttributes, PropsWithChildren } from "react";
import { cn } from "../../lib/utils";

type ButtonProps = PropsWithChildren<
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "primary" | "secondary" | "ghost" | "outline";
    fullWidth?: boolean;
  }
>;

const variants = {
  primary:
    "bg-gradient-to-r from-sky-500 to-brand-600 text-white shadow-[0_12px_24px_rgba(37,99,235,0.22)] hover:from-sky-600 hover:to-brand-700 focus-visible:ring-brand-300",
  secondary:
    "bg-slate-900 text-white shadow-[0_10px_24px_rgba(15,23,42,0.18)] hover:bg-slate-800 focus-visible:ring-slate-300",
  ghost:
    "bg-slate-100 text-slate-700 hover:bg-slate-200 focus-visible:ring-slate-300",
  outline:
    "border border-slate-200 bg-white text-slate-700 shadow-[0_8px_20px_rgba(15,23,42,0.06)] hover:bg-slate-50 focus-visible:ring-slate-300",
};

export const Button = ({
  children,
  className,
  variant = "primary",
  fullWidth,
  ...props
}: ButtonProps) => {
  const isSuperAdminArea =
    typeof window !== "undefined" && window.location.pathname.startsWith("/super-admin");

  const activeVariants = isSuperAdminArea
    ? variants
    : {
        primary:
          "bg-blue-600 text-white shadow-[0_12px_24px_rgba(37,99,235,0.22)] hover:bg-blue-700 focus-visible:ring-blue-200",
        secondary:
          "bg-slate-900 text-white shadow-[0_10px_24px_rgba(15,23,42,0.14)] hover:bg-slate-800 focus-visible:ring-slate-300",
        ghost:
          "bg-slate-100 text-slate-700 hover:bg-slate-200 focus-visible:ring-slate-300",
        outline:
          "border border-slate-200 bg-white text-slate-700 shadow-[0_8px_20px_rgba(15,23,42,0.04)] hover:border-slate-300 hover:bg-slate-50 focus-visible:ring-slate-300",
      };

  return (
    <button
      className={cn(
        isSuperAdminArea
          ? "inline-flex min-h-11 items-center justify-center gap-2 rounded-[1rem] px-4 py-3 text-sm font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-60"
          : "inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-60",
        activeVariants[variant],
        fullWidth && "w-full",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
