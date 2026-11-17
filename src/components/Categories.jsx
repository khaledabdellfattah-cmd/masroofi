import { useEffect, useState } from 'preact/hooks';
import { Sheet, Money } from './ui.jsx';
import { ICONS, COLORS } from '../db/defaults.js';
import { toNumber } from '../logic/format.js';
import { allocationDiff } from '../logic/budget.js';

/** فورم تعديل بند أو صندوق */
export function CategoryForm({ open, value, onSave, onDelete, onClose }) {
  const [c, setC] = useState(value || {});
  const [adv, setAdv] = useState(false);
  useEffect(() => {
    if (open) {
      setC(value || {});
      setAdv(false);
    }
  }, [open, value]);
  if (!open) return null;
  const isFund = c.kind === 'fund';
  const set = (k, v) => setC((o) => ({ ...o, [k]: v }));
  const flag = (k, label) => (
    <label class="check">
      <input type="checkbox" checked={!!c[k]} onChange={(e) => set(k, e.currentTarget.checked)} />
      <span>{label}</span>
    </label>
  );
  const valid = (c.name || '').trim() && toNumber(c.budget) >= 0;
  const submit = () => {
    if (!valid) return;
    const out = { ...c, name: c.name.trim(), budget: toNumber(c.budget) };
    if (isFund) {
      out.target = toNumber(c.target) || undefined;
      out.bigTarget = toNumber(c.bigTarget) || undefined;
    }
    if (out.fixed) out.canCover = false; // أهلك والتبرع عمرهم ما يتسحب منهم
    onSave(out);
  };

  return (
    <Sheet open onClose={onClose} title={c.id || c._tmp ? (isFund ? 'تعديل صندوق' : 'تعديل بند') : isFund ? 'صندوق جديد' : 'بند جديد'}>
      <div class="form">
        <label class="field">
          <span>الاسم</span>
          <input class="input" value={c.name || ''} onInput={(e) => set('name', e.currentTarget.value)} maxLength={30} />
        </label>
        <label class="field">
          <span>{isFund ? 'الإيداع الشهري' : 'الميزانية الشهرية'} (جنيه)</span>
          <input class="input num-input" inputMode="numeric" value={c.budget ?? ''} onInput={(e) => set('budget', e.currentTarget.value)} />
        </label>
        {isFund && (
          <div class="two">
            <label class="field">
              <span>الهدف</span>
              <input class="input num-input" inputMode="numeric" value={c.target ?? ''} onInput={(e) => set('target', e.currentTarget.value)} />
            </label>
            <label class="field">
              <span>هدف كبير (اختياري)</span>
              <input class="input num-input" inputMode="numeric" value={c.bigTarget ?? ''} onInput={(e) => set('bigTarget', e.currentTarget.value)} />
            </label>
          </div>
        )}
        <div class="field">
          <span>الأيقونة</span>
          <div class="pick-grid">
            {ICONS.map((i) => (
              <button type="button" key={i} class={`pick ${c.icon === i ? 'on' : ''}`} onClick={() => set('icon', i)}>
                {i}
              </button>
            ))}
          </div>
        </div>
        <div class="field">
          <span>اللون</span>
          <div class="pick-grid">
            {COLORS.map((col) => (
              <button type="button" key={col} aria-label={col} class={`pick swatch ${c.color === col ? 'on' : ''}`} style={{ background: col }} onClick={() => set('color', col)} />
            ))}
          </div>
        </div>
        {isFund ? (
          flag('emergency', 'صندوق طوارئ (السحب منه محتاج تأكيد وسبب)')
        ) : (
          <>
            <button type="button" class="link-btn" onClick={() => setAdv(!adv)}>
              {adv ? '▲' : '▼'} خيارات متقدمة
            </button>
            {adv && (
              <div class="stack">
                {flag('daily', 'يدخل في حساب "تقدر تصرف النهارده"')}
                {flag('rollover', 'اللي متصرفش يترحّل للشهر الجاي')}
                {flag('fixed', 'تحويل ثابت يوم القبض (زي أهلك والتبرع)')}
                {!c.fixed && flag('canCover', 'ممكن آخد منه لو بند تاني عدّى حده')}
              </div>
            )}
          </>
        )}
        <div class="row-btns">
          {onDelete && (
            <button type="button" class="btn btn-danger-soft" onClick={() => onDelete(c)}>
              🗑 حذف
            </button>
          )}
          <button type="button" class="btn btn-primary btn-big" disabled={!valid} onClick={submit}>
            حفظ
          </button>
        </div>
      </div>
    </Sheet>
  );
}

/** قايمة بنود أو صناديق مع زرار إضافة */
export function CategoryList({ items, kind, onEdit, onAdd }) {
  const list = items.filter((c) => c.kind === kind && !c.archived);
  return (
    <div class="cat-list">
      {list.map((c) => (
        <button key={c.id ?? c._tmp} type="button" class="cat-row" onClick={() => onEdit(c)}>
          <span class="badge" style={{ background: c.color }}>
            {c.icon}
          </span>
          <span class="grow">
            <span class="nm">{c.name}</span>
            {c.target ? (
              <span class="muted small">
                {' '}
                · هدف <Money v={c.target} />
              </span>
            ) : null}
          </span>
          <Money v={c.budget} />
          <span class="chev">‹</span>
        </button>
      ))}
      <button type="button" class="btn btn-dashed" onClick={onAdd}>
        + {kind === 'fund' ? 'صندوق جديد' : 'بند جديد'}
      </button>
    </div>
  );
}

/** بيقول الفرق بين مجموع البنود والصناديق والمرتب */
export function BudgetDiff({ salary, items }) {
  const { total, diff } = allocationDiff(salary, items);
  const cls = Math.abs(diff) < 1 ? 'ok' : diff < 0 ? 'bad' : 'warn';
  return (
    <div class={`diff diff-${cls}`} data-testid="budget-diff">
      <div>
        الموزّع: <Money v={total} /> من <Money v={salary} />
      </div>
      <strong>
        {cls === 'ok' ? '✓ مظبوط على المرتب' : diff < 0 ? <>زيادة <Money v={-diff} /> عن المرتب — قلّل حاجة</> : <>فاضل <Money v={diff} /> مش متوزع</>}
      </strong>
    </div>
  );
}
