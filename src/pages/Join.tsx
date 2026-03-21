import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Presentation, ArrowRight, Sparkles, AlertCircle } from "lucide-react";
import { getLectureByCode, joinLecture } from "@/lib/lectureService";

const emojis = ["😊", "🎓", "🚀", "💡", "⭐", "🔥", "🎯", "💪", "🌟", "🎨", "📚", "✨"];

const Join = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState<"code" | "profile">("code");
  const [lectureCode, setLectureCode] = useState("");
  const [lectureId, setLectureId] = useState("");
  const [lectureName, setLectureName] = useState("");
  const [name, setName] = useState("");
  const [selectedEmoji, setSelectedEmoji] = useState("😊");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Check for code in URL params
  useEffect(() => {
    const codeFromUrl = searchParams.get("code");
    if (codeFromUrl && codeFromUrl.length === 6) {
      setLectureCode(codeFromUrl);
      handleCodeSubmit(codeFromUrl);
    }
  }, [searchParams]);

  const handleCodeSubmit = async (codeToCheck?: string) => {
    const code = codeToCheck || lectureCode;
    if (code.length !== 6) {
      setError("Please enter a valid 6-digit code");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const lecture = await getLectureByCode(code);
      
      if (!lecture) {
        setError("Lecture not found. Please check the code and try again.");
        return;
      }

      if (lecture.status === 'ended') {
        setError("This lecture has ended.");
        return;
      }

      setLectureId(lecture.id);
      setLectureName(lecture.title);
      setStep("profile");
    } catch (err) {
      setError("Something went wrong. Please try again.");
      console.error(err);
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
        // Navigate to student view with student ID
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
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-lg">
            <Presentation className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-display font-bold text-2xl text-foreground">Clasly</span>
        </div>

        <div className="bg-card rounded-2xl shadow-xl border border-border/50 p-8">
          {step === "code" ? (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="text-center mb-6">
                <h1 className="text-2xl font-display font-bold text-foreground mb-2">
                  Join a Lecture
                </h1>
                <p className="text-muted-foreground">
                  Enter the 6-digit code shared by your instructor
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <Input
                    value={lectureCode}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, "").slice(0, 6);
                      setLectureCode(value);
                      setError("");
                    }}
                    placeholder="000000"
                    className="text-center text-3xl font-display font-bold tracking-[0.5em] h-16"
                    maxLength={6}
                    onKeyDown={(e) => e.key === "Enter" && handleCodeSubmit()}
                  />
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-2 text-sm text-destructive mt-3"
                    >
                      <AlertCircle className="w-4 h-4" />
                      {error}
                    </motion.div>
                  )}
                </div>

                <Button
                  variant="hero"
                  size="xl"
                  className="w-full"
                  onClick={() => handleCodeSubmit()}
                  disabled={lectureCode.length !== 6 || isLoading}
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      Continue
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="text-center mb-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
                  <Presentation className="w-4 h-4" />
                  {lectureName}
                </div>
                <h1 className="text-2xl font-display font-bold text-foreground mb-2">
                  Create Your Profile
                </h1>
                <p className="text-muted-foreground">
                  Choose how you'll appear in the lecture
                </p>
              </div>

              <div className="space-y-6">
                {/* Emoji Selector */}
                <div>
                  <label className="text-sm font-medium text-foreground mb-3 block">
                    Pick an Avatar
                  </label>
                  <div className="grid grid-cols-6 gap-2">
                    {emojis.map((emoji) => (
                      <motion.button
                        key={emoji}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setSelectedEmoji(emoji)}
                        className={`text-2xl p-2 rounded-xl transition-all ${
                          selectedEmoji === emoji
                            ? "bg-primary/10 ring-2 ring-primary"
                            : "bg-muted hover:bg-muted/80"
                        }`}
                      >
                        {emoji}
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Name Input */}
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Your Name
                  </label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    className="text-base"
                    onKeyDown={(e) => e.key === "Enter" && name.trim() && handleJoin()}
                  />
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 text-sm text-destructive"
                  >
                    <AlertCircle className="w-4 h-4" />
                    {error}
                  </motion.div>
                )}

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    size="lg"
                    className="flex-1"
                    onClick={() => {
                      setStep("code");
                      setError("");
                    }}
                  >
                    Back
                  </Button>
                  <Button
                    variant="hero"
                    size="lg"
                    className="flex-1"
                    onClick={handleJoin}
                    disabled={!name.trim() || isLoading}
                  >
                    {isLoading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Join
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Are you an instructor?{" "}
          <button
            onClick={() => navigate("/dashboard")}
            className="text-primary hover:underline font-medium"
          >
            Go to Dashboard
          </button>
        </p>
      </motion.div>
    </div>
  );
};

export default Join;
