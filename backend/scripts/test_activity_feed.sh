#!/usr/bin/env bash

if [ -z "$BASH_VERSION" ]; then
    echo "Error: This script requires bash. Please run with: bash $0"
    exit 1
fi

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

API_BASE_URL="${API_BASE_URL:-http://localhost:8000/api/v1}"

# ─── colors ─────────────────────────────────────────────────────────────────

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log()  { echo -e "${GREEN}==>${NC} $1"; }
info() { echo -e "${BLUE}INFO:${NC} $1"; }
warn() { echo -e "${YELLOW}NOTE:${NC} $1"; }

# ─── helpers ─────────────────────────────────────────────────────────────────

echo "======================================"
echo "Activity Feed Test Script"
echo "API URL: $API_BASE_URL"
echo "======================================"

if ! command -v jq &>/dev/null; then
    echo "Error: jq is not installed. Install with 'brew install jq'."
    exit 1
fi

log "Checking backend connectivity..."
if ! curl -s --max-time 5 "$API_BASE_URL/../healthcheck" >/dev/null 2>&1; then
    echo ""
    echo -e "${YELLOW}WARNING: Cannot connect to backend at $API_BASE_URL${NC}"
    echo "Please ensure the backend is running: cd backend && make dev"
    echo ""
    read -rp "Continue anyway? (yes/no): " continue_choice
    if [ "$continue_choice" != "yes" ]; then exit 1; fi
else
    echo -e "${GREEN}✓ Backend is accessible${NC}"
fi

make_jwt() {
    local user_id="$1"
    cd "$BACKEND_DIR" && doppler run --project backend --config dev -- \
        go run -C internal/tests/testkit/fakes cmd/generate_jwt.go "$user_id"
}

new_uuid() { uuidgen | tr '[:upper:]' '[:lower:]'; }

api_post()  {
    local jwt="$1" path="$2" body="$3"
    curl -s -X POST "$API_BASE_URL$path" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $jwt" \
        -d "$body"
}

api_patch() {
    local jwt="$1" path="$2" body="$3"
    curl -s -X PATCH "$API_BASE_URL$path" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $jwt" \
        -d "$body"
}

api_get() {
    local jwt="$1" path="$2"
    curl -s "$API_BASE_URL$path" -H "Authorization: Bearer $jwt"
}

# ─── seed ────────────────────────────────────────────────────────────────────

