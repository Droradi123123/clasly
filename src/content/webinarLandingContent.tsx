/**
 * Content for the Clasly for Webinars landing page variant.
 * Used when variant="webinar" is passed to landing components.
 */

import { Sparkles, Zap, Palette, LayoutGrid, Users, Clock, BarChart3, MessageSquare, Cloud, HelpCircle } from "lucide-react";

export const webinarHeroContent = {
  headline: "Turn your topic into an",
  headlineHighlight: "interactive webinar in seconds.",
  subheadline:
    "AI builds the full experience: an interactive deck for your screen and a live interface so every attendee can participate from their phone—no downloads.",
  placeholder:
    "Describe your workshop topic and we'll build your presentation…\n\nExample: Sales mindset workshop with opening poll, quiz checkpoints, and closing reflection.",
  suggestions: [
    "Sales mindset workshop with poll",
    "Lead generation webinar with quiz",
    "Coaching session icebreaker + feedback",
  ],
  hints: [
    { text: "Ready in seconds" },
    { text: "No setup required" },
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
  subtitle: "Describe your topic → Share the join code → Run an interactive webinar.",
  steps: [
    {
      number: 1,
      title: "Write & AI builds",
      description:
        "Describe your topic—AI creates the full presentation. Edit, customize, done.",
    },
    {
      number: 2,
      title: "Share code, attendees join",
      description:
        "Participants enter the code on their phone. No apps to install.",
    },
    {
      number: 3,
      title: "Interactive webinar & insights",
      description:
        "Live quizzes, polls, reactions. Keep attendees engaged. See what landed.",
    },
  ],
};

export const webinarDemoContent = {
  header: "Your next webinar could look like this",
  subheadline: (
    <>
      Participants vote on their phone.
      <br />
      You see results live on your screen.
      <br />
      <span className="text-foreground font-medium">Real-time engagement.</span>
    </>
  ),
};

export const webinarAIFeaturesContent = {
  badge: "Why AI-Powered?",
  title: "Let AI Do the Heavy Lifting",
  description:
    "Our AI turns your topic into an interactive deck in seconds. Quizzes, polls, word clouds—built in. You focus on delivery; we handle the deck.",
  features: [
    {
      icon: Sparkles,
      title: "AI Content Generation",
      description:
        "Describe your topic, AI writes compelling content, questions, and talking points.",
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      icon: LayoutGrid,
      title: "Smart Slide Structure",
      description:
        "AI picks the right mix of content slides and interactive moments for webinars.",
      color: "text-accent",
      bgColor: "bg-accent/10",
    },
    {
      icon: Palette,
      title: "Visual Consistency",
      description:
        "Every slide is professionally designed with cohesive themes and animations.",
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      icon: Users,
      title: "Instant Engagement",
      description:
        "Built-in quizzes, polls, word clouds—designed for webinar engagement.",
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      icon: Clock,
      title: "Save Hours",
      description:
        "Cut prep from hours to minutes. Focus on delivery, not design.",
      color: "text-accent",
      bgColor: "bg-accent/10",
    },
    {
      icon: Zap,
      title: "Real-Time Results",
      description:
        "See responses live. React and adapt in the moment.",
      color: "text-success",
      bgColor: "bg-success/10",
    },
  ],
  traditionalItems: [
    "Research and write content manually",
    "Design each slide from scratch",
    "Create quiz questions separately",
    "No real-time audience feedback",
    "Takes 2-4 hours per presentation",
  ],
  claslyItems: [
    "AI generates content from your topic",
    "Professional design applied instantly",
    "Interactive elements built-in",
    "Live responses and engagement",
    "Ready in under 30 seconds",
  ],
};

export const webinarTrustContent = {
  points: [
    {
      title: "Enterprise-Grade Security",
      description: "Your data is encrypted and protected.",
    },
    {
      title: "No Commitment Required",
      description:
        "Start for free. No credit card. Create your first deck in seconds.",
    },
    {
      title: "Trusted by Course Creators & Coaches",
      description:
        "Used by webinar hosts and trainers to engage their audiences.",
    },
    {
      title: "Private by Default",
      description: "Your content and audience data stay private.",
    },
  ],
};

export const webinarCTAContent = {
  title: "Ready to Run Your Next Webinar Differently?",
  description:
    "Your first interactive deck is one prompt away. No credit card required to try.",
};

export const webinarFooterContent = {
  tagline: "Making webinars interactive.",
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
