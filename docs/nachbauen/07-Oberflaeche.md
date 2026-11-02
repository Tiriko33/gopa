# Kapitel 7: Oberfläche, Teil 1: Design, Bär, Navigation, Sammlung

**Ziel:** Gopa sieht aus wie im Design: Bär, Farben, Schriften, untere Navigation, Rezeptsammlung mit Suche und Filter, Anmeldung, Einkaufsliste. Rezept-Seiten kommen im nächsten Kapitel.

## 7.1 Das Design-System (CSS)

Das Design ist **verbindlich** (Ordner `docs/design`, Farben in `docs/design/tokens.css`). In `styles.css` stehen oben die **Design-Tokens** als CSS-Variablen: `--gopa-blau`, `--honig`, `--creme` usw. Überall sonst benutzt das CSS nur diese Namen, nie Farbcodes. Willst du später die Farbe ändern, änderst du **eine** Zeile.

Die CSS-Dateien sind lang und enthalten kaum Logik. Tippe sie ab, **oder** kopiere sie und lies sie dabei. Wichtig zum Verstehen:
- `.shell` begrenzt die App auf 480 px Breite und zentriert sie (am Handy volle Breite, am PC schmal in der Mitte).
- **Zielgrößen:** Jede Schaltfläche ist mindestens **44 px** hoch (Daumen-Bedienung, Barrierefreiheit).
- `:focus-visible` zeichnet einen gelben Ring, wenn man mit Tastatur navigiert.
- `100dvh` statt `100vh`: auf dem Handy ist die sichtbare Höhe wegen der Adressleiste kleiner.
- Die Farbpaare stammen aus dem Design, das auf Kontrast ausgelegt ist (Ziel: 4,5:1, der Standard der Barrierefreiheit). Nachgemessen habe ich das nicht. Prüfe es bei Zweifel mit einem Kontrast-Rechner (Suche: "WebAIM Contrast Checker").

`frontend/src/styles.css` (Grundlayout, Sammlung, Rezeptansicht):

