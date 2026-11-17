import { useState } from 'preact/hooks';
import { useLive } from '../hooks.js';
import { db } from '../db/db.js';
import { Money } from '../components/ui.jsx';
import { cycleFor, addDays, fmtDay } from '../logic/dates.js';
import { toNumber } from '../logic/format.js';

export function History({ today, profile, onEdit }) {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const [period, setPeriod] = useState('cycle');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [min, setMin] = useState('');
  const [max, setMax] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const cats = useLive(() => db.categories.toArray(), [], []);
  const cur = cycleFor(today, profile.payDay);
  const prev = cycleFor(addDays(cur.start, -1), profile.payDay);
  const range =
    period === 'cycle' ? [cur.start, cur.end] : period === 'prev' ? [prev.start, prev.end] : period === 'custom' ? [from || '0000-01-01', to || '9999-12-31'] : ['0000-01-01', '9999-12-31'];

  const all = useLive(() => db.expenses.where('date').between(range[0], range[1], true, true).reverse().sortBy('date'), [range[0], range[1]], null);

  const catById = Object.fromEntries(cats.map((c) => [c.id, c]));
  const needle = q.trim();
  const lo = toNumber(min);
  const hi = toNumber(max);
  const list = (all || [])
    .filter((e) => !cat || e.categoryId === Number(cat))
    .filter((e) => !min || e.amount >= lo)
    .filter((e) => !max || e.amount <= hi)
    .filter((e) => !needle || (e.note || '').includes(needle) || (catById[e.categoryId]?.name || '').includes(needle) || String(e.amount).includes(needle))
    .sort((a, b) => (a.date === b.date ? b.createdAt - a.createdAt : a.date < b.date ? 1 : -1));

  const groups = [];
  for (const e of list) {
    const g = groups[groups.length - 1];
    if (g && g.date === e.date) {
      g.items.push(e);
      g.total += e.amount;
    } else groups.push({ date: e.date, items: [e], total: e.amount });
  }
  const total = list.reduce((s, e) => s + e.amount, 0);
  const activeFilters = [cat, min, max].filter(Boolean).length + (period === 'custom' ? 1 : 0);

  return (
    <div class="history">
      <h1 class="page-title">السجل</h1>
      <input class="input" type="search" placeholder="🔍 دوّر في الملاحظات أو البنود أو المبالغ" value={q} onInput={(e) => setQ(e.currentTarget.value)} data-testid="search" />

      <div class="seg" role="tablist">
        {[
          ['cycle', 'الشهر ده'],
          ['prev', 'اللي فات'],
          ['all', 'الكل'],
          ['custom', 'مخصص'],
        ].map(([k, l]) => (
          <button key={k} role="tab" aria-selected={period === k} class={period === k ? 'on' : ''} onClick={() => setPeriod(k)}>
            {l}
          </button>
        ))}
      </div>

      <button class="link-btn" onClick={() => setShowFilters(!showFilters)}>
        {showFilters ? '▲' : '▼'} فلاتر {activeFilters ? `(${activeFilters})` : ''}
      </button>
      {(showFilters || period === 'custom') && (
        <div class="filters">
          <select class="input" value={cat} onChange={(e) => setCat(e.currentTarget.value)} aria-label="البند">
            <option value="">كل البنود</option>
            {cats
              .filter((c) => c.kind === 'expense')
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon} {c.name}
                  {c.archived ? ' (محذوف)' : ''}
                </option>
              ))}
          </select>
          {period === 'custom' && (
            <div class="two">
              <label class="field">
                <span>من</span>
                <input class="input" type="date" value={from} onInput={(e) => setFrom(e.currentTarget.value)} />
              </label>
              <label class="field">
                <span>لحد</span>
                <input class="input" type="date" value={to} onInput={(e) => setTo(e.currentTarget.value)} />
              </label>
            </div>
          )}
          <div class="two">
            <input class="input num-input" inputMode="numeric" placeholder="أقل مبلغ" value={min} onInput={(e) => setMin(e.currentTarget.value)} />
            <input class="input num-input" inputMode="numeric" placeholder="أكبر مبلغ" value={max} onInput={(e) => setMax(e.currentTarget.value)} />
          </div>
          {activeFilters > 0 && (
            <button
              class="link-btn"
              onClick={() => {
                setCat('');
                setMin('');
                setMax('');
                if (period === 'custom') setPeriod('cycle');
              }}
            >
              ✕ امسح الفلاتر
            </button>
          )}
        </div>
      )}

      <div class="total-line">
        {list.length} مصروف · الإجمالي <Money v={total} />
      </div>

      {all && list.length === 0 && <p class="empty">مفيش مصاريف هنا لسه.</p>}

      {groups.map((g) => (
        <section key={g.date} class="day">
          <div class="day-head">
            <span>{fmtDay(g.date)}</span>
            <Money v={g.total} />
          </div>
          {g.items.map((e) => {
            const c = catById[e.categoryId] || { icon: '❔', name: 'بند محذوف', color: '#64748b' };
            return (
              <button key={e.id} class="exp-row" onClick={() => onEdit(e)} data-testid="exp-row">
                <span class="badge" style={{ background: c.color }}>
                  {c.icon}
                </span>
                <span class="grow">
                  <span class="nm">{e.note || c.name}</span>
                  {e.note && <span class="muted tiny">{c.name}</span>}
                </span>
                <Money v={e.amount} />
              </button>
            );
          })}
        </section>
      ))}
    </div>
  );
}
