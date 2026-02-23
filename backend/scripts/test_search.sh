#!/usr/bin/env bash

# Ensure we're running in bash
if [ -z "$BASH_VERSION" ]; then
    echo "Error: This script requires bash. Please run with: bash $0"
    exit 1
fi

set -e  # Exit on error

# Store script and backend directory paths
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

API_BASE_URL="${API_BASE_URL:-http://localhost:8000/api/v1}"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}==>${NC} $1"
}

info() {
    echo -e "${BLUE}INFO:${NC} $1"
}

warn() {
    echo -e "${YELLOW}NOTE:${NC} $1"
}

echo "======================================"
echo "Search API Test Script"
echo "API URL: $API_BASE_URL"
echo "======================================"

# Check for jq
if ! command -v jq &> /dev/null; then
    echo "Error: jq is not installed. Install with 'brew install jq'."
    exit 1
fi

# Check if backend is accessible
log "Checking backend connectivity..."
if ! curl -s --max-time 5 "$API_BASE_URL/../healthcheck" > /dev/null 2>&1; then
    echo ""
    echo -e "${YELLOW}WARNING: Cannot connect to backend at $API_BASE_URL${NC}"
    echo "Please ensure the backend is running:"
    echo "  cd backend && make dev"
    echo ""
    read -p "Continue anyway? (yes/no): " continue_choice
    if [ "$continue_choice" != "yes" ]; then
        exit 1
    fi
else
    echo -e "${GREEN}✓ Backend is accessible${NC}"
fi

# Helper function to generate JWT token for a given user ID
generate_jwt_for_user() {
    local user_id="$1"
    local token
    token=$(cd "$BACKEND_DIR" && doppler run --project backend --config dev -- go run -C internal/tests/testkit/fakes cmd/generate_jwt.go "$user_id")
    echo "$token"
}

