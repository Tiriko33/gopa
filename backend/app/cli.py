"""CLI: python -m app.cli <link> [--text "Rezepttext"]  -> gibt das Rezept als JSON aus."""
import argparse
import json
import sys

from .config import load_settings
from .pipeline import PipelineInput, run_pipeline
from .sources import PipelineError


def main() -> int:
    ap = argparse.ArgumentParser(prog="gopa")
    ap.add_argument("link")
    ap.add_argument("--text", default="", help="Fallback: Rezepttext einfügen")
    args = ap.parse_args()
    try:
        rezept = run_pipeline(PipelineInput(args.link, args.text), load_settings(),
                              progress=lambda s: print(f"[{s}]", file=sys.stderr))
    except (PipelineError, ValueError) as e:
        print(f"FEHLER ({getattr(e, 'code', 'ungueltig')}): {e}", file=sys.stderr)
        return 1
    print(json.dumps(rezept.model_dump(), ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
