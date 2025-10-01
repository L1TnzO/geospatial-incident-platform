from __future__ import annotations

from dataclasses import dataclass
from typing import Sequence


@dataclass(frozen=True)
class LookupItem:
  code: str
  name: str
  description: str | None = None
  extra: dict[str, str] | None = None


INCIDENT_TYPES: Sequence[LookupItem] = (
  LookupItem("FIRE_STRUCTURE", "Structure Fire", "Residential or commercial structure-related fire incident."),
  LookupItem("FIRE_WILDLAND", "Wildland Fire", "Brush, forest, or grassland fire events."),
  LookupItem("MEDICAL", "Medical Response", "Medical emergencies requiring EMS response."),
  LookupItem("RESCUE", "Rescue", "Technical rescues including vehicle extrication, rope, or water."),
  LookupItem("HAZMAT", "Hazardous Materials", "HazMat spill or release incidents."),
)

INCIDENT_SEVERITIES: Sequence[LookupItem] = (
  LookupItem("LOW", "Low", extra={"priority": "1", "color_hex": "#2E7D32"}),
  LookupItem("MODERATE", "Moderate", extra={"priority": "2", "color_hex": "#1976D2"}),
  LookupItem("HIGH", "High", extra={"priority": "3", "color_hex": "#FBC02D"}),
  LookupItem("CRITICAL", "Critical", extra={"priority": "4", "color_hex": "#F57C00"}),
  LookupItem("SEVERE", "Severe", extra={"priority": "5", "color_hex": "#C62828"}),
)

INCIDENT_STATUSES: Sequence[LookupItem] = (
  LookupItem("REPORTED", "Reported", "Incident has been reported and awaiting dispatch."),
  LookupItem("DISPATCHED", "Dispatched", "Units dispatched to incident."),
  LookupItem("ON_SCENE", "On Scene", "Units arrived on-scene and response underway."),
  LookupItem("RESOLVED", "Resolved", "Incident mitigated and closed."),
  LookupItem("CANCELLED", "Cancelled", "Incident cancelled prior to response completion."),
)

INCIDENT_SOURCES: Sequence[LookupItem] = (
  LookupItem("911", "Emergency Call", "Public safety dispatch center request."),
  LookupItem("FIELD_REPORT", "Field Report", "Responder reported incident while on patrol."),
  LookupItem("SENSOR", "Sensor Alert", "IoT or alarm system triggered alert."),
)

WEATHER_CONDITIONS: Sequence[LookupItem] = (
  LookupItem("CLEAR", "Clear", "Minimal weather impact."),
  LookupItem("RAIN", "Rain", "Rainfall present at incident location."),
  LookupItem("SNOW", "Snow", "Snow or ice conditions present."),
  LookupItem("WIND", "High Wind", "Elevated sustained winds or gusts."),
  LookupItem("HEAT", "Extreme Heat", "High temperature advisory or warning."),
)
