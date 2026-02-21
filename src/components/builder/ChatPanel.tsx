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
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Thinking...</span>
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
    <div className="p-3 border-b border-border bg-muted/20">
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

const ChatPanel: React.FC<ChatPanelProps> = ({ onSendMessage, onContinueToEdit, canContinueToEdit }) => {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const { messages, isGenerating } = useConversationalBuilder();
  const { aiTokensRemaining } = useCredits();
  const hasCredits = aiTokensRemaining > 0;
  const showContinueCta = Boolean(onContinueToEdit && canContinueToEdit);
  
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
    textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`;
  };
  
  return (
    <div className="flex flex-col h-full bg-background border-r border-border">
      {/* Header */}
      <div className="p-4 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">AI Assistant</h3>
            <p className="text-xs text-muted-foreground">Type what you want—AI edits your slides</p>
          </div>
        </div>
      </div>
      
      {/* Credit Status */}
      <CreditStatus />
      
      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <AnimatePresence mode="popLayout">
          {messages.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center text-muted-foreground py-8 px-4"
            >
              <Sparkles className="w-10 h-10 mx-auto mb-4 text-primary/60" />
              <p className="text-sm font-medium text-foreground mb-1">Your presentation is ready</p>
              <p className="text-sm mb-4">
                Use the chat below to ask for changes. Just type what you want—AI applies it to your slides.
              </p>
              <p className="text-xs opacity-80">
                Try: &quot;Make slide 3 more engaging&quot; · &quot;Add a quiz&quot; · &quot;Change the tone to professional&quot;
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
                  <p className="text-sm font-medium text-foreground mb-3">
                    Happy with the result? Save and open in the full editor to customize further.
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
      
      {/* Input - Chat with AI to refine (VIBE) */}
      <div className="p-4 border-t border-border bg-muted/20">
        <div className="mb-3">
          <p className="text-sm font-medium text-foreground">Chat with AI to refine</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Type what you want changed—AI updates your slides instantly
          </p>
        </div>
        <div className="flex gap-2 items-end">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={hasCredits ? "e.g. Make slide 3 more engaging, Add a quiz after slide 2..." : "No credits remaining..."}
            disabled={isGenerating || !hasCredits}
            className="min-h-[48px] max-h-[150px] resize-none"
            rows={1}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isGenerating || !hasCredits}
            size="icon"
            className="shrink-0 h-11 w-11"
          >
            {isGenerating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5 justify-center">
          {['Change tone', 'Add quiz', 'Edit slide 2'].map((hint) => (
            <button
              key={hint}
              type="button"
              onClick={() => setInput(hint)}
              disabled={isGenerating || !hasCredits}
              className="text-xs px-2.5 py-1 rounded-full bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50"
            >
              {hint}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          AI can make mistakes. Always verify important details.
        </p>
      </div>
    </div>
  );
};

export default ChatPanel;
