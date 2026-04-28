from __future__ import annotations
from .constants import SIGN_CODE_MAPPING, SIGN_CODES, SIGN_NAMES

def normalize_degrees(deg: float) -> float:
    return deg % 360.0

def sign_info(abs_deg: float) -> dict:
    deg = normalize_degrees(abs_deg)
    idx = int(deg // 30)
    in_sign = deg - idx * 30
    whole_deg = int(in_sign)
    minute = int(round((in_sign - whole_deg) * 60))
    if minute == 60:
        whole_deg += 1; minute = 0
    if whole_deg == 30:
        idx = (idx + 1) % 12; whole_deg = 0
    return {
        "absolute_longitude_degrees": round(deg, 10),
        "absolute_longitude_arcminutes": int(round(deg * 60)) % 21600,
        "sign_name": SIGN_NAMES[idx],
        "sign_code": SIGN_CODES[idx],
        "degree_in_sign": whole_deg,
        "minute_in_sign": minute,
        "formatted": f"{whole_deg:02d}{SIGN_CODES[idx]}{minute:02d}",
        "zodiacal": f"{whole_deg:02d}°{minute:02d}' {SIGN_NAMES[idx]}",
    }

def raw_midpoint_value(abs_deg: float) -> str:
    i = sign_info(abs_deg)
    return f"{i['degree_in_sign']}{i['sign_code']}{i['minute_in_sign']:02d}"

def decode_sign_code_cell(raw: str) -> dict:
    s = raw.strip().replace(" ", "")
    if len(s) < 3:
        raise ValueError(f"Malformed sign-coded value: {raw!r}")
    sign_pos = next((i for i, ch in enumerate(s) if ch in SIGN_CODE_MAPPING), None)
    if sign_pos is None:
        raise ValueError(f"No known sign code in {raw!r}")
    deg = int(s[:sign_pos]); code = s[sign_pos]; minute = int(s[sign_pos + 1:] or "0")
    start = SIGN_CODE_MAPPING[code]["start_degree"]
    return {**sign_info(start + deg + minute / 60), "raw_value": raw}
