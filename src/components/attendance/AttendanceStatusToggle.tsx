type AttendanceStatusToggleProps = {
  value: "Present" | "Absent";
  onChange: (value: "Present" | "Absent") => void;
  disabled?: boolean;
};

const baseButtonClassName =
  "inline-flex h-8 w-8 items-center justify-center rounded-full border text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-offset-1";

const AttendanceStatusToggle = ({
  value,
  onChange,
  disabled = false,
}: AttendanceStatusToggleProps) => (
  <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 p-1">
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange("Present")}
      aria-label="Mark present"
      title="Present"
      className={`${baseButtonClassName} ${
        value === "Present"
          ? "border-emerald-600 bg-emerald-600 text-white shadow-sm focus:ring-emerald-300"
          : "border-transparent bg-white text-emerald-700 focus:ring-emerald-200"
      } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
    >
      <span aria-hidden="true" className="block h-3 w-3 rounded-full bg-current" />
    </button>
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange("Absent")}
      aria-label="Mark absent"
      title="Absent"
      className={`${baseButtonClassName} ${
        value === "Absent"
          ? "border-rose-600 bg-rose-600 text-white shadow-sm focus:ring-rose-300"
          : "border-transparent bg-white text-rose-700 focus:ring-rose-200"
      } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
    >
      <span aria-hidden="true" className="block h-3 w-3 rounded-full bg-current" />
    </button>
  </div>
);

export default AttendanceStatusToggle;
