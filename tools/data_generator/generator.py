from __future__ import annotations

import json
import math
import random
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Iterable

import pandas as pd
import pygeohash
from faker import Faker
from tqdm import tqdm

from .config import SyntheticDataConfig
from .lookups import (
  INCIDENT_SEVERITIES,
  INCIDENT_SOURCES,
  INCIDENT_STATUSES,
  INCIDENT_TYPES,
  WEATHER_CONDITIONS,
)

faker = Faker("en_US")

_ASSIGNMENT_ROLES = (
  "Primary Engine",
  "Ladder Truck",
  "Rescue Squad",
  "Battalion Chief",
  "Water Tender",
  "Hazmat Unit",
)
_ASSET_TYPES = ("Engine", "Ladder", "Aerial Platform", "Drone", "Foam Trailer", "Water Tender")
_NOTE_TOPICS = (
  "Initial size-up complete. Fire showing from second floor.",
  "Defensive operations established due to structural instability.",
  "Utilities secured. Gas and electric shutoff confirmed.",
  "All occupants evacuated. Primary search complete.",
  "Fire knocked down. Overhaul in progress.",
  "Thermal imaging scan reveals no hidden hot spots.",
  "Ventilation operations completed on roof.",
  "Fire origin investigation underway.",
)

# Fire-specific narrative templates
_FIRE_NARRATIVES = (
  "Units dispatched to reported {} with visible flames. First arriving engine reported heavy smoke conditions. Primary search conducted with negative results. Fire suppression operations established.",
  "Initial report of {} from {} source. Upon arrival, crews found active fire involvement. Defensive operations initiated due to building conditions. All exposures protected.",
  "Response to {} alarm activation. Investigation revealed active fire in {}. Aggressive interior attack mounted. Fire brought under control within {} minutes.",
  "Call received for {} with smoke visible. Crews arrived to find well-involved fire. Ladder operations established for roof ventilation. Fire extinguished, no civilian injuries.",
  "Dispatch for reported {} at commercial structure. Heavy fire conditions encountered upon arrival. Multiple alarm response requested. Fire contained to area of origin.",
)

_EXPECTED_COLUMNS: dict[str, list[str]] = {
  "stations": [
    "station_code",
    "name",
    "battalion",
    "address_line_1",
    "address_line_2",
    "city",
    "region",
    "postal_code",
    "phone",
    "is_active",
    "commissioned_on",
    "decommissioned_on",
    "response_zone_code",
    "location_lat",
    "location_lng",
    "location_wkt",
    "coverage_radius_meters",
    "created_at",
    "updated_at",
  ],
  "incidents": [
    "incident_number",
    "external_reference",
    "title",
    "narrative",
    "type_code",
    "severity_code",
    "status_code",
    "source_code",
    "weather_condition_code",
    "primary_station_code",
    "occurrence_at",
    "reported_at",
    "dispatch_at",
    "arrival_at",
    "resolved_at",
    "location_lat",
    "location_lng",
    "location_wkt",
    "location_geohash",
    "address_line_1",
    "address_line_2",
    "city",
    "region",
    "postal_code",
    "casualty_count",
    "responder_injuries",
    "estimated_damage_amount",
    "is_active",
    "metadata",
  ],
  "incident_units": [
    "incident_number",
    "station_code",
    "assignment_role",
    "dispatched_at",
    "cleared_at",
  ],
  "incident_assets": [
    "incident_number",
    "asset_identifier",
    "asset_type",
    "status",
    "notes",
  ],
  "incident_notes": [
    "incident_number",
    "author",
    "note",
    "created_at",
  ],
}


@dataclass
class GeneratedData:
  stations: pd.DataFrame
  incidents: pd.DataFrame
  incident_units: pd.DataFrame
  incident_assets: pd.DataFrame
  incident_notes: pd.DataFrame


