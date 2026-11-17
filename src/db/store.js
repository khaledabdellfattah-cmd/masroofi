import { db, getProfile, setProfile } from './db.js';
import { DEFAULT_PRESETS } from './defaults.js';
import { addDays, cycleFor, todayISO } from '../logic/dates.js';
import { computeCycle, effectiveBudgets, sumBy, WARN_AT } from '../logic/budget.js';
import { round2 } from '../logic/format.js';

const CAT_FIELDS = ['name', 'icon', 'color', 'budget', 'kind', 'fixed', 'daily', 'weekly', 'rollover', 'canCover', 'emergency', 'target', 'bigTarget', 'hint', 'archived'];
const cleanCat = (c) => Object.fromEntries(CAT_FIELDS.filter((k) => c[k] !== undefined).map((k) => [k, c[k]]));

/* ---------------- الإعداد الأول ---------------- */
export async function finishOnboarding({ salary, payDay, cats }) {
  const today = todayISO();
  await db.transaction('rw', db.meta, db.categories, db.presets, async () => {
    await db.categories.clear();
    await db.presets.clear();
    const ids = {};
    for (let i = 0; i < cats.length; i++) {
      ids[cats[i].name] = await db.categories.add({ ...cleanCat(cats[i]), budget: Number(cats[i].budget) || 0, order: i });
    }
    const living = ids['معيشتي'] ?? (await db.categories.where('kind').equals('expense').first())?.id;
    let o = 0;
    for (const p of DEFAULT_PRESETS) {
      const categoryId = ids[p.category] ?? living;
      if (categoryId) await db.presets.add({ label: p.label, icon: p.icon, amount: p.amount, categoryId, order: o++ });
    }
    await setProfile({ salary, payDay, onboarded: true, theme: 'auto', createdAt: today, firstCycle: cycleFor(today, payDay).key, schema: 1 });
  });
  await ensureCycle(today);
}

/* ---------------- لقطة ميزانية الدورة ---------------- */
/** بيتأكد إن الدورة الحالية ليها لقطة ميزانية (ولو فيه دورات اتفوّتت بيعملها كمان) */
export async function ensureCycle(today = todayISO()) {
  const p = await getProfile();
  if (!p?.onboarded) return null;
  const cyc = cycleFor(today, p.payDay);
  await buildSnapshot(cyc, p, 0);
  return cyc;
}

async function buildSnapshot(cyc, p, depth) {
  const existing = await db.cycles.get(cyc.key);
  if (existing) return existing;
  const cats = await db.categories.toArray();
  let prevSnap = null;
  let prevCyc = null;
  if (depth < 24 && p.firstCycle && cyc.key > p.firstCycle) {
    prevCyc = cycleFor(addDays(cyc.start, -1), p.payDay);
    prevSnap = await buildSnapshot(prevCyc, p, depth + 1);
  }
  const budgets = {};
  const carry = {};
  for (const c of cats) if (!c.archived) budgets[c.id] = c.budget;
  if (prevSnap) {
    const moves = await db.moves.where('cycleKey').equals(prevCyc.key).toArray();
    const eff = effectiveBudgets(cats, prevSnap, moves);
    const exp = await db.expenses.where('date').between(prevCyc.start, prevCyc.end, true, true).toArray();
    for (const c of cats) {
      if (!c.rollover || c.archived) continue;
      const e = eff[c.id];
      const prevBudget = e.base + e.carry + e.adj;
      const prevSpent = sumBy(exp.filter((x) => x.categoryId === c.id), (x) => x.amount);
      carry[c.id] = Math.max(0, round2(prevBudget - prevSpent));
    }
  }
  const snap = { key: cyc.key, start: cyc.start, end: cyc.end, budgets, carry };
  await db.cycles.put(snap);
  return snap;
}

/* ---------------- قراءة حالة الدورة ---------------- */
export async function loadState(today = todayISO()) {
  const profile = await getProfile();
  if (!profile?.onboarded) return null;
  const cycle = cycleFor(today, profile.payDay);
  const cats = await db.categories.orderBy('order').toArray();
  const snap = await db.cycles.get(cycle.key);
  const moves = await db.moves.where('cycleKey').equals(cycle.key).toArray();
  const expenses = await db.expenses.where('date').between(cycle.start, cycle.end, true, true).toArray();
  return { profile, cycle, cats, ...computeCycle({ cats, snap, moves, expenses, cycle, today }) };
}

