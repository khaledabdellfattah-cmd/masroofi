import { useEffect, useState } from 'preact/hooks';
import { useLive } from '../hooks.js';
import { db, setProfile } from '../db/db.js';
import { archiveCategory, saveCategory, savePreset, deletePreset, wipeEverything } from '../db/store.js';
import { BudgetDiff, CategoryForm, CategoryList } from '../components/Categories.jsx';
import { Confirm, Money, Sheet } from '../components/ui.jsx';
import { toNumber } from '../logic/format.js';
import { toast } from '../toast.js';

export function Settings({ profile }) {
  const cats = useLive(() => db.categories.orderBy('order').toArray(), [], []);
  const presets = useLive(() => db.presets.orderBy('order').toArray(), [], []);
  const [salary, setSalary] = useState(String(profile.salary));
  const [payDay, setPayDay] = useState(String(profile.payDay));
  const [editing, setEditing] = useState(null);
  const [preset, setPreset] = useState(null);
  const [wipe, setWipe] = useState(0);

  useEffect(() => {
    setSalary(String(profile.salary));
    setPayDay(String(profile.payDay));
  }, [profile.salary, profile.payDay]);

  const sal = toNumber(salary);
  const pd = Math.round(toNumber(payDay));
  const dirty = sal !== profile.salary || pd !== profile.payDay;
  const valid = sal > 0 && pd >= 1 && pd <= 31;

  const saveProfile = async () => {
    await setProfile({ salary: sal, payDay: pd });
    toast({ text: 'اتحفظ ✓', tone: 'ok' });
  };

  const expenseCats = cats.filter((c) => c.kind === 'expense' && !c.archived);

  return (
    <div class="settings">
      <h1 class="page-title">الإعدادات</h1>

      <section class="card stack">
        <h3>المرتب ويوم القبض</h3>
        <div class="two">
          <label class="field">
            <span>المرتب</span>
            <input class="input num-input" inputMode="numeric" value={salary} onInput={(e) => setSalary(e.currentTarget.value)} />
          </label>
          <label class="field">
            <span>يوم القبض</span>
            <input class="input num-input" inputMode="numeric" value={payDay} onInput={(e) => setPayDay(e.currentTarget.value)} />
          </label>
        </div>
        {dirty && (
          <button class="btn btn-primary" disabled={!valid} onClick={saveProfile}>
            حفظ
          </button>
        )}
      </section>

      <section class="card stack">
        <h3>الثيم</h3>
        <div class="seg">
          {[
            ['auto', 'تلقائي'],
            ['light', 'فاتح'],
            ['dark', 'غامق'],
          ].map(([k, l]) => (
            <button key={k} class={(profile.theme || 'auto') === k ? 'on' : ''} onClick={() => setProfile({ theme: k })}>
              {l}
            </button>
          ))}
        </div>
      </section>

      <section class="stack">
        <h3 class="sec-title">بنود الصرف</h3>
        <CategoryList items={cats} kind="expense" onEdit={setEditing} onAdd={() => setEditing({ kind: 'expense', icon: '📦', color: '#64748b', budget: '' })} />
        <h3 class="sec-title">الصناديق</h3>
        <CategoryList items={cats} kind="fund" onEdit={setEditing} onAdd={() => setEditing({ kind: 'fund', icon: '💰', color: '#22c55e', budget: '' })} />
        <BudgetDiff salary={profile.salary} items={cats} />
      </section>

      <section class="stack">
        <h3 class="sec-title">المصاريف السريعة</h3>
        <div class="cat-list">
          {presets.map((p) => (
            <button key={p.id} class="cat-row" onClick={() => setPreset(p)}>
              <span class="badge">{p.icon}</span>
              <span class="grow nm">{p.label}</span>
              <Money v={p.amount} />
              <span class="chev">‹</span>
            </button>
          ))}
          <button class="btn btn-dashed" onClick={() => setPreset({ label: '', icon: '⚡', amount: '', categoryId: expenseCats[0]?.id })}>
            + مصروف سريع
          </button>
        </div>
      </section>

      <section class="card stack danger-zone">
        <h3>منطقة خطر</h3>
        <button class="btn btn-danger-soft" onClick={() => setWipe(1)}>
          🗑 مسح كل البيانات
        </button>
      </section>

      <p class="muted tiny center">مصروفي · نسخة {__APP_VERSION__} · كل البيانات على تليفونك بس</p>

      <CategoryForm
        open={!!editing}
        value={editing}
        onClose={() => setEditing(null)}
        onSave={async (c) => {
          await saveCategory(c);
          setEditing(null);
          toast({ text: 'اتحفظ ✓', tone: 'ok' });
        }}
        onDelete={
          editing?.id
            ? async (c) => {
                await archiveCategory(c.id);
                setEditing(null);
                toast({ text: `اتحذف "${c.name}" (مصاريفه القديمة لسه في السجل)` });
              }
            : null
        }
      />

      <PresetForm
        value={preset}
        cats={expenseCats}
        onClose={() => setPreset(null)}
        onSave={async (p) => {
          await savePreset(p);
          setPreset(null);
        }}
        onDelete={async (p) => {
          await deletePreset(p.id);
          setPreset(null);
        }}
      />

      <Confirm open={wipe === 1} title="مسح كل البيانات؟" text="كل المصاريف والبنود والإعدادات هتتمسح من التليفون." okLabel="أيوه، كمّل" danger onOk={() => setWipe(2)} onCancel={() => setWipe(0)} />
      <Confirm open={wipe === 2} title="متأكد 100%؟" text="مفيش رجوع بعد كده. لو مش عامل نسخة احتياطية، البيانات هتروح خالص." okLabel="امسح كل حاجة" danger onOk={wipeEverything} onCancel={() => setWipe(0)} />
    </div>
  );
}

function PresetForm({ value, cats, onClose, onSave, onDelete }) {
  const [p, setP] = useState(value);
  useEffect(() => setP(value), [value]);
  if (!value || !p) return null;
  const set = (k, v) => setP((o) => ({ ...o, [k]: v }));
  const valid = p.label?.trim() && toNumber(p.amount) > 0 && p.categoryId;
  return (
    <Sheet open onClose={onClose} title={p.id ? 'تعديل مصروف سريع' : 'مصروف سريع جديد'}>
      <div class="form">
        <div class="two">
          <label class="field">
            <span>الاسم</span>
            <input class="input" value={p.label} onInput={(e) => set('label', e.currentTarget.value)} maxLength={20} />
          </label>
          <label class="field">
            <span>المبلغ</span>
            <input class="input num-input" inputMode="decimal" value={p.amount} onInput={(e) => set('amount', e.currentTarget.value)} />
          </label>
        </div>
        <label class="field">
          <span>الأيقونة</span>
          <input class="input" value={p.icon} onInput={(e) => set('icon', e.currentTarget.value)} maxLength={4} />
        </label>
        <label class="field">
          <span>البند</span>
          <select class="input" value={p.categoryId} onChange={(e) => set('categoryId', Number(e.currentTarget.value))}>
            {cats.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon} {c.name}
              </option>
            ))}
          </select>
        </label>
        <div class="row-btns">
          {p.id && (
            <button class="btn btn-danger-soft" onClick={() => onDelete(p)}>
              🗑 حذف
            </button>
          )}
          <button class="btn btn-primary btn-big" disabled={!valid} onClick={() => onSave({ ...p, amount: toNumber(p.amount) })}>
            حفظ
          </button>
        </div>
      </div>
    </Sheet>
  );
}
