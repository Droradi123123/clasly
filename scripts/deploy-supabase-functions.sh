#!/usr/bin/env bash
# Deploy every Edge Function under supabase/functions/ (skips _shared and folders without index.ts).
set -euo pipefail

PROJECT_REF="${SUPABASE_PROJECT_REF:-gctdhjgxrshrltbntjqj}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FUNCS_DIR="$ROOT/supabase/functions"

if [[ ! -d "$FUNCS_DIR" ]]; then
  echo "Missing $FUNCS_DIR"
  exit 1
fi

for path in "$FUNCS_DIR"/*/; do
  name="$(basename "$path")"
  [[ "$name" == "_shared" ]] && continue
  [[ -f "${path}index.ts" ]] || continue
  echo ""
  echo ">>> Deploying function: $name"
  npx -y supabase functions deploy "$name" --project-ref "$PROJECT_REF"
done

echo ""
echo "=== All functions deployed (project $PROJECT_REF) ==="
