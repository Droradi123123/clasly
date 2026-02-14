import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Sparkles, Loader2, Zap, AlertCircle } from 'lucide-react';
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

const ChatPanel: React.FC<ChatPanelProps> = ({ onSendMessage }) => {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const { messages, isGenerating } = useConversationalBuilder();
  const { aiTokensRemaining } = useCredits();
  const hasCredits = aiTokensRemaining > 0;
  
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
            <p className="text-xs text-muted-foreground">Refine your presentation</p>
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
              className="text-center text-muted-foreground py-8"
            >
              <Sparkles className="w-8 h-8 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Ask me to refine your slides</p>
              <p className="text-xs mt-2 opacity-70">
                Try: "Make slide 3 more engaging" or "Add a quiz about..."
              </p>
            </motion.div>
          ) : (
            messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))
          )}
        </AnimatePresence>
      </ScrollArea>
      
      {/* Input */}
      <div className="p-4 border-t border-border bg-muted/20">
        <div className="flex gap-2 items-end">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={hasCredits ? "Type your message..." : "No credits remaining..."}
            disabled={isGenerating || !hasCredits}
            className="min-h-[44px] max-h-[150px] resize-none"
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
        <p className="text-xs text-muted-foreground mt-2 text-center">
          AI can make mistakes. Always verify important details.
        </p>
      </div>
    </div>
  );
};

export default ChatPanel;
