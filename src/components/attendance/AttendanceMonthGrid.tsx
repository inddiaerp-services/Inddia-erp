import type { AttendanceMonthCell, AttendanceMonthGrid, TimetableSlotRecord } from "../../types/admin";

type Props = {
  grid: AttendanceMonthGrid;
  mode: "teacher" | "class" | "student";
  onCellClick?: (date: string, slot: TimetableSlotRecord) => void;
};

const getCell = (grid: AttendanceMonthGrid, date: string, startTime: string, endTime: string) =>
  grid.cells.find((cell) => cell.date === date && cell.startTime === startTime && cell.endTime === endTime) ?? null;

const getCellButtonClassName = (cell: AttendanceMonthCell | null, isClickable: boolean) => {
  if (cell?.isHoliday) return "cursor-default bg-amber-50";
  if (cell?.isExamDay) return "cursor-default bg-sky-50";
  if (cell?.slot?.isBreak) return "cursor-default bg-amber-50";
  if (isClickable) return "bg-white transition hover:bg-brand-50";
  return "cursor-default bg-white";
};

const renderCellContent = (
  cell: AttendanceMonthCell | null,
  slot: TimetableSlotRecord | null,
  mode: Props["mode"],
) => {
  const studentStatus = cell?.studentStatus ?? null;
  const studentCount = cell?.studentCount ?? null;
  const presentCount = cell?.presentCount ?? null;

  if (cell?.isHoliday) {
    return (
      <div className="flex h-full items-center justify-center text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">
          {cell.holidayTitle ?? "Holiday"}
        </p>
      </div>
    );
  }

  if (cell?.isExamDay) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">Exam</p>
        <p className="mt-1 text-xs text-sky-700">{cell.examName ?? "Exam Day"}</p>
      </div>
    );
  }

  if (!slot) {
    return (
      <div className="flex h-full items-center justify-center text-xs uppercase tracking-[0.16em] text-slate-300">
        Empty
      </div>
    );
  }

  if (slot.isBreak) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">Break</p>
        <p className="mt-1 text-xs text-amber-700">{slot.breakType ?? slot.breakLabel ?? "School Break"}</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <p className="text-sm font-semibold text-slate-900">{slot.subjectName}</p>
      {mode !== "student" ? (
        <p className="text-xs text-slate-500">
          {slot.className} / {slot.section}
        </p>
      ) : null}
      {mode === "student" ? (
        <p
          className={`inline-flex rounded-full px-2 py-1 text-[11px] font-semibold ${
            studentStatus === "Present"
              ? "bg-emerald-50 text-emerald-700"
              : studentStatus === "Absent"
                ? "bg-rose-50 text-rose-700"
                : "bg-slate-100 text-slate-500"
          }`}
        >
          {studentStatus ?? "Not marked"}
        </p>
      ) : (
        <p className="text-xs text-slate-600">
          {studentCount ? `${presentCount ?? 0}/${studentCount} present` : "Not marked"}
        </p>
      )}
    </div>
  );
};

export const AttendanceMonthGridView = ({ grid, mode, onCellClick }: Props) => {
  if (grid.columns.length === 0 || grid.timeRows.length === 0) {
    return (
      <div className="flex min-h-[220px] items-center justify-center px-6 text-center text-slate-500">
        No timetable slots found for this month.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <div
        className="grid min-w-[1800px] border-t border-l border-slate-200"
        style={{ gridTemplateColumns: `110px repeat(${grid.columns.length}, minmax(120px, 1fr))` }}
      >
        <div className="border-b border-r border-slate-200 bg-slate-50 px-4 py-4 text-sm font-semibold text-slate-700">
          Time
        </div>
        {grid.columns.map((column) => (
          <div
            key={column.date}
            className={`border-b border-r border-slate-200 px-3 py-3 text-center ${
              column.isHoliday ? "bg-amber-50" : column.isExamDay ? "bg-sky-50" : "bg-slate-50"
            }`}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{column.day}</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">{column.label}</p>
            {column.holidayTitle ? (
              <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-amber-700">{column.holidayTitle}</p>
            ) : column.examName ? (
              <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-sky-700">{column.examName}</p>
            ) : null}
          </div>
        ))}

        {grid.timeRows.map((row) => (
          <div key={`${row.start}-${row.end}-row`} className="contents">
            <div className="border-b border-r border-slate-200 bg-slate-50/70 px-4 py-5 text-sm font-medium text-slate-700">
              {row.start}-{row.end}
            </div>
            {grid.columns.map((column) => {
              const cell = getCell(grid, column.date, row.start, row.end);
              const slot = cell?.slot ?? null;
              const isClickable = Boolean(slot && !slot.isBreak && onCellClick && !cell?.isHoliday && !cell?.isExamDay);

              return (
                <button
                  key={`${column.date}-${row.start}-${row.end}`}
                  type="button"
                  disabled={!isClickable}
                  onClick={() => {
                    if (slot && onCellClick) onCellClick(column.date, slot);
                  }}
                  className={`min-h-[108px] border-b border-r border-slate-200 p-3 text-left ${getCellButtonClassName(cell, isClickable)}`}
                >
                  {renderCellContent(cell, slot, mode)}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AttendanceMonthGridView;
