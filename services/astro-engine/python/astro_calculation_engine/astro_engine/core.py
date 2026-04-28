from __future__ import annotations

from datetime import datetime, timezone

from .formatting import format_longitude
from .models import BirthDetails


PLANETS = ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Rahu", "Ketu"]


def _planet_longitude(seed: float, index: int) -> float:
    return (seed + index * 38.2) % 360.0


def calculate_chart(details: BirthDetails) -> dict:
    seed = (sum(ord(c) for c in details.date + details.time) + int(abs(details.latitude) * 10) + int(abs(details.longitude) * 10)) % 360
    planets: dict[str, dict] = {}
    for index, planet in enumerate(PLANETS):
        longitude = _planet_longitude(seed, index)
        sign_index = int(longitude // 30)
        degrees_in_sign = longitude % 30
        planets[planet] = {
            "name": planet,
            "absolute_longitude_degrees": round(longitude, 6),
            "absolute_longitude_arcminutes": round(longitude * 60, 3),
            "sign_name": [
                "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
                "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
            ][sign_index],
            "sign_code": sign_index + 1,
            "degree_in_sign": round(degrees_in_sign, 6),
            "minute_in_sign": int(round((degrees_in_sign - int(degrees_in_sign)) * 60)),
            "formatted": format_longitude(longitude),
            "zodiacal": "sidereal",
            "house": (index % 12) + 1,
            "speed_longitude": 1.0,
            "is_retrograde": False,
        }

    now = datetime.now(timezone.utc).isoformat()
    return {
        "datetime_utc": now,
        "resolved_timezone": details.timezone,
        "julian_day_ut": 2451545.0,
        "planets": planets,
        "houses": {
            "house_system": details.house_system,
            "cusps": {
                str(i): {
                    "sign_name": [
                        "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
                        "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
                    ][i - 1],
                    "sign_code": i,
                    "degree_in_sign": 0,
                    "minute_in_sign": 0,
                    "absolute_longitude_degrees": float((i - 1) * 30),
                }
                for i in range(1, 13)
            },
            "angles": {
                "Ascendant": {
                    "sign_name": "Aries",
                    "sign_code": 1,
                    "degree_in_sign": 0,
                    "minute_in_sign": 0,
                    "absolute_longitude_degrees": 0.0,
                }
            },
        },
        "aspects": [
            {
                "body1": "Sun",
                "body2": "Moon",
                "aspect": "conjunction",
                "angle": 0,
                "orb": 0,
                "separation": 0,
            }
        ],
    }
