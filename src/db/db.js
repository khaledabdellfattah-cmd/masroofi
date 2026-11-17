import Dexie from 'dexie';

/**
 * قاعدة البيانات على التليفون (IndexedDB).
 *
 * ⚠️ قاعدة مهمة: أي تغيير في شكل الجداول لازم يبقى db.version(N+1) جديد
 * مع upgrade() لو محتاجين ننقل بيانات قديمة. ماتعدّلش version(1) أبدًا بعد ما اتنشرت.
 *
 * الجداول:
 *  meta        { key, value }                 — 'profile' (المرتب، يوم القبض، الثيم...)
 *  categories  { id, name, icon, color, budget, kind:'expense'|'fund', order,
 *                fixed, daily, weekly, rollover, canCover, emergency, target, bigTarget, archived }
 *  expenses    { id, amount, categoryId, date:'YYYY-MM-DD', note, createdAt }
 *  cycles      { key, start, end, budgets:{catId:amount}, carry:{catId:amount} } — لقطة ميزانية كل دورة قبض
 *  moves       { id, cycleKey, from, to, amount, date } — نقل فلوس بين البنود لما بند يعدّي
 *  presets     { id, label, icon, amount, categoryId, order } — المصاريف السريعة
 */
export const db = new Dexie('masroofi');

db.version(1).stores({
  meta: 'key',
  categories: '++id, kind, order',
  expenses: '++id, date, categoryId, createdAt',
  cycles: 'key',
  moves: '++id, cycleKey',
  presets: '++id, order',
});

export async function getProfile() {
  const row = await db.meta.get('profile');
  return row ? row.value : null;
}

export async function setProfile(patch) {
  const cur = (await getProfile()) || {};
  const value = { ...cur, ...patch };
  await db.meta.put({ key: 'profile', value });
  return value;
}

/** نطلب من المتصفح مايمسحش البيانات لوحده (مهم على الآيفون) */
export async function requestPersistence() {
  try {
    if (navigator.storage?.persisted && !(await navigator.storage.persisted())) {
      await navigator.storage.persist();
    }
  } catch {
    /* مش مدعوم — عادي */
  }
}