def _random_geo_point(center_lat: float, center_lng: float, max_km: float, rng: random.Random) -> tuple[float, float]:
  """Return a point jittered around a center coordinate within max_km radius."""
  # Convert to radians
  radius_earth_km = 6371.0
  distance = max_km * rng.random()  # uniform distance up to max_km
  bearing = rng.random() * 2 * math.pi

  lat_rad = math.radians(center_lat)
  lng_rad = math.radians(center_lng)

  new_lat = math.asin(
    math.sin(lat_rad) * math.cos(distance / radius_earth_km)
    + math.cos(lat_rad) * math.sin(distance / radius_earth_km) * math.cos(bearing)
  )
  new_lng = lng_rad + math.atan2(
    math.sin(bearing) * math.sin(distance / radius_earth_km) * math.cos(lat_rad),
    math.cos(distance / radius_earth_km) - math.sin(lat_rad) * math.sin(new_lat),
  )

  return math.degrees(new_lat), math.degrees(new_lng)


def _render_wkt(lat: float, lng: float) -> str:
  return f"POINT({lng:.6f} {lat:.6f})"


def _metadata_payload(station_code: str, severity_code: str, rng: random.Random) -> str:
  payload = {
    "report_channel": rng.choice(["mobile", "call", "sensor"]),
    "triage_level": severity_code,
    "dispatch_console": faker.pystr(min_chars=4, max_chars=6).upper(),
    "primary_station": station_code,
  }
  return json.dumps(payload, separators=(",", ":"))


def _choose_lookup(lookup_items: Iterable, rng: random.Random):
  population = list(lookup_items)
  return rng.choice(population)


def _generate_fire_title(incident_type: str, rng: random.Random) -> str:
  """Generate realistic fire incident title based on type."""
  titles_by_type = {
    "FIRE_STRUCTURE": [
      "Residential structure fire",
      "Multi-unit dwelling fire",
      "Single-family residence fire",
      "Apartment building fire",
      "Commercial building fire",
    ],
    "FIRE_WILDLAND": [
      "Brush fire containment",
      "Vegetation fire spread",
      "Wildland fire suppression",
      "Grassland fire response",
      "Forest fire perimeter control",
    ],
    "FIRE_VEHICLE": [
      "Vehicle fire on roadway",
      "Car fire with exposure risk",
      "Commercial vehicle fire",
      "Multiple vehicle fire",
      "Passenger vehicle fully involved",
    ],
    "FIRE_INDUSTRIAL": [
      "Industrial facility fire",
      "Warehouse fire response",
      "Manufacturing plant fire",
      "Chemical storage fire",
      "Factory fire suppression",
    ],
    "FIRE_ELECTRICAL": [
      "Electrical equipment fire",
      "Power line fire hazard",
      "Transformer fire response",
      "Electrical panel fire",
      "Utility structure fire",
    ],
  }
  
  type_titles = titles_by_type.get(incident_type, ["Fire incident"])
  return rng.choice(type_titles)


def _generate_fire_narrative(incident_type: str, source: str, severity: str, rng: random.Random) -> str:
  """Generate realistic fire incident narrative."""
  template = rng.choice(_FIRE_NARRATIVES)
  
  # Customize based on incident type
  fire_type_desc = {
    "FIRE_STRUCTURE": "structure fire",
    "FIRE_WILDLAND": "wildland fire",
    "FIRE_VEHICLE": "vehicle fire",
    "FIRE_INDUSTRIAL": "industrial fire",
    "FIRE_ELECTRICAL": "electrical fire",
  }.get(incident_type, "fire")
  
  # Customize based on source
  source_desc = {
    "911": "911 emergency call",
    "FIRE_ALARM": "automatic fire alarm",
    "FIELD_REPORT": "field observation",
    "NEIGHBOR_REPORT": "neighbor report",
    "BUSINESS_OWNER": "property owner",
    "SECURITY": "security system",
  }.get(source, "dispatch")
  
  # Location within structure
  locations = ["basement", "first floor", "upper level", "rear of structure", "kitchen area"]
  
  # Response time based on severity
  response_times = {
    "LOW": str(rng.randint(45, 90)),
    "MODERATE": str(rng.randint(30, 60)),
    "HIGH": str(rng.randint(20, 45)),
    "CRITICAL": str(rng.randint(15, 30)),
    "SEVERE": str(rng.randint(10, 25)),
  }
  
  # Format the narrative
  narrative = template.format(
    fire_type_desc,
    source_desc,
    rng.choice(locations),
    response_times.get(severity, "30")
  )
  
  return narrative


