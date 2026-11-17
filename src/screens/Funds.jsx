import { useLive } from '../hooks.js';
import { db } from '../db/db.js';
import { Money } from '../components/ui.jsx';

/** المرحلة 1: عرض الصناديق والإيداع الشهري بس. الرصيد والإيداع والسحب في المرحلة 2. */
export function Funds() {
  const funds = useLive(() => db.categories.where('kind').equals('fund').filter((c) => !c.archived).toArray(), [], []);
  return (
    <div>
      <h1 class="page-title">الصناديق</h1>
      <div class="stack">
        {funds.map((f) => (
          <div key={f.id} class="card fund-card">
            <div class="cat-top">
              <span class="badge" style={{ background: f.color }}>
                {f.icon}
              </span>
              <span class="nm">{f.name}</span>
            </div>
            <div class="muted small">
              إيداع شهري <Money v={f.budget} />
              {f.target ? (
                <>
                  {' '}
                  · الهدف <Money v={f.target} />
                </>
              ) : null}
              {f.bigTarget ? (
                <>
                  {' '}
                  · الهدف الكبير <Money v={f.bigTarget} />
                </>
              ) : null}
            </div>
          </div>
        ))}
      </div>
      <p class="muted small note">الرصيد والإيداع والسحب ويوم القبض جايين في المرحلة 2.</p>
    </div>
  );
}