```css
:root {
  --himmelblau: #E6F0FF; --himmelblau-rahmen: #C4D9F7; --gopa-blau: #1B63CC; --blau-badge: #DCE9FD;
  --blau-text: #12448F; --marine: #0B2A4A; --gedaempft: #3F5A7D; --honig: #F6B74A; --honig-text: #3B2412;
  --creme: #FFF8EC; --creme-rahmen: #F0DDB8; --creme-linie: #EBD3A6; --creme-text: #5A3A22;
  --font-heading: "Baloo 2", "Nunito", sans-serif; --font-body: "Nunito", system-ui, sans-serif;
}
* { box-sizing: border-box; }
html, body { margin: 0; background: var(--himmelblau); color: var(--marine); font-family: var(--font-body); }
a { color: inherit; text-decoration: none; }
button, select, input { font-family: inherit; }
h1, h2, h3, p { margin: 0; }
:focus-visible { outline: 3px solid var(--honig); outline-offset: 2px; }

.shell { position: relative; max-width: 480px; min-height: 100dvh; margin: 0 auto; overflow: hidden; background: var(--himmelblau); }
.shell-body { position: relative; min-height: 100dvh; display: flex; flex-direction: column; }
.shell-body.with-nav { padding-bottom: 100px; }
.page-pad { padding: 28px 20px; }
.loading { font-weight: 700; color: var(--gedaempft); }

/* Sammlung */
.page-head { padding: 28px 20px 8px; display: flex; align-items: center; gap: 12px; }
.head-text { flex: 1; display: flex; flex-direction: column; gap: 2px; }
.head-text h1 { font-family: var(--font-heading); font-size: 30px; font-weight: 800; line-height: 1.05; color: var(--gopa-blau); }
.sub { font-size: 14px; font-weight: 700; color: #7A4A28; }
.search-wrap { padding: 8px 20px 10px; }
.search { display: flex; align-items: center; gap: 10px; height: 50px; padding: 0 18px; background: #fff; border: 2px solid var(--himmelblau-rahmen); border-radius: 999px; }
.search input { flex: 1; min-width: 0; border: 0; outline: 0; background: transparent; font-size: 15px; font-weight: 600; color: var(--marine); }
.search:focus-within { border-color: var(--gopa-blau); }
.chips { display: flex; gap: 8px; padding: 4px 20px 14px; flex-wrap: wrap; }
.chip { height: 44px; padding: 0 16px; border-radius: 999px; font-size: 14px; font-weight: 800; cursor: pointer; background: var(--creme); color: var(--creme-text); border: 2px solid var(--creme-rahmen); }
.chip.active { background: var(--gopa-blau); color: #fff; border-color: var(--gopa-blau); }
.list { padding: 0 20px; display: flex; flex-direction: column; gap: 12px; }
.card { background: var(--creme); border: 2px solid var(--creme-rahmen); border-radius: 24px; }
.recipe-card { display: flex; gap: 14px; align-items: center; padding: 10px; min-height: 44px; }
.thumb { width: 84px; height: 84px; flex: none; border-radius: 18px; background: #FBE3B4; display: flex; align-items: center; justify-content: center; }
.card-text { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.card-title { font-family: var(--font-heading); font-size: 19px; font-weight: 700; line-height: 1.15; overflow-wrap: anywhere; }
.card-meta { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 700; color: var(--gedaempft); }
.badge { padding: 3px 10px; border-radius: 999px; background: var(--blau-badge); color: var(--blau-text); }
.card-source { display: flex; align-items: center; gap: 6px; font-size: 12.5px; font-weight: 800; color: var(--gopa-blau); }

/* Bär mit Sprechblase */
.bear-says { display: flex; flex-direction: column; align-items: center; gap: 0; padding: 12px 0; }
.bubble { position: relative; max-width: 320px; padding: 16px 18px; background: var(--creme); border: 2px solid var(--creme-rahmen); border-radius: 22px; font-size: 16px; font-weight: 700; line-height: 1.4; color: var(--creme-text); text-align: center; margin-bottom: 14px; }
.bubble::after { content: ""; position: absolute; left: 50%; bottom: -10px; width: 16px; height: 16px; margin-left: -8px; background: var(--creme); border-right: 2px solid var(--creme-rahmen); border-bottom: 2px solid var(--creme-rahmen); transform: rotate(45deg); }
.bear-actions { display: flex; gap: 10px; margin-top: 16px; flex-wrap: wrap; justify-content: center; }

/* Buttons */
.btn { min-height: 54px; padding: 0 22px; border-radius: 999px; font-size: 15px; font-weight: 800; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; border: 2px solid transparent; }
.btn-primary { background: var(--honig); color: var(--honig-text); }
.btn-secondary { background: transparent; border-color: var(--gopa-blau); color: var(--gopa-blau); }

/* Untere Leiste */
.bottom-nav { position: fixed; left: 50%; transform: translateX(-50%); bottom: 0; width: 100%; max-width: 480px; height: 78px; background: var(--creme); border-top: 2px solid var(--creme-rahmen); border-radius: 28px 28px 0 0; display: flex; align-items: center; justify-content: space-around; padding: 0 24px; }
.nav-item { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; min-width: 64px; min-height: 48px; color: var(--gedaempft); font-size: 12px; font-weight: 800; }
.nav-item.active { color: var(--gopa-blau); }
.nav-plus { width: 62px; height: 62px; margin-top: -34px; border-radius: 50%; background: var(--honig); display: flex; align-items: center; justify-content: center; border: 4px solid var(--himmelblau); }

/* Rezeptansicht */
.hero { background: var(--gopa-blau); border-radius: 0 0 36px 36px; padding: 28px 20px 24px; display: flex; flex-direction: column; gap: 16px; }
.hero-top { display: flex; align-items: center; justify-content: space-between; }
.round-btn { width: 44px; height: 44px; border-radius: 50%; background: var(--creme); border: 0; display: flex; align-items: center; justify-content: center; cursor: pointer; }
.hero-row { display: flex; align-items: flex-end; gap: 8px; }
.hero-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 12px; }
.hero h1 { font-family: var(--font-heading); font-size: 32px; font-weight: 800; line-height: 1.05; color: #fff; overflow-wrap: anywhere; }
.hero-meta { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.hero-time { font-size: 14px; font-weight: 800; color: #fff; }
.cat-select { position: relative; height: 44px; padding: 0 12px 0 16px; border-radius: 999px; background: var(--creme); color: var(--blau-text); font-size: 14px; font-weight: 800; display: inline-flex; align-items: center; gap: 6px; }
.cat-select select { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer; font-size: 16px; }
.cat-select:focus-within { outline: 3px solid var(--honig); outline-offset: 2px; }
.source-card { margin: 16px 20px 0; padding: 12px 16px; background: var(--creme); border: 2px solid var(--creme-rahmen); border-radius: 22px; display: flex; align-items: center; gap: 12px; }
.source-icon { width: 44px; height: 44px; flex: none; border-radius: 14px; background: var(--honig); display: flex; align-items: center; justify-content: center; }
.source-text { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1; font-size: 12.5px; font-weight: 700; color: var(--creme-text); }
.source-text a { font-size: 15px; font-weight: 800; color: var(--gopa-blau); min-height: 24px; display: flex; align-items: center; }
.recipe-body { padding: 16px 20px 24px; display: flex; flex-direction: column; gap: 10px; flex: 1; }
.desc { font-size: 15px; font-weight: 600; line-height: 1.45; color: var(--gedaempft); }
.section-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.section-head h2, .steps-title { font-family: var(--font-heading); font-size: 22px; font-weight: 800; }
.steps-title { margin-top: 14px; }
.stepper { display: flex; align-items: center; gap: 8px; background: var(--creme); border: 2px solid var(--creme-rahmen); border-radius: 999px; padding: 2px; }
.stepper button { width: 40px; height: 40px; min-width: 44px; min-height: 44px; border-radius: 50%; border: 0; font-size: 22px; font-weight: 800; cursor: pointer; }
.stepper button:disabled { opacity: 0.4; cursor: default; }
.step-minus { background: var(--blau-badge); color: var(--blau-text); }
.step-plus { background: var(--gopa-blau); color: #fff; }
.stepper span { font-size: 14px; font-weight: 800; min-width: 76px; text-align: center; }
.group-title { font-family: var(--font-heading); font-size: 17px; font-weight: 700; color: var(--creme-text); margin: 6px 0 6px 4px; }
.ingredients { list-style: none; margin: 0; padding: 2px 16px; background: var(--creme); border: 2px solid var(--creme-rahmen); border-radius: 22px; }
.ingredients li { display: flex; justify-content: space-between; gap: 12px; padding: 10px 0; border-bottom: 1.5px dashed var(--creme-linie); font-size: 15px; }
.ingredients li:last-child { border-bottom: 0; }
.ing-name { font-weight: 700; }
.ing-amount { font-weight: 800; color: var(--blau-text); white-space: nowrap; }
.note { font-size: 13px; font-weight: 700; color: var(--gedaempft); line-height: 1.4; }
.steps { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
.steps li { display: flex; gap: 12px; padding: 12px 14px; background: var(--creme); border: 2px solid var(--creme-rahmen); border-radius: 22px; font-size: 15px; font-weight: 600; line-height: 1.45; }
.step-nr { flex: none; width: 28px; height: 28px; border-radius: 50%; background: var(--gopa-blau); color: #fff; font-family: var(--font-heading); font-weight: 800; display: flex; align-items: center; justify-content: center; }
.step-timer { font-style: normal; font-weight: 800; color: var(--blau-text); }
.hinweise { padding: 12px 16px; border: 2px dashed var(--himmelblau-rahmen); border-radius: 22px; font-size: 14px; font-weight: 600; color: var(--gedaempft); }
.hinweise h3 { font-family: var(--font-heading); font-size: 16px; color: var(--marine); }
.hinweise ul { margin: 6px 0 0; padding-left: 18px; }
.action-bar { position: sticky; bottom: 0; padding: 12px 20px 20px; background: var(--creme); border-top: 2px solid var(--creme-rahmen); display: flex; gap: 10px; }
.action-bar .btn { flex: 1; padding: 0 8px; }

@media (prefers-reduced-motion: no-preference) { .chip, .btn { transition: background 0.15s; } }
```

`frontend/src/styles-m4.css` (Neues Rezept, Einkaufsliste, Kochmodus, Bearbeiten):

