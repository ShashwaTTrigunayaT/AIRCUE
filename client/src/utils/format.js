export function formatNumber(value, precision = 0) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  }).format(value);
}

export function withUnit(value, unit, precision = 0) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'Not available';
  return `${formatNumber(value, precision)}${unit ? ` ${unit}` : ''}`;
}

function safeFormat(iso, timezone, options) {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('en-GB', { ...options, timeZone: timezone || 'UTC' }).format(new Date(iso));
  } catch {
    try {
      return new Intl.DateTimeFormat('en-GB', options).format(new Date(iso));
    } catch {
      return iso;
    }
  }
}

export const formatClock = (iso, timezone) =>
  safeFormat(iso, timezone, { hour: '2-digit', minute: '2-digit', hour12: false });

export const formatDateTime = (iso, timezone) =>
  safeFormat(iso, timezone, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false });

export const formatDate = (isoOrDate, timezone) =>
  safeFormat(isoOrDate, timezone, { weekday: 'short', day: 'numeric', month: 'short' });

export const formatShortDate = (isoOrDate, timezone) =>
  safeFormat(isoOrDate, timezone, { day: 'numeric', month: 'short' });

export function localTimeLabel(localIso) {
  if (!localIso || typeof localIso !== 'string') return '—';
  const match = localIso.match(/T(\d{2}:\d{2})/);
  return match ? match[1] : localIso;
}

export function timeAgo(iso) {
  if (!iso) return 'unknown';
  const ms = Date.now() - Date.parse(iso);
  if (!Number.isFinite(ms)) return 'unknown';
  const minutes = Math.round(ms / 60000);
  if (minutes < 1) return 'just now';
  if (minutes === 1) return '1 minute ago';
  if (minutes < 60) return `${minutes} minutes ago`;
  const hours = Math.round(minutes / 60);
  if (hours === 1) return '1 hour ago';
  if (hours < 24) return `${hours} hours ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? '1 day ago' : `${days} days ago`;
}

export function formatPct(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  const prefix = value > 0 ? '+' : '';
  return `${prefix}${value.toFixed(1)}%`;
}

export function locationTitle(location) {
  if (!location) return 'Selected location';
  return location.name || 'Selected location';
}

export function locationSubtitle(location) {
  if (!location) return '';
  return [location.admin1, location.country].filter(Boolean).join(', ');
}

export function shortCoords(lat, lon) {
  if (typeof lat !== 'number' || typeof lon !== 'number') return '';
  const ns = lat >= 0 ? 'N' : 'S';
  const ew = lon >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(2)}°${ns}, ${Math.abs(lon).toFixed(2)}°${ew}`;
}

export function relativeCategoryLevel(standard, value) {
  if (typeof value !== 'number') return null;
  if (standard === 'EU') return value > 100 ? 'above 100' : null;
  return value > 500 ? 'above 500 (beyond the standard scale)' : null;
}
