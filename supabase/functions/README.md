# Edge Functions – למה יש "אדום" בעורך?

הקבצים כאן (למשל `chat-builder/index.ts`) רצים ב-**Deno** על שרתי Supabase, לא ב-Node או בדפדפן.

## האדום בעורך (Cursor / VS Code)

- העורך מניח שזה קוד **TypeScript רגיל (Node)**.
- ב-Deno משתמשים ב:
  - ייבוא מכתובות (למשל `https://deno.land/...`)
  - אובייקט גלובלי `Deno` (למשל `Deno.env.get(...)`)

לכן העורך מסמן "שגיאות" (אדום) כמו:

- `Cannot find module 'https://...'`
- `Cannot find name 'Deno'`

**זה לא באגים בקוד.** הקוד תקין ורץ כראוי ב-Supabase אחרי `deploy:functions`.

## איך להעלים את האדום (אופציונלי)

1. **להתקין את הרחבת Deno**  
   ב-Cursor/VS Code: Extensions (Ctrl+Shift+X / Cmd+Shift+X) → לחפש **Deno** → להתקין.

2. **לאתחל הגדרות Deno**  
   Command Palette (Ctrl+Shift+P / Cmd+Shift+P) → להקליד **Deno: Initialize Workspace Configuration** → להריץ.

אחרי זה העורך יזהה את `supabase/functions` כ-Deno והאדום אמור להיעלם או להצטמצם.

## סיכום

- הקוד ב-`supabase/functions` **תקין** ל-Supabase Edge Functions.
- האדום נובע מכך שהעורך לא מוגדר ל-Deno; אחרי התקנת Deno והגדרת ה-workspace הוא אמור להבין את הקבצים.
