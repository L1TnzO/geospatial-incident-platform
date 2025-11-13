from __future__ import annotations

import calendar
import json
import math
import random
import unicodedata
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Iterable, Sequence

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

faker = Faker("es_CL")

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


_STATUS_INDEX = {status.code: status for status in INCIDENT_STATUSES}
_RESOLVED_STATUS = _STATUS_INDEX["RESOLVED"]
_CANCELLED_STATUS = _STATUS_INDEX["CANCELLED"]
_REPORTED_STATUS = _STATUS_INDEX["REPORTED"]
_DISPATCHED_STATUS = _STATUS_INDEX["DISPATCHED"]
_ON_SCENE_STATUS = _STATUS_INDEX["ON_SCENE"]


@dataclass
class CommuneRecord:
  commune_id: int
  region_id: int
  name: str
  region_name: str
  lat: float
  lng: float
  is_urban: bool
  weight: float


@dataclass
class GeneratedData:
  stations: pd.DataFrame
  incidents: pd.DataFrame
  incident_units: pd.DataFrame
  incident_assets: pd.DataFrame
  incident_notes: pd.DataFrame


_URBAN_WEIGHT_MAP: dict[str, float] = {
  # Metropolitan Region
  "santiago": 5.0,
  "puente alto": 3.6,
  "maipu": 3.4,
  "las condes": 2.8,
  "la florida": 2.6,
  "nunoa": 2.4,
  "providencia": 2.5,
  "vitacura": 2.2,
  "lo barnechea": 2.0,
  "pudahuel": 2.0,
  "quilicura": 2.0,
  "penalolen": 2.0,
  "san bernardo": 2.2,
  "la pintana": 1.8,
  "san miguel": 1.7,
  "macul": 1.6,
  "independencia": 1.6,
  "renca": 1.6,
  "cerro navia": 1.5,
  "lo prado": 1.5,
  "huechuraba": 1.5,
  "san joaquin": 1.5,
  "quilpu": 2.2,
  "villa alemana": 2.0,
  # Northern Chile hubs
  "antofagasta": 3.5,
  "iquique": 2.7,
  "arica": 2.3,
  "calama": 2.2,
  "copiapo": 2.1,
  # Central Chile hubs
  "valparaiso": 3.6,
  "vina del mar": 3.4,
  "quillota": 1.8,
  "san antonio": 2.0,
  "rancagua": 2.7,
  "talca": 2.6,
  "curico": 2.1,
  "chillan": 2.4,
  "los angeles": 2.4,
  # Southern Chile hubs
  "concepcion": 3.5,
  "talcahuano": 2.4,
  "san pedro de la paz": 2.1,
  "coronel": 1.9,
  "temuco": 4.0,
  "padre las casas": 1.8,
  "valdivia": 2.7,
  "osorno": 2.2,
  "puerto montt": 2.8,
  "castro": 1.9,
  "coyhaique": 2.0,
  "punta arenas": 2.7,
}


_URBAN_PRIORITY_BONUS: dict[str, float] = {
  "temuco": 2.5,
  "santiago": 1.5,
  "valparaiso": 1.2,
  "concepcion": 1.2,
}


def _normalize_name(value: str) -> str:
  normalized = unicodedata.normalize("NFKD", value)
  ascii_bytes = normalized.encode("ascii", "ignore")
  return ascii_bytes.decode("ascii").strip().lower()


def _seasonal_month_weights(strength: float) -> list[float]:
  """Return normalized weights per month emphasizing Chilean summer months."""

  base_profile = {
    1: 1.55,  # January peak summer
    2: 1.4,
    3: 1.15,
    4: 0.95,
    5: 0.9,
    6: 0.85,
    7: 0.85,
    8: 0.9,
    9: 1.0,
    10: 1.1,
    11: 1.25,
    12: 1.6,  # December ramp-up
  }

  weights = []
  for month in range(1, 13):
    baseline = base_profile.get(month, 1.0)
    adjusted = 1.0 + (baseline - 1.0) * strength
    weights.append(max(adjusted, 0.05))

  total = sum(weights)
  return [weight / total for weight in weights]


def _season_from_month(month: int) -> str:
  if month in (12, 1, 2):
    return "summer"
  if month in (3, 4, 5):
    return "autumn"
  if month in (6, 7, 8):
    return "winter"
  return "spring"


