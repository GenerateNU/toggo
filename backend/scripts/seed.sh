#!/usr/bin/env bash
# seed.sh – Comprehensive demo-data seeding script for toggo
#
# Usage:
#   ./seed.sh reseed <your_user_id>   Delete all data (keep your user row) then seed
#   ./seed.sh delete <your_user_id>   Delete all data INCLUDING your user row
#   ./seed.sh nuke                    Delete ALL data and ALL users (full wipe)
#   ./seed.sh status                  Show row counts for every table
#
# Prerequisites: jq, doppler, docker (containers: "database", "redis")

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
API_BASE_URL="${API_BASE_URL:-http://localhost:8000/api/v1}"

# ─── colors ──────────────────────────────────────────────────────────────────

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

log()  { echo -e "${GREEN}==> ${NC}$*"; }
info() { echo -e "${BLUE}--> ${NC}$*"; }
warn() { echo -e "${YELLOW}NOTE:${NC} $*"; }
err()  { echo -e "${RED}[✗]${NC} $*"; }
ok()   { echo -e "  ${GREEN}✓${NC} $*"; }

# ─── prerequisites ────────────────────────────────────────────────────────────

preflight() {
    local failed=0
    command -v jq      &>/dev/null || { err "jq not found – brew install jq";         failed=1; }
    command -v doppler &>/dev/null || { err "doppler not found – brew install dopplerhq/cli/doppler"; failed=1; }
    docker exec database true 2>/dev/null || { err "Docker container 'database' is not running"; failed=1; }
    docker exec redis    true 2>/dev/null || { err "Docker container 'redis' is not running";    failed=1; }
    [ $failed -eq 1 ] && exit 1

    if ! curl -s --max-time 5 "$API_BASE_URL/../healthcheck" >/dev/null 2>&1; then
        warn "Cannot reach backend at $API_BASE_URL"
        read -rp "  Continue anyway? (yes/no): " _cont
        [ "$_cont" = "yes" ] || exit 1
    fi
}

# ─── helpers ─────────────────────────────────────────────────────────────────

new_uuid() { uuidgen | tr '[:upper:]' '[:lower:]'; }

make_jwt() {
    local user_id="$1"
    cd "$BACKEND_DIR" && doppler run --project backend --config dev -- \
        go run -C internal/tests/testkit/fakes cmd/generate_jwt.go "$user_id"
}

db() {
    docker exec -e PGPASSWORD=password database \
        psql -U dev_user -d dev_db -t -A -q -c "$1"
}

db_quiet() {
    docker exec -e PGPASSWORD=password database \
        psql -U dev_user -d dev_db -q -c "$1" 2>&1
}

api_post() {
    local jwt="$1" path="$2" body="$3"
    curl -s --max-time 20 -X POST "$API_BASE_URL$path" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $jwt" \
        -d "$body"
}

api_put() {
    local jwt="$1" path="$2" body="$3"
    curl -s --max-time 20 -X PUT "$API_BASE_URL$path" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $jwt" \
        -d "$body"
}

api_patch() {
    local jwt="$1" path="$2" body="$3"
    curl -s --max-time 20 -X PATCH "$API_BASE_URL$path" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $jwt" \
        -d "$body"
}

check_resp() {
    local resp="$1" label="$2"
    if echo "$resp" | jq -e '.statusCode' >/dev/null 2>&1; then
        err "$label failed:"; echo "$resp" | jq; exit 1
    fi
    if [ "$(echo "$resp" | jq -r '.id // empty')" = "" ]; then
        err "$label – response missing id:"; echo "$resp" | jq; exit 1
    fi
}

trip_id_of() { echo "$1" | jq -r '.id'; }

# ─── wipe ────────────────────────────────────────────────────────────────────

clear_all_except_user() {
    local keep_user_id="$1"
    log "Clearing database (keeping user $keep_user_id)..."

    db_quiet "UPDATE trips SET rank_poll_id = NULL WHERE rank_poll_id IS NOT NULL;"

    db_quiet "
        TRUNCATE
            poll_votes,
            poll_rankings,
            poll_options,
            comment_reactions,
            comments,
            activity_rsvps,
            activity_categories,
            activity_images,
            pitch_images,
            pitch_links,
            trip_pitches,
            activities,
            trip_invites,
            memberships,
            polls,
            categories,
            trips,
            images
        RESTART IDENTITY CASCADE;
    "

    # Remove fake users but keep the real account
    db_quiet "DELETE FROM users WHERE id != '$keep_user_id';"

    log "Flushing Redis..."
    docker exec redis redis-cli --pass dev_redis_password FLUSHALL >/dev/null
    ok "Database cleared"
}

clear_everything() {
    log "Nuking entire database..."

    db_quiet "UPDATE trips SET rank_poll_id = NULL WHERE rank_poll_id IS NOT NULL;"

    db_quiet "
        TRUNCATE
            poll_votes,
            poll_rankings,
            poll_options,
            comment_reactions,
            comments,
            activity_rsvps,
            activity_categories,
            activity_images,
            pitch_images,
            pitch_links,
            trip_pitches,
            activities,
            trip_invites,
            memberships,
            polls,
            categories,
            trips,
            images,
            users
        RESTART IDENTITY CASCADE;
    "

    docker exec redis redis-cli --pass dev_redis_password FLUSHALL >/dev/null
    ok "Database fully wiped"
}

delete_user_only() {
    local user_id="$1"
    log "Removing user $user_id and all associated data..."

    db_quiet "UPDATE trips SET rank_poll_id = NULL
              WHERE id IN (SELECT trip_id FROM memberships WHERE user_id = '$user_id');"

    # Cascade handles memberships, activities owned, pitches, comments etc.
    db_quiet "DELETE FROM users WHERE id = '$user_id';"

    docker exec redis redis-cli --pass dev_redis_password FLUSHALL >/dev/null
    ok "User and all associated data removed"
}

# ─── status ──────────────────────────────────────────────────────────────────

show_status() {
    echo ""
    echo -e "${CYAN}══════════════ DB Status ══════════════${NC}"
    local tables=(users trips memberships activities categories
                  trip_pitches pitch_links polls poll_options poll_votes
                  poll_rankings comments comment_reactions activity_rsvps
                  trip_invites images)
    for tbl in "${tables[@]}"; do
        local count
        count=$(db "SELECT COUNT(*) FROM $tbl;" 2>/dev/null || echo "?")
        printf "  %-28s %s\n" "$tbl" "$count"
    done
    echo -e "${CYAN}═══════════════════════════════════════${NC}"
    echo ""
}

# ─── fake users ───────────────────────────────────────────────────────────────

MAYA_ID=""
CARLOS_ID=""
PRIYA_ID=""
JAMES_ID=""
MAYA_JWT=""
CARLOS_JWT=""
PRIYA_JWT=""
JAMES_JWT=""

seed_fake_users() {
    log "Creating fake users..."

    MAYA_ID=$(new_uuid)
    CARLOS_ID=$(new_uuid)
    PRIYA_ID=$(new_uuid)
    JAMES_ID=$(new_uuid)

    db_quiet "
        INSERT INTO users (id, name, username, phone_number, timezone) VALUES
          ('$MAYA_ID',   'Maya Johnson',  'maya_johnson',  '+15550010001', 'America/Los_Angeles'),
          ('$CARLOS_ID', 'Carlos Rivera', 'carlos_rivera', '+15550020002', 'America/Chicago'),
          ('$PRIYA_ID',  'Priya Patel',   'priya_patel',   '+15550030003', 'America/New_York'),
          ('$JAMES_ID',  'James Kim',     'james_kim',     '+15550040004', 'America/New_York');
    "

    info "Generating JWTs..."
    MAYA_JWT=$(make_jwt "$MAYA_ID")
    CARLOS_JWT=$(make_jwt "$CARLOS_ID")
    PRIYA_JWT=$(make_jwt "$PRIYA_ID")
    JAMES_JWT=$(make_jwt "$JAMES_ID")

    ok "Fake users: Maya ($MAYA_ID), Carlos ($CARLOS_ID), Priya ($PRIYA_ID), James ($JAMES_ID)"
}

# ─── membership helper ────────────────────────────────────────────────────────

add_member_sql() {
    local user_id="$1" trip_id="$2" is_admin="$3"
    local bmin="${4:-500}" bmax="${5:-3000}"
    db_quiet "
        INSERT INTO memberships (user_id, trip_id, is_admin, budget_min, budget_max)
        VALUES ('$user_id', '$trip_id', $is_admin, $bmin, $bmax)
        ON CONFLICT (user_id, trip_id) DO NOTHING;
    "
}

