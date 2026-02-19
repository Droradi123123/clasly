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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {STEPS.map((step, i) => {
          const Icon = step.icon;
          return (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: i * 0.1, ease: "easeOut" }}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className="relative flex flex-col items-center text-center p-5 sm:p-6 rounded-2xl bg-gradient-to-b from-muted/50 to-muted/30 border border-border/60 shadow-sm hover:shadow-md hover:border-primary/20 transition-shadow"
            >
              <motion.div
                initial={{ scale: 0.8 }}
                whileInView={{ scale: 1 }}
                viewport={{ once: true }}
                transition={{ type: "spring", stiffness: 200, damping: 15, delay: i * 0.1 + 0.1 }}
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-primary/15 text-primary flex items-center justify-center mb-4 ring-2 ring-primary/10"
              >
                <Icon className="w-6 h-6 sm:w-7 sm:h-7" />
              </motion.div>
              <span className="absolute top-3 right-3 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                {step.number}
              </span>
              <h3 className="font-semibold text-foreground text-sm sm:text-base mb-2">
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
