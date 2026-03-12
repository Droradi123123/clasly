import { motion } from "framer-motion";
import { Shield, Zap, Users, Lock } from "lucide-react";

const trustPoints = [
  {
    icon: Shield,
    title: "Enterprise-Grade Security",
    description: "Your data is encrypted and protected with industry-leading security standards.",
  },
  {
    icon: Zap,
    title: "No Commitment Required",
    description: "Start for free. No credit card needed. Create your first presentation in seconds.",
  },
  {
    icon: Users,
    title: "Trusted by Professionals",
    description: "Used by educators, trainers, and businesses to engage thousands of audiences.",
  },
  {
    icon: Lock,
    title: "Private by Default",
    description: "Your presentations and audience data stay private. You control who sees what.",
  },
];

export default function TrustSection() {
  return (
    <section className="py-16 px-4 border-t border-border/50">
      <div className="container mx-auto max-w-6xl">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {trustPoints.map((point, index) => (
            <motion.div
              key={point.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="text-center"
            >
              <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                <point.icon className="w-6 h-6 text-muted-foreground" />
              </div>
              <h3 className="font-medium text-foreground mb-1">{point.title}</h3>
              <p className="text-sm text-muted-foreground">{point.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
