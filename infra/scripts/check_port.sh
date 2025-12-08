#!/bin/bash

# Script to find an available port starting from a default
# Usage: ./check_port.sh [start_port]

START_PORT=${1:-5434}
PORT=$START_PORT

# Check if we have ss, netstat or nc
if command -v ss >/dev/null 2>&1; then
    CHECKTER_CMD="ss"
elif command -v netstat >/dev/null 2>&1; then
    CHECKTER_CMD="netstat"
elif command -v nc >/dev/null 2>&1; then
    CHECKTER_CMD="nc"
else
    echo "Error: ss, netstat or nc required to check ports." >&2
    exit 1
fi

is_port_in_use() {
    local port=$1
    if [ "$CHECKTER_CMD" = "ss" ]; then
        ss -lnt | grep -q ":$port "
    elif [ "$CHECKTER_CMD" = "netstat" ]; then
        netstat -lnt | grep -q ":$port "
    elif [ "$CHECKTER_CMD" = "nc" ]; then
        nc -z localhost $port
    fi
}

# Loop until we find a free port
while is_port_in_use $PORT; do
    echo "Port $PORT is in use, checking next..." >&2
    PORT=$((PORT + 1))
done

echo $PORT
