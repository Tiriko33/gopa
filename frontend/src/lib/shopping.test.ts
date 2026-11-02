import { describe, expect, it } from "vitest";
import { GEMISCHT, addRecipe, clearDone, groupByRecipe, openCount, toggle, totalAmount } from "./shopping";

const z = (name: string, menge: number | null, einheit: string | null = "g") => ({
  gruppe: null, name, menge, einheit, original: null,
});
const rezept = (id: string, titel: string, zutaten: ReturnType<typeof z>[], portionen = 2) =>
  ({ id, titel, portionen, zutaten });

describe("Einkaufsliste: Zusammenfassen", () => {
  it("addiert Mengen gleicher Zutaten aus mehreren Rezepten", () => {
    let l = addRecipe([], rezept("a", "Pasta", [z("Mehl", 200), z("Salz", 5)]), 2);
    l = addRecipe(l, rezept("b", "Kuchen", [z("mehl", 300)]), 2);
    expect(l).toHaveLength(2);
    expect(totalAmount(l.find((e) => e.key.startsWith("mehl"))!)).toBe(500);
  });

  it("trennt unterschiedliche Einheiten", () => {
    const l = addRecipe([], rezept("a", "A", [z("Milch", 200, "ml"), z("Milch", 1, "Tasse")]), 2);
    expect(l).toHaveLength(2);
  });

  it("skaliert nach gewählter Portionszahl", () => {
    const l = addRecipe([], rezept("a", "A", [z("Mehl", 200)], 2), 4);
    expect(totalAmount(l[0])).toBe(400);
  });

  it("verdoppelt nichts, wenn dasselbe Rezept erneut hinzugefügt wird", () => {
    let l = addRecipe([], rezept("a", "A", [z("Mehl", 200)]), 2);
    l = addRecipe(l, rezept("a", "A", [z("Mehl", 200)]), 2);
    expect(totalAmount(l[0])).toBe(200);
  });

  it("ersetzt beim erneuten Hinzufügen die Menge mit der neuen Portionszahl", () => {
    let l = addRecipe([], rezept("a", "A", [z("Mehl", 200)]), 2);
    l = addRecipe(l, rezept("a", "A", [z("Mehl", 200)]), 4);
    expect(totalAmount(l[0])).toBe(400);
  });

  it("behandelt unbekannte Mengen: nichts erfinden", () => {
    const l = addRecipe([], rezept("a", "A", [z("Salz", null, null)]), 2);
    expect(totalAmount(l[0])).toBeNull();
    const l2 = addRecipe(l, rezept("b", "B", [z("Salz", null, null)]), 2);
    expect(l2).toHaveLength(1);
    expect(totalAmount(l2[0])).toBeNull();
  });

  it("öffnet einen abgehakten Eintrag wieder, wenn Menge dazukommt", () => {
    let l = addRecipe([], rezept("a", "A", [z("Mehl", 200)]), 2);
    l = toggle(l, l[0].key);
    l = addRecipe(l, rezept("b", "B", [z("Mehl", 100)]), 2);
    expect(l[0].erledigt).toBe(false);
  });
});

describe("Einkaufsliste: Abhaken, Löschen, Gruppen", () => {
  it("hakt ab, zählt offene und löscht Erledigte", () => {
    let l = addRecipe([], rezept("a", "A", [z("Mehl", 1), z("Zucker", 1)]), 2);
    l = toggle(l, l[0].key);
    expect(openCount(l)).toBe(1);
    l = clearDone(l);
    expect(l.map((e) => e.name)).toEqual(["Zucker"]);
  });

  it("gruppiert nach Rezept, gemeinsame Zutaten in einer eigenen Gruppe", () => {
    let l = addRecipe([], rezept("a", "Pasta", [z("Mehl", 1), z("Ei", 1)]), 2);
    l = addRecipe(l, rezept("b", "Kuchen", [z("Mehl", 1), z("Zucker", 1)]), 2);
    const g = groupByRecipe(l);
    expect(g.map((x) => x.titel).sort()).toEqual([GEMISCHT, "Kuchen", "Pasta"].sort());
    expect(g.find((x) => x.titel === GEMISCHT)!.items[0].name).toBe("Mehl");
  });
});
