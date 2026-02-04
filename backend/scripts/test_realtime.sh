#!/bin/bash

# Realtime WebSocket Test Script
# This script helps test the realtime functionality

API_URL="${API_URL:-http://localhost:8000}"

echo "======================================"
echo "Realtime WebSocket Test Helper"
echo "API URL: $API_URL"
echo "======================================"

# Function to update a trip
update_trip() {
    local trip_id=$1
    local new_name=$2
    
    echo ""
    echo "Updating trip $trip_id to: $new_name"
    curl -s -X PATCH "$API_URL/api/test/trips/$trip_id" \
        -H "Content-Type: application/json" \
        -d "{\"name\": \"$new_name\"}" | jq .
}

# Function to get a trip
get_trip() {
    local trip_id=$1
    
    echo ""
    echo "Getting trip $trip_id"
    curl -s "$API_URL/api/test/trips/$trip_id" | jq .
}

# Help message
show_help() {
    echo ""
    echo "Usage:"
    echo "  ./test_realtime.sh update <trip_id> <new_name>  - Update a trip"
    echo "  ./test_realtime.sh get <trip_id>               - Get a trip"
    echo ""
    echo "Examples:"
    echo "  ./test_realtime.sh update 123e4567-e89b-12d3-a456-426614174000 \"Beach Trip\""
    echo "  ./test_realtime.sh get 123e4567-e89b-12d3-a456-426614174000"
    echo ""
    echo "To test realtime:"
    echo "1. Start the backend: cd backend && make dev"
    echo "2. Open the frontend app and navigate to test-realtime"
    echo "3. Connect to WebSocket and subscribe to a trip ID"
    echo "4. Run this script to update the trip"
    echo "5. You should see the update in the frontend logs"
}

# Main
case "$1" in
    update)
        if [ -z "$2" ] || [ -z "$3" ]; then
            echo "Error: Missing arguments"
            show_help
            exit 1
        fi
        update_trip "$2" "$3"
        ;;
    get)
        if [ -z "$2" ]; then
            echo "Error: Missing trip_id"
            show_help
            exit 1
        fi
        get_trip "$2"
        ;;
    *)
        show_help
        ;;
esac
