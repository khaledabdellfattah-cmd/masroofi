import { Sheet, Money } from './ui.jsx';

/** لما بند يعدّي حده: "آخد الفرق منين؟" — بيقترح بس البنود اللي canCover (الخروجات واللبس) */
export function CoverSheet({ data, onPick, onClose }) {
  if (!data) return null;
  const { cat, over, coverOptions } = data;
  return (
    <Sheet open onClose={onClose} title={`عدّيت حد ${cat.name}`}>
      <p class="over-note">
        زيادة <Money v={over} class="bad" /> عن الميزانية. تاخد الفرق منين؟
      </p>
      <div class="stack">
        {coverOptions.length === 0 && <p class="muted">مفيش فلوس فاضلة في الخروجات أو اللبس الشهر ده.</p>}
        {coverOptions.map((r) => {
          const take = Math.min(over, r.left);
          return (
            <button key={r.id} class="btn btn-option" onClick={() => onPick(r, take)}>
              <span>
                {r.icon} من {r.name}
              </span>
              <span class="muted small">
                هياخد <Money v={take} /> · فاضل فيه <Money v={r.left} />
              </span>
            </button>
          );
        })}
        <button class="btn" onClick={onClose}>
          سيبها كده
        </button>
      </div>
    </Sheet>
  );
}
