from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime
from pathlib import Path


@dataclass(frozen=True)
class SyntheticDataConfig:
  """Configuration values controlling synthetic dataset generation."""

  output_dir: Path
  incident_count: int = 10000
  station_count: int = 25
  units_per_incident_min: int = 1
  units_per_incident_max: int = 3
  assets_probability: float = 0.35
  notes_probability: float = 0.55
  rng_seed: int | None = None
  start_datetime: datetime = field(default_factory=lambda: datetime.now(UTC))
  window_days: int = 90
  include_assets: bool = True
  include_notes: bool = True
  include_units: bool = True
  geohash_precision: int = 8
  output_format: str = "csv"  # or "parquet"
  verbose: bool = True
  span_years: int = 3
  city_coords_file: Path | None = None
  region_lookup_file: Path | None = None
  urban_focus_bias: float = 0.6
  seasonal_bias_strength: float = 0.5
  min_stations_per_city: int = 1

  def __post_init__(self) -> None:  # type: ignore[override]
    if self.units_per_incident_min < 1:
      raise ValueError("units_per_incident_min must be at least 1")
    if self.units_per_incident_max < self.units_per_incident_min:
      raise ValueError("units_per_incident_max must be >= units_per_incident_min")
    if self.output_format.lower() not in {"csv", "parquet"}:
      raise ValueError("output_format must be either 'csv' or 'parquet'")
    if not (0 <= self.assets_probability <= 1):
      raise ValueError("assets_probability must be between 0 and 1")
    if not (0 <= self.notes_probability <= 1):
      raise ValueError("notes_probability must be between 0 and 1")
    if self.span_years < 1:
      raise ValueError("span_years must be at least 1")
    if not (0 <= self.urban_focus_bias <= 1):
      raise ValueError("urban_focus_bias must be between 0 and 1")
    if not (0 <= self.seasonal_bias_strength <= 1):
      raise ValueError("seasonal_bias_strength must be between 0 and 1")
    if self.min_stations_per_city < 0:
      raise ValueError("min_stations_per_city must be >= 0")