def _load_commune_records(config: SyntheticDataConfig) -> list[CommuneRecord]:
  if config.city_coords_file is None:
    return []

  required_columns = {"comuna_id", "region_id", "nombre", "latitud", "longitud"}
  communes_df = pd.read_csv(config.city_coords_file)
  missing_columns = required_columns.difference(communes_df.columns)
  if missing_columns:
    raise ValueError(
      f"city_coords_file is missing required columns: {sorted(missing_columns)}"
    )

  region_lookup: dict[int, str] = {}
  if config.region_lookup_file is not None:
    region_df = pd.read_csv(config.region_lookup_file)
    if {"region_id", "nombre"}.issubset(region_df.columns):
      region_lookup = {
        int(row.region_id): str(row.nombre)
        for row in region_df.itertuples(index=False)
      }

  records: list[CommuneRecord] = []
  for row in communes_df.itertuples(index=False):
    try:
      commune_id = int(getattr(row, "comuna_id"))
      region_id = int(getattr(row, "region_id"))
      lat = float(getattr(row, "latitud"))
      lng = float(getattr(row, "longitud"))
    except (TypeError, ValueError):
      continue

    name_raw = str(getattr(row, "nombre")).strip()
    if not name_raw:
      continue

    normalized_name = _normalize_name(name_raw)
    urban_weight = _URBAN_WEIGHT_MAP.get(normalized_name)
    base_weight = 1.0 + 0.3 * (1.0 - config.urban_focus_bias)
    if urban_weight is not None:
      weight = base_weight + urban_weight * config.urban_focus_bias
    else:
      weight = base_weight

    bonus = _URBAN_PRIORITY_BONUS.get(normalized_name)
    if bonus is not None:
      weight += bonus * config.urban_focus_bias

    region_name = region_lookup.get(region_id, f"Region {region_id}")
    records.append(
      CommuneRecord(
        commune_id=commune_id,
        region_id=region_id,
        name=name_raw,
        region_name=region_name,
        lat=lat,
        lng=lng,
        is_urban=urban_weight is not None,
        weight=weight,
      )
    )

  return records


def _sample_occurrence_timestamp(
  now: datetime,
  config: SyntheticDataConfig,
  rng: random.Random,
  month_weights: Sequence[float],
) -> datetime:
  """Generate an occurrence timestamp across the configured time span with seasonal bias."""

  span_years = max(config.span_years, 1)
  min_year = now.year - span_years + 1

  year_offsets = list(range(span_years))
  # Exponential decay so that recent years have higher probability while still covering the full span
  decay_scale = max(span_years / 6.0, 1.0)
  year_weights = [math.exp(-offset / decay_scale) for offset in year_offsets]
  target_offset = rng.choices(year_offsets, weights=year_weights, k=1)[0]
  target_year = now.year - target_offset

  month_choices = list(range(1, 13))
  target_month = rng.choices(month_choices, weights=month_weights, k=1)[0]

  max_day = calendar.monthrange(target_year, target_month)[1]
  target_day = rng.randint(1, max_day)
  hour = rng.randint(0, 23)
  minute = rng.randint(0, 59)
  second = rng.randint(0, 59)

  occurrence = datetime(
    target_year,
    target_month,
    target_day,
    hour,
    minute,
    second,
    tzinfo=UTC,
  )

  if occurrence > now:
    occurrence = occurrence.replace(year=occurrence.year - 1)

  if occurrence.year < min_year:
    max_day_min = calendar.monthrange(min_year, occurrence.month)[1]
    clamped_day = min(occurrence.day, max_day_min)
    occurrence = occurrence.replace(year=min_year, day=clamped_day)

  return occurrence


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


def _metadata_payload(
  station_code: str,
  severity_code: str,
  rng: random.Random,
  season_label: str | None = None,
  urban_cluster: str | None = None,
) -> str:
  payload = {
    "report_channel": rng.choice(["mobile", "call", "sensor"]),
    "triage_level": severity_code,
    "dispatch_console": faker.pystr(min_chars=4, max_chars=6).upper(),
    "primary_station": station_code,
  }
  if season_label is not None:
    payload["season_bias"] = season_label
  if urban_cluster is not None:
    payload["urban_cluster"] = urban_cluster
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


