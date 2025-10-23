# Temporally Diverse Data Generation

## Overview

The data generator has been enhanced to create incidents with more realistic temporal diversity, spanning multiple years instead of clustering all incidents in a narrow time window.

## Temporal Distribution

The generator now creates incidents across three time ranges:

- **60% Recent** (last 90 days) - Current operational incidents
- **25% Medium-term** (90-365 days ago) - Recent historical data
- **15% Historical** (1-3 years ago) - Long-term trend data

This distribution ensures:

- ✅ Daily trend charts show meaningful patterns
- ✅ KPI comparisons have sufficient data in both windows
- ✅ Type/severity distributions span realistic timeframes
- ✅ Export functionality has diverse date ranges to test

## Quick Start

### Option 1: Use the Helper Script

```bash
# From the project root
python tools/generate_diverse_dataset.py
```

This script will:

1. Generate 5,000 incidents with temporal diversity
2. Bulk load the data into the database
3. Provide verification instructions

### Option 2: Manual Generation

```bash
# Generate data
python -m tools.data_generator.cli \
  --incident-count 5000 \
  --station-count 50 \
  --window-days 90 \
  --output-dir data/bulk_load_batch \
  --output-format csv \
  --include-units \
  --include-assets \
  --include-notes \
  --verbose

# Load data
python -m tools.bulk_load.cli \
  --data-dir data/bulk_load_batch
```

## Dashboard Impact

After generating diverse data, you should see:

### ✅ Daily Trend Chart

- Line chart showing incident counts over 30 days
- 7-day trend comparison with meaningful delta values
- Visual patterns across weeks and months

### ✅ KPI Card (Last 24 Hours)

- Current vs. previous 24h comparison
- Non-zero incident counts (if recent data exists)
- Percentage change calculations

### ✅ Type & Severity Distribution

- Aggregated counts across the filtered timeframe
- Percentage breakdowns with visual bars/donut
- Diverse representation of incident types

### ✅ Recent Incidents

- Latest incidents from the generated dataset
- Proper temporal ordering
- Map integration with diverse locations

## Configuration

The temporal distribution is controlled in `tools/data_generator/generator.py`:

```python
# Adjust these weights to change distribution
recent_weight = 0.60      # Last 90 days
medium_weight = 0.25      # 90-365 days
historical_weight = 0.15  # 1-3 years
```

## Verification

After loading data, verify the temporal spread:

```sql
-- Check incident distribution by month
SELECT
  DATE_TRUNC('month', occurrence_at) AS month,
  COUNT(*) AS incident_count
FROM incidents
GROUP BY month
ORDER BY month DESC
LIMIT 36;  -- Last 3 years

-- Verify recent incidents (last 7 days)
SELECT COUNT(*)
FROM incidents
WHERE occurrence_at >= NOW() - INTERVAL '7 days';

-- Check historical span
SELECT
  MIN(occurrence_at) AS earliest_incident,
  MAX(occurrence_at) AS latest_incident,
  MAX(occurrence_at) - MIN(occurrence_at) AS date_range
FROM incidents;
```

## Troubleshooting

### "No type data available"

- Ensure filter dates encompass the generated data range
- Check that the backend API is returning data for the selected timeframe
- Verify the filters in the incident filters store aren't too restrictive

### "0 incidents in last 7 days"

- Run the data generator which creates 60% recent incidents
- Check the `start_datetime` in the config matches your current date
- Verify database timezone settings

### Dashboard shows old data

- Clear browser cache and reload
- Check React Query cache (refresh buttons bypass cache)
- Restart the backend server to pick up new data
