/* ============================================================
   CARESENSE DATE / TIME UTILITIES

   One place for all user-facing date/time formatting.
   All display functions use the device's local timezone.
   API appointment creation preserves the device timezone offset.
============================================================ */

const pad = value =>
  String(value).padStart(2, '0');

/**
 * Parse a backend/client date safely.
 *
 * Important: date-only values such as YYYY-MM-DD are constructed
 * as a local date instead of letting JS interpret them as UTC.
 */
export const parseDateTime = value => {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    const copy = new Date(value.getTime());

    return Number.isNaN(copy.getTime())
      ? null
      : copy;
  }

  if (typeof value !== 'string') {
    const parsed = new Date(value);

    return Number.isNaN(parsed.getTime())
      ? null
      : parsed;
  }

  const raw = value.trim();

  if (!raw) {
    return null;
  }

  const dateOnlyMatch =
    /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);

  if (dateOnlyMatch) {
    const year = Number(dateOnlyMatch[1]);
    const month = Number(dateOnlyMatch[2]);
    const day = Number(dateOnlyMatch[3]);

    const localDate = new Date(
      year,
      month - 1,
      day,
      0,
      0,
      0,
      0,
    );

    return Number.isNaN(localDate.getTime())
      ? null
      : localDate;
  }

  const parsed = new Date(raw);

  return Number.isNaN(parsed.getTime())
    ? null
    : parsed;
};

export const getLocalDateKey = value => {
  const date = parseDateTime(value);

  if (!date) {
    return '';
  }

  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
  ].join('-');
};

export const formatTime = value => {
  const date = parseDateTime(value);

  if (!date) {
    return 'Time unavailable';
  }

  return date.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
};

export const formatFullDate = value => {
  const date = parseDateTime(value);

  if (!date) {
    return 'Date unavailable';
  }

  return date.toLocaleDateString([], {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
};

/**
 * Long calendar date without a year. Useful for booking confirmations.
 */
export const formatLongDate = value => {
  const date = parseDateTime(value);

  if (!date) {
    return 'Date unavailable';
  }

  return date.toLocaleDateString([], {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
};

export const formatShortDate = value => {
  const date = parseDateTime(value);

  if (!date) {
    return 'Date unavailable';
  }

  return date.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

export const formatDate = value => {
  const date = parseDateTime(value);

  if (!date) {
    return 'Date unavailable';
  }

  return date.toLocaleDateString([], {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

export const formatDateTime = value => {
  const date = parseDateTime(value);

  if (!date) {
    return 'Recently';
  }

  return date.toLocaleString([], {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

export const formatRecordDate = value => {
  const date = parseDateTime(value);

  if (!date) {
    return 'Recently';
  }

  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

export const formatRelativeDate = value => {
  const date = parseDateTime(value);

  if (!date) {
    return 'Date unavailable';
  }

  const today = new Date();
  const todayKey = getLocalDateKey(today);
  const dateKey = getLocalDateKey(date);

  if (dateKey === todayKey) {
    return 'Today';
  }

  const tomorrow = new Date(today);
  tomorrow.setHours(0, 0, 0, 0);
  tomorrow.setDate(today.getDate() + 1);

  if (dateKey === getLocalDateKey(tomorrow)) {
    return 'Tomorrow';
  }

  return date.toLocaleDateString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
};

export const formatApiDateTime = value => {
  const date = parseDateTime(value);

  if (!date) {
    return '';
  }

  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());

  const offsetMinutes =
    -date.getTimezoneOffset();

  const sign =
    offsetMinutes >= 0 ? '+' : '-';

  const absoluteOffset =
    Math.abs(offsetMinutes);

  const offsetHours = pad(
    Math.floor(absoluteOffset / 60),
  );

  const offsetRemainingMinutes = pad(
    absoluteOffset % 60,
  );

  return (
    `${year}-${month}-${day}` +
    `T${hours}:${minutes}:00` +
    `${sign}${offsetHours}:${offsetRemainingMinutes}`
  );
};
