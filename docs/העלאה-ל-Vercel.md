t# איך להעלות את האתר ל-Vercel (אונליין)

המדריך הזה מסביר שלב-אחר-שלב איך לפרסם את הפרויקט באינטרנט דרך Vercel – בלי צורך להריץ שרת במחשב.

---

## לפני שמתחילים

1. **חשבון ב-GitHub** – אם אין, צור בחינם ב-[github.com](https://github.com).
2. **חשבון ב-Vercel** – אם אין, צור בחינם ב-[vercel.com](https://vercel.com) (אפשר להתחבר עם GitHub).

---

## שלב 1: להעלות את הפרויקט ל-GitHub

אם הפרויקט **כבר** ב-GitHub – דלג לשלב 2.

אם הפרויקט **רק אצלך במחשב**:

1. היכנס ל-[github.com](https://github.com) והתחבר.
2. לוחצים על **"+"** למעלה מימין → **"New repository"**.
3. **Repository name:** בוחרים שם (למשל `interactive-lecture-hub`).
4. משאירים **Public**.
5. **אל** תסמן "Add a README" – הפרויקט כבר קיים.
6. לוחצים **"Create repository"**.

7. **במחשב** – פותחים טרמינל (Terminal) ועוברים לתיקיית הפרויקט:
   ```text
   cd ~/Desktop/interactive-lecture-hub-main
   ```
8. מריצים את הפקודות האלה (בזה אחר זה):
   ```text
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/שם-המשתמש/שם-הריפו.git
   git push -u origin main
   ```
   **חשוב:** במקום `שם-המשתמש/שם-הריפו` להכניס את השם האמיתי של המשתמש והריפו שיצרת (למשל `dror/interactive-lecture-hub`).

אם מבקשים שם משתמש וסיסמה – אפשר להשתמש ב-**Personal Access Token** מ-GitHub (Settings → Developer settings → Personal access tokens) במקום סיסמה.

---

## שלב 2: לחבר את הפרויקט ל-Vercel

1. נכנסים ל-[vercel.com](https://vercel.com) ומתחברים (רצוי עם **GitHub**).
2. לוחצים **"Add New..."** → **"Project"**.
3. בוחרים **"Import Git Repository"**.
4. אם צריך – לוחצים **"Connect GitHub Account"** ומאשרים גישה ל-Vercel.
5. ברשימה מופיעים הריפוזיטוריים מ-GitHub. **בוחרים את הפרויקט** (למשל `interactive-lecture-hub`) ולוחצים **"Import"**.

---

## שלב 3: להגדיר את הפרויקט ב-Vercel

במסך ההגדרות:

1. **Framework Preset** – Vercel אמור לזהות אוטומטית **Vite**. אם לא, בוחרים **Vite**.
2. **Build Command** – להשאיר ריק או `npm run build`.
3. **Output Directory** – להשאיר `dist` (ברירת מחדל ל-Vite).
4. **Install Command** – להשאיר `npm install`.

**אל** לוחצים עדיין על Deploy.

---

## שלב 4: להוסיף משתני סביבה (Environment Variables)

זה החלק החשוב – בלי זה האתר לא יתחבר ל-Supabase.

1. באותו מסך, למטה, מחפשים **"Environment Variables"**.
2. לוחצים **"Add"** או **"Add New"**.
3. מוסיפים **שני** משתנים:

   **משתנה ראשון:**
   - **Name:** `VITE_SUPABASE_URL`
   - **Value:** `https://gctdhjgxrshrltbntjqj.supabase.co`
   - **Environment:** לסמן את שלושת התיבות (Production, Preview, Development).

   **משתנה שני:**
   - **Name:** `VITE_SUPABASE_PUBLISHABLE_KEY`
   - **Value:** המפתח המלא מ-Supabase (ה-anon key שמתחיל ב-`eyJ...`).
     - איפה למצוא: Supabase Dashboard → **Settings** → **API** → **Project API keys** → **anon public** → Copy.
   - **Environment:** לסמן את שלושת התיבות.

4. לוחצים **"Save"** אחרי כל משתנה.

---

## שלב 5: להריץ את ההעלאה (Deploy)

1. לוחצים **"Deploy"** (או **"Continue"** ואז **"Deploy"**).
2. מחכים דקה–שתיים. Vercel בונה את האתר ומעלה אותו.
3. כשמופיע **"Congratulations"** או **"Your project has been deployed"** – הסתיים.
4. לוחצים על **"Visit"** או על הכתובת (למשל `https://interactive-lecture-hub-xxx.vercel.app`) – זה האתר החי.

---

## הרצת מיגרציות Supabase

לפני הפעם הראשונה (או כשיש מיגרציות חדשות):

1. **קישור הפרויקט** (פעם אחת):
   ```text
   cd ~/Desktop/interactive-lecture-hub-main
   npx supabase link --project-ref gctdhjgxrshrltbntjqj
   ```
   (יבקש סיסמה – הזן את ה-database password מ-Supabase Dashboard → Settings → Database)

2. **הרצת המיגרציות**:
   ```text
   npx supabase db push
   ```

---

## אחרי ההעלאה

- **כל עדכון ב-GitHub** (push ל-main) יבנה ויעלה גרסה חדשה אוטומטית.
- אם תרצה דומיין משלך – ב-Vercel: Project → **Settings** → **Domains** ואפשר להוסיף דומיין.

---

## הגדרת Webhook של PayPal (לתשלומים)

כדי ש-PayPal ישלח אירועים (תשלום הושלם, מנוי בוטל וכו') לאפליקציה, צריך ליצור Webhook ב-PayPal Developer ולהוסיף את ה-**Webhook ID** כ-Secret ב-Supabase.

### 1. כתובת ה-Webhook (Webhook URL)

בשדה **"Webhook URL"** במסך "Add webhook" הכנס:

```text
https://gctdhjgxrshrltbntjqj.supabase.co/functions/v1/paypal-webhook
```

זו הכתובת של פונקציית ה-Edge `paypal-webhook` בפרויקט Supabase שלך. **חשוב:** פונקציה זו חייבת להיות כבר מפורסמת (`npm run deploy:paypal`) לפני ש-PayPal יתחיל לשלוח אירועים.

### 2. אילו Event types לסמן

בסעיף **"Event types"** סמן את האירועים שהאפליקציה מטפלת בהם:

- **Checkout** – בתוך הקטגוריה פתח ובחר (או סמן את כל התת-אירועים):
  - `Checkout order approved`
- **Payments** (אם מופיע כקטגוריה) – אירועים כמו:
  - `Payment capture completed`
- **Billing subscription** – פתח ובחר:
  - `Billing subscription cancelled`
  - `Billing subscription suspended`

**קיצור:** אם יש אופציה **"All Events"** ואתה רוצה שכל אירוע עתידי יגיע – אפשר לסמן אותה. זה מכסה גם אירועים ש-PayPal אולי יוסיפו בעתיד.

### 3. אחרי שמירת ה-Webhook

- PayPal יציג **Webhook ID** (מזהה ארוך). **העתק אותו.**
- ב-Supabase: **Edge Functions** → **Secrets** → הוסף Secret בשם `PAYPAL_WEBHOOK_ID` והדבק את ה-ID.
- בלי ה-`PAYPAL_WEBHOOK_ID` פונקציית `paypal-webhook` תדחה את כל הבקשות (מטעמי אבטחה).

---

## אם משהו נכשל

- **Build Failed:** ב-Vercel לוחצים על ה-Deploy שנכשל → **"Building"** / **"Logs"** – שם יופיעו השגיאות. בדרך כלל חסר משתנה סביבה או ששגיאה בקוד.
- **האתר עולה אבל לא מתחבר ל-Supabase:** לבדוק ש-`VITE_SUPABASE_URL` ו-`VITE_SUPABASE_PUBLISHABLE_KEY` מוגדרים ב-Environment Variables ושהערכים נכונים (אותם מ-Supabase API settings).
