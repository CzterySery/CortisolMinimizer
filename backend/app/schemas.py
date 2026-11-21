from typing import Literal

from pydantic import BaseModel, Field, HttpUrl


class Source(BaseModel):
    id: str
    title: str
    url: HttpUrl
    locator: str | None = None


class Card(BaseModel):
    id: str
    round_id: int = Field(ge=1, le=5)
    title: str
    description: str
    sources: list[Source] = Field(default_factory=list)


class Round(BaseModel):
    id: int = Field(ge=1, le=5)
    title: str
    description: str
    cards: list[Card] = Field(min_length=3, max_length=3)


class Catalog(BaseModel):
    rounds: list[Round] = Field(min_length=5, max_length=5)


class Statistic(BaseModel):
    id: Literal["money", "time", "happiness"]
    label: str
    value: int | None = None
    unit: str


class Preview(BaseModel):
    mode: Literal["preview"] = "preview"
    current_round: int = 1
    total_rounds: int = 5
    hand_size: int = 3
    statistics: list[Statistic]
    rounds: list[Round]
