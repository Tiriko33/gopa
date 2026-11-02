import { GopaBear } from "../components/GopaBear";
import { BearSays } from "../components/SpeechBubble";
import { formatAmount } from "../lib/format";
import { clearDone, groupByRecipe, openCount, toggle, totalAmount, useShoppingList } from "../lib/shopping";

export function Einkauf() {
  const { list, update } = useShoppingList();
  const offen = openCount(list);
  const erledigte = list.length - offen;

  return (
    <>
      <header className="page-head">
        <GopaBear size={72} label="Gopa mit Einkaufsliste" />
        <div className="head-text">
          <h1>Einkaufsliste</h1>
          <span className="sub">{offen === 0 ? "Der Korb ist leer" : `Noch ${offen} ${offen === 1 ? "Ding" : "Dinge"} im Korb`}</span>
        </div>
      </header>

      {list.length === 0 ? (
        <div className="list">
          <BearSays role="status">Der Korb ist leer. Öffne ein Rezept und tippe auf „Zur Einkaufsliste“.</BearSays>
        </div>
      ) : (
        <>
          <div className="clear-row">
            <button className="clear-btn" disabled={erledigte === 0} onClick={() => update(clearDone)}>Erledigte löschen</button>
          </div>
          <main className="list">
            {groupByRecipe(list).map((g) => (
              <section key={g.titel} aria-label={g.titel}>
                <h2 className="shop-group">{g.titel}</h2>
                <ul className="shop-card">
                  {g.items.map((e, i) => (
                    <li key={e.key} style={{ "--i": i } as React.CSSProperties}>
                      <label className={e.erledigt ? "shop-row done" : "shop-row"}>
                        <input type="checkbox" checked={e.erledigt} onChange={() => update((l) => toggle(l, e.key))} />
                        <span className="box" aria-hidden="true">
                          {e.erledigt && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3B2412" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-10" /></svg>}
                        </span>
                        <span className="shop-name">{e.name}</span>
                        <span className="shop-amount">{formatAmount(totalAmount(e), e.einheit)}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </main>
        </>
      )}
    </>
  );
}
