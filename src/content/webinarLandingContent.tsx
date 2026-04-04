/**
 * Content for the Clasly for Webinars landing page variant.
 * Used when variant="webinar" is passed to landing components.
 */

import { Sparkles, Zap, Palette, LayoutGrid, Users, Clock, BarChart3, MessageSquare, Cloud, HelpCircle } from "lucide-react";

export const webinarHeroContent = {
  headline: "In seconds, AI builds a webinar that",
  headlineHighlight: "engages—and converts.",
  subheadline:
    "One prompt: interactive slides for you, participation on every phone, and built-in flows for leads and follow-ups—so you lift engagement and revenue without a heavy prep day.",
  placeholder:
    "Describe your offer or topic—we’ll build polls, quizzes, and CTAs…\n\nExample: Product launch with live poll, objection-handling quiz, and CTA to book a call.",
  suggestions: [
    "Launch webinar: poll + quiz + next-step CTA",
    "Lead gen session with capture-ready questions",
    "Demo + Q&A with word cloud and poll",
  ],
  hints: [
    { text: "Built in seconds with AI" },
    { text: "Engagement + conversion-ready" },
  ],
};

export const webinarQuizContent = {
  question: "What's your biggest sales hurdle?",
  options: [
    { letter: "A", text: "Prospecting", color: "bg-red-500", phoneColor: "from-red-500 to-red-600" },
    { letter: "B", text: "Objections", color: "bg-blue-500", phoneColor: "from-blue-500 to-blue-600", correct: true },
    { letter: "C", text: "Closing", color: "bg-yellow-500", phoneColor: "from-yellow-500 to-yellow-600" },
    { letter: "D", text: "Follow-up", color: "bg-green-500", phoneColor: "from-green-500 to-green-600" },
  ],
  correctIndex: 1,
};

export const webinarHowItWorksContent = {
  title: "How it works",
  subtitle: "Prompt → join → engage—then turn attention into action.",
  steps: [
    {
      number: 1,
      title: "Prompt & AI builds",
      description:
        "Describe your topic and offer. AI builds a full interactive deck—quizzes, polls, and structure—so you’re ready in seconds, not days.",
    },
    {
      number: 2,
      title: "Share code, capture leads",
      description:
        "Attendees join from their phone—no app. Collect registration and leads before they enter, so you can follow up after the session.",
    },
    {
      number: 3,
      title: "Engage live, then convert",
      description:
        "Run polls and quizzes in real time, send a CTA when the moment is right, and use what you learn to improve the next funnel step.",
    },
  ],
};

export const webinarDemoContent = {
  header: "Your next session could look like this",
  subheadline: (
    <>
      Answers flow from the room in real time.
      <br />
      You see what resonates—then drive the next step.
      <br />
      <span className="text-foreground font-medium">Engagement and clarity for the offer.</span>
    </>
  ),
};

export const webinarAIFeaturesContent = {
  badge: "AI in seconds",
  title: "Engagement and conversion—without the grind",
  description:
    "Clasly’s AI turns your topic into a full interactive webinar: participation, questions, and room for your offer—so you spend energy on delivery and revenue, not slide prep.",
  features: [
    {
      icon: Sparkles,
      title: "AI-built deck & prompts",
      description:
        "From one description: content, questions, and interactive beats aligned to your talk—ready to present.",
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      icon: LayoutGrid,
      title: "Structure for webinars",
      description:
        "The right mix of teaching slides, polls, quizzes, and moments that invite action—not a wall of slides.",
      color: "text-accent",
      bgColor: "bg-accent/10",
    },
    {
      icon: Palette,
      title: "Polished, on-brand look",
      description:
        "Cohesive themes and visuals so your session feels credible before you make the ask.",
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      icon: Users,
      title: "Participation on every phone",
      description:
        "Quizzes, polls, word clouds—built to keep attention high and responses flowing.",
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      icon: Clock,
      title: "Seconds to ship",
      description:
        "Swap the long pre-webinar prep day for a short prompt—iterate when you need to.",
      color: "text-accent",
      bgColor: "bg-accent/10",
    },
    {
      icon: Zap,
      title: "Live signals & next steps",
      description:
        "See what lands in real time; pair with lead capture and a CTA when you’re ready to convert.",
      color: "text-success",
      bgColor: "bg-success/10",
    },
  ],
  traditionalItems: [
    "Hours writing and designing slides",
    "Guessing what the room cares about",
    "No structured path from attention to action",
    "Follow-up lists built manually",
    "Same prep time every time you pitch",
  ],
  claslyItems: [
    "AI generates the full interactive flow from your prompt",
    "Professional layout and themes in one pass",
    "Polls, quizzes, and word clouds included",
    "Live responses and engagement you can see",
    "Ready in seconds—tune and repeat for the next offer",
  ],
};

export const webinarTrustContent = {
  points: [
    {
      title: "Enterprise-Grade Security",
      description: "Your data is encrypted and protected.",
    },
    {
      title: "Start free",
      description:
        "Try the flow: build a deck in seconds, no credit card required to explore.",
    },
    {
      title: "Built for hosts who sell & teach",
      description:
        "Teams and solo hosts use Clasly to run interactive sessions and follow up with real leads.",
    },
    {
      title: "Private by default",
      description: "Your content and audience data stay under your control.",
    },
  ],
};

export const webinarCTAContent = {
  title: "Ready for a higher-converting webinar?",
  description:
    "One prompt: interactive slides, room-wide participation, and a path to leads and your next offer—try it free.",
};

export const webinarFooterContent = {
  tagline: "Interactive webinars in seconds—with AI.",
};

export interface GeneratedSlide {
  type: string;
  title: string;
  icon: React.ReactNode;
}

export const webinarMockSlides: GeneratedSlide[] = [
  { type: "Title", title: "Sales Mindset Masterclass", icon: <Sparkles className="w-4 h-4" /> },
  { type: "Quiz", title: "Quick Check: What's Your Biggest Blocker?", icon: <HelpCircle className="w-4 h-4" /> },
  { type: "Poll", title: "Where Are You in Your Journey?", icon: <MessageSquare className="w-4 h-4" /> },
  { type: "Word Cloud", title: "One Word That Describes Your Goal", icon: <Cloud className="w-4 h-4" /> },
  { type: "Content", title: "Key Takeaways", icon: <BarChart3 className="w-4 h-4" /> },
];
