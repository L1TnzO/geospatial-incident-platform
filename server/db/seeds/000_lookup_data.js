/**
 * Populate baseline lookup tables for incidents.
 */

exports.seed = async function seed(knex) {
  const incidentTypes = [
    {
      type_code: 'FIRE_STRUCTURE',
      name: 'Structure Fire',
      description: 'Residential or commercial structure-related fire incident.',
    },
    {
      type_code: 'FIRE_WILDLAND',
      name: 'Wildland Fire',
      description: 'Brush, forest, or grassland fire events.',
    },
    {
      type_code: 'MEDICAL',
      name: 'Medical Response',
      description: 'Medical emergencies requiring EMS response.',
    },
    {
      type_code: 'RESCUE',
      name: 'Rescue',
      description: 'Technical rescues including vehicle extrication, rope, or water.',
    },
    {
      type_code: 'HAZMAT',
      name: 'Hazardous Materials',
      description: 'HazMat spill or release incidents.',
    },
  ];

  const incidentSeverities = [
    {
      severity_code: 'LOW',
      name: 'Low',
      priority: 1,
      color_hex: '#2E7D32',
    },
    {
      severity_code: 'MODERATE',
      name: 'Moderate',
      priority: 2,
      color_hex: '#1976D2',
    },
    {
      severity_code: 'HIGH',
      name: 'High',
      priority: 3,
      color_hex: '#FBC02D',
    },
    {
      severity_code: 'CRITICAL',
      name: 'Critical',
      priority: 4,
      color_hex: '#F57C00',
    },
    {
      severity_code: 'SEVERE',
      name: 'Severe',
      priority: 5,
      color_hex: '#C62828',
    },
  ];

  const incidentStatuses = [
    {
      status_code: 'REPORTED',
      name: 'Reported',
      description: 'Incident has been reported and awaiting dispatch.',
      is_terminal: false,
    },
    {
      status_code: 'DISPATCHED',
      name: 'Dispatched',
      description: 'Units dispatched to incident.',
      is_terminal: false,
    },
    {
      status_code: 'ON_SCENE',
      name: 'On Scene',
      description: 'Units arrived on-scene and response underway.',
      is_terminal: false,
    },
    {
      status_code: 'RESOLVED',
      name: 'Resolved',
      description: 'Incident mitigated and closed.',
      is_terminal: true,
    },
    {
      status_code: 'CANCELLED',
      name: 'Cancelled',
      description: 'Incident cancelled prior to response completion.',
      is_terminal: true,
    },
  ];

  const incidentSources = [
    {
      source_code: '911',
      name: 'Emergency Call',
      description: 'Public safety dispatch center request.',
    },
    {
      source_code: 'FIELD_REPORT',
      name: 'Field Report',
      description: 'Responder reported incident while on patrol.',
    },
    {
      source_code: 'SENSOR',
      name: 'Sensor Alert',
      description: 'IoT or alarm system triggered alert.',
    },
  ];

  const weatherConditions = [
    {
      condition_code: 'CLEAR',
      name: 'Clear',
      description: 'Minimal weather impact.',
    },
    {
      condition_code: 'RAIN',
      name: 'Rain',
      description: 'Rainfall present at incident location.',
    },
    {
      condition_code: 'SNOW',
      name: 'Snow',
      description: 'Snow or ice conditions present.',
    },
    {
      condition_code: 'WIND',
      name: 'High Wind',
      description: 'Elevated sustained winds or gusts.',
    },
    {
      condition_code: 'HEAT',
      name: 'Extreme Heat',
      description: 'High temperature advisory or warning.',
    },
  ];

  await knex('incident_types').insert(incidentTypes).onConflict('type_code').ignore();

  await knex('incident_severities').insert(incidentSeverities).onConflict('severity_code').ignore();

  await knex('incident_statuses').insert(incidentStatuses).onConflict('status_code').ignore();

  await knex('incident_sources').insert(incidentSources).onConflict('source_code').ignore();

  await knex('weather_conditions').insert(weatherConditions).onConflict('condition_code').ignore();
};