# Helper function to create a user with error handling
create_user() {
    local name="$1"
    local username="$2"
    local phone="$3"
    
    # Generate a unique user ID for this user
    local user_id=$(uuidgen | tr '[:upper:]' '[:lower:]')
    
    # Generate a JWT token for this specific user
    local user_jwt=$(generate_jwt_for_user "$user_id")
    
    if [ -z "$user_jwt" ]; then
        echo "Error: Failed to generate JWT token for $name"
        exit 1
    fi
    
    RESPONSE=$(curl -s -X POST "$API_BASE_URL/users" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $user_jwt" \
        -d "{
            \"name\": \"$name\",
            \"username\": \"$username\",
            \"phone_number\": \"$phone\"
        }")
    
    # Check if request was successful
    if [ -z "$RESPONSE" ]; then
        echo "Error: No response from server. Is the backend running?"
        echo "Make sure to start the backend with: cd backend && make dev"
        exit 1
    fi
    
    # Check for API errors
    if echo "$RESPONSE" | jq -e '.error' > /dev/null 2>&1; then
        echo "Error from API while creating user $name:"
        echo "$RESPONSE" | jq
        exit 1
    fi
    
    USER_ID=$(echo "$RESPONSE" | jq -r '.id')
    if [ "$USER_ID" = "null" ] || [ -z "$USER_ID" ]; then
        echo "Error: Failed to get user ID from response for $name:"
        echo "$RESPONSE"
        exit 1
    fi
    
    echo "$USER_ID"
}


# Function to clear all tables in database
clear_database() {
    echo ""
    echo -e "${YELLOW}Clearing all data from database tables...${NC}"
    
    cd "$BACKEND_DIR"
    
    # Get database credentials from doppler
    DB_USER=$(doppler run --project backend --config dev -- bash -c 'echo $DB_USER')
    DB_NAME=$(doppler run --project backend --config dev -- bash -c 'echo $DB_DATABASE')
    
    if [ -z "$DB_USER" ] || [ -z "$DB_NAME" ]; then
        echo -e "${RED}✗ Failed to get database credentials from doppler${NC}"
        echo "DB_USER: $DB_USER"
        echo "DB_NAME: $DB_NAME"
        return 1
    fi
    
    echo "Using credentials: $DB_USER @ $DB_NAME"
    echo "Running TRUNCATE command..."
    
    # Truncate all tables (in correct order to handle foreign key constraints)
    # Temporarily disable errexit to allow fallback on failure
    set +e
    docker exec database psql -U "$DB_USER" -d "$DB_NAME" -c "
        TRUNCATE TABLE 
            poll_votes,
            poll_rankings,
            poll_options,
            polls,
            comments,
            images,
            activity_categories,
            activities,
            trip_invites,
            memberships,
            trips,
            users,
            categories
        RESTART IDENTITY CASCADE;
    "
    rc=$?
    set -e
    
    if [ $rc -eq 0 ]; then
        echo -e "${GREEN}✓ Database cleared successfully!${NC}"
    else
        echo -e "${RED}✗ Failed to clear database${NC}"
        echo "Trying alternative method..."
        # Alternative: delete from each table
        set +e
        docker exec database psql -U "$DB_USER" -d "$DB_NAME" -c "DELETE FROM poll_votes; DELETE FROM poll_rankings; DELETE FROM poll_options; DELETE FROM polls; DELETE FROM comments; DELETE FROM images; DELETE FROM activity_categories; DELETE FROM activities; DELETE FROM trip_invites; DELETE FROM memberships; DELETE FROM trips; DELETE FROM users; DELETE FROM categories;"
        rc=$?
        set -e
        
        if [ $rc -eq 0 ]; then
            echo -e "${GREEN}✓ Database cleared using DELETE${NC}"
        else
            echo -e "${RED}✗ Failed to clear database with both methods${NC}"
        fi
    fi
    echo ""
}


# Store created IDs (using simple variables for compatibility)
USER_ALICE=""
USER_BOB=""
USER_CHARLIE=""
USER_DIANA=""
USER_EVE=""
TRIP_BEACH=""
TRIP_MOUNTAIN=""
TRIP_CITY=""
TRIP_EUROPE=""

# Clear database before seeding
clear_database

log "Step 1: Creating test users..."
echo "(Generating unique JWT token for each user...)"
echo ""

# Create User 1: Alice
info "Creating user: Alice Smith"
USER_ALICE=$(create_user "Alice Smith" "alicesmith" "+12345000001")
echo "  Created Alice: $USER_ALICE"

# Create User 2: Bob Johnson
info "Creating user: Bob Johnson"
USER_BOB=$(create_user "Bob Johnson" "bobjohnson" "+12345000002")
echo "  Created Bob: $USER_BOB"

# Create User 3: Charlie Davis
info "Creating user: Charlie Davis"
USER_CHARLIE=$(create_user "Charlie Davis" "charliedavis" "+12345000003")
echo "  Created Charlie: $USER_CHARLIE"

# Create User 4: Diana Wilson
info "Creating user: Diana Wilson"
USER_DIANA=$(create_user "Diana Wilson" "dianawilson" "+12345000004")
echo "  Created Diana: $USER_DIANA"

# Create User 5: Eve Martinez
info "Creating user: Eve Martinez"
USER_EVE=$(create_user "Eve Martinez" "evemartinez" "+12345000005")
echo "  Created Eve: $USER_EVE"

log "Step 2: Creating test trips..."
echo "(Using Alice's credentials for trip operations)"
echo ""

# Generate a master JWT token for trip/membership/activity operations using Alice's ID
MASTER_JWT=$(generate_jwt_for_user "$USER_ALICE")

# Create Trip 1: Beach Vacation
info "Creating trip: Hawaii Beach Vacation"
RESPONSE=$(curl -s -X POST "$API_BASE_URL/trips" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $MASTER_JWT" \
    -d '{
        "name": "Hawaii Beach Vacation",
        "budget_min": 2000,
        "budget_max": 5000
    }')
TRIP_BEACH=$(echo "$RESPONSE" | jq -r '.id')
echo "  Created Beach trip: $TRIP_BEACH"

# Create Trip 2: Mountain Adventure
info "Creating trip: Colorado Mountain Adventure"
RESPONSE=$(curl -s -X POST "$API_BASE_URL/trips" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $MASTER_JWT" \
    -d '{
        "name": "Colorado Mountain Adventure",
        "budget_min": 1500,
        "budget_max": 3000
    }')
TRIP_MOUNTAIN=$(echo "$RESPONSE" | jq -r '.id')
echo "  Created Mountain trip: $TRIP_MOUNTAIN"

# Create Trip 3: City Tour
info "Creating trip: New York City Tour"
RESPONSE=$(curl -s -X POST "$API_BASE_URL/trips" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $MASTER_JWT" \
    -d '{
        "name": "New York City Tour",
        "budget_min": 3000,
        "budget_max": 6000
    }')
TRIP_CITY=$(echo "$RESPONSE" | jq -r '.id')
echo "  Created City trip: $TRIP_CITY"

# Create Trip 4: European Adventure
info "Creating trip: Paris and Rome European Adventure"
RESPONSE=$(curl -s -X POST "$API_BASE_URL/trips" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $MASTER_JWT" \
    -d '{
        "name": "Paris and Rome European Adventure",
        "budget_min": 5000,
        "budget_max": 10000
    }')
TRIP_EUROPE=$(echo "$RESPONSE" | jq -r '.id')
echo "  Created Europe trip: $TRIP_EUROPE"

log "Step 3: Adding members to trips..."

# Add members to Beach trip
info "Adding members to Hawaii Beach Vacation"
curl -s -X POST "$API_BASE_URL/memberships" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $MASTER_JWT" \
    -d "{
        \"user_id\": \"$USER_ALICE\",
        \"trip_id\": \"$TRIP_BEACH\",
        \"is_admin\": true,
        \"budget_min\": 2000,
        \"budget_max\": 4000
    }" > /dev/null

curl -s -X POST "$API_BASE_URL/memberships" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $MASTER_JWT" \
    -d "{
        \"user_id\": \"$USER_BOB\",
        \"trip_id\": \"$TRIP_BEACH\",
        \"is_admin\": false,
        \"budget_min\": 2500,
        \"budget_max\": 5000
    }" > /dev/null

curl -s -X POST "$API_BASE_URL/memberships" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $MASTER_JWT" \
    -d "{
        \"user_id\": \"$USER_CHARLIE\",
        \"trip_id\": \"$TRIP_BEACH\",
        \"is_admin\": false,
        \"budget_min\": 2000,
        \"budget_max\": 3500
    }" > /dev/null

# Add members to Mountain trip
info "Adding members to Colorado Mountain Adventure"
curl -s -X POST "$API_BASE_URL/memberships" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $MASTER_JWT" \
    -d "{
        \"user_id\": \"$USER_BOB\",
        \"trip_id\": \"$TRIP_MOUNTAIN\",
        \"is_admin\": true,
        \"budget_min\": 1500,
        \"budget_max\": 2500
    }" > /dev/null

curl -s -X POST "$API_BASE_URL/memberships" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $MASTER_JWT" \
    -d "{
        \"user_id\": \"$USER_DIANA\",
        \"trip_id\": \"$TRIP_MOUNTAIN\",
        \"is_admin\": false,
        \"budget_min\": 1800,
        \"budget_max\": 3000
    }" > /dev/null

# Add members to City trip
info "Adding members to New York City Tour"
curl -s -X POST "$API_BASE_URL/memberships" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $MASTER_JWT" \
    -d "{
        \"user_id\": \"$USER_ALICE\",
        \"trip_id\": \"$TRIP_CITY\",
        \"is_admin\": true,
        \"budget_min\": 3000,
        \"budget_max\": 5000
    }" > /dev/null

curl -s -X POST "$API_BASE_URL/memberships" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $MASTER_JWT" \
    -d "{
        \"user_id\": \"$USER_CHARLIE\",
        \"trip_id\": \"$TRIP_CITY\",
        \"is_admin\": false,
        \"budget_min\": 3500,
        \"budget_max\": 6000
    }" > /dev/null

curl -s -X POST "$API_BASE_URL/memberships" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $MASTER_JWT" \
    -d "{
        \"user_id\": \"$USER_EVE\",
        \"trip_id\": \"$TRIP_CITY\",
        \"is_admin\": false,
        \"budget_min\": 3000,
        \"budget_max\": 5500
    }" > /dev/null

# Add members to Europe trip
info "Adding members to Paris and Rome European Adventure"
curl -s -X POST "$API_BASE_URL/memberships" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $MASTER_JWT" \
    -d "{
        \"user_id\": \"$USER_DIANA\",
        \"trip_id\": \"$TRIP_EUROPE\",
        \"is_admin\": true,
        \"budget_min\": 5000,
        \"budget_max\": 8000
    }" > /dev/null

curl -s -X POST "$API_BASE_URL/memberships" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $MASTER_JWT" \
    -d "{
        \"user_id\": \"$USER_EVE\",
        \"trip_id\": \"$TRIP_EUROPE\",
        \"is_admin\": false,
        \"budget_min\": 6000,
        \"budget_max\": 10000
    }" > /dev/null

log "Step 4: Creating activities for trips..."

# Activities for Beach trip
info "Creating activities for Hawaii Beach Vacation"
curl -s -X POST "$API_BASE_URL/trips/$TRIP_BEACH/activities" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $MASTER_JWT" \
    -d '{
        "name": "Snorkeling at Hanauma Bay",
        "description": "Explore the beautiful coral reefs and tropical fish at Hanauma Bay. Perfect for beginners and experienced snorkelers.",
        "category_names": ["water", "adventure"]
    }' > /dev/null

