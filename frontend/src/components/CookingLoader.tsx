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
