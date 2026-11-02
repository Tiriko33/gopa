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
