"""Einheiten-Umrechnung (US -> metrisch). Dient als deterministisches Sicherheitsnetz
nach dem Claude-Aufruf und als Hilfsfunktion für Tests."""
import re

# Einheit (klein) -> (Faktor, Zieleinheit)
_FACTORS: dict[str, tuple[float, str]] = {
    "cup": (240.0, "ml"),
    "cups": (240.0, "ml"),
    "tasse": (240.0, "ml"),
    "fl oz": (29.57, "ml"),
    "fl. oz": (29.57, "ml"),
    "oz": (28.35, "g"),
    "ounce": (28.35, "g"),
    "ounces": (28.35, "g"),
    "unze": (28.35, "g"),
    "unzen": (28.35, "g"),
    "lb": (453.6, "g"),
    "lbs": (453.6, "g"),
    "pound": (453.6, "g"),
    "pounds": (453.6, "g"),
    "stick": (113.0, "g"),
    "sticks": (113.0, "g"),
    "pint": (473.0, "ml"),
    "quart": (946.0, "ml"),
    "gallon": (3785.0, "ml"),
}

_ALIASES = {"tbsp": "EL", "tablespoon": "EL", "tablespoons": "EL", "tsp": "TL", "teaspoon": "TL", "teaspoons": "TL"}


def _round_nice(value: float, unit: str) -> float:
    if unit in ("g", "ml"):
        if value >= 500:
            return float(round(value / 5) * 5)
        return float(round(value))
    return round(value, 1)


def convert_amount(menge: float | None, einheit: str | None) -> tuple[float | None, str | None, bool]:
    """Gibt (menge, einheit, umgerechnet) zurück. Unbekannte Einheiten bleiben unverändert."""
    if einheit is None:
        return menge, einheit, False
    key = einheit.strip().lower().rstrip(".")
    if key in _ALIASES:
        return menge, _ALIASES[key], False
    if key not in _FACTORS or menge is None:
        return menge, einheit, False
    factor, target = _FACTORS[key]
    return _round_nice(menge * factor, target), target, True


def fahrenheit_to_celsius(f: float) -> int:
    """Rundet auf 5 °C, wie im Backofen üblich."""
    c = (f - 32) * 5 / 9
    return int(round(c / 5) * 5)


_TEMP_RE = re.compile(r"(\d{2,3})\s*(?:°|º|grad)?\s*F\b", re.IGNORECASE)


def convert_temperatures(text: str) -> str:
    """Ersetzt '350°F' im Text durch '175 °C'."""
    return _TEMP_RE.sub(lambda m: f"{fahrenheit_to_celsius(float(m.group(1)))} °C", text)