```css
/* Neues Rezept */
.neu-head { padding: 28px 20px 0; display: flex; align-items: center; gap: 12px; }
.neu-head h1 { font-family: var(--font-heading); font-size: 28px; font-weight: 800; color: var(--gopa-blau); }
.round-btn.bordered { border: 2px solid var(--creme-rahmen); }
.neu-bear { padding: 16px 20px 0; display: flex; align-items: center; gap: 12px; }
.bubble-left { flex: 1; padding: 12px 14px; background: #fff; border: 2px solid var(--himmelblau-rahmen); border-radius: 20px 20px 20px 6px; font-size: 14px; font-weight: 700; line-height: 1.4; }
.neu-form { padding: 18px 20px 20px; display: flex; flex-direction: column; gap: 10px; flex: 1; }
.field-label { font-size: 14px; font-weight: 800; color: #1F3B5E; }
.link-row { display: flex; gap: 8px; }
.link-row input, .text-in { flex: 1; min-width: 0; height: 52px; padding: 0 18px; background: #fff; border: 2px solid var(--himmelblau-rahmen); border-radius: 999px; font-size: 16px; font-weight: 600; color: var(--marine); }
.link-row input:focus, .text-in:focus { outline: 0; border-color: var(--gopa-blau); }
.paste-btn { height: 52px; min-width: 44px; padding: 0 18px; border-radius: 999px; border: 2px solid var(--gopa-blau); background: #fff; color: var(--gopa-blau); font-size: 14px; font-weight: 800; cursor: pointer; }
.tip { font-size: 13px; font-weight: 700; line-height: 1.45; color: var(--gedaempft); }
.chips.tight { padding: 0; }
.chip:disabled, .paste-btn:disabled, .btn:disabled, .btn-text:disabled { opacity: 0.5; cursor: default; }
.fallback { display: flex; flex-direction: column; gap: 8px; padding: 14px; border: 2px dashed var(--himmelblau-rahmen); border-radius: 22px; }
.fallback textarea { border: 2px solid var(--himmelblau-rahmen); border-radius: 18px; padding: 12px; font-size: 16px; font-weight: 600; font-family: inherit; color: var(--marine); }
.fallback input[type=file] { font-size: 14px; min-height: 44px; }
.progress-card { padding: 16px; background: var(--creme); border: 2px solid var(--creme-rahmen); border-radius: 24px; display: flex; flex-direction: column; gap: 14px; }
.progress-title { font-family: var(--font-heading); font-size: 18px; font-weight: 800; }
.progress-step { display: flex; align-items: center; gap: 12px; font-size: 15px; }
.dot { width: 28px; height: 28px; flex: none; border-radius: 50%; border: 2px solid #D9C196; background: #fff; display: flex; align-items: center; justify-content: center; }
.dot.done { background: var(--gopa-blau); border-color: var(--gopa-blau); }
.dot.active { border: 3px solid var(--honig); background: #FDEBC8; }
.step-active { font-weight: 800; color: var(--blau-text); }
.step-done { font-weight: 700; }
.step-todo { font-weight: 700; color: var(--creme-text); }
.bar { height: 10px; border-radius: 999px; background: #F3E3C1; overflow: hidden; }
.bar div { height: 100%; background: var(--honig); border-radius: 999px; transition: width 0.4s; }
.neu-actions { margin-top: auto; display: flex; flex-direction: column; gap: 6px; padding-top: 8px; }
.btn.big { height: 54px; font-size: 16px; }
.btn-text { min-height: 46px; border: 0; background: transparent; color: var(--gopa-blau); font-size: 14px; font-weight: 800; cursor: pointer; }
.btn-text.left { text-align: left; align-self: flex-start; }
.btn-text.danger { color: #B3261E; }

/* Einkaufsliste */
.clear-row { padding: 4px 20px 10px; display: flex; justify-content: flex-end; }
.clear-btn { height: 44px; padding: 0 16px; border-radius: 999px; border: 2px solid var(--himmelblau-rahmen); background: #fff; color: var(--gopa-blau); font-size: 13px; font-weight: 800; cursor: pointer; }
.clear-btn:disabled { opacity: 0.5; cursor: default; }
.shop-group { font-family: var(--font-heading); font-size: 17px; font-weight: 700; color: var(--creme-text); margin: 4px 0 8px; }
.shop-card { list-style: none; margin: 0; padding: 2px 16px; background: var(--creme); border: 2px solid var(--creme-rahmen); border-radius: 22px; }
.shop-card li { border-bottom: 1.5px dashed var(--creme-linie); }
.shop-card li:last-child { border-bottom: 0; }
.shop-row { position: relative; display: flex; align-items: center; gap: 14px; min-height: 52px; cursor: pointer; }
.shop-row input { position: absolute; opacity: 0; width: 44px; height: 44px; left: -8px; margin: 0; cursor: pointer; }
.box { width: 28px; height: 28px; flex: none; border-radius: 10px; border: 2px solid #C9A56B; background: #fff; display: flex; align-items: center; justify-content: center; }
.shop-row.done .box { background: var(--honig); border-color: var(--honig); }
.shop-row input:focus-visible + .box { outline: 3px solid var(--honig); outline-offset: 2px; }
.shop-name { flex: 1; font-size: 15px; font-weight: 700; }
.shop-amount { font-size: 15px; font-weight: 800; color: var(--blau-text); white-space: nowrap; }
.shop-row.done .shop-name, .shop-row.done .shop-amount { color: #6B5A45; }
.shop-row.done .shop-name { text-decoration: line-through; }
.list section + section { margin-top: 6px; }

/* Kochmodus */
.cook { position: relative; max-width: 480px; min-height: 100dvh; margin: 0 auto; overflow: hidden; background: #0F2E63; color: #fff; display: flex; flex-direction: column; }
.cook-pad { padding: 28px 20px; }
.cook-top { padding: 28px 20px 0; display: flex; align-items: center; justify-content: space-between; position: relative; }
.cook-round { width: 44px; height: 44px; border-radius: 50%; background: #1B4585; display: flex; align-items: center; justify-content: center; }
.cook-title { font-family: var(--font-heading); font-size: 18px; font-weight: 700; color: #CFE0FA; text-align: center; padding: 0 8px; }
.cook-progress { padding: 20px 20px 0; display: flex; flex-direction: column; gap: 10px; position: relative; font-size: 14px; font-weight: 800; color: #CFE0FA; }
.segments { display: flex; gap: 6px; }
.seg { flex: 1; height: 8px; border-radius: 999px; background: #2A5AA3; }
.seg.on { background: var(--honig); }
.cook-main { flex: 1; padding: 0 24px; display: flex; flex-direction: column; justify-content: center; gap: 24px; position: relative; }
.cook-text { font-family: var(--font-heading); font-size: 32px; font-weight: 700; line-height: 1.25; overflow-wrap: anywhere; }
.timer-pill { align-self: flex-start; display: flex; align-items: center; gap: 14px; padding: 12px 20px 12px 14px; background: #1B4585; border: 0; border-radius: 999px; color: #fff; cursor: pointer; text-align: left; }
.timer-icon { width: 46px; height: 46px; border-radius: 50%; background: var(--honig); display: flex; align-items: center; justify-content: center; }
.timer-text { display: flex; flex-direction: column; gap: 2px; }
.timer-text b { font-family: var(--font-heading); font-size: 28px; font-weight: 800; line-height: 1; }
.timer-text small { font-size: 13px; font-weight: 700; color: #CFE0FA; }
.cook-bear { padding: 0 20px 6px; display: flex; align-items: flex-end; gap: 10px; position: relative; min-height: 98px; }
.cook-bubble { flex: 1; margin-bottom: 16px; padding: 12px 14px; background: var(--creme); color: var(--marine); border-radius: 20px 20px 20px 6px; font-size: 14px; font-weight: 700; line-height: 1.4; }
.cook-nav { padding: 8px 20px 24px; display: flex; gap: 12px; position: relative; }
.cook-back { width: 76px; height: 64px; border: 0; border-radius: 999px; background: #1B4585; display: flex; align-items: center; justify-content: center; cursor: pointer; }
.cook-back:disabled { opacity: 0.4; cursor: default; }
.cook-next { flex: 1; height: 64px; border: 0; border-radius: 999px; background: var(--honig); color: var(--honig-text); font-size: 19px; font-weight: 800; display: flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer; }

/* Bearbeiten */
.edit { padding-bottom: 24px; display: flex; flex-direction: column; gap: 8px; }
.edit > :not(.neu-head) { margin-left: 20px; margin-right: 20px; }
.edit .neu-head { margin-bottom: 8px; }
.text-in.area { height: auto; padding: 12px 16px; border-radius: 20px; font-family: inherit; resize: vertical; }
.text-in.sm { flex: 0 0 76px; padding: 0 10px; height: 48px; border-radius: 16px; }
.text-in.grow { flex: 1; height: 48px; border-radius: 16px; }
.grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.edit-h { font-family: var(--font-heading); font-size: 22px; font-weight: 800; margin-top: 10px; }
.ing-edit { display: flex; gap: 6px; align-items: center; }
.icon-del { width: 44px; height: 44px; flex: none; border-radius: 50%; border: 0; background: var(--blau-badge); color: var(--blau-text); font-size: 22px; font-weight: 800; cursor: pointer; }
.step-edit { display: flex; flex-direction: column; gap: 6px; padding: 12px; background: var(--creme); border: 2px solid var(--creme-rahmen); border-radius: 22px; }
.edit-actions { display: flex; flex-direction: column; gap: 6px; margin-top: 10px; }
```

