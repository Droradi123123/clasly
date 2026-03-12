# .env / .env.local ו־Invalid JWT

## שני הקבצים

- **`.env`** – משתני סביבה לכל סביבה.
- **`.env.local`** – דורס ערכים רק **במחשב שלך** (לא נשמר ב-git).

אם **שניהם** קיימים, ב-Vite הערכים מ-**`.env.local`** גוברים על `.env`.  
מותר שיהיו לשניהם **אותם ערכים** – חשוב רק ששניהם מצביעים על **אותו פרויקט Supabase** (אותו URL ואותו anon key).

## מאיפה לוקחים את הערכים

1. נכנסים ל-**Supabase Dashboard** → הפרויקט שלך.
2. **Settings** (גלגל שיניים) → **API**.
3. מעתיקים:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public** (מפתח ציבורי) → `VITE_SUPABASE_PUBLISHABLE_KEY`

בשני הקבצים (.env ו-.env.local) צריכים להיות **בדיוק** אותם ערכים מהדשבורד.

## שגיאת "Invalid JWT"

זו בדרך כלל לא בעיה של ערך ב-.env, אלא של **session ישן בדפדפן** (טוקן מפרויקט אחר או שפג תוקף).

### מה לעשות

1. **להתנתק (Sign out)** באתר – מנקה את ה-session מה-localStorage.
2. **להתחבר שוב (Sign in)** – נוצר JWT חדש מהפרויקט הנכון.
3. לנסות שוב ליצור מצגת עם AI.

אם אחרי התחברות מחדש עדיין מופיע Invalid JWT:

- ב-**Supabase Dashboard** → **Settings** → **API** – לוודא שהעתקת את ה-URL וה-**anon public** **מאותו פרויקט** שבו ה-Edge Functions (למשל `gctdhjgxrshrltbntjqj`).
- לעדכן את `.env` ו-.env.local עם הערכים האלה, להפעיל מחדש את `npm run dev`, ואז **להתנתק ולהתחבר שוב**.
