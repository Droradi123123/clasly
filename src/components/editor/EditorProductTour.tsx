import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Joyride, {
  type CallBackProps,
  EVENTS,
  type Step,
  STATUS,
} from "react-joyride";
import { Sparkles, LayoutGrid, Plus, Palette, Play, Video, Settings2 } from "lucide-react";

/** Completed main editor walkthrough */
export const EDITOR_TOUR_STORAGE_MAIN = "clasly_editor_tour_main_v1";
/** Webinar branding / registration tour */
export const EDITOR_TOUR_STORAGE_WEBINAR = "clasly_editor_tour_settings_webinar_v1";
/** Presentation logo / accent tour */
export const EDITOR_TOUR_STORAGE_EDUCATION = "clasly_editor_tour_settings_education_v1";

type LectureMode = "education" | "webinar";

function TourBody({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="text-right space-y-2" dir="rtl">
      <div className="flex items-start gap-3 flex-row-reverse">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/25">
          <Icon className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1 pt-0.5">
          <h3 className="text-base font-bold text-foreground leading-snug">{title}</h3>
          <div className="mt-2 text-sm text-muted-foreground leading-relaxed">{children}</div>
        </div>
      </div>
    </div>
  );
}

function buildMainSteps(): Step[] {
  return [
    {
      target: '[data-tour="editor-tab-ai"]',
      placement: "right",
      disableBeacon: true,
      content: (
        <TourBody icon={Sparkles} title="העוזר החכם (AI)">
          כאן נפתח צ’אט עם AI — אפשר לבקש תיקונים, ניסוח מחדש, רעיונות לשקופית, ותמונות (לפי סוג
          השקופית). מומלץ להתחיל מכאן כשהמצגת כבר קיימת.
        </TourBody>
      ),
    },
    {
      target: '[data-tour="editor-tab-slides"]',
      placement: "right",
      disableBeacon: true,
      content: (
        <TourBody icon={LayoutGrid} title="רשימת השקופיות">
          בטאב Slides רואים את כל השקופיות בסדר. אפשר לגרור לסידור מחדש ולבחור שקופית לעריכה במרכז
          המסך.
        </TourBody>
      ),
    },
    {
      target: '[data-tour="editor-add-slide"]',
      placement: "right",
      disableBeacon: true,
      content: (
        <TourBody icon={Plus} title="הוספת שקופית ידנית">
          Add slide פותח בוחר סוג שקופית — טקסט, תמונה, שאלות קהל ועוד. שימושי כשצריך שקופית אחת
          ספציפית בלי לבקש מ-AI את כל המצגת מחדש.
        </TourBody>
      ),
    },
    {
      target: '[data-tour="editor-toolbar-bg"]',
      placement: "bottom",
      disableBeacon: true,
      content: (
        <TourBody icon={Palette} title="סרגל עיצוב לשקופית">
          כאן משנים רקע, ערכת נושא, טקסט ועוד — ההתאמות חלות על השקופית הנבחרת (ולפעמים על כל
          המצגת, לפי מה שבוחרים בתפריטים).
        </TourBody>
      ),
    },
    {
      target: '[data-tour="editor-present"]',
      placement: "bottom",
      disableBeacon: true,
      content: (
        <TourBody icon={Play} title="שידור והצגה">
          Present עובר למצב הצגה מלאה — שיתוף QR לקהל, תשובות בזמן אמת בשאלות, וכל מה שצריך בשיעור
          או באירוע חי.
        </TourBody>
      ),
    },
  ];
}

function buildSettingsStepWebinar(): Step[] {
  return [
    {
      target: '[data-tour="editor-webinar-settings"]',
      placement: "bottom",
      disableBeacon: true,
      content: (
        <TourBody icon={Video} title="הגדרות וובינר">
          כאן מגדירים מיתוג (לוגו), טופס הרשמה, וכפתור CTA לשידור — כדי שהמותג וההמרות יופיעו
          נכון גם בזמן השידור וגם אצל המשתתפים.
        </TourBody>
      ),
    },
  ];
}

function buildSettingsStepEducation(): Step[] {
  return [
    {
      target: '[data-tour="editor-presentation-settings"]',
      placement: "bottom",
      disableBeacon: true,
      content: (
        <TourBody icon={Settings2} title="הגדרות מצגת">
          כאן מעלים לוגו ומגדירים צבע הדגשה למצגת — כך המיתוג שלכם נשאר עקבי בכל השקופיות ובמסך
          ההצגה.
        </TourBody>
      ),
    },
  ];
}

export type EditorProductTourProps = {
  lectureMode: LectureMode;
  /** Editor finished loading and has at least one slide */
  isReady: boolean;
  /** While true, skip / delay starting tours */
  slidesGenerationLocked: boolean;
  setIsAIPanelOpen: (open: boolean) => void;
  /** Increment from parent to replay main tour (e.g. help button) */
  replayMainSignal?: number;
};

/**
 * Editor-only guided tours: main walkthrough + one-time settings spotlight (webinar vs education).
 * Starts automatically after slide generation finishes, unless already completed in localStorage.
 */
