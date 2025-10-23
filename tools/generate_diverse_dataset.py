#!/usr/bin/env python3
"""
Generate diverse synthetic incident data spanning multiple years.
This creates a more realistic dataset for testing dashboard analytics and trends.
"""

import subprocess
import sys
from pathlib import Path

def main():
    """Generate synthetic data with temporal diversity and bulk load it."""
    
    # Configuration for diverse temporal data
    incident_count = 5000  # Increase to 5000 for better distribution
    station_count = 50
    window_days = 90  # This is now less relevant due to temporal diversity changes
    
    print("=" * 80)
    print("Generating Temporally Diverse Synthetic Dataset")
    print("=" * 80)
    print(f"Incidents: {incident_count}")
    print(f"Stations: {station_count}")
    print("Temporal Distribution:")
    print("  - 60% Recent (last 90 days)")
    print("  - 25% Medium term (90-365 days ago)")
    print("  - 15% Historical (1-3 years ago)")
    print("=" * 80)
    
    # Step 1: Generate the data
    print("\n[1/3] Generating synthetic data...")
    generate_cmd = [
        "python", "-m", "tools.data_generator.cli",
        "--incident-count", str(incident_count),
        "--station-count", str(station_count),
        "--window-days", str(window_days),
        "--output-dir", "data/bulk_load_batch",
        "--output-format", "csv",
        "--seed", "42",
        "--include-units",
        "--include-assets",
        "--include-notes",
        "--verbose"
    ]
    
    result = subprocess.run(generate_cmd, check=False)
    if result.returncode != 0:
        print("❌ Data generation failed!")
        return 1
    
    print("✅ Data generation complete!")
    
    # Step 2: Bulk load the data
    print("\n[2/3] Bulk loading data into database...")
    print("Please run the bulk load script manually:")
    print("  cd tools/bulk_load")
    print("  ./load_data.sh ../../data/bulk_load_batch")
    print("\nOr use the Makefile:")
    print("  make load-data")
    
    # Step 3: Verify the data
    print("\n[3/3] Next steps:")
    print("  1. Load the data using the commands above")
    print("  2. Visit http://localhost:3000/dashboard")
    print("  3. Check the daily trend chart (should show data across time)")
    print("  4. Verify type and severity distributions")
    print("  5. Test CSV export functionality")
    
    print("\n" + "=" * 80)
    print("✅ Dataset generation complete! Ready for bulk loading.")
    print("=" * 80)
    
    return 0

if __name__ == "__main__":
    sys.exit(main())
