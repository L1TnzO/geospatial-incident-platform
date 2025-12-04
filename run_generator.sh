#!/bin/bash
set -e

# Create venv if not exists
if [ ! -d ".venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv .venv
fi

# Activate venv
source .venv/bin/activate

# Install dependencies
echo "Installing dependencies..."
pip install -r tools/data_generator/requirements.txt

# Run generator
echo "Running generator..."
python tools/generate_diverse_dataset.py
