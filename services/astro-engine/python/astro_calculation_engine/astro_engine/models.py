from __future__ import annotations
from dataclasses import dataclass, asdict
from datetime import datetime
from typing import Optional

@dataclass
class BirthDetails:
    name: str
    date: str              # YYYY-MM-DD
    time: str              # HH:MM[:SS], local civil time
    latitude: float
    longitude: float
    timezone: Optional[str] = None
    place: Optional[str] = None
    house_system: str = "P"  # Placidus
    zodiac: str = "tropical" # tropical or sidereal
    ayanamsa: str = "lahiri"

    def asdict(self):
        return asdict(self)
