import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Sparkles, Loader2, Zap, AlertCircle, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useConversationalBuilder, ChatMessage } from '@/hooks/useConversationalBuilder';
import { useCredits, useFeatureAccess } from '@/contexts/SubscriptionContext';
import { Progress } from '@/components/ui/progress';
import { Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';

interface ChatPanelProps {
  onSendMessage: (message: string) => void;
  /** When set, show a "Continue to Edit" button in the chat (after messages) when user can proceed to editor */
  onContinueToEdit?: () => void;
  canContinueToEdit?: boolean;
  /** When true, hide "Continue to Edit" (already inside Editor) */
  embeddedInEditor?: boolean;
}

const MessageBubble = ({ message }: { message: ChatMessage }) => {
  const isUser = message.role === 'user';
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}
    >
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 ${
          isUser
            ? 'bg-primary text-primary-foreground rounded-br-md'
            : 'bg-muted text-foreground rounded-bl-md'
        }`}
      >
        {message.isLoading ? (
          <div className="flex items-center gap-3 py-1">
            <Loader2 className="w-5 h-5 animate-spin text-primary shrink-0" />
            <span className="text-sm font-medium">Building your slides...</span>
          </div>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown
              components={{
                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                ul: ({ children }) => <ul className="list-disc list-inside mb-2">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal list-inside mb-2">{children}</ol>,
                li: ({ children }) => <li className="mb-1">{children}</li>,
                strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </motion.div>
  );
};

const CreditStatus: React.FC = () => {
  const { aiTokensRemaining, credits } = useCredits();
  const { isFree } = useFeatureAccess();
  
  // Estimate based on plan (Free = 50, Standard = 500, Pro = 2000)
  const estimatedMonthly = isFree ? 50 : 500;
  const percentage = Math.min(100, (aiTokensRemaining / estimatedMonthly) * 100);
  const isLow = percentage < 20;
  const isEmpty = aiTokensRemaining <= 0;
  
  return (
    <div className="p-2.5 border-b border-border bg-muted/20">
      <div className="flex items-center justify-between text-xs mb-1.5">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <Zap className="w-3.5 h-3.5" />
          AI Tokens
        </span>
        <span className={`font-medium ${isLow ? 'text-destructive' : 'text-foreground'}`}>
          {aiTokensRemaining}
        </span>
      </div>
      <Progress 
        value={percentage} 
        className={`h-1 ${isLow ? '[&>div]:bg-destructive' : ''}`} 
      />
      
      {/* Warning / CTA */}
      {isEmpty ? (
        <div className="mt-2 p-2 bg-destructive/10 border border-destructive/20 rounded-lg">
          <div className="flex items-center gap-1.5 text-xs text-destructive font-medium">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>No credits remaining</span>
          </div>
          <Button 
            variant="hero" 
            size="sm" 
            className="w-full mt-2 h-7 text-xs" 
            asChild
          >
            <Link to="/pricing">
              <Sparkles className="w-3 h-3 mr-1" />
              {isFree ? 'Upgrade to Continue' : 'Buy Credits'}
            </Link>
          </Button>
        </div>
      ) : isLow ? (
        <div className="mt-2 flex items-center justify-between">
          <span className="flex items-center gap-1 text-xs text-destructive">
            <AlertCircle className="w-3 h-3" />
            Running low
          </span>
          <Button 
            variant="link" 
            size="sm" 
            className="h-auto p-0 text-xs" 
            asChild
          >
            <Link to="/pricing">
              {isFree ? 'Upgrade' : 'Buy more'}
            </Link>
          </Button>
        </div>
      ) : null}
    </div>
  );
};

const ChatPanel: React.FC<ChatPanelProps> = ({ onSendMessage, onContinueToEdit, canContinueToEdit, embeddedInEditor }) => {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const { messages, isGenerating } = useConversationalBuilder();
  const { aiTokensRemaining } = useCredits();
  const hasCredits = aiTokensRemaining > 0;
  const showContinueCta = !embeddedInEditor && Boolean(onContinueToEdit && canContinueToEdit);
  
  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);
  
  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || isGenerating || !hasCredits) return;
    
    onSendMessage(trimmed);
    setInput('');
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };
  
  // Auto-resize textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
  };
  
  const compact = embeddedInEditor;
  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header - compact when embedded */}
      <div className={`border-b border-border bg-muted/30 ${compact ? 'p-3' : 'p-5'}`}>
        <div className={`flex items-center gap-3 ${compact ? 'gap-2' : ''}`}>
          <div className={`rounded-xl bg-primary/15 flex items-center justify-center ${compact ? 'w-10 h-10' : 'w-12 h-12'}`}>
            <Sparkles className={`text-primary ${compact ? 'w-5 h-5' : 'w-6 h-6'}`} />
          </div>
          <div>
            <h3 className={`font-semibold text-foreground ${compact ? 'text-sm' : 'text-lg'}`}>Edit with AI</h3>
          </div>
        </div>
      </div>
      
      {/* Credit Status */}
      <CreditStatus />
      
      {/* Messages */}
      <ScrollArea className={`flex-1 ${compact ? 'p-3' : 'p-4'}`} ref={scrollRef}>
        <AnimatePresence mode="popLayout">
          {messages.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={`text-center text-muted-foreground ${compact ? 'py-6 px-3' : 'py-10 px-4'}`}
            >
              <Sparkles className={`mx-auto text-primary/60 ${compact ? 'w-10 h-10 mb-3' : 'w-12 h-12 mb-5'}`} />
              <p className={`font-semibold text-foreground mb-2 ${compact ? 'text-base' : 'text-lg'}`}>Edit your presentation here</p>
              <p className={`mb-5 max-w-[360px] mx-auto ${compact ? 'text-sm' : 'text-base'}`}>
                Use the <strong className="text-foreground">box below</strong> to type what you want to change.
              </p>
              <p className={`opacity-90 mb-1 ${compact ? 'text-xs' : 'text-sm'}`}>Examples:</p>
              <p className={`opacity-80 ${compact ? 'text-xs' : 'text-sm'}`}>
                &quot;Make slide 3 more engaging&quot; · &quot;Add a quiz&quot; · &quot;Change the tone to professional&quot;
              </p>
            </motion.div>
          ) : (
            <>
              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}
              {showContinueCta && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 p-4 rounded-xl border-2 border-primary/30 bg-primary/5"
                >
                  <p className="text-base font-medium text-foreground mb-3">
                    Keep editing by typing in the box below, or click the button to open the full editor.
                  </p>
                  <Button
                    variant="hero"
                    className="w-full"
                    onClick={onContinueToEdit}
                  >
                    <Pencil className="w-4 h-4 mr-2" />
                    Continue to Edit
                  </Button>
                </motion.div>
              )}
            </>
          )}
        </AnimatePresence>
      </ScrollArea>
      
      {/* Input - compact when embedded */}
      <div className={`shrink-0 border-t border-border bg-muted/30 ${compact ? 'p-2' : 'p-3'}`}>
        {!compact && <p className="text-sm font-medium text-foreground mb-2">Type here to edit your slides</p>}
        <div className="flex gap-2 items-end">
          <div className={`flex-1 rounded-lg border-2 bg-background focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all ${
            isGenerating ? 'border-primary/60 animate-pulse' : 'border-primary/40'
          }`}>
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={hasCredits ? "e.g. Make slide 3 shorter, Add a quiz..." : "No credits remaining..."}
              disabled={isGenerating || !hasCredits}
              className={`max-h-[120px] resize-none text-sm placeholder:text-muted-foreground border-0 focus-visible:ring-0 focus-visible:ring-offset-0 py-2.5 px-3 ${compact ? 'min-h-[56px]' : 'min-h-[72px]'}`}
              rows={2}
            />
          </div>
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isGenerating || !hasCredits}
            size="icon"
            className="shrink-0 h-10 w-10"
          >
            {isGenerating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
        <div className={`flex flex-wrap gap-1.5 justify-center ${compact ? 'mt-1.5' : 'mt-2'}`}>
          {['Change tone', 'Add quiz', 'Edit slide 2'].map((hint) => (
            <button
              key={hint}
              type="button"
              onClick={() => setInput(hint)}
              disabled={isGenerating || !hasCredits}
              className="text-xs px-3 py-1.5 rounded-full bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50"
            >
              {hint}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ChatPanel;
