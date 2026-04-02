import type { HTMLAttributes, PropsWithChildren } from "react";
import { cn } from "../../lib/utils";

type CardProps = PropsWithChildren<HTMLAttributes<HTMLDivElement>>;

export const Card = ({ children, className, ...props }: CardProps) => {
  const isSuperAdminArea =
    typeof window !== "undefined" && window.location.pathname.startsWith("/super-admin");

  return (
    <div
      className={cn(
        isSuperAdminArea
          ? "rounded-[1.35rem] border border-white/70 bg-white/95 p-4 shadow-[0_16px_36px_rgba(15,23,42,0.07)] ring-1 ring-slate-100/80 transition-shadow hover:shadow-[0_20px_44px_rgba(15,23,42,0.1)] sm:rounded-[1.5rem] sm:p-5 md:p-6"
          : "rounded-[1.75rem] border border-slate-200/80 bg-white p-5 shadow-[0_14px_38px_rgba(15,23,42,0.06)] ring-1 ring-white/60 transition duration-200 hover:shadow-[0_20px_44px_rgba(15,23,42,0.08)] sm:p-6",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export default Card;
