type AttendanceStatusToggleProps = {
  value: "Present" | "Absent";
  onChange: (value: "Present" | "Absent") => void;
  disabled?: boolean;
};

const baseButtonClassName =
  "inline-flex min-w-[96px] items-center justify-center rounded-2xl border px-4 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-offset-1";

const AttendanceStatusToggle = ({
  value,
  onChange,
  disabled = false,
}: AttendanceStatusToggleProps) => (
  <div className="inline-flex rounded-[1.2rem] bg-slate-100 p-1">
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange("Present")}
      className={`${baseButtonClassName} ${
        value === "Present"
          ? "border-emerald-600 bg-emerald-600 text-white shadow-sm focus:ring-emerald-300"
          : "border-transparent bg-white text-emerald-700 focus:ring-emerald-200"
      } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
    >
      Present
    </button>
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange("Absent")}
      className={`${baseButtonClassName} ${
        value === "Absent"
          ? "border-rose-600 bg-rose-600 text-white shadow-sm focus:ring-rose-300"
          : "border-transparent bg-white text-rose-700 focus:ring-rose-200"
      } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
    >
      Absent
    </button>
  </div>
);

export default AttendanceStatusToggle;
