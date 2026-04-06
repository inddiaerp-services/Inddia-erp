import type { HTMLAttributes, PropsWithChildren } from "react";
import { cn } from "../../lib/utils";

type CardProps = PropsWithChildren<HTMLAttributes<HTMLDivElement>>;

export const Card = ({ children, className, ...props }: CardProps) => {
  return (
    <div
      className={cn(
        "ui-card p-5 transition duration-200 sm:p-6",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export default Card;