curl -s -X POST "$API_BASE_URL/trips/$TRIP_BEACH/activities" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $MASTER_JWT" \
    -d '{
        "name": "Sunset Beach Dinner",
        "description": "Romantic beachfront dinner with fresh seafood and stunning sunset views.",
        "category_names": ["dining", "romantic"]
    }' > /dev/null

curl -s -X POST "$API_BASE_URL/trips/$TRIP_BEACH/activities" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $MASTER_JWT" \
    -d '{
        "name": "Surfing Lessons at Waikiki",
        "description": "Learn to surf with professional instructors at the famous Waikiki Beach.",
        "category_names": ["water", "adventure", "lessons"]
    }' > /dev/null

curl -s -X POST "$API_BASE_URL/trips/$TRIP_BEACH/activities" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $MASTER_JWT" \
    -d '{
        "name": "Helicopter Tour of Volcanoes",
        "description": "Breathtaking aerial views of active volcanoes and lava flows.",
        "category_names": ["adventure", "sightseeing"]
    }' > /dev/null

# Activities for Mountain trip
info "Creating activities for Colorado Mountain Adventure"
curl -s -X POST "$API_BASE_URL/trips/$TRIP_MOUNTAIN/activities" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $MASTER_JWT" \
    -d '{
        "name": "Rocky Mountain Hiking Trail",
        "description": "Challenging 10-mile hike through stunning mountain terrain with panoramic views.",
        "category_names": ["hiking", "adventure"]
    }' > /dev/null

curl -s -X POST "$API_BASE_URL/trips/$TRIP_MOUNTAIN/activities" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $MASTER_JWT" \
    -d '{
        "name": "Skiing at Aspen Resort",
        "description": "World-class skiing on powdery slopes suitable for all skill levels.",
        "category_names": ["winter", "adventure", "skiing"]
    }' > /dev/null

curl -s -X POST "$API_BASE_URL/trips/$TRIP_MOUNTAIN/activities" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $MASTER_JWT" \
    -d '{
        "name": "Mountain Cabin Stay",
        "description": "Cozy cabin accommodation with fireplace and stunning mountain views.",
        "category_names": ["lodging", "relaxation"]
    }' > /dev/null

curl -s -X POST "$API_BASE_URL/trips/$TRIP_MOUNTAIN/activities" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $MASTER_JWT" \
    -d '{
        "name": "White Water Rafting",
        "description": "Thrilling rapids adventure on the Arkansas River with experienced guides.",
        "category_names": ["water", "adventure", "extreme"]
    }' > /dev/null

# Activities for City trip
info "Creating activities for New York City Tour"
curl -s -X POST "$API_BASE_URL/trips/$TRIP_CITY/activities" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $MASTER_JWT" \
    -d '{
        "name": "Statue of Liberty Tour",
        "description": "Ferry ride to Liberty Island with guided tour of this iconic American monument.",
        "category_names": ["sightseeing", "historical"]
    }' > /dev/null

curl -s -X POST "$API_BASE_URL/trips/$TRIP_CITY/activities" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $MASTER_JWT" \
    -d '{
        "name": "Broadway Show Night",
        "description": "Evening performance of a top-rated Broadway musical with premium seating.",
        "category_names": ["entertainment", "cultural"]
    }' > /dev/null

