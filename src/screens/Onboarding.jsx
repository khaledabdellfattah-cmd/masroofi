import { useState } from 'preact/hooks';
import { DEFAULT_CATEGORIES, DEFAULT_PAYDAY, DEFAULT_SALARY } from '../db/defaults.js';
import { finishOnboarding } from '../db/store.js';
import { toNumber } from '../logic/format.js';
import { BudgetDiff, CategoryForm, CategoryList } from '../components/Categories.jsx';

let tmp = 0;
const withTmp = (c) => ({ ...c, _tmp: ++tmp });

export function Onboarding() {
  const [step, setStep] = useState(0);
  const [salary, setSalary] = useState(String(DEFAULT_SALARY));
  const [payDay, setPayDay] = useState(String(DEFAULT_PAYDAY));
  const [items, setItems] = useState(() => DEFAULT_CATEGORIES.map(withTmp));
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);

  const sal = toNumber(salary);
  const pd = Math.round(toNumber(payDay));
  const step0ok = sal > 0 && pd >= 1 && pd <= 31;

  const saveItem = (c) => {
    setItems((list) => (c._tmp && list.some((x) => x._tmp === c._tmp) ? list.map((x) => (x._tmp === c._tmp ? c : x)) : [...list, withTmp(c)]));
    setEditing(null);
  };
  const removeItem = (c) => {
    setItems((list) => list.filter((x) => x._tmp !== c._tmp));
    setEditing(null);
  };

  const finish = async () => {
    setBusy(true);
    try {
      await finishOnboarding({ salary: sal, payDay: pd, cats: items });
    } catch (e) {
      console.error(e);
      setBusy(false);
    }
  };

  return (
    <div class="app onboarding">
      <div class="steps" aria-label={`خطوة ${step + 1} من 3`}>
        {[0, 1, 2].map((i) => (
          <span key={i} class={`dot ${i <= step ? 'on' : ''}`} />
        ))}
      </div>

      {step === 0 && (
        <section class="stack">
          <h1>أهلًا 👋</h1>
          <p class="muted">خلّينا نظبط مرتبك وميزانيتك في دقيقة. كل البيانات بتفضل على تليفونك بس.</p>
          <label class="field">
            <span>المرتب الشهري (جنيه)</span>
            <input class="input input-big num-input" inputMode="numeric" value={salary} onInput={(e) => setSalary(e.currentTarget.value)} data-testid="salary" />
          </label>
          <label class="field">
            <span>يوم القبض في الشهر</span>
            <input class="input input-big num-input" inputMode="numeric" value={payDay} onInput={(e) => setPayDay(e.currentTarget.value)} data-testid="payday" />
            <small class="muted">مثلًا لو بتقبض يوم 5، يبقى مرتب ديسمبر بييجي يوم 5 يناير.</small>
          </label>
        </section>
      )}

      {step === 1 && (
        <section class="stack">
          <h1>بنود الصرف</h1>
          <p class="muted">دوس على أي بند تعدّل اسمه أو مبلغه أو أيقونته أو لونه.</p>
          <CategoryList items={items} kind="expense" onEdit={setEditing} onAdd={() => setEditing({ kind: 'expense', icon: '📦', color: '#64748b', budget: '' })} />
          <BudgetDiff salary={sal} items={items} />
        </section>
      )}

      {step === 2 && (
        <section class="stack">
          <h1>صناديق التحويش</h1>
          <p class="muted">رصيدها بيتجمع شهر ورا شهر.</p>
          <CategoryList items={items} kind="fund" onEdit={setEditing} onAdd={() => setEditing({ kind: 'fund', icon: '💰', color: '#22c55e', budget: '' })} />
          <BudgetDiff salary={sal} items={items} />
        </section>
      )}

      <div class="bottom-actions">
        {step > 0 && (
          <button class="btn" onClick={() => setStep(step - 1)}>
            رجوع
          </button>
        )}
        {step < 2 ? (
          <button class="btn btn-primary btn-big" disabled={!step0ok} onClick={() => setStep(step + 1)}>
            التالي
          </button>
        ) : (
          <button class="btn btn-primary btn-big" disabled={busy} onClick={finish}>
            يلا نبدأ 🚀
          </button>
        )}
      </div>

      <CategoryForm open={!!editing} value={editing} onClose={() => setEditing(null)} onSave={saveItem} onDelete={editing?._tmp ? removeItem : null} />
    </div>
  );
}