def _generate_station_rows(config: SyntheticDataConfig, rng: random.Random) -> pd.DataFrame:
  west_coast_anchor = (47.6062, -122.3321)  # Seattle reference point
  rows = []
  for idx in range(1, config.station_count + 1):
    lat, lng = _random_geo_point(west_coast_anchor[0], west_coast_anchor[1], max_km=20, rng=rng)
    commissioned_year = rng.randint(1975, 2020)
    commissioned_on = datetime(commissioned_year, rng.randint(1, 12), rng.randint(1, 28)).date()
    decommissioned_on = None
    if not rng.random() < 0.9:  # small chance a station was decommissioned
      year = rng.randint(commissioned_year + 5, 2023)
      decommissioned_on = datetime(year, rng.randint(1, 12), rng.randint(1, 28)).date()

    station_code = f"STA-{idx:03d}"
    rows.append(
      {
        "station_code": station_code,
        "name": f"Station {faker.city()} {idx:03d}",
        "battalion": f"Battalion {rng.randint(1, 8)}",
        "address_line_1": faker.street_address(),
        "address_line_2": None,
        "city": faker.city(),
        "region": faker.state_abbr(),
        "postal_code": faker.postcode(),
        "phone": faker.phone_number(),
        "is_active": decommissioned_on is None,
        "commissioned_on": commissioned_on.isoformat(),
        "decommissioned_on": decommissioned_on.isoformat() if decommissioned_on else None,
        "response_zone_code": None,
        "location_lat": lat,
        "location_lng": lng,
        "location_wkt": _render_wkt(lat, lng),
        "coverage_radius_meters": rng.randint(4000, 12000),
  "created_at": datetime.now(UTC).isoformat(timespec="seconds"),
  "updated_at": datetime.now(UTC).isoformat(timespec="seconds"),
      }
    )
  return pd.DataFrame(rows)


