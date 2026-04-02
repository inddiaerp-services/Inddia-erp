export const INDIA_TIME_ZONE = "Asia/Kolkata";

const getDateParts = (date: Date, timeZone: string) => {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.formatToParts(date);
  return {
    year: parts.find((part) => part.type === "year")?.value ?? "0000",
    month: parts.find((part) => part.type === "month")?.value ?? "01",
    day: parts.find((part) => part.type === "day")?.value ?? "01",
  };
};

const parseDateString = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, (month || 1) - 1, day || 1, 12, 0, 0));
};

export const formatDateKey = (date: Date, timeZone = INDIA_TIME_ZONE) => {
  const parts = getDateParts(date, timeZone);
  return `${parts.year}-${parts.month}-${parts.day}`;
};

export const getIndiaTodayIso = () => formatDateKey(new Date(), INDIA_TIME_ZONE);

export const addDaysToDateString = (value: string, amount: number) => {
  const date = parseDateString(value);
  date.setUTCDate(date.getUTCDate() + amount);
  return formatDateKey(date, "UTC");
};

export const getWeekdayFromDateString = (value: string) =>
  parseDateString(value).toLocaleDateString("en-US", {
    weekday: "short",
    timeZone: "UTC",
  });

export const formatShortDateFromDateString = (value: string) =>
  parseDateString(value).toLocaleDateString("en-US", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  });

export const getMonthKeyFromDateString = (value: string) => value.slice(0, 7);

export const getMonthDates = (month: string) => {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year || 1970, (monthNumber || 1) - 1, 1, 12, 0, 0));
  const dates: string[] = [];

  while (date.getUTCMonth() === (monthNumber || 1) - 1) {
    dates.push(formatDateKey(date, "UTC"));
    date.setUTCDate(date.getUTCDate() + 1);
  }

  return dates;
};

export const formatMonthLabel = (month: string) => {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(Date.UTC(year || 1970, (monthNumber || 1) - 1, 1, 12, 0, 0)).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
};
