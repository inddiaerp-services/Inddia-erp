import { useEffect, useRef, useState } from "react";
import { ROLES } from "../../config/roles";
import { normalizeStaffWorkspace, STAFF_WORKSPACES } from "../../config/staffWorkspaces";
import { authStore } from "../../store/authStore";
import { getStaffByUserId, isFirebaseOnlyMode, listTimetableSlots } from "../../services/adminService";
import { INDIA_TIME_ZONE, getIndiaTodayIso } from "../../utils/date";
import {
  DEFAULT_TEACHER_TIMETABLE_ALERT_SETTINGS,
  TEACHER_TIMETABLE_ALERT_SETTINGS_EVENT,
  loadTeacherTimetableAlertSettings,
  requestBrowserNotificationPermission,
  type TeacherTimetableAlertSettings,
} from "../../utils/teacherTimetableAlerts";
import type { TimetableDay, TimetableSlotRecord } from "../../types/admin";

const minuteFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: INDIA_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const weekdayFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: INDIA_TIME_ZONE,
  weekday: "short",
});

const timeToMinutes = (value: string) => {
  const [hours, minutes] = value.split(":").map(Number);
  return (hours || 0) * 60 + (minutes || 0);
};

const getCurrentMinuteOfDay = () => {
  const parts = minuteFormatter.formatToParts(new Date());
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");
  return hour * 60 + minute;
};

const getCurrentDay = () => weekdayFormatter.format(new Date()) as TimetableDay;

const playAlarmSound = async () => {
  if (typeof window === "undefined") return;

  const audioContextClass =
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  if (!audioContextClass) return;

  try {
    const audioContext = new audioContextClass();
    const pulse = (startAt: number, frequency: number) => {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency, startAt);
      gain.gain.setValueAtTime(0.0001, startAt);
      gain.gain.exponentialRampToValueAtTime(0.2, startAt + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.42);
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start(startAt);
      oscillator.stop(startAt + 0.42);
    };

    const base = audioContext.currentTime;
    for (let index = 0; index < 10; index += 1) {
      pulse(base + index * 0.5, index % 2 === 0 ? 880 : 988);
    }
    window.setTimeout(() => {
      void audioContext.close().catch(() => undefined);
    }, 5500);
  } catch {
    // Fail soft if the browser blocks audio playback.
  }
};

const showSystemNotification = async (title: string, body: string) => {
  if (typeof window === "undefined" || typeof Notification === "undefined") {
    return;
  }

  const permission =
    Notification.permission === "granted"
      ? "granted"
      : await requestBrowserNotificationPermission();

  if (permission !== "granted") {
    return;
  }

  try {
    new Notification(title, {
      body,
      tag: `teacher-timetable-${title}-${body}`,
      requireInteraction: true,
      silent: true,
    });
  } catch {
    // Ignore notification failures so the timer can continue running.
  }
};

const buildSlotLabel = (slot: TimetableSlotRecord) =>
  `${slot.subjectName} • ${slot.className}-${slot.section}`;

