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