export function EditorProductTour({
  lectureMode,
  isReady,
  slidesGenerationLocked,
  setIsAIPanelOpen,
  replayMainSignal = 0,
}: EditorProductTourProps) {
  const [runMain, setRunMain] = useState(false);
  const [runSettings, setRunSettings] = useState(false);
  const autoStartedRef = useRef(false);
  const prevReplayRef = useRef(replayMainSignal);
  const panelForStepRef = useRef<"ai" | "slides">("slides");

  const mainSteps = useMemo(() => buildMainSteps(), []);
  const settingsSteps = useMemo(
    () =>
      lectureMode === "webinar" ? buildSettingsStepWebinar() : buildSettingsStepEducation(),
    [lectureMode]
  );

  const settingsStorageKey =
    lectureMode === "webinar" ? EDITOR_TOUR_STORAGE_WEBINAR : EDITOR_TOUR_STORAGE_EDUCATION;

  /** Auto-start main tour once when editor is interactive */
  useEffect(() => {
    if (!isReady || slidesGenerationLocked) return;
    if (autoStartedRef.current) return;
    if (localStorage.getItem(EDITOR_TOUR_STORAGE_MAIN)) return;
    autoStartedRef.current = true;
    const t = window.setTimeout(() => setRunMain(true), 700);
    return () => window.clearTimeout(t);
  }, [isReady, slidesGenerationLocked]);

  /** Replay main tour from header button */
  useEffect(() => {
    if (replayMainSignal === prevReplayRef.current) return;
    prevReplayRef.current = replayMainSignal;
    if (replayMainSignal <= 0) return;
    if (!isReady || slidesGenerationLocked) return;
    setRunSettings(false);
    setRunMain(true);
  }, [replayMainSignal, isReady, slidesGenerationLocked]);

  const syncPanelForMainStep = useCallback(
    (index: number) => {
      if (index <= 0) {
        panelForStepRef.current = "ai";
        setIsAIPanelOpen(true);
        return;
      }
      panelForStepRef.current = "slides";
      setIsAIPanelOpen(false);
    },
    [setIsAIPanelOpen]
  );

  const handleMainCallback = useCallback(
    (data: CallBackProps) => {
      const { type, index, status } = data;

      if (type === EVENTS.TOUR_START) {
        syncPanelForMainStep(0);
      }

      if (type === EVENTS.STEP_BEFORE && typeof index === "number") {
        syncPanelForMainStep(index);
      }

      if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
        setRunMain(false);
        localStorage.setItem(EDITOR_TOUR_STORAGE_MAIN, "1");
        setIsAIPanelOpen(false);
        panelForStepRef.current = "slides";
        if (!localStorage.getItem(settingsStorageKey)) {
          window.setTimeout(() => setRunSettings(true), 900);
        }
      }

      if (type === EVENTS.TARGET_NOT_FOUND) {
        console.warn("[EditorProductTour] Target missing — skip or check DOM.");
      }
    },
    [setIsAIPanelOpen, settingsStorageKey, syncPanelForMainStep]
  );

  const handleSettingsCallback = useCallback(
    (data: CallBackProps) => {
      const { status, type } = data;
      if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
        setRunSettings(false);
        localStorage.setItem(settingsStorageKey, "1");
      }
      if (type === EVENTS.TARGET_NOT_FOUND) {
        setRunSettings(false);
      }
    },
    [settingsStorageKey]
  );

  const joyrideStyles = {
    options: {
      zIndex: 10050,
      width: 380,
      arrowColor: "hsl(var(--card))",
    } as const,
    overlay: {
      mixBlendMode: "normal" as const,
    },
    tooltip: {
      borderRadius: 14,
      padding: 18,
      boxShadow: "0 25px 50px -12px rgb(0 0 0 / 0.35)",
    },
    tooltipContainer: {
      textAlign: "right" as const,
    },
    buttonNext: {
      borderRadius: 10,
      padding: "8px 16px",
      fontWeight: 600,
    },
    buttonBack: {
      borderRadius: 10,
      padding: "8px 14px",
      color: "hsl(var(--muted-foreground))",
    },
    buttonSkip: {
      color: "hsl(var(--muted-foreground))",
      fontSize: 13,
    },
  };

  const locale = {
    back: "חזרה",
    close: "סגור",
    last: "סיום",
    next: "הבא",
    skip: "דלג",
  };

  const canRun = isReady && !slidesGenerationLocked;

  return (
    <>
      <Joyride
        steps={mainSteps}
        run={runMain && canRun}
        continuous
        showProgress
        showSkipButton
        scrollToFirstStep
        disableScrollParentFix
        spotlightClicks={false}
        spotlightPadding={10}
        callback={handleMainCallback}
        styles={joyrideStyles}
        locale={locale}
        floaterProps={{
          disableAnimation: false,
          styles: {
            floater: { filter: "drop-shadow(0 12px 24px rgba(0,0,0,0.2))" },
          },
        }}
      />
      <Joyride
        steps={settingsSteps}
        run={runSettings && canRun && !runMain}
        continuous
        showProgress={false}
        showSkipButton
        scrollToFirstStep
        disableScrollParentFix
        spotlightClicks={false}
        spotlightPadding={10}
        callback={handleSettingsCallback}
        styles={joyrideStyles}
        locale={locale}
      />
    </>
  );
}
