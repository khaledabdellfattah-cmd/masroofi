export const fmt = (n) => Math.round(n || 0).toLocaleString('en-US');

/** يحوّل الأرقام العربية (٠-٩) والفواصل لأرقام عادية */
export function toNumber(v) {
  if (typeof v === 'number') return v;
  const s = String(v ?? '')
    .replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))
    .replace(/[٫]/g, '.')
    .replace(/[,٬\s]/g, '');
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

export const round2 = (n) => Math.round(n * 100) / 100;
