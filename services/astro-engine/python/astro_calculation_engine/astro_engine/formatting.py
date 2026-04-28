from __future__ import annotations


def format_longitude(value: float) -> str:
    degrees = int(value) % 30
    minutes = int(round((value - int(value)) * 60))
    return f"{degrees:02d}°{minutes:02d}'"

