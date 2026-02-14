# Supabase & Edge Functions – Verification Guide

## חיבור ל-Supabase

האפליקציה משתמשת ב:

- **URL**: `VITE_SUPABASE_URL` (ב-`.env.local`)
- **מפתח ציבורי**: `VITE_SUPABASE_PUBLISHABLE_KEY` (ב-`.env.local`)

הלקוח נוצר ב-`src/integrations/supabase/client.ts` ומשמש לאורך כל האפליקציה.

### בדיקת חיבור

הרצה מהשורש של הפרויקט:

```bash
node scripts/verify-supabase.mjs
```

הסקריפט בודק:

- חיבור ל-Auth
- גישה לטבלאות (למשל `subscription_plans`)
- נגישות ל-Endpoint של Edge Functions

---

## Edge Functions – רשימה ותלויות

| Function | תיאור | משתני סביבה / Secrets נדרשים |
|----------|--------|------------------------------|
| **chat-builder** | עריכת מצגת באמצעות צ'אט (Gemini) | `GEMINI_API_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| **generate-image** | יצירת תמונה לפי prompt (Gemini) | `GEMINI_API_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY` |
| **generate-slides** | יצירת מצגת מלאה או שקף בודד (Gemini) | `GEMINI_API_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| **parse-presentation** | פענוח PDF/PPTX עם Gemini | `GEMINI_API_KEY` (אופציונלי – יש fallback) |
| **convert-to-images** | המרת PPTX לשקפים כ-SVG/תמונות | אין (רק קוד) |
| **create-checkout-session** | יצירת תשלום PayPal למנוי | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `PAYPAL_CLIENT_ID`, `PAYPAL_SECRET_KEY`, `PAYPAL_MODE` (אופציונלי) |
| **create-credits-checkout** | רכישת קרדיטים (PayPal) | כמו למעלה |
| **capture-paypal-order** | השלמת תשלום PayPal | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `PAYPAL_*` |
| **paypal-webhook** | Webhook מאומת מ-PayPal | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `PAYPAL_*`, **`PAYPAL_WEBHOOK_ID`** |

ב-Supabase, `SUPABASE_URL`, `SUPABASE_ANON_KEY` ו-`SUPABASE_SERVICE_ROLE_KEY` מוזרקים אוטומטית ל-Functions. צריך להגדיר רק ב-Dashboard:

- **Secrets** (Settings → Edge Functions → Secrets):
  - `GEMINI_API_KEY`
  - `PAYPAL_CLIENT_ID`
  - `PAYPAL_SECRET_KEY`
  - `PAYPAL_WEBHOOK_ID` (חובה ל-paypal-webhook)
  - `PAYPAL_MODE` (אופציונלי: `sandbox` / `live`)

---

## איך לוודא ש-Edge Functions עובדות

1. **לאחר deploy**  
   ב-Supabase Dashboard: **Edge Functions** – לוודא שכל הפונקציות מופיעות ו-deployed.

2. **בדיקה מהאפליקציה**  
   - **create-checkout-session** – בדף Pricing, התחלה של תשלום מנוי.
   - **create-credits-checkout** – בדף Billing, רכישת קרדיטים.
   - **capture-paypal-order** – מתבצע אחרי החזרה מ-PayPal (return URL).
   - **chat-builder** – ב-Conversational Builder, שליחת הודעה לעריכת שקפים.
   - **generate-slides** – יצירת מצגת/שקף בודד מ-AI.
   - **generate-image** – יצירת תמונה ב-Editor.
   - **parse-presentation** – ייבוא קובץ PDF/PPTX.

3. **הרצה מקומית (אופציונלי)**  
   ```bash
   npx supabase functions serve
   ```  
   ואז קריאות ל-`http://localhost:54321/functions/v1/<function-name>` עם ה-headers המתאימים.

---

## שגיאות נפוצות

| תופעה | סיבה אפשרית | פתרון |
|--------|-------------|--------|
| 401 Unauthorized ב-Function | משתמש לא מחובר או token לא נשלח | לבדוק ש-`Authorization: Bearer <session.access_token>` נשלח בקריאות מ-client |
| 500 / "GEMINI_API_KEY not configured" | חסר Secret ב-Edge Function | להגדיר `GEMINI_API_KEY` ב-Supabase → Edge Functions → Secrets |
| "Insufficient credits" | אין מספיק קרדיטים למשתמש | לבדוק טבלאות `user_credits` ו-`credit_transactions` |
| paypal-webhook מחזיר 401 | `PAYPAL_WEBHOOK_ID` חסר או לא תואם ל-PayPal | להגדיר Webhook ב-PayPal Developer ולהוסיף את ה-ID כ-Secret |

---

## קונפיגורציה מקומית (Supabase CLI)

ב-`supabase/config.toml` מופיע `project_id`. אם אתה עובד מול פרויקט ספציפי ב-Supabase, וודא ש-`project_id` תואם ל-Project ב-Dashboard (ה-ref שמופיע ב-URL של הפרויקט).