`frontend/src/styles-anim.css` (alle Animationen):

```css
/* Animationen: nur transform/opacity (GPU-beschleunigt, ruckelfrei). Bei "Weniger Bewegung" alles aus. */
:root {
  --ease-out: cubic-bezier(0.22, 1, 0.36, 1);
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes page-in { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
@keyframes card-in { from { opacity: 0; transform: translateY(18px) scale(0.97); } to { opacity: 1; transform: none; } }
@keyframes pop-in { 0% { opacity: 0; transform: scale(0.6); } 70% { transform: scale(1.06); } 100% { opacity: 1; transform: none; } }
@keyframes step-in { from { opacity: 0; transform: translateX(28px); } to { opacity: 1; transform: none; } }
@keyframes bob { 0%, 100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-3px) rotate(-1.5deg); } }
@keyframes blink { 0%, 92%, 100% { transform: scaleY(1); } 95% { transform: scaleY(0.1); } }
@keyframes hat-wobble { 0%, 100% { transform: rotate(0deg); } 25% { transform: rotate(-3deg); } 75% { transform: rotate(3deg); } }
@keyframes stir { 0%, 100% { transform: translateX(-4px) rotate(-5deg); } 50% { transform: translateX(4px) rotate(5deg); } }
@keyframes spoon { 0%, 100% { transform: rotate(-10deg); } 50% { transform: rotate(14deg); } }
@keyframes steam-rise { 0% { opacity: 0; transform: translateY(0) scale(0.5); } 25% { opacity: 0.9; } 100% { opacity: 0; transform: translateY(-48px) scale(1.5); } }
@keyframes shimmer { from { transform: translateX(-100%); } to { transform: translateX(100%); } }
@keyframes pulse-ring { 0% { box-shadow: 0 0 0 0 rgba(246, 183, 74, 0.55); } 100% { box-shadow: 0 0 0 16px rgba(246, 183, 74, 0); } }
@keyframes shake { 0%, 100% { transform: none; } 20% { transform: rotate(-3deg); } 40% { transform: rotate(3deg); } 60% { transform: rotate(-2deg); } 80% { transform: rotate(2deg); } }
@keyframes draw { from { stroke-dashoffset: 24; } to { stroke-dashoffset: 0; } }
@keyframes bump { 0% { transform: scale(1); } 40% { transform: scale(1.18); color: var(--gopa-blau); } 100% { transform: scale(1); } }
@keyframes bar-stripes { from { background-position: 0 0; } to { background-position: 28px 0; } }

/* Seitenübergang */
.shell-body, .cook { animation: page-in 0.38s var(--ease-out) both; }

/* Bär */
.bear { transform-origin: 50% 90%; }
.bear-idle { animation: bob 4.5s ease-in-out infinite; }
.bear-eyes { transform-box: fill-box; transform-origin: center; animation: blink 5.5s infinite; }
.bear-cook { animation: stir 0.7s ease-in-out infinite; }
.bear-cook .bear-hat { transform-box: fill-box; transform-origin: 50% 100%; animation: hat-wobble 0.7s ease-in-out infinite; }

/* Ladeanimation */
.loader { position: relative; height: 128px; display: flex; justify-content: center; align-items: flex-end; margin-bottom: -4px; }
.loader-bear { position: absolute; bottom: 34px; }
.pot { position: relative; z-index: 1; overflow: visible; }
.pot-spoon { transform-box: fill-box; transform-origin: 0% 100%; animation: spoon 0.7s ease-in-out infinite; }
.steam { position: absolute; left: 50%; bottom: 80px; width: 150px; height: 40px; transform: translateX(-50%); }
.steam i { position: absolute; bottom: 0; width: 12px; height: 12px; border-radius: 50%; background: var(--himmelblau-rahmen); opacity: 0; animation: steam-rise 2.1s ease-out infinite; }

/* Fortschrittsbalken: fließende Streifen */
.bar div { background-image: linear-gradient(45deg, rgba(255, 255, 255, 0.28) 25%, transparent 25%, transparent 50%, rgba(255, 255, 255, 0.28) 50%, rgba(255, 255, 255, 0.28) 75%, transparent 75%); background-size: 28px 28px; animation: bar-stripes 0.8s linear infinite; transition: width 0.6s var(--ease-out); }
.progress-card { animation: pop-in 0.45s var(--ease-spring) both; }
.dot.active { animation: pulse-ring 1.4s ease-out infinite; }
.dot.done { animation: pop-in 0.35s var(--ease-spring) both; }
.dot.done svg path, .box svg path { stroke-dasharray: 24; animation: draw 0.35s var(--ease-out) 0.05s both; }

/* Listen */
.recipe-card { animation: card-in 0.5s var(--ease-out) both; animation-delay: calc(var(--i, 0) * 60ms); transition: transform 0.2s var(--ease-out), box-shadow 0.2s; }
.recipe-card:active { transform: scale(0.97); }
.skeleton { position: relative; overflow: hidden; height: 108px; background: var(--creme); border: 2px solid var(--creme-rahmen); border-radius: 24px; }
.skeleton::after { content: ""; position: absolute; inset: 0; background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.7), transparent); animation: shimmer 1.3s infinite; }
.bear-says { animation: pop-in 0.5s var(--ease-spring) both; }
.shop-card li, .ingredients li, .steps li { animation: card-in 0.45s var(--ease-out) both; animation-delay: calc(var(--i, 0) * 40ms); }

/* Eingaben, Buttons */
.btn, .chip, .paste-btn, .clear-btn, .round-btn, .nav-plus, .nav-item, .stepper button, .cook-next, .cook-back, .timer-pill, .icon-del {
  transition: transform 0.2s var(--ease-spring), background-color 0.2s, border-color 0.2s, color 0.2s, opacity 0.2s;
}
.btn:active, .chip:active, .paste-btn:active, .clear-btn:active, .round-btn:active, .stepper button:active, .cook-next:active,
.cook-back:active, .timer-pill:active, .icon-del:active { transform: scale(0.94); }
.nav-plus:active { transform: scale(0.88) rotate(90deg); }
.nav-plus { box-shadow: 0 6px 16px rgba(246, 183, 74, 0.5); }
.chip.active { animation: pop-in 0.3s var(--ease-spring) both; }
.search { transition: border-color 0.2s, box-shadow 0.2s; }
.search:focus-within { box-shadow: 0 0 0 4px rgba(27, 99, 204, 0.15); }

/* Portionsrechner und Einkaufsliste */
.ing-amount.bump { display: inline-block; animation: bump 0.35s var(--ease-spring); }
.box { transition: background-color 0.2s, border-color 0.2s, transform 0.2s var(--ease-spring); }
.shop-row.done .box { animation: pop-in 0.35s var(--ease-spring); }
.shop-name { transition: color 0.25s; position: relative; }

/* Kochmodus */
.cook-text.step-in { animation: step-in 0.4s var(--ease-out) both; }
.step-forward .cook-text.step-in { animation-name: step-in; }
.seg { transition: background-color 0.4s var(--ease-out), transform 0.4s var(--ease-spring); }
.seg.on { transform: scaleY(1.25); }
.timer-pill.running .timer-icon { animation: pulse-ring 1.2s ease-out infinite; }
.timer-pill.done { animation: shake 0.6s ease-in-out 3; }
.cook-bubble { animation: pop-in 0.45s var(--ease-spring) both; transform-origin: 0% 100%; }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation: none !important; transition: none !important; }
}
```

