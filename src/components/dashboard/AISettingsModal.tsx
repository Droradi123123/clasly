import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Sparkles, Lock } from "lucide-react";
import { useSubscriptionContext } from "@/contexts/SubscriptionContext";
import { Link } from "react-router-dom";

const TEACHING_STYLES = [
  { value: "practical", label: "Practical – lots of examples and hands-on" },
  { value: "theoretical", label: "Theoretical – concepts and frameworks first" },
  { value: "storytelling", label: "Storytelling – narratives and case studies" },
  { value: "interactive", label: "Interactive – polls, quizzes, discussions" },
  { value: "concise", label: "Concise – short and to the point" },
  { value: "detailed", label: "Detailed – deep dives and thorough coverage" },
];

interface AISettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
}

export function AISettingsModal({ open, onOpenChange, userId }: AISettingsModalProps) {
  const { isFree } = useSubscriptionContext();
  const [whoAmI, setWhoAmI] = useState("");
  const [whatILecture, setWhatILecture] = useState("");
  const [teachingStyle, setTeachingStyle] = useState("");
  const [additionalContext, setAdditionalContext] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open || !userId) return;
    const load = async () => {
      setIsLoading(true);
      try {
        const { data } = await supabase
          .from("user_ai_settings")
          .select("who_am_i, what_i_lecture, teaching_style, additional_context")
          .eq("user_id", userId)
          .maybeSingle();
        if (data) {
          setWhoAmI(data.who_am_i || "");
          setWhatILecture(data.what_i_lecture || "");
          setTeachingStyle(data.teaching_style || "");
          setAdditionalContext(data.additional_context || "");
        } else {
          setWhoAmI("");
          setWhatILecture("");
          setTeachingStyle("");
          setAdditionalContext("");
        }
      } catch (e) {
        console.error("Failed to load AI settings:", e);
        toast.error("Failed to load settings");
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [open, userId]);

  const handleSave = async () => {
    if (isFree) return;
    setIsSaving(true);
    try {
      const { error } = await supabase.from("user_ai_settings").upsert(
        {
          user_id: userId,
          who_am_i: whoAmI.trim() || null,
          what_i_lecture: whatILecture.trim() || null,
          teaching_style: teachingStyle || null,
          additional_context: additionalContext.trim() || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );
      if (error) throw error;
      toast.success("AI settings saved!");
      onOpenChange(false);
    } catch (e) {
      console.error("Failed to save AI settings:", e);
      toast.error("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <Sparkles className="w-5 h-5 text-primary" />
            AI Profile
          </DialogTitle>
        </DialogHeader>

        {isFree ? (
          <div className="py-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto">
              <Lock className="w-8 h-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-1">
                Personalize your AI
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Tell the AI who you are and what you teach. It will create
                presentations that match your style and expertise.
              </p>
              <Button asChild variant="hero">
                <Link to="/pricing">Upgrade to unlock</Link>
              </Button>
            </div>
          </div>
        ) : isLoading ? (
          <div className="py-12 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="who-am-i">Who are you? (as an instructor)</Label>
              <Textarea
                id="who-am-i"
                placeholder="e.g., Computer science lecturer at the University of Haifa"
                value={whoAmI}
                onChange={(e) => setWhoAmI(e.target.value)}
                rows={2}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="what-i-lecture">What do you usually lecture about?</Label>
              <Textarea
                id="what-i-lecture"
                placeholder="e.g., Algorithms, data structures, artificial intelligence"
                value={whatILecture}
                onChange={(e) => setWhatILecture(e.target.value)}
                rows={2}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Teaching style</Label>
              <Select value={teachingStyle} onValueChange={setTeachingStyle}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Choose your style" />
                </SelectTrigger>
                <SelectContent>
                  {TEACHING_STYLES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="additional">Anything else to help the AI?</Label>
              <Textarea
                id="additional"
                placeholder="Optional: preferences, topics to avoid, etc."
                value={additionalContext}
                onChange={(e) => setAdditionalContext(e.target.value)}
                rows={2}
                className="mt-1.5"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                variant="hero"
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Save"
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
