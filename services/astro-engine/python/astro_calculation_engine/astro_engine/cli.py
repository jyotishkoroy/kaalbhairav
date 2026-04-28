from __future__ import annotations
import argparse, json
from datetime import datetime, timezone
from .models import BirthDetails
from .core import calculate_chart
from .midpoints import midpoint_records_for_datetime, midpoint_ephemeris
from .exporters import export_astro_package_like, write_json, write_csv

def main() -> None:
    p = argparse.ArgumentParser(description="Astrology calculation engine")
    p.add_argument("--name", default="Native")
    p.add_argument("--date", required=True, help="Birth date YYYY-MM-DD")
    p.add_argument("--time", required=True, help="Birth time HH:MM[:SS] local")
    p.add_argument("--lat", type=float, required=True)
    p.add_argument("--lon", type=float, required=True)
    p.add_argument("--tz", default=None)
    p.add_argument("--place", default=None)
    p.add_argument("--zodiac", choices=["tropical", "sidereal"], default="tropical")
    p.add_argument("--ayanamsa", default="lahiri")
    p.add_argument("--house-system", default="P")
    p.add_argument("--out", default="astro_output")
    p.add_argument("--ephemeris-start", help="Optional YYYY-MM-DD for package-like daily midpoint ephemeris")
    p.add_argument("--ephemeris-end", help="Optional YYYY-MM-DD")
    args = p.parse_args()
    details = BirthDetails(args.name, args.date, args.time, args.lat, args.lon, args.tz, args.place, args.house_system, args.zodiac, args.ayanamsa)
    chart = calculate_chart(details)
    birth_dt_utc = datetime.fromisoformat(chart["datetime_utc"]).astimezone(timezone.utc)
    mids = midpoint_records_for_datetime(birth_dt_utc, zodiac=args.zodiac, ayanamsa=args.ayanamsa)
    if args.ephemeris_start and args.ephemeris_end:
        mids = midpoint_ephemeris(args.ephemeris_start, args.ephemeris_end)
    export_astro_package_like(args.out, chart, mids)
    print(json.dumps({"output": args.out, "midpoint_records": len(mids), "datetime_utc": chart["datetime_utc"]}, indent=2))

if __name__ == "__main__":
    main()
