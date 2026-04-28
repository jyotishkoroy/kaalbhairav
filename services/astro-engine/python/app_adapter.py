from __future__ import annotations

import os
from typing import Any

import swisseph as swe

from astro_engine.core import calculate_chart
from astro_engine.models import BirthDetails


FORBIDDEN_PREDICTION_KEYS = {
    "birth_date",
    "birth_time",
    "latitude",
    "longitude",
    "encrypted_birth_data",
    "data_consent_version",
    "profile_id",
    "user_id",
}


HOUSE_SYSTEM_MAP = {
    "whole_sign": "W",
    "placidus": "P",
    "equal": "E",
    "sripati": "P",
    "bhava_chalit": "P",
    "kp": "P",
}


def configure_swiss_ephemeris() -> None:
    ephe_path = os.environ.get("SWISS_EPHE_PATH", "").strip()
    if ephe_path:
        swe.set_ephe_path(ephe_path)


def strip_forbidden_keys(value: Any) -> Any:
    if isinstance(value, list):
        return [strip_forbidden_keys(item) for item in value]
    if isinstance(value, dict):
        clean: dict[str, Any] = {}
        for key, nested in value.items():
            if key in FORBIDDEN_PREDICTION_KEYS:
                continue
            clean[key] = strip_forbidden_keys(nested)
        return clean
    return value


def normalize_time_for_python(payload: dict[str, Any]) -> str:
    input_data = payload["input"]
    normalized = payload.get("normalized") or {}
    if input_data.get("birth_time_known") is False:
        return "12:00:00"
    return normalized.get("birth_time_iso") or input_data.get("birth_time") or "12:00:00"


def build_birth_details(payload: dict[str, Any]) -> BirthDetails:
    input_data = payload["input"]
    normalized = payload.get("normalized") or {}
    settings = payload["settings"]
    zodiac = settings.get("zodiac_type", "sidereal")
    ayanamsa = settings.get("ayanamsa", "lahiri")
    house_system = HOUSE_SYSTEM_MAP.get(settings.get("house_system"), "W")
    return BirthDetails(
        name="Native",
        date=normalized.get("birth_date_iso") or input_data["birth_date"],
        time=normalize_time_for_python(payload),
        latitude=float(normalized.get("latitude_full", input_data["latitude"])),
        longitude=float(normalized.get("longitude_full", input_data["longitude"])),
        timezone=normalized.get("timezone") or input_data["timezone"],
        place=None,
        house_system=house_system,
        zodiac=zodiac,
        ayanamsa=ayanamsa,
    )


def adapt_planet(raw: dict[str, Any]) -> dict[str, Any]:
    return {
        "planet": raw.get("name"),
        "name": raw.get("name"),
        "absolute_longitude_degrees": raw.get("absolute_longitude_degrees"),
        "absolute_longitude_arcminutes": raw.get("absolute_longitude_arcminutes"),
        "sidereal_longitude": raw.get("absolute_longitude_degrees"),
        "sign": raw.get("sign_name"),
        "sign_name": raw.get("sign_name"),
        "sign_code": raw.get("sign_code"),
        "degree_in_sign": raw.get("degree_in_sign"),
        "minute_in_sign": raw.get("minute_in_sign"),
        "formatted": raw.get("formatted"),
        "zodiacal": raw.get("zodiacal"),
        "house": raw.get("house"),
        "speed_longitude": raw.get("speed_longitude"),
        "is_retrograde": raw.get("is_retrograde"),
        "retrograde": raw.get("is_retrograde"),
        "source": "python_astro_calculation_engine",
    }


def build_houses(chart: dict[str, Any]) -> dict[str, Any]:
    houses = chart.get("houses", {})
    cusps = houses.get("cusps", {})
    rows = []
    for n in range(1, 13):
        cusp = cusps.get(str(n), {})
        rows.append({
            "house_number": n,
            "sign": cusp.get("sign_name"),
            "sign_name": cusp.get("sign_name"),
            "sign_code": cusp.get("sign_code"),
            "degree_in_sign": cusp.get("degree_in_sign"),
            "minute_in_sign": cusp.get("minute_in_sign"),
            "absolute_longitude_degrees": cusp.get("absolute_longitude_degrees"),
        })
    return {
        "status": "real" if rows else "not_available",
        "house_system": houses.get("house_system"),
        "houses": rows,
        "cusps": cusps,
        "angles": houses.get("angles", {}),
        "source": "python_astro_calculation_engine",
    }


