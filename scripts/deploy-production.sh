#!/bin/bash
# הפקודה להטמעת כל הקוד בפרודקשן
# שימוש: ./scripts/deploy-production.sh [--skip-db]
#   --skip-db   דלג על מיגרציות (אם הרצת manual-schema-setup.sql ידנית)
set -e

SKIP_DB=false
for arg in "$@"; do
  [ "$arg" = "--skip-db" ] && SKIP_DB=true
done

if [ "$SKIP_DB" = false ]; then
  echo "=== 1. מריצים מיגרציות Supabase ==="
  echo "אם עדיין לא קישרת את הפרויקט, הרץ קודם: npx supabase link --project-ref gctdhjgxrshrltbntjqj"
  npx -y supabase db push --include-all --yes || { echo "המיגרציות נכשלו. אם הרצת manual-schema-setup.sql ידנית, הרץ: ./scripts/deploy-production.sh --skip-db"; exit 1; }
else
  echo "=== 1. מדלג על מיגרציות (--skip-db) ==="
fi

echo ""
echo "=== 2. מעלים את כל ה-Edge Functions ב-Supabase ==="
npm run deploy:functions

echo ""
echo "=== 3. מעלים את ה-Frontend ל-Vercel ==="
if command -v vercel &> /dev/null; then
  vercel --prod --yes
else
  echo "Vercel לא ב-PATH — משתמשים ב-npx vercel"
  npx -y vercel --prod --yes
fi

echo ""
echo "=== סיום ==="