seed_database() {
    echo ""
    log "Clearing database..."
    set +e
    docker exec -e PGPASSWORD=password database \
        psql -U dev_user -d dev_db -q -c "
            TRUNCATE
                poll_votes, poll_rankings, poll_options, polls,
                comments, images,
                activity_categories, activities,
                trip_invites, memberships, trips, categories
            RESTART IDENTITY CASCADE;
        "
    rc=$?
    set -e
    if [ $rc -eq 0 ]; then
        echo -e "${GREEN}✓ Database cleared${NC}"
    else
        echo -e "${RED}✗ Failed to clear database${NC}"
        exit 1
    fi

    log "Flushing Redis..."
    docker exec redis redis-cli --pass dev_redis_password FLUSHALL >/dev/null
    echo -e "${GREEN}✓ Redis flushed${NC}"

    log "Loading users from database..."
    local users_raw
    users_raw=$(docker exec -e PGPASSWORD=password database \
        psql -U dev_user -d dev_db -t -A -F'|' \
        -c "SELECT id, name, username FROM users ORDER BY name LIMIT 50;")

    if [ -z "$users_raw" ]; then
        echo -e "${RED}✗ No users found in database. Please create users first.${NC}"
        exit 1
    fi

    echo ""
    echo "Available users:"
    local i=1
    declare -a USER_IDS USER_NAMES
    while IFS='|' read -r uid name username; do
        printf "  %2d) %-20s  @%-20s  %s\n" "$i" "$name" "$username" "$uid"
        USER_IDS[$i]="$uid"
        USER_NAMES[$i]="$name"
        i=$(( i + 1 ))
    done <<< "$users_raw"

    local total=$(( i - 1 ))
    echo ""

    pick_user() {
        local role="$1"
        local choice
        while true; do
            read -rp "  Select user for $role (1-$total): " choice
            if [[ "$choice" =~ ^[0-9]+$ ]] && [ "$choice" -ge 1 ] && [ "$choice" -le "$total" ]; then
                echo "${USER_IDS[$choice]}"
                return
            fi
            echo "  Invalid choice, try again."
        done
    }

    log "Select 3 users for the test trip:"

    local alice_choice bob_choice charlie_choice
    while true; do
        read -rp "  Select user for User 1 (trip creator / admin) (1-$total): " alice_choice
        if [[ "$alice_choice" =~ ^[0-9]+$ ]] && [ "$alice_choice" -ge 1 ] && [ "$alice_choice" -le "$total" ]; then break; fi
        echo "  Invalid choice, try again."
    done
    while true; do
        read -rp "  Select user for User 2 (1-$total): " bob_choice
        if [[ "$bob_choice" =~ ^[0-9]+$ ]] && [ "$bob_choice" -ge 1 ] && [ "$bob_choice" -le "$total" ]; then break; fi
        echo "  Invalid choice, try again."
    done
    while true; do
        read -rp "  Select user for User 3 (1-$total): " charlie_choice
        if [[ "$charlie_choice" =~ ^[0-9]+$ ]] && [ "$charlie_choice" -ge 1 ] && [ "$charlie_choice" -le "$total" ]; then break; fi
        echo "  Invalid choice, try again."
    done

    ALICE_ID="${USER_IDS[$alice_choice]}"
    ALICE_NAME="${USER_NAMES[$alice_choice]}"
    BOB_ID="${USER_IDS[$bob_choice]}"
    BOB_NAME="${USER_NAMES[$bob_choice]}"
    CHARLIE_ID="${USER_IDS[$charlie_choice]}"
    CHARLIE_NAME="${USER_NAMES[$charlie_choice]}"

    ALICE_JWT=$(make_jwt "$ALICE_ID")
    BOB_JWT=$(make_jwt "$BOB_ID")
    CHARLIE_JWT=$(make_jwt "$CHARLIE_ID")

    log "Creating trip..."
    TRIP_RESP=$(api_post "$ALICE_JWT" "/trips" \
        '{"name":"Tokyo 2025","budget_min":1000,"budget_max":5000,"currency":"USD"}')
    if echo "$TRIP_RESP" | jq -e '.error' >/dev/null 2>&1; then
        echo -e "${RED}✗ Failed to create trip:${NC}"; echo "$TRIP_RESP" | jq; exit 1
    fi
    TRIP_ID=$(echo "$TRIP_RESP" | jq -r '.id')
    echo "  Trip: $TRIP_ID"

    log "Adding members..."
    api_post "$ALICE_JWT" "/memberships" \
        "{\"user_id\":\"$BOB_ID\",\"trip_id\":\"$TRIP_ID\",\"is_admin\":false,\"budget_min\":1000,\"budget_max\":3000}" \
        | jq -r "\"  $BOB_NAME joined    : \" + .user_id"
    api_post "$ALICE_JWT" "/memberships" \
        "{\"user_id\":\"$CHARLIE_ID\",\"trip_id\":\"$TRIP_ID\",\"is_admin\":false,\"budget_min\":800,\"budget_max\":2000}" \
        | jq -r "\"  $CHARLIE_NAME joined: \" + .user_id"

    log "Adding seed activity..."
    ACTIVITY_RESP=$(api_post "$ALICE_JWT" "/trips/$TRIP_ID/activities" \
        '{"name":"Visit Shibuya Crossing","description":"The famous scramble crossing!"}')
    if echo "$ACTIVITY_RESP" | jq -e '.error' >/dev/null 2>&1; then
        echo -e "${RED}✗ Failed to create seed activity:${NC}"; echo "$ACTIVITY_RESP" | jq; exit 1
    fi
    LAST_ACTIVITY_ID=$(echo "$ACTIVITY_RESP" | jq -r '.id')
    ACTIVITY_COUNT=1
    CATEGORY_COUNT=0
    echo "  Activity: $LAST_ACTIVITY_ID"

    echo ""
    echo "======================================"
    echo "SEED DATA SUMMARY"
    echo "======================================"
    echo ""
    echo "Users:"
    echo "  $ALICE_NAME   ($ALICE_ID)"
    echo "  $BOB_NAME     ($BOB_ID)"
    echo "  $CHARLIE_NAME ($CHARLIE_ID)"
    echo ""
    echo "Trip: Tokyo 2025"
    echo "  ID      : $TRIP_ID"
    echo "  Members : $ALICE_NAME (admin), $BOB_NAME, $CHARLIE_NAME"
    echo ""
    echo "Open the app → Testing → Test Activity Feed"
    echo "Enter Trip ID: $TRIP_ID"
    echo ""
}