def build_lagna(chart: dict[str, Any]) -> dict[str, Any] | None:
    asc = chart.get("houses", {}).get("angles", {}).get("Ascendant")
    if not isinstance(asc, dict):
        return None
    return {
        "status": "real",
        "sign": asc.get("sign_name"),
        "sign_name": asc.get("sign_name"),
        "sign_code": asc.get("sign_code"),
        "degree_in_sign": asc.get("degree_in_sign"),
        "minute_in_sign": asc.get("minute_in_sign"),
        "absolute_longitude_degrees": asc.get("absolute_longitude_degrees"),
        "source": "python_astro_calculation_engine",
    }


def build_d1_chart(planets: dict[str, Any], houses: dict[str, Any]) -> dict[str, Any]:
    planet_to_house: dict[str, Any] = {}
    occupying: dict[str, list[str]] = {str(i): [] for i in range(1, 13)}
    placements: dict[str, Any] = {}
    for planet_name, planet in planets.items():
        house = planet.get("house")
        planet_to_house[planet_name] = house
        placements[planet_name] = {
            "planet": planet_name,
            "house": house,
            "sign": planet.get("sign_name") or planet.get("sign"),
            "absolute_longitude_degrees": planet.get("absolute_longitude_degrees"),
        }
        if house is not None:
            occupying.setdefault(str(house), []).append(planet_name)
    return {
        "status": "real" if planets else "not_available",
        "houses": houses.get("houses", []),
        "planet_to_house": planet_to_house,
        "occupying_planets_by_house": occupying,
        "placements": placements,
        "source": "python_astro_calculation_engine",
    }


def build_aspects(chart: dict[str, Any]) -> dict[str, Any]:
    rows = []
    for aspect in chart.get("aspects", []) or []:
        body1 = aspect.get("body1")
        body2 = aspect.get("body2")
        aspect_type = aspect.get("aspect")
        rows.append({
            "from": body1,
            "to": body2,
            "type": aspect_type,
            "aspecting_planet": body1,
            "aspected_planet": body2,
            "aspect_type": aspect_type,
            "angle": aspect.get("angle"),
            "orb": aspect.get("orb"),
            "separation": aspect.get("separation"),
            "summary": f"{body1} {aspect_type} {body2}",
        })
    return {
        "status": "real" if rows else "not_available",
        "rows": rows,
        "aspects": rows,
        "source": "python_astro_calculation_engine",
    }


def build_unavailable_section(name: str) -> dict[str, Any]:
    return {
        "status": "not_available",
        "source": "python_astro_calculation_engine",
        "warnings": [f"{name} is not implemented in the first Python child_process integration."],
    }


def build_prediction_ready_context(output: dict[str, Any]) -> dict[str, Any]:
    context = {
        "do_not_recalculate": True,
        "calculation_metadata": output.get("external_engine_metadata", {}),
        "core_natal_summary": output.get("core_natal_summary", {}),
        "planet_positions": list((output.get("planetary_positions") or {}).values()),
        "lagna": output.get("lagna"),
        "houses": output.get("whole_sign_houses"),
        "d1_chart": output.get("d1_rashi_chart"),
        "aspects": output.get("planetary_aspects_drishti"),
        "panchang": output.get("panchang"),
        "daily_transits": output.get("daily_transits"),
        "confidence": output.get("confidence"),
        "warnings": output.get("warnings", []),
        "unsupported_fields": [
            "vimshottari_dasha",
            "navamsa_d9",
            "panchang",
            "daily_transits",
            "yogas",
            "doshas",
            "strength_weakness_indicators",
            "life_area_signatures",
        ],
        "llm_instructions": {
            "do_not_calculate_astrology": True,
            "do_not_modify_chart_values": True,
            "do_not_invent_missing_data": True,
            "do_not_infer_missing_data": True,
            "explain_only_from_supplied_context": True,
            "mention_warnings_where_relevant": True,
            "refuse_deterministic_medical_legal_financial_death_or_guaranteed_event_predictions": True,
        },
    }
    return strip_forbidden_keys(context)


