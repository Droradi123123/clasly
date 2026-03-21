import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, MessageSquare, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import Header from "@/components/layout/Header";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { getAllBuilderConversations, BuilderConversation } from "@/lib/builderConversations";
import { formatDistanceToNow } from "date-fns";

const AdminConversations = () => {
  const navigate = useNavigate();
  const isAdmin = useIsAdmin();
  const [conversations, setConversations] = useState<BuilderConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<BuilderConversation | null>(null);

  useEffect(() => {
    getAllBuilderConversations(200).then((data) => {
      setConversations(data);
      setLoading(false);
    });
  }, []);

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-24 px-4 text-center">
          <p className="text-muted-foreground">Access denied. Admin only.</p>
          <Button variant="link" onClick={() => navigate("/")}>
            Back to home
          </Button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-16 px-4 max-w-5xl mx-auto">
        <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>

        <h1 className="text-2xl font-display font-bold mb-2 flex items-center gap-2">
          <MessageSquare className="w-6 h-6" />
          Builder Chat Conversations
        </h1>
        <p className="text-muted-foreground text-sm mb-6">
          View what users wrote in the AI builder to learn from their prompts and requests.
        </p>

        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : (
          <div className="flex gap-4">
            <div className="w-80 flex-shrink-0 space-y-2 max-h-[60vh] overflow-y-auto">
              {conversations.length === 0 ? (
                <p className="text-muted-foreground text-sm">No conversations yet.</p>
              ) : (
                conversations.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelected(c)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selected?.id === c.id
                        ? "border-primary bg-primary/10"
                        : "border-border hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                      <User className="w-3 h-3" />
                      {c.user_id.slice(0, 8)}…
                    </div>
                    <div className="text-sm font-medium truncate">
                      {c.original_prompt || "No prompt"}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })} ·{" "}
                      {(c.messages as any[]).length} messages
                    </div>
                  </button>
                ))
              )}
            </div>

            <div className="flex-1 min-w-0">
              {selected ? (
                <div className="border border-border rounded-lg p-4 bg-card">
                  <div className="text-xs text-muted-foreground mb-2">
                    User: {selected.user_id} ·{" "}
                    {formatDistanceToNow(new Date(selected.created_at), { addSuffix: true })}
                  </div>
                  {selected.original_prompt && (
                    <div className="mb-3 p-2 rounded bg-muted/50">
                      <span className="text-xs font-medium text-muted-foreground">
                        Original prompt:
                      </span>
                      <p className="text-sm mt-1">{selected.original_prompt}</p>
                    </div>
                  )}
                  <div className="space-y-3 max-h-[50vh] overflow-y-auto">
                    {(selected.messages as { role: string; content: string }[]).map((m, i) => (
                      <div
                        key={i}
                        className={`p-3 rounded-lg text-sm ${
                          m.role === "user"
                            ? "bg-primary/10 text-primary-foreground ml-4"
                            : "bg-muted/50 mr-4"
                        }`}
                      >
                        <span className="text-xs font-medium opacity-80">{m.role}:</span>
                        <div className="mt-1 whitespace-pre-wrap break-words">{m.content}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="border border-dashed border-border rounded-lg p-12 text-center text-muted-foreground">
                  Select a conversation to view messages
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminConversations;
