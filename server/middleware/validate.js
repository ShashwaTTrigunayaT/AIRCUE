import { HttpError } from '../utils/errors.js';

export function parseCoordinates(query) {
  const lat = Number(query.lat);
  const lon = Number(query.lon);

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    throw new HttpError(400, 'INVALID_COORDINATES', 'Latitude and longitude are required.');
  }
  if (lat < -90 || lat > 90) {
    throw new HttpError(400, 'INVALID_LATITUDE', 'Latitude must be between -90 and 90.');
  }
  if (lon < -180 || lon > 180) {
    throw new HttpError(400, 'INVALID_LONGITUDE', 'Longitude must be between -180 and 180.');
  }

  return { lat: Number(lat.toFixed(4)), lon: Number(lon.toFixed(4)) };
}

export function parseLocationQuery(query) {
  const coords = parseCoordinates(query);
  return {
    ...coords,
    name: typeof query.name === 'string' ? query.name.slice(0, 120) : null,
    admin1: typeof query.admin1 === 'string' ? query.admin1.slice(0, 120) : null,
    country: typeof query.country === 'string' ? query.country.slice(0, 120) : null,
    countryCode: typeof query.countryCode === 'string' ? query.countryCode.slice(0, 2).toUpperCase() : null,
    timezone: typeof query.timezone === 'string' ? query.timezone.slice(0, 64) : null,
  };
}

export function parseBodyLocation(input) {
  const source = input && typeof input === 'object' ? input : {};
  const lat = Number(source.latitude ?? source.lat);
  const lon = Number(source.longitude ?? source.lon);

  if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    throw new HttpError(400, 'INVALID_COORDINATES', 'A valid location with latitude and longitude is required.');
  }

  return {
    lat: Number(lat.toFixed(4)),
    lon: Number(lon.toFixed(4)),
    name: typeof source.name === 'string' ? source.name.slice(0, 120) : null,
    admin1: typeof source.admin1 === 'string' ? source.admin1.slice(0, 120) : null,
    country: typeof source.country === 'string' ? source.country.slice(0, 120) : null,
    countryCode: typeof source.countryCode === 'string' ? source.countryCode.slice(0, 2).toUpperCase() : null,
    timezone: typeof source.timezone === 'string' ? source.timezone.slice(0, 64) : null,
  };
}

export function parseRadius(value, fallback = 25000) {
  const radius = Number(value);
  if (!Number.isFinite(radius)) return fallback;
  return Math.min(Math.max(radius, 1000), 100000);
}

/** Parse `lat,lon,label;lat,lon,label` for the comparison endpoint. */
export function parseLocationList(raw) {
  if (typeof raw !== 'string' || !raw.trim()) {
    throw new HttpError(400, 'INVALID_LOCATIONS', 'Provide locations as lat,lon,label pairs separated by semicolons.');
  }

  const entries = raw
    .split(';')
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .slice(0, 3);

  if (entries.length < 1) {
    throw new HttpError(400, 'INVALID_LOCATIONS', 'At least one location is required.');
  }

  return entries.map((entry, index) => {
    const [rawLat, rawLon, ...rest] = entry.split(',');
    const lat = Number(rawLat);
    const lon = Number(rawLon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      throw new HttpError(400, 'INVALID_LOCATIONS', `Location ${index + 1} has invalid coordinates.`);
    }
    const label = rest.join(',').trim();
    return {
      lat: Number(lat.toFixed(4)),
      lon: Number(lon.toFixed(4)),
      name: label ? label.slice(0, 120) : `${lat.toFixed(2)}, ${lon.toFixed(2)}`,
    };
  });
}