def _generate_incident_rows(
  config: SyntheticDataConfig,
  rng: random.Random,
  stations_df: pd.DataFrame,
) -> tuple[pd.DataFrame, list[dict], list[dict]]:
  incident_rows: list[dict] = []
  unit_rows: list[dict] = []
  assets_rows: list[dict] = []
  notes_rows: list[dict] = []

  now = config.start_datetime
  start_window = now - timedelta(days=config.window_days)
  
  # Enhanced temporal diversity: create distribution across multiple years
  # 60% recent (last 90 days), 25% medium term (90-365 days), 15% historical (1-3 years)
  recent_weight = 0.60
  medium_weight = 0.25
  historical_weight = 0.15

  station_records = stations_df.to_dict("records")

  for idx in tqdm(range(1, config.incident_count + 1), disable=not config.verbose, desc="Incidents"):
    base_station = rng.choice(station_records)
    lat, lng = _random_geo_point(base_station["location_lat"], base_station["location_lng"], max_km=3.5, rng=rng)

    # Determine temporal range based on weighted distribution
    temporal_category = rng.choices(
      ["recent", "medium", "historical"],
      weights=[recent_weight, medium_weight, historical_weight]
    )[0]
    
    if temporal_category == "recent":
      # Last 90 days
      days_back = rng.randint(0, 90)
      occurrence_at = now - timedelta(days=days_back, seconds=rng.randint(0, 86400))
    elif temporal_category == "medium":
      # 90 days to 1 year
      days_back = rng.randint(90, 365)
      occurrence_at = now - timedelta(days=days_back, seconds=rng.randint(0, 86400))
    else:
      # 1-3 years historical
      days_back = rng.randint(365, 365 * 3)
      occurrence_at = now - timedelta(days=days_back, seconds=rng.randint(0, 86400))
    reported_at = occurrence_at + timedelta(minutes=rng.randint(0, 10))
    dispatch_at = reported_at + timedelta(minutes=rng.randint(0, 6))
    arrival_at = dispatch_at + timedelta(minutes=rng.randint(3, 20))
    resolved_at = arrival_at + timedelta(minutes=rng.randint(10, 240))

    type_lookup = _choose_lookup(INCIDENT_TYPES, rng)
    severity_lookup = _choose_lookup(INCIDENT_SEVERITIES, rng)
    source_lookup = _choose_lookup(INCIDENT_SOURCES, rng)
    weather_lookup = _choose_lookup(WEATHER_CONDITIONS, rng)
    
    # Determine status based on temporal category
    # Only recent incidents (last 7 days) can be active (REPORTED, DISPATCHED, ON_SCENE)
    # Everything else should be RESOLVED or CANCELLED
    days_old = (now - occurrence_at).days
    
    if days_old <= 7:
      # Recent incidents can have any status
      status_lookup = _choose_lookup(INCIDENT_STATUSES, rng)
    else:
      # Historical incidents must be closed
      status_lookup = rng.choice([
        next(s for s in INCIDENT_STATUSES if s.code == "RESOLVED"),
        next(s for s in INCIDENT_STATUSES if s.code == "CANCELLED"),
      ])
      # 90% resolved, 10% cancelled
      if rng.random() > 0.1:
        status_lookup = next(s for s in INCIDENT_STATUSES if s.code == "RESOLVED")

    if status_lookup.code in {"ON_SCENE", "DISPATCHED"}:
      resolved_at = None
    if status_lookup.code == "REPORTED":
      dispatch_at = None
      arrival_at = None
      resolved_at = None

    incident_number = f"INC-{occurrence_at:%Y%m%d}-{idx:06d}"

    casualty_count = rng.choices([0, 1, 2, 3], weights=[0.85, 0.1, 0.04, 0.01])[0]
    responder_injuries = 0 if casualty_count == 0 else rng.choice([0, 1])
    damage_amount = 0.0
    if severity_lookup.code in {"HIGH", "CRITICAL", "SEVERE"}:
      damage_amount = round(rng.uniform(5_000, 500_000), 2)
    elif severity_lookup.code in {"MODERATE"}:
      damage_amount = round(rng.uniform(1_000, 50_000), 2)

    # Generate fire-specific title and narrative
    fire_title = _generate_fire_title(type_lookup.code, rng)
    fire_narrative = _generate_fire_narrative(
      type_lookup.code,
      source_lookup.code,
      severity_lookup.code,
      rng
    )

    incident_rows.append(
      {
        "incident_number": incident_number,
        "external_reference": faker.bothify(text="EXT-#####"),
        "title": fire_title,
        "narrative": fire_narrative,
        "type_code": type_lookup.code,
        "severity_code": severity_lookup.code,
        "status_code": status_lookup.code,
        "source_code": source_lookup.code,
        "weather_condition_code": weather_lookup.code,
        "primary_station_code": base_station["station_code"],
        "occurrence_at": occurrence_at.isoformat(),
        "reported_at": reported_at.isoformat(),
        "dispatch_at": dispatch_at.isoformat() if dispatch_at else None,
        "arrival_at": arrival_at.isoformat() if arrival_at else None,
        "resolved_at": resolved_at.isoformat() if resolved_at else None,
        "location_lat": lat,
        "location_lng": lng,
        "location_wkt": _render_wkt(lat, lng),
        "location_geohash": pygeohash.encode(lat, lng, precision=config.geohash_precision),
        "address_line_1": faker.street_address(),
        "address_line_2": None,
        "city": base_station["city"],
        "region": base_station["region"],
        "postal_code": base_station["postal_code"],
        "casualty_count": casualty_count,
        "responder_injuries": responder_injuries,
        "estimated_damage_amount": damage_amount,
        "is_active": status_lookup.code not in {"RESOLVED", "CANCELLED"},
  "metadata": _metadata_payload(base_station["station_code"], severity_lookup.code, rng),
      }
    )

    if config.include_units:
      unit_total = rng.randint(config.units_per_incident_min, config.units_per_incident_max)
      assigned_station_codes = rng.sample(
        [record["station_code"] for record in station_records],
        k=min(unit_total, len(station_records)),
      )
      for station_code in assigned_station_codes:
        unit_dispatched_at = (dispatch_at or reported_at) + timedelta(minutes=rng.randint(0, 4))
        unit_cleared_at = (resolved_at or arrival_at or occurrence_at) + timedelta(minutes=rng.randint(0, 15))
        unit_rows.append(
          {
            "incident_number": incident_number,
            "station_code": station_code,
            "assignment_role": rng.choice(_ASSIGNMENT_ROLES),
            "dispatched_at": unit_dispatched_at.isoformat(),
            "cleared_at": unit_cleared_at.isoformat(),
          }
        )

    if config.include_assets and rng.random() < config.assets_probability:
      asset_count = rng.randint(1, 3)
      for asset_idx in range(asset_count):
        assets_rows.append(
          {
            "incident_number": incident_number,
            "asset_identifier": f"AST-{idx:06d}-{asset_idx+1}",
            "asset_type": rng.choice(_ASSET_TYPES),
            "status": rng.choice(["deployed", "staged", "released"]),
            "notes": faker.sentence(),
          }
        )

    if config.include_notes and rng.random() < config.notes_probability:
      notes_count = rng.randint(1, 3)
      for _ in range(notes_count):
        notes_rows.append(
          {
            "incident_number": incident_number,
            "author": faker.name(),
            "note": rng.choice(_NOTE_TOPICS),
            "created_at": (arrival_at or reported_at).isoformat(),
          }
        )

  return (
    pd.DataFrame(incident_rows),
    unit_rows,
    assets_rows,
    notes_rows,
  )