curl -s -X POST "$API_BASE_URL/trips/$TRIP_CITY/activities" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $MASTER_JWT" \
    -d '{
        "name": "Central Park Picnic",
        "description": "Relaxing afternoon picnic in the heart of Manhattan with skyline views.",
        "category_names": ["outdoor", "relaxation"]
    }' > /dev/null

curl -s -X POST "$API_BASE_URL/trips/$TRIP_CITY/activities" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $MASTER_JWT" \
    -d '{
        "name": "Metropolitan Museum of Art Visit",
        "description": "Explore world-renowned art collections spanning 5000 years of human creativity.",
        "category_names": ["cultural", "museums"]
    }' > /dev/null

curl -s -X POST "$API_BASE_URL/trips/$TRIP_CITY/activities" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $MASTER_JWT" \
    -d '{
        "name": "Brooklyn Pizza Tour",
        "description": "Guided walking tour of Brooklyn best pizzerias with tastings at 5 locations.",
        "category_names": ["dining", "food tour"]
    }' > /dev/null

# Activities for Europe trip
info "Creating activities for Paris and Rome European Adventure"
curl -s -X POST "$API_BASE_URL/trips/$TRIP_EUROPE/activities" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $MASTER_JWT" \
    -d '{
        "name": "Eiffel Tower Evening Visit",
        "description": "Skip-the-line access to the iconic Eiffel Tower with champagne at the summit.",
        "category_names": ["sightseeing", "romantic"]
    }' > /dev/null

curl -s -X POST "$API_BASE_URL/trips/$TRIP_EUROPE/activities" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $MASTER_JWT" \
    -d '{
        "name": "Louvre Museum Private Tour",
        "description": "Exclusive guided tour of the world famous Louvre Museum including the Mona Lisa.",
        "category_names": ["cultural", "museums"]
    }' > /dev/null

curl -s -X POST "$API_BASE_URL/trips/$TRIP_EUROPE/activities" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $MASTER_JWT" \
    -d '{
        "name": "Colosseum and Roman Forum Tour",
        "description": "Step back in time with a guided tour of ancient Rome gladiator arenas and ruins.",
        "category_names": ["historical", "sightseeing"]
    }' > /dev/null

curl -s -X POST "$API_BASE_URL/trips/$TRIP_EUROPE/activities" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $MASTER_JWT" \
    -d '{
        "name": "Vatican Museums and Sistine Chapel",
        "description": "Early access tour of Vatican treasures including Michelangelo masterpieces.",
        "category_names": ["cultural", "religious", "museums"]
    }' > /dev/null

curl -s -X POST "$API_BASE_URL/trips/$TRIP_EUROPE/activities" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $MASTER_JWT" \
    -d '{
        "name": "Seine River Dinner Cruise",
        "description": "Romantic evening cruise on the Seine with gourmet French cuisine and live music.",
        "category_names": ["dining", "romantic", "cruise"]
    }' > /dev/null

log "Database seeded successfully!"
echo ""

# Display summary
echo "======================================"
echo "SEED DATA SUMMARY"
echo "======================================"
echo ""
echo "Users Created:"
echo "  - Alice Smith ($USER_ALICE)"
echo "  - Bob Johnson ($USER_BOB)"
echo "  - Charlie Davis ($USER_CHARLIE)"
echo "  - Diana Wilson ($USER_DIANA)"
echo "  - Eve Martinez ($USER_EVE)"
echo ""
echo "Trips Created:"
echo "  - Hawaii Beach Vacation ($TRIP_BEACH)"
echo "    Members: Alice (admin), Bob, Charlie"
echo "    Activities: 4"
echo ""
echo "  - Colorado Mountain Adventure ($TRIP_MOUNTAIN)"
echo "    Members: Bob (admin), Diana"
echo "    Activities: 4"
echo ""
echo "  - New York City Tour ($TRIP_CITY)"
echo "    Members: Alice (admin), Charlie, Eve"
echo "    Activities: 5"
echo ""
echo "  - Paris and Rome European Adventure ($TRIP_EUROPE)"
echo "    Members: Diana (admin), Eve"
echo "    Activities: 5"
echo ""

log "Data seeded! Starting interactive test menu..."
echo ""

# Interactive menu function
show_menu() {
    echo ""
    echo "======================================"
    echo "SEARCH API TEST MENU"
    echo "======================================"
    echo "1)  Run all search tests"
    echo "2)  Search trips by keyword"
    echo "3)  Search activities in Hawaii Beach Vacation"
    echo "4)  Search activities in Colorado Mountain Adventure"
    echo "5)  Search activities in New York City Tour"
    echo "6)  Search activities in Paris/Rome European Adventure"
    echo "7)  Search trip members"
    echo "8)  Test pagination"
    echo "9)  Test prefix matches"
    echo "10) View trip IDs and user IDs"
    echo "---"
    echo "14) Run comprehensive tests (all automated tests)"
    echo "---"
    echo "11) Seed database again"
    echo "12) Clear database (truncate all tables)"
    echo "13) De-seed database (remove volume & restart)"
    echo "0)  Exit"
    echo "======================================"
}

# Function to search trips
search_trips() {
    echo ""
    echo -e "${BLUE}=== Search Trips ===${NC}"
    read -p "Enter search query: " query
    echo ""
    echo "Running: curl -s \"$API_BASE_URL/search/trips?q=$query\" | jq"
    curl -s -H "Authorization: Bearer $MASTER_JWT" "$API_BASE_URL/search/trips?q=$query" | jq
}

