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
