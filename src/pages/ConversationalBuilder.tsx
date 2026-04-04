import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import ChatPanel from '@/components/builder/ChatPanel';
import PreviewPanel from '@/components/builder/PreviewPanel';
import { useConversationalBuilder } from '@/hooks/useConversationalBuilder';
import { createLecture, updateLecture } from '@/lib/lectureService';
import { useBuilderConversationPersistence } from '@/hooks/useBuilderConversationPersistence';
import { Slide } from '@/types/slides';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/useIsMobile';
import { AuthModal } from '@/components/auth/AuthModal';
import { supabase } from '@/integrations/supabase/client';
import { getEdgeFunctionErrorMessage, getEdgeFunctionStatus, withTimeout } from '@/lib/supabaseFunctions';
import { ensureSlidesDesignDefaults } from '@/lib/designDefaults';
import { hydratePendingSlideImages, type PendingSlideImage } from '@/lib/hydrateSlideImages';
import { useSubscriptionContext } from '@/contexts/SubscriptionContext';
import { OutOfCreditsModal } from '@/components/credits/OutOfCreditsModal';

const ConversationalBuilder: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isLoading: isAuthLoading } = useAuth();
  const isMobile = useIsMobile();
  const { maxSlides, isFree, hasAITokens, isPro, isStandard, isLoading: isSubLoading } =
    useSubscriptionContext();
  /** Standard + Pro: same plan + progressive flow as Editor (server charges 1 + N credits). */
  const usePaidProgressive = isPro || isStandard;
  
  const [isInitialLoading, setIsInitialLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showOutOfCreditsModal, setShowOutOfCreditsModal] = useState(false);
  /** Draft lecture saved in DB as soon as AI generates slides; updated on every edit so it never gets lost. */
  const [draftLectureId, setDraftLectureId] = useState<string | null>(null);
  
  const {
    sandboxSlides,
    setSandboxSlides,
    messages,
    addMessage,
    updateLastMessage,
    setIsGenerating,
    isGenerating,
    setOriginalPrompt,
    originalPrompt,
    targetAudience,
    setGeneratedTheme,
    currentPreviewIndex,
    setCurrentPreviewIndex,
    reset,
  } = useConversationalBuilder();

  
  // Track if we've already started generation to prevent duplicates
  const [hasStartedGeneration, setHasStartedGeneration] = useState(false);
  
  // Get initial prompt from URL params or localStorage (for OAuth redirects)
  const urlPrompt = searchParams.get('prompt') || '';
  const pendingPrompt = localStorage.getItem('clasly_pending_prompt') || '';
  const initialPrompt = urlPrompt || pendingPrompt;
  const contentMode = (searchParams.get('mode') || 'interactive') as 'interactive' | 'with_content';
  const builderTrack =
    searchParams.get('track') === 'webinar' ||
    localStorage.getItem('clasly_pending_track') === 'webinar'
      ? ('webinar' as const)
      : ('education' as const);

  // Optional: open builder from the editor with existing slides + a focused slide
  const editorSlideIndexParam = searchParams.get('slide');
  const editorSlideIndex = editorSlideIndexParam ? Number(editorSlideIndexParam) : 0;

  // Redirect mobile users to continue-on-desktop (building is desktop-only)
  useEffect(() => {
    if (isMobile) {
      navigate('/continue-on-desktop', { replace: true });
    }
  }, [isMobile, navigate]);

  // Check auth and show modal if not logged in
  useEffect(() => {
    if (!isAuthLoading && !user) {
      setShowAuthModal(true);
    }
  }, [isAuthLoading, user]);

  const { flush: flushConversation } = useBuilderConversationPersistence({
    userId: user?.id,
    messages,
    lectureId: draftLectureId,
    originalPrompt: originalPrompt || undefined,
    targetAudience: targetAudience || undefined,
  });

  // If opened from Editor, load slides from localStorage once and focus the requested slide
  useEffect(() => {
    const source = localStorage.getItem('clasly_builder_source');
    const rawSlides = localStorage.getItem('clasly_builder_slides');

    if (source !== 'editor') return;
    if (!rawSlides) return;
    if (sandboxSlides.length > 0) return;

    try {
      const parsed = JSON.parse(rawSlides) as Slide[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        const safeIndex = Math.min(
          Math.max(editorSlideIndex, 0),
          parsed.length - 1
        );
        setSandboxSlides(ensureSlidesDesignDefaults(parsed));
        setCurrentPreviewIndex(safeIndex);
        addMessage({
          role: 'assistant',
          content:
            'Loaded your presentation from the editor. What would you like to change?',
        });
      }
    } catch (e) {
      console.error('Failed to load slides from editor:', e);
    } finally {
      localStorage.removeItem('clasly_builder_source');
      localStorage.removeItem('clasly_builder_slides');
    }
  }, [addMessage, editorSlideIndex, sandboxSlides.length, setSandboxSlides, setCurrentPreviewIndex]);

  // Generate initial presentation on mount - ONLY ONCE
  useEffect(() => {
    // Guard against multiple calls
    if (hasStartedGeneration) return;
    if (!initialPrompt) return;
    if (!user || isAuthLoading) return;
    if (sandboxSlides.length > 0) return;
    if (originalPrompt) return; // Already set, don't run again
    // Wait for subscription/credits to load before credit check (avoids false "no credits" when loading)
    if (isSubLoading) return;

    // Clear pending prompt from localStorage immediately
    localStorage.removeItem('clasly_pending_prompt');
    localStorage.removeItem('clasly_pending_prompt_ts');

    // Mark as started BEFORE async operation
    setHasStartedGeneration(true);
    setOriginalPrompt(initialPrompt, contentMode);
    generateInitialPresentation(initialPrompt, contentMode);
  }, [initialPrompt, user, isAuthLoading, isSubLoading, hasStartedGeneration, sandboxSlides.length, originalPrompt]);

  // Keep draft in DB in sync when user edits via chat (debounced)
  useEffect(() => {
    if (!draftLectureId || sandboxSlides.length === 0) return;
    const t = setTimeout(() => {
      updateLecture(draftLectureId, { slides: sandboxSlides }).catch((e) =>
        console.warn('Failed to update draft:', e)
      );
    }, 1500);
    return () => clearTimeout(t);
  }, [draftLectureId, sandboxSlides]);
  
  const generateInitialPresentation = async (prompt: string, contentType: 'interactive' | 'with_content') => {
    const slideCount = isFree ? (maxSlides ?? 5) : Math.min(10, maxSlides ?? 10);
    const lectureMode = builderTrack === 'webinar' ? ('webinar' as const) : ('education' as const);
    // Server uses internal plan + per-slide for batch (1+N credits); plan+progressive is also 1+N.
    if (!hasAITokens(slideCount + 1)) {
      setShowOutOfCreditsModal(true);
      return;
    }

    setIsInitialLoading(true);
    setIsGenerating(true);

    // Show user's prompt in chat so they see what they asked for
    addMessage({ role: 'user', content: prompt });
    addMessage({
      role: 'assistant',
      content: `I'm building a presentation now:\n\n"${prompt}"`,
      isLoading: true,
    });

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.refreshSession();
      if (sessionError || !session) {
        throw new Error("Please sign in to generate presentations");
      }

      let resData: {
        error?: string;
        slides?: unknown[];
        theme?: unknown;
        plan?: string;
        interpretation?: string;
        pendingSlideImages?: PendingSlideImage[];
      };

      if (usePaidProgressive) {
        let planData: { interpretation?: string; plan?: string; slideTypes?: string[] } | null = null;
        let planRes = await supabase.functions.invoke('generate-slides', {
          body: {
            description: prompt,
            contentType,
            targetAudience,
            slideCount,
            phase: 'plan',
            lectureMode,
          },
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (planRes.error && getEdgeFunctionStatus(planRes.error) === 503) {
          await new Promise((r) => setTimeout(r, 2500));
          planRes = await supabase.functions.invoke('generate-slides', {
            body: {
              description: prompt,
              contentType,
              targetAudience,
              slideCount,
              phase: 'plan',
              lectureMode,
            },
            headers: { Authorization: `Bearer ${session.access_token}` },
          });
        }
        if (planRes.error) {
          if (getEdgeFunctionStatus(planRes.error) === 402) setShowOutOfCreditsModal(true);
          throw new Error(await getEdgeFunctionErrorMessage(planRes.error, 'Failed to plan presentation.'));
        }
        const planPayload = planRes.data as {
          interpretation?: string;
          plan?: string;
          slideTypes?: string[];
          error?: string;
        };
        if (planPayload?.error) throw new Error(planPayload.error);
        if (planPayload?.interpretation || planPayload?.plan) {
          planData = {
            interpretation: planPayload.interpretation,
            plan: planPayload.plan,
            slideTypes: planPayload.slideTypes || [],
          };
          let planMsg = '';
          if (planPayload.interpretation) planMsg += `**What I understood:** ${planPayload.interpretation}\n\n`;
          if (planPayload.plan) planMsg += `**My plan:** ${planPayload.plan}\n\n`;
          planMsg += 'Building your slides one by one...';
          updateLastMessage(planMsg);
          await new Promise((r) => setTimeout(r, 1500));
        }

        if (planData?.slideTypes?.length) {
          const accumulated: Slide[] = [];
          let generatedTheme: unknown = null;
          for (let i = 0; i < planData.slideTypes.length; i++) {
            let progRes = await supabase.functions.invoke('generate-slides', {
              body: {
                lectureMode,
                progressiveSlide: {
                  index: i,
                  slideType: planData.slideTypes[i],
                  description: prompt,
                  plan: planData.plan,
                  interpretation: planData.interpretation,
                  contentType,
                },
              },
              headers: { Authorization: `Bearer ${session.access_token}` },
            });
            if (progRes.error && getEdgeFunctionStatus(progRes.error) === 503) {
              await new Promise((r) => setTimeout(r, 2500));
              progRes = await supabase.functions.invoke('generate-slides', {
                body: {
                  lectureMode,
                  progressiveSlide: {
                    index: i,
                    slideType: planData.slideTypes[i],
                    description: prompt,
                    plan: planData.plan,
                    interpretation: planData.interpretation,
                    contentType,
                  },
                },
                headers: { Authorization: `Bearer ${session.access_token}` },
              });
            }
            if (progRes.error) {
              if (getEdgeFunctionStatus(progRes.error) === 402) setShowOutOfCreditsModal(true);
              throw new Error(await getEdgeFunctionErrorMessage(progRes.error, `Failed to generate slide ${i + 1}.`));
            }
            const progPayload = progRes.data as { slide?: unknown; theme?: unknown; error?: string };
            if (progPayload?.error) throw new Error(progPayload.error);
            if (progPayload?.slide) {
              const s = progPayload.slide as Record<string, unknown>;
              accumulated.push({
                ...s,
                id: (s.id as string) || `${Date.now()}-${i}-${Math.random().toString(36).substr(2, 9)}`,
                order: i,
              } as Slide);
              if (progPayload.theme) generatedTheme = progPayload.theme;
              setSandboxSlides(
                ensureSlidesDesignDefaults(accumulated.map((slide, idx) => ({ ...slide, order: idx }))),
              );
              updateLastMessage(
                (planData.interpretation
                  ? `**What I understood:** ${planData.interpretation}\n\n**My plan:** ${planData.plan}\n\n`
                  : '') + `Slide ${i + 1} of ${planData.slideTypes!.length} ready...`,
              );
            }
          }
          resData = {
            slides: accumulated,
            theme: generatedTheme,
            plan: planData.plan,
            interpretation: planData.interpretation,
          };
        } else {
          let invokeResult = await supabase.functions.invoke('generate-slides', {
            body: {
              description: prompt,
              contentType,
              targetAudience,
              difficulty: 'intermediate',
              slideCount,
              maxImages: 6,
              lectureMode,
              ...(planData &&
                planData.slideTypes?.length && {
                  plan: planData.plan,
                  interpretation: planData.interpretation,
                  slideTypes: planData.slideTypes,
                }),
            },
            headers: { Authorization: `Bearer ${session.access_token}` },
          });
          if (invokeResult.error && getEdgeFunctionStatus(invokeResult.error) === 503) {
            await new Promise((r) => setTimeout(r, 2500));
            invokeResult = await supabase.functions.invoke('generate-slides', {
              body: {
                description: prompt,
                contentType,
                targetAudience,
                difficulty: 'intermediate',
                slideCount,
                maxImages: 6,
                lectureMode,
                ...(planData &&
                  planData.slideTypes?.length && {
                    plan: planData.plan,
                    interpretation: planData.interpretation,
                    slideTypes: planData.slideTypes,
                  }),
              },
              headers: { Authorization: `Bearer ${session.access_token}` },
            });
          }
          const { data, error: fnError } = invokeResult;
          if (fnError) {
            if (getEdgeFunctionStatus(fnError) === 402) setShowOutOfCreditsModal(true);
            const msg = await getEdgeFunctionErrorMessage(fnError, 'Failed to generate presentation.');
            throw new Error(msg);
          }
          resData = data as typeof resData;
        }
      } else {
        let invokeResult = await supabase.functions.invoke('generate-slides', {
          body: {
            description: prompt,
            contentType,
            difficulty: 'intermediate',
            slideCount,
            maxImages: isFree ? 3 : 6,
            lectureMode,
            targetAudience,
          },
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (invokeResult.error && getEdgeFunctionStatus(invokeResult.error) === 503) {
          await new Promise((r) => setTimeout(r, 2500));
          invokeResult = await supabase.functions.invoke('generate-slides', {
            body: {
              description: prompt,
              contentType,
              difficulty: 'intermediate',
              slideCount,
              maxImages: isFree ? 3 : 6,
              lectureMode,
              targetAudience,
            },
            headers: { Authorization: `Bearer ${session.access_token}` },
          });
        }
        const { data, error: fnError } = invokeResult;
        if (fnError) {
          if (getEdgeFunctionStatus(fnError) === 402) setShowOutOfCreditsModal(true);
          const msg = await getEdgeFunctionErrorMessage(fnError, 'Failed to generate presentation.');
          throw new Error(msg);
        }
        resData = data as typeof resData;
      }

      if (resData?.error) throw new Error(resData.error);
      if (!resData?.slides?.length) throw new Error('No slides returned');

      let processedSlides: Slide[] = ensureSlidesDesignDefaults(
        (resData.slides as unknown[]).map((slide: unknown, index: number) => {
          const s = slide as Slide;
          return {
            ...s,
            id: s.id || `${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`,
            order: index,
          };
        }),
      );

      const pendingImgs = resData.pendingSlideImages;
      if (pendingImgs?.length) {
        const { data: sessHydrate } = await supabase.auth.getSession();
        const tok = sessHydrate?.session?.access_token;
        if (tok) {
          processedSlides = ensureSlidesDesignDefaults(
            await hydratePendingSlideImages(processedSlides, pendingImgs, tok, (upd) => {
              setSandboxSlides(ensureSlidesDesignDefaults(upd));
            }),
          );
        }
      }

      setSandboxSlides(processedSlides);
      setGeneratedTheme(resData.theme);

      // Auto-save draft so the presentation is never lost (credits, navigation, or leave)
      const draftTitle = (prompt.slice(0, 50) + (prompt.length > 50 ? '...' : '')) || 'Untitled Presentation';
      try {
        const newLecture = await createLecture(draftTitle, processedSlides);
        setDraftLectureId(newLecture.id);
      } catch (e) {
        console.warn('Failed to auto-save draft:', e);
      }

      // Build success message: include interpretation + plan when present
      let successMsg = '';
      if (resData.interpretation || resData.plan) {
        if (resData.interpretation) {
          successMsg += `**What I understood:** ${resData.interpretation}\n\n`;
        }
        if (resData.plan) {
          successMsg += `**My plan:** ${resData.plan}\n\n`;
        }
      }
      successMsg +=
        `I've created a ${processedSlides.length}-slide presentation about "${prompt}".\n\n` +
        `**What you can ask me:**\n` +
        `- "Change the text on slide 3"\n` +
        `- "Make the tone more professional"\n` +
        `- "Add a quiz after slide 2"\n` +
        `- "Delete the timeline slide"\n` +
        `- "Change images to a different style"\n\n` +
        `You can **keep editing by typing** what you want changed in the box below, or click **Continue to Edit** to open the full editor.`;

      updateLastMessage(successMsg);
    } catch (error) {
      console.error('Error generating presentation:', error);
      const errorMessage = error instanceof Error 
        ? (error.name === 'AbortError' ? 'Request timed out. Please try again.' : error.message)
        : 'Please try again.';
      updateLastMessage(
        `Sorry, I couldn't generate the presentation. ${errorMessage}`
      );
      const isSessionError = /sign out|session invalid|invalid jwt/i.test(errorMessage);
      if (isSessionError) {
        toast.error('נא להתנתק ולהתחבר מחדש', {
          action: {
            label: 'התנתק והתחבר',
            onClick: async () => {
              await supabase.auth.signOut();
              setShowAuthModal(true);
            },
          },
        });
      } else {
        toast.error('Failed to generate presentation');
      }
    } finally {
      setIsInitialLoading(false);
      setIsGenerating(false);
    }
  };
  
  const handleSendMessage = async (userMessage: string) => {
    if (!hasAITokens(1)) {
      setShowOutOfCreditsModal(true);
      return;
    }
    addMessage({ role: 'user', content: userMessage });
    addMessage({ role: 'assistant', content: '', isLoading: true });
    setIsGenerating(true);

    const progressStages: { after: number; text: string }[] = [
      { after: 0, text: 'Starting...' },
      { after: 4, text: 'AI is thinking...' },
      { after: 12, text: 'Processing your request...' },
      { after: 30, text: 'This is taking longer than usual...' },
    ];
    const startTime = Date.now();
    const progressId = setInterval(() => {
      const elapsedSec = (Date.now() - startTime) / 1000;
      const stage = [...progressStages].reverse().find((s) => elapsedSec >= s.after);
      if (stage) updateLastMessage(stage.text);
    }, 3000);
    
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.refreshSession();
      if (sessionError || !session) {
        throw new Error("Please sign in to use the chat builder");
      }

      const conversationHistory = messages
        .slice(0, -1)
        .filter((m) => (m.role === 'user' || m.role === 'assistant') && !m.isLoading)
        .slice(-20)
        .map((m) => ({ role: m.role, content: m.content }));

      const invokeFn = () =>
        supabase.functions.invoke('chat-builder', {
          body: {
            message: userMessage,
            conversationHistory,
            slides: sandboxSlides,
            currentSlideIndex: currentPreviewIndex,
            originalPrompt,
            targetAudience,
          },
          headers: { Authorization: `Bearer ${session.access_token}` },
        });

      let result = await withTimeout(invokeFn(), 90_000, 'Request timed out. Please try again.');
      if (result.error && getEdgeFunctionStatus(result.error) === 503) {
        await new Promise((r) => setTimeout(r, 2500));
        result = await withTimeout(invokeFn(), 90_000, 'Request timed out. Please try again.');
      }

      const { data, error: fnError } = result;

      if (fnError) {
        if (getEdgeFunctionStatus(fnError) === 402) setShowOutOfCreditsModal(true);
        const msg = await getEdgeFunctionErrorMessage(fnError, 'Failed to process message.');
        throw new Error(msg);
      }
      const resData = data as { error?: string; message?: string; updatedSlides?: unknown[] };
      if (resData?.error) throw new Error(resData.error);

      if (resData?.updatedSlides?.length) {
        setSandboxSlides(ensureSlidesDesignDefaults(resData.updatedSlides as Slide[]));
      }
      updateLastMessage(resData?.message || 'Done! Check out the updated slides.');
      
    } catch (error) {
      console.error('Error processing message:', error);
      updateLastMessage(
        `Sorry, I couldn't process that request. ${error instanceof Error ? error.message : 'Please try again.'}`
      );
    } finally {
      clearInterval(progressId);
      setIsGenerating(false);
    }
  };
  
  const handleApprove = async () => {
    if (sandboxSlides.length === 0) {
      toast.error('No slides to save');
      return;
    }
    
    setIsSaving(true);
    
    try {
      await flushConversation();

      if (draftLectureId) {
        const updated = await updateLecture(draftLectureId, { slides: sandboxSlides });
        toast.success('Presentation saved!');
        reset();
        setDraftLectureId(null);
        navigate(`/editor/${draftLectureId}`, {
          state: { preloadedLecture: { ...updated, slides: sandboxSlides } },
        });
      } else {
        let title = originalPrompt || '';
        if (!title && sandboxSlides.length > 0) {
          const firstSlide = sandboxSlides[0];
          const c = firstSlide.content as { title?: string; question?: string } | undefined;
          title = c?.title || c?.question || 'Untitled Presentation';
        }
        title = title.slice(0, 50) + (title.length > 50 ? '...' : '');
        const newLecture = await createLecture(title || 'Untitled Presentation', sandboxSlides);
        toast.success('Presentation saved!');
        reset();
        navigate(`/editor/${newLecture.id}`, {
          state: { preloadedLecture: { ...newLecture, slides: sandboxSlides } },
        });
      }
    } catch (error) {
      console.error('Error saving presentation:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to save presentation';
      toast.error(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleCancel = async () => {
    await flushConversation();
    if (sandboxSlides.length > 0 && draftLectureId) {
      toast.info('Draft saved. Find it in your Dashboard.');
    }
    reset();
    setDraftLectureId(null);
    navigate('/dashboard');
  };
  
  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Top bar */}
      <header className="h-14 border-b border-border bg-background flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={handleCancel}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="font-semibold text-sm">AI Presentation Builder</h1>
            {originalPrompt && (
              <p className="text-xs text-muted-foreground truncate max-w-[300px]">
                {originalPrompt}
              </p>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button
            variant="hero"
            onClick={handleApprove}
            disabled={sandboxSlides.length === 0 || isSaving || isGenerating}
          >
            <Check className="w-4 h-4 mr-2" />
            {isSaving ? 'Saving...' : 'Continue to Edit'}
          </Button>
        </div>
      </header>
      
      {/* Main content - Split view */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat panel - Left side (wider, clearer for "type to edit") */}
        <motion.div
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="w-[min(380px,36%)] min-w-[300px] max-w-[400px] border-r border-border flex flex-col"
        >
          <ChatPanel
          onSendMessage={handleSendMessage}
          onContinueToEdit={handleApprove}
          canContinueToEdit={sandboxSlides.length > 0 && !isSaving && !isGenerating}
        />
        </motion.div>
        
        {/* Preview panel - Right side */}
        <motion.div
          initial={{ x: 20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="flex-1 flex flex-col min-h-0"
        >
          <PreviewPanel isInitialLoading={isInitialLoading} initialPrompt={initialPrompt} />
        </motion.div>
      </div>
      
      {/* Auth Modal for unauthenticated users */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => navigate('/')}
        onSuccess={() => setShowAuthModal(false)}
        promptText={initialPrompt}
        redirectTo="builder"
        builderTrack={builderTrack}
        signInProduct={builderTrack}
      />
      <OutOfCreditsModal open={showOutOfCreditsModal} onOpenChange={setShowOutOfCreditsModal} />
    </div>
  );
};

export default ConversationalBuilder;
