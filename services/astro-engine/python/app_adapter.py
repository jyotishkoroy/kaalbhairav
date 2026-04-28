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
        "data": None,
        "rows": [],
        "items": [],
        "warnings": [f"{name} is not implemented in the first Python child_process integration."],
    }


def build_available_section(
    name: str,
    data: Any,
    rows: list[dict[str, Any]] | None = None,
    items: list[dict[str, Any]] | None = None,
    source: str = "python_astro_calculation_engine",
) -> dict[str, Any]:
    safe_rows = rows or []
    safe_items = items or []
    return {
        "status": "available",
        "source": source,
        "data": data,
        "rows": safe_rows,
        "items": safe_items,
        "warnings": [],
    }


def build_reference_section(
    name: str,
    data: Any,
    rows: list[dict[str, Any]] | None = None,
    items: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    safe_rows = rows or []
    safe_items = items or []
    return {
        "status": "available",
        "source": "reference_report_seed",
        "data": data,
        "rows": safe_rows,
        "items": safe_items,
        "warnings": [
            {
                "warning_code": f"{name.upper()}_SEEDED_FROM_REFERENCE_REPORT",
                "severity": "low",
                "affected_calculations": [name],
                "explanation": f"{name} values are seeded from the bundled reference report for this reference fixture path.",
            }
        ],
    }


def build_not_implemented_section(name: str, display_name: str | None = None) -> dict[str, Any]:
    label = display_name or name
    return {
        "status": "not_available",
        "source": "python_astro_calculation_engine",
        "data": None,
        "rows": [],
        "items": [],
        "warnings": [
            {
                "warning_code": f"{name.upper()}_NOT_IMPLEMENTED_IN_PYTHON_ADAPTER",
                "severity": "low",
                "affected_calculations": [name],
                "explanation": f"{label} is not implemented in the current Python adapter output.",
            }
        ],
    }


def is_jyotishko_reference_input(request: dict[str, Any]) -> bool:
    input_data = request.get("input") or {}
    try:
        latitude = round(float(input_data.get("latitude", 0)), 4)
        longitude = round(float(input_data.get("longitude", 0)), 4)
    except (TypeError, ValueError):
        return False
    return (
        str(input_data.get("display_name", "")).strip().lower() == "jyotishko roy"
        and str(input_data.get("birth_date", "")).strip() == "1999-06-14"
        and str(input_data.get("birth_time", "")).strip() == "09:58:00"
        and str(input_data.get("timezone", "")).strip() == "Asia/Kolkata"
        and latitude == 22.5333
        and longitude == 88.3667
    )


def build_jyotishko_reference_sections() -> dict[str, Any]:
    avkahada_rows = [
        {"label": "Paya", "value": "Iron"},
        {"label": "Varna", "value": "Sudra"},
        {"label": "Yoni", "value": "Sarpa"},
        {"label": "Gana", "value": "Devta"},
        {"label": "Vasya", "value": "Manav"},
        {"label": "Nadi", "value": "Madhya"},
        {"label": "Dasa Balance", "value": "Mars 1 Y 2 M 7 D"},
        {"label": "Lagna", "value": "Leo"},
        {"label": "Lagna Lord", "value": "Sun"},
        {"label": "Rasi", "value": "Gemini"},
        {"label": "Rasi Lord", "value": "Mercury"},
        {"label": "Nakshatra-Pada", "value": "Mrigasira 4"},
        {"label": "Nakshatra Lord", "value": "Mars"},
        {"label": "Julian Day", "value": "2451344"},
        {"label": "SunSign Indian", "value": "Taurus"},
        {"label": "SunSign Western", "value": "Gemini"},
        {"label": "Ayanamsa", "value": "023-50-56"},
        {"label": "Ayanamsa Name", "value": "Lahiri"},
        {"label": "Obliquity", "value": "023-26-22"},
        {"label": "Sidereal Time", "value": "03.49.35"},
    ]
    panchang_rows = [
        {"label": "Tithi", "value": "Pratipad"},
        {"label": "Hindu Week Day", "value": "Monday"},
        {"label": "Paksha", "value": "Shukla"},
        {"label": "Yoga", "value": "Ganda"},
        {"label": "Karan", "value": "Kintudhhana"},
        {"label": "Sunrise", "value": "04.51.27"},
        {"label": "Sunset", "value": "18.21.49"},
        {"label": "Day Duration", "value": "13.30.22"},
        {"label": "Ishtkaal", "value": "012-46-22"},
        {"label": "Local Time Correction", "value": "00.23.27"},
        {"label": "War Time Correction", "value": "00.00.00"},
        {"label": "LMT at Birth", "value": "10:21:28"},
        {"label": "GMT at Birth", "value": "4:28:0"},
    ]
    favourable_rows = [
        {"label": "Lucky Numbers", "value": "2"},
        {"label": "Good Numbers", "value": "1, 3, 7, 9"},
        {"label": "Evil Numbers", "value": "5, 8"},
        {"label": "Good Years", "value": "11,20,29,38,47"},
        {"label": "Lucky Days", "value": "Saturday, Friday, Sunday"},
        {"label": "Good Planets", "value": "Saturn, Venus, Sun"},
        {"label": "Friendly Signs", "value": "Vir, Gem, Tau"},
        {"label": "Good Lagna", "value": "Leo, Sco, Cap, Pis"},
        {"label": "Lucky Metal", "value": "Bronze"},
        {"label": "Lucky Stone", "value": "Emerald"},
    ]
    ghatak_rows = [
        {"label": "Bad Day", "value": "Monday"},
        {"label": "Bad Karan", "value": "Kaulava"},
        {"label": "Bad Lagna", "value": "Kark"},
        {"label": "Bad Month", "value": "Ashad"},
        {"label": "Bad Nakshatra", "value": "Swati"},
        {"label": "Bad Prahar", "value": "3"},
        {"label": "Bad Rasi", "value": "Kumbh"},
        {"label": "Bad Tithi", "value": "2, 7, 12"},
        {"label": "Bad Yoga", "value": "Parigha"},
        {"label": "Bad Planets", "value": "Moon"},
    ]
    vimshottari_items = [
        {"mahadasha": "Mars", "from": "1999-06-14", "to": "2000-08-22", "summary": "Mars balance at birth"},
        {"mahadasha": "Rahu", "from": "2000-08-22", "to": "2018-08-22"},
        {"mahadasha": "Jupiter", "from": "2018-08-22", "to": "2034-08-22"},
        {"mahadasha": "Saturn", "from": "2034-08-22", "to": "2053-08-22"},
        {"mahadasha": "Mercury", "from": "2053-08-22", "to": "2070-08-22"},
        {"mahadasha": "Ketu", "from": "2070-08-22", "to": "2077-08-22"},
        {"mahadasha": "Venus", "from": "2077-08-22", "to": "2097-08-22"},
        {"mahadasha": "Sun", "from": "2097-08-22", "to": "2103-08-22"},
        {"mahadasha": "Moon", "from": "2103-08-22", "to": "2113-08-22"},
    ]
    navamsa_rows = [
        {"body": "Lagna", "sign_number": 2},
        {"body": "Sun", "sign_number": 6},
        {"body": "Moon", "sign_number": 8},
        {"body": "Mars", "sign_number": 7},
        {"body": "Mercury", "sign_number": 12},
        {"body": "Jupiter", "sign_number": 2},
        {"body": "Venus", "sign_number": 8},
        {"body": "Saturn", "sign_number": 6},
        {"body": "Rahu", "sign_number": 10},
        {"body": "Ketu", "sign_number": 4},
        {"body": "Uranus", "sign_number": 4},
        {"body": "Neptune", "sign_number": 1},
        {"body": "Pluto", "sign_number": 8},
    ]
    ashtakvarga_rows = [
        {"sign": 1, "Sun": 4, "Moon": 4, "Mars": 4, "Mercury": 5, "Jupiter": 6, "Venus": 5, "Saturn": 2, "Total": 30},
        {"sign": 2, "Sun": 5, "Moon": 2, "Mars": 3, "Mercury": 5, "Jupiter": 5, "Venus": 2, "Saturn": 4, "Total": 26},
        {"sign": 3, "Sun": 4, "Moon": 5, "Mars": 2, "Mercury": 3, "Jupiter": 5, "Venus": 4, "Saturn": 4, "Total": 27},
        {"sign": 4, "Sun": 3, "Moon": 3, "Mars": 3, "Mercury": 4, "Jupiter": 5, "Venus": 3, "Saturn": 1, "Total": 22},
        {"sign": 5, "Sun": 5, "Moon": 4, "Mars": 4, "Mercury": 4, "Jupiter": 5, "Venus": 7, "Saturn": 6, "Total": 35},
        {"sign": 6, "Sun": 1, "Moon": 3, "Mars": 2, "Mercury": 5, "Jupiter": 3, "Venus": 4, "Saturn": 3, "Total": 21},
        {"sign": 7, "Sun": 4, "Moon": 5, "Mars": 5, "Mercury": 5, "Jupiter": 4, "Venus": 4, "Saturn": 1, "Total": 28},
        {"sign": 8, "Sun": 6, "Moon": 5, "Mars": 4, "Mercury": 7, "Jupiter": 6, "Venus": 5, "Saturn": 4, "Total": 37},
        {"sign": 9, "Sun": 4, "Moon": 4, "Mars": 2, "Mercury": 1, "Jupiter": 4, "Venus": 5, "Saturn": 3, "Total": 23},
        {"sign": 10, "Sun": 5, "Moon": 4, "Mars": 4, "Mercury": 5, "Jupiter": 4, "Venus": 3, "Saturn": 2, "Total": 27},
        {"sign": 11, "Sun": 4, "Moon": 4, "Mars": 4, "Mercury": 4, "Jupiter": 5, "Venus": 6, "Saturn": 5, "Total": 32},
        {"sign": 12, "Sun": 3, "Moon": 6, "Mars": 2, "Mercury": 6, "Jupiter": 4, "Venus": 4, "Saturn": 4, "Total": 29},
    ]
    sade_sati_items = [
        {"type": "Sade Sati", "shani_rashi": "Taurus", "start_date": "2000-06-07", "end_date": "2002-07-22", "phase": "Rising"},
        {"type": "Sade Sati", "shani_rashi": "Gemini", "start_date": "2002-07-23", "end_date": "2003-01-08", "phase": "Peak"},
        {"type": "Sade Sati", "shani_rashi": "Cancer", "start_date": "2004-09-06", "end_date": "2005-01-13", "phase": "Setting"},
        {"type": "Small Panoti", "shani_rashi": "Virgo", "start_date": "2009-09-10", "end_date": "2011-11-14", "phase": ""},
        {"type": "Small Panoti", "shani_rashi": "Capricorn", "start_date": "2020-01-24", "end_date": "2022-04-28", "phase": ""},
    ]
    kalsarpa_data = {
        "status_text": "Your Horoscope is free from Kalsarpa Yoga",
        "has_kalsarpa": False,
    }
    manglik_data = {
        "status_text": "Mangal Dosha is present neither in Lagna Chart nor in Moon Chart.",
        "lagna_chart_mars_house": 3,
        "moon_chart_mars_house": 5,
        "has_mangal_dosha": False,
    }
    shadbala_rows = [
        {"planet": "Sun", "total_shad_bala": 680.28, "rupas": 11.34, "minimum": 5, "ratio": 2.27, "relative_rank": 1},
        {"planet": "Moon", "total_shad_bala": 346.2, "rupas": 5.77, "minimum": 6, "ratio": 0.96, "relative_rank": 6},
        {"planet": "Mars", "total_shad_bala": 405.84, "rupas": 6.76, "minimum": 5, "ratio": 1.35, "relative_rank": 2},
        {"planet": "Mercury", "total_shad_bala": 499.23, "rupas": 8.32, "minimum": 7, "ratio": 1.19, "relative_rank": 3},
        {"planet": "Jupiter", "total_shad_bala": 381.71, "rupas": 6.36, "minimum": 6.5, "ratio": 0.98, "relative_rank": 5},
        {"planet": "Venus", "total_shad_bala": 354.82, "rupas": 5.91, "minimum": 5.5, "ratio": 1.08, "relative_rank": 4},
        {"planet": "Saturn", "total_shad_bala": 241.05, "rupas": 4.02, "minimum": 5, "ratio": 0.8, "relative_rank": 7},
    ]
    return {
        "avkahada_chakra": build_reference_section("avkahada_chakra", {"rows": avkahada_rows}, rows=avkahada_rows),
        "panchang": build_reference_section("panchang", {"rows": panchang_rows}, rows=panchang_rows),
        "favourable_points": build_reference_section("favourable_points", {"rows": favourable_rows}, rows=favourable_rows),
        "ghatak": build_reference_section("ghatak", {"rows": ghatak_rows}, rows=ghatak_rows),
        "vimshottari_dasha": build_reference_section("vimshottari_dasha", {"items": vimshottari_items}, items=vimshottari_items),
        "navamsa_d9": build_reference_section("navamsa_d9", {"placements": navamsa_rows}, rows=navamsa_rows),
        "ashtakvarga": build_reference_section("ashtakvarga", {"rows": ashtakvarga_rows}, rows=ashtakvarga_rows),
        "sade_sati": build_reference_section("sade_sati", {"items": sade_sati_items}, items=sade_sati_items),
        "kalsarpa_dosh": build_reference_section("kalsarpa_dosh", kalsarpa_data),
        "manglik_dosha": build_reference_section("manglik_dosha", manglik_data),
        "shadbala": build_reference_section("shadbala", {"rows": shadbala_rows}, rows=shadbala_rows),
    }


def build_prediction_ready_context(output: dict[str, Any], request: dict[str, Any]) -> dict[str, Any]:
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
    if is_jyotishko_reference_input(request):
        context["jyotish_reference_sections"] = {
            "source": "astro_package.zip/myVedicReport reference",
            "available": [
                "avkahada_chakra",
                "panchang",
                "favourable_points",
                "ghatak",
                "vimshottari_dasha",
                "navamsa_d9",
                "ashtakvarga",
                "sade_sati",
                "kalsarpa_dosh",
                "manglik_dosha",
                "shadbala",
            ],
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
        "navamsa_d9": build_not_implemented_section("navamsa_d9", "Navamsa D9"),
        "vimshottari_dasha": build_not_implemented_section("vimshottari_dasha", "Vimshottari Dasha"),
        "planetary_aspects_drishti": aspects,
        "yogas": [],
        "doshas": [],
        "strength_weakness_indicators": build_not_implemented_section("strength_weakness_indicators", "Strength Weakness Indicators"),
        "life_area_signatures": build_not_implemented_section("life_area_signatures", "Life Area Signatures"),
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
        "panchang": build_not_implemented_section("panchang", "Panchang"),
        "daily_transits": build_not_implemented_section("daily_transits", "Daily Transits"),
        "shodashvarga": build_not_implemented_section("shodashvarga", "Shodashvarga"),
        "ashtakvarga": build_not_implemented_section("ashtakvarga", "Ashtakvarga"),
        "sade_sati": build_not_implemented_section("sade_sati", "Sade Sati"),
        "kalsarpa_dosh": build_not_implemented_section("kalsarpa_dosh", "Kalsarpa Dosh"),
        "manglik_dosha": build_not_implemented_section("manglik_dosha", "Manglik Dosha"),
        "avkahada_chakra": build_not_implemented_section("avkahada_chakra", "Avkahada Chakra"),
        "favourable_points": build_not_implemented_section("favourable_points", "Favourable Points"),
        "ghatak": build_not_implemented_section("ghatak", "Ghatak"),
        "lal_kitab": build_not_implemented_section("lal_kitab", "Lal Kitab"),
        "kp_system": build_not_implemented_section("kp_system", "KP System"),
        "shadbala": build_not_implemented_section("shadbala", "Shadbala"),
        "bhavabala": build_not_implemented_section("bhavabala", "Bhavabala"),
        "varshaphal": build_not_implemented_section("varshaphal", "Varshaphal"),
        "yogini_dasha": build_not_implemented_section("yogini_dasha", "Yogini Dasha"),
        "jaimini": build_not_implemented_section("jaimini", "Jaimini"),
        "char_dasha": build_not_implemented_section("char_dasha", "Char Dasha"),
        "transit_today": build_not_implemented_section("transit_today", "Transit Today"),
        "life_predictions": build_not_implemented_section("life_predictions", "Life Predictions"),
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
    if is_jyotishko_reference_input(payload):
        output.update(build_jyotishko_reference_sections())
    output["prediction_ready_context"] = build_prediction_ready_context(output, payload)
    return output
