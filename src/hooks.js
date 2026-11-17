import { useEffect, useState } from 'preact/hooks';
import { liveQuery } from 'dexie';

/** بيقرا من قاعدة البيانات ويحدّث الشاشة لوحده لما البيانات تتغير */
export function useLive(fn, deps = [], initial = undefined) {
  const [value, setValue] = useState(initial);
  useEffect(() => {
    const sub = liveQuery(fn).subscribe({
      next: setValue,
      error: (e) => console.error('[db]', e),
    });
    return () => sub.unsubscribe();
  }, deps);
  return value;
}
