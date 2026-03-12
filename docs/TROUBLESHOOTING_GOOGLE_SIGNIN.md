# פתרון בעיות: הרשמה / התחברות עם גוגל

כשההרשמה עם גוגל "לא עובדת", הסיבה כמעט תמיד בהגדרות חיצוניות (Supabase או Google Cloud), לא בקוד האפליקציה.

---

## 1. Supabase Dashboard – הפעלת גוגל

1. **Authentication** → **Providers** → **Google**
2. וודא ש-**Enable Sign in with Google** מסומן.
3. **Client ID** ו-**Client Secret** – חייבים לבוא מ-Google Cloud Console (ראו סעיף 3).
4. שמור.

אם השדות ריקים או שגויים – המשתמש יועבר לגוגל אבל אחרי האישור יקבל שגיאה או יוחזר בלי session.

---

## 2. Supabase – כתובות Redirect

אחרי שהמשתמש מאשר בגוגל, Supabase מחזיר אותו **לכתובת האפליקציה**. הכתובת חייבת להיות מורשת.

1. **Authentication** → **URL Configuration**
2. **Site URL** – הכתובת הראשית של האפליקציה, למשל:
   - `https://your-app.vercel.app`
   - `https://clasly.co`
   - לפיתוח: `http://localhost:5173`
3. **Redirect URLs** – הוסף כאן **בדיוק** את כל הכתובות שמהן משתמשים נכנסים:
   - `https://your-app.vercel.app`
   - `https://your-app.vercel.app/**`
   - `http://localhost:5173`
   - `http://localhost:5173/**`

אם הכתובת לא ברשימה – Supabase עלול לחסום את ה-redirect או להחזיר עם `?error=...` ב-URL (ואז האפליקציה מציגה "ההרשמה נכשלה" מהפרמטרים האלה).

---

## 3. Google Cloud Console – OAuth Client

1. [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services** → **Credentials**
2. בחר את ה-**OAuth 2.0 Client ID** מסוג **Web application** (או צור חדש).
3. **Authorized redirect URIs** – **חובה** שיהיה:
   ```
   https://gctdhjgxrshrltbntjqj.supabase.co/auth/v1/callback
   ```
   אם יש לך Custom Domain ל-Supabase (למשל `api.yourdomain.com`), הוסף גם:
   ```
   https://api.yourdomain.com/auth/v1/callback
   ```
4. **Authorized JavaScript origins** – הוסף את כתובת האפליקציה:
   - `https://your-app.vercel.app`
   - `http://localhost:5173` (פיתוח)

בלי ה-redirect URI הנכון של Supabase, גוגל לא תאשר את ההתחברות.

---

## 4. שגיאה אחרי האישור – "Database error saving new user"

אם המשתמש עובר את גוגל בהצלחה אבל אז מופיעה שגיאה (למשל ב-URL: `?error=...&error_description=...`), הסיבה בדרך כלל ב-**טריגר על הרשמה** ב-Supabase:

- ב-`auth.users` מוגדר טריגר שקורא לפונקציה `handle_new_user()`.
- הפונקציה מוסיפה שורות ל-`user_subscriptions` ו-`user_credits`.
- אם יש **RLS** על הטבלאות האלה בלי policy שמאפשרת את ה-insert (או שחסרה שורת תוכנית "Free" ב-`subscription_plans`), ה-insert נכשל ו-Supabase מחזיר "Database error saving new user".

**מה לבדוק:**

1. **טבלת `subscription_plans`** – חייבת להכיל שורה עם `name = 'Free'`. אם הטבלה ריקה או חסרה השורה, הטריגר יכול להיכשל.
2. **Policies על `user_subscriptions` ו-`user_credits`** – חייבת להיות policy שמאפשרת **INSERT** למשתמש על ה-**user_id** שלו (למשל "Users can insert own subscription on signup" / "Users can insert own credits on signup"). המיגרציות בפרויקט אמורות להוסיף אותן; אם הרצת רק חלק מהמיגרציות, ייתכן שחסר.

אם אתה מעדכן את הטריגר או מוסיף טבלאות חדשות שהטריגר כותב אליהן – תמיד לבדוק ש-RLS מאפשר את ה-insert בהקשר של משתמש חדש (או שהפונקציה רצה כ-SECURITY DEFINER עם הרשאות מתאימות).

---

## 5. האם יצוצו עוד בעיות?

יכולות לצוץ בעיות נוספות רק אם משנים משהו בהגדרות או בסכמה:

| שינוי | סיכון |
|--------|--------|
| **דומיין חדש** (למשל מעבר מ-vercel.app לדומיין מותאם) | צריך לעדכן **Redirect URLs** ב-Supabase ו-**Authorized JavaScript origins** (ואולי redirect URI) ב-Google. אחרת ההתחברות עם גוגל תפסיק לעבוד. |
| **הוספת טבלאות/שדות** שהטריגר `handle_new_user` כותב אליהן | אם אין policy שמאפשרת insert למשתמש החדש – שוב "Database error saving new user". |
| **שינוי ב-.env** (URL או מפתח של Supabase) | אם ה-URL או ה-anon key לא תואמים לפרויקט ב-Supabase, ייתכן Invalid JWT / חיבור לא נכון. עדכן גם ב-Supabase Dashboard אם צריך. |

במצב נוכחי, אחרי שמוודאים את סעיפים 1–4, ההרשמה עם גוגל אמורה לעבוד. אם הוספת משהו חדש לטריגר או ל-Auth – תמיד לבדוק Redirect URLs ו-RLS.

---

## סיכום בדיקה מהירה

- [ ] Supabase: Google provider מופעל, Client ID + Secret מוזנים
- [ ] Supabase: Site URL ו-Redirect URLs כוללים את כתובת האפליקציה (כולל localhost לפיתוח)
- [ ] Google Cloud: ב-OAuth Client – redirect URI של Supabase ו-JavaScript origins של האפליקציה
- [ ] DB: יש שורת תוכנית Free ב-`subscription_plans`, ויש policies שמאפשרות insert ל-`user_subscriptions` ו-`user_credits` בהרשמה

אם אחרי כל זה עדיין יש שגיאה – כדאי לפתוח את ה-Network tab (או לוגים ב-Supabase) ולראות מה בדיוק Supabase מחזיר (סטטוס, גוף התשובה או פרמטרי `error` ב-URL).
