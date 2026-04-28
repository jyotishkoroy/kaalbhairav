from __future__ import annotations
from datetime import datetime, timezone
from zoneinfo import ZoneInfo
from dateutil import parser
from timezonefinder import TimezoneFinder
import swisseph as swe
from .constants import STANDARD_BODIES, ASPECTS
from .formatting import sign_info, normalize_degrees
from .models import BirthDetails

SWE_BODIES = {
    "Sun": swe.SUN, "Moon": swe.MOON, "Mercury": swe.MERCURY, "Venus": swe.VENUS,
    "Mars": swe.MARS, "Jupiter": swe.JUPITER, "Saturn": swe.SATURN,
    "Uranus": swe.URANUS, "Neptune": swe.NEPTUNE, "Pluto": swe.PLUTO,
    "True Node": swe.TRUE_NODE, "Mean Node": swe.MEAN_NODE, "Chiron": swe.CHIRON,
}
AYANAMSA = {"lahiri": swe.SIDM_LAHIRI, "raman": swe.SIDM_RAMAN, "krishnamurti": swe.SIDM_KRISHNAMURTI, "fagan_bradley": swe.SIDM_FAGAN_BRADLEY}

def resolve_timezone(lat: float, lon: float, tz: str | None = None) -> str:
    if tz:
        return tz
    found = TimezoneFinder().timezone_at(lat=lat, lng=lon)
    if not found:
        raise ValueError("Timezone could not be resolved; pass timezone explicitly, e.g. 'Asia/Kolkata'.")
    return found

def local_to_utc(details: BirthDetails) -> datetime:
    tz_name = resolve_timezone(details.latitude, details.longitude, details.timezone)
    local = parser.parse(f"{details.date} {details.time}").replace(tzinfo=ZoneInfo(tz_name))
    return local.astimezone(timezone.utc)

def julian_day_ut(dt_utc: datetime) -> float:
    return swe.julday(dt_utc.year, dt_utc.month, dt_utc.day, dt_utc.hour + dt_utc.minute/60 + dt_utc.second/3600)

def configure_zodiac(zodiac: str, ayanamsa: str) -> int:
    flags = swe.FLG_SWIEPH | swe.FLG_SPEED
    if zodiac.lower() == "sidereal":
        swe.set_sid_mode(AYANAMSA.get(ayanamsa.lower(), swe.SIDM_LAHIRI))
        flags |= swe.FLG_SIDEREAL
    elif zodiac.lower() != "tropical":
        raise ValueError("zodiac must be 'tropical' or 'sidereal'")
    return flags

def planet_positions(jd_ut: float, zodiac: str = "tropical", ayanamsa: str = "lahiri", bodies: list[str] | None = None) -> dict:
    flags = configure_zodiac(zodiac, ayanamsa)
    out = {}
    for name in (bodies or STANDARD_BODIES):
        if name not in SWE_BODIES:
            continue
        vals, ret = swe.calc_ut(jd_ut, SWE_BODIES[name], flags)
        lon, lat, dist, speed_lon = vals[0], vals[1], vals[2], vals[3]
        info = sign_info(lon)
        out[name] = {"name": name, **info, "latitude": lat, "distance_au": dist, "speed_longitude": speed_lon, "is_retrograde": speed_lon < 0}
    return out

def house_cusps(jd_ut: float, lat: float, lon: float, house_system: str = "P") -> dict:
    cusps, ascmc = swe.houses_ex(jd_ut, lat, lon, house_system.encode("ascii")[:1])
    names = ["Ascendant", "MC", "ARMC", "Vertex", "Equatorial Asc", "Co-Asc Koch", "Co-Asc Munkasey", "Polar Asc"]
    return {
        "house_system": house_system,
        "cusps": {str(i+1): sign_info(cusps[i]) for i in range(12)},
        "angles": {names[i]: sign_info(ascmc[i]) for i in range(min(len(ascmc), len(names)))}
    }

def assign_houses(positions: dict, cusps: dict) -> dict:
    starts = [cusps["cusps"][str(i)]["absolute_longitude_degrees"] for i in range(1, 13)]
    def in_arc(x, a, b):
        x = normalize_degrees(x); a = normalize_degrees(a); b = normalize_degrees(b)
        return a <= x < b if a < b else x >= a or x < b
    result = {}
    for name, p in positions.items():
        house = 12
        for i in range(12):
            if in_arc(p["absolute_longitude_degrees"], starts[i], starts[(i+1) % 12]):
                house = i + 1; break
        result[name] = {**p, "house": house}
    return result

def angular_distance(a: float, b: float) -> float:
    d = abs((a - b + 180) % 360 - 180)
    return d

def aspects(positions: dict, orb: float = 6.0) -> list[dict]:
    names = list(positions.keys()); rows = []
    for i, a in enumerate(names):
        for b in names[i+1:]:
            sep = angular_distance(positions[a]["absolute_longitude_degrees"], positions[b]["absolute_longitude_degrees"])
            for aspect, exact in ASPECTS.items():
                delta = abs(sep - exact)
                if delta <= orb:
                    rows.append({"body1": a, "body2": b, "aspect": aspect, "angle": exact, "orb": round(delta, 4), "separation": round(sep, 4)})
    return sorted(rows, key=lambda r: (r["orb"], r["body1"], r["body2"]))

def calculate_chart(details: BirthDetails, orb: float = 6.0) -> dict:
    utc = local_to_utc(details)
    jd = julian_day_ut(utc)
    positions = planet_positions(jd, details.zodiac, details.ayanamsa)
    houses = house_cusps(jd, details.latitude, details.longitude, details.house_system)
    positions = assign_houses(positions, houses)
    return {
        "input": details.asdict(),
        "resolved_timezone": resolve_timezone(details.latitude, details.longitude, details.timezone),
        "datetime_utc": utc.isoformat(),
        "julian_day_ut": jd,
        "zodiac": details.zodiac,
        "ayanamsa": details.ayanamsa if details.zodiac == "sidereal" else None,
        "planets": positions,
        "houses": houses,
        "aspects": aspects(positions, orb=orb),
    }
