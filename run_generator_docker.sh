#!/bin/bash
set -e

echo "Running data generator in Docker..."

# Ensure output directory exists
mkdir -p data/bulk_load_batch

# Run python container
# Mount current directory to /app
# Install requirements and run generator
docker run --rm \
  -v "$(pwd):/app" \
  -w /app \
  python:3.11-slim \
  bash -c "pip install -r tools/data_generator/requirements.txt && python tools/generate_diverse_dataset.py"

echo "Docker generation complete."
