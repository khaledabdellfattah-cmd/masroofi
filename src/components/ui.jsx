import { useEffect, useState } from 'preact/hooks';
import { fmt } from '../logic/format.js';
import { subscribe, dismiss } from '../toast.js';

/** مبلغ بالجنيه — الرقم دايمًا LTR علشان علامة السالب والفواصل تبان صح */
export function Money({ v, cur = 'ج', class: cls = '' }) {
  return (
    <span class={`money ${cls}`}>
      <bdi class="num" dir="ltr">{fmt(v)}</bdi>
      {cur && <small class="cur">{cur}</small>}
    </span>
  );
}

export function Bar({ pct, level, color }) {
  const w = Math.max(0, Math.min(1, Number.isFinite(pct) ? pct : 1)) * 100;
  return (
    <div class="bar" role="progressbar" aria-valuenow={Math.round(w)} aria-valuemin="0" aria-valuemax="100">
      <div class={`bar-fill lvl-${level}`} style={{ width: `${w}%`, background: color }} />
    </div>
  );
}

/** شيت بيطلع من تحت (سهل توصله بإيد واحدة) */
export function Sheet({ open, onClose, title, children, class: cls = '' }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    document.body.classList.add('locked');
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.classList.remove('locked');
    };
  }, [open]);
  if (!open) return null;
  return (
    <div class="overlay" onClick={(e) => e.target === e.currentTarget && onClose?.()}>
      <div class={`sheet ${cls}`} role="dialog" aria-modal="true" aria-label={title}>
        <div class="sheet-head">
          <h2>{title}</h2>
          {onClose && (
            <button class="icon-btn" onClick={onClose} aria-label="قفل">
              ✕
            </button>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}

export function Toaster() {
  const [list, setList] = useState([]);
  useEffect(() => subscribe(setList), []);
  return (
    <div class="toasts" aria-live="polite">
      {list.map((t) => (
        <div key={t.id} class={`toast tone-${t.tone}`}>
          <span>{t.text}</span>
          {t.action && (
            <button
              class="toast-btn"
              onClick={() => {
                t.action.fn();
                dismiss(t.id);
              }}
            >
              {t.action.label}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

/** لوحة أرقام كبيرة جوه التطبيق — أسرع وأريح من كيبورد التليفون */
export function Numpad({ value, onChange }) {
  const press = (k) => {
    let v = value;
    if (k === '⌫') v = v.slice(0, -1);
    else if (k === '.') v = v.includes('.') ? v : (v || '0') + '.';
    else {
      if (v.includes('.') && v.split('.')[1].length >= 2) return;
      if (v.replace('.', '').length >= 8) return;
      v = v === '0' ? k : v + k;
    }
    onChange(v);
  };
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫'];
  return (
    <div class="numpad" dir="ltr">
      {keys.map((k) => (
        <button key={k} type="button" class={`key ${k === '⌫' ? 'key-del' : ''}`} onClick={() => press(k)} aria-label={k === '⌫' ? 'امسح' : k}>
          {k}
        </button>
      ))}
    </div>
  );
}

export function Confirm({ open, title, text, okLabel = 'تمام', danger, onOk, onCancel }) {
  return (
    <Sheet open={open} onClose={onCancel} title={title}>
      {text && <p class="muted">{text}</p>}
      <div class="row-btns">
        <button class={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onOk}>
          {okLabel}
        </button>
        <button class="btn" onClick={onCancel}>
          إلغاء
        </button>
      </div>
    </Sheet>
  );
}
