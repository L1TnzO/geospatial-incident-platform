#!/bin/bash

# Configuration
DB_CONTAINER="gip-postgis"
API_URL="http://localhost:4000/api"

echo "--- Manual Verification Script ---"
echo "Date: $(date)"

# Helper to get date ISO string
get_date_iso() {
  date -u -d "$1" +"%Y-%m-%dT%H:%M:%S.000Z"
}

NOW=$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")
START_24H=$(get_date_iso "24 hours ago")
START_7D=$(get_date_iso "7 days ago")
START_30D=$(get_date_iso "30 days ago")

echo "Reference Now: $NOW"

# 1. Verify Last 24 Hours KPI
echo ""
echo "[1] Verifying Last 24 Hours KPI"
echo "Range: $START_24H to $NOW"

# DB Count
echo "Querying DB..."
DB_COUNT_24H=$(docker exec $DB_CONTAINER psql -U postgres -d postgres -t -c "SELECT count(*) FROM incidents WHERE reported_at >= '$START_24H' AND reported_at <= '$NOW';" | xargs)
echo "DB Count: $DB_COUNT_24H"

# API Call
echo "Querying API..."
API_RES_24H=$(curl -s "$API_URL/dashboard/kpi/last-24h?startDate=$START_24H&endDate=$NOW")
# Extract currentCount using python (more reliable than grep for JSON)
API_COUNT_24H=$(echo $API_RES_24H | python3 -c "import sys, json; print(json.load(sys.stdin)['currentCount'])")
echo "API Count: $API_COUNT_24H"

if [ "$DB_COUNT_24H" == "$API_COUNT_24H" ]; then
  echo "Match: ✅"
else
  echo "Match: ❌"
fi

# 2. Verify Last 7 Days (Type Distribution)
echo ""
echo "[2] Verifying Last 7 Days (Type Distribution Total)"
echo "Range: $START_7D to $NOW"

# DB Count
DB_COUNT_7D=$(docker exec $DB_CONTAINER psql -U postgres -d postgres -t -c "SELECT count(*) FROM incidents WHERE reported_at >= '$START_7D' AND reported_at <= '$NOW';" | xargs)
echo "DB Count: $DB_COUNT_7D"

# API Call
API_RES_7D=$(curl -s "$API_URL/dashboard/incidents/by-type?startDate=$START_7D&endDate=$NOW")
API_COUNT_7D=$(echo $API_RES_7D | python3 -c "import sys, json; print(json.load(sys.stdin)['total'])")
echo "API Count: $API_COUNT_7D"

if [ "$DB_COUNT_7D" == "$API_COUNT_7D" ]; then
  echo "Match: ✅"
else
  echo "Match: ❌"
fi

# 3. Verify Last 30 Days (Daily Trend Total)
echo ""
echo "[3] Verifying Last 30 Days (Daily Trend Total)"
echo "Range: $START_30D to $NOW"

# DB Count
DB_COUNT_30D=$(docker exec $DB_CONTAINER psql -U postgres -d postgres -t -c "SELECT count(*) FROM incidents WHERE reported_at >= '$START_30D' AND reported_at <= '$NOW';" | xargs)
echo "DB Count: $DB_COUNT_30D"

# API Call
API_RES_30D=$(curl -s "$API_URL/dashboard/incidents/daily-trend?startDate=$START_30D&endDate=$NOW")
# Sum points using python
API_COUNT_30D=$(echo $API_RES_30D | python3 -c "import sys, json; points = json.load(sys.stdin)['points']; print(sum(p['count'] for p in points))")
echo "API Count: $API_COUNT_30D"

if [ "$DB_COUNT_30D" == "$API_COUNT_30D" ]; then
  echo "Match: ✅"
else
  echo "Match: ❌"
fi

echo ""
echo "--- Verification End ---"
