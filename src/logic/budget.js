import { addDays, daysBetween } from './dates.js';

/** الألوان: أخضر لحد 60%، أصفر 60–85%، أحمر بعد 85% أو لو عدّى الحد */
export function levelOf(pct) {
  if (pct > 0.85) return 'bad';
  if (pct >= 0.6) return 'warn';
  return 'ok';
}
export const WARN_AT = 0.8; // تنبيه أصفر لما البند يوصل 80%

/** الميزانية الفعلية لبند في دورة = الأساسي + المترحّل + المنقول ليه − المنقول منه */
export function effectiveBudgets(cats, snap, moves) {
  const out = {};
  for (const c of cats) {
    const base = snap?.budgets?.[c.id] ?? (c.archived ? 0 : c.budget);
    out[c.id] = { base, carry: snap?.carry?.[c.id] || 0, adj: 0 };
  }
  for (const m of moves || []) {
    if (out[m.to]) out[m.to].adj += m.amount;
    if (out[m.from]) out[m.from].adj -= m.amount;
  }
  return out;
}

export function sumBy(list, fn) {
  let s = 0;
  for (const x of list) s += fn(x);
  return s;
}

/** كل حسابات الشاشة الرئيسية لدورة واحدة */
export function computeCycle({ cats, snap, moves, expenses, cycle, today }) {
  const spent = {};
  const spentBeforeToday = {};
  const spentToday = {};
  for (const e of expenses) {
    spent[e.categoryId] = (spent[e.categoryId] || 0) + e.amount;
    if (e.date < today) spentBeforeToday[e.categoryId] = (spentBeforeToday[e.categoryId] || 0) + e.amount;
    else if (e.date === today) spentToday[e.categoryId] = (spentToday[e.categoryId] || 0) + e.amount;
  }
  const eff = effectiveBudgets(cats, snap, moves);

  const rows = cats
    .filter((c) => c.kind === 'expense' && (!c.archived || spent[c.id]))
    .map((c) => {
      const { base, carry, adj } = eff[c.id];
      const budget = base + carry + adj;
      const s = spent[c.id] || 0;
      const pct = budget > 0 ? s / budget : s > 0 ? Infinity : 0;
      return { ...c, base, carry, adj, budget, spent: s, left: budget - s, pct, level: levelOf(pct) };
    });

  const flex = rows.filter((r) => !r.fixed);
  const flexBudget = sumBy(flex, (r) => r.budget);
  const flexSpent = sumBy(flex, (r) => r.spent);
  const flexPct = flexBudget > 0 ? flexSpent / flexBudget : flexSpent > 0 ? Infinity : 0;

  // الأيام الباقية على القبض (النهارده محسوب ضمنها)
  const daysLeft = Math.max(1, daysBetween(today, cycle.next));

  // تقدر تصرف النهارده
  const daily = rows.filter((r) => r.daily);
  const dailyBudget = sumBy(daily, (r) => r.budget);
  const dailyBefore = sumBy(daily, (r) => spentBeforeToday[r.id] || 0);
  const dailyToday = sumBy(daily, (r) => spentToday[r.id] || 0);
  const perDay = Math.max(0, dailyBudget - dailyBefore) / daysLeft;
  const todayLeft = perDay - dailyToday;

  // تقسيم المعيشة أسبوعيًا (أسابيع من يوم القبض، والفاضل/الزيادة بيترحّل للأسبوع اللي بعده)
  let week = null;
  const w = rows.find((r) => r.weekly);
  if (w && today >= cycle.start && today <= cycle.end) {
    const idx = Math.floor(daysBetween(cycle.start, today) / 7);
    const weekStart = addDays(cycle.start, idx * 7);
    let weekEnd = addDays(weekStart, 6);
    if (weekEnd > cycle.end) weekEnd = cycle.end;
    const weekDays = daysBetween(weekStart, weekEnd) + 1;
    const allowedThroughWeek = (w.budget * (daysBetween(cycle.start, weekEnd) + 1)) / cycle.days;
    const spentInWeek = sumBy(expenses.filter((e) => e.categoryId === w.id && e.date >= weekStart && e.date <= weekEnd), (e) => e.amount);
    const left = allowedThroughWeek - w.spent;
    const allowance = (w.budget * weekDays) / cycle.days;
    const thisWeekBudget = left + spentInWeek; // اللي كان متاح للأسبوع ده (بعد ترحيل اللي قبله)
    const pct = thisWeekBudget > 0 ? spentInWeek / thisWeekBudget : spentInWeek > 0 ? Infinity : 0;
    week = { cat: w, index: idx + 1, start: weekStart, end: weekEnd, allowance, budget: thisWeekBudget, spent: spentInWeek, left, pct, level: levelOf(pct) };
  }

  return {
    rows,
    over: rows.filter((r) => r.pct > 1),
    flex: { budget: flexBudget, spent: flexSpent, left: flexBudget - flexSpent, pct: flexPct, level: levelOf(flexPct) },
    daysLeft,
    today: { perDay, spent: dailyToday, left: todayLeft },
    week,
  };
}

/** مقارنة مجموع البنود والصناديق بالمرتب */
export function allocationDiff(salary, cats) {
  const total = sumBy(cats.filter((c) => !c.archived), (c) => Number(c.budget) || 0);
  return { total, diff: salary - total };
}

/** اقتراح مصاريف سريعة من أكتر حاجات بتتسجل (نفس البند + نفس المبلغ + نفس الملاحظة) */
export function suggestPresets(expenses, presets, max = 4) {
  const have = new Set(presets.map((p) => `${p.categoryId}|${p.amount}`));
  const groups = new Map();
  for (const e of expenses) {
    const k = `${e.categoryId}|${e.amount}`;
    if (have.has(k)) continue;
    const g = groups.get(k) || { categoryId: e.categoryId, amount: e.amount, label: e.note || '', count: 0 };
    g.count++;
    if (e.note) g.label = e.note;
    groups.set(k, g);
  }
  return [...groups.values()].filter((g) => g.count >= 3).sort((a, b) => b.count - a.count).slice(0, max);
}