def generate_dataset(config: SyntheticDataConfig) -> GeneratedData:
  rng = random.Random(config.rng_seed)
  Faker.seed(config.rng_seed)

  stations_df = _generate_station_rows(config, rng)
  incidents_df, unit_rows, asset_rows, note_rows = _generate_incident_rows(config, rng, stations_df)

  unit_df = pd.DataFrame(unit_rows)
  assets_df = pd.DataFrame(asset_rows)
  notes_df = pd.DataFrame(note_rows)

  return GeneratedData(
    stations=stations_df,
    incidents=incidents_df,
    incident_units=unit_df,
    incident_assets=assets_df,
    incident_notes=notes_df,
  )


def persist_dataset(dataset: GeneratedData, config: SyntheticDataConfig) -> list[Path]:
  output_dir = config.output_dir
  output_dir.mkdir(parents=True, exist_ok=True)

  suffix = ".parquet" if config.output_format.lower() == "parquet" else ".csv"
  save_paths: list[Path] = []

  def _save_frame(frame: pd.DataFrame, name: str) -> None:
    file_path = output_dir / f"{name}{suffix}"
    expected_cols = _EXPECTED_COLUMNS.get(name)
    if expected_cols is not None:
      if frame.empty:
        frame = pd.DataFrame(columns=expected_cols)
      else:
        frame = frame.reindex(columns=expected_cols)
    elif frame.empty:
      frame = frame.copy()
    if suffix == ".parquet":
      try:
        frame.to_parquet(file_path, index=False)
      except ImportError as exc:  # pragma: no cover - optional dependency guard
        raise RuntimeError(
          "Parquet output requires optional dependencies (pyarrow or fastparquet). "
          "Install one of them or use --output-format csv."
        ) from exc
    else:
      frame.to_csv(file_path, index=False)
    save_paths.append(file_path)

  _save_frame(dataset.stations, "stations")
  _save_frame(dataset.incidents, "incidents")
  if config.include_units:
    _save_frame(dataset.incident_units, "incident_units")
  if config.include_assets:
    _save_frame(dataset.incident_assets, "incident_assets")
  if config.include_notes:
    _save_frame(dataset.incident_notes, "incident_notes")

  return save_paths