Zu den Animationen: Sie verändern **nur `transform` und `opacity`**, die einzigen Eigenschaften, die der Browser auf der Grafikkarte ohne Neuberechnung des Layouts animieren kann. Deshalb laufen sie flüssig. Und der Block `@media (prefers-reduced-motion: reduce)` am Ende schaltet **alles** ab, wenn das Handy "Animationen reduzieren" eingestellt hat. Das ist Rücksicht auf Menschen, denen Bewegung Übelkeit macht.

## 7.2 Komponenten (`frontend/src/components/`)

**Icons** (kleine SVG-Bilder, mit `aria-hidden`, weil sie nur Zierde sind; die Schaltfläche drumherum trägt das Label):

```tsx
import type { ReactNode } from "react";

function Icon({ size = 24, stroke = "currentColor", width = 2.2, children }:
  { size?: number; stroke?: string; width?: number; children: ReactNode }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke}
      strokeWidth={width} strokeLinecap="round" strokeLinejoin="round">{children}</svg>
  );
}

type P = { size?: number; stroke?: string; width?: number };

export const SearchIcon = (p: P) => <Icon {...p}><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></Icon>;
export const LinkIcon = (p: P) => (
  <Icon {...p}><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" /><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></Icon>
);
export const BackIcon = (p: P) => <Icon {...p}><path d="M15 5l-7 7 7 7" /></Icon>;
export const ChevronDownIcon = (p: P) => <Icon {...p}><path d="M6 9l6 6 6-6" /></Icon>;
export const PlusIcon = (p: P) => <Icon {...p}><path d="M12 5v14M5 12h14" /></Icon>;
export const BookIcon = (p: P) => <Icon {...p}><path d="M4 5a2 2 0 0 1 2-2h12v18H6a2 2 0 0 1-2-2z" /><path d="M8 7h6" /></Icon>;
export const BasketIcon = (p: P) => <Icon {...p}><path d="M5 7h14l-1.2 11a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8z" /><path d="M9 7a3 3 0 0 1 6 0" /></Icon>;

export function Paw({ size = 40, fill = "#C4D9F7", style }: { size?: number; fill?: string; style?: React.CSSProperties }) {
  return (
    <svg aria-hidden="true" width={size} height={size * 0.85} viewBox="0 0 40 34" style={style}>
      <g fill={fill}>
        <ellipse cx="20" cy="26" rx="10" ry="8" /><circle cx="8" cy="14" r="4.5" /><circle cx="16" cy="8" r="4.5" />
        <circle cx="25" cy="8" r="4.5" /><circle cx="32" cy="14" r="4.5" />
      </g>
    </svg>
  );
}
```

**Gopa, der Bär** (`GopaBear.tsx`): ein SVG, das Maße und Farben aus `docs/design/assets/gopa-bear.svg` übernimmt. Eigenschaften (Props) steuern Größe, Bandfarbe, Animation:

