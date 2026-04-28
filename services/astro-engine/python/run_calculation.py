#!/usr/bin/env python3
from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any


HERE = Path(__file__).resolve().parent
ENGINE_ROOT = HERE / "astro_calculation_engine"

if str(ENGINE_ROOT) not in sys.path:
    sys.path.insert(0, str(ENGINE_ROOT))

from app_adapter import calculate_app_output  # noqa: E402


MAX_STDIN_BYTES = 1_000_000


def write_stderr_error(code: str, exc: BaseException | None = None) -> None:
    payload: dict[str, Any] = {"error": code}
    if exc is not None:
        payload["type"] = type(exc).__name__
    sys.stderr.write(json.dumps(payload, separators=(",", ":")) + "\n")


def main() -> int:
    raw = sys.stdin.read()
    if len(raw.encode("utf-8")) > MAX_STDIN_BYTES:
        write_stderr_error("stdin_too_large")
        return 2
    try:
        payload = json.loads(raw or "{}")
    except Exception as exc:
        write_stderr_error("invalid_stdin_json", exc)
        return 2
    try:
        result = calculate_app_output(payload)
    except Exception as exc:
        write_stderr_error("python_calculation_failed", exc)
        return 1
    sys.stdout.write(json.dumps(result, ensure_ascii=False, separators=(",", ":")))
    sys.stdout.flush()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
