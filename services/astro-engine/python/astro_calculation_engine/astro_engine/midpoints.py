from __future__ import annotations
from datetime import datetime, timezone
from itertools import combinations
from .constants import DEFAULT_BODY_CODES
from .core import julian_day_ut, planet_positions
from .formatting import normalize_degrees, sign_info, raw_midpoint_value

def shortest_arc_midpoint(a: float, b: float) -> float:
    a = normalize_degrees(a); b = normalize_degrees(b)
    diff = (b - a + 540) % 360 - 180
    return normalize_degrees(a + diff / 2)

def midpoint_records_for_datetime(dt_utc: datetime, code_map: dict[str, str] | None = None, zodiac: str = "tropical", ayanamsa: str = "lahiri") -> list[dict]:
    if dt_utc.tzinfo is None:
        dt_utc = dt_utc.replace(tzinfo=timezone.utc)
    dt_utc = dt_utc.astimezone(timezone.utc)
    code_map = code_map or DEFAULT_BODY_CODES
    jd = julian_day_ut(dt_utc)
    bodies = sorted(set(code_map.values()))
    pos = planet_positions(jd, zodiac=zodiac, ayanamsa=ayanamsa, bodies=bodies)
    rows = []
    for c1, c2 in combinations(code_map.keys(), 2):
        b1, b2 = code_map[c1], code_map[c2]
        if b1 not in pos or b2 not in pos: continue
        mid = shortest_arc_midpoint(pos[b1]["absolute_longitude_degrees"], pos[b2]["absolute_longitude_degrees"])
        info = sign_info(mid)
        rows.append({
            "date_utc": dt_utc.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "time_basis": f"{dt_utc:%H:%M} UT",
            "midpoint_pair": f"{c1}/{c2}",
            "body1_code": c1, "body1_name": b1,
            "body2_code": c2, "body2_name": b2,
            "raw_value": raw_midpoint_value(mid),
            **{k: info[k] for k in ["degree_in_sign", "minute_in_sign", "sign_code", "sign_name", "absolute_longitude_degrees", "absolute_longitude_arcminutes"]},
            "normalization_status": "calculated_from_ephemeris",
            "calculation_validation_status": "calculated_not_pdf_validated",
            "confidence": "high",
            "requires_manual_review": False,
            "warning_codes": [],
        })
    return rows

def midpoint_ephemeris(start_date: str, end_date: str, hour_ut: int = 0, code_map: dict[str, str] | None = None) -> list[dict]:
    from datetime import date, timedelta
    s = date.fromisoformat(start_date); e = date.fromisoformat(end_date)
    rows = []; d = s
    while d <= e:
        dt = datetime(d.year, d.month, d.day, hour_ut, tzinfo=timezone.utc)
        daily = midpoint_records_for_datetime(dt, code_map=code_map)
        for r in daily:
            r.update({"year": d.year, "month": d.month, "day": d.day, "month_name": d.strftime("%B")})
        rows.extend(daily); d += timedelta(days=1)
    return rows