# Function to search activities in beach trip
search_beach_activities() {
    echo ""
    echo -e "${BLUE}=== Search Activities in Hawaii Beach Vacation ===${NC}"
    read -p "Enter search query (try: snorkeling, dinner, water, surf): " query
    echo ""
    echo "Running: curl -s \"$API_BASE_URL/search/trips/$TRIP_BEACH/activities?q=$query\" | jq"
    curl -s -H "Authorization: Bearer $MASTER_JWT" "$API_BASE_URL/search/trips/$TRIP_BEACH/activities?q=$query" | jq
}

# Function to search activities in mountain trip
search_mountain_activities() {
    echo ""
    echo -e "${BLUE}=== Search Activities in Colorado Mountain Adventure ===${NC}"
    read -p "Enter search query (try: hiking, skiing, cabin, rafting): " query
    echo ""
    echo "Running: curl -s \"$API_BASE_URL/search/trips/$TRIP_MOUNTAIN/activities?q=$query\" | jq"
    curl -s -H "Authorization: Bearer $MASTER_JWT" "$API_BASE_URL/search/trips/$TRIP_MOUNTAIN/activities?q=$query" | jq
}

# Function to search activities in city trip
search_city_activities() {
    echo ""
    echo -e "${BLUE}=== Search Activities in New York City Tour ===${NC}"
    read -p "Enter search query (try: museum, broadway, park, pizza): " query
    echo ""
    echo "Running: curl -s \"$API_BASE_URL/search/trips/$TRIP_CITY/activities?q=$query\" | jq"
    curl -s -H "Authorization: Bearer $MASTER_JWT" "$API_BASE_URL/search/trips/$TRIP_CITY/activities?q=$query" | jq
}

# Function to search activities in europe trip
search_europe_activities() {
    echo ""
    echo -e "${BLUE}=== Search Activities in Paris/Rome European Adventure ===${NC}"
    read -p "Enter search query (try: tower, colosseum, museum, cruise): " query
    echo ""
    echo "Running: curl -s \"$API_BASE_URL/search/trips/$TRIP_EUROPE/activities?q=$query\" | jq"
    curl -s -H "Authorization: Bearer $MASTER_JWT" "$API_BASE_URL/search/trips/$TRIP_EUROPE/activities?q=$query" | jq
}

# Function to search trip members
search_members() {
    echo ""
    echo -e "${BLUE}=== Search Trip Members ===${NC}"
    echo "Available trips:"
    echo "  1. Hawaii Beach Vacation (Alice, Bob, Charlie)"
    echo "  2. Colorado Mountain Adventure (Bob, Diana)"
    echo "  3. New York City Tour (Alice, Charlie, Eve)"
    echo "  4. Paris/Rome European (Diana, Eve)"
    read -p "Select trip (1-4): " trip_choice
    read -p "Enter search query (name or username): " query
    
    case $trip_choice in
        1) TRIP_ID="$TRIP_BEACH" ;;
        2) TRIP_ID="$TRIP_MOUNTAIN" ;;
        3) TRIP_ID="$TRIP_CITY" ;;
        4) TRIP_ID="$TRIP_EUROPE" ;;
        *) echo "Invalid choice"; return ;;
    esac
    
    echo ""
    echo "Running: curl -s \"$API_BASE_URL/search/trips/$TRIP_ID/members?q=$query\" | jq"
    curl -s -H "Authorization: Bearer $MASTER_JWT" "$API_BASE_URL/search/trips/$TRIP_ID/members?q=$query" | jq
}

# Function to test pagination
test_pagination() {
    echo ""
    echo -e "${BLUE}=== Test Pagination ===${NC}"
    echo "Testing with City trip activities (5 total activities)"
    read -p "Enter limit (e.g., 2): " limit
    read -p "Enter offset (e.g., 0): " offset
    echo ""
    echo "Running: curl -s \"$API_BASE_URL/search/trips/$TRIP_CITY/activities?q=tour&limit=$limit&offset=$offset\" | jq"
    curl -s -H "Authorization: Bearer $MASTER_JWT" "$API_BASE_URL/search/trips/$TRIP_CITY/activities?q=tour&limit=$limit&offset=$offset" | jq
}

