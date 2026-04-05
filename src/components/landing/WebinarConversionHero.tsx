import { motion } from "framer-motion";
import { Link2, UserPlus, MousePointerClick } from "lucide-react";

const features = [
  {
    icon: UserPlus,
    title: "Capture leads on entry",
    description:
      "Every attendee fills a short registration form before joining — you walk away with qualified contacts, not just viewer counts.",
    gradient: "from-violet-500 to-purple-600",
  },
  {
    icon: Link2,
    title: "Pop a link to every phone",
    description:
      "One tap sends a CTA button to every attendee's screen, right when interest peaks — book a call, grab a resource, or start a trial.",
    gradient: "from-amber-500 to-orange-600",
  },
  {
    icon: MousePointerClick,
    title: "Turn attention into action",
    description:
      "Polls and quizzes keep the room engaged; the live CTA converts that attention into clicks while you still have it.",
    gradient: "from-teal-500 to-emerald-600",
  },
];

export default function WebinarConversionHero() {
  return (
    <section className="relative py-16 sm:py-20 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/[0.03] to-background" />
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-4">
            <MousePointerClick className="w-4 h-4" />
            Built for conversion
          </span>
          <h2 className="text-3xl sm:text-4xl font-display font-bold text-foreground">
            Engagement that drives revenue
          </h2>
          <p className="mt-3 text-lg text-muted-foreground max-w-2xl mx-auto">
            Clasly gives you the tools other webinar platforms leave out — lead capture on join,
            a live CTA button on every phone, and real-time signals so you know when to make the ask.
          </p>
        </motion.div>

        <div className="grid gap-6 md:grid-cols-3">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: i * 0.12 }}
              className="group relative rounded-2xl border border-border/60 bg-card/70 backdrop-blur p-6 shadow-lg hover:shadow-xl transition-shadow"
            >
              <div
                className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${f.gradient} text-white mb-4 shadow-md`}
              >
                <f.icon className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
