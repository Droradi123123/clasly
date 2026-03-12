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
  npx -y supabase db push || { echo "המיגרציות נכשלו. אם הרצת manual-schema-setup.sql ידנית, הרץ: ./scripts/deploy-production.sh --skip-db"; exit 1; }
else
  echo "=== 1. מדלג על מיגרציות (--skip-db) ==="
fi

echo ""
echo "=== 2. מעלים Edge Functions (AI, משחקים, תמונות) ==="
npm run deploy:functions

echo ""
echo "=== 3. מעלים פונקציות PayPal ==="
npm run deploy:paypal

echo ""
echo "=== 4. מעלים את ה-Frontend ל-Vercel ==="
if command -v vercel &> /dev/null; then
  vercel --prod
else
  echo "Vercel CLI לא מותקן. התקן עם: npm i -g vercel"
  echo "או פשוט עשה push ל-GitHub – Vercel יעלה אוטומטית אם מחובר."
  echo ""
  echo "להעלאה ידנית:"
  echo "  git add . && git commit -m 'Deploy updates' && git push origin main"
fi

echo ""
echo "=== סיום ==="
