"""SQLite-Speicherung der Rezepte. Das Rezept liegt als JSON in `data`; Spalten dienen Filter und Suche."""
import json
import sqlite3
import threading
import uuid
from datetime import datetime, timezone
from pathlib import Path

from .schema import Rezept

FILTER_KATEGORIEN = ["Frühstück", "Mittagessen", "Abendessen", "Dessert", "Snacks"]


def _search_text(r: Rezept) -> str:
    parts = [r.titel, *(z.name for z in r.zutaten), *r.tags]
    return " ".join(parts).lower()  # Python-lower statt SQLite-lower: Umlaute


class RecipeRepo:
    def __init__(self, path: Path | str):
        if path != ":memory:":
            Path(path).parent.mkdir(parents=True, exist_ok=True)
        self._lock = threading.Lock()
        self._db = sqlite3.connect(str(path), check_same_thread=False)
        self._db.row_factory = sqlite3.Row
        self._db.execute(
            """CREATE TABLE IF NOT EXISTS recipes (
                id TEXT PRIMARY KEY, data TEXT NOT NULL, kategorie TEXT NOT NULL,
                favorit INTEGER NOT NULL DEFAULT 0, erstellt_am TEXT NOT NULL, search_text TEXT NOT NULL)"""
        )
        self._db.commit()

    @staticmethod
    def _to_dict(row: sqlite3.Row) -> dict:
        d = json.loads(row["data"])
        d.update(id=row["id"], erstellt_am=row["erstellt_am"], favorit=bool(row["favorit"]))
        return d

    def create(self, r: Rezept) -> dict:
        rid = uuid.uuid4().hex
        now = datetime.now(timezone.utc).isoformat(timespec="seconds")
        with self._lock:
            self._db.execute(
                "INSERT INTO recipes (id, data, kategorie, favorit, erstellt_am, search_text) VALUES (?,?,?,0,?,?)",
                (rid, r.model_dump_json(), r.kategorie, now, _search_text(r)))
            self._db.commit()
        return self.get(rid)  # type: ignore[return-value]

    def get(self, rid: str) -> dict | None:
        row = self._db.execute("SELECT * FROM recipes WHERE id=?", (rid,)).fetchone()
        return self._to_dict(row) if row else None

    def list(self, kategorie: str | None = None, q: str | None = None, favorit: bool | None = None) -> list[dict]:
        """kategorie None oder 'Alle' = alle. q sucht in Titel, Zutaten und Tags (alle Wörter müssen passen)."""
        sql, args = "SELECT * FROM recipes WHERE 1=1", []
        if kategorie and kategorie != "Alle":
            sql += " AND kategorie=?"
            args.append(kategorie)
        if favorit is not None:
            sql += " AND favorit=?"
            args.append(int(favorit))
        for word in (q or "").lower().split():
            esc = word.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
            sql += " AND search_text LIKE ? ESCAPE '\\'"
            args.append(f"%{esc}%")
        sql += " ORDER BY erstellt_am DESC, rowid DESC"
        return [self._to_dict(r) for r in self._db.execute(sql, args).fetchall()]

    def update(self, rid: str, r: Rezept) -> dict | None:
        with self._lock:
            cur = self._db.execute("UPDATE recipes SET data=?, kategorie=?, search_text=? WHERE id=?",
                                   (r.model_dump_json(), r.kategorie, _search_text(r), rid))
            self._db.commit()
        return self.get(rid) if cur.rowcount else None

    def patch(self, rid: str, kategorie: str | None = None, favorit: bool | None = None) -> dict | None:
        cur = self.get(rid)
        if cur is None:
            return None
        if kategorie is not None:
            data = {k: v for k, v in cur.items() if k not in ("id", "erstellt_am", "favorit")}
            data["kategorie"] = kategorie
            self.update(rid, Rezept.model_validate(data))
        if favorit is not None:
            with self._lock:
                self._db.execute("UPDATE recipes SET favorit=? WHERE id=?", (int(favorit), rid))
                self._db.commit()
        return self.get(rid)

    def delete(self, rid: str) -> bool:
        with self._lock:
            cur = self._db.execute("DELETE FROM recipes WHERE id=?", (rid,))
            self._db.commit()
        return cur.rowcount > 0

    def count(self) -> int:
        return self._db.execute("SELECT COUNT(*) FROM recipes").fetchone()[0]
