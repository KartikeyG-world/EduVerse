/**
 * Helper to compute local date in YYYY-MM-DD format using IANA timezone or numeric offset.
 * Falls back safely to UTC if timezone is missing, invalid, or malformed.
 */
const getLocalDateString = (date = new Date(), timezone = null) => {
  if (!date || isNaN(new Date(date).getTime())) {
    date = new Date();
  } else if (!(date instanceof Date)) {
    date = new Date(date);
  }

  // 1. Try IANA Timezone string (e.g. 'Asia/Kolkata', 'America/New_York')
  if (timezone && typeof timezone === 'string') {
    try {
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
      return formatter.format(date); // Returns 'YYYY-MM-DD'
    } catch (_) {
      // Fall through to offset / UTC fallback
    }
  }

  // 2. Try numeric offset in minutes (e.g. -330 for IST from getTimezoneOffset())
  if (typeof timezone === 'number' && !isNaN(timezone)) {
    const localTime = new Date(date.getTime() - timezone * 60 * 1000);
    return localTime.toISOString().split('T')[0];
  }

  // 3. Fallback to UTC
  return date.toISOString().split('T')[0];
};

/**
 * Calculates calendar day difference between two YYYY-MM-DD date strings
 */
const getDayDifference = (dateStr1, dateStr2) => {
  const d1 = new Date(`${dateStr1}T00:00:00Z`);
  const d2 = new Date(`${dateStr2}T00:00:00Z`);
  const diffMs = d2.getTime() - d1.getTime();
  return Math.round(diffMs / (24 * 60 * 60 * 1000));
};

/**
 * Timezone-aware streak updater.
 * Evaluates day boundaries in user's local timezone.
 */
const updateStreak = async (user, timezone = null) => {
  if (!user) return null;

  const now = new Date();
  const todayLocalStr = getLocalDateString(now, timezone);
  let isUpdated = false;

  if (!user.lastActiveDate) {
    user.lastActiveDate = now;
    user.streak = 1;
    isUpdated = true;
  } else {
    const lastActiveLocalStr = getLocalDateString(user.lastActiveDate, timezone);
    const dayDiff = getDayDifference(lastActiveLocalStr, todayLocalStr);

    if (dayDiff === 1) {
      // Consecutive calendar day in user's timezone
      user.streak = (user.streak || 0) + 1;
      user.lastActiveDate = now;
      isUpdated = true;
    } else if (dayDiff > 1) {
      // Streak broken
      user.streak = 1;
      user.lastActiveDate = now;
      isUpdated = true;
    } else if (dayDiff === 0) {
      // Same calendar day — maintain current streak
      user.lastActiveDate = now;
    }
  }

  if (isUpdated && typeof user.save === 'function') {
    await user.save();
  }

  return user;
};

/**
 * Validates whether a timezone identifier is a supported IANA timezone.
 * Returns the valid IANA timezone string, or 'UTC' as a safe fallback.
 */
const validateIanaTimezone = (timezone) => {
  if (!timezone || typeof timezone !== 'string') return 'UTC';
  const trimmed = timezone.trim();
  try {
    Intl.DateTimeFormat(undefined, { timeZone: trimmed });
    return trimmed;
  } catch (_) {
    return 'UTC';
  }
};

/**
 * Returns an array of the last N calendar days in the specified IANA timezone.
 * Each entry has: { date: 'YYYY-MM-DD', day: 'Mon' }
 */
const getRecentDaysArray = (count = 7, timezone = 'UTC') => {
  const validTz = validateIanaTimezone(timezone);
  const now = new Date();
  const days = [];
  
  // Calculate relative day offsets
  for (let i = count - 1; i >= 0; i--) {
    const targetDate = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = getLocalDateString(targetDate, validTz);
    
    let displayDay = 'Day';
    try {
      displayDay = new Intl.DateTimeFormat('en-US', { timeZone: validTz, weekday: 'short' }).format(targetDate);
    } catch (_) {
      displayDay = targetDate.toLocaleDateString('en-US', { weekday: 'short' });
    }

    days.push({
      date: dateStr,
      day: displayDay
    });
  }
  return days;
};

module.exports = {
  updateStreak,
  getLocalDateString,
  getDayDifference,
  validateIanaTimezone,
  getRecentDaysArray
};

