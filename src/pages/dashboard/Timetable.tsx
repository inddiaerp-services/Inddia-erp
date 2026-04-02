import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import Modal from "../../components/ui/Modal";
import { ROLES } from "../../config/roles";
import { AdminPageHeader } from "./adminPageUtils";
import { authStore } from "../../store/authStore";
import {
  TIMETABLE_PERMISSION_DENIED_MESSAGE,
  createTimetableSlot,
  deleteTimetableSlot,
  getChildrenByParentUserId,
  getCoordinatorAssignment,
  getStaffByUserId,
  getSelectableSubjects,
  getStudentByUserId,
  getTimetableAccess,
  listExamSchedules,
  listHolidays,
  listTimetableImpacts,
  listTimetableClassOptions,
  listTimetableTeachers,
  loadMyTeachingTimetable,
  loadTimetable,
  updateTimetableSlot,
} from "../../services/adminService";
import type {
  ExamScheduleRecord,
  StaffRecord,
  SubjectRecord,
  TimetableAccess,
  TimetableClassOption,
  TimetableDay,
  TimetableFormValues,
  TimetableImpactRecord,
  TimetableSlotRecord,
  HolidayRecord,
} from "../../types/admin";
import { addDaysToDateString, formatShortDateFromDateString, getIndiaTodayIso, getWeekdayFromDateString } from "../../utils/date";

const DAYS: TimetableDay[] = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const SCHOOL_DAY_START = "08:00";
const SCHOOL_DAY_END = "16:30";
const DEFAULT_CLASS_DURATION_MINUTES = 60;
const buildHalfHourOptions = (startHour: number, endHour: number, includeEndHalfHour = false) => {
  const options: string[] = [];

  for (let hour = startHour; hour <= endHour; hour += 1) {
    for (const minute of [0, 30]) {
      if (hour === endHour && minute > 0 && !includeEndHalfHour) continue;
      options.push(`${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`);
    }
  }

  return options;
};

const TIME_OPTIONS = buildHalfHourOptions(8, 16, true);
const BREAK_PRESETS = [
  { label: "Short Break", type: "Short Break", durationMinutes: 30, defaultLabel: "Short Break" },
  { label: "Lunch Break", type: "Lunch Break", durationMinutes: 60, defaultLabel: "Lunch Break" },
] as const;
const EXAM_MORNING_START = "08:00";
const EXAM_MORNING_END = "12:30";
const EXAM_AFTERNOON_START = "13:30";
const EXAM_AFTERNOON_END = "16:30";

type DayExamSummary = {
  label: string;
  isFullDay: boolean;
};

const summarizeExamLabels = (labels: string[]) => {
  const uniqueLabels = Array.from(new Set(labels.filter(Boolean)));
  if (uniqueLabels.length === 0) return "";
  if (uniqueLabels.length <= 2) return uniqueLabels.join(" / ");
  return `${uniqueLabels.length} papers scheduled`;
};

const formatExamLabel = (exam: Pick<ExamScheduleRecord, "name" | "examSession" | "subjectName">) => {
  const examName = exam.examSession === "Full Day" ? exam.name : `${exam.name} (${exam.examSession})`;
  return exam.subjectName ? `${exam.subjectName} - ${examName}` : examName;
};
const formatExamBannerLabel = (exam: Pick<ExamScheduleRecord, "name" | "examSession" | "subjectName">) =>
  exam.examSession === "Full Day" ? `Exam Day: ${formatExamLabel(exam)}` : `Half-Day Exam: ${formatExamLabel(exam)}`;

const doesExamBlockSlot = (
  exam: Pick<ExamScheduleRecord, "examSession" | "startTime" | "endTime">,
  startTime: string,
  endTime: string,
) => {
  const examStart =
    exam.startTime ??
    (exam.examSession === "Morning"
      ? EXAM_MORNING_START
      : exam.examSession === "Afternoon"
        ? EXAM_AFTERNOON_START
        : EXAM_MORNING_START);
  const examEnd =
    exam.endTime ??
    (exam.examSession === "Morning"
      ? EXAM_MORNING_END
      : exam.examSession === "Afternoon"
        ? EXAM_AFTERNOON_END
        : EXAM_AFTERNOON_END);

  return startTime < examEnd && endTime > examStart;
};

const timeToMinutes = (value: string) => {
  const [hours, minutes] = value.split(":").map(Number);
  return (hours || 0) * 60 + (minutes || 0);
};

const minutesToTime = (minutes: number) => {
  const bounded = Math.max(0, Math.min(minutes, 23 * 60 + 59));
  const hours = Math.floor(bounded / 60);
  const mins = bounded % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
};

const addMinutesToTime = (value: string, minutes: number) => minutesToTime(timeToMinutes(value) + minutes);
const getNextTeachingEndTime = (startTime: string) => addMinutesToTime(startTime, DEFAULT_CLASS_DURATION_MINUTES);
const uniqueByKey = <T,>(items: T[], getKey: (item: T) => string) =>
  Array.from(new Map(items.map((item) => [getKey(item), item])).values());

const generateSchoolDayRows = (slots: TimetableSlotRecord[]) => {
  const schoolBreaks = uniqueByKey(
    slots.filter((slot) => slot.isBreak),
    (slot) => `${slot.startTime}-${slot.endTime}-${slot.breakType ?? slot.breakLabel ?? "Break"}`,
  ).sort((a, b) => a.startTime.localeCompare(b.startTime));

  const rows: Array<{ start: string; end: string }> = [];
  let cursor = SCHOOL_DAY_START;

  while (cursor < SCHOOL_DAY_END) {
    const activeBreak = schoolBreaks.find((slot) => slot.startTime === cursor);
    if (activeBreak) {
      rows.push({ start: activeBreak.startTime, end: activeBreak.endTime });
      cursor = activeBreak.endTime;
      continue;
    }

    const nextEnd = getNextTeachingEndTime(cursor);
    if (nextEnd > SCHOOL_DAY_END) break;
    rows.push({ start: cursor, end: nextEnd });
    cursor = nextEnd;
  }

  const slotRows = slots.map((slot) => ({ start: slot.startTime, end: slot.endTime }));
  return uniqueByKey([...rows, ...slotRows], (row) => `${row.start}-${row.end}`).sort((a, b) => a.start.localeCompare(b.start));
};