# Function to test prefix/partial matches
test_partial_matches() {
    echo ""
    echo -e "${BLUE}=== Test Prefix Matches ===${NC}"
    echo ""
    
    local test_num=0
    local pass_count=0
    
    # Test 1: Prefix match 'beac' should find 'beach' trip (Alice is member)
    test_num=$((test_num + 1))
    echo -n "Test $test_num: Searching for 'beac' (should match 'beach' trip)... "
    RESULT=$(curl -s -H "Authorization: Bearer $MASTER_JWT" "$API_BASE_URL/search/trips?q=beac" 2>/dev/null | jq -r '.items[]?.name // empty' 2>/dev/null)
    if [ -n "$RESULT" ] && echo "$RESULT" | grep -iq "beach"; then
        echo -e "${GREEN}✓ PASS${NC}"
        echo "  Found: $(echo "$RESULT" | grep -i "beach")"
        pass_count=$((pass_count + 1))
    else
        echo -e "${RED}✗ FAIL${NC}"
        echo "  Expected to find trip with 'beach' in name"
        echo "  Query: $API_BASE_URL/search/trips?q=beac"
        echo "  Result: $RESULT"
    fi
    echo ""
    
    # Test 2: Prefix match 'surf' should find 'surfing' activity in Beach trip (Alice is member)
    test_num=$((test_num + 1))
    echo -n "Test $test_num: Searching for 'surf' (should match 'surfing' activity)... "
    RESULT=$(curl -s -H "Authorization: Bearer $MASTER_JWT" "$API_BASE_URL/search/trips/$TRIP_BEACH/activities?q=surf" 2>/dev/null | jq -r '.items[]?.name // empty' 2>/dev/null)
    if [ -n "$RESULT" ] && echo "$RESULT" | grep -iq "surf"; then
        echo -e "${GREEN}✓ PASS${NC}"
        echo "  Found: $(echo "$RESULT" | grep -i "surf")"
        pass_count=$((pass_count + 1))
    else
        echo -e "${RED}✗ FAIL${NC}"
        echo "  Expected to find activity with 'surf' in name"
        echo "  Query: $API_BASE_URL/search/trips/$TRIP_BEACH/activities?q=surf"
        echo "  Result: $RESULT"
    fi
    echo ""
    
    # Test 3: Prefix match 'vaca' should find 'vacation' in trip name (Alice is member)
    test_num=$((test_num + 1))
    echo -n "Test $test_num: Searching for 'vaca' (should match 'vacation' trip)... "
    RESULT=$(curl -s -H "Authorization: Bearer $MASTER_JWT" "$API_BASE_URL/search/trips?q=vaca" 2>/dev/null | jq -r '.items[]?.name // empty' 2>/dev/null)
    if [ -n "$RESULT" ] && echo "$RESULT" | grep -iq "vacation"; then
        echo -e "${GREEN}✓ PASS${NC}"
        echo "  Found: $(echo "$RESULT" | grep -i "vacation")"
        pass_count=$((pass_count + 1))
    else
        echo -e "${RED}✗ FAIL${NC}"
        echo "  Expected to find trip with 'vacation' in name"
        echo "  Query: $API_BASE_URL/search/trips?q=vaca"
        echo "  Result: $RESULT"
    fi
    echo ""
    
    echo "Prefix Match Results: $pass_count/$test_num tests passed"
    echo "(Note: Searches are scoped to trips Alice is a member of: Beach and City)"
    return $((test_num - pass_count))
}

# Comprehensive test runner - runs all automated tests
run_comprehensive_tests() {
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}  COMPREHENSIVE TEST SUITE${NC}"
    echo -e "${GREEN}  (Options 1 + 8 + 10)${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    
    # Run all search tests (option 1)
    run_all_tests
    
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo ""
    
    # Run pagination tests (automated version of option 8)
    echo -e "${BLUE}8. Pagination Tests${NC}"
    echo ""
    
    local pagination_tests=0
    local pagination_passed=0
    
    # Test 8.1: Pagination with limit=2, offset=0
    pagination_tests=$((pagination_tests + 1))
    echo -n "  Test 8.1: Pagination (limit=2, offset=0)... "
    RESULT=$(curl -s -H "Authorization: Bearer $MASTER_JWT" "$API_BASE_URL/search/trips/$TRIP_CITY/activities?q=tour&limit=2&offset=0" 2>/dev/null)
    ITEMS=$(echo "$RESULT" | jq '.items | length' 2>/dev/null)
    TOTAL=$(echo "$RESULT" | jq '.total' 2>/dev/null)
    if [ "$ITEMS" = "2" ] && [ "$TOTAL" -ge 2 ]; then
        echo -e "${GREEN}✓ PASS${NC} (returned 2 items out of $TOTAL total)"
        pagination_passed=$((pagination_passed + 1))
    else
        echo -e "${RED}✗ FAIL${NC} (got $ITEMS items, expected 2)"
    fi
    
    # Test 8.2: Pagination with limit=2, offset=2
    pagination_tests=$((pagination_tests + 1))
    echo -n "  Test 8.2: Pagination (limit=2, offset=2)... "
    RESULT=$(curl -s -H "Authorization: Bearer $MASTER_JWT" "$API_BASE_URL/search/trips/$TRIP_CITY/activities?q=tour&limit=2&offset=2" 2>/dev/null)
    ITEMS=$(echo "$RESULT" | jq '.items | length' 2>/dev/null)
    OFFSET=$(echo "$RESULT" | jq '.offset' 2>/dev/null)
    if [ "$OFFSET" = "2" ]; then
        echo -e "${GREEN}✓ PASS${NC} (offset=$OFFSET, items=$ITEMS)"
        pagination_passed=$((pagination_passed + 1))
    else
        echo -e "${RED}✗ FAIL${NC} (got offset=$OFFSET, expected 2)"
    fi
    
    # Test 8.3: Pagination with limit=10 (should return all)
    pagination_tests=$((pagination_tests + 1))
    echo -n "  Test 8.3: Pagination (limit=10, offset=0)... "
    RESULT=$(curl -s -H "Authorization: Bearer $MASTER_JWT" "$API_BASE_URL/search/trips/$TRIP_CITY/activities?q=tour&limit=10&offset=0" 2>/dev/null)
    ITEMS=$(echo "$RESULT" | jq '.items | length' 2>/dev/null)
    TOTAL=$(echo "$RESULT" | jq '.total' 2>/dev/null)
    if [ "$ITEMS" = "$TOTAL" ]; then
        echo -e "${GREEN}✓ PASS${NC} (returned all $TOTAL items)"
        pagination_passed=$((pagination_passed + 1))
    else
        echo -e "${RED}✗ FAIL${NC} (got $ITEMS items, expected $TOTAL)"
    fi
    
    echo ""
    echo "======================================"
    echo -e "${BLUE}PAGINATION TEST SUMMARY${NC}"
    echo "======================================"
    echo "Total Tests: $pagination_tests"
    echo -e "Passed: ${GREEN}$pagination_passed${NC}"
    echo -e "Failed: ${RED}$((pagination_tests - pagination_passed))${NC}"
    
    if [ "$pagination_passed" -eq "$pagination_tests" ]; then
        echo -e "${GREEN}✓ All pagination tests passed!${NC}"
    else
        echo -e "${YELLOW}⚠️  Some pagination tests failed.${NC}"
    fi
    
    echo ""
    echo ""
    
    # Display IDs (option 10)
    view_ids
    
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}  COMPREHENSIVE TEST SUITE COMPLETED${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
}

