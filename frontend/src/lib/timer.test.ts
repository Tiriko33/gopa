import { expect, it } from "vitest";
import { formatTimer } from "./timer";

it("formatiert Sekunden als MM:SS", () => {
  expect(formatTimer(120)).toBe("02:00");
  expect(formatTimer(59.2)).toBe("01:00");
  expect(formatTimer(-3)).toBe("00:00");
  expect(formatTimer(3600)).toBe("60:00");
});
