export type TeacherTimetableAlertSettings = {
  enabled: boolean;
  soundEnabled: boolean;
  preAlertEnabled: boolean;
};

export const DEFAULT_TEACHER_TIMETABLE_ALERT_SETTINGS: TeacherTimetableAlertSettings = {
  enabled: true,
  soundEnabled: true,
  preAlertEnabled: true,
};

export const TEACHER_TIMETABLE_ALERT_SETTINGS_EVENT = "inddia:teacher-timetable-alert-settings";

const storageKey = (userId: string) => `inddia-teacher-timetable-alerts:${userId}`;

export const loadTeacherTimetableAlertSettings = (userId: string | null | undefined): TeacherTimetableAlertSettings => {
  if (!userId || typeof window === "undefined") {
    return DEFAULT_TEACHER_TIMETABLE_ALERT_SETTINGS;
  }

  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    if (!raw) {
      return DEFAULT_TEACHER_TIMETABLE_ALERT_SETTINGS;
    }

    const parsed = JSON.parse(raw) as Partial<TeacherTimetableAlertSettings>;
    return {
      enabled: parsed.enabled ?? DEFAULT_TEACHER_TIMETABLE_ALERT_SETTINGS.enabled,
      soundEnabled: parsed.soundEnabled ?? DEFAULT_TEACHER_TIMETABLE_ALERT_SETTINGS.soundEnabled,
      preAlertEnabled: parsed.preAlertEnabled ?? DEFAULT_TEACHER_TIMETABLE_ALERT_SETTINGS.preAlertEnabled,
    };
  } catch {
    return DEFAULT_TEACHER_TIMETABLE_ALERT_SETTINGS;
  }
};

export const saveTeacherTimetableAlertSettings = (
  userId: string | null | undefined,
  settings: TeacherTimetableAlertSettings,
) => {
  if (!userId || typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(storageKey(userId), JSON.stringify(settings));
  window.dispatchEvent(
    new CustomEvent(TEACHER_TIMETABLE_ALERT_SETTINGS_EVENT, {
      detail: { userId, settings },
    }),
  );
};

export const requestBrowserNotificationPermission = async () => {
  if (typeof window === "undefined" || typeof Notification === "undefined") {
    return "unsupported" as const;
  }

  if (Notification.permission === "granted") {
    return "granted" as const;
  }

  if (Notification.permission === "denied") {
    return "denied" as const;
  }

  try {
    return await Notification.requestPermission();
  } catch {
    return "denied" as const;
  }
};
