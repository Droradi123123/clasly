import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertCircle, Loader2 } from "lucide-react";
import { DocumentHead } from "@/components/seo/DocumentHead";
import {
  decodeJoinUrlFragment,
  extractJoinCodeFromSearchParams,
  insertLectureLead,
  joinLecture,
  lookupLectureByJoinCode,
  normalizeLectureJoinCode,
} from "@/lib/lectureService";
import { supabase } from "@/integrations/supabase/client";

const emojis = ["😊", "🎓", "🚀", "💡", "⭐", "🔥", "🎯", "💪", "🌟", "🎨", "📚", "✨"];

/** Brand mark — four-color tile (aligned with fun quiz / live session vibe) */
function JoinBrandMark({ className }: { className?: string }) {
  return (
    <div
      className={`grid h-full w-full grid-cols-2 grid-rows-2 overflow-hidden rounded-2xl shadow-lg ring-2 ring-white/15 ${className ?? ""}`}
      aria-hidden
    >
      <div className="bg-violet-500" />
      <div className="bg-teal-400" />
      <div className="bg-rose-400" />
      <div className="bg-sky-500" />
    </div>
  );
}

function getInitialJoinCodeFromUrl(): string {
  if (typeof window === "undefined") return "";
  return extractJoinCodeFromSearchParams(new URLSearchParams(window.location.search)) ?? "";
}