insert_pitch_sql() {
    local pitch_id trip_id user_id title description duration
    pitch_id=$(new_uuid)
    trip_id="$1"; user_id="$2"; title="$3"; description="$4"; duration="${5:-90}"
    local fake_key="demo/pitches/${trip_id}/${pitch_id}.m4a"
    db_quiet "
        INSERT INTO trip_pitches (id, trip_id, user_id, title, description, audio_s3_key, duration)
        VALUES ('$pitch_id', '$trip_id', '$user_id',
                $(echo "$title" | sed "s/'/''/g; s/.*/'&'/"),
                $(echo "$description" | sed "s/'/''/g; s/.*/'&'/"),
                '$fake_key', $duration);
    "
    echo "$pitch_id"
}

set_poll_deadline_sql() {
    local poll_id="$1" deadline="$2"
    db_quiet "UPDATE polls SET deadline = '$deadline' WHERE id = '$poll_id';"
}

create_invite_sql() {
    local invite_id trip_id created_by code
    invite_id=$(new_uuid)
    trip_id="$1"; created_by="$2"; code="$3"
    db_quiet "
        INSERT INTO trip_invites (id, trip_id, created_by, code, expires_at)
        VALUES ('$invite_id', '$trip_id', '$created_by', '$code',
                NOW() + INTERVAL '30 days');
    "
    echo "$invite_id"
}

# ─── Trip 1: Santorini Escape ─────────────────────────────────────────────────
# Maya is admin. User is a member. Carlos also joins.

seed_trip_santorini() {
    echo ""
    log "[Trip 1] Santorini Escape – Maya is admin, YOU are NOT a member (past trip)"

    # Maya creates the trip
    local resp
    resp=$(api_post "$MAYA_JWT" "/trips" '{
        "name": "Santorini Escape",
        "budget_min": 2000,
        "budget_max": 4500,
        "currency": "USD",
        "start_date": "2026-01-15T00:00:00Z",
        "end_date":   "2026-01-22T00:00:00Z"
    }')
    check_resp "$resp" "Create Santorini trip"
    local trip_id; trip_id=$(trip_id_of "$resp")
    api_patch "$MAYA_JWT" "/trips/$trip_id" '{"location":"Santorini, Greece"}' >/dev/null
    ok "Trip created: $trip_id"

    # User is NOT added – they can join via invite code
    add_member_sql "$CARLOS_ID" "$trip_id" false 2000 4000
    add_member_sql "$PRIYA_ID"  "$trip_id" false 1800 3500
    ok "Members added (Carlos + Priya, not you)"

    # Custom categories
    api_post "$MAYA_JWT" "/trips/$trip_id/categories" \
        '{"name":"beaches","label":"Beaches","icon":"🏖️"}' >/dev/null
    api_post "$MAYA_JWT" "/trips/$trip_id/categories" \
        '{"name":"food","label":"Food & Wine","icon":"🍷"}' >/dev/null
    api_post "$MAYA_JWT" "/trips/$trip_id/categories" \
        '{"name":"nightlife","label":"Nightlife","icon":"🌙"}' >/dev/null
    ok "Categories created"

    # Activities
    local a1 a2 a3 a4
    resp=$(api_post "$MAYA_JWT" "/trips/$trip_id/activities" '{
        "name": "Sunset at Oia",
        "description": "Watch the famous Santorini sunset from the cliffs of Oia village.",
        "time_of_day": "evening",
        "location_name": "Oia, Santorini",
        "location_lat": 36.4618,
        "location_lng": 25.3753,
        "estimated_price": 0
    }')
    check_resp "$resp" "Activity: Sunset at Oia"
    a1=$(echo "$resp" | jq -r '.id')

    resp=$(api_post "$MAYA_JWT" "/trips/$trip_id/activities" '{
        "name": "Catamaran Sailing Tour",
        "description": "Half-day sailing around the caldera with snorkelling stops and BBQ on board.",
        "time_of_day": "afternoon",
        "location_name": "Ammoudi Bay, Santorini",
        "estimated_price": 85
    }')
    check_resp "$resp" "Activity: Catamaran"
    a2=$(echo "$resp" | jq -r '.id')

    resp=$(api_post "$PRIYA_JWT" "/trips/$trip_id/activities" '{
        "name": "Akrotiri Excavations",
        "description": "Explore the ancient Minoan settlement buried by the volcanic eruption.",
        "time_of_day": "morning",
        "location_name": "Akrotiri Archaeological Site",
        "estimated_price": 12
    }')
    check_resp "$resp" "Activity: Akrotiri"
    a3=$(echo "$resp" | jq -r '.id')

    resp=$(api_post "$CARLOS_JWT" "/trips/$trip_id/activities" '{
        "name": "Wine Tasting at Santo Wines",
        "description": "Sample local Assyrtiko wines with a spectacular caldera view.",
        "time_of_day": "afternoon",
        "location_name": "Santo Wines Winery, Pyrgos",
        "estimated_price": 35
    }')
    check_resp "$resp" "Activity: Wine Tasting"
    a4=$(echo "$resp" | jq -r '.id')
    ok "4 activities created"

    # Assign categories to activities
    api_put "$MAYA_JWT" "/trips/$trip_id/activities/$a1/categories/nightlife" '{}' >/dev/null
    api_put "$MAYA_JWT" "/trips/$trip_id/activities/$a2/categories/beaches"  '{}' >/dev/null
    api_put "$MAYA_JWT" "/trips/$trip_id/activities/$a4/categories/food"     '{}' >/dev/null

    # RSVPs
    api_put "$MAYA_JWT"   "/trips/$trip_id/activities/$a1/rsvps" '{"status":"yes"}'   >/dev/null
    api_put "$MAYA_JWT"   "/trips/$trip_id/activities/$a2/rsvps" '{"status":"yes"}'   >/dev/null
    api_put "$CARLOS_JWT" "/trips/$trip_id/activities/$a2/rsvps" '{"status":"maybe"}' >/dev/null
    api_put "$CARLOS_JWT" "/trips/$trip_id/activities/$a3/rsvps" '{"status":"yes"}'   >/dev/null
    api_put "$CARLOS_JWT" "/trips/$trip_id/activities/$a4/rsvps" '{"status":"yes"}'   >/dev/null
    api_put "$PRIYA_JWT"  "/trips/$trip_id/activities/$a1/rsvps" '{"status":"yes"}'   >/dev/null
    api_put "$PRIYA_JWT"  "/trips/$trip_id/activities/$a3/rsvps" '{"status":"maybe"}' >/dev/null
    api_put "$PRIYA_JWT"  "/trips/$trip_id/activities/$a4/rsvps" '{"status":"yes"}'   >/dev/null
    ok "RSVPs recorded"

    # Polls
    resp=$(api_post "$MAYA_JWT" "/trips/$trip_id/vote-polls" '{
        "question": "Where should we have our last dinner?",
        "poll_type": "single",
        "options": [
            {"option_type":"custom","name":"Argo Restaurant"},
            {"option_type":"custom","name":"Selene Fine Dining"},
            {"option_type":"custom","name":"Metaxy Mas Taverna"},
            {"option_type":"custom","name":"Sunset Ammoudi Fish Tavern"}
        ],
        "is_anonymous": false,
        "should_notify_members": false
    }')
    check_resp "$resp" "Poll: last dinner"
    local poll1_id; poll1_id=$(echo "$resp" | jq -r '.id')
    set_poll_deadline_sql "$poll1_id" "2026-01-20T00:00:00Z"
    local opt1_ids; opt1_ids=$(echo "$resp" | jq -r '.options[].id')
    local opt1_arr=(); while IFS= read -r line; do opt1_arr+=("$line"); done <<< "$opt1_ids"

    # Cast votes
    api_post "$PRIYA_JWT"  "/trips/$trip_id/vote-polls/$poll1_id/vote" \
        "{\"option_ids\":[\"${opt1_arr[1]}\"]}" >/dev/null
    api_post "$CARLOS_JWT" "/trips/$trip_id/vote-polls/$poll1_id/vote" \
        "{\"option_ids\":[\"${opt1_arr[1]}\"]}" >/dev/null
    api_post "$MAYA_JWT"   "/trips/$trip_id/vote-polls/$poll1_id/vote" \
        "{\"option_ids\":[\"${opt1_arr[2]}\"]}" >/dev/null

    resp=$(api_post "$CARLOS_JWT" "/trips/$trip_id/vote-polls" '{
        "question": "Which days work best for sailing?",
        "poll_type": "multi",
        "options": [
            {"option_type":"custom","name":"Day 2 (Jan 16)"},
            {"option_type":"custom","name":"Day 4 (Jan 18)"},
            {"option_type":"custom","name":"Day 6 (Jan 20)"}
        ],
        "is_anonymous": false,
        "should_notify_members": false
    }')
    check_resp "$resp" "Poll: sailing days"
    local poll2_id; poll2_id=$(echo "$resp" | jq -r '.id')
    set_poll_deadline_sql "$poll2_id" "2026-01-14T00:00:00Z"
    local opt2_ids; opt2_ids=$(echo "$resp" | jq -r '.options[].id')
    local opt2_arr=(); while IFS= read -r line; do opt2_arr+=("$line"); done <<< "$opt2_ids"

    api_post "$MAYA_JWT"  "/trips/$trip_id/vote-polls/$poll2_id/vote" \
        "{\"option_ids\":[\"${opt2_arr[0]}\",\"${opt2_arr[2]}\"]}" >/dev/null
    api_post "$CARLOS_JWT" "/trips/$trip_id/vote-polls/$poll2_id/vote" \
        "{\"option_ids\":[\"${opt2_arr[1]}\"]}" >/dev/null
    ok "Polls + votes created"

    # Pitches (inserted directly via SQL – no real audio file needed for demo)
    local p1 p2
    p1=$(insert_pitch_sql "$trip_id" "$MAYA_ID" \
        "Why Santorini is perfect for us" \
        "I have been dreaming about this trip for years. The caldera views, the white-washed villages, and the incredible food make it an unforgettable experience. Budget is very reasonable if we book early." 95)
    p2=$(insert_pitch_sql "$trip_id" "$CARLOS_ID" \
        "Alternative: Mykonos instead?" \
        "Hear me out – Mykonos has better nightlife and beaches. We could split the week between both islands." 60)
    ok "Pitches seeded"

    # Pitch links
    api_post "$MAYA_JWT" "/trips/$trip_id/pitches/$p1/links" \
        '{"url":"https://www.booking.com","title":"Best Santorini Hotels 2025","description":"Curated list of top-rated caldera hotels","domain":"booking.com"}' >/dev/null

    # Comments on activities
    local c1
    resp=$(api_post "$MAYA_JWT" "/comments" \
        "{\"trip_id\":\"$trip_id\",\"entity_type\":\"activity\",\"entity_id\":\"$a1\",\"content\":\"This is a must-do! The sunset there is absolutely magical.\"}")
    c1=$(echo "$resp" | jq -r '.id')

    api_post "$PRIYA_JWT" "/comments" \
        "{\"trip_id\":\"$trip_id\",\"entity_type\":\"activity\",\"entity_id\":\"$a1\",\"content\":\"100% agree, I've heard Oia gets crowded – should we arrive early?\"}" >/dev/null

    api_post "$CARLOS_JWT" "/comments" \
        "{\"trip_id\":\"$trip_id\",\"entity_type\":\"activity\",\"entity_id\":\"$a2\",\"content\":\"I found one that includes unlimited drinks. Let me share the link!\"}" >/dev/null

    api_post "$PRIYA_JWT" "/comments" \
        "{\"trip_id\":\"$trip_id\",\"entity_type\":\"activity\",\"entity_id\":\"$a4\",\"content\":\"The Assyrtiko wine from here is incredible – already tried it at a restaurant back home.\"}" >/dev/null

    # Reactions on a comment
    api_post "$CARLOS_JWT" "/comments/$c1/reactions" '{"emoji":"❤️"}'  >/dev/null
    api_post "$PRIYA_JWT"  "/comments/$c1/reactions" '{"emoji":"🔥"}'  >/dev/null
    ok "Comments + reactions seeded"

    # Invite code
    create_invite_sql "$trip_id" "$MAYA_ID" "SANTORINI25" >/dev/null
    ok "Invite code: SANTORINI25"

    echo "  Trip ID: $trip_id"
    SANTORINI_TRIP_ID="$trip_id"
}

