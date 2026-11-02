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
