import { motion } from "framer-motion";
import { PenLine, QrCode, Presentation, BarChart3 } from "lucide-react";

const STEPS = [
  {
    number: 1,
    icon: PenLine,
    title: "Write & AI builds",
    description: "Describe your topic—AI creates the full presentation. Edit, customize, done.",
  },
  {
    number: 2,
    icon: QrCode,
    title: "Share QR, everyone joins",
    description: "Students scan the code and connect in seconds. No apps to install.",
  },
  {
    number: 3,
    icon: Presentation,
    title: "Interactive lecture",
    description: "Live quizzes, polls, reactions. The room becomes engaged and memorable.",
  },
  {
    number: 4,
    icon: BarChart3,
    title: "Analytics & insights",
    description: "See what worked, who participated, and how your audience responded.",
  },
];

export default function HowItWorks() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-4xl mx-auto"
    >
      <h2 className="text-xl sm:text-2xl font-display font-bold text-foreground mb-2 sm:mb-3 text-center">
        How it works
      </h2>
      <p className="text-muted-foreground text-sm sm:text-base text-center mb-6 sm:mb-8 max-w-2xl mx-auto">
        Write words → Get QR → Amazing interactive lecture → See the analytics.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {STEPS.map((step, i) => {
          const Icon = step.icon;
          return (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="relative flex flex-col items-center text-center p-4 sm:p-5 rounded-xl bg-muted/40 border border-border/50"
            >
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-3">
                <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <span className="absolute top-2 right-2 sm:top-3 sm:right-3 text-xs font-bold text-muted-foreground/60">
                {step.number}
              </span>
              <h3 className="font-semibold text-foreground text-sm sm:text-base mb-1">
                {step.title}
              </h3>
              <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed">
                {step.description}
              </p>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