```tsx
interface Props {
  size?: number;
  bandColor?: string;
  /** Mützen-Puffs mit zartem Rand (Sammlung/Icons) oder ohne (Rezept-Hero auf blauem Grund) */
  outlinePuffs?: boolean;
  label?: string;
  /** Sanftes Wippen und Blinzeln. Wird bei "Weniger Bewegung" automatisch abgeschaltet. */
  animate?: boolean;
  /** "cook": Gopa rührt eifrig (Ladeanimation) */
  mood?: "idle" | "cook";
}

/** Gopa, der Bär mit Kochmütze. Maße und Farben aus docs/design/assets/gopa-bear.svg */
export function GopaBear({ size = 72, bandColor = "#2F6FE0", outlinePuffs = true, label = "Gopa der Bär",
  animate = true, mood = "idle" }: Props) {
  const puff = outlinePuffs ? { stroke: "#D3E2FA", strokeWidth: 2 } : {};
  const cls = ["bear", animate ? (mood === "cook" ? "bear-cook" : "bear-idle") : ""].join(" ").trim();
  return (
    <svg role="img" aria-label={label} className={cls} width={size} height={size} viewBox="0 0 120 120" style={{ flex: "none" }}>
      <circle cx="24" cy="42" r="15" fill="#A9683F" />
      <circle cx="96" cy="42" r="15" fill="#A9683F" />
      <circle cx="24" cy="42" r="8" fill="#E8B089" />
      <circle cx="96" cy="42" r="8" fill="#E8B089" />
      <ellipse cx="60" cy="72" rx="44" ry="40" fill="#B97A4B" />
      <ellipse cx="60" cy="84" rx="20" ry="15" fill="#FBE6C8" />
      <ellipse cx="60" cy="77" rx="6" ry="4.5" fill="#4A2E1F" />
      <path d="M60 81v5M53 88q7 6 14 0" stroke="#4A2E1F" strokeWidth="2" fill="none" strokeLinecap="round" />
      <g className="bear-eyes">
        <circle cx="43" cy="66" r="4.8" fill="#2A1A12" />
        <circle cx="77" cy="66" r="4.8" fill="#2A1A12" />
        <circle cx="44.6" cy="64.4" r="1.7" fill="#FFFFFF" />
        <circle cx="78.6" cy="64.4" r="1.7" fill="#FFFFFF" />
      </g>
      <ellipse cx="33" cy="80" rx="7" ry="4.5" fill="#FF9DA8" opacity="0.75" />
      <ellipse cx="87" cy="80" rx="7" ry="4.5" fill="#FF9DA8" opacity="0.75" />
      <g className="bear-hat">
        <circle cx="42" cy="26" r="13" fill="#FFFFFF" {...puff} />
        <circle cx="60" cy="20" r="15" fill="#FFFFFF" {...puff} />
        <circle cx="78" cy="26" r="13" fill="#FFFFFF" {...puff} />
        <rect x="34" y="30" width="52" height="12" rx="5" fill={bandColor} />
      </g>
    </svg>
  );
}
```

`role="img"` und `aria-label` sagen Screenreadern, was das Bild ist. `className="bear-eyes"` und `"bear-hat"` sind die Haken, an denen das Animations-CSS Blinzeln und Wackeln befestigt.

**Sprechblase** (`SpeechBubble.tsx`): Bär mit Text. Wird für **leere Zustände und Fehler** benutzt. `role="alert"` lässt Screenreader Fehler sofort vorlesen:

```tsx
import type { ReactNode } from "react";
import { GopaBear } from "./GopaBear";

/** Bär mit Sprechblase: Leer-Zustand, Fehler-Zustand, Hinweise */
export function BearSays({ children, actions, size = 96, role }:
  { children: ReactNode; actions?: ReactNode; size?: number; role?: "alert" | "status" }) {
  return (
    <div className="bear-says">
      <div className="bubble" role={role}>{children}</div>
      <GopaBear size={size} />
      {actions && <div className="bear-actions">{actions}</div>}
    </div>
  );
}
```

**Ladeanimation** (`CookingLoader.tsx`): Gopa rührt im Topf, Dampfblasen steigen auf:

```tsx
import { GopaBear } from "./GopaBear";

/** Ladeanimation: Gopa rührt im Topf, Dampfblasen steigen auf. Nur CSS-Transform/Opacity, läuft flüssig. */
export function CookingLoader() {
  return (
    <div className="loader" aria-hidden="true">
      <div className="steam">
        <i style={{ left: "18%", animationDelay: "0s" }} />
        <i style={{ left: "46%", animationDelay: "0.7s" }} />
        <i style={{ left: "72%", animationDelay: "1.4s" }} />
      </div>
      <div className="loader-bear"><GopaBear size={84} mood="cook" outlinePuffs /></div>
      <svg className="pot" width="150" height="62" viewBox="0 0 150 62">
        <path className="pot-spoon" d="M92 4 L118 -14" stroke="#B97A4B" strokeWidth="6" strokeLinecap="round" />
        <rect x="6" y="14" width="138" height="12" rx="6" fill="#F6B74A" />
        <path d="M14 22h122v18a20 20 0 0 1-20 20H34a20 20 0 0 1-20-20z" fill="#2F6FE0" />
        <rect x="26" y="32" width="16" height="6" rx="3" fill="#FFFFFF" opacity="0.35" />
      </svg>
    </div>
  );
}
```

**Layout** (`Layout.tsx`): der Rahmen mit unterer Navigation. Der runde gelbe Plus-Knopf führt zu "Neues Rezept":

```tsx
import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { Paw, BookIcon, BasketIcon, PlusIcon } from "./icons";

export function Shell({ children, nav = true }: { children: ReactNode; nav?: boolean }) {
  return (
    <div className="shell">
      <Paw style={{ position: "absolute", right: 32, top: 560, transform: "rotate(16deg)" }} />
      <Paw style={{ position: "absolute", left: 14, top: 680, transform: "rotate(-18deg)" }} />
      <div className={nav ? "shell-body with-nav" : "shell-body"}>{children}</div>
      {nav && <BottomNav />}
    </div>
  );
}

function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Hauptmenü">
      <NavLink to="/" end className="nav-item"><BookIcon /><span>Rezepte</span></NavLink>
      <NavLink to="/neu" aria-label="Rezept per Link hinzufügen" className="nav-plus">
        <PlusIcon size={28} stroke="#3B2412" width={2.8} />
      </NavLink>
      <NavLink to="/einkauf" className="nav-item"><BasketIcon /><span>Einkauf</span></NavLink>
    </nav>
  );
}
```

## 7.3 Seiten (`frontend/src/pages/`)

**Sammlung**: Suche (mit 250 ms Verzögerung, damit nicht bei jedem Buchstaben angefragt wird), Filter-Chips, Karten, Skeleton-Platzhalter während des Ladens, Leer- und Fehlerzustand:

```tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { formatTime } from "../lib/format";
import { FILTER_CHIPS, type Rezept } from "../lib/types";
import { BearSays } from "../components/SpeechBubble";
import { GopaBear } from "../components/GopaBear";
import { LinkIcon, SearchIcon, Paw } from "../components/icons";

export function Sammlung() {
  const [kategorie, setKategorie] = useState<string>("Alle");
  const [suche, setSuche] = useState("");
  const [q, setQ] = useState("");
  const [rezepte, setRezepte] = useState<Rezept[] | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [versuch, setVersuch] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setQ(suche), 250);
    return () => clearTimeout(t);
  }, [suche]);

  useEffect(() => {
    let aktuell = true;
    setFehler(null);
    api.listRecipes(kategorie, q).then(
      (r) => aktuell && setRezepte(r),
      (e: Error) => aktuell && setFehler(e.message),
    );
    return () => { aktuell = false; };
  }, [kategorie, q, versuch]);

  const leer = rezepte?.length === 0 && kategorie === "Alle" && !q.trim();
  const count = rezepte?.length ?? 0;

  return (
    <>
      <header className="page-head">
        <GopaBear size={72} />
        <div className="head-text">
          <h1>Gopas Rezepte</h1>
          <span className="sub">
            Was kochen wir heute?{rezepte && ` · ${count} ${count === 1 ? "Rezept" : "Rezepte"}`}
          </span>
        </div>
        <Link to="/einstellungen" className="round-btn bordered" aria-label="Einstellungen">
          <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0B2A4A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" /></svg>
        </Link>
      </header>

      <div className="search-wrap">
        <label className="search">
          <SearchIcon size={20} stroke="#3F5A7D" />
          <input type="search" aria-label="Rezepte durchsuchen" placeholder="Rezept oder Zutat suchen"
            value={suche} onChange={(e) => setSuche(e.target.value)} />
        </label>
      </div>

      <div className="chips" role="group" aria-label="Kategorie filtern">
        {FILTER_CHIPS.map((k) => (
          <button key={k} className={k === kategorie ? "chip active" : "chip"} aria-pressed={k === kategorie}
            onClick={() => setKategorie(k)}>{k}</button>
        ))}
      </div>

      <main className="list">
        {fehler && (
          <BearSays role="alert" actions={<button className="btn btn-secondary" onClick={() => setVersuch((v) => v + 1)}>Nochmal versuchen</button>}>
            {fehler}
          </BearSays>
        )}
        {!fehler && leer && (
          <BearSays role="status">Noch nichts im Topf. Teile dein erstes Rezept-Video mit mir!</BearSays>
        )}
        {!fehler && rezepte && !leer && rezepte.length === 0 && (
          <BearSays role="status">Dazu finde ich nichts. Probier ein anderes Wort oder eine andere Kategorie.</BearSays>
        )}
        {!fehler && !rezepte && [0, 1, 2].map((i) => <div key={i} className="skeleton" aria-hidden="true" />)}
        {!fehler && rezepte?.map((r, i) => <Karte key={r.id} r={r} i={i} />)}
      </main>
    </>
  );
}

function Karte({ r, i }: { r: Rezept; i: number }) {
  const zeit = formatTime(r);
  return (
    <Link to={`/rezept/${r.id}`} className="card recipe-card" style={{ "--i": Math.min(i, 8) } as React.CSSProperties}>
      <div className="thumb"><Paw size={40} fill="#B97A4B" /></div>
      <div className="card-text">
        <span className="card-title">{r.titel}</span>
        <span className="card-meta">
          <span className="badge">{r.kategorie}</span>
          {zeit && <span>{zeit}</span>}
        </span>
        <span className="card-source"><LinkIcon size={14} stroke="#1B63CC" width={2.4} /><span>{r.quelle.plattform}</span></span>
      </div>
    </Link>
  );
}
```

Merke dir das Muster, es kommt in allen Seiten wieder:
- `useState` für Daten und Fehler, `useEffect` zum Laden.
- `let aktuell = true; ... return () => { aktuell = false; }`: Wechselt der Nutzer die Kategorie, **bevor** die erste Antwort da ist, darf die alte Antwort die neue nicht überschreiben. Die Variable verwirft veraltete Antworten.
- Vier Zustände jeder Datenseite: **laden** (Skeleton), **Fehler** (Sprechblase + "Nochmal versuchen"), **leer** (Bär: "Noch nichts im Topf"), **Daten**.

**Login:**

```tsx
import { useState } from "react";
import { api } from "../lib/api";
import { setToken } from "../lib/auth";
import { getServer, isNative, setServer } from "../lib/server";
import { BearSays } from "../components/SpeechBubble";

export function Login() {
  const [pw, setPw] = useState("");
  const [fehler, setFehler] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [server, setSrv] = useState(getServer());

  async function anmelden(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setFehler(null);
    if (isNative()) setServer(server);
    try {
      const { token } = await api.login(pw);
      setToken(token); // bleibt auf dem Handy gespeichert
    } catch (err) {
      setFehler((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <form className="neu-form login" onSubmit={anmelden}>
      <BearSays size={110}>{fehler ?? "Hallo! Wie lautet das Geheimwort für Gopas Küche?"}</BearSays>
      {isNative() && (
        <>
          <label htmlFor="srv" className="field-label">Adresse von Gopas Küche</label>
          <input id="srv" className="text-in" inputMode="url" placeholder="http://192.168.1.20:8000" value={server}
            onChange={(e) => setSrv(e.target.value)} />
        </>
      )}
      <label htmlFor="pw" className="field-label">Passwort</label>
      <input id="pw" className="text-in" type="password" autoComplete="current-password" value={pw}
        onChange={(e) => setPw(e.target.value)} />
      <button className="btn btn-primary big" type="submit" disabled={busy || !pw || (isNative() && !server.trim())}>Anmelden</button>
    </form>
  );
}
```

In der Android-App fragt Login zusätzlich nach der **Adresse von Gopas Küche**. Im Browser entfällt dieses Feld.

**Einkaufsliste:**

```tsx
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
```

Die Checkbox ist unsichtbar (`opacity: 0`, aber 44 × 44 px groß und bedienbar), das schöne Kästchen ist ein `<span class="box">`. So funktioniert sie mit Tastatur und Screenreader **und** sieht aus wie im Design.

**Einstellungen** und **Nicht gefunden:**

```tsx
import { useState } from "react";
import { Link } from "react-router-dom";
import { setToken } from "../lib/auth";
import { getServer, isNative, normalizeServer, setServer } from "../lib/server";
import { BackIcon } from "../components/icons";

export function Einstellungen() {
  const [server, setSrv] = useState(getServer());
  const [saved, setSaved] = useState(false);

  return (
    <div className="edit">
      <div className="neu-head">
        <Link to="/" className="round-btn bordered" aria-label="Zurück zur Rezeptsammlung"><BackIcon size={22} stroke="#0B2A4A" width={2.4} /></Link>
        <h1>Einstellungen</h1>
      </div>

      {isNative() && (
        <>
          <label className="field-label" htmlFor="srv">Adresse von Gopas Küche (dein PC)</label>
          <input id="srv" className="text-in" inputMode="url" placeholder="http://192.168.1.20:8000" value={server}
            onChange={(e) => { setSrv(e.target.value); setSaved(false); }} />
          <button className="btn btn-secondary" onClick={() => { setServer(server); setSrv(normalizeServer(server)); setSaved(true); }}>Adresse speichern</button>
          {saved && <p className="tip" role="status">Gespeichert.</p>}
        </>
      )}

      <button className="btn btn-primary big" onClick={() => setToken(null)}>Abmelden</button>
      <p className="tip">Gopa 1.0 · Rezepte liegen auf deinem PC, die Einkaufsliste auf diesem Handy.</p>
    </div>
  );
}
```

```tsx
import { Link } from "react-router-dom";
import { BearSays } from "../components/SpeechBubble";

/** Unbekannte Adresse. */
export function NichtGefunden() {
  return (
    <div className="page-pad">
      <BearSays role="status" actions={<Link to="/" className="btn btn-primary">Zur Sammlung</Link>}>
        Hier ist nichts im Topf. Diese Seite gibt es nicht.
      </BearSays>
    </div>
  );
}
```

