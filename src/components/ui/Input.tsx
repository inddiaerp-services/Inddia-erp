import type { ChangeEvent, InputHTMLAttributes } from "react";
import { forwardRef } from "react";
import { cn } from "../../lib/utils";

const formatDateForInput = (value: Date) => {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getDateThirtyMonthsAgo = () => {
  const value = new Date();
  value.setMonth(value.getMonth() - 30);
  return formatDateForInput(value);
};

const getEarlierDate = (first?: string, second?: string) => {
  if (!first) return second;
  if (!second) return first;
  return first < second ? first : second;
};

const getStringValue = (value: string | number | undefined) =>
  typeof value === "string" ? value : undefined;

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
  labelClassName?: string;
  errorClassName?: string;
  variant?: "light" | "dark";
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      label,
      error,
      labelClassName,
      errorClassName,
      variant = "light",
      onChange,
      ...props
    },
    ref,
  ) => {
    const isCalendarInput = props.type === "date" || props.type === "month";
    const constraintSource = [label, props.name, props.id, props.placeholder]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    const isDateOfBirthInput =
      props.type === "date" && (constraintSource.includes("date of birth") || constraintSource.includes("dob"));
    const digitLimit = constraintSource.includes("aadhaar") || constraintSource.includes("aadhar")
      ? 12
      : constraintSource.includes("mobile") || constraintSource.includes("phone")
        ? 10
        : undefined;
    const shouldConstrainDigits =
      digitLimit !== undefined && (!props.type || props.type === "text" || props.type === "tel");
    const inputMax = getStringValue(props.max);
    const dateOfBirthMax = isDateOfBirthInput ? getEarlierDate(inputMax, getDateThirtyMonthsAgo()) : inputMax;

    const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
      if (!shouldConstrainDigits && !isDateOfBirthInput) {
        onChange?.(event);
        return;
      }

      let sanitizedValue = event.target.value;

      if (shouldConstrainDigits) {
        sanitizedValue = sanitizedValue.replace(/\D/g, "").slice(0, digitLimit);
      }

      if (isDateOfBirthInput && dateOfBirthMax && sanitizedValue > dateOfBirthMax) {
        sanitizedValue = dateOfBirthMax;
      }

      if (sanitizedValue === event.target.value) {
        onChange?.(event);
        return;
      }

      onChange?.({
        ...event,
        target: { ...event.target, value: sanitizedValue },
        currentTarget: { ...event.currentTarget, value: sanitizedValue },
      } as ChangeEvent<HTMLInputElement>);
    };

    return (
      <label className="block space-y-2">
        {label ? (
          <span
            className={cn(
              "text-sm font-medium",
              variant === "dark" ? "text-slate-200" : "text-slate-700",
              labelClassName,
            )}
          >
            {label}
          </span>
        ) : null}
        <div className="relative">
          <input
            ref={ref}
            className={cn(
              "ui-input text-sm",
              isCalendarInput && "ui-calendar-input pr-12",
              variant === "dark"
                ? "border-white/10 bg-slate-900/70 text-white placeholder:text-slate-500"
                : "",
              error && "border-rose-400/70 focus:border-rose-400 focus:ring-rose-500/20",
              className,
            )}
            {...props}
            inputMode={shouldConstrainDigits ? "numeric" : props.inputMode}
            maxLength={shouldConstrainDigits ? Math.min(props.maxLength ?? digitLimit, digitLimit) : props.maxLength}
            max={dateOfBirthMax}
            pattern={shouldConstrainDigits ? "\\d*" : props.pattern}
            onChange={handleChange}
          />
          {isCalendarInput ? (
            <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-slate-400">
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
              >
                <rect x="3" y="5" width="18" height="16" rx="2" />
                <path d="M16 3v4M8 3v4M3 10h18" />
              </svg>
            </span>
          ) : null}
        </div>
        {error ? (
          <p
            className={cn(
              "text-sm",
              variant === "dark" ? "text-rose-300" : "text-rose-600",
              errorClassName,
            )}
          >
            {error}
          </p>
        ) : null}
      </label>
    );
  },
);

Input.displayName = "Input";

export default Input;
