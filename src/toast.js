// نظام رسائل بسيط تحت الشاشة (فوق شريط التنقل)
let listeners = [];
let toasts = [];
let seq = 0;

const emit = () => listeners.forEach((l) => l(toasts));

export function subscribe(fn) {
  listeners.push(fn);
  fn(toasts);
  return () => (listeners = listeners.filter((l) => l !== fn));
}

export function dismiss(id) {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

/** toast({ text, tone: 'info'|'warn'|'bad'|'ok', action: { label, fn }, ms }) */
export function toast({ text, tone = 'info', action = null, ms = 4500 }) {
  const id = ++seq;
  toasts = [...toasts.slice(-2), { id, text, tone, action }];
  emit();
  setTimeout(() => dismiss(id), ms);
  return id;
}
