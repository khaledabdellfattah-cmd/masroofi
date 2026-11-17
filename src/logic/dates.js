// كل التواريخ بتتخزن كنص 'YYYY-MM-DD' بالتوقيت المحلي، علشان المقارنة والترتيب يبقوا سهلين.
export const pad = (n) => String(n).padStart(2, '0');
export const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const ymd = (s) => {
  const [y, m, d] = s.split('-').map(Number);
  return [y, m - 1, d];
};
export const parse = (s) => new Date(...ymd(s));
export const todayISO = () => iso(new Date());
export const addDays = (s, n) => {
  const d = parse(s);
  d.setDate(d.getDate() + n);
  return iso(d);
};
export const daysBetween = (a, b) => Math.round((Date.UTC(...ymd(b)) - Date.UTC(...ymd(a))) / 864e5);
const daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();

export const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
export const WEEKDAYS = ['الأحد', 'الإتنين', 'التلات', 'الأربع', 'الخميس', 'الجمعة', 'السبت'];

export function fmtDay(s) {
  const d = parse(s);
  return `${WEEKDAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}
export const fmtShort = (s) => {
  const d = parse(s);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
};

/** يوم القبض في شهر معيّن (لو الشهر أقصر من يوم القبض، بياخد آخر يوم في الشهر) */
export function payDate(y, m, payDay) {
  const first = new Date(y, m, 1);
  const Y = first.getFullYear();
  const M = first.getMonth();
  return iso(new Date(Y, M, Math.min(payDay, daysInMonth(Y, M))));
}

/**
 * "الدورة" = من يوم القبض لحد اليوم اللي قبل القبض الجاي.
 * key = سنة-شهر يوم البداية (مثلًا قبض 5 يناير 2027 → '2027-01').
 */
export function cycleFor(dateISO, payDay) {
  const [y, m] = ymd(dateISO);
  let start = payDate(y, m, payDay);
  if (dateISO < start) start = payDate(y, m - 1, payDay);
  const [sy, sm] = ymd(start);
  const next = payDate(sy, sm + 1, payDay);
  return { key: start.slice(0, 7), start, end: addDays(next, -1), next, days: daysBetween(start, next) };
}

/** اسم الدورة: لو القبض في أول الشهر (≤15) فهو مرتب الشهر اللي قبله — قبض 5 يناير = مرتب ديسمبر */
export function cycleLabel(cycle, payDay) {
  const [y, m] = ymd(cycle.start);
  const d = new Date(y, payDay <= 15 ? m - 1 : m, 1);
  return `مرتب ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}
