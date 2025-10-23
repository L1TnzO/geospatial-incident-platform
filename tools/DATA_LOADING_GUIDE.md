# Data Generation and Loading Guide

This guide explains how to generate synthetic fire incident data and load it into the database. This is useful for development, testing, and demo purposes.

## Overview

The data generator creates realistic fire incident data with:

- **5 fire incident types** (structure, wildland, vehicle, industrial, electrical)
- **6 reporting sources** (911, fire alarm, field report, neighbor, business owner, security)
- **Temporal diversity** spanning years (60% recent, 25% medium-term, 15% historical)
- **Realistic active/resolved status** (only last 7 days can be active)
- **Fire-specific narratives and details**

## Quick Start

### 1. Generate Synthetic Data

```bash
# From project root
python tools/generate_diverse_dataset.py
```

This will:

- Generate 5,000 fire incidents
- Create 50 fire stations
- Generate supporting data (units, assets, notes)
- Save CSV files to `data/bulk_load_batch/`

**Output files:**

- `stations.csv` - Fire station locations and details
- `incidents.csv` - Fire incident records
- `incident_units.csv` - Unit assignments per incident
- `incident_assets.csv` - Assets deployed to incidents
- `incident_notes.csv` - Operational notes for incidents

### 2. Load Data into Database

```bash
# From project root
make db-load-data
```

This will:

- Create staging schema
- Load CSV files into staging tables
- Run validation checks
- Move data to production tables
- Generate load report

**Expected output:**

```
--- Load summary ---
   table_name    | row_count
-----------------+-----------
 incident_assets |      ~3600
 incident_notes  |      ~5500
 incidents       |      5000
 incident_units  |     ~10000
 stations        |        50
```

### 3. Restart Backend

```bash
# Restart the backend to pick up new data
docker restart gip-backend
```

### 4. Clear Browser Cache

Hard refresh your browser (Ctrl+Shift+R or Cmd+Shift+R) to clear any cached filters with old incident types.

## Detailed Steps

### Prerequisites

1. **Docker containers running:**

   ```bash
   docker compose up -d
   ```

2. **Python dependencies installed:**
   ```bash
   pip install -r tools/data_generator/requirements.txt
   ```

### Data Generator Configuration

The generator can be customized by editing `tools/generate_diverse_dataset.py`:

```python
incident_count = 5000     # Number of incidents to generate
station_count = 50        # Number of fire stations
window_days = 90          # Base window (less relevant now)
```

**Temporal distribution** (edit `tools/data_generator/generator.py`):

```python
recent_weight = 0.60      # 60% from last 90 days
medium_weight = 0.25      # 25% from 90-365 days ago
historical_weight = 0.15  # 15% from 1-3 years ago
```

### Manual Generation (Advanced)

If you need more control:

```bash
# Generate data with custom parameters
python -m tools.data_generator.cli \
  --incident-count 10000 \
  --station-count 100 \
  --window-days 90 \
  --output-dir data/bulk_load_batch \
  --output-format csv \
  --seed 42 \
  --include-units \
  --include-assets \
  --include-notes \
  --verbose

# Load data
make db-load-data
```

### Database Schema Updates

If you've updated incident types or sources in the lookup tables:

1. **Update seed file:**

   ```bash
   # Edit server/db/seeds/000_lookup_data.js
   # Add/modify incident types and sources
   ```

2. **Run migrations and seeds:**

   ```bash
   cd server
   DATABASE_URL="postgres://gis_dev:gis_dev_password@localhost:5432/gis" \
     npx knex migrate:latest

   DATABASE_URL="postgres://gis_dev:gis_dev_password@localhost:5432/gis" \
     npx knex seed:run
   ```

3. **Restart backend:**

   ```bash
   docker restart gip-backend
   ```

4. **Increment filter store version:**
   ```typescript
   // client/src/store/incident-filters-store.ts
   const STORAGE_KEY = 'gip::incidentTableFilters::v3'; // Increment
   const STORAGE_VERSION = 3; // Increment
   ```

## Verification

### 1. Check Database

