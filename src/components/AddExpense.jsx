import { useEffect, useState } from 'preact/hooks';
import { Sheet, Numpad, Money } from './ui.jsx';
import { toNumber } from '../logic/format.js';
import { todayISO, fmtDay } from '../logic/dates.js';

/**
 * إضافة/تعديل مصروف: المبلغ ← البند ← حفظ (3 لمسات)
 * الملاحظة والتاريخ اختياريين تحت "تفاصيل".
 */
export function AddExpense({ open, editing, cats, onClose, onSave, onDelete }) {
  const [amount, setAmount] = useState('');
  const [catId, setCatId] = useState(null);
  const [note, setNote] = useState('');
  const [date, setDate] = useState(todayISO());
  const [details, setDetails] = useState(false);

  useEffect(() => {
    if (!open) return;
    setAmount(editing ? String(editing.amount) : '');
    setCatId(editing ? editing.categoryId : null);
    setNote(editing?.note || '');
    setDate(editing?.date || todayISO());
    setDetails(!!(editing && (editing.note || editing.date !== todayISO())));
  }, [open, editing]);

  const list = (cats || []).filter((c) => c.kind === 'expense' && (!c.archived || c.id === catId));
  const n = toNumber(amount);
  const ok = n > 0 && catId;

  const save = () => {
    if (!ok) return;
    onSave({ amount: n, categoryId: catId, note, date: date || todayISO() });
  };

  return (
    <Sheet open={open} onClose={onClose} title={editing ? 'تعديل مصروف' : 'مصروف جديد'} class="add-sheet">
      <div class={`amount-display ${amount ? '' : 'empty'}`} data-testid="amount">
        <bdi dir="ltr">{amount || '0'}</bdi>
        <small>ج</small>
      </div>

      <div class="cat-grid" role="radiogroup" aria-label="البند">
        {list.map((c) => (
          <button key={c.id} type="button" role="radio" aria-checked={catId === c.id} class={`cat-chip ${catId === c.id ? 'on' : ''}`} style={{ '--c': c.color }} onClick={() => setCatId(c.id)}>
            <span class="ico">{c.icon}</span>
            <span class="nm">{c.name}</span>
          </button>
        ))}
      </div>

      {details ? (
        <div class="details">
          <input class="input" type="text" placeholder="ملاحظة (اختياري)" value={note} onInput={(e) => setNote(e.currentTarget.value)} maxLength={80} />
          <input class="input" type="date" value={date} max="2100-12-31" onInput={(e) => setDate(e.currentTarget.value)} aria-label="التاريخ" />
        </div>
      ) : (
        <button type="button" class="link-btn" onClick={() => setDetails(true)}>
          📝 ملاحظة · 📅 {fmtDay(date)}
        </button>
      )}

      <Numpad value={amount} onChange={setAmount} />

      <div class="row-btns">
        {editing && (
          <button type="button" class="btn btn-danger-soft" onClick={() => onDelete(editing)}>
            🗑 حذف
          </button>
        )}
        <button type="button" class="btn btn-primary btn-big" disabled={!ok} onClick={save}>
          {ok ? (
            <>
              حفظ <Money v={n} />
            </>
          ) : !n ? (
            'اكتب المبلغ'
          ) : (
            'اختار البند'
          )}
        </button>
      </div>
    </Sheet>
  );
}