def _generate_station_rows(
  config: SyntheticDataConfig,
  rng: random.Random,
  communes: Sequence[CommuneRecord],
) -> pd.DataFrame:
  rows: list[dict] = []
  use_communes = len(communes) > 0
  commune_weights = [max(commune.weight, 0.05) for commune in communes]

  current_year = config.start_datetime.year

  for idx in range(1, config.station_count + 1):
    commune = rng.choices(communes, weights=commune_weights, k=1)[0] if use_communes else None

    if commune is not None:
      jitter_km = 6.0 if commune.is_urban else 18.0
      lat, lng = _random_geo_point(commune.lat, commune.lng, max_km=jitter_km, rng=rng)
      city = commune.name
      region = commune.region_name
      incident_weight = commune.weight
      coverage_min, coverage_max = ((3500, 8500) if commune.is_urban else (9000, 20000))
      anchor_lat = commune.lat
      anchor_lng = commune.lng
    else:
      # Fallback to legacy random US-based data if no communes provided
      anchor_lat, anchor_lng = 47.6062, -122.3321
      lat, lng = _random_geo_point(anchor_lat, anchor_lng, max_km=20, rng=rng)
      city = faker.city()
      region = faker.state_abbr()
      incident_weight = 1.0
      coverage_min, coverage_max = (4000, 12000)

    commissioned_year = rng.randint(1975, 2020)
    commissioned_on = datetime(commissioned_year, rng.randint(1, 12), rng.randint(1, 28)).date()
    decommissioned_on = None
    if rng.random() > 0.9:
      year_min = commissioned_year + 5
      year_max = max(year_min, min(current_year, datetime.now(UTC).year))
      if year_max >= year_min:
        year = rng.randint(year_min, year_max)
        decommissioned_on = datetime(year, rng.randint(1, 12), rng.randint(1, 28)).date()

    station_code = f"STA-{idx:04d}" if config.station_count >= 1000 else f"STA-{idx:03d}"
    rows.append(
      {
        "station_code": station_code,
        "name": f"Compania {city} {idx:03d}",
        "battalion": f"Batallon {rng.randint(1, 12)}",
        "address_line_1": faker.street_address(),
        "address_line_2": None,
        "city": city,
        "region": region,
        "postal_code": faker.postcode(),
        "phone": faker.phone_number(),
        "is_active": decommissioned_on is None,
        "commissioned_on": commissioned_on.isoformat(),
        "decommissioned_on": decommissioned_on.isoformat() if decommissioned_on else None,
        "response_zone_code": None,
        "location_lat": lat,
        "location_lng": lng,
        "location_wkt": _render_wkt(lat, lng),
        "coverage_radius_meters": rng.randint(coverage_min, coverage_max),
        "created_at": datetime.now(UTC).isoformat(timespec="seconds"),
        "updated_at": datetime.now(UTC).isoformat(timespec="seconds"),
        # Internal-use metadata retained until persistence
        "incident_weight": incident_weight,
        "is_urban": bool(commune.is_urban) if commune is not None else False,
        "anchor_lat": anchor_lat,
        "anchor_lng": anchor_lng,
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
  month_weights = _seasonal_month_weights(config.seasonal_bias_strength)

  station_records = stations_df.to_dict("records")
  if not station_records:
    raise ValueError("No stations available to generate incidents")
  station_weights = [max(record.get("incident_weight", 1.0), 0.05) for record in station_records]

  for idx in tqdm(range(1, config.incident_count + 1), disable=not config.verbose, desc="Incidents"):
    base_station = rng.choices(station_records, weights=station_weights, k=1)[0]
    anchor_lat = base_station.get("anchor_lat", base_station["location_lat"])
    anchor_lng = base_station.get("anchor_lng", base_station["location_lng"])
    is_urban_station = bool(base_station.get("is_urban", False))
    jitter_radius = 2.5 if is_urban_station else 9.5
    lat, lng = _random_geo_point(anchor_lat, anchor_lng, max_km=jitter_radius, rng=rng)

    occurrence_at = _sample_occurrence_timestamp(now, config, rng, month_weights)
    season_label = _season_from_month(occurrence_at.month)

    reported_at = occurrence_at + timedelta(minutes=rng.randint(1, 8))
    dispatch_at = reported_at + timedelta(minutes=rng.randint(1, 6))
    arrival_at = dispatch_at + timedelta(minutes=rng.randint(3, 18))
    resolved_at = arrival_at + timedelta(minutes=rng.randint(25, 480))

    # Clamp to "now" for very recent incidents
    if reported_at > now:
      reported_at = now
    if dispatch_at > now:
      dispatch_at = now
    if arrival_at > now:
      arrival_at = now
    if resolved_at > now:
      resolved_at = now - timedelta(minutes=rng.randint(5, 90))

    # Maintain chronological order after clamping
    if dispatch_at < reported_at:
      dispatch_at = reported_at
    if arrival_at < dispatch_at:
      arrival_at = dispatch_at
    if resolved_at < arrival_at:
      resolved_at = arrival_at + timedelta(minutes=rng.randint(5, 60))
      if resolved_at > now:
        resolved_at = now

    type_lookup = _choose_lookup(INCIDENT_TYPES, rng)
    severity_lookup = _choose_lookup(INCIDENT_SEVERITIES, rng)
    source_lookup = _choose_lookup(INCIDENT_SOURCES, rng)
    weather_lookup = _choose_lookup(WEATHER_CONDITIONS, rng)

    days_old = max((now - occurrence_at).days, 0)
    if days_old <= 7:
      status_lookup = _choose_lookup(INCIDENT_STATUSES, rng)
    elif days_old <= 30:
      status_lookup = rng.choices(
        [_RESOLVED_STATUS, _CANCELLED_STATUS, _ON_SCENE_STATUS],
        weights=[0.82, 0.08, 0.10],
      )[0]
    elif days_old <= 365:
      status_lookup = rng.choices([_RESOLVED_STATUS, _CANCELLED_STATUS], weights=[0.92, 0.08])[0]
    else:
      status_lookup = _RESOLVED_STATUS

    if status_lookup.code in {"ON_SCENE", "DISPATCHED"} and days_old > 2:
      status_lookup = _RESOLVED_STATUS

    if status_lookup.code == "REPORTED":
      dispatch_at = None
      arrival_at = None
      resolved_at = None
    elif status_lookup.code in {"ON_SCENE", "DISPATCHED"}:
      resolved_at = None

    incident_number = f"INC-{occurrence_at:%Y%m%d}-{idx:07d}" if config.incident_count >= 1_000_000 else f"INC-{occurrence_at:%Y%m%d}-{idx:06d}"

    casualty_weights = [0.87, 0.08, 0.04, 0.01]
    if severity_lookup.code in {"CRITICAL", "SEVERE"}:
      casualty_weights = [0.75, 0.15, 0.08, 0.02]
    casualty_count = rng.choices([0, 1, 2, 3], weights=casualty_weights)[0]
    responder_injuries = 0 if casualty_count == 0 else rng.choice([0, 1])
    if severity_lookup.code in {"CRITICAL", "SEVERE"} and rng.random() < 0.15:
      responder_injuries = rng.choice([1, 2])

    damage_amount = 0.0
    if severity_lookup.code in {"HIGH", "CRITICAL", "SEVERE"}:
      base_min, base_max = (25_000, 750_000) if severity_lookup.code in {"CRITICAL", "SEVERE"} else (5_000, 250_000)
      damage_amount = round(rng.uniform(base_min, base_max), 2)
    elif severity_lookup.code == "MODERATE":
      damage_amount = round(rng.uniform(2_000, 60_000), 2)

    fire_title = _generate_fire_title(type_lookup.code, rng)
    fire_narrative = _generate_fire_narrative(
      type_lookup.code,
      source_lookup.code,
      severity_lookup.code,
      rng,
    )

    metadata = _metadata_payload(
      base_station["station_code"],
      severity_lookup.code,
      rng,
      season_label=season_label,
      urban_cluster=base_station["city"] if is_urban_station else None,
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
        "metadata": metadata,
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
        unit_cleared_at = (resolved_at or arrival_at or occurrence_at) + timedelta(minutes=rng.randint(5, 45))
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
            "asset_identifier": f"AST-{idx:07d}-{asset_idx+1}" if config.incident_count >= 1_000_000 else f"AST-{idx:06d}-{asset_idx+1}",
            "asset_type": rng.choice(_ASSET_TYPES),
            "status": rng.choice(["deployed", "staged", "released"]),
            "notes": faker.sentence(),
          }
        )

    if config.include_notes and rng.random() < config.notes_probability:
      notes_count = rng.randint(1, 3)
      note_timestamp = arrival_at or reported_at
      for _ in range(notes_count):
        notes_rows.append(
          {
            "incident_number": incident_number,
            "author": faker.name(),
            "note": rng.choice(_NOTE_TOPICS),
            "created_at": note_timestamp.isoformat(),
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

  communes = _load_commune_records(config)
  stations_df = _generate_station_rows(config, rng, communes)
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
