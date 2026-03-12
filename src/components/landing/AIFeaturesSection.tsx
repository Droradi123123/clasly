import { motion } from "framer-motion";
import { Sparkles, Zap, Palette, LayoutGrid, Users, Clock } from "lucide-react";

const features = [
  {
    icon: Sparkles,
    title: "AI Content Generation",
    description: "Describe your topic, AI writes compelling content, questions, and talking points.",
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    icon: LayoutGrid,
    title: "Smart Slide Structure",
    description: "AI automatically creates the perfect mix of content slides and interactive elements.",
    color: "text-accent",
    bgColor: "bg-accent/10",
  },
  {
    icon: Palette,
    title: "Visual Consistency",
    description: "Every slide is professionally designed with cohesive themes and animations.",
    color: "text-success",
    bgColor: "bg-success/10",
  },
  {
    icon: Users,
    title: "Instant Engagement",
    description: "Built-in quizzes, polls, and word clouds to keep your audience active.",
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    icon: Clock,
    title: "Save Hours",
    description: "What used to take hours now takes seconds. Focus on delivery, not design.",
    color: "text-accent",
    bgColor: "bg-accent/10",
  },
  {
    icon: Zap,
    title: "Real-Time Results",
    description: "See responses live as they come in. React and adapt on the fly.",
    color: "text-success",
    bgColor: "bg-success/10",
  },
];

export default function AIFeaturesSection() {
  return (
    <section className="py-20 px-4 bg-card/50">
      <div className="container mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            <Sparkles className="w-4 h-4" />
            Why AI-Powered?
          </div>
          <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
            Let AI Do the Heavy Lifting
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Stop spending hours on slide design. Our AI understands your content and creates 
            engaging presentations that actually work.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="group relative bg-card rounded-2xl p-6 border border-border/50 hover:border-primary/30 transition-all hover:shadow-lg"
            >
              <div className={`w-12 h-12 rounded-xl ${feature.bgColor} flex items-center justify-center mb-4`}>
                <feature.icon className={`w-6 h-6 ${feature.color}`} />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>

        {/* Comparison section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-20 grid md:grid-cols-2 gap-8"
        >
          {/* Traditional way */}
          <div className="bg-muted/30 rounded-2xl p-8 border border-border/50">
            <h3 className="text-lg font-semibold text-muted-foreground mb-6">Traditional Way</h3>
            <ul className="space-y-4">
              {[
                "Research and write content manually",
                "Design each slide from scratch",
                "Create quiz questions separately",
                "No real-time audience feedback",
                "Takes 2-4 hours per presentation",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-muted-foreground">
                  <span className="text-destructive">✗</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* With Clasly */}
          <div className="bg-gradient-to-br from-primary/10 to-accent/10 rounded-2xl p-8 border border-primary/20">
            <h3 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              With Clasly
            </h3>
            <ul className="space-y-4">
              {[
                "AI generates content from your topic",
                "Professional design applied instantly",
                "Interactive elements built-in",
                "Live responses and engagement",
                "Ready in under 30 seconds",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-foreground">
                  <span className="text-success">✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
