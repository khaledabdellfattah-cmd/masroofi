import { useEffect, useState } from 'preact/hooks';
import { useLive } from './hooks.js';
import { db, getProfile, setProfile, requestPersistence } from './db/db.js';
import { addExpense, coverOverspend, deleteExpense, ensureCycle, restoreExpense, savePreset, updateExpense } from './db/store.js';
import { todayISO } from './logic/dates.js';
import { fmt } from './logic/format.js';
import { toast } from './toast.js';
import { Toaster } from './components/ui.jsx';
import { AddExpense } from './components/AddExpense.jsx';
import { CoverSheet } from './components/CoverSheet.jsx';
import { Onboarding } from './screens/Onboarding.jsx';
import { Home } from './screens/Home.jsx';
import { History } from './screens/History.jsx';
import { Funds } from './screens/Funds.jsx';
import { Settings } from './screens/Settings.jsx';

const TABS = ['home', 'history', 'funds', 'settings'];
const THEMES = ['auto', 'light', 'dark'];

function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === 'light' || theme === 'dark') root.dataset.theme = theme;
  else delete root.dataset.theme;
  const dark = theme === 'dark' || (theme !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', dark ? '#0b1220' : '#0f766e');
}

export function App() {
  const profile = useLive(() => getProfile(), [], 'loading');
  const cats = useLive(() => db.categories.orderBy('order').toArray(), [], []);
  const [tab, setTabState] = useState(() => (TABS.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'home'));
  const [today, setToday] = useState(todayISO());
  const [sheet, setSheet] = useState(null); // null | { editing?: expense }
  const [cover, setCover] = useState(null);

  const setTab = (t) => {
    setTabState(t);
    history.replaceState(null, '', `#${t}`);
    window.scrollTo(0, 0);
  };

  // لما ترجع للتطبيق في يوم جديد، الحسابات تتحدث
  useEffect(() => {
    const refresh = () => document.visibilityState === 'visible' && setToday(todayISO());
    document.addEventListener('visibilitychange', refresh);
    const t = setInterval(refresh, 60_000);
    requestPersistence();
    return () => {
      document.removeEventListener('visibilitychange', refresh);
      clearInterval(t);
    };
  }, []);

  const onboarded = profile && profile !== 'loading' && profile.onboarded;
  useEffect(() => {
    if (onboarded) ensureCycle(today).catch((e) => console.error(e));
  }, [onboarded, profile?.payDay, today]);

  const theme = (profile && profile !== 'loading' && profile.theme) || 'auto';
  useEffect(() => applyTheme(theme), [theme]);

  if (profile === 'loading') return <div class="splash" />;
  if (!onboarded) return <Onboarding />;

  const catName = (id) => cats.find((c) => c.id === id)?.name || '';

  /** تسجيل مصروف + التحذيرات + تراجع */
  async function record(e) {
    const r = await addExpense(e);
    toast({
      text: `اتسجل ${fmt(e.amount)} ج في ${catName(e.categoryId)}`,
      tone: 'ok',
      action: { label: 'تراجع', fn: () => db.expenses.delete(r.id) },
    });
    if (r.over) setCover(r);
    else if (r.warn80) toast({ text: `⚠️ ${r.cat.name} وصل ${Math.round(r.cat.pct * 100)}% من ميزانيته`, tone: 'warn', ms: 6000 });
  }

  async function onSave(data) {
    const editing = sheet?.editing;
    setSheet(null);
    if (editing) {
      await updateExpense(editing.id, data);
      toast({ text: 'اتعدّل ✓', tone: 'ok' });
    } else await record(data);
  }

  async function onDelete(exp) {
    setSheet(null);
    const rec = await deleteExpense(exp.id);
    toast({ text: `اتحذف ${fmt(rec.amount)} ج`, action: { label: 'تراجع', fn: () => restoreExpense(rec) }, ms: 7000 });
  }

  return (
    <div class="app">
      <main>
        {tab === 'home' && (
          <Home
            today={today}
            theme={theme}
            onThemeToggle={() => setProfile({ theme: THEMES[(THEMES.indexOf(theme) + 1) % 3] })}
            onQuick={(p) => record({ amount: p.amount, categoryId: p.categoryId, note: p.label, date: todayISO() })}
            onSavePreset={async (p) => {
              await savePreset(p);
              toast({ text: `"${p.label}" بقى مصروف سريع ⚡`, tone: 'ok' });
            }}
          />
        )}
        {tab === 'history' && <History today={today} profile={profile} onEdit={(e) => setSheet({ editing: e })} />}
        {tab === 'funds' && <Funds />}
        {tab === 'settings' && <Settings profile={profile} />}
      </main>

      <nav class="nav" aria-label="التنقل">
        <NavBtn id="home" icon="🏠" label="الرئيسية" tab={tab} setTab={setTab} />
        <NavBtn id="history" icon="📋" label="السجل" tab={tab} setTab={setTab} />
        <div class="fab-slot">
          <button class="fab" aria-label="إضافة مصروف" onClick={() => setSheet({})} data-testid="fab">
            +
          </button>
        </div>
        <NavBtn id="funds" icon="🐷" label="الصناديق" tab={tab} setTab={setTab} />
        <NavBtn id="settings" icon="⚙️" label="الإعدادات" tab={tab} setTab={setTab} />
      </nav>

      <AddExpense open={!!sheet} editing={sheet?.editing} cats={cats} onClose={() => setSheet(null)} onSave={onSave} onDelete={onDelete} />
      <CoverSheet
        data={cover}
        onClose={() => setCover(null)}
        onPick={async (from, amount) => {
          await coverOverspend({ cycleKey: cover.cycleKey, from: from.id, to: cover.cat.id, amount });
          toast({ text: `اتنقل ${fmt(amount)} ج من ${from.name} لـ${cover.cat.name}`, tone: 'ok' });
          setCover(null);
        }}
      />
      <Toaster />
    </div>
  );
}

function NavBtn({ id, icon, label, tab, setTab }) {
  return (
    <button class={`nav-btn ${tab === id ? 'on' : ''}`} onClick={() => setTab(id)} aria-current={tab === id ? 'page' : undefined}>
      <span class="nav-ico">{icon}</span>
      <span>{label}</span>
    </button>
  );
}
