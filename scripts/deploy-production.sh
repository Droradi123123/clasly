#!/bin/bash
# הפקודה להטמעת כל הקוד בפרודקשן
set -e

echo "=== 1. מריצים מיגרציות Supabase ==="
npx -y supabase db push --project-ref gctdhjgxrshrltbntjqj

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
