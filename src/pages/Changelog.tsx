import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, CheckCircle2, Layout, Palette, Type } from "lucide-react";

const CHANGES = [
  {
    date: "2025-03-07",
    title: "תיקון WYSIWYG – שקופיות AI",
    description: "תיקון התאמה מלאה בין מצב עריכה למצב הצגה עבור שקופיות שנוצרו ב-AI",
    items: [
      {
        icon: Layout,
        title: "התאמת Theme ו-Design לכל שקופית",
        detail: "Editor ו-Present משתמשים כעת באותה לוגיקה: themeId ו-designStyleId נלקחים קודם מה-design של השקופית עצמה, ואז מהגדרות ההרצאה.",
      },
      {
        icon: Palette,
        title: "נרמול designStyleId",
        detail: "ערכי AI כמו 'elegant', 'bold', 'cinematic' מנורמלים אוטומטית ל-'dynamic' או 'minimal' כדי להתאים ל-Frontend.",
      },
      {
        icon: Type,
        title: "צבע טקסט לפי Theme",
        detail: "ב-themes בהירים (כמו soft-pop) הטקסט משתמש בצבע כהה (#1f2937) כדי לשמור על קריאות. ב-quiz, שאלה עם רקע בהיר תציג טקסט קריא.",
      },
      {
        icon: CheckCircle2,
        title: "ensureSlidesDesignDefaults ב-Present",
        detail: "בטעינת הרצאה מה-DB, השקופיות עוברות נרמול כדי להבטיח ערכים תקינים.",
      },
    ],
  },
];

const Changelog = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="mb-6 -ml-2"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          חזרה
        </Button>

        <h1 className="text-3xl font-bold mb-2">שינויים ועדכונים</h1>
        <p className="text-muted-foreground mb-8">
          תיעוד השינויים האחרונים במערכת
        </p>

        <div className="space-y-6">
          {CHANGES.map((change) => (
            <Card key={change.date}>
              <CardHeader>
                <CardTitle className="text-lg">{change.title}</CardTitle>
                <p className="text-sm text-muted-foreground">{change.date}</p>
                <p className="text-sm">{change.description}</p>
              </CardHeader>
              <CardContent className="space-y-4">
                {change.items.map((item) => (
                  <div
                    key={item.title}
                    className="flex gap-3 p-3 rounded-lg bg-muted/50"
                  >
                    <item.icon className="w-5 h-5 shrink-0 mt-0.5 text-primary" />
                    <div>
                      <p className="font-medium text-sm">{item.title}</p>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {item.detail}
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Changelog;