# Function to view IDs
view_ids() {
    echo ""
    echo "======================================"
    echo "CREATED IDS"
    echo "======================================"
    echo ""
    echo "Users:"
    echo "  Alice Smith:     $USER_ALICE"
    echo "  Bob Johnson:     $USER_BOB"
    echo "  Charlie Davis:   $USER_CHARLIE"
    echo "  Diana Wilson:    $USER_DIANA"
    echo "  Eve Martinez:    $USER_EVE"
    echo ""
    echo "Trips:"
    echo "  Hawaii Beach:    $TRIP_BEACH"
    echo "  Colorado Mountain: $TRIP_MOUNTAIN"
    echo "  New York City:   $TRIP_CITY"
    echo "  Paris/Rome:      $TRIP_EUROPE"
    echo ""
}

# Function to de-seed database
deseed_database() {
    echo ""
    echo -e "${YELLOW}WARNING: This will remove all data from the database!${NC}"
    read -p "Are you sure you want to continue? (yes/no): " confirm
    
    if [ "$confirm" != "yes" ]; then
        echo "Cancelled."
        return
    fi
    
    log "Stopping database container..."
    cd "$BACKEND_DIR"
    docker compose stop postgres
    
    log "Removing database volume..."
    docker volume rm backend_pgdata 2>/dev/null || true
    
    log "Starting fresh database..."
    docker compose up -d postgres
    
    log "Waiting for database to be ready..."
    until docker exec database pg_isready -U dev_user -d dev_db > /dev/null 2>&1; do 
        sleep 1
    done
    
    log "Running migrations..."
    make migrate-up
    
    echo ""
    echo -e "${GREEN}Database cleaned successfully!${NC}"
    echo "The database is now empty with only the schema."
    echo ""
}

