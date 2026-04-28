from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class BirthDetails:
    name: str
    date: str
    time: str
    latitude: float
    longitude: float
    timezone: str
    place: str | None
    house_system: str
    zodiac: str
    ayanamsa: str

