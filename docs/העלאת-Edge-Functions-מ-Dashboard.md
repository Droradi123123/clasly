# העלאת Edge Functions בלי טרמינל (מ-Supabase Dashboard)

אם `npm run deploy:functions` לא עובד (למשל בגלל התחברות), אפשר להעלות את הפונקציות ידנית מה-Dashboard. חשוב לעשות את זה כדי שהתיקון ל"Session invalid" ייכנס לתוקף.

---

## שלב 1: להיכנס ל-Supabase

1. נכנס ל-[supabase.com](https://supabase.com) ומתחבר.
2. בוחרים את הפרויקט (זה עם ה-URL שמסתיים ב-`gctdhjgxrshrltbntjqj`).

---

## שלב 2: לעדכן את generate-slides

1. בתפריט משמאל: **Edge Functions**.
2. לוחצים על **generate-slides**.
3. לוחצים **Edit** / **Edit function** (או נכנסים לעורך הקוד).
4. **מחליפים את כל התוכן** של הקובץ `index.ts` בתוכן של הקובץ מהמחשב:
   - במחשב: פתח את התיקייה  
     `interactive-lecture-hub-main/supabase/functions/generate-slides/`  
     ופתח את הקובץ **index.ts**.
   - העתק את **כל** התוכן (Ctrl+A / Cmd+A, ואז Ctrl+C / Cmd+C).
   - ב-Dashboard: בחר הכל בעורך (Ctrl+A) והדבק (Ctrl+V) במקום.
5. שומרים (**Save**).
6. לוחצים **Deploy** (או **Deploy new version**).
7. מחכים עד שההעלאה מסתיימת.

---

## שלב 3: לעדכן את chat-builder

1. ב-**Edge Functions** לוחצים על **chat-builder**.
2. עורך את הפונקציה.
3. מחליפים את כל הקוד ב-`index.ts` בתוכן מהקובץ במחשב:  
   `interactive-lecture-hub-main/supabase/functions/chat-builder/index.ts`
4. שומרים ולוחצים **Deploy**.

---

## שלב 4: לעדכן את generate-image

1. ב-**Edge Functions** לוחצים על **generate-image**.
2. עורך את הפונקציה.
3. מחליפים את כל הקוד ב-`index.ts` בתוכן מהקובץ במחשב:  
   `interactive-lecture-hub-main/supabase/functions/generate-image/index.ts`
4. שומרים ולוחצים **Deploy**.

---

## אחרי ההעלאה

1. נכנסים ל-**https://clasly-bay.vercel.app**
2. **מתנתקים** (Sign out) ו-**מתחברים שוב** עם גוגל.
3. מנסים **"יצור מצגת עם AI"** שוב.

---

## אם עדיין לא עובד – לבדוק לוגים

1. ב-Supabase: **Edge Functions** → **generate-slides**.
2. ללחוץ על **Logs** (או **Invocations**).
3. לנסות שוב ליצור מצגת באתר.
4. ברשימת הלוגים – לפתוח את הקריאה האחרונה ולהופיע הודעת השגיאה (למשל `Auth failed: ...`).  
   את הטקסט המדויק אפשר להעתיק ולתת למישהו טכני כדי לדייק את הפתרון.
