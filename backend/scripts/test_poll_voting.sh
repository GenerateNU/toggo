#!/usr/bin/env bash
# test_poll_voting.sh
#
# Creates test users via direct DB insert, then votes on polls in a loop.
#
# Usage:
#   ./test_poll_voting.sh [options]
#
# Options:
#   --trip    <id>   Existing trip ID to join and vote on
#   --single  <id>   Existing single-choice poll ID
#   --multi   <id>   Existing multi-choice poll ID
#   --yesno   <id>   Existing yes/no poll ID
#   --rank    <id>   Existing ranking poll ID
#
# Examples:
#   # Create everything from scratch:
#   ./test_poll_voting.sh
#
#   # Join an existing trip (IDs copied from the app):
#   ./test_poll_voting.sh \
#     --trip "..." --single "..." --multi "..." --yesno "..." --rank "..."

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# ─── Parse args ──────────────────────────────────────────────────────────────

TRIP_ID=""
SINGLE_ID=""
MULTI_ID=""
YESNO_ID=""
RANK_ID=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --trip)   TRIP_ID="$2";   shift 2 ;;
    --single) SINGLE_ID="$2"; shift 2 ;;
    --multi)  MULTI_ID="$2";  shift 2 ;;
    --yesno)  YESNO_ID="$2";  shift 2 ;;
    --rank)   RANK_ID="$2";   shift 2 ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

BASE="http://localhost:8000"
API="$BASE/api/v1"

# ─── Colors ──────────────────────────────────────────────────────────────────

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

log()  { echo -e "${GREEN}==>${NC} $*"; }
info() { echo -e "${CYAN}-->${NC} $*"; }
err()  { echo -e "${RED}[✗]${NC} $*"; }

# ─── Helpers ─────────────────────────────────────────────────────────────────

new_uuid() { uuidgen | tr '[:upper:]' '[:lower:]'; }

make_jwt() {
  local user_id="$1"
  cd "$BACKEND_DIR" && doppler run --project backend --config dev -- \
    go run -C internal/tests/testkit/fakes cmd/generate_jwt.go "$user_id"
}

db_exec() {
  docker exec -e PGPASSWORD=password database \
    psql -U dev_user -d dev_db -t -A -q -c "$1"
}

insert_user() {
  local uid="$1" name="$2" username="$3" phone="$4"
  db_exec "INSERT INTO users (id, name, username, phone_number, timezone)
           VALUES ('$uid', '$name', '$username', '$phone', 'UTC')
           ON CONFLICT (id) DO NOTHING;"
}

api_post() {
  local token="$1" path="$2" body="$3"
  curl -s --max-time 15 -X POST "$API$path" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $token" \
    -d "$body"
}

# ─── Preflight ───────────────────────────────────────────────────────────────

if ! command -v jq &>/dev/null; then
  err "jq is required: brew install jq"; exit 1
fi
if ! command -v doppler &>/dev/null; then
  err "doppler is required: brew install dopplerhq/cli/doppler"; exit 1
fi
if ! docker exec database true 2>/dev/null; then
  err "Docker container 'database' is not running"; exit 1
fi

echo ""
echo -e "${CYAN}╔══════════════════════════════════════╗${NC}"
echo -e "${CYAN}║   Poll Voting Test Script             ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════╝${NC}"
echo ""

# ─── Create 3 test users directly in the DB ──────────────────────────────────

SUFFIX="${RANDOM}"

USER1_ID=$(new_uuid); USER2_ID=$(new_uuid); USER3_ID=$(new_uuid)

insert_user "$USER1_ID" "Alice Test" "alice_test_${SUFFIX}" "+1555${SUFFIX}0001"
insert_user "$USER2_ID" "Bob Test"   "bob_test_${SUFFIX}"   "+1555${SUFFIX}0002"
insert_user "$USER3_ID" "Carol Test" "carol_test_${SUFFIX}" "+1555${SUFFIX}0003"

log "Users created"
echo "  Alice: $USER1_ID"
echo "  Bob:   $USER2_ID"
echo "  Carol: $USER3_ID"

info "Generating JWTs..."
TOKEN1=$(make_jwt "$USER1_ID")
TOKEN2=$(make_jwt "$USER2_ID")
TOKEN3=$(make_jwt "$USER3_ID")
log "JWTs generated"

# ─── Trip: create or use existing ────────────────────────────────────────────

if [[ -z "$TRIP_ID" ]]; then
  info "Creating trip..."
  TRIP=$(api_post "$TOKEN1" "/trips" '{"name":"Poll Voting Test","budget_min":100,"budget_max":10000}')
  TRIP_ID=$(echo "$TRIP" | jq -r '.id')
  log "Trip created: $TRIP_ID"
else
  log "Using existing trip: $TRIP_ID"
fi

