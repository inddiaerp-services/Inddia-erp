import Button from "./Button";

type ActionIconButtonProps = {
  action: "view" | "edit" | "delete";
  onClick?: () => void;
  className?: string;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
};

const iconClassName = "h-5 w-5 shrink-0";

const outlineIconProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2.4,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  className: iconClassName,
  "aria-hidden": true,
};

const solidIconProps = {
  viewBox: "0 0 24 24",
  fill: "currentColor",
  className: iconClassName,
  "aria-hidden": true,
};

const iconMap = {
  view: (
    <svg {...outlineIconProps}>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  edit: (
    <svg {...solidIconProps}>
      <path d="m3 17.25 9.9-9.9 3.75 3.75-9.9 9.9L3 21l.25-3.75Zm11.85-11.85 1.4-1.4a2 2 0 0 1 2.83 0l.92.92a2 2 0 0 1 0 2.83l-1.4 1.4-3.75-3.75Z" />
    </svg>
  ),
  delete: (
    <svg {...solidIconProps}>
      <path d="M9 3a1 1 0 0 0-1 1v1H4.5a1 1 0 1 0 0 2H5l1 12.2A2 2 0 0 0 8 21h8a2 2 0 0 0 2-1.8L19 7h.5a1 1 0 1 0 0-2H16V4a1 1 0 0 0-1-1H9Zm1 2h4v1h-4V5Zm-.5 5a1 1 0 0 1 1 1v6a1 1 0 1 1-2 0v-6a1 1 0 0 1 1-1Zm5 0a1 1 0 0 1 1 1v6a1 1 0 1 1-2 0v-6a1 1 0 0 1 1-1Z" />
    </svg>
  ),
};

const classMap = {
  view: "border border-blue-200 bg-blue-50 !text-blue-700 hover:bg-blue-100",
  edit: "border border-amber-200 bg-amber-50 !text-amber-700 hover:bg-amber-100",
  delete: "border border-rose-200 bg-rose-50 !text-rose-700 hover:bg-rose-100",
};

export default function ActionIconButton({ action, onClick, className = "", type = "button", disabled = false }: ActionIconButtonProps) {
  const label = action[0].toUpperCase() + action.slice(1);

  return (
    <Button
      type={type}
      variant="outline"
      onClick={onClick}
      disabled={disabled}
      aria-label={action}
      title={label}
      className={`h-10 shrink-0 whitespace-nowrap rounded-xl px-2.5 py-2 text-[11px] ${classMap[action]} ${className}`.trim()}
    >
      <span className="flex items-center justify-center leading-none">{iconMap[action]}</span>
      <span>{label}</span>
    </Button>
  );
}
