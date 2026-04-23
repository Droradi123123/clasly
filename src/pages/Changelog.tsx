import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, CheckCircle2, Layout, Palette, Type } from "lucide-react";

const CHANGES = [
  {
    date: "2025-03-07",
    title: "WYSIWYG Fix – AI Slides",
    description:
      "Improved consistency between Edit mode and Present mode for AI-generated slides.",
    items: [
      {
        icon: Layout,
        title: "Theme + design style are applied consistently",
        detail:
          "Editor and Present now follow the same priority: slide design first, then lecture settings.",
      },
      {
        icon: Palette,
        title: "Design style normalization",
        detail:
          "AI style values are normalized to supported frontend styles for consistent rendering.",
      },
      {
        icon: Type,
        title: "Text contrast improvements",
        detail:
          "Light themes now use higher-contrast text colors to keep slides readable.",
      },
      {
        icon: CheckCircle2,
        title: "Design defaults applied on load",
        detail:
          "When a lecture is loaded from the database, slides are normalized to ensure valid design values.",
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
          Back
        </Button>

        <h1 className="text-3xl font-bold mb-2">Changelog</h1>
        <p className="text-muted-foreground mb-8">
          A log of recent improvements and fixes.
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