## 7.4 `main.tsx` (Stufe 2)

Ersetze `frontend/src/main.tsx`:

```tsx
import "@fontsource/baloo-2/600.css";
import "@fontsource/baloo-2/700.css";
import "@fontsource/baloo-2/800.css";
import "@fontsource/nunito/600.css";
import "@fontsource/nunito/700.css";
import "@fontsource/nunito/800.css";
import "./styles.css";
import "./styles-m4.css";
import "./styles-anim.css";
import { StrictMode, useEffect, useState, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Shell } from "./components/Layout";
import { Sammlung } from "./pages/Sammlung";
import { Einkauf } from "./pages/Einkauf";
import { Einstellungen } from "./pages/Einstellungen";
import { NichtGefunden } from "./pages/NichtGefunden";
import { Login } from "./pages/Login";
import { AUTH_EVENT, getToken } from "./lib/auth";

/** Zeigt die Anmeldung, solange kein Token da ist. Die Adresse bleibt erhalten. */
function AuthGate({ children }: { children: ReactNode }) {
  const [token, setTok] = useState(getToken());
  useEffect(() => {
    const h = () => setTok(getToken());
    window.addEventListener(AUTH_EVENT, h);
    return () => window.removeEventListener(AUTH_EVENT, h);
  }, []);
  return token ? <>{children}</> : <Shell nav={false}><Login /></Shell>;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthGate>
        <Routes>
          <Route path="/" element={<Shell><Sammlung /></Shell>} />
          <Route path="/einkauf" element={<Shell><Einkauf /></Shell>} />
          <Route path="/einstellungen" element={<Shell nav={false}><Einstellungen /></Shell>} />
          <Route path="*" element={<Shell><NichtGefunden /></Shell>} />
        </Routes>
      </AuthGate>
    </BrowserRouter>
  </StrictMode>,
);
```

Der `AuthGate` zeigt die Anmeldung, **solange kein Token da ist**, und danach die Seiten. Er hört auf das Ereignis aus `auth.ts`, so reicht ein `setToken(...)`, und die ganze App wechselt.

## Test für dieses Kapitel

Backend und Frontend laufen **gleichzeitig** in zwei Terminals.

Terminal 1 (Backend):

```powershell
cd C:\Temp\gopa-nachbau\backend
.\.venv\Scripts\Activate.ps1
$env:APP_PASSWORD = "geheim"
python -m uvicorn app.main:app --reload --port 8000
```

Terminal 2 (Frontend):

```powershell
cd C:\Temp\gopa-nachbau\frontend
npm run dev
```

Öffne <http://localhost:5173> und verkleinere das Fenster auf Handy-Breite (`F12` → Geräte-Symbol → "iPhone 12" oder 390 px).

**Prüfliste:**

1. Du siehst die **Anmeldung** mit Bär und Sprechblase. Falsches Passwort → Sprechblase "Das Passwort stimmt nicht.". Richtiges (`geheim`) → die Sammlung.
2. Die Sammlung zeigt kurz graue Platzhalter und dann Gopa mit **"Noch nichts im Topf …"**.
3. Lege per PowerShell ein Rezept an (Befehle aus Kapitel 3.4) und lade die Seite neu: eine Karte erscheint mit Animation. Die Chips **Frühstück** filtern. Im Suchfeld "mehl" findet es, "xyz" zeigt "Dazu finde ich nichts".
4. Unten **Einkauf**: "Der Korb ist leer".
5. **Fehlerzustand:** Beende den Backend-Server (`Strg+C`) und lade die Sammlung neu. Du siehst eine Sprechblase mit einer Fehlermeldung und **"Nochmal versuchen"**. Im Entwicklungsmodus lautet der Text "Das hat nicht geklappt.", weil der Vite-Proxy selbst mit einem 500er antwortet. In der fertigen Android-App, die den Server direkt anruft, steht dort "Gopa erreicht den Server nicht …", und die Karten bleiben dank Offline-Zwischenspeicher lesbar. Dieses Offline-Verhalten prüfst du erst mit der APK (Kapitel 11).
6. **Weniger Bewegung:** Windows-Einstellungen → Barrierefreiheit → Visuelle Effekte → *Animationseffekte* aus: die App steht still.
7. `npx tsc --noEmit` und `npm test` laufen ohne Fehler.

```powershell
cd ..
git add -A
git commit -m "feat: Design, Bär, Navigation, Sammlung, Login, Einkaufsliste"
```

## Wenn etwas schiefgeht

| Meldung / Symptom | Ursache | Lösung |
|---|---|---|
| Alles unformatiert, Standard-Schrift | CSS-Imports fehlen oder Dateiname falsch | oben in `main.tsx` die neun `import "..."`-Zeilen prüfen |
| Schrift sieht nicht nach Baloo/Nunito aus | `@fontsource`-Pakete fehlen | `npm install`; in `F12` → *Netzwerk* nach `.woff2` suchen |
| Bär ist riesig oder unsichtbar | `width/height`-Props fehlen / `viewBox` falsch | `GopaBear.tsx` mit der Vorlage vergleichen |
| Untere Navigation überdeckt Inhalt | `.with-nav { padding-bottom: 100px }` fehlt | CSS prüfen |
| Rote Zeile `Failed to resolve import "./pages/Rezeptansicht"` | `main.tsx` aus Kapitel 8 zu früh eingesetzt | Stufe 2 verwenden, bis die Seiten da sind |
| Anmeldung klappt, danach sofort wieder Login | Server antwortet 401 (anderes Passwort in `APP_PASSWORD`) | Passwort in **dem** Terminal setzen, in dem der Server läuft, Server neu starten |
| Anmeldung: "Das hat nicht geklappt." (im Dev-Modus) oder "Gopa erreicht den Server nicht" (APK) | Backend läuft nicht oder falscher Port | Backend starten; Proxy-Port in `vite.config.ts` = 8000? Terminal von Vite zeigt `ECONNREFUSED` |
| Kein Rezept sichtbar, obwohl eins angelegt | falsche Kategorie-Filter / altes Cache-Rezept | Chip **Alle** wählen; `F12` → *Application* → *Local Storage* leeren |
| Animation ruckelt | `box-shadow`/`width` animiert statt `transform` | nur `transform`/`opacity` animieren |
| Plus-Knopf führt auf "Hier ist nichts im Topf" | Seite `/neu` gibt es noch nicht | normal bis Kapitel 8 |
| Mobile Ansicht: Seite seitlich verschiebbar | Element breiter als 100 % | `min-width: 0` an Flex-Kindern, Texte mit `overflow-wrap: anywhere` |