const TeacherTimetableAlerts = () => {
  const { user, role, school } = authStore();
  const [settings, setSettings] = useState<TeacherTimetableAlertSettings>(
    DEFAULT_TEACHER_TIMETABLE_ALERT_SETTINGS,
  );
  const [teacherStaffId, setTeacherStaffId] = useState<string | null>(null);
  const [isTeacherSession, setIsTeacherSession] = useState(false);
  const [todaySlots, setTodaySlots] = useState<TimetableSlotRecord[]>([]);
  const settingsRef = useRef<TeacherTimetableAlertSettings>(DEFAULT_TEACHER_TIMETABLE_ALERT_SETTINGS);
  const todaySlotsRef = useRef<TimetableSlotRecord[]>([]);
  const lastRefreshDateRef = useRef<string>("");
  const triggeredAlertKeysRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    todaySlotsRef.current = todaySlots;
  }, [todaySlots]);

  useEffect(() => {
    if (!user?.id) {
      setSettings(DEFAULT_TEACHER_TIMETABLE_ALERT_SETTINGS);
      return;
    }

    setSettings(loadTeacherTimetableAlertSettings(user.id));

    const handleSettingsUpdate = (event: Event) => {
      const detail = (event as CustomEvent<{ userId: string; settings: TeacherTimetableAlertSettings }>).detail;
      if (detail?.userId === user.id) {
        setSettings(detail.settings);
      }
    };

    window.addEventListener(TEACHER_TIMETABLE_ALERT_SETTINGS_EVENT, handleSettingsUpdate);
    return () => {
      window.removeEventListener(TEACHER_TIMETABLE_ALERT_SETTINGS_EVENT, handleSettingsUpdate);
    };
  }, [user?.id]);

  useEffect(() => {
    let active = true;

    const resolveTeacher = async () => {
      if (isFirebaseOnlyMode || role !== ROLES.STAFF || !user?.id || !school?.id) {
        setIsTeacherSession(false);
        setTeacherStaffId(null);
        return;
      }

      try {
        const staff = await getStaffByUserId(user.id);
        const isTeacherWorkspace =
          normalizeStaffWorkspace(staff?.role) === STAFF_WORKSPACES.TEACHER;

        if (active) {
          setIsTeacherSession(isTeacherWorkspace);
          setTeacherStaffId(isTeacherWorkspace ? staff?.id ?? null : null);
        }
      } catch {
        if (active) {
          setIsTeacherSession(false);
          setTeacherStaffId(null);
        }
      }
    };

    void resolveTeacher();

    return () => {
      active = false;
    };
  }, [role, school?.id, user?.id]);

  useEffect(() => {
    if (!isTeacherSession || !teacherStaffId || !settings.enabled) {
      setTodaySlots([]);
      lastRefreshDateRef.current = "";
      triggeredAlertKeysRef.current.clear();
      return;
    }

    let active = true;

    const refreshSlots = async () => {
      try {
        const today = getIndiaTodayIso();
        const slots = await listTimetableSlots({ teacherId: teacherStaffId, date: today });
        if (!active) return;
        setTodaySlots(slots.filter((slot) => !slot.isBreak && !slot.isCancelled));
        if (lastRefreshDateRef.current !== today) {
          triggeredAlertKeysRef.current.clear();
          lastRefreshDateRef.current = today;
        }
      } catch {
        if (active) {
          setTodaySlots([]);
        }
      }
    };

    const checkTeacherSchedule = async () => {
      const today = getIndiaTodayIso();
      if (lastRefreshDateRef.current !== today) {
        await refreshSlots();
      }

      const currentDay = getCurrentDay();
      const currentMinute = getCurrentMinuteOfDay();
      const activeDaySlots = todaySlotsRef.current.filter((slot) => slot.day === currentDay);

      for (const slot of activeDaySlots) {
        const slotEndMinute = timeToMinutes(slot.endTime);
        const preAlertMinute = slotEndMinute - 5;
        const baseAlertKey = `${today}:${slot.id}`;

        if (
          settingsRef.current.preAlertEnabled &&
          currentMinute === preAlertMinute &&
          !triggeredAlertKeysRef.current.has(`${baseAlertKey}:pre`)
        ) {
          triggeredAlertKeysRef.current.add(`${baseAlertKey}:pre`);
          await showSystemNotification(
            "Class Ending Soon",
            `${buildSlotLabel(slot)} ends in 5 minutes.`,
          );
          if (settingsRef.current.soundEnabled) {
            await playAlarmSound();
          }
        }

        if (
          currentMinute === slotEndMinute &&
          !triggeredAlertKeysRef.current.has(`${baseAlertKey}:end`)
        ) {
          triggeredAlertKeysRef.current.add(`${baseAlertKey}:end`);
          await showSystemNotification(
            "Class Completed",
            `${buildSlotLabel(slot)} has ended. Please move to your next class.`,
          );
          if (settingsRef.current.soundEnabled) {
            await playAlarmSound();
          }
        }
      }
    };

    void refreshSlots();
    void requestBrowserNotificationPermission().catch(() => undefined);
    void checkTeacherSchedule();

    const refreshInterval = window.setInterval(() => {
      void refreshSlots();
    }, 5 * 60 * 1000);

    const timerInterval = window.setInterval(() => {
      void checkTeacherSchedule();
    }, 60 * 1000);

    return () => {
      active = false;
      window.clearInterval(refreshInterval);
      window.clearInterval(timerInterval);
    };
  }, [isTeacherSession, settings.enabled, teacherStaffId]);

  return null;
};

export default TeacherTimetableAlerts;