# Add all 3 users as trip members directly via DB
for uid in "$USER1_ID" "$USER2_ID" "$USER3_ID"; do
  db_exec "INSERT INTO memberships (user_id, trip_id, is_admin, budget_min, budget_max)
           VALUES ('$uid', '$TRIP_ID', false, 0, 10000)
           ON CONFLICT (user_id, trip_id) DO NOTHING;" 2>/dev/null || true
done
log "Users added to trip"

# ─── Polls: create or use existing ───────────────────────────────────────────

if [[ -z "$SINGLE_ID" ]]; then
  RESP=$(api_post "$TOKEN1" "/trips/$TRIP_ID/vote-polls" '{
    "question":"Which destination should we visit?","poll_type":"single",
    "options":[{"option_type":"custom","name":"Paris"},{"option_type":"custom","name":"Tokyo"},
               {"option_type":"custom","name":"New York"},{"option_type":"custom","name":"Sydney"}],
    "is_anonymous":false,"should_notify_members":false}')
  SINGLE_ID=$(echo "$RESP" | jq -r '.id')
  SINGLE_POLL="$RESP"
  log "Single poll: $SINGLE_ID"
else
  log "Using single poll: $SINGLE_ID"
  SINGLE_POLL=$(curl -s --max-time 15 "$API/trips/$TRIP_ID/vote-polls/$SINGLE_ID" -H "Authorization: Bearer $TOKEN1")
fi

if [[ -z "$MULTI_ID" ]]; then
  RESP=$(api_post "$TOKEN1" "/trips/$TRIP_ID/vote-polls" '{
    "question":"Which activities do you want to do?","poll_type":"multi",
    "options":[{"option_type":"custom","name":"Snorkeling"},{"option_type":"custom","name":"Diving"},
               {"option_type":"custom","name":"Hiking"},{"option_type":"custom","name":"Kayaking"},
               {"option_type":"custom","name":"Fishing"}],
    "is_anonymous":false,"should_notify_members":false}')
  MULTI_ID=$(echo "$RESP" | jq -r '.id')
  MULTI_POLL="$RESP"
  log "Multi poll: $MULTI_ID"
else
  log "Using multi poll: $MULTI_ID"
  MULTI_POLL=$(curl -s --max-time 15 "$API/trips/$TRIP_ID/vote-polls/$MULTI_ID" -H "Authorization: Bearer $TOKEN1")
fi

if [[ -z "$YESNO_ID" ]]; then
  RESP=$(api_post "$TOKEN1" "/trips/$TRIP_ID/vote-polls" '{
    "question":"Should we book the hotels now?","poll_type":"single",
    "options":[{"option_type":"custom","name":"Yes"},{"option_type":"custom","name":"No"}],
    "is_anonymous":false,"should_notify_members":false}')
  YESNO_ID=$(echo "$RESP" | jq -r '.id')
  YESNO_POLL="$RESP"
  log "Yes/No poll: $YESNO_ID"
else
  log "Using yes/no poll: $YESNO_ID"
  YESNO_POLL=$(curl -s --max-time 15 "$API/trips/$TRIP_ID/vote-polls/$YESNO_ID" -H "Authorization: Bearer $TOKEN1")
fi

if [[ -z "$RANK_ID" ]]; then
  RESP=$(api_post "$TOKEN1" "/trips/$TRIP_ID/rank-polls" '{
    "question":"Rank your preferred accommodation types","poll_type":"rank",
    "options":[{"option_type":"custom","name":"Hotel"},{"option_type":"custom","name":"Airbnb"},
               {"option_type":"custom","name":"Hostel"},{"option_type":"custom","name":"Resort"}],
    "is_anonymous":false,"should_notify_members":false}')
  RANK_ID=$(echo "$RESP" | jq -r '.id')
  log "Rank poll: $RANK_ID"
else
  log "Using rank poll: $RANK_ID"
fi

# Fetch rank poll options separately (rank poll create response has options)
RANK_POLL=$(curl -s --max-time 15 "$API/trips/$TRIP_ID/rank-polls/$RANK_ID" -H "Authorization: Bearer $TOKEN1")

# ─── Extract option IDs ───────────────────────────────────────────────────────

IFS=$'\n' read -r -d '' -a SINGLE_OPT_IDS <<< "$(echo "$SINGLE_POLL" | jq -r '.options[].id')"   || true
IFS=$'\n' read -r -d '' -a MULTI_OPT_IDS  <<< "$(echo "$MULTI_POLL"  | jq -r '.options[].id')"   || true
IFS=$'\n' read -r -d '' -a YESNO_OPT_IDS  <<< "$(echo "$YESNO_POLL"  | jq -r '.options[].id')"   || true
# Rank poll GET returns ModelsRankPollResultsResponse: all_options[].option_id
IFS=$'\n' read -r -d '' -a RANK_OPT_IDS  <<< "$(echo "$RANK_POLL"   | jq -r '.all_options[].option_id // .options[].id')" || true