const getWeekDates = (referenceDate: string) => {
  const dayIndex = DAYS.indexOf(getWeekdayFromDateString(referenceDate) as TimetableDay);
  const diffToMonday = dayIndex === 6 ? -6 : -Math.max(dayIndex, 0);

  return DAYS.reduce<Record<TimetableDay, string>>((accumulator, day, index) => {
    accumulator[day] = addDaysToDateString(referenceDate, diffToMonday + index);
    return accumulator;
  }, {} as Record<TimetableDay, string>);
};

const formatColumnDate = (date: string) => formatShortDateFromDateString(date);

type TimetableMode = "admin" | "coordinator" | "my";

type ModalState = {
  open: boolean;
  mode: "create" | "edit" | "view";
  slot: TimetableSlotRecord | null;
};

type TimetableDisplayCell = {
  day: TimetableDay;
  date: string;
  start: string;
  end: string;
  slot: TimetableSlotRecord;
  impact: TimetableImpactRecord | null;
  exam: ExamScheduleRecord | null;
  holidayTitle: string | null;
};

const emptyForm: TimetableFormValues = {
  className: "",
  section: "",
  subjectId: "",
  teacherId: "",
  day: "Mon",
  startTime: SCHOOL_DAY_START,
  endTime: getNextTeachingEndTime(SCHOOL_DAY_START),
  isBreak: false,
  breakType: "",
  breakLabel: "",
};

const isAdminSchoolWideBreak = (mode: TimetableMode, role: string | null, form: TimetableFormValues) =>
  mode === "admin" && role === ROLES.ADMIN && form.isBreak;