const Join = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialJoinCode = getInitialJoinCodeFromUrl();
  const [step, setStep] = useState<"code" | "lead" | "profile">("code");
  const [lectureCode, setLectureCode] = useState(initialJoinCode);
  const [lectureId, setLectureId] = useState("");
  const [lectureName, setLectureName] = useState("");
  const [name, setName] = useState("");
  const [selectedEmoji, setSelectedEmoji] = useState("😊");
  const [error, setError] = useState("");
  /** True while resolving a 6-digit code (QR deep link shows connecting immediately). */
  const [isLoading, setIsLoading] = useState(() => initialJoinCode.replace(/\D/g, "").length === 6);
  const [webinarLeadId, setWebinarLeadId] = useState<string | null>(null);
  const [leadEmail, setLeadEmail] = useState("");
  const [leadName, setLeadName] = useState("");
  const processedUrlCodeRef = useRef<string | null>(null);

  const normalizedJoinCode = normalizeLectureJoinCode(lectureCode);
  const showConnectingToSession =
    step === "code" && isLoading && normalizedJoinCode.length === 6;

  const handleCodeSubmit = async (codeToCheck?: string) => {
    const raw = codeToCheck || lectureCode;
    const code = normalizeLectureJoinCode(raw);
    if (!code) {
      setError("Please enter a valid 6-digit code");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const result = await lookupLectureByJoinCode(code);

      if (!result.ok) {
        if (result.reason === "network") {
          setError("Can't reach the server. Check your connection and try again.");
          return;
        }
        if (result.reason === "invalid_code") {
          setError("Please enter a valid 6-digit code");
          return;
        }
        setError("Lecture not found. Please check the code and try again.");
        return;
      }

      const lecture = result.lecture;

      if (lecture.status === "ended") {
        setError("This lecture has ended.");
        return;
      }

      setLectureId(String(lecture.id));
      setLectureName(String(lecture.title ?? ""));
      setLectureCode(code);
      const mode = lecture.lecture_mode as string | undefined;
      setWebinarLeadId(null);
      setLeadEmail("");
      setLeadName("");
      setStep(mode === "webinar" ? "lead" : "profile");
    } catch (err) {
      setError("Something went wrong. Please try again.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const fromParams = extractJoinCodeFromSearchParams(searchParams);
    const rawFragment =
      searchParams.get("code")?.trim() ||
      searchParams.get("c")?.trim() ||
      searchParams.get("join")?.trim() ||
      searchParams.get("lecture")?.trim() ||
      "";
    const displayRaw = rawFragment ? decodeJoinUrlFragment(rawFragment) : "";

    if (fromParams) {
      setLectureCode(fromParams);
      if (processedUrlCodeRef.current !== fromParams) {
        processedUrlCodeRef.current = fromParams;
        void handleCodeSubmit(fromParams);
      }
    } else {
      if (displayRaw) setLectureCode(displayRaw);
      processedUrlCodeRef.current = null;
    }
  }, [searchParams]);

  const handleLeadSubmit = async () => {
    if (!leadEmail.trim() || !leadName.trim()) {
      setError("Please enter your email and name.");
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      const result = await insertLectureLead(lectureId, leadEmail, leadName);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setWebinarLeadId(result.id);
      setName(leadName.trim());
      setStep("profile");
    } catch (e) {
      console.error(e);
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!name.trim()) return;

    setIsLoading(true);
    setError("");

    try {
      const student = await joinLecture(lectureId, name.trim(), selectedEmoji);

      if (student) {
        if (webinarLeadId) {
          await supabase.from("lecture_leads").update({ student_id: student.id }).eq("id", webinarLeadId);
          try {
            sessionStorage.setItem(`clasly_lead_${lectureId}`, webinarLeadId);
          } catch {
            /* ignore */
          }
        }
        navigate(`/student/${lectureCode}?studentId=${student.id}`);
      }
    } catch (err) {
      setError("Failed to join lecture. Please try again.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden px-4 py-10">
      <DocumentHead
        title="Join a Lecture – Clasly"
        description="Enter the code to join a live session."
        path="/join"
      />
      {/* Dark live-session canvas — visually aligned with presenter / student live UI */}
      <div
        className="pointer-events-none absolute inset-0 bg-[#0a0c18]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(124,58,237,0.35),transparent_55%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_100%_100%,rgba(20,184,166,0.12),transparent_45%)]"
        aria-hidden
      />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-[420px]"
      >
        <header className="flex items-center justify-center gap-3 mb-10">
          <JoinBrandMark className="w-12 h-12 shrink-0" />
          <span className="font-display font-bold text-2xl tracking-tight text-white">
            Clasly
          </span>
        </header>

        <div className="rounded-3xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-xl shadow-2xl shadow-black/40 px-6 py-8 sm:px-8 sm:py-10">
          <AnimatePresence mode="wait">
            {step === "code" || step === "lead" ? (
              step === "code" ? (
              showConnectingToSession ? (
              <motion.div
                key="connecting"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                className="flex flex-col items-center justify-center py-10 px-2 text-center"
                role="status"
                aria-live="polite"
              >
                <Loader2 className="w-12 h-12 text-violet-400 animate-spin mb-6" aria-hidden />
                <h1 className="text-xl sm:text-2xl font-display font-bold text-white mb-2 tracking-tight">
                  Connecting…
                </h1>
                <p className="text-sm text-violet-200/75 max-w-xs leading-relaxed">
                  Looking up your session. This should only take a moment.
                </p>
              </motion.div>
              ) : (
              <motion.div
                key="code"
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 16 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="text-center mb-8">
                  <h1 className="text-2xl sm:text-3xl font-display font-bold text-white mb-2 tracking-tight">
                    Enter the code
                  </h1>
                  <p className="text-sm sm:text-base text-violet-200/70 leading-relaxed">
                    Use the 6-digit code your instructor shows on screen
                  </p>
                </div>

                <div className="space-y-5">
                  <Input
                    value={lectureCode}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, "").slice(0, 6);
                      setLectureCode(value);
                      setError("");
                    }}
                    placeholder="• • • • • •"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    className="h-16 rounded-2xl border-white/10 bg-[#12152a] text-center text-3xl font-display font-bold tracking-[0.35em] text-white placeholder:text-white/25 placeholder:tracking-normal focus-visible:ring-violet-500/50 focus-visible:border-violet-500/40"
                    maxLength={6}
                    onKeyDown={(e) => e.key === "Enter" && handleCodeSubmit()}
                  />
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center justify-center gap-2 text-sm text-rose-300"
                    >
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      {error}
                    </motion.div>
                  )}

                  <Button
                    type="button"
                    size="xl"
                    disabled={lectureCode.length !== 6 || isLoading}
                    onClick={() => handleCodeSubmit()}
                    className="w-full h-14 rounded-2xl text-lg font-bold bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-900/40 border-0 transition-transform duration-200 hover:scale-[1.01] active:scale-[0.99]"
                  >
                    {isLoading ? (
                      <span className="inline-block w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      "Continue"
                    )}
                  </Button>
                </div>
              </motion.div>
              )
              ) : (
              <motion.div
                key="lead"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              >
                {lectureName ? (
                  <p className="text-center text-xs font-medium uppercase tracking-wider text-teal-300/90 mb-4 truncate px-1">
                    {lectureName}
                  </p>
                ) : null}
                <div className="text-center mb-8">
                  <h1 className="text-2xl sm:text-3xl font-display font-bold text-white mb-2 tracking-tight">
                    Webinar registration
                  </h1>
                  <p className="text-sm sm:text-base text-violet-200/75">
                    Enter your email and name to continue
                  </p>
                </div>
                <div className="space-y-4">
                  <Input
                    type="email"
                    value={leadEmail}
                    onChange={(e) => setLeadEmail(e.target.value)}
                    placeholder="Email"
                    className="h-12 rounded-2xl border-white/10 bg-[#12152a] text-white placeholder:text-white/35"
                  />
                  <Input
                    value={leadName}
                    onChange={(e) => setLeadName(e.target.value)}
                    placeholder="Full name"
                    className="h-12 rounded-2xl border-white/10 bg-[#12152a] text-white placeholder:text-white/35"
                    onKeyDown={(e) => e.key === "Enter" && handleLeadSubmit()}
                  />
                  {error && (
                    <div className="flex items-center justify-center gap-2 text-sm text-rose-300">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      {error}
                    </div>
                  )}
                  <Button
                    type="button"
                    size="xl"
                    disabled={isLoading}
                    onClick={() => void handleLeadSubmit()}
                    className="w-full h-14 rounded-2xl text-lg font-bold bg-violet-600 hover:bg-violet-500 text-white"
                  >
                    {isLoading ? (
                      <span className="inline-block w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      "Continue"
                    )}
                  </Button>
                  <button
                    type="button"
                    onClick={() => {
                      setStep("code");
                      setError("");
                    }}
                    className="w-full text-center text-sm text-violet-300/70 hover:text-violet-200/90 py-2"
                  >
                    Change code
                  </button>
                </div>
              </motion.div>
              )
            ) : (
              <motion.div
                key="profile"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              >
                {lectureName ? (
                  <p className="text-center text-xs font-medium uppercase tracking-wider text-teal-300/90 mb-4 truncate px-1">
                    {lectureName}
                  </p>
                ) : null}

                <div className="text-center mb-8">
                  <h1 className="text-2xl sm:text-3xl font-display font-bold text-white mb-2 tracking-tight">
                    What&apos;s your name?
                  </h1>
                  <p className="text-sm sm:text-base text-violet-200/75">
                    This is how other players will see you
                  </p>
                </div>

                <div className="space-y-6">
                  <div>
                    <p className="text-xs font-medium text-violet-300/80 mb-3 text-center">Pick an avatar</p>
                    <div className="flex flex-wrap justify-center gap-2">
                      {emojis.map((emoji) => (
                        <motion.button
                          key={emoji}
                          type="button"
                          whileHover={{ scale: 1.08 }}
                          whileTap={{ scale: 0.94 }}
                          onClick={() => setSelectedEmoji(emoji)}
                          className={`text-2xl w-11 h-11 rounded-xl transition-colors duration-150 ${
                            selectedEmoji === emoji
                              ? "bg-violet-600/40 ring-2 ring-violet-400 shadow-lg"
                              : "bg-[#12152a] hover:bg-white/10"
                          }`}
                        >
                          {emoji}
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your name"
                      autoFocus
                      className="h-14 rounded-2xl border-white/10 bg-[#12152a] text-center text-lg font-medium text-white placeholder:text-white/35 focus-visible:ring-violet-500/50 focus-visible:border-violet-500/40"
                      onKeyDown={(e) => e.key === "Enter" && name.trim() && handleJoin()}
                    />
                  </div>

                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center justify-center gap-2 text-sm text-rose-300"
                    >
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      {error}
                    </motion.div>
                  )}

                  <Button
                    type="button"
                    size="xl"
                    disabled={!name.trim() || isLoading}
                    onClick={handleJoin}
                    className="w-full h-14 rounded-2xl text-lg font-bold bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-900/40 border-0 transition-transform duration-200 hover:scale-[1.01] active:scale-[0.99]"
                  >
                    {isLoading ? (
                      <span className="inline-block w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      "Join!"
                    )}
                  </Button>

                  <button
                    type="button"
                    onClick={() => {
                      setStep("code");
                      setError("");
                      setName("");
                    }}
                    className="w-full text-center text-sm text-violet-300/70 hover:text-violet-200/90 py-2 transition-colors"
                  >
                    Change code
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <p className="text-center text-sm text-violet-300/50 mt-8">
          Instructor?{" "}
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="text-violet-300 hover:text-white font-medium underline-offset-4 hover:underline transition-colors"
          >
            Dashboard
          </button>
        </p>
      </motion.div>
    </div>
  );
};

export default Join;