[[ ${#SINGLE_OPT_IDS[@]} -eq 0 ]] && { err "Could not parse single poll options"; exit 1; }
[[ ${#MULTI_OPT_IDS[@]}  -eq 0 ]] && { err "Could not parse multi poll options";  exit 1; }
[[ ${#YESNO_OPT_IDS[@]}  -eq 0 ]] && { err "Could not parse yesno poll options";  exit 1; }
[[ ${#RANK_OPT_IDS[@]}   -eq 0 ]] && { err "Could not parse rank poll options";   exit 1; }

# ─── Summary ─────────────────────────────────────────────────────────────────

echo ""
echo -e "${CYAN}══════════════════ IDs ══════════════════${NC}"
echo "  Trip:    $TRIP_ID"
echo "  Single:  $SINGLE_ID"
echo "  Multi:   $MULTI_ID"
echo "  Yes/No:  $YESNO_ID"
echo "  Rank:    $RANK_ID"
echo -e "${CYAN}════════════════════════════════════════${NC}"
echo ""
log "Starting vote loop (Ctrl+C to stop)…"
echo ""

# ─── Vote helpers ─────────────────────────────────────────────────────────────

vote_single() {
  local token="$1" label="$2"
  local idx=$(( RANDOM % ${#SINGLE_OPT_IDS[@]} ))
  api_post "$token" "/trips/$TRIP_ID/vote-polls/$SINGLE_ID/vote" \
    "{\"option_ids\":[\"${SINGLE_OPT_IDS[$idx]}\"]}" >/dev/null
  echo "  $label → single[${SINGLE_OPT_IDS[$idx]:0:8}…]"
}

vote_multi() {
  local token="$1" label="$2"
  local -a chosen=()
  for opt in "${MULTI_OPT_IDS[@]}"; do
    [[ $(( RANDOM % 2 )) -eq 0 ]] && chosen+=("$opt")
  done
  [[ ${#chosen[@]} -eq 0 ]] && chosen=("${MULTI_OPT_IDS[0]}")
  local ids_json
  ids_json=$(printf '"%s",' "${chosen[@]}" | sed 's/,$//')
  api_post "$token" "/trips/$TRIP_ID/vote-polls/$MULTI_ID/vote" \
    "{\"option_ids\":[$ids_json]}" >/dev/null
  echo "  $label → multi[${#chosen[@]} options]"
}

vote_yesno() {
  local token="$1" label="$2"
  local idx=$(( RANDOM % 2 ))
  local name; [[ $idx -eq 0 ]] && name="Yes" || name="No"
  api_post "$token" "/trips/$TRIP_ID/vote-polls/$YESNO_ID/vote" \
    "{\"option_ids\":[\"${YESNO_OPT_IDS[$idx]}\"]}" >/dev/null
  echo "  $label → yesno[$name]"
}

vote_rank() {
  local token="$1" label="$2"
  local shuffled=("${RANK_OPT_IDS[@]}")
  for (( i=${#shuffled[@]}-1; i>0; i-- )); do
    local j=$(( RANDOM % (i+1) ))
    local tmp="${shuffled[$i]}"; shuffled[$i]="${shuffled[$j]}"; shuffled[$j]="$tmp"
  done
  local rankings="["
  for (( i=0; i<${#shuffled[@]}; i++ )); do
    [[ $i -gt 0 ]] && rankings+=","
    rankings+="{\"option_id\":\"${shuffled[$i]}\",\"rank\":$((i+1))}"
  done
  rankings+="]"
  api_post "$token" "/trips/$TRIP_ID/rank-polls/$RANK_ID/rank" \
    "{\"rankings\":$rankings}" >/dev/null
  echo "  $label → rank[shuffled]"
}

# ─── Vote loop ────────────────────────────────────────────────────────────────

ROUND=0
while true; do
  ROUND=$(( ROUND + 1 ))
  echo -e "${YELLOW}── Round $ROUND ────────────────────────${NC}"

  vote_single "$TOKEN1" "Alice" & vote_multi "$TOKEN1" "Alice" &
  vote_yesno  "$TOKEN1" "Alice" & vote_rank  "$TOKEN1" "Alice" &
  vote_single "$TOKEN2" "Bob"   & vote_multi "$TOKEN2" "Bob"   &
  vote_yesno  "$TOKEN2" "Bob"   & vote_rank  "$TOKEN2" "Bob"   &
  vote_single "$TOKEN3" "Carol" & vote_multi "$TOKEN3" "Carol" &
  vote_yesno  "$TOKEN3" "Carol" & vote_rank  "$TOKEN3" "Carol" &
  wait

  echo ""
  sleep $(( (RANDOM % 3) + 1 ))
done