# ─── actions ─────────────────────────────────────────────────────────────────

do_add_activity() {
    local actor="$1" jwt="$2"
    local -a names=(
        "Explore Akihabara"
        "Tsukiji Fish Market tour"
        "TeamLab Borderless"
        "Harajuku street food crawl"
        "Mount Fuji day trip"
        "Senso-ji Temple visit"
        "Shinjuku Gyoen picnic"
        "Odaiba waterfront walk"
    )
    local idx=$(( ACTIVITY_COUNT % ${#names[@]} ))
    local name="${names[$idx]}"

    echo ""
    info "$actor creates activity: \"$name\""
    local resp
    resp=$(api_post "$jwt" "/trips/$TRIP_ID/activities" \
        "{\"name\":\"$name\",\"description\":\"Suggested by $actor\"}")
    LAST_ACTIVITY_ID=$(echo "$resp" | jq -r '.id')
    echo -e "  ${GREEN}✓${NC} Activity: $LAST_ACTIVITY_ID"
    echo "  → Feed event fired for other members"
    ACTIVITY_COUNT=$(( ACTIVITY_COUNT + 1 ))
}

do_add_comment() {
    local actor="$1" jwt="$2"
    local -a messages=(
        "This looks amazing!"
        "Can't wait — adding to my list."
        "Should we book early?"
        "Been here before, highly recommend."
        "Who else is keen?"
        "Let's do this on day 3."
    )
    local msg="${messages[$((RANDOM % ${#messages[@]}))]}"

    echo ""
    info "$actor comments: \"$msg\""
    api_post "$jwt" "/comments" \
        "{\"trip_id\":\"$TRIP_ID\",\"entity_type\":\"activity\",\"entity_id\":\"$LAST_ACTIVITY_ID\",\"content\":\"$msg\"}" \
        | jq -r '"  \u2713 Comment: " + .id'
    echo "  → Feed event fired for other members"
}

do_update_trip() {
    local actor="$1" jwt="$2"
    local -a names=(
        "Tokyo 2025 🗼"
        "Japan Adventure"
        "Tokyo + Kyoto 2025"
        "Epic Japan Trip"
        "Sakura Season 2025"
    )
    local name="${names[$((RANDOM % ${#names[@]}))]}"

    echo ""
    info "$actor renames trip to: \"$name\""
    api_patch "$jwt" "/trips/$TRIP_ID" \
        "{\"name\":\"$name\"}" \
        | jq -r '"  \u2713 Trip name: " + .name'
    echo "  → Feed event fired for other members"
}

do_add_category() {
    local actor="$1" jwt="$2"
    local -a cat_names=("food" "nightlife" "shopping" "nature" "culture" "sports" "wellness" "budget")
    local -a cat_labels=("Food & Drinks" "Nightlife" "Shopping" "Nature" "Culture" "Sports" "Wellness" "Budget")
    local idx=$(( CATEGORY_COUNT % ${#cat_names[@]} ))
    local name="${cat_names[$idx]}"
    local label="${cat_labels[$idx]}"

    echo ""
    info "$actor adds category: \"$label\""
    api_post "$jwt" "/trips/$TRIP_ID/categories" \
        "{\"trip_id\":\"$TRIP_ID\",\"name\":\"$name\",\"label\":\"$label\"}" \
        | jq -r '"  \u2713 Category: " + .name'
    echo "  → Feed event fired for other members"
    CATEGORY_COUNT=$(( CATEGORY_COUNT + 1 ))
}

do_feed() {
    local actor="$1" jwt="$2"
    echo ""
    echo -e "${BLUE}=== $actor's Activity Feed ===${NC}"
    local result count
    result=$(api_get "$jwt" "/trips/$TRIP_ID/activity")
    count=$(echo "$result" | jq 'length')
    if [ "$count" -eq 0 ]; then
        warn "No new events since last read"
    else
        echo "  $count event(s):"
        echo "$result" | jq -r '.[] | "  -> [\(.topic)] actor=\(.actor_id // "-") entity=\(.entity_id // "-")"'
    fi
}

do_unread() {
    local actor="$1" jwt="$2"
    echo ""
    echo -e "${BLUE}=== $actor's Unread Count ===${NC}"
    api_get "$jwt" "/trips/$TRIP_ID/activity/unread-count" | jq .
}

view_ids() {
    echo ""
    echo "  Trip ID : $TRIP_ID"
    echo "  User 1  : $ALICE_NAME ($ALICE_ID)"
    echo "  User 2  : $BOB_NAME ($BOB_ID)"
    echo "  User 3  : $CHARLIE_NAME ($CHARLIE_ID)"
    echo ""
}

# ─── menu ────────────────────────────────────────────────────────────────────

show_menu() {
    echo ""
    echo "======================================"
    echo "ACTIVITY FEED TEST MENU"
    echo "======================================"
    echo "Push events:"
    echo "  1) $ALICE_NAME adds an activity      ($BOB_NAME & $CHARLIE_NAME get feed events)"
    echo "  2) $BOB_NAME adds an activity        ($ALICE_NAME & $CHARLIE_NAME get feed events)"
    echo "  3) $CHARLIE_NAME adds an activity    ($ALICE_NAME & $BOB_NAME get feed events)"
    echo "  4) $ALICE_NAME adds a comment        ($BOB_NAME & $CHARLIE_NAME get feed events)"
    echo "  5) $BOB_NAME adds a comment          ($ALICE_NAME & $CHARLIE_NAME get feed events)"
    echo "  6) $CHARLIE_NAME adds a comment      ($ALICE_NAME & $BOB_NAME get feed events)"
    echo "  7) $ALICE_NAME renames the trip      ($BOB_NAME & $CHARLIE_NAME get feed events)"
    echo "  8) $BOB_NAME renames the trip        ($ALICE_NAME & $CHARLIE_NAME get feed events)"
    echo "  9) $CHARLIE_NAME renames the trip    ($ALICE_NAME & $BOB_NAME get feed events)"
    echo "  10) $ALICE_NAME adds a category      ($BOB_NAME & $CHARLIE_NAME get feed events)"
    echo "---"
    echo "Read feed:"
    echo "  11) Check $ALICE_NAME's feed"
    echo "  12) Check $BOB_NAME's feed"
    echo "  13) Check $CHARLIE_NAME's feed"
    echo "  14) Unread count ($ALICE_NAME)"
    echo "  15) Unread count ($BOB_NAME)"
    echo "  16) Unread count ($CHARLIE_NAME)"
    echo "---"
    echo "  17) View IDs"
    echo "  18) Reseed database"
    echo "  0)  Exit"
    echo "======================================"
}

# ─── main ────────────────────────────────────────────────────────────────────

seed_database

log "Data seeded! Starting interactive test menu..."

while true; do
    show_menu
    read -rp "Enter your choice: " choice

    case $choice in
        1)  do_add_activity "$ALICE_NAME"   "$ALICE_JWT" ;;
        2)  do_add_activity "$BOB_NAME"     "$BOB_JWT" ;;
        3)  do_add_activity "$CHARLIE_NAME" "$CHARLIE_JWT" ;;
        4)  do_add_comment  "$ALICE_NAME"   "$ALICE_JWT" ;;
        5)  do_add_comment  "$BOB_NAME"     "$BOB_JWT" ;;
        6)  do_add_comment  "$CHARLIE_NAME" "$CHARLIE_JWT" ;;
        7)  do_update_trip  "$ALICE_NAME"   "$ALICE_JWT" ;;
        8)  do_update_trip  "$BOB_NAME"     "$BOB_JWT" ;;
        9)  do_update_trip  "$CHARLIE_NAME" "$CHARLIE_JWT" ;;
        10) do_add_category "$ALICE_NAME"   "$ALICE_JWT" ;;
        11) do_feed         "$ALICE_NAME"   "$ALICE_JWT" ;;
        12) do_feed         "$BOB_NAME"     "$BOB_JWT" ;;
        13) do_feed         "$CHARLIE_NAME" "$CHARLIE_JWT" ;;
        14) do_unread       "$ALICE_NAME"   "$ALICE_JWT" ;;
        15) do_unread       "$BOB_NAME"     "$BOB_JWT" ;;
        16) do_unread       "$CHARLIE_NAME" "$CHARLIE_JWT" ;;
        17) view_ids ;;
        18)
            log "Reseeding database..."
            exec "$0"
            ;;
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
    read -rp "Press Enter to continue..."
done
