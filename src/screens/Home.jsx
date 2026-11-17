import { Money, Bar } from '../components/ui.jsx';
import { useLive } from '../hooks.js';
import { db } from '../db/db.js';
import { loadState } from '../db/store.js';
import { suggestPresets, WARN_AT } from '../logic/budget.js';
import { addDays, cycleLabel, fmtShort } from '../logic/dates.js';
import { fmt } from '../logic/format.js';

const LEVEL_TEXT = { ok: 'ماشي تمام', warn: 'خلّي بالك', bad: 'قرّبت تخلّص' };

export function Home({ today, onQuick, onSavePreset, onThemeToggle, theme }) {
  const st = useLive(() => loadState(today), [today]);
  const presets = useLive(() => db.presets.orderBy('order').toArray(), [], []);
  const recent = useLive(() => db.expenses.where('date').aboveOrEqual(addDays(today, -90)).toArray(), [today], []);
  if (!st) return <div class="loading" />;

  const { cycle, profile, rows, over, flex, daysLeft, week } = st;
  const catById = Object.fromEntries(st.cats.map((c) => [c.id, c]));
  const suggestions = suggestPresets(recent, presets).filter((s) => catById[s.categoryId] && !catById[s.categoryId].archived);
  const t = st.today;

  return (
    <div class="home">
      <header class="top">
        <div>
          <div class="muted small">{cycleLabel(cycle, profile.payDay)}</div>
          <div class="small">
            {fmtShort(cycle.start)} ← {fmtShort(cycle.end)}
          </div>
        </div>
        <button class="icon-btn" onClick={onThemeToggle} aria-label="تغيير الثيم" title="تغيير الثيم">
          {theme === 'dark' ? '🌙' : theme === 'light' ? '☀️' : '🌓'}
        </button>
      </header>

      {over.length > 0 && (
        <div class="alert-bad" role="alert" data-testid="over-banner">
          ⚠️ عدّيت حد:{' '}
          {over.map((r, i) => (
            <span key={r.id}>
              {i > 0 && '، '}
              {r.name} (<bdi dir="ltr">+{fmt(r.spent - r.budget)}</bdi>)
            </span>
          ))}
        </div>
      )}

      <section class={`hero lvl-${flex.level}`} data-testid="hero">
        <div class="hero-label">الباقي من فلوس الصرف</div>
        <div class="hero-num">
          <Money v={flex.left} />
        </div>
        <Bar pct={flex.pct} level={flex.level} />
        <div class="hero-sub">
          <span>
            صرفت <Money v={flex.spent} /> من <Money v={flex.budget} />
          </span>
          <span class="pill">{LEVEL_TEXT[flex.level]}</span>
        </div>
      </section>

      <div class="stats">
        <div class="stat">
          <div class="stat-num">{daysLeft}</div>
          <div class="muted small">{daysLeft === 1 ? 'يوم على القبض' : 'يوم على القبض'}</div>
          <div class="tiny muted">{fmtShort(cycle.next)}</div>
        </div>
        <div class={`stat ${t.left < 0 ? 'stat-bad' : ''}`} data-testid="today">
          <div class="stat-num">
            <Money v={Math.max(0, t.left)} />
          </div>
          <div class="muted small">تقدر تصرف النهارده</div>
          <div class="tiny muted">
            {t.spent > 0 ? (
              <>
                صرفت <Money v={t.spent} /> من <Money v={t.perDay} />
              </>
            ) : (
              <>
                من <Money v={t.perDay} /> في اليوم
              </>
            )}
          </div>
        </div>
      </div>

      {week && (
        <section class="card week" data-testid="week">
          <div class="card-head">
            <span>
              {week.cat.icon} {week.cat.name} — الأسبوع {week.index}
            </span>
            <span class="muted small">
              {fmtShort(week.start)} ← {fmtShort(week.end)}
            </span>
          </div>
          <div class="week-row">
            <span>
              باقي الأسبوع ده: <Money v={week.left} class={week.left < 0 ? 'bad' : ''} />
            </span>
            <span class="muted small">
              من <Money v={week.budget} />
            </span>
          </div>
          <Bar pct={week.pct} level={week.level} />
        </section>
      )}

      {(presets.length > 0 || suggestions.length > 0) && (
        <section>
          <h3 class="sec-title">مصاريف سريعة</h3>
          <div class="quick">
            {presets.map((p) => (
              <button key={p.id} class="quick-btn" onClick={() => onQuick(p)} data-testid="quick">
                <span class="ico">{p.icon}</span>
                <span>{p.label}</span>
                <Money v={p.amount} />
              </button>
            ))}
            {suggestions.map((s) => (
              <button key={`s${s.categoryId}-${s.amount}`} class="quick-btn suggest" onClick={() => onSavePreset({ label: s.label || catById[s.categoryId].name, icon: catById[s.categoryId].icon, amount: s.amount, categoryId: s.categoryId })} title="ثبّته كمصروف سريع">
                <span class="ico">＋</span>
                <span>{s.label || catById[s.categoryId].name}</span>
                <Money v={s.amount} />
              </button>
            ))}
          </div>
        </section>
      )}

      <h3 class="sec-title">البنود</h3>
      <div class="cards">
        {rows
          .filter((r) => !r.archived)
          .map((r) => (
            <div key={r.id} class={`card cat-card ${r.pct > 1 ? 'is-over' : ''}`} data-testid="cat-card">
              <div class="cat-top">
                <span class="badge" style={{ background: r.color }}>
                  {r.icon}
                </span>
                <span class="nm">{r.name}</span>
                {r.pct >= WARN_AT && r.pct <= 1 && <span class="dot-warn" title="وصل 80%" />}
              </div>
              <div class="cat-left">
                <Money v={r.left} class={r.left < 0 ? 'bad' : ''} />
              </div>
              <Bar pct={r.pct} level={r.level} />
              <div class="tiny muted">
                <bdi dir="ltr">
                  {fmt(r.spent)} / {fmt(r.budget)}
                </bdi>
                {r.carry > 0 && <> · مترحّل {fmt(r.carry)}</>}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
