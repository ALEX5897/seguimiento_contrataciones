import axios from 'axios';

const CACHE_TTL_MS = 5 * 60 * 1000;

let cache = null;

function parseOnlineUtcDate(data) {
  if (!data || typeof data !== 'object') return null;

  const candidates = [
    data.utc_datetime,
    data.datetime,
    data.dateTime,
    data.currentDateTime,
    data.utcDateTime,
    data.time
  ];

  for (const value of candidates) {
    if (!value) continue;
    const parsed = new Date(String(value));
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return null;
}

async function fetchOfficialUtcDate() {
  const endpoints = [
    'https://worldtimeapi.org/api/timezone/Etc/UTC',
    'https://timeapi.io/api/Time/current/zone?timeZone=UTC',
    'https://worldtimeapi.org/api/ip'
  ];

  for (const url of endpoints) {
    try {
      const response = await axios.get(url, {
        timeout: 2500,
        headers: { Accept: 'application/json' }
      });

      const date = parseOnlineUtcDate(response?.data);
      if (date) return date;
    } catch {
      // Intentar siguiente proveedor
    }
  }

  throw new Error('No se pudo obtener hora oficial desde servidores en linea');
}

export async function getOfficialUtcDate() {
  const nowMs = Date.now();

  if (cache && (nowMs - cache.syncedAtMs) <= CACHE_TTL_MS) {
    // Avanza el reloj desde la ultima sincronizacion para no depender de una llamada por request.
    const elapsedMs = nowMs - cache.syncedAtMs;
    return new Date(cache.officialMs + elapsedMs);
  }

  const officialDate = await fetchOfficialUtcDate();
  cache = {
    officialMs: officialDate.getTime(),
    syncedAtMs: nowMs
  };

  return officialDate;
}

export function toMySqlUtcDateTime(date) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) throw new Error('Fecha invalida para MySQL');

  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  const hours = String(d.getUTCHours()).padStart(2, '0');
  const minutes = String(d.getUTCMinutes()).padStart(2, '0');
  const seconds = String(d.getUTCSeconds()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}