```sql
-- Connect to database
psql postgres://gis_dev:gis_dev_password@localhost:5432/gis

-- Verify incident counts
SELECT COUNT(*) FROM incidents;

-- Check temporal distribution
SELECT
  DATE_TRUNC('month', occurrence_at) AS month,
  COUNT(*) AS count
FROM incidents
GROUP BY month
ORDER BY month DESC
LIMIT 12;

-- Verify active vs resolved
SELECT
  is_active,
  COUNT(*) AS count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 1) AS percentage
FROM incidents
GROUP BY is_active;

-- Check incident type distribution
SELECT
  it.name,
  COUNT(*) AS count
FROM incidents i
JOIN incident_types it ON i.type_id = it.type_id
GROUP BY it.name
ORDER BY count DESC;
```

### 2. Check Backend Logs

```bash
# Should show no errors
docker logs gip-backend --tail 50
```

### 3. Test Frontend

1. Navigate to `http://localhost:3000/dashboard`
2. Verify dashboard widgets load without errors
3. Check that incident types show fire-related types only
4. Verify ~144 active incidents (2.9% of 5,000)
5. Test CSV export functionality

## Troubleshooting

### "No module named 'pandas'" Error

Install Python dependencies:

```bash
pip install -r tools/data_generator/requirements.txt
```

### "500 Internal Server Error" from Backend

1. Check backend logs: `docker logs gip-backend`
2. Ensure migrations are up to date
3. Verify seed data matches generator output
4. Restart backend: `docker restart gip-backend`

### "RESCUE" or "MEDICAL" Type Errors

Old localStorage has invalid type codes:

1. Hard refresh browser (Ctrl+Shift+R)
2. Or manually clear: `localStorage.clear()` in browser console
3. Verify filter store version was incremented

### Database Connection Errors

Ensure PostgreSQL container is running:

```bash
docker ps | grep postgres
docker compose up -d  # if not running
```

### Bulk Load Fails with Referential Integrity Errors

The incident types in CSV don't match database lookup tables:

1. Update `server/db/seeds/000_lookup_data.js`
2. Run seeds: `DATABASE_URL="..." npx knex seed:run`
3. Regenerate data: `python tools/generate_diverse_dataset.py`
4. Reload: `make db-load-data`

## Data Characteristics

### Incident Types (Fire-Focused)

- **FIRE_STRUCTURE**: Residential/commercial building fires
- **FIRE_WILDLAND**: Brush, forest, grassland fires
- **FIRE_VEHICLE**: Car, truck, vehicle fires
- **FIRE_INDUSTRIAL**: Factory, warehouse fires
- **FIRE_ELECTRICAL**: Power line, transformer fires

### Reporting Sources

- **911**: Emergency calls to dispatch
- **FIRE_ALARM**: Automatic fire detection systems
- **FIELD_REPORT**: Fire personnel observations
- **NEIGHBOR_REPORT**: Community reports of smoke/fire
- **BUSINESS_OWNER**: Property owner/manager reports
- **SECURITY**: Building security/monitoring systems

### Temporal Distribution

- **60% Recent** (0-90 days): Current operations, some active
- **25% Medium** (90-365 days): Recent history, all resolved
- **15% Historical** (1-3 years): Long-term trends, all resolved

### Active Status Logic

- **Last 7 days**: Can be REPORTED, DISPATCHED, ON_SCENE, RESOLVED, or CANCELLED
- **Older than 7 days**: Must be RESOLVED (90%) or CANCELLED (10%)
- **Result**: Only ~2-3% of incidents are active (realistic for a fire department)

## Performance Notes

- **5,000 incidents** generates in ~1-2 seconds
- **Bulk load** completes in ~1-2 seconds
- **10,000+ incidents** may require adjusting batch sizes in load_pipeline.sql

## Maintenance

### Regular Data Refresh

For development environments, refresh data monthly:

```bash
# Generate new data with current date
python tools/generate_diverse_dataset.py

# Load fresh data
make db-load-data

# Restart services
docker restart gip-backend
```

### Production Considerations

⚠️ **Never use synthetic data in production!**

For production:

- Use real incident data imports
- Implement proper ETL pipelines
- Add data validation layers
- Set up backup and recovery procedures

## Files Modified During Setup

- `tools/data_generator/generator.py` - Temporal distribution logic
- `tools/data_generator/lookups.py` - Fire types and sources
- `server/db/seeds/000_lookup_data.js` - Database lookup tables
- `client/src/store/incident-filters-store.ts` - Storage version (v2)

## Additional Resources

- [Data Generator Code](../tools/data_generator/)
- [Bulk Load Scripts](../tools/bulk_load/)
- [Database Migrations](../server/db/migrations/)
- [API Documentation](../docs/api/)