/* ---------------- المصاريف ---------------- */
/**
 * بيسجل مصروف ويرجّع التحذيرات:
 *  warn80  البند وصل 80% لأول مرة
 *  over    البند عدّى حده → لازم نسأل "آخد الفرق منين"
 */
export async function addExpense({ amount, categoryId, date, note }) {
  const today = todayISO();
  const before = await loadState(today);
  const rec = { amount: round2(amount), categoryId, date: date || today, note: (note || '').trim(), createdAt: Date.now() };
  const id = await db.expenses.add(rec);
  const result = { id, record: { ...rec, id } };
  if (!before || rec.date < before.cycle.start || rec.date > before.cycle.end) return result;
  const after = await loadState(today);
  const b = before.rows.find((r) => r.id === categoryId);
  const a = after.rows.find((r) => r.id === categoryId);
  if (!a) return result;
  result.cat = a;
  result.cycleKey = after.cycle.key;
  if (a.pct > 1) {
    result.over = round2(Math.min(rec.amount, a.spent - a.budget));
    result.coverOptions = after.rows.filter((r) => r.canCover && !r.fixed && r.id !== a.id && r.left > 0);
  } else if (a.pct >= WARN_AT && (!b || b.pct < WARN_AT)) {
    result.warn80 = true;
  }
  return result;
}

export async function updateExpense(id, patch) {
  const p = { ...patch };
  if (p.amount !== undefined) p.amount = round2(p.amount);
  if (p.note !== undefined) p.note = p.note.trim();
  await db.expenses.update(id, p);
}

export async function deleteExpense(id) {
  const rec = await db.expenses.get(id);
  await db.expenses.delete(id);
  return rec;
}

export const restoreExpense = (rec) => db.expenses.put(rec);

/** نقل فلوس من بند لبند جوه نفس الدورة (لما بند يعدّي حده) */
export async function coverOverspend({ cycleKey, from, to, amount }) {
  return db.moves.add({ cycleKey, from, to, amount: round2(amount), date: todayISO() });
}

/* ---------------- البنود ---------------- */
async function syncCurrentSnapshot(cat) {
  const p = await getProfile();
  if (!p?.onboarded) return;
  const cyc = cycleFor(todayISO(), p.payDay);
  const snap = await db.cycles.get(cyc.key);
  if (!snap) return;
  if (cat.archived) delete snap.budgets[cat.id];
  else snap.budgets[cat.id] = Number(cat.budget) || 0;
  await db.cycles.put(snap);
}

export async function saveCategory(cat) {
  const data = { ...cleanCat(cat), budget: Number(cat.budget) || 0 };
  let id = cat.id;
  if (id) await db.categories.update(id, data);
  else {
    const last = await db.categories.orderBy('order').last();
    id = await db.categories.add({ ...data, order: (last?.order ?? -1) + 1 });
  }
  await syncCurrentSnapshot({ ...data, id });
  return id;
}

/** الحذف = أرشفة، علشان المصاريف القديمة تفضل سليمة */
export async function archiveCategory(id) {
  await db.categories.update(id, { archived: true });
  await syncCurrentSnapshot({ id, archived: true });
  await db.presets.filter((p) => p.categoryId === id).delete();
}

/* ---------------- المصاريف السريعة ---------------- */
export async function savePreset(p) {
  const data = { label: p.label.trim(), icon: p.icon || '⚡', amount: round2(p.amount), categoryId: p.categoryId };
  if (p.id) return db.presets.update(p.id, data);
  const last = await db.presets.orderBy('order').last();
  return db.presets.add({ ...data, order: (last?.order ?? -1) + 1 });
}
export const deletePreset = (id) => db.presets.delete(id);

/* ---------------- مسح كل حاجة ---------------- */
export async function wipeEverything() {
  await db.delete();
  location.reload();
}
