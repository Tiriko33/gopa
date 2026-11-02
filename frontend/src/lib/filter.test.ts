import { describe, expect, it } from "vitest";
import { filterRecipes } from "./filter";
import type { Rezept } from "./types";

const r = (titel: string, kategorie: Rezept["kategorie"], zutat: string, tags: string[] = []) =>
  ({ titel, kategorie, tags, zutaten: [{ name: zutat }] }) as unknown as Rezept;
const list = [r("Pfannkuchen", "Frühstück", "Milch", ["süß"]), r("Bolognese", "Abendessen", "Hackfleisch", ["Pasta"]),
  r("Tiramisu", "Dessert", "Mascarpone"), r("Käsekuchen", "Dessert", "Quark")];
const t = (l: Rezept[]) => l.map((x) => x.titel).sort();

describe("Filter nach Kategorie und Suche", () => {
  it("filtert nach Kategorie, Alle zeigt alles", () => {
    expect(t(filterRecipes(list, "Dessert", ""))).toEqual(["Käsekuchen", "Tiramisu"]);
    expect(filterRecipes(list, "Alle", "")).toHaveLength(4);
    expect(filterRecipes(list, "Snacks", "")).toEqual([]);
  });
  it("sucht in Titel, Zutaten und Tags, ohne Groß/Klein und mit Umlauten", () => {
    expect(t(filterRecipes(list, "Alle", "hackfleisch"))).toEqual(["Bolognese"]);
    expect(t(filterRecipes(list, "Alle", "PASTA"))).toEqual(["Bolognese"]);
    expect(t(filterRecipes(list, "Alle", "KÄSE"))).toEqual(["Käsekuchen"]);
  });
  it("kombiniert Kategorie und Suche", () => {
    expect(t(filterRecipes(list, "Dessert", "quark"))).toEqual(["Käsekuchen"]);
    expect(filterRecipes(list, "Frühstück", "quark")).toEqual([]);
  });
});
