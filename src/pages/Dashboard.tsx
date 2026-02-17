import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import Header from "@/components/layout/Header";
import {
  Plus,
  Play,
  Edit3,
  Clock,
  Search,
  Sparkles,
  Presentation,
  TrendingUp,
  Loader2,
  Trash2,
  FileText,
  Wand2,
  ArrowLeft,
  BarChart3,
  Copy,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { createLecture, duplicateLecture } from "@/lib/lectureService";
import { toast } from "sonner";
import { Slide, createNewSlide } from "@/types/slides";

interface Lecture {
  id: string;
  title: string;
  status: string;
  lecture_code: string;
  slides: Slide[];
  created_at: string;
  updated_at: string;
}

type CreateMode = 'choose' | 'regular' | 'ai';

const TARGET_AUDIENCES = [
  { value: "middle_school", label: "Middle School" },
  { value: "high_school", label: "High School" },
  { value: "university", label: "University" },
  { value: "professionals", label: "Professionals" },
  { value: "general", label: "General" },
];


const Dashboard = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [newLectureTitle, setNewLectureTitle] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  
  // AI generation state
  const [createMode, setCreateMode] = useState<CreateMode>('choose');
  const [aiDescription, setAiDescription] = useState("");
  const [targetAudience, setTargetAudience] = useState("general");

  // No auth redirect - dashboard is open to all users

  // Load lectures immediately when user is available (only current user's lectures)
  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      setLectures([]);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    const loadLectures = async () => {
      try {
        const { data, error } = await supabase
          .from('lectures')
          .select('id, title, status, lecture_code, slides, created_at, updated_at, user_id')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false });

        if (cancelled) return;
        if (error) throw error;
        setLectures((data as unknown as Lecture[]) || []);
      } catch (error) {
        if (!cancelled) {
          console.error('Error loading lectures:', error);
          toast.error('Failed to load lectures');
          setLectures([]);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    loadLectures();

    // Check for AI prompt from home page (once per mount)
    const aiPrompt = localStorage.getItem("clasly_ai_prompt");
    if (aiPrompt) {
      localStorage.removeItem("clasly_ai_prompt");
      setNewLectureTitle(aiPrompt);
      setIsCreateOpen(true);
    }

    return () => { cancelled = true; };
  }, [user?.id]);

  const resetCreateDialog = () => {
    setCreateMode('choose');
    setNewLectureTitle("");
    setAiDescription("");
    setTargetAudience("general");
  };

  const handleDialogOpenChange = (open: boolean) => {
    setIsCreateOpen(open);
    if (!open) {
      resetCreateDialog();
    }
  };

  const handleCreateLecture = async () => {
    if (!newLectureTitle.trim()) return;

    setIsCreating(true);
    try {
      const newLecture = await createLecture(newLectureTitle, [createNewSlide('title', 0)]);
      setLectures([newLecture as unknown as Lecture, ...lectures]);
      resetCreateDialog();
      setIsCreateOpen(false);
      navigate(`/editor/${newLecture.id}`);
    } catch (error) {
      console.error('Error creating lecture:', error);
      toast.error('Failed to create lecture');
    } finally {
      setIsCreating(false);
    }
  };

  const handleGenerateWithAI = () => {
    if (!aiDescription.trim()) {
      toast.error("Please describe your presentation topic");
      return;
    }

    // Navigate to the conversational builder with the prompt
    const params = new URLSearchParams({
      prompt: aiDescription,
      audience: targetAudience,
    });
    
    resetCreateDialog();
    setIsCreateOpen(false);
    navigate(`/builder?${params.toString()}`);
  };

  const handleDuplicateLecture = async (lectureId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (duplicatingId) return;
    setDuplicatingId(lectureId);
    try {
      const newLecture = await duplicateLecture(lectureId);
      setLectures((prev) => [newLecture as unknown as Lecture, ...prev]);
      toast.success("Lecture duplicated. Only content was copied; analytics are not included.");
      navigate(`/editor/${newLecture.id}`);
    } catch (error) {
      console.error("Duplicate failed:", error);
      toast.error("Failed to duplicate lecture");
    } finally {
      setDuplicatingId(null);
    }
  };

  const handleDeleteLecture = async (lectureId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!confirm('Are you sure you want to delete this lecture?')) return;

    try {
      const { error } = await supabase
        .from('lectures')
        .delete()
        .eq('id', lectureId)
        .eq('user_id', user!.id);

      if (error) throw error;
      
      setLectures(lectures.filter(l => l.id !== lectureId));
      toast.success('Lecture deleted');
    } catch (error) {
      console.error('Error deleting lecture:', error);
      toast.error('Failed to delete lecture');
    }
  };

  const filteredLectures = useMemo(() => 
    lectures.filter((lecture) =>
      lecture.title.toLowerCase().includes(searchQuery.toLowerCase())
    ),
    [lectures, searchQuery]
  );

  const stats = useMemo(() => ({
    totalLectures: lectures.length,
    activeLectures: lectures.filter(l => l.status === 'active').length,
    draftLectures: lectures.filter(l => l.status === 'draft').length,
  }), [lectures]);

  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case "active":
        return "bg-emerald-500/10 text-emerald-600";
      case "draft":
        return "bg-muted text-muted-foreground";
      case "ended":
        return "bg-primary/10 text-primary";
      default:
        return "bg-muted text-muted-foreground";
    }
  }, []);

  const formatDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }, []);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pt-24 pb-12 px-4">
        <div className="container mx-auto max-w-6xl">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-display font-bold text-foreground mb-2">
                My Lectures
              </h1>
              <p className="text-muted-foreground">
                Create, manage, and present your interactive lectures
              </p>
            </div>

            <Dialog open={isCreateOpen} onOpenChange={handleDialogOpenChange}>
              <DialogTrigger asChild>
                <Button variant="hero" size="lg">
                  <Plus className="w-5 h-5" />
                  New Lecture
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                {/* Choose Mode */}
                {createMode === 'choose' && (
                  <div className="animate-in fade-in duration-150">
                    <DialogHeader>
                      <DialogTitle className="font-display">Create New Lecture</DialogTitle>
                    </DialogHeader>
                    <div className="grid grid-cols-2 gap-4 mt-6">
                      <button
                        onClick={() => setCreateMode('regular')}
                        className="p-6 rounded-xl border-2 border-border hover:border-primary/50 bg-card hover:bg-primary/5 transition-all text-left active:scale-[0.98]"
                      >
                        <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center mb-4">
                          <FileText className="w-6 h-6 text-foreground" />
                        </div>
                        <h3 className="font-semibold text-foreground mb-1">Start from Scratch</h3>
                        <p className="text-sm text-muted-foreground">Create slides manually with full control</p>
                      </button>

                      <button
                        onClick={() => setCreateMode('ai')}
                        className="p-6 rounded-xl border-2 border-primary/30 hover:border-primary bg-gradient-to-br from-primary/10 to-primary/5 hover:from-primary/20 hover:to-primary/10 transition-all text-left active:scale-[0.98]"
                      >
                        <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center mb-4">
                          <Wand2 className="w-6 h-6 text-primary" />
                        </div>
                        <h3 className="font-semibold text-foreground mb-1">Generate with AI</h3>
                        <p className="text-sm text-muted-foreground">Let AI create slides from your topic</p>
                      </button>
                    </div>
                  </div>
                )}

                {/* Regular Mode */}
                {createMode === 'regular' && (
                  <div className="animate-in fade-in slide-in-from-right-2 duration-150">
                    <DialogHeader>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={() => setCreateMode('choose')} className="h-8 w-8">
                          <ArrowLeft className="w-4 h-4" />
                        </Button>
                        <DialogTitle className="font-display">New Lecture</DialogTitle>
                      </div>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                      <div>
                        <Label className="text-sm font-medium mb-2 block">
                          Lecture Title
                        </Label>
                        <Input
                          value={newLectureTitle}
                          onChange={(e) => setNewLectureTitle(e.target.value)}
                          placeholder="e.g., Introduction to Psychology"
                          onKeyDown={(e) => e.key === "Enter" && handleCreateLecture()}
                          autoFocus
                        />
                      </div>
                      <div className="flex gap-3">
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => setCreateMode('choose')}
                        >
                          Back
                        </Button>
                        <Button 
                          variant="hero" 
                          className="flex-1" 
                          onClick={handleCreateLecture}
                          disabled={isCreating || !newLectureTitle.trim()}
                        >
                          {isCreating ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Plus className="w-4 h-4" />
                          )}
                          Create
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* AI Mode */}
                {createMode === 'ai' && (
                  <div className="animate-in fade-in slide-in-from-right-2 duration-150">
                    <DialogHeader>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={() => setCreateMode('choose')} className="h-8 w-8">
                          <ArrowLeft className="w-4 h-4" />
                        </Button>
                        <DialogTitle className="font-display flex items-center gap-2">
                          <Wand2 className="w-5 h-5 text-primary" />
                          Generate with AI
                        </DialogTitle>
                      </div>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                      <div>
                        <Label className="text-sm font-medium mb-2 block">
                          Describe Your Topic
                        </Label>
                        <Textarea
                          value={aiDescription}
                          onChange={(e) => setAiDescription(e.target.value)}
                          placeholder="e.g., A lecture about photosynthesis for high school biology students, including a quiz about the light and dark reactions"
                          rows={3}
                          autoFocus
                        />
                      </div>
                      <div>
                        <Label className="text-sm font-medium mb-2 block">
                          Target Audience
                        </Label>
                        <Select value={targetAudience} onValueChange={setTargetAudience}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TARGET_AUDIENCES.map((audience) => (
                              <SelectItem key={audience.value} value={audience.value}>
                                {audience.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex gap-3">
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => setCreateMode('choose')}
                        >
                          Back
                        </Button>
                        <Button 
                          variant="hero" 
                          className="flex-1" 
                          onClick={handleGenerateWithAI}
                          disabled={!aiDescription.trim()}
                        >
                          <Sparkles className="w-4 h-4" />
                          Generate
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Card className="bg-gradient-card border-border/50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Lectures</p>
                    <p className="text-3xl font-display font-bold text-foreground">
                      {stats.totalLectures}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Presentation className="w-6 h-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-card border-border/50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Active Now</p>
                    <p className="text-3xl font-display font-bold text-foreground">
                      {stats.activeLectures}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-emerald-500" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-card border-border/50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Drafts</p>
                    <p className="text-3xl font-display font-bold text-foreground">
                      {stats.draftLectures}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                    <Edit3 className="w-6 h-6 text-muted-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search */}
          <div className="mb-6">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search lectures..."
                className="pl-10"
              />
            </div>
          </div>

          {/* Lectures Grid */}
          {user && isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">Loading your lectures...</p>
            </div>
          ) : !user ? (
            <div className="text-center py-12 rounded-xl border border-dashed border-border bg-muted/30">
              <Presentation className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">Sign in to see your lectures</h3>
              <p className="text-muted-foreground mb-4">Your presentations will appear here once you sign in.</p>
              <Button variant="hero" onClick={() => navigate("/")}>
                Get Started
              </Button>
            </div>
          ) : (
          <div className="grid gap-4">
            {filteredLectures.map((lecture) => (
              <Card 
                key={lecture.id} 
                className="bg-card hover:shadow-lg transition-shadow duration-200 border-border/50 hover:border-primary/30"
              >
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-display font-semibold text-foreground">
                          {lecture.title}
                        </h3>
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusColor(
                            lecture.status
                          )}`}
                        >
                          {lecture.status}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {formatDate(lecture.updated_at)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Presentation className="w-4 h-4" />
                          {(lecture.slides as unknown as Slide[])?.length || 0} slides
                        </span>
                        <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">
                          {lecture.lecture_code}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={(e) => handleDeleteLecture(lecture.id, e)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      {lecture.status === "ended" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/lecture/${lecture.id}/analytics`)}
                        >
                          <BarChart3 className="w-4 h-4" />
                          Analytics
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => handleDuplicateLecture(lecture.id, e)}
                        disabled={duplicatingId === lecture.id}
                        title="Duplicate lecture (content only; analytics are not copied)"
                      >
                        {duplicatingId === lecture.id ? (
                          <span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin block" />
                        ) : (
                          <>
                            <Copy className="w-4 h-4 sm:mr-1" />
                            <span className="hidden sm:inline">Duplicate</span>
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/editor/${lecture.id}`)}
                      >
                        <Edit3 className="w-4 h-4" />
                        Edit
                      </Button>
                      <Button
                        variant="hero"
                        size="sm"
                        onClick={() => navigate(`/present/${lecture.id}`)}
                      >
                        <Play className="w-4 h-4" />
                        Present
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {filteredLectures.length === 0 && (
              <div className="text-center py-12">
                <Presentation className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No lectures found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery ? "Try a different search term" : "Create your first lecture to get started"}
                </p>
                <Button variant="hero" onClick={() => setIsCreateOpen(true)}>
                  <Plus className="w-4 h-4" />
                  Create Lecture
                </Button>
              </div>
            )}
          </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
