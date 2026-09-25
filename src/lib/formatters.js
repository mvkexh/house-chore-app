/**
 * Roommate Chore Manager — 12-Hour Time & Dynamic Date Range Formatters
 */

export function formatTime12Hour(time24Str) {
  if (!time24Str) return '';
  if (/AM|PM/i.test(time24Str)) return time24Str;
  const parts = time24Str.split(':');
  if (parts.length < 2) return time24Str;
  let hours = parseInt(parts[0], 10);
  const minutes = parts[1].substring(0, 2).padStart(2, '0');
  if (isNaN(hours)) return time24Str;
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  if (hours === 0) hours = 12;
  return `${hours}:${minutes} ${ampm}`;
}

export function formatDateTime12Hour(isoDateStr) {
  if (!isoDateStr) return '';
  const d = new Date(isoDateStr);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function formatTimeOnly12Hour(isoDateStr) {
  if (!isoDateStr) return '';
  const d = new Date(isoDateStr);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function formatDateRange(startDateStr, endDateStr) {
  if (!startDateStr || !endDateStr) return '';
  const start = new Date(startDateStr.includes('T') ? startDateStr : startDateStr + 'T00:00:00');
  const end = new Date(endDateStr.includes('T') ? endDateStr : endDateStr + 'T00:00:00');
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return '';
  const startMonth = start.toLocaleString('en-US', { month: 'short' });
  const endMonth = end.toLocaleString('en-US', { month: 'short' });
  if (startMonth === endMonth) {
    return `${startMonth} ${start.getDate()} – ${end.getDate()}`;
  }
  return `${startMonth} ${start.getDate()} – ${endMonth} ${end.getDate()}`;
}