# ─── Trip 2: Tokyo 2025 ───────────────────────────────────────────────────────
# Carlos is admin. User and Priya are members.

seed_trip_tokyo() {
    echo ""
    log "[Trip 2] Tokyo 2026 – Carlos is admin, YOU are NOT a member (future trip)"

    local resp
    resp=$(api_post "$CARLOS_JWT" "/trips" '{
        "name": "Tokyo 2026",
        "budget_min": 3000,
        "budget_max": 6000,
        "currency": "USD",
        "start_date": "2026-07-10T00:00:00Z",
        "end_date":   "2026-07-20T00:00:00Z"
    }')
    check_resp "$resp" "Create Tokyo trip"
    local trip_id; trip_id=$(trip_id_of "$resp")
    api_patch "$CARLOS_JWT" "/trips/$trip_id" '{"location":"Tokyo, Japan"}' >/dev/null
    ok "Trip created: $trip_id"

    # User is NOT added – they can join via invite code
    add_member_sql "$PRIYA_ID" "$trip_id" false 3000 5500
    add_member_sql "$JAMES_ID" "$trip_id" false 2500 5000
    ok "Members added (Priya + James, not you)"

    # Custom categories
    api_post "$CARLOS_JWT" "/trips/$trip_id/categories" \
        '{"name":"food","label":"Food & Ramen","icon":"🍜"}' >/dev/null
    api_post "$CARLOS_JWT" "/trips/$trip_id/categories" \
        '{"name":"tech","label":"Tech & Anime","icon":"🎮"}' >/dev/null
    api_post "$CARLOS_JWT" "/trips/$trip_id/categories" \
        '{"name":"day_trips","label":"Day Trips","icon":"🗻"}' >/dev/null

    # Activities
    local a1 a2 a3 a4 a5
    resp=$(api_post "$CARLOS_JWT" "/trips/$trip_id/activities" '{
        "name": "Shibuya Crossing & Scramble",
        "description": "Experience the world-famous pedestrian scramble and explore Shibuya Centre-gai.",
        "time_of_day": "evening",
        "location_name": "Shibuya, Tokyo",
        "location_lat": 35.6595,
        "location_lng": 139.7004,
        "estimated_price": 0
    }')
    check_resp "$resp" "Activity: Shibuya"
    a1=$(echo "$resp" | jq -r '.id')

    resp=$(api_post "$CARLOS_JWT" "/trips/$trip_id/activities" '{
        "name": "teamLab Borderless",
        "description": "Immersive digital art museum – book tickets well in advance!",
        "time_of_day": "afternoon",
        "location_name": "Azabudai Hills, Minato, Tokyo",
        "estimated_price": 32
    }')
    check_resp "$resp" "Activity: teamLab"
    a2=$(echo "$resp" | jq -r '.id')

    resp=$(api_post "$JAMES_JWT" "/trips/$trip_id/activities" '{
        "name": "Tsukiji Outer Market",
        "description": "Fresh sushi breakfast, tamagoyaki, and street food at the famous outer market.",
        "time_of_day": "morning",
        "location_name": "Tsukiji, Chuo, Tokyo",
        "estimated_price": 20
    }')
    check_resp "$resp" "Activity: Tsukiji"
    a3=$(echo "$resp" | jq -r '.id')

    resp=$(api_post "$PRIYA_JWT" "/trips/$trip_id/activities" '{
        "name": "Akihabara Electronics & Anime",
        "description": "Explore the electric town – retro games, anime merchandise, and multi-floor arcades.",
        "time_of_day": "afternoon",
        "location_name": "Akihabara, Chiyoda, Tokyo",
        "estimated_price": 50
    }')
    check_resp "$resp" "Activity: Akihabara"
    a4=$(echo "$resp" | jq -r '.id')

    resp=$(api_post "$JAMES_JWT" "/trips/$trip_id/activities" '{
        "name": "Mt. Fuji Day Trip",
        "description": "Bullet train to Kawaguchiko, climb to the 5th station, and soak in hot springs.",
        "time_of_day": "morning",
        "location_name": "Mount Fuji, Yamanashi Prefecture",
        "estimated_price": 120
    }')
    check_resp "$resp" "Activity: Mt. Fuji"
    a5=$(echo "$resp" | jq -r '.id')
    ok "5 activities created"

    # Category assignments
    api_put "$CARLOS_JWT" "/trips/$trip_id/activities/$a1/categories/activities" '{}' >/dev/null
    api_put "$CARLOS_JWT" "/trips/$trip_id/activities/$a2/categories/activities" '{}' >/dev/null
    api_put "$CARLOS_JWT" "/trips/$trip_id/activities/$a3/categories/food"       '{}' >/dev/null
    api_put "$CARLOS_JWT" "/trips/$trip_id/activities/$a4/categories/tech"       '{}' >/dev/null
    api_put "$CARLOS_JWT" "/trips/$trip_id/activities/$a5/categories/day_trips"  '{}' >/dev/null

    # RSVPs
    api_put "$JAMES_JWT"  "/trips/$trip_id/activities/$a1/rsvps" '{"status":"yes"}'   >/dev/null
    api_put "$JAMES_JWT"  "/trips/$trip_id/activities/$a2/rsvps" '{"status":"yes"}'   >/dev/null
    api_put "$JAMES_JWT"  "/trips/$trip_id/activities/$a3/rsvps" '{"status":"yes"}'   >/dev/null
    api_put "$JAMES_JWT"  "/trips/$trip_id/activities/$a4/rsvps" '{"status":"maybe"}' >/dev/null
    api_put "$JAMES_JWT"  "/trips/$trip_id/activities/$a5/rsvps" '{"status":"yes"}'   >/dev/null
    api_put "$CARLOS_JWT" "/trips/$trip_id/activities/$a1/rsvps" '{"status":"yes"}'   >/dev/null
    api_put "$CARLOS_JWT" "/trips/$trip_id/activities/$a5/rsvps" '{"status":"yes"}'   >/dev/null
    api_put "$PRIYA_JWT"  "/trips/$trip_id/activities/$a2/rsvps" '{"status":"yes"}'   >/dev/null
    api_put "$PRIYA_JWT"  "/trips/$trip_id/activities/$a4/rsvps" '{"status":"yes"}'   >/dev/null
    api_put "$PRIYA_JWT"  "/trips/$trip_id/activities/$a5/rsvps" '{"status":"no"}'    >/dev/null
    ok "RSVPs recorded"

    # Rank poll – neighbourhood
    resp=$(api_post "$CARLOS_JWT" "/trips/$trip_id/rank-polls" '{
        "question": "Rank your preferred Tokyo neighbourhood to stay in",
        "poll_type": "rank",
        "options": [
            {"option_type":"custom","name":"Shinjuku (busy, central)"},
            {"option_type":"custom","name":"Shibuya (trendy, nightlife)"},
            {"option_type":"custom","name":"Asakusa (traditional, temples)"},
            {"option_type":"custom","name":"Harajuku (quirky, shopping)"}
        ],
        "is_anonymous": false,
        "should_notify_members": false
    }')
    check_resp "$resp" "Rank poll: neighbourhood"
    local rpoll_id; rpoll_id=$(echo "$resp" | jq -r '.id')
    local ropt_ids; ropt_ids=$(echo "$resp" | jq -r '.options[].id')
    local ropt_arr=(); while IFS= read -r line; do ropt_arr+=("$line"); done <<< "$ropt_ids"

    api_post "$JAMES_JWT" "/trips/$trip_id/rank-polls/$rpoll_id/rank" \
        "{\"rankings\":[
            {\"option_id\":\"${ropt_arr[0]}\",\"rank\":1},
            {\"option_id\":\"${ropt_arr[2]}\",\"rank\":2},
            {\"option_id\":\"${ropt_arr[1]}\",\"rank\":3}
        ]}" >/dev/null
    api_post "$CARLOS_JWT" "/trips/$trip_id/rank-polls/$rpoll_id/rank" \
        "{\"rankings\":[
            {\"option_id\":\"${ropt_arr[1]}\",\"rank\":1},
            {\"option_id\":\"${ropt_arr[0]}\",\"rank\":2},
            {\"option_id\":\"${ropt_arr[3]}\",\"rank\":3}
        ]}" >/dev/null
    api_post "$PRIYA_JWT" "/trips/$trip_id/rank-polls/$rpoll_id/rank" \
        "{\"rankings\":[
            {\"option_id\":\"${ropt_arr[2]}\",\"rank\":1},
            {\"option_id\":\"${ropt_arr[0]}\",\"rank\":2},
            {\"option_id\":\"${ropt_arr[1]}\",\"rank\":3}
        ]}" >/dev/null

    # Vote poll – hotel vs airbnb
    resp=$(api_post "$CARLOS_JWT" "/trips/$trip_id/vote-polls" '{
        "question": "Hotel or Airbnb for Tokyo?",
        "poll_type": "single",
        "options": [
            {"option_type":"custom","name":"Hotel (easier, no surprises)"},
            {"option_type":"custom","name":"Airbnb (more space, save money)"},
            {"option_type":"custom","name":"Mix – hotel first few nights, Airbnb rest"}
        ],
        "is_anonymous": false,
        "should_notify_members": false
    }')
    check_resp "$resp" "Poll: hotel vs airbnb"
    local vpoll_id; vpoll_id=$(echo "$resp" | jq -r '.id')
    local vopt_ids; vopt_ids=$(echo "$resp" | jq -r '.options[].id')
    local vopt_arr=(); while IFS= read -r line; do vopt_arr+=("$line"); done <<< "$vopt_ids"

    api_post "$JAMES_JWT" "/trips/$trip_id/vote-polls/$vpoll_id/vote" \
        "{\"option_ids\":[\"${vopt_arr[2]}\"]}" >/dev/null
    api_post "$PRIYA_JWT" "/trips/$trip_id/vote-polls/$vpoll_id/vote" \
        "{\"option_ids\":[\"${vopt_arr[0]}\"]}" >/dev/null
    ok "Polls + votes/rankings created"

    # Pitches
    local p1 p2
    p1=$(insert_pitch_sql "$trip_id" "$CARLOS_ID" \
        "Carlos pitches Tokyo" \
        "I lived in Tokyo for a year. I know all the hidden gems – izakayas in Golden Gai, the best ramen in Shibuya, day trips beyond the usual tourist spots. Trust me on this one." 110)
    p2=$(insert_pitch_sql "$trip_id" "$JAMES_ID" \
        "July is perfect for summer festivals" \
        "Tokyo in July means Sumida fireworks festival, Tanabata decorations everywhere, and rooftop beer gardens. The timing is ideal." 75)
    ok "Pitches seeded"

    # Pitch link
    api_post "$CARLOS_JWT" "/trips/$trip_id/pitches/$p1/links" \
        '{"url":"https://teamlab.art","title":"teamLab Borderless Tokyo","description":"Official ticket booking page","domain":"teamlab.art"}' >/dev/null

    # Comments
    local c1
    resp=$(api_post "$CARLOS_JWT" "/comments" \
        "{\"trip_id\":\"$trip_id\",\"entity_type\":\"activity\",\"entity_id\":\"$a3\",\"content\":\"Get there by 6 am – the good stuff sells out by 8.\"}")
    c1=$(echo "$resp" | jq -r '.id')

    api_post "$JAMES_JWT" "/comments" \
        "{\"trip_id\":\"$trip_id\",\"entity_type\":\"activity\",\"entity_id\":\"$a3\",\"content\":\"6 am?! That's brutal but probably worth it.\"}" >/dev/null

    api_post "$PRIYA_JWT" "/comments" \
        "{\"trip_id\":\"$trip_id\",\"entity_type\":\"activity\",\"entity_id\":\"$a2\",\"content\":\"Went to the original Odaiba location last year – the new Azabudai one is 10x better apparently!\"}" >/dev/null

    api_post "$JAMES_JWT" "/comments" \
        "{\"trip_id\":\"$trip_id\",\"entity_type\":\"activity\",\"entity_id\":\"$a5\",\"content\":\"Should we book a guided tour or do it ourselves?\"}" >/dev/null

    api_post "$CARLOS_JWT" "/comments" \
        "{\"trip_id\":\"$trip_id\",\"entity_type\":\"pitch\",\"entity_id\":\"$p2\",\"content\":\"The Sumida fireworks is a great call – dates are locked in already.\"}" >/dev/null

    api_post "$PRIYA_JWT" "/comments/$c1/reactions" '{"emoji":"⏰"}'  >/dev/null
    api_post "$JAMES_JWT" "/comments/$c1/reactions" '{"emoji":"😱"}' >/dev/null
    ok "Comments + reactions seeded"

    create_invite_sql "$trip_id" "$CARLOS_ID" "TOKYO2025" >/dev/null
    ok "Invite code: TOKYO2025"

    echo "  Trip ID: $trip_id"
    TOKYO_TRIP_ID="$trip_id"
}

# ─── Trip 3: NYC Weekend ──────────────────────────────────────────────────────
# YOU are admin. Priya and James are members.

seed_trip_nyc() {
    local my_id="$1" my_jwt="$2"
    echo ""
    log "[Trip 3] NYC Weekend – you are admin"

    local resp
    resp=$(api_post "$my_jwt" "/trips" '{
        "name": "NYC Weekend",
        "budget_min": 500,
        "budget_max": 1500,
        "currency": "USD",
        "start_date": "2026-02-28T00:00:00Z",
        "end_date":   "2026-03-02T00:00:00Z"
    }')
    check_resp "$resp" "Create NYC trip"
    local trip_id; trip_id=$(trip_id_of "$resp")
    api_patch "$my_jwt" "/trips/$trip_id" '{"location":"New York City, USA"}' >/dev/null
    ok "Trip created: $trip_id"

    add_member_sql "$PRIYA_ID" "$trip_id" false 400 1200
    add_member_sql "$JAMES_ID" "$trip_id" false 600 1500
    ok "Members added (Priya + James)"

    # Custom categories
    api_post "$my_jwt" "/trips/$trip_id/categories" \
        '{"name":"art","label":"Art & Culture","icon":"🎨"}' >/dev/null
    api_post "$my_jwt" "/trips/$trip_id/categories" \
        '{"name":"food","label":"Food & Drinks","icon":"🍕"}' >/dev/null
    api_post "$my_jwt" "/trips/$trip_id/categories" \
        '{"name":"sightseeing","label":"Sightseeing","icon":"🗽"}' >/dev/null

    # Activities
    local a1 a2 a3 a4 a5
    resp=$(api_post "$my_jwt" "/trips/$trip_id/activities" '{
        "name": "Central Park Morning Walk",
        "description": "Start the day with a walk through the park – Bethesda Fountain, the Mall, and the Lake.",
        "time_of_day": "morning",
        "location_name": "Central Park, Manhattan",
        "location_lat": 40.7851,
        "location_lng": -73.9683,
        "estimated_price": 0
    }')
    check_resp "$resp" "Activity: Central Park"
    a1=$(echo "$resp" | jq -r '.id')

    resp=$(api_post "$my_jwt" "/trips/$trip_id/activities" '{
        "name": "MoMA – Museum of Modern Art",
        "description": "Spend 2–3 hours at MoMA. Van Gogh Starry Night, Warhol prints, and rotating exhibitions.",
        "time_of_day": "morning",
        "location_name": "MoMA, Midtown Manhattan",
        "estimated_price": 25
    }')
    check_resp "$resp" "Activity: MoMA"
    a2=$(echo "$resp" | jq -r '.id')

    resp=$(api_post "$PRIYA_JWT" "/trips/$trip_id/activities" '{
        "name": "Brooklyn Bridge Walk",
        "description": "Walk across the iconic bridge for amazing skyline views. Great for photos at golden hour.",
        "time_of_day": "afternoon",
        "location_name": "Brooklyn Bridge, New York",
        "estimated_price": 0
    }')
    check_resp "$resp" "Activity: Brooklyn Bridge"
    a3=$(echo "$resp" | jq -r '.id')

    resp=$(api_post "$JAMES_JWT" "/trips/$trip_id/activities" '{
        "name": "The High Line",
        "description": "Elevated park on a historic freight rail line. Great public art and city views.",
        "time_of_day": "afternoon",
        "location_name": "High Line, Chelsea, Manhattan",
        "estimated_price": 0
    }')
    check_resp "$resp" "Activity: High Line"
    a4=$(echo "$resp" | jq -r '.id')

    resp=$(api_post "$my_jwt" "/trips/$trip_id/activities" '{
        "name": "Chelsea Market Food Tour",
        "description": "Self-guided tour through Chelsea Market – tacos, lobster rolls, artisan cheese, and more.",
        "time_of_day": "afternoon",
        "location_name": "Chelsea Market, Manhattan",
        "estimated_price": 30
    }')
    check_resp "$resp" "Activity: Chelsea Market"
    a5=$(echo "$resp" | jq -r '.id')
    ok "5 activities created"

    # Category assignments
    api_put "$my_jwt" "/trips/$trip_id/activities/$a1/categories/sightseeing" '{}' >/dev/null
    api_put "$my_jwt" "/trips/$trip_id/activities/$a2/categories/art"         '{}' >/dev/null
    api_put "$my_jwt" "/trips/$trip_id/activities/$a3/categories/sightseeing" '{}' >/dev/null
    api_put "$my_jwt" "/trips/$trip_id/activities/$a4/categories/art"         '{}' >/dev/null
    api_put "$my_jwt" "/trips/$trip_id/activities/$a5/categories/food"        '{}' >/dev/null

    # RSVPs
    api_put "$my_jwt"    "/trips/$trip_id/activities/$a1/rsvps" '{"status":"yes"}'   >/dev/null
    api_put "$my_jwt"    "/trips/$trip_id/activities/$a2/rsvps" '{"status":"yes"}'   >/dev/null
    api_put "$my_jwt"    "/trips/$trip_id/activities/$a3/rsvps" '{"status":"yes"}'   >/dev/null
    api_put "$my_jwt"    "/trips/$trip_id/activities/$a4/rsvps" '{"status":"yes"}'   >/dev/null
    api_put "$my_jwt"    "/trips/$trip_id/activities/$a5/rsvps" '{"status":"yes"}'   >/dev/null
    api_put "$PRIYA_JWT" "/trips/$trip_id/activities/$a1/rsvps" '{"status":"yes"}'   >/dev/null
    api_put "$PRIYA_JWT" "/trips/$trip_id/activities/$a2/rsvps" '{"status":"maybe"}' >/dev/null
    api_put "$PRIYA_JWT" "/trips/$trip_id/activities/$a3/rsvps" '{"status":"yes"}'   >/dev/null
    api_put "$PRIYA_JWT" "/trips/$trip_id/activities/$a5/rsvps" '{"status":"yes"}'   >/dev/null
    api_put "$JAMES_JWT" "/trips/$trip_id/activities/$a1/rsvps" '{"status":"yes"}'   >/dev/null
    api_put "$JAMES_JWT" "/trips/$trip_id/activities/$a3/rsvps" '{"status":"yes"}'   >/dev/null
    api_put "$JAMES_JWT" "/trips/$trip_id/activities/$a4/rsvps" '{"status":"yes"}'   >/dev/null
    api_put "$JAMES_JWT" "/trips/$trip_id/activities/$a5/rsvps" '{"status":"maybe"}' >/dev/null
    ok "RSVPs recorded"

    # Polls
    resp=$(api_post "$my_jwt" "/trips/$trip_id/vote-polls" '{
        "question": "Where should we eat dinner on Day 1?",
        "poll_type": "single",
        "options": [
            {"option_type":"custom","name":"Peter Luger Steak House"},
            {"option_type":"custom","name":"Katz Delicatessen"},
            {"option_type":"custom","name":"Carbone (Italian)"},
            {"option_type":"custom","name":"Xi an Famous Foods (noodles)"}
        ],
        "is_anonymous": false,
        "should_notify_members": false
    }')
    check_resp "$resp" "Poll: day 1 dinner"
    local vpoll_id; vpoll_id=$(echo "$resp" | jq -r '.id')
    set_poll_deadline_sql "$vpoll_id" "2026-02-27T00:00:00Z"
    local vopt_ids; vopt_ids=$(echo "$resp" | jq -r '.options[].id')
    local vopt_arr=(); while IFS= read -r line; do vopt_arr+=("$line"); done <<< "$vopt_ids"

    api_post "$PRIYA_JWT" "/trips/$trip_id/vote-polls/$vpoll_id/vote" \
        "{\"option_ids\":[\"${vopt_arr[2]}\"]}" >/dev/null
    api_post "$JAMES_JWT" "/trips/$trip_id/vote-polls/$vpoll_id/vote" \
        "{\"option_ids\":[\"${vopt_arr[0]}\"]}" >/dev/null

    resp=$(api_post "$my_jwt" "/trips/$trip_id/rank-polls" '{
        "question": "Rank the museums – which one should we prioritize?",
        "poll_type": "rank",
        "options": [
            {"option_type":"custom","name":"MoMA"},
            {"option_type":"custom","name":"Metropolitan Museum of Art"},
            {"option_type":"custom","name":"Guggenheim"},
            {"option_type":"custom","name":"Whitney Museum"}
        ],
        "is_anonymous": false,
        "should_notify_members": false
    }')
    check_resp "$resp" "Rank poll: museums"
    local rpoll_id; rpoll_id=$(echo "$resp" | jq -r '.id')
    set_poll_deadline_sql "$rpoll_id" "2026-02-27T00:00:00Z"
    local ropt_ids; ropt_ids=$(echo "$resp" | jq -r '.options[].id')
    local ropt_arr=(); while IFS= read -r line; do ropt_arr+=("$line"); done <<< "$ropt_ids"

    api_post "$PRIYA_JWT" "/trips/$trip_id/rank-polls/$rpoll_id/rank" \
        "{\"rankings\":[
            {\"option_id\":\"${ropt_arr[2]}\",\"rank\":1},
            {\"option_id\":\"${ropt_arr[0]}\",\"rank\":2},
            {\"option_id\":\"${ropt_arr[1]}\",\"rank\":3}
        ]}" >/dev/null
    api_post "$JAMES_JWT" "/trips/$trip_id/rank-polls/$rpoll_id/rank" \
        "{\"rankings\":[
            {\"option_id\":\"${ropt_arr[1]}\",\"rank\":1},
            {\"option_id\":\"${ropt_arr[0]}\",\"rank\":2},
            {\"option_id\":\"${ropt_arr[3]}\",\"rank\":3}
        ]}" >/dev/null
    ok "Polls + votes/rankings created"

    # Pitches
    local p1 p2
    p1=$(insert_pitch_sql "$trip_id" "$my_id" \
        "Why June is perfect for NYC" \
        "Weather is great, outdoor events everywhere, no holiday crowds. I've mapped out a full itinerary that keeps us under budget including one nice dinner out." 80)
    p2=$(insert_pitch_sql "$trip_id" "$PRIYA_ID" \
        "Priya suggests adding a Broadway show" \
        "We should grab tickets to a show on Saturday night. I found some discount options through TodayTix that are still great seats." 55)
    ok "Pitches seeded"

    api_post "$PRIYA_JWT" "/trips/$trip_id/pitches/$p2/links" \
        '{"url":"https://www.todaytix.com","title":"Broadway Tickets – TodayTix","description":"Last-minute Broadway deals","domain":"todaytix.com"}' >/dev/null

    # Comments
    local c1 c2
    resp=$(api_post "$my_jwt" "/comments" \
        "{\"trip_id\":\"$trip_id\",\"entity_type\":\"activity\",\"entity_id\":\"$a3\",\"content\":\"Best views are from the Brooklyn side, walking back to Manhattan.\"}")
    c1=$(echo "$resp" | jq -r '.id')

    resp=$(api_post "$PRIYA_JWT" "/comments" \
        "{\"trip_id\":\"$trip_id\",\"entity_type\":\"activity\",\"entity_id\":\"$a3\",\"content\":\"Agreed! I also want to stop at Grimaldi's for pizza right after.\"}")
    c2=$(echo "$resp" | jq -r '.id')

    api_post "$JAMES_JWT" "/comments" \
        "{\"trip_id\":\"$trip_id\",\"entity_type\":\"activity\",\"entity_id\":\"$a5\",\"content\":\"The lobster roll from The Lobster Place here is incredible.\"}" >/dev/null

    api_post "$JAMES_JWT" "/comments" \
        "{\"trip_id\":\"$trip_id\",\"entity_type\":\"pitch\",\"entity_id\":\"$p2\",\"content\":\"Yes! I've been wanting to see Hadestown. Priya send the link!\"}" >/dev/null

    api_post "$JAMES_JWT"  "/comments/$c1/reactions" '{"emoji":"👍"}' >/dev/null
    api_post "$PRIYA_JWT"  "/comments/$c1/reactions" '{"emoji":"❤️"}' >/dev/null
    api_post "$my_jwt"     "/comments/$c2/reactions" '{"emoji":"🍕"}' >/dev/null
    ok "Comments + reactions seeded"

    create_invite_sql "$trip_id" "$my_id" "NYC25WEEKEND" >/dev/null
    ok "Invite code: NYC25WEEKEND"

    echo "  Trip ID: $trip_id"
    NYC_TRIP_ID="$trip_id"
}

# ─── Trip 4: Bali Retreat ─────────────────────────────────────────────────────
# YOU are admin. All 4 fake users are members.

seed_trip_bali() {
    local my_id="$1" my_jwt="$2"
    echo ""
    log "[Trip 4] Bali Retreat – you are admin, all 4 fake users join"

    local resp
    resp=$(api_post "$my_jwt" "/trips" '{
        "name": "Bali Retreat 2025",
        "budget_min": 1500,
        "budget_max": 3500,
        "currency": "USD",
        "start_date": "2026-12-05T00:00:00Z",
        "end_date":   "2026-12-15T00:00:00Z"
    }')
    check_resp "$resp" "Create Bali trip"
    local trip_id; trip_id=$(trip_id_of "$resp")
    api_patch "$my_jwt" "/trips/$trip_id" '{"location":"Bali, Indonesia"}' >/dev/null
    ok "Trip created: $trip_id"

    add_member_sql "$MAYA_ID"   "$trip_id" false 1200 3000
    add_member_sql "$CARLOS_ID" "$trip_id" false 2000 3500
    add_member_sql "$PRIYA_ID"  "$trip_id" false 1500 2800
    add_member_sql "$JAMES_ID"  "$trip_id" false 1800 3200
    ok "Members added (Maya, Carlos, Priya, James)"

    # Custom categories
    api_post "$my_jwt" "/trips/$trip_id/categories" \
        '{"name":"wellness","label":"Wellness & Spa","icon":"🧘"}' >/dev/null
    api_post "$my_jwt" "/trips/$trip_id/categories" \
        '{"name":"culture","label":"Culture & Temples","icon":"🛕"}' >/dev/null
    api_post "$my_jwt" "/trips/$trip_id/categories" \
        '{"name":"adventure","label":"Adventure","icon":"🌊"}' >/dev/null
    api_post "$my_jwt" "/trips/$trip_id/categories" \
        '{"name":"food","label":"Food & Cooking","icon":"🍛"}' >/dev/null

    # Activities
    local a1 a2 a3 a4 a5 a6
    resp=$(api_post "$my_jwt" "/trips/$trip_id/activities" '{
        "name": "Tanah Lot Temple at Sunset",
        "description": "Watch the sunset from the iconic sea temple perched on a rocky outcrop. Arrive 1 hr before sunset for best views.",
        "time_of_day": "evening",
        "location_name": "Tanah Lot, Tabanan Regency",
        "location_lat": -8.6211,
        "location_lng": 115.0866,
        "estimated_price": 5
    }')
    check_resp "$resp" "Activity: Tanah Lot"
    a1=$(echo "$resp" | jq -r '.id')

    resp=$(api_post "$MAYA_JWT" "/trips/$trip_id/activities" '{
        "name": "Tegallalang Rice Terrace Hike",
        "description": "Guided morning hike through the UNESCO-listed Tegallalang rice terraces in Ubud.",
        "time_of_day": "morning",
        "location_name": "Tegallalang, Ubud",
        "location_lat": -8.4296,
        "location_lng": 115.2789,
        "estimated_price": 15
    }')
    check_resp "$resp" "Activity: Rice Terrace"
    a2=$(echo "$resp" | jq -r '.id')

    resp=$(api_post "$PRIYA_JWT" "/trips/$trip_id/activities" '{
        "name": "COMO Shambhala Full-Day Spa",
        "description": "World-class Ayurvedic spa treatments, hot springs, and yoga in a jungle retreat setting.",
        "time_of_day": "morning",
        "location_name": "COMO Shambhala, Ubud",
        "estimated_price": 180
    }')
    check_resp "$resp" "Activity: Spa"
    a3=$(echo "$resp" | jq -r '.id')

    resp=$(api_post "$CARLOS_JWT" "/trips/$trip_id/activities" '{
        "name": "Surfing Lessons at Kuta Beach",
        "description": "2-hour beginner surf lesson with certified instructor. Equipment included.",
        "time_of_day": "morning",
        "location_name": "Kuta Beach, Badung",
        "estimated_price": 35
    }')
    check_resp "$resp" "Activity: Surfing"
    a4=$(echo "$resp" | jq -r '.id')

    resp=$(api_post "$my_jwt" "/trips/$trip_id/activities" '{
        "name": "Balinese Cooking Class",
        "description": "Learn to cook 5 traditional Balinese dishes. Starts with a market visit to pick fresh ingredients.",
        "time_of_day": "morning",
        "location_name": "Casa Luna Cooking School, Ubud",
        "estimated_price": 40
    }')
    check_resp "$resp" "Activity: Cooking Class"
    a5=$(echo "$resp" | jq -r '.id')

    resp=$(api_post "$JAMES_JWT" "/trips/$trip_id/activities" '{
        "name": "Uluwatu Cliff Temple & Kecak Dance",
        "description": "Visit the dramatic clifftop temple then watch the fire Kecak dance at sunset. Stunning ocean views.",
        "time_of_day": "evening",
        "location_name": "Uluwatu Temple, Pecatu",
        "estimated_price": 10
    }')
    check_resp "$resp" "Activity: Uluwatu"
    a6=$(echo "$resp" | jq -r '.id')
    ok "6 activities created"

    # Category assignments
    api_put "$my_jwt"    "/trips/$trip_id/activities/$a1/categories/culture"     '{}' >/dev/null
    api_put "$my_jwt"    "/trips/$trip_id/activities/$a2/categories/adventure"   '{}' >/dev/null
    api_put "$my_jwt"    "/trips/$trip_id/activities/$a3/categories/wellness"    '{}' >/dev/null
    api_put "$my_jwt"    "/trips/$trip_id/activities/$a4/categories/adventure"   '{}' >/dev/null
    api_put "$my_jwt"    "/trips/$trip_id/activities/$a5/categories/food"        '{}' >/dev/null
    api_put "$my_jwt"    "/trips/$trip_id/activities/$a6/categories/culture"     '{}' >/dev/null

    # RSVPs – all members respond to all activities
    for actor_jwt in "$my_jwt" "$MAYA_JWT" "$CARLOS_JWT" "$PRIYA_JWT" "$JAMES_JWT"; do
        api_put "$actor_jwt" "/trips/$trip_id/activities/$a1/rsvps" '{"status":"yes"}'   >/dev/null
        api_put "$actor_jwt" "/trips/$trip_id/activities/$a2/rsvps" '{"status":"yes"}'   >/dev/null
        api_put "$actor_jwt" "/trips/$trip_id/activities/$a6/rsvps" '{"status":"yes"}'   >/dev/null
    done
    api_put "$my_jwt"    "/trips/$trip_id/activities/$a3/rsvps" '{"status":"yes"}'   >/dev/null
    api_put "$PRIYA_JWT" "/trips/$trip_id/activities/$a3/rsvps" '{"status":"yes"}'   >/dev/null
    api_put "$MAYA_JWT"  "/trips/$trip_id/activities/$a3/rsvps" '{"status":"maybe"}' >/dev/null
    api_put "$CARLOS_JWT" "/trips/$trip_id/activities/$a4/rsvps" '{"status":"yes"}'  >/dev/null
    api_put "$JAMES_JWT"  "/trips/$trip_id/activities/$a4/rsvps" '{"status":"yes"}'  >/dev/null
    api_put "$my_jwt"    "/trips/$trip_id/activities/$a4/rsvps" '{"status":"maybe"}' >/dev/null
    api_put "$MAYA_JWT"  "/trips/$trip_id/activities/$a4/rsvps" '{"status":"no"}'    >/dev/null
    api_put "$my_jwt"    "/trips/$trip_id/activities/$a5/rsvps" '{"status":"yes"}'   >/dev/null
    api_put "$PRIYA_JWT" "/trips/$trip_id/activities/$a5/rsvps" '{"status":"yes"}'   >/dev/null
    api_put "$MAYA_JWT"  "/trips/$trip_id/activities/$a5/rsvps" '{"status":"yes"}'   >/dev/null
    ok "RSVPs recorded"

    # Vote poll – area to stay
    resp=$(api_post "$my_jwt" "/trips/$trip_id/vote-polls" '{
        "question": "Which Bali area should we base ourselves in?",
        "poll_type": "single",
        "options": [
            {"option_type":"custom","name":"Ubud (jungle, culture, yoga)"},
            {"option_type":"custom","name":"Seminyak (beach clubs, nightlife)"},
            {"option_type":"custom","name":"Canggu (surfer vibes, cafes)"},
            {"option_type":"custom","name":"Split – 5 nights Ubud + 5 nights Seminyak"}
        ],
        "is_anonymous": false,
        "should_notify_members": false
    }')
    check_resp "$resp" "Poll: area to stay"
    local vpoll1_id; vpoll1_id=$(echo "$resp" | jq -r '.id')
    local vopt1_ids; vopt1_ids=$(echo "$resp" | jq -r '.options[].id')
    local vopt1_arr=(); while IFS= read -r line; do vopt1_arr+=("$line"); done <<< "$vopt1_ids"

    api_post "$MAYA_JWT"   "/trips/$trip_id/vote-polls/$vpoll1_id/vote" \
        "{\"option_ids\":[\"${vopt1_arr[3]}\"]}" >/dev/null
    api_post "$CARLOS_JWT" "/trips/$trip_id/vote-polls/$vpoll1_id/vote" \
        "{\"option_ids\":[\"${vopt1_arr[1]}\"]}" >/dev/null
    api_post "$PRIYA_JWT"  "/trips/$trip_id/vote-polls/$vpoll1_id/vote" \
        "{\"option_ids\":[\"${vopt1_arr[0]}\"]}" >/dev/null
    api_post "$JAMES_JWT"  "/trips/$trip_id/vote-polls/$vpoll1_id/vote" \
        "{\"option_ids\":[\"${vopt1_arr[3]}\"]}" >/dev/null

    # Multi-choice poll – excursions
    resp=$(api_post "$my_jwt" "/trips/$trip_id/vote-polls" '{
        "question": "Which excursions are you definitely in for?",
        "poll_type": "multi",
        "options": [
            {"option_type":"custom","name":"Sunrise hike to Mt. Batur volcano"},
            {"option_type":"custom","name":"White water rafting (Ayung River)"},
            {"option_type":"custom","name":"ATV ride through rice fields"},
            {"option_type":"custom","name":"Dolphin watching tour (Lovina)"},
            {"option_type":"custom","name":"Day trip to Nusa Penida island"}
        ],
        "is_anonymous": false,
        "should_notify_members": false
    }')
    check_resp "$resp" "Poll: excursions"
    local vpoll2_id; vpoll2_id=$(echo "$resp" | jq -r '.id')
    local vopt2_ids; vopt2_ids=$(echo "$resp" | jq -r '.options[].id')
    local vopt2_arr=(); while IFS= read -r line; do vopt2_arr+=("$line"); done <<< "$vopt2_ids"

    api_post "$my_jwt"     "/trips/$trip_id/vote-polls/$vpoll2_id/vote" \
        "{\"option_ids\":[\"${vopt2_arr[0]}\",\"${vopt2_arr[4]}\"]}" >/dev/null
    api_post "$MAYA_JWT"   "/trips/$trip_id/vote-polls/$vpoll2_id/vote" \
        "{\"option_ids\":[\"${vopt2_arr[1]}\",\"${vopt2_arr[2]}\",\"${vopt2_arr[4]}\"]}" >/dev/null
    api_post "$CARLOS_JWT" "/trips/$trip_id/vote-polls/$vpoll2_id/vote" \
        "{\"option_ids\":[\"${vopt2_arr[0]}\",\"${vopt2_arr[1]}\"]}" >/dev/null
    api_post "$PRIYA_JWT"  "/trips/$trip_id/vote-polls/$vpoll2_id/vote" \
        "{\"option_ids\":[\"${vopt2_arr[3]}\",\"${vopt2_arr[4]}\"]}" >/dev/null
    api_post "$JAMES_JWT"  "/trips/$trip_id/vote-polls/$vpoll2_id/vote" \
        "{\"option_ids\":[\"${vopt2_arr[0]}\",\"${vopt2_arr[2]}\"]}" >/dev/null

    # Rank poll – accommodation
    resp=$(api_post "$my_jwt" "/trips/$trip_id/rank-polls" '{
        "question": "Rank preferred accommodation style",
        "poll_type": "rank",
        "options": [
            {"option_type":"custom","name":"Luxury villa (private pool, full staff)"},
            {"option_type":"custom","name":"Boutique resort (pool bar, breakfast included)"},
            {"option_type":"custom","name":"Eco-retreat (sustainable, jungle setting)"},
            {"option_type":"custom","name":"Airbnb compound (entire place, cook together)"}
        ],
        "is_anonymous": false,
        "should_notify_members": false
    }')
    check_resp "$resp" "Rank poll: accommodation"
    local rpoll_id; rpoll_id=$(echo "$resp" | jq -r '.id')
    local ropt_ids; ropt_ids=$(echo "$resp" | jq -r '.options[].id')
    local ropt_arr=(); while IFS= read -r line; do ropt_arr+=("$line"); done <<< "$ropt_ids"

    api_post "$my_jwt" "/trips/$trip_id/rank-polls/$rpoll_id/rank" \
        "{\"rankings\":[
            {\"option_id\":\"${ropt_arr[3]}\",\"rank\":1},
            {\"option_id\":\"${ropt_arr[0]}\",\"rank\":2},
            {\"option_id\":\"${ropt_arr[1]}\",\"rank\":3}
        ]}" >/dev/null
    api_post "$MAYA_JWT" "/trips/$trip_id/rank-polls/$rpoll_id/rank" \
        "{\"rankings\":[
            {\"option_id\":\"${ropt_arr[0]}\",\"rank\":1},
            {\"option_id\":\"${ropt_arr[1]}\",\"rank\":2},
            {\"option_id\":\"${ropt_arr[3]}\",\"rank\":3}
        ]}" >/dev/null
    api_post "$CARLOS_JWT" "/trips/$trip_id/rank-polls/$rpoll_id/rank" \
        "{\"rankings\":[
            {\"option_id\":\"${ropt_arr[3]}\",\"rank\":1},
            {\"option_id\":\"${ropt_arr[2]}\",\"rank\":2},
            {\"option_id\":\"${ropt_arr[1]}\",\"rank\":3}
        ]}" >/dev/null
    api_post "$PRIYA_JWT" "/trips/$trip_id/rank-polls/$rpoll_id/rank" \
        "{\"rankings\":[
            {\"option_id\":\"${ropt_arr[0]}\",\"rank\":1},
            {\"option_id\":\"${ropt_arr[3]}\",\"rank\":2},
            {\"option_id\":\"${ropt_arr[1]}\",\"rank\":3}
        ]}" >/dev/null
    ok "Polls + votes/rankings created"

    # Pitches – one from each user
    local p1 p2 p3
    p1=$(insert_pitch_sql "$trip_id" "$my_id" \
        "The case for Bali in December" \
        "Dry season runs until October but December is actually still great. Rainy season means lush green landscapes, fewer tourists, and significantly cheaper flights and accommodation. I did the math and we save roughly 40% vs. peak season." 105)
    p2=$(insert_pitch_sql "$trip_id" "$MAYA_ID" \
        "I found the perfect villa" \
        "There is a 5-bedroom compound in Ubud with private pool and staff. Split 5 ways it is less than a mid-range hotel. I will drop the Airbnb link in chat." 70)
    p3=$(insert_pitch_sql "$trip_id" "$CARLOS_ID" \
        "Pre-trip surf camp in Canggu" \
        "Two days before the main trip starts. I can get a group rate at a surf school. Anyone who wants to arrive early can join – total cost around $150 for lessons, board, and accommodation." 85)
    ok "Pitches seeded"

    api_post "$MAYA_JWT" "/trips/$trip_id/pitches/$p2/links" \
        '{"url":"https://www.airbnb.com","title":"Airbnb – Luxury Ubud Villa","description":"5-bedroom private villa with pool","domain":"airbnb.com"}' >/dev/null

    # Comments – multiple threads
    local c1 c2 c3 c4
    resp=$(api_post "$MAYA_JWT" "/comments" \
        "{\"trip_id\":\"$trip_id\",\"entity_type\":\"activity\",\"entity_id\":\"$a1\",\"content\":\"This is my top pick for the whole trip. The photos are unreal.\"}")
    c1=$(echo "$resp" | jq -r '.id')

    resp=$(api_post "$CARLOS_JWT" "/comments" \
        "{\"trip_id\":\"$trip_id\",\"entity_type\":\"activity\",\"entity_id\":\"$a4\",\"content\":\"Just booked us 5 slots at a school in Kuta. Paid the deposit. Let me know if you're in!\"}")
    c2=$(echo "$resp" | jq -r '.id')

    resp=$(api_post "$PRIYA_JWT" "/comments" \
        "{\"trip_id\":\"$trip_id\",\"entity_type\":\"activity\",\"entity_id\":\"$a3\",\"content\":\"I have been to this spa – it completely changed my life. Non-negotiable addition.\"}")
    c3=$(echo "$resp" | jq -r '.id')

    resp=$(api_post "$JAMES_JWT" "/comments" \
        "{\"trip_id\":\"$trip_id\",\"entity_type\":\"pitch\",\"entity_id\":\"$p2\",\"content\":\"Maya YES please share the link. This looks incredible.\"}")
    c4=$(echo "$resp" | jq -r '.id')

    api_post "$my_jwt"     "/comments" \
        "{\"trip_id\":\"$trip_id\",\"entity_type\":\"activity\",\"entity_id\":\"$a1\",\"content\":\"Agreed. Should we hire a private driver for the evening so we don't have to rush back?\"}" >/dev/null

    api_post "$PRIYA_JWT"  "/comments" \
        "{\"trip_id\":\"$trip_id\",\"entity_type\":\"activity\",\"entity_id\":\"$a2\",\"content\":\"Start at 7 am before it gets too hot and too many Instagram influencers show up.\"}" >/dev/null

    api_post "$my_jwt"     "/comments" \
        "{\"trip_id\":\"$trip_id\",\"entity_type\":\"activity\",\"entity_id\":\"$a5\",\"content\":\"The market visit at the start is the best part. Bring cash for spices to take home.\"}" >/dev/null

    api_post "$CARLOS_JWT" "/comments" \
        "{\"trip_id\":\"$trip_id\",\"entity_type\":\"pitch\",\"entity_id\":\"$p1\",\"content\":\"The budget breakdown you sent in the group chat sealed the deal for me.\"}" >/dev/null

    # Reactions
    api_post "$CARLOS_JWT" "/comments/$c1/reactions" '{"emoji":"🔥"}' >/dev/null
    api_post "$PRIYA_JWT"  "/comments/$c1/reactions" '{"emoji":"🔥"}' >/dev/null
    api_post "$JAMES_JWT"  "/comments/$c1/reactions" '{"emoji":"❤️"}' >/dev/null
    api_post "$my_jwt"     "/comments/$c1/reactions" '{"emoji":"😍"}' >/dev/null
    api_post "$my_jwt"     "/comments/$c2/reactions" '{"emoji":"👍"}' >/dev/null
    api_post "$JAMES_JWT"  "/comments/$c2/reactions" '{"emoji":"👍"}' >/dev/null
    api_post "$my_jwt"     "/comments/$c3/reactions" '{"emoji":"🧘"}' >/dev/null
    api_post "$MAYA_JWT"   "/comments/$c4/reactions" '{"emoji":"🏡"}' >/dev/null
    ok "Comments + reactions seeded"

    create_invite_sql "$trip_id" "$my_id" "BALI25" >/dev/null
    ok "Invite code: BALI25"

    echo "  Trip ID: $trip_id"
    BALI_TRIP_ID="$trip_id"
}

# ─── main seed ────────────────────────────────────────────────────────────────

resolve_user() {
    local identifier="$1"
    # Accept either a UUID or a username
    local user_row
    if [[ "$identifier" =~ ^[0-9a-f-]{36}$ ]]; then
        user_row=$(db "SELECT id, name, username FROM users WHERE id = '$identifier';")
    else
        user_row=$(db "SELECT id, name, username FROM users WHERE username = '$identifier';")
    fi
    if [ -z "$user_row" ]; then
        err "User '$identifier' not found in the database."
        echo "  Make sure you have logged into the app at least once to create your profile."
        exit 1
    fi
    echo "$user_row"
}

run_seed() {
    local identifier="$1"

    local user_row; user_row=$(resolve_user "$identifier")
    local my_id;   my_id=$(echo "$user_row"   | cut -d'|' -f1)
    local my_name; my_name=$(echo "$user_row" | cut -d'|' -f2)
    local my_jwt;  my_jwt=$(make_jwt "$my_id")
    log "Seeding as: $my_name ($my_id)"

    seed_fake_users
    seed_trip_santorini
    seed_trip_tokyo
    seed_trip_nyc       "$my_id" "$my_jwt"
    seed_trip_bali      "$my_id" "$my_jwt"

    echo ""
    echo -e "${CYAN}╔══════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║            SEED COMPLETE                         ║${NC}"
    echo -e "${CYAN}╚══════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "  You        : $my_name ($my_id)"
    echo "  Maya        : $MAYA_ID"
    echo "  Carlos      : $CARLOS_ID"
    echo "  Priya       : $PRIYA_ID"
    echo "  James       : $JAMES_ID"
    echo ""
    echo "  Santorini   : $SANTORINI_TRIP_ID  (NOT a member – past,  Jan 15-22 2026)  invite: SANTORINI25"
    echo "  Tokyo       : $TOKYO_TRIP_ID  (NOT a member – future, Jul 10-20 2026)  invite: TOKYO2025"
    echo "  NYC         : $NYC_TRIP_ID  (admin            – past,  Feb 28-Mar 2 2026)"
    echo "  Bali        : $BALI_TRIP_ID  (admin            – future, Dec 5-15 2026)"
    echo ""
}

# ─── entrypoint ───────────────────────────────────────────────────────────────

SANTORINI_TRIP_ID=""
TOKYO_TRIP_ID=""
NYC_TRIP_ID=""
BALI_TRIP_ID=""

COMMAND="${1:-}"
USER_ARG="${2:-}"

echo ""
echo -e "${CYAN}╔══════════════════════════════════════╗${NC}"
echo -e "${CYAN}║        toggo seed.sh                 ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════╝${NC}"
echo ""

show_usage() {
    echo "Usage:"
    echo "  just seed reseed <username|id>   – wipe all data (keep your user) and re-seed"
    echo "  just seed delete <username|id>   – wipe all data including your user row"
    echo "  just seed nuke                   – wipe absolutely everything"
    echo "  just seed status                 – show row counts for all tables"
    echo ""
}

case "$COMMAND" in
    reseed)
        [ -z "$USER_ARG" ] && { err "Usage: just seed reseed <username|id>"; exit 1; }
        preflight
        local_row=$(resolve_user "$USER_ARG")
        local_id=$(echo "$local_row" | cut -d'|' -f1)
        clear_all_except_user "$local_id"
        run_seed "$USER_ARG"
        ;;
    delete)
        [ -z "$USER_ARG" ] && { err "Usage: just seed delete <username|id>"; exit 1; }
        preflight
        local_row=$(resolve_user "$USER_ARG")
        local_id=$(echo "$local_row" | cut -d'|' -f1)
        clear_all_except_user "$local_id"
        delete_user_only "$local_id"
        log "All data deleted. Your Supabase auth account still exists."
        log "Log in to the app to recreate your profile, then run: just seed reseed <username>"
        ;;
    nuke)
        preflight
        echo -e "${RED}WARNING: This will delete EVERY user, trip, and piece of data.${NC}"
        read -rp "  Are you sure? Type 'yes' to confirm: " _confirm
        [ "$_confirm" = "yes" ] || { echo "Aborted."; exit 0; }
        clear_everything
        log "Database fully wiped."
        ;;
    status)
        show_status
        ;;
    "")
        show_usage
        ;;
    *)
        err "Unknown command: $COMMAND"
        echo ""
        show_usage
        exit 1
        ;;
esac
