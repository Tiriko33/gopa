from typing import Literal

from pydantic import BaseModel, Field, field_validator

Kategorie = Literal["Frühstück", "Mittagessen", "Abendessen", "Dessert", "Snacks", "Sonstiges"]
Plattform = Literal["TikTok", "Instagram"]


class Zutat(BaseModel):
    gruppe: str | None = None
    name: str = Field(min_length=1)
    menge: float | None = None
    einheit: str | None = None
    original: str | None = None


class Schritt(BaseModel):
    nr: int
    text: str = Field(min_length=1)
    timer_min: int | None = None
    tipp: str | None = None


class Quelle(BaseModel):
    url: str
    plattform: Plattform
    creator: str | None = None


class Rezept(BaseModel):
    titel: str = Field(min_length=1)
    beschreibung: str = ""
    portionen: int = Field(ge=1, default=2)
    kategorie: Kategorie = "Sonstiges"
    zeit_vorbereitung_min: int | None = None
    zeit_kochen_min: int | None = None
    zutaten: list[Zutat] = Field(min_length=1)
    schritte: list[Schritt] = Field(min_length=1)
    tags: list[str] = []
    hinweise: list[str] = []
    quelle: Quelle

    @field_validator("schritte")
    @classmethod
    def _renumber(cls, v: list[Schritt]) -> list[Schritt]:
        for i, s in enumerate(v, start=1):
            s.nr = i
        return v


# JSON-Schema für Claude (ohne "quelle": die setzt das Backend selbst)
def claude_json_schema() -> dict:
    schema = Rezept.model_json_schema()
    schema["properties"].pop("quelle", None)
    schema["required"] = [r for r in schema.get("required", []) if r != "quelle"]
    return schema
