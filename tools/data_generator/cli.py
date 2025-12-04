from __future__ import annotations

import argparse
from argparse import ArgumentParser, BooleanOptionalAction
from datetime import UTC, datetime
from pathlib import Path
from typing import Sequence

from .config import SyntheticDataConfig
from .generator import generate_dataset, persist_dataset


def build_parser() -> ArgumentParser:
  parser = ArgumentParser(description="Generate synthetic incidents, stations, and related datasets.")

  parser.add_argument(
    "--output-dir",
    type=Path,
    default=Path("data/generated"),
    help="Directory where output files will be written.",
  )
  parser.add_argument("--incident-count", type=int, default=10000, help="Number of incidents to generate.")
  parser.add_argument("--station-count", type=int, default=25, help="Number of stations to generate.")
  parser.add_argument("--seed", type=int, default=None, help="Seed value for deterministic output.")
  parser.add_argument(
    "--output-format",
    type=str,
    choices=("csv", "parquet"),
    default="csv",
    help="Output file format. Parquet requires optional dependencies (pyarrow or fastparquet).",
  )
  parser.add_argument(
    "--window-days",
    type=int,
    default=90,
    help="Interval (in days) to distribute incident timestamps.",
  )
  parser.add_argument(
    "--span-years",
    type=int,
    default=3,
    help="Total temporal span (in years) for incident timestamps.",
  )
  parser.add_argument(
    "--start-datetime",
    type=str,
    default=None,
    help="ISO timestamp marking the end of the generation window (defaults to current UTC).",
  )
  parser.add_argument(
    "--include-units",
    action=BooleanOptionalAction,
    default=True,
    help="Generate incident_units records.",
  )
  parser.add_argument(
    "--include-assets",
    action=BooleanOptionalAction,
    default=True,
    help="Generate incident_assets records.",
  )
  parser.add_argument(
    "--include-notes",
    action=BooleanOptionalAction,
    default=True,
    help="Generate incident_notes records.",
  )
  parser.add_argument(
    "--units-min",
    type=int,
    default=1,
    help="Minimum units dispatched per incident.",
  )
  parser.add_argument(
    "--units-max",
    type=int,
    default=3,
    help="Maximum units dispatched per incident.",
  )
  parser.add_argument(
    "--assets-probability",
    type=float,
    default=0.35,
    help="Probability an incident has assets (0-1).",
  )
  parser.add_argument(
    "--notes-probability",
    type=float,
    default=0.55,
    help="Probability an incident has notes (0-1).",
  )
  parser.add_argument(
    "--geohash-precision",
    type=int,
    default=8,
    help="Geohash precision for incident location (3-12).",
  )
  parser.add_argument(
    "--city-coords-file",
    type=Path,
    default=None,
    help="Optional CSV with commune coordinates (columns: comuna_id, region_id, nombre, latitud, longitud).",
  )
  parser.add_argument(
    "--region-lookup-file",
    type=Path,
    default=None,
    help="Optional CSV with region metadata (columns: region_id, nombre).",
  )
  parser.add_argument(
    "--urban-focus-bias",
    type=float,
    default=0.6,
    help="Bias factor (0-1) that increases the likelihood of urban communes when assigning incidents.",
  )
  parser.add_argument(
    "--seasonal-bias-strength",
    type=float,
    default=0.5,
    help="Strength (0-1) of seasonal incident weighting (summer emphasis).",
  )
  parser.add_argument(
    "--verbose",
    action=BooleanOptionalAction,
    default=True,
    help="Display generation progress via tqdm.",
  )
  parser.add_argument(
    "--min-stations-per-city",
    type=int,
    default=1,
    help="Minimum number of stations to allocate per city.",
  )

  return parser


def parse_args(argv: Sequence[str] | None = None) -> argparse.Namespace:
  parser = build_parser()
  return parser.parse_args(argv)


def main(argv: Sequence[str] | None = None) -> int:
  args = parse_args(argv)

  if args.incident_count < 1:
    raise SystemExit("--incident-count must be >= 1")
  if args.station_count < 1:
    raise SystemExit("--station-count must be >= 1")
  if args.units_min < 1:
    raise SystemExit("--units-min must be >= 1")
  if args.units_max < args.units_min:
    raise SystemExit("--units-max must be >= --units-min")
  if not (0.0 <= args.assets_probability <= 1.0):
    raise SystemExit("--assets-probability must be between 0 and 1")
  if not (0.0 <= args.notes_probability <= 1.0):
    raise SystemExit("--notes-probability must be between 0 and 1")
  if not (3 <= args.geohash_precision <= 12):
    raise SystemExit("--geohash-precision must be between 3 and 12")
  if args.city_coords_file and not args.city_coords_file.exists():
    raise SystemExit(f"--city-coords-file not found: {args.city_coords_file}")
  if args.region_lookup_file and not args.region_lookup_file.exists():
    raise SystemExit(f"--region-lookup-file not found: {args.region_lookup_file}")
  if args.span_years < 1:
    raise SystemExit("--span-years must be >= 1")
  if not (0.0 <= args.urban_focus_bias <= 1.0):
    raise SystemExit("--urban-focus-bias must be between 0 and 1")
  if not (0.0 <= args.seasonal_bias_strength <= 1.0):
    raise SystemExit("--seasonal-bias-strength must be between 0 and 1")

  resolved_start = (
    datetime.fromisoformat(args.start_datetime) if args.start_datetime else datetime.now(UTC)
  )

  config = SyntheticDataConfig(
    output_dir=args.output_dir,
    incident_count=args.incident_count,
    station_count=args.station_count,
    rng_seed=args.seed,
    output_format=args.output_format.lower(),
    window_days=args.window_days,
    start_datetime=resolved_start,
    include_units=args.include_units,
    include_assets=args.include_assets,
    include_notes=args.include_notes,
    units_per_incident_min=args.units_min,
    units_per_incident_max=args.units_max,
    assets_probability=args.assets_probability,
    notes_probability=args.notes_probability,
    geohash_precision=args.geohash_precision,
    verbose=args.verbose,
    span_years=args.span_years,
    city_coords_file=args.city_coords_file,
    region_lookup_file=args.region_lookup_file,
    urban_focus_bias=args.urban_focus_bias,
    seasonal_bias_strength=args.seasonal_bias_strength,
    min_stations_per_city=args.min_stations_per_city,
  )

  dataset = generate_dataset(config)
  paths = persist_dataset(dataset, config)

  print(f"Generated {len(paths)} files in {config.output_dir.resolve()}")
  for path in paths:
    print(f" - {path.name}")

  return 0


if __name__ == "__main__":
  raise SystemExit(main())
