import { describe, expect, it } from "vitest";
import { formatAmount, formatTime, groupIngredients, scaleAmount, wasConverted } from "./format";

describe("Portionsrechner", () => {
  it("skaliert Mengen", () => {
    expect(scaleAmount(250, 2, 4)).toBe(500);
    expect(scaleAmount(1, 2, 3)).toBe(1.5);
  });
  it("lässt unbekannte Mengen unbekannt", () => {
    expect(scaleAmount(null, 2, 4)).toBeNull();
  });
});

describe("formatAmount", () => {
  it("nutzt deutsches Komma und Einheit", () => {
    expect(formatAmount(1.5, "EL")).toBe("1,5 EL");
    expect(formatAmount(250, "g")).toBe("250 g");
    expect(formatAmount(2, null)).toBe("2");
  });
  it("zeigt bei unbekannter Menge nur die Einheit oder nichts", () => {
    expect(formatAmount(null, null)).toBe("");
  });
  it("rundet Krümel weg", () => {
    expect(formatAmount(333.333, "g")).toBe("333 g");
    expect(formatAmount(0.3333, "TL")).toBe("0,33 TL");
  });
});

describe("formatTime", () => {
  it("addiert Vorbereitung und Kochen", () => {
    expect(formatTime({ zeit_vorbereitung_min: 10, zeit_kochen_min: 15 })).toBe("25 Min");
    expect(formatTime({ zeit_vorbereitung_min: 30, zeit_kochen_min: 45 })).toBe("1 Std 15 Min");
    expect(formatTime({ zeit_vorbereitung_min: null, zeit_kochen_min: null })).toBeNull();
  });
});

describe("Zutaten", () => {
  const z = (name: string, gruppe: string | null, original: string | null = null) => ({
    gruppe, name, menge: 1, einheit: null, original,
  });
  it("gruppiert aufeinanderfolgende Zutaten", () => {
    const g = groupIngredients([z("a", "Teig"), z("b", "Teig"), z("c", "Soße")]);
    expect(g.map((x) => [x.gruppe, x.items.length])).toEqual([["Teig", 2], ["Soße", 1]]);
  });
  it("erkennt Umrechnung", () => {
    expect(wasConverted([z("a", null), z("b", null, "1 cup")])).toBe(true);
    expect(wasConverted([z("a", null)])).toBe(false);
  });
});
