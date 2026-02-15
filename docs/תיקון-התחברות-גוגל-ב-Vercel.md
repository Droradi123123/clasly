# תיקון: התחברות עם גוגל מפנה ל-localhost במקום לאתר

אם אחרי התחברות עם גוגל אתה מגיע ל-`http://localhost:3000/` במקום ל-`https://clasly-bay.vercel.app/` – צריך להוסיף את כתובת האתר ב-Supabase.

---

## מה לעשות (רק ב-Supabase)

1. **נכנס ל-Supabase**  
   [supabase.com](https://supabase.com) → התחבר → בחר את הפרויקט (זה עם ה-URL שמסתיים ב-`gctdhjgxrshrltbntjqj`).

2. **פותח את ההגדרות של ההתחברות**  
   בתפריט בצד שמאל: **Authentication** (או "אימות").  
   אחר כך: **URL Configuration** (או "תצורת כתובות").

3. **ממלא שני שדות:**

   - **Site URL**  
     שים בדיוק:
     ```text
     https://clasly-bay.vercel.app
     ```
     (בלי סלאש בסוף, אם לא כתוב אחרת בהנחיות של Supabase.)

   - **Redirect URLs**  
     זה רשימת כתובות מותרות אחרי התחברות.  
     לוחצים **"Add URL"** (או מוסיפים שורה) ומוסיפים:
     ```text
     https://clasly-bay.vercel.app/**
     ```
     אם יש כבר שורות (למשל `http://localhost:5173/**`) – **לא** מוחקים אותן, רק **מוסיפים** את השורה למעלה.  
     אם Supabase דורש גם גרסה בלי הכוכבית, מוסיפים גם:
     ```text
     https://clasly-bay.vercel.app
     ```

4. **שמירה**  
   לוחצים **Save** (או "שמור") בתחתית המסך.

5. **בדיקה**  
   נכנסים שוב ל-`https://clasly-bay.vercel.app/`, לוחצים "התחבר עם Google", ומסיימים התחברות – עכשיו אתם אמורים להישאר ב-`https://clasly-bay.vercel.app/` (או בדף הפנימי שהאתר מפנה אליו) ולא ל-localhost.

---

## סיכום

- הבעיה: Supabase לא ידע שהכתובת החוקית שלך היא `https://clasly-bay.vercel.app`, אז החזיר ל-localhost.
- הפתרון: ב-**Authentication → URL Configuration** ב-Supabase להגדיר **Site URL** ו-**Redirect URLs** עם `https://clasly-bay.vercel.app` (ו־`https://clasly-bay.vercel.app/**` אם נדרש).