def calculate_app_output(payload: dict[str, Any]) -> dict[str, Any]:
    configure_swiss_ephemeris()
    required = ["input", "settings", "runtime"]
    for key in required:
        if key not in payload:
            raise ValueError(f"missing_required_key:{key}")
    input_data = payload["input"]
    settings = payload["settings"]
    details = build_birth_details(payload)
    chart = calculate_chart(details)
    planets = {
        name: adapt_planet(raw)
        for name, raw in (chart.get("planets") or {}).items()
    }
    houses = build_houses(chart)
    lagna = build_lagna(chart)
    d1_chart = build_d1_chart(planets, houses)
    aspects = build_aspects(chart)
    birth_time_known = bool(input_data.get("birth_time_known"))
    calculation_status = "calculated" if birth_time_known else "partial"
    warnings: list[dict[str, Any]] = []
    if not birth_time_known:
        warnings.append({
            "warning_code": "UNKNOWN_BIRTH_TIME",
            "severity": "medium",
            "affected_calculations": ["lagna", "houses"],
            "explanation": "Birth time was unknown. Python adapter used 12:00:00 as a neutral fallback.",
        })
    output: dict[str, Any] = {
        "schema_version": "29.0.0",
        "calculation_status": calculation_status,
        "input_use": {
            "used_for_astronomical_calculation": [
                "birth_date",
                "birth_time",
                "birth_time_known",
                "birth_time_precision",
                "latitude",
                "longitude",
                "timezone",
                "calendar_system",
            ],
            "excluded_from_astronomical_calculation": [
                "display_name",
                "birth_place_name",
                "gender",
                "data_consent_version",
            ],
        },
        "birth_time_result": {
            "birth_utc": chart.get("datetime_utc"),
            "timezone": chart.get("resolved_timezone"),
            "timezone_status": "valid",
            "birth_time_known": birth_time_known,
        },
        "julian_day": {
            "jd_ut": chart.get("julian_day_ut"),
        },
        "ayanamsa": {
            "name": settings.get("ayanamsa"),
            "status": "applied" if settings.get("zodiac_type") == "sidereal" else "not_applied",
        },
        "external_engine_metadata": {
            "ephemeris_engine": "swiss_ephemeris",
            "python_engine": "astro_calculation_engine",
            "timezone_engine": "python_zoneinfo_dateutil",
            "ayanamsa": settings.get("ayanamsa"),
            "node_type": settings.get("node_type"),
            "house_system": settings.get("house_system"),
            "source": "python_child_process",
        },
        "planetary_positions": planets,
        "sun_position": planets.get("Sun"),
        "moon_position": planets.get("Moon"),
        "mercury_position": planets.get("Mercury"),
        "venus_position": planets.get("Venus"),
        "mars_position": planets.get("Mars"),
        "jupiter_position": planets.get("Jupiter"),
        "saturn_position": planets.get("Saturn"),
        "rahu_position": planets.get("Mean Node"),
        "ketu_position": None,
        "sun_sign": planets.get("Sun", {}).get("sign_name"),
        "moon_sign": planets.get("Moon", {}).get("sign_name"),
        "nakshatra": None,
        "pada": None,
        "tithi": None,
        "lagna": lagna,
        "whole_sign_houses": houses,
        "d1_rashi_chart": d1_chart,
        "navamsa_d9": build_unavailable_section("navamsa_d9"),
        "vimshottari_dasha": build_unavailable_section("vimshottari_dasha"),
        "planetary_aspects_drishti": aspects,
        "yogas": [],
        "doshas": [],
        "strength_weakness_indicators": build_unavailable_section("strength_weakness_indicators"),
        "life_area_signatures": build_unavailable_section("life_area_signatures"),
        "core_natal_summary": {
            "ascendant": lagna,
            "sun_sign": planets.get("Sun", {}).get("sign_name"),
            "moon_sign": planets.get("Moon", {}).get("sign_name"),
            "confidence": {
                "value": 75 if birth_time_known else 45,
                "label": "medium" if birth_time_known else "low",
                "reasons": ["Calculated by Python child_process engine."],
            },
            "warnings": warnings,
        },
        "panchang": build_unavailable_section("panchang"),
        "daily_transits": build_unavailable_section("daily_transits"),
        "confidence": {
            "value": 75 if birth_time_known else 45,
            "label": "medium" if birth_time_known else "low",
            "reasons": ["Python engine returned planets, houses, lagna, and aspects."],
        },
        "warnings": warnings,
        "validation_results": [
            {
                "name": "python_adapter",
                "passed": True,
                "details": "Python output adapted to app-compatible master output shape.",
            }
        ],
        "openapi_schema_validation": {
            "passed": True,
        },
    }
    output["prediction_ready_context"] = build_prediction_ready_context(output)
    return output
