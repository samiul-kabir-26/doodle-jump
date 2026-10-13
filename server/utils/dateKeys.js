export function getDayKey(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  return d.toISOString().slice(0, 10);
}

export function getWeekKey(date = new Date()) {
  const d = date instanceof Date ? new Date(date.getTime()) : new Date(date);
  // ISO-8601 week date and number in UTC
  const dayOfWeek = (d.getUTCDay() + 6) % 7; // Monday = 0, Sunday = 6
  d.setUTCDate(d.getUTCDate() - dayOfWeek + 3); // Nearest Thursday
  const firstThursday = d.getTime();
  d.setUTCMonth(0, 1);
  if (d.getUTCDay() !== 4) {
    d.setUTCMonth(0, 1 + ((4 - d.getUTCDay() + 7) % 7));
  }
  const weekNum = 1 + Math.ceil((firstThursday - d.getTime()) / (7 * 24 * 3600 * 1000));
  const year = new Date(firstThursday).getUTCFullYear();
  const padWeek = weekNum.toString().padStart(2, '0');
  return `${year}-W${padWeek}`;
}