# Function to run all tests
run_all_tests() {
    echo ""
    echo -e "${GREEN}=== Running All Search Tests ===${NC}"
    echo ""
    echo -e "${YELLOW}Note: All searches are scoped to trips Alice is a member of (Beach and City trips)${NC}"
    echo ""
    
    local total_tests=0
    local passed_tests=0
    
    # Trip Searches
    echo -e "${BLUE}1. Trip Searches (Alice can only see her trips: Beach and City)${NC}"
    
    total_tests=$((total_tests + 1))
    echo -n "  Test 1.1: Search for 'beach' (expect: Hawaii Beach Vacation)... "
    RESULT=$(curl -s -H "Authorization: Bearer $MASTER_JWT" "$API_BASE_URL/search/trips?q=beach" 2>/dev/null | jq -r '.items[]?.name // empty' 2>/dev/null)
    if echo "$RESULT" | grep -iq "beach"; then
        echo -e "${GREEN}✓ PASS${NC}"
        passed_tests=$((passed_tests + 1))
    else
        echo -e "${RED}✗ FAIL${NC} (got: $RESULT)"
    fi
    
    total_tests=$((total_tests + 1))
    echo -n "  Test 1.2: Search for 'city' (expect: New York City Tour)... "
    RESULT=$(curl -s -H "Authorization: Bearer $MASTER_JWT" "$API_BASE_URL/search/trips?q=city" 2>/dev/null | jq -r '.items[]?.name // empty' 2>/dev/null)
    if echo "$RESULT" | grep -iq "city"; then
        echo -e "${GREEN}✓ PASS${NC}"
        passed_tests=$((passed_tests + 1))
    else
        echo -e "${RED}✗ FAIL${NC} (got: $RESULT)"
    fi
    
    total_tests=$((total_tests + 1))
    echo -n "  Test 1.3: Search for 'vacation' (expect: Hawaii Beach Vacation)... "
    RESULT=$(curl -s -H "Authorization: Bearer $MASTER_JWT" "$API_BASE_URL/search/trips?q=vacation" 2>/dev/null | jq -r '.items[]?.name // empty' 2>/dev/null)
    if echo "$RESULT" | grep -iq "vacation"; then
        echo -e "${GREEN}✓ PASS${NC}"
        passed_tests=$((passed_tests + 1))
    else
        echo -e "${RED}✗ FAIL${NC} (got: $RESULT)"
    fi
    echo ""
    
    # Activity Searches - Beach Trip
    echo -e "${BLUE}2. Activity Searches - Beach Trip (Alice is member)${NC}"
    total_tests=$((total_tests + 1))
    echo -n "  Test 2.1: Search for 'snorkel' in Beach trip... "
    RESULT=$(curl -s -H "Authorization: Bearer $MASTER_JWT" "$API_BASE_URL/search/trips/$TRIP_BEACH/activities?q=snorkel" 2>/dev/null | jq -r '.items[]?.name // empty' 2>/dev/null)
    COUNT=$(echo "$RESULT" | grep -c ^ || true)
    if [ "$COUNT" -ge 1 ]; then
        echo -e "${GREEN}✓ PASS${NC} (found $COUNT activities)"
        passed_tests=$((passed_tests + 1))
    else
        echo -e "${RED}✗ FAIL${NC} (found $COUNT activities, expected at least 1)"
    fi
    echo ""
    
    # Activity Searches - City Trip
    echo -e "${BLUE}3. Activity Searches - City Trip (Alice is member)${NC}"
    total_tests=$((total_tests + 1))
    echo -n "  Test 3.1: Search for 'museum' in City trip... "
    RESULT=$(curl -s -H "Authorization: Bearer $MASTER_JWT" "$API_BASE_URL/search/trips/$TRIP_CITY/activities?q=museum" 2>/dev/null | jq -r '.items[]?.name // empty' 2>/dev/null)
    if echo "$RESULT" | grep -iq "museum"; then
        echo -e "${GREEN}✓ PASS${NC}"
        passed_tests=$((passed_tests + 1))
    else
        echo -e "${RED}✗ FAIL${NC}"
    fi
    echo ""
    
    # Activity Searches - More City Trip tests
    echo -e "${BLUE}4. More Activity Searches - City Trip${NC}"
    total_tests=$((total_tests + 1))
    echo -n "  Test 4.1: Search for 'broadway' in City trip... "
    RESULT=$(curl -s -H "Authorization: Bearer $MASTER_JWT" "$API_BASE_URL/search/trips/$TRIP_CITY/activities?q=broadway" 2>/dev/null | jq -r '.items[]?.name // empty' 2>/dev/null)
    if echo "$RESULT" | grep -iq "broadway"; then
        echo -e "${GREEN}✓ PASS${NC}"
        passed_tests=$((passed_tests + 1))
    else
        echo -e "${RED}✗ FAIL${NC}"
    fi
    echo ""
    
    # Additional Beach Trip activity tests
    echo -e "${BLUE}5. More Activity Searches - Beach Trip${NC}"
    total_tests=$((total_tests + 1))
    echo -n "  Test 5.1: Search for 'surf' in Beach trip... "
    RESULT=$(curl -s -H "Authorization: Bearer $MASTER_JWT" "$API_BASE_URL/search/trips/$TRIP_BEACH/activities?q=surf" 2>/dev/null | jq -r '.items[]?.name // empty' 2>/dev/null)
    if echo "$RESULT" | grep -iq "surf"; then
        echo -e "${GREEN}✓ PASS${NC}"
        passed_tests=$((passed_tests + 1))
    else
        echo -e "${RED}✗ FAIL${NC}"
    fi
    echo ""
    
    # Member Searches
    echo -e "${BLUE}6. Member Searches${NC}"
    total_tests=$((total_tests + 1))
    echo -n "  Test 6.1: Search for 'alice' in Beach trip... "
    RESULT=$(curl -s -H "Authorization: Bearer $MASTER_JWT" "$API_BASE_URL/search/trips/$TRIP_BEACH/members?q=alice" 2>/dev/null | jq -r '.items[]?.username // empty' 2>/dev/null)
    if echo "$RESULT" | grep -iq "alice"; then
        echo -e "${GREEN}✓ PASS${NC}"
        passed_tests=$((passed_tests + 1))
    else
        echo -e "${RED}✗ FAIL${NC}"
    fi
    
    total_tests=$((total_tests + 1))
    echo -n "  Test 6.2: Search for 'charlie' in City trip... "
    RESULT=$(curl -s -H "Authorization: Bearer $MASTER_JWT" "$API_BASE_URL/search/trips/$TRIP_CITY/members?q=charlie" 2>/dev/null | jq -r '.items[]?.username // empty' 2>/dev/null)
    if echo "$RESULT" | grep -iq "charlie"; then
        echo -e "${GREEN}✓ PASS${NC}"
        passed_tests=$((passed_tests + 1))
    else
        echo -e "${RED}✗ FAIL${NC}"
    fi
    echo ""
    
    # Partial Match Tests
    echo -e "${BLUE}7. Partial Match Tests${NC}"
    test_partial_matches
    partial_result=$?
    passed_tests=$((passed_tests + 3 - partial_result))
    total_tests=$((total_tests + 3))
    
    # Summary
    echo ""
    echo "======================================"
    echo -e "${GREEN}TEST SUMMARY${NC}"
    echo "======================================"
    echo "Total Tests: $total_tests"
    echo -e "Passed: ${GREEN}$passed_tests${NC}"
    echo -e "Failed: ${RED}$((total_tests - passed_tests))${NC}"
    
    if [ "$passed_tests" -eq "$total_tests" ]; then
        echo ""
        echo -e "${GREEN}🎉 All tests passed!${NC}"
    else
        echo ""
        echo -e "${YELLOW}⚠️  Some tests failed. Please review the results above.${NC}"
    fi
    echo ""
}

# Main interactive loop
while true; do
    show_menu
    read -p "Enter your choice: " choice
    
    case $choice in
        1) run_all_tests ;;
        2) search_trips ;;
        3) search_beach_activities ;;
        4) search_mountain_activities ;;
        5) search_city_activities ;;
        6) search_europe_activities ;;
        7) search_members ;;
        8) test_pagination ;;
        9) test_partial_matches ;;
        10) view_ids ;;
        11) 
            log "Re-seeding database..."
            exec "$0"
            ;;
        12) clear_database ;;
        13) deseed_database ;;
        14) run_comprehensive_tests ;;
        0) 
            echo ""
            log "Exiting. Have a great day!"
            exit 0
            ;;
        *) 
            echo ""
            echo -e "${YELLOW}Invalid choice. Please try again.${NC}"
            ;;
    esac
    
    echo ""
    read -p "Press Enter to continue..."
done