const TimetableShell = ({ mode }: { mode: TimetableMode }) => {
  const { user, role } = authStore();
  const [searchParams] = useSearchParams();
  const [classOptions, setClassOptions] = useState<TimetableClassOption[]>([]);
  const [subjects, setSubjects] = useState<SubjectRecord[]>([]);
  const [teachers, setTeachers] = useState<StaffRecord[]>([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  const [slots, setSlots] = useState<TimetableSlotRecord[]>([]);
  const [access, setAccess] = useState<TimetableAccess>({
    canEditAny: false,
    canEditSelectedClass: false,
    isClassCoordinator: false,
    assignedClass: null,
    assignedSection: null,
  });
  const [form, setForm] = useState<TimetableFormValues>(emptyForm);
  const [modal, setModal] = useState<ModalState>({ open: false, mode: "create", slot: null });
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [loadingGrid, setLoadingGrid] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [selectedDate, setSelectedDate] = useState(getIndiaTodayIso());
  const [holidays, setHolidays] = useState<HolidayRecord[]>([]);
  const [weekExams, setWeekExams] = useState<ExamScheduleRecord[]>([]);
  const [weekImpacts, setWeekImpacts] = useState<TimetableImpactRecord[]>([]);
  const [selectedHoliday, setSelectedHoliday] = useState<{ title: string; description: string | null } | null>(null);
  const [currentStaff, setCurrentStaff] = useState<StaffRecord | null>(null);
  const [appliedQueryFilters, setAppliedQueryFilters] = useState(false);

  const availableSections = useMemo(
    () => classOptions.find((item) => item.className === selectedClass)?.sections ?? [],
    [classOptions, selectedClass],
  );

  const filteredTeachers = useMemo(() => {
    if (form.isBreak) return [];
    if (!form.subjectId) return teachers;
    const bySubject = teachers.filter((teacher) => teacher.subjectId === form.subjectId);
    return bySubject.length > 0 ? bySubject : teachers;
  }, [form.isBreak, form.subjectId, teachers]);

  const modalSectionOptions = useMemo(
    () => classOptions.find((item) => item.className === form.className)?.sections ?? [],
    [classOptions, form.className],
  );

  const selectedDay = useMemo(
    () => getWeekdayFromDateString(selectedDate) as TimetableDay,
    [selectedDate],
  );

  const weekDates = useMemo(() => getWeekDates(selectedDate), [selectedDate]);

  const weekHolidayMap = useMemo(() => {
    const map: Partial<Record<TimetableDay, HolidayRecord>> = {};
    holidays.forEach((holiday) => {
      const match = DAYS.find((day) => weekDates[day] === holiday.holidayDate);
      if (match) {
        map[match] = holiday;
      }
    });
    return map;
  }, [holidays, weekDates]);

  const timeRows = useMemo(() => {
    return generateSchoolDayRows(slots);
  }, [slots]);

  const canEdit = mode === "admin" ? access.canEditAny : mode === "coordinator" ? access.canEditSelectedClass : false;
  const adminSchoolWideBreak = isAdminSchoolWideBreak(mode, role, form);
  const availableEndTimeOptions = useMemo(
    () =>
      form.isBreak
        ? TIME_OPTIONS.filter((time) => time > form.startTime)
        : TIME_OPTIONS.filter((time) => time === getNextTeachingEndTime(form.startTime)),
    [form.isBreak, form.startTime],
  );

  useEffect(() => {
    const holiday = holidays.find((item) => item.holidayDate === selectedDate) ?? null;
    setSelectedHoliday(holiday ? { title: holiday.title, description: holiday.description } : null);
  }, [holidays, selectedDate]);

  useEffect(() => {
    const loadMeta = async () => {
      setLoadingMeta(true);
      try {
        const [classes, subjectRows, teacherRows, holidayRows] = await Promise.all([
          listTimetableClassOptions(),
          getSelectableSubjects(),
          listTimetableTeachers(),
          listHolidays(),
        ]);
        setClassOptions(classes);
        setSubjects(subjectRows);
        setTeachers(teacherRows);
        setHolidays(holidayRows);

        if (mode === "coordinator" && user?.id) {
          const assignment = await getCoordinatorAssignment(user.id);
          setSelectedClass(assignment?.assignedClass ?? "");
          setSelectedSection(assignment?.assignedSection ?? "");
        } else if (mode === "my" && user?.id) {
          setCurrentStaff(await getStaffByUserId(user.id));
        } else if ((role === ROLES.STUDENT || role === ROLES.PARENT) && user?.id) {
          const linkedStudent =
            role === ROLES.STUDENT
              ? await getStudentByUserId(user.id)
              : (await getChildrenByParentUserId(user.id))[0] ?? null;
          setSelectedClass(linkedStudent?.className ?? "");
          setSelectedSection(linkedStudent?.section ?? "");
        } else if (classes[0]) {
          setSelectedClass(classes[0].className);
          setSelectedSection(classes[0].sections[0] ?? "");
        }

        setError("");
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Failed to load timetable.");
      } finally {
        setLoadingMeta(false);
      }
    };

    void loadMeta();
  }, [mode, user?.id]);

  useEffect(() => {
    if (loadingMeta || appliedQueryFilters || mode === "my") return;

    const queryClass = searchParams.get("class")?.trim() ?? "";
    const querySection = searchParams.get("section")?.trim() ?? "";
    const queryDate = searchParams.get("date")?.trim() ?? "";

    if (queryDate) {
      setSelectedDate(queryDate);
    }

    if (queryClass) {
      const matchingClass = classOptions.find((item) => item.className === queryClass);
      if (matchingClass) {
        setSelectedClass(queryClass);
        if (querySection && matchingClass.sections.includes(querySection)) {
          setSelectedSection(querySection);
        } else if (!selectedSection || !matchingClass.sections.includes(selectedSection)) {
          setSelectedSection(matchingClass.sections[0] ?? "");
        }
      }
    } else if (querySection && selectedClass) {
      const matchingClass = classOptions.find((item) => item.className === selectedClass);
      if (matchingClass?.sections.includes(querySection)) {
        setSelectedSection(querySection);
      }
    }

    setAppliedQueryFilters(true);
  }, [appliedQueryFilters, classOptions, loadingMeta, mode, searchParams, selectedClass, selectedSection]);

  useEffect(() => {
    if (mode !== "admin") return;
    const nextSection = classOptions.find((item) => item.className === selectedClass)?.sections[0] ?? "";
    if (!availableSections.includes(selectedSection)) {
      setSelectedSection(nextSection);
    }
  }, [availableSections, classOptions, mode, selectedClass, selectedSection]);

  const refreshAccess = async (className: string, section: string) => {
    const state = await getTimetableAccess(user?.id, role, className, section);
    setAccess(state);
  };

  const loadGrid = async () => {
    setLoadingGrid(true);
    try {
      let loadedSlots: TimetableSlotRecord[] = [];

      if (mode === "my") {
        loadedSlots = user?.id ? await loadMyTeachingTimetable(user.id) : [];
        setSlots(loadedSlots);
        setAccess({
          canEditAny: false,
          canEditSelectedClass: false,
          isClassCoordinator: false,
          assignedClass: null,
          assignedSection: null,
        });
      } else {
        if (!selectedClass || !selectedSection) {
          throw new Error("Class and section are required.");
        }
        const [classSlots] = await Promise.all([
          loadTimetable(selectedClass, selectedSection),
          refreshAccess(selectedClass, selectedSection),
        ]);
        loadedSlots = classSlots;
        setSlots(loadedSlots);
      }

      const exams = await listExamSchedules({ dates: Object.values(weekDates) });
      const relevantClassSections =
        mode === "my"
          ? new Set(loadedSlots.map((slot) => `${slot.className}::${slot.section}`))
          : new Set(selectedClass && selectedSection ? [`${selectedClass}::${selectedSection}`] : []);

      setWeekExams(
        exams.filter((exam) => {
          if (!relevantClassSections.has(`${exam.className}::${exam.section}`)) {
            return false;
          }
          return true;
        }),
      );

      const weekDateValues = Object.values(weekDates);
      if (mode === "my") {
        const staff = currentStaff ?? (user?.id ? await getStaffByUserId(user.id) : null);
        setCurrentStaff(staff);
        setWeekImpacts(
          staff
            ? [
                ...(await listTimetableImpacts({ teacherId: staff.id, dates: weekDateValues })),
                ...(await listTimetableImpacts({ replacementTeacherId: staff.id, dates: weekDateValues })),
              ]
            : [],
        );
      } else {
        setWeekImpacts(
          selectedClass && selectedSection
            ? await listTimetableImpacts({ className: selectedClass, section: selectedSection, dates: weekDateValues })
            : [],
        );
      }

      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load timetable.");
      setSlots([]);
      setWeekExams([]);
      setWeekImpacts([]);
    } finally {
      setLoadingGrid(false);
    }
  };

  useEffect(() => {
    if (loadingMeta) return;
    if (mode === "my" || (selectedClass && selectedSection)) {
      void loadGrid();
    }
  }, [currentStaff, loadingMeta, mode, selectedClass, selectedSection, selectedDate]);

  const getSlotForCell = (day: TimetableDay, start: string, end: string) =>
    slots.find((slot) => slot.day === day && slot.startTime === start && slot.endTime === end) ?? null;

  const getExamForCell = (date: string, day: TimetableDay, start: string, end: string, slot: TimetableSlotRecord | null) => {
    return (
      weekExams.find(
        (exam) =>
          exam.className === (mode === "my" ? slot?.className ?? "" : selectedClass) &&
          exam.section === (mode === "my" ? slot?.section ?? "" : selectedSection) &&
          exam.examDate === date &&
          doesExamBlockSlot(exam, start, end),
      ) ?? null
    );
  };

  const weekDayExamMap = useMemo(
    () =>
      DAYS.reduce<Partial<Record<TimetableDay, DayExamSummary>>>((accumulator, day) => {
        if (mode === "my") {
          return accumulator;
        }

        const dayExams = weekExams.filter(
          (exam) =>
            exam.className === selectedClass &&
            exam.section === selectedSection &&
            exam.examDate === weekDates[day],
        );

        if (dayExams.length === 0) {
          return accumulator;
        }

        const hasMorning = dayExams.some((exam) => exam.examSession === "Morning");
        const hasAfternoon = dayExams.some((exam) => exam.examSession === "Afternoon");
        accumulator[day] = {
          label: summarizeExamLabels(dayExams.map((exam) => formatExamLabel(exam))),
          isFullDay: dayExams.length > 0 || dayExams.some((exam) => exam.examSession === "Full Day") || (hasMorning && hasAfternoon),
        };
        return accumulator;
      }, {}),
    [mode, selectedClass, selectedSection, weekDates, weekExams],
  );

  const getImpactForCell = (date: string, slot: TimetableSlotRecord | null) => {
    if (!slot) return null;
    return weekImpacts.find((impact) => impact.timetableId === slot.id && impact.impactDate === date) ?? null;
  };

  const myDisplayCells = useMemo(() => {
    if (mode !== "my") return [];

    const cells: TimetableDisplayCell[] = [];
    const impactBySlotDate = new Map(
      weekImpacts.map((impact) => [`${impact.timetableId}::${impact.impactDate}`, impact] as const),
    );
    const replacementImpactIds = new Set<string>();

    DAYS.forEach((day) => {
      const date = weekDates[day];
      const holidayTitle = weekHolidayMap[day]?.title ?? (day === "Sun" ? "Sunday" : null);

      if (holidayTitle) {
        return;
      }

      const daySlots = slots.filter((slot) => slot.day === day);
      daySlots.forEach((slot) => {
        const impact = impactBySlotDate.get(`${slot.id}::${date}`) ?? null;

        if (impact?.status === "Rescheduled" && impact.replacementTeacherId && impact.replacementTeacherId !== currentStaff?.id) {
          cells.push({
            day,
            date,
            start: slot.startTime,
            end: slot.endTime,
            slot,
            impact,
            exam: getExamForCell(date, day, slot.startTime, slot.endTime, slot),
            holidayTitle,
          });
          return;
        }

        cells.push({
          day,
          date,
          start: impact?.replacementStartTime ?? slot.startTime,
          end: impact?.replacementEndTime ?? slot.endTime,
          slot,
          impact,
          exam: getExamForCell(date, day, impact?.replacementStartTime ?? slot.startTime, impact?.replacementEndTime ?? slot.endTime, slot),
          holidayTitle,
        });
      });

      weekImpacts.forEach((impact) => {
        if (
          impact.impactDate !== date ||
          impact.status !== "Rescheduled" ||
          impact.replacementTeacherId !== currentStaff?.id ||
          impact.teacherId === currentStaff?.id ||
          replacementImpactIds.has(impact.id)
        ) {
          return;
        }

        const syntheticSlot: TimetableSlotRecord = {
          id: impact.timetableId,
          className: impact.className,
          section: impact.section,
          subjectId: impact.replacementSubjectId ?? impact.subjectId,
          subjectName: impact.replacementSubjectName ?? impact.subjectName,
          teacherId: impact.replacementTeacherId,
          teacherName: impact.replacementTeacherName ?? impact.teacherName,
          day: impact.day,
          startTime: impact.replacementStartTime ?? impact.startTime,
          endTime: impact.replacementEndTime ?? impact.endTime,
          isBreak: false,
          breakType: null,
          breakLabel: null,
          isCancelled: false,
          cancellationReason: null,
          effectiveDate: impact.impactDate,
          sourceSlotId: impact.timetableId,
          impactLeaveId: impact.leaveId,
          impactStatus: impact.status,
          replacementTeacherId: impact.replacementTeacherId,
          replacementTeacherName: impact.replacementTeacherName,
          replacementSubjectId: impact.replacementSubjectId,
          replacementSubjectName: impact.replacementSubjectName,
        };

        replacementImpactIds.add(impact.id);
        cells.push({
          day,
          date,
          start: impact.replacementStartTime ?? impact.startTime,
          end: impact.replacementEndTime ?? impact.endTime,
          slot: syntheticSlot,
          impact,
          exam: getExamForCell(
            date,
            day,
            impact.replacementStartTime ?? impact.startTime,
            impact.replacementEndTime ?? impact.endTime,
            syntheticSlot,
          ),
          holidayTitle,
        });
      });
    });

    return cells.sort((left, right) => {
      const dayOrder = DAYS.indexOf(left.day) - DAYS.indexOf(right.day);
      if (dayOrder !== 0) return dayOrder;
      const timeOrder = left.start.localeCompare(right.start);
      if (timeOrder !== 0) return timeOrder;
      return left.slot.className.localeCompare(right.slot.className);
    });
  }, [currentStaff?.id, mode, slots, weekDates, weekHolidayMap, weekImpacts, weekExams]);

  const getMyDisplayCell = (day: TimetableDay, start: string, end: string) =>
    myDisplayCells.find((cell) => cell.day === day && cell.start === start && cell.end === end) ?? null;

  const resolvedTimeRows = useMemo(() => {
    if (mode !== "my") {
      return timeRows;
    }

    return uniqueByKey(
      myDisplayCells.map((cell) => ({ start: cell.start, end: cell.end })),
      (row) => `${row.start}-${row.end}`,
    ).sort((a, b) => a.start.localeCompare(b.start));
  }, [mode, myDisplayCells, timeRows]);

  const openCreate = (day: TimetableDay, start: string, end: string) => {
    if (day === "Sun") return;
    if (!canEdit) return;
    const defaultSubjectId = subjects[0]?.id ?? "";
    const teacherPool = teachers.filter((teacher) => teacher.subjectId === defaultSubjectId);
    setForm({
      className: selectedClass,
      section: selectedSection,
      subjectId: defaultSubjectId,
      teacherId: teacherPool[0]?.id ?? teachers[0]?.id ?? "",
      day,
      startTime: start,
      endTime: getNextTeachingEndTime(start),
      isBreak: false,
      breakType: "",
      breakLabel: "",
    });
    setFormError("");
    setModal({ open: true, mode: "create", slot: null });
  };

  const openSlot = (slot: TimetableSlotRecord) => {
    setForm({
      className: slot.className,
      section: slot.section,
      subjectId: slot.subjectId ?? "",
      teacherId: slot.teacherId ?? "",
      day: slot.day,
      startTime: slot.startTime,
      endTime: slot.endTime,
      isBreak: slot.isBreak,
      breakType: slot.breakType ?? "",
      breakLabel: slot.breakLabel ?? "",
    });
    setFormError("");
    setModal({ open: true, mode: canEdit ? "edit" : "view", slot });
  };

  const closeModal = () => {
    setModal({ open: false, mode: "create", slot: null });
    setForm(emptyForm);
    setFormError("");
  };

  const handleChange = <K extends keyof TimetableFormValues>(key: K, value: TimetableFormValues[K]) => {
    setFormError("");
    setForm((current) => {
      const next = { ...current, [key]: value };
      if (key === "className") {
        const nextSections = classOptions.find((item) => item.className === value)?.sections ?? [];
        next.section = nextSections.includes(current.section) ? current.section : nextSections[0] ?? "";
      }
      if (key === "subjectId" && !current.isBreak) {
        const teacherPool = teachers.filter((teacher) => teacher.subjectId === value);
        next.teacherId = teacherPool[0]?.id ?? teachers[0]?.id ?? "";
      }
      if (key === "startTime") {
        next.endTime = current.isBreak
          ? next.endTime <= value
            ? TIME_OPTIONS.find((time) => time > value) ?? current.endTime
            : next.endTime
          : getNextTeachingEndTime(String(value));
      }
      if (key === "isBreak") {
        if (value) {
          next.subjectId = "";
          next.teacherId = "";
          next.breakType = current.breakType || "Short Break";
          next.breakLabel = current.breakLabel || current.breakType || "Short Break";
          next.endTime = addMinutesToTime(current.startTime, 30);
        } else {
          const teacherPool = teachers.filter((teacher) => teacher.subjectId === current.subjectId);
          next.teacherId = teacherPool[0]?.id ?? teachers[0]?.id ?? "";
          next.breakType = "";
          next.breakLabel = "";
          next.endTime = getNextTeachingEndTime(current.startTime);
        }
      }
      if (key === "breakType" && next.isBreak) {
        next.breakLabel = String(value);
        next.endTime = addMinutesToTime(current.startTime, value === "Lunch Break" ? 60 : 30);
      }
      return next;
    });
  };

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setFormError("");
    try {
      const context = { userId: user?.id, role };
      if (modal.mode === "edit" && modal.slot) {
        await updateTimetableSlot(modal.slot.id, form, context);
      } else {
        await createTimetableSlot(form, context);
      }
      closeModal();
      await loadGrid();
      setError("");
    } catch (saveError) {
      setFormError(saveError instanceof Error ? saveError.message : TIMETABLE_PERMISSION_DENIED_MESSAGE);
    } finally {
      setSaving(false);
    }
  };

  const applyBreakPreset = (breakType: "Short Break" | "Lunch Break", durationMinutes: number, defaultLabel: string) => {
    setFormError("");
    setForm((current) => {
      const nextEnd = addMinutesToTime(current.startTime, durationMinutes);
      const resolvedEnd = TIME_OPTIONS.includes(nextEnd)
        ? nextEnd
        : TIME_OPTIONS.find((time) => time > current.startTime) ?? current.endTime;

      return {
        ...current,
        isBreak: true,
        subjectId: "",
        teacherId: "",
        breakType,
        breakLabel: current.breakLabel.trim() || defaultLabel,
        endTime: resolvedEnd,
      };
    });
  };

  const handleDelete = async () => {
    if (!modal.slot) return;
    if (!window.confirm("Delete this timetable slot?")) return;
    setSaving(true);
    try {
      await deleteTimetableSlot(modal.slot.id, {
        userId: user?.id,
        role,
        className: modal.slot.className,
        section: modal.slot.section,
      });
      closeModal();
      await loadGrid();
      setError("");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : TIMETABLE_PERMISSION_DENIED_MESSAGE);
    } finally {
      setSaving(false);
    }
  };

  const header =
    mode === "admin"
      ? {
          title: "Timetable",
          description: "Admin manages the weekly timetable template. Changes repeat automatically every week unless a holiday overrides that date.",
        }
      : mode === "coordinator"
        ? {
            title: "Coordinator Timetable",
            description: "Manage the weekly timetable template for your assigned class and handle approved leave impacts in the real weekly view.",
          }
        : {
            title: "My Teaching Timetable",
            description: "Read-only weekly teaching schedule showing your assigned periods and approved leave impact outcomes for the selected week.",
          };

  return (
    <div className="space-y-6">
      <AdminPageHeader title={header.title} description={header.description} />

      {mode !== "my" ? (
        <Card className="border-slate-200 bg-white shadow-sm">
          {mode === "admin" && role === ROLES.ADMIN ? (
            <div className="grid gap-4 md:grid-cols-[1fr_1fr_1fr_auto]">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Class</span>
                <select
                  value={selectedClass}
                  onChange={(event) => setSelectedClass(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
                >
                  {classOptions.map((item) => (
                    <option key={item.className} value={item.className}>
                      {item.className}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Section</span>
                <select
                  value={selectedSection}
                  onChange={(event) => setSelectedSection(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
                >
                  {availableSections.map((section) => (
                    <option key={section} value={section}>
                      {section}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Reference Date</span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(event) => setSelectedDate(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
                />
              </label>
              <div className="flex items-end">
                <div className="flex gap-3">
                  <Button onClick={() => void loadGrid()} disabled={loadingMeta || !selectedClass || !selectedSection}>
                    {loadingGrid ? "Loading..." : "Load Timetable"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="bg-amber-50 text-amber-700 hover:bg-amber-100"
                    disabled={!canEdit || !selectedClass || !selectedSection}
                    onClick={() => {
                      setForm({
                        className: selectedClass,
                        section: selectedSection,
                        subjectId: "",
                        teacherId: "",
                        day: "Mon",
                        startTime: SCHOOL_DAY_START,
                        endTime: addMinutesToTime(SCHOOL_DAY_START, 30),
                        isBreak: true,
                        breakType: "Short Break",
                        breakLabel: "Short Break",
                      });
                      setFormError("");
                      setModal({ open: true, mode: "create", slot: null });
                    }}
                  >
                    Add Break
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  {role === ROLES.STAFF ? "Assigned Class" : "Class"}
                </p>
                <p className="mt-2 text-lg font-semibold text-slate-900">{selectedClass || "-"}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  {role === ROLES.STAFF ? "Assigned Section" : "Section"}
                </p>
                <p className="mt-2 text-lg font-semibold text-slate-900">{selectedSection || "-"}</p>
              </div>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Reference Date</span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(event) => setSelectedDate(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
                />
              </label>
              <div className="flex items-end">
                {role === ROLES.ADMIN ? (
                  <Button onClick={() => void loadGrid()} disabled={loadingMeta || !selectedClass || !selectedSection}>
                    {loadingGrid ? "Loading..." : "Load Timetable"}
                  </Button>
                ) : null}
              </div>
            </div>
          )}

          <div className="mt-5 flex flex-wrap gap-3 text-sm">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">
              Access: {canEdit ? "Edit enabled" : "Read only"}
            </span>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">
              Weekly template: edits repeat every week
            </span>
            {access.isClassCoordinator ? (
              <span className="rounded-full bg-brand-50 px-3 py-1 text-brand-700">
                Coordinator: {access.assignedClass} / {access.assignedSection}
              </span>
            ) : null}
            <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">
              Date: {selectedDate} ({selectedDay})
            </span>
            {weekImpacts.length > 0 ? (
              <span className="rounded-full bg-rose-50 px-3 py-1 text-rose-700">
                Leave impacts this week: {weekImpacts.length}
              </span>
            ) : null}
          </div>
        </Card>
      ) : (
        <Card className="border-slate-200 bg-white shadow-sm">
          <div className="grid gap-4 md:grid-cols-3">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Reference Date</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
              />
            </label>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Selected Day</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">{selectedDay}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Access</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">Read only</p>
            </div>
          </div>
        </Card>
      )}

      {selectedHoliday ? (
        <Card className="border-amber-200 bg-amber-50 shadow-sm">
          <p className="text-sm font-semibold text-amber-800">{selectedHoliday.title}</p>
          <p className="mt-1 text-sm text-amber-700">
            {selectedHoliday.description || `No classes scheduled on ${selectedDate}.`}
          </p>
        </Card>
      ) : selectedDay === "Sun" ? (
        <Card className="border-amber-200 bg-amber-50 shadow-sm">
          <p className="text-sm font-semibold text-amber-800">Sunday Holiday</p>
          <p className="mt-1 text-sm text-amber-700">Sunday remains a weekly holiday across all timetables.</p>
        </Card>
      ) : null}

      {error ? (
        <Card className="border-rose-200 bg-rose-50 shadow-sm">
          <p className="text-sm text-rose-700">{error}</p>
        </Card>
      ) : null}

      <Card className="border-slate-200 bg-white p-0 shadow-sm">
        {loadingGrid ? (
          <div className="flex min-h-[260px] items-center justify-center text-slate-500">Loading timetable...</div>
        ) : (
          <div className="overflow-x-auto">
            <div className="grid min-w-[1160px] grid-cols-[110px_repeat(7,minmax(140px,1fr))]">
              <div className="border-b border-r border-slate-200 bg-slate-50 px-4 py-4 text-sm font-semibold text-slate-700">Time</div>
              {DAYS.map((day) => (
                <div key={day} className="border-b border-r border-slate-200 bg-slate-50 px-4 py-4 text-center text-sm font-semibold text-slate-700 last:border-r-0">
                  <p>{day}</p>
                  <p
                    className={`mt-1 text-xs font-medium ${
                      weekHolidayMap[day]
                        ? "text-amber-700"
                        : weekDayExamMap[day]
                          ? weekDayExamMap[day]?.isFullDay
                            ? "text-sky-700"
                            : "text-amber-700"
                          : "text-slate-400"
                    }`}
                  >
                    {formatColumnDate(weekDates[day])}
                  </p>
                  {weekHolidayMap[day] ? (
                    <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-amber-700">
                      {weekHolidayMap[day]?.title}
                    </p>
                  ) : weekDayExamMap[day] ? (
                    <p
                      className={`mt-1 text-[11px] uppercase tracking-[0.16em] ${
                        weekDayExamMap[day]?.isFullDay ? "text-sky-700" : "text-amber-700"
                      }`}
                    >
                      {weekDayExamMap[day]?.label}
                    </p>
                  ) : null}
                </div>
              ))}

              {resolvedTimeRows.map((row) => (
                <TimetableGridRow
                  key={`${row.start}-${row.end}`}
                  timeLabel={`${row.start}-${row.end}`}
                  selectedDay={selectedDay}
                  dayCells={DAYS.map((day) => {
                    const myCell = mode === "my" ? getMyDisplayCell(day, row.start, row.end) : null;
                    const slot = myCell?.slot ?? getSlotForCell(day, row.start, row.end);

                    return {
                      day,
                      slot,
                      impact: myCell?.impact ?? getImpactForCell(weekDates[day], slot),
                      exam: myCell?.exam ?? getExamForCell(weekDates[day], day, row.start, row.end, slot),
                      start: row.start,
                      end: row.end,
                      date: weekDates[day],
                      holidayTitle: myCell?.holidayTitle ?? weekHolidayMap[day]?.title ?? null,
                    };
                  })}
                  mode={mode}
                  canEdit={canEdit}
                  onEmptyClick={(day) => openCreate(day, row.start, row.end)}
                  onSlotClick={openSlot}
                />
              ))}
            </div>
          </div>
        )}
      </Card>

      <Modal
        open={modal.open}
        onClose={closeModal}
        title={
          modal.mode === "create"
            ? form.isBreak && mode === "admin" && role === ROLES.ADMIN
              ? "Add School-Wide Break"
              : "Add Slot"
            : modal.mode === "edit"
              ? form.isBreak && mode === "admin" && role === ROLES.ADMIN
                ? "Edit School-Wide Break"
                : "Edit Slot"
              : "Timetable Slot"
        }
        description={
          form.isBreak && mode === "admin" && role === ROLES.ADMIN
            ? "This break will be applied to all classes and sections from Monday to Saturday using the same timing."
            : form.isBreak
              ? "This break will be applied to the selected class and section from Monday to Saturday using the same timing."
            : "Teaching classes stay fixed at 1 hour. Only break slots can use 30-minute or 1-hour duration."
        }
      >
        <form className="space-y-5" onSubmit={handleSave}>
          {formError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {formError}
            </div>
          ) : null}

          {adminSchoolWideBreak ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              This break timing will be created for every class and section on Monday, Tuesday, Wednesday, Thursday, Friday, and Saturday.
            </div>
          ) : form.isBreak ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              This break timing will be created for the selected class and section on Monday, Tuesday, Wednesday, Thursday, Friday, and Saturday.
            </div>
          ) : null}

          <div className="grid gap-5 md:grid-cols-2">
            <label className="block md:col-span-2">
              <span className="mb-2 block text-sm font-medium text-slate-700">Slot Type</span>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => handleChange("isBreak", false)}
                  disabled={modal.mode === "view"}
                  className={`rounded-2xl border px-4 py-3 text-sm font-medium transition ${
                    !form.isBreak
                      ? "border-brand-500 bg-brand-50 text-brand-700"
                      : "border-slate-200 bg-white text-slate-700"
                  }`}
                >
                  Teaching Class
                </button>
                <button
                  type="button"
                  onClick={() => handleChange("isBreak", true)}
                  disabled={modal.mode === "view"}
                  className={`rounded-2xl border px-4 py-3 text-sm font-medium transition ${
                    form.isBreak
                      ? "border-amber-500 bg-amber-50 text-amber-700"
                      : "border-slate-200 bg-white text-slate-700"
                  }`}
                >
                  Break
                </button>
              </div>
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Class</span>
              <select
                value={form.className}
                onChange={(event) => handleChange("className", event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
                disabled={modal.mode === "view" || !(mode === "admin" && role === ROLES.ADMIN) || adminSchoolWideBreak}
              >
                {classOptions.map((item) => (
                  <option key={item.className} value={item.className}>
                    {item.className}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Section</span>
              <select
                value={form.section}
                onChange={(event) => handleChange("section", event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
                disabled={modal.mode === "view" || !(mode === "admin" && role === ROLES.ADMIN) || adminSchoolWideBreak}
              >
                {modalSectionOptions.map((section) => (
                  <option key={section} value={section}>
                    {section}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Day</span>
              <select
                value={form.day}
                onChange={(event) => handleChange("day", event.target.value as typeof form.day)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
                disabled={modal.mode === "view" || !(mode === "admin" && role === ROLES.ADMIN) || adminSchoolWideBreak}
              >
                {DAYS.filter((day) => day !== "Sun").map((day) => (
                  <option key={day} value={day}>
                    {day}
                  </option>
                ))}
              </select>
            </label>
            {form.isBreak ? (
              <div className="space-y-3 md:col-span-2">
                <div>
                  <span className="mb-2 block text-sm font-medium text-slate-700">Break Type</span>
                  <div className="flex flex-wrap gap-3">
                    {BREAK_PRESETS.map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => applyBreakPreset(preset.type, preset.durationMinutes, preset.defaultLabel)}
                        disabled={modal.mode === "view"}
                        className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {preset.label}
                        <span className="ml-2 text-xs uppercase tracking-[0.14em] text-amber-600">
                          {preset.durationMinutes === 30 ? "30 Min" : "1 Hour"}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">Selected Break Type</span>
                  <select
                    value={form.breakType}
                    onChange={(event) => handleChange("breakType", event.target.value as TimetableFormValues["breakType"])}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
                    disabled={modal.mode === "view"}
                  >
                    <option value="Short Break">Short Break</option>
                    <option value="Lunch Break">Lunch Break</option>
                  </select>
                </label>
                <Input
                  label="Break Name"
                  value={form.breakLabel}
                  onChange={(event) => handleChange("breakLabel", event.target.value)}
                  placeholder="Lunch Break"
                  disabled={modal.mode === "view"}
                />
              </div>
            ) : (
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Subject</span>
              <select
                value={form.subjectId}
                onChange={(event) => handleChange("subjectId", event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
                disabled={modal.mode === "view"}
              >
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </label>
            )}
            {form.isBreak ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                Set one morning short break for 30 minutes and one afternoon lunch break for 1 hour. Regular classes remain fixed at 1 hour.
              </div>
            ) : (
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Teacher</span>
              <select
                value={form.teacherId}
                onChange={(event) => handleChange("teacherId", event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
                disabled={modal.mode === "view"}
              >
                {filteredTeachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.name}
                  </option>
                ))}
              </select>
            </label>
            )}
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Start Time</span>
              <select
                value={form.startTime}
                onChange={(event) => handleChange("startTime", event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
                disabled={modal.mode === "view"}
              >
                {TIME_OPTIONS.slice(0, -1).map((time) => (
                  <option key={time} value={time}>{time}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">End Time</span>
              <select
                value={form.endTime}
                onChange={(event) => handleChange("endTime", event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
                disabled={modal.mode === "view"}
              >
                {availableEndTimeOptions.map((time) => (
                  <option key={time} value={time}>{time}</option>
                ))}
              </select>
            </label>
            {!form.isBreak ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 md:col-span-2">
                Class periods stay fixed to 1 hour, but their start time can move after a break. Example: if a break is `09:00-09:30`, the next class can run `09:30-10:30`.
              </div>
            ) : null}
          </div>

          <div className="flex items-center justify-between">
            <div>
              {modal.mode === "edit" && modal.slot && canEdit ? (
                <Button type="button" variant="ghost" className="bg-rose-50 text-rose-700 hover:bg-rose-100" onClick={() => void handleDelete()} disabled={saving}>
                  Delete
                </Button>
              ) : null}
            </div>
            <div className="flex gap-3">
              <Button type="button" variant="ghost" className="bg-slate-100 text-slate-700 hover:bg-slate-200" onClick={closeModal}>
                Close
              </Button>
              {modal.mode !== "view" ? (
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving..." : modal.mode === "edit" ? "Update Slot" : "Save Slot"}
                </Button>
              ) : null}
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};

const TimetableGridRow = ({
  timeLabel,
  selectedDay,
  dayCells,
  mode,
  canEdit,
  onEmptyClick,
  onSlotClick,
}: {
  timeLabel: string;
  selectedDay: TimetableDay;
  dayCells: Array<{
    day: TimetableDay;
    slot: TimetableSlotRecord | null;
    impact: TimetableImpactRecord | null;
    exam: ExamScheduleRecord | null;
    start: string;
    end: string;
    date: string;
    holidayTitle: string | null;
  }>;
  mode: TimetableMode;
  canEdit: boolean;
  onEmptyClick: (day: TimetableDay) => void;
  onSlotClick: (slot: TimetableSlotRecord) => void;
}) => (
  <>
    <div className="border-b border-r border-slate-200 bg-slate-50/70 px-4 py-5 text-sm font-medium text-slate-700">
      {timeLabel}
    </div>
    {dayCells.map(({ day, slot, impact, exam, date, holidayTitle }) => (
      <button
        key={`${timeLabel}-${day}`}
        type="button"
        onClick={() => (slot ? onSlotClick(slot) : onEmptyClick(day))}
        disabled={day === "Sun" || Boolean(holidayTitle) || Boolean(exam) || (!slot && !canEdit)}
        className={`min-h-[116px] border-b border-r border-slate-200 p-3 text-left transition last:border-r-0 ${
          day === selectedDay ? "ring-2 ring-brand-200 ring-inset " : ""
        }${
          day === "Sun" || holidayTitle
            ? "cursor-default bg-amber-50"
            : exam
              ? "cursor-default bg-sky-50"
            : impact?.status === "Cancelled"
              ? "bg-rose-50"
            : impact?.status === "Rescheduled"
              ? "bg-brand-50/60"
            :
          slot
            ? "bg-white hover:bg-slate-50"
            : canEdit
              ? "bg-slate-50/40 hover:bg-brand-50"
              : "cursor-default bg-slate-50/30"
        }`}
      >
        {day === "Sun" || holidayTitle ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-700">Holiday</p>
            <p className="mt-2 text-xs text-amber-600">{holidayTitle ?? "Sunday"}</p>
            <p className="mt-1 text-[11px] text-amber-500">{formatColumnDate(date)}</p>
          </div>
        ) : exam ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-700">Exam</p>
            <p className="mt-2 text-xs font-medium text-sky-700">{formatExamLabel(exam)}</p>
            <p className="mt-1 text-[11px] text-sky-600">{slot?.className} / {slot?.section}</p>
          </div>
        ) : slot?.isBreak ? (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-amber-700">BREAK</p>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-amber-700">
              {slot.breakType ?? slot.breakLabel ?? "Break"}
            </p>
          </div>
        ) : slot && impact?.status === "Cancelled" ? (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-rose-700">{slot.subjectName}</p>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-rose-700">Class Cancelled</p>
            <p className="text-xs text-rose-600">{impact.note ?? "Cancelled due to approved teacher leave."}</p>
          </div>
        ) : slot && impact?.status === "Rescheduled" ? (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-slate-900">{impact.replacementSubjectName ?? slot.subjectName}</p>
            <p className="text-xs text-slate-600">
              {impact.replacementTeacherName ?? slot.teacherName}
            </p>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-brand-700">
              Rescheduled {impact.replacementStartTime ?? slot.startTime}-{impact.replacementEndTime ?? slot.endTime}
            </p>
            {mode === "my" ? (
              <p className="text-xs uppercase tracking-[0.18em] text-brand-700">
                {slot.className} / {slot.section}
              </p>
            ) : null}
          </div>
        ) : slot ? (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-slate-900">{slot.subjectName}</p>
            <p className="text-xs text-slate-600">{slot.teacherName}</p>
            {mode === "my" ? (
              <p className="text-xs uppercase tracking-[0.18em] text-brand-700">
                {slot.className} / {slot.section}
              </p>
            ) : null}
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-xs font-medium uppercase tracking-[0.18em] text-slate-300">
            {canEdit ? "Add Slot" : "Empty"}
          </div>
        )}
      </button>
    ))}
  </>
);

export const CoordinatorTimetablePage = () => <TimetableShell mode="coordinator" />;
export const MyTeachingTimetablePage = () => <TimetableShell mode="my" />;

export const TimetableLandingPage = () => {
  const { user, role } = authStore();
  const [target, setTarget] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    if (role === ROLES.ADMIN) {
      setTarget("/dashboard/timetable/admin");
      return () => {
        active = false;
      };
    }

    if (role === ROLES.STUDENT || role === ROLES.PARENT) {
      setTarget("/dashboard/timetable/viewer");
      return () => {
        active = false;
      };
    }

    void (async () => {
      try {
        if (!user?.id) {
          throw new Error("Teacher account not found.");
        }

        const assignment = await getCoordinatorAssignment(user.id);
        if (!active) return;
        setTarget(assignment ? "/dashboard/timetable/coordinator" : "/dashboard/timetable/my");
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : "Failed to load timetable access.");
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [role, user?.id]);

  if (target === "/dashboard/timetable/admin") {
    return <TimetableShell mode="admin" />;
  }

  if (target === "/dashboard/timetable/viewer") {
    return <TimetableShell mode="admin" />;
  }

  if (target) {
    return <Navigate to={target} replace />;
  }

  return (
    <Card className={error ? "border-rose-200 bg-rose-50 shadow-sm text-rose-700" : "border-slate-200 bg-white shadow-sm"}>
      {error || "Loading timetable access..."}
    </Card>
  );
};

export const TimetablePage = () => <TimetableShell mode="admin" />;

export default TimetableLandingPage;
