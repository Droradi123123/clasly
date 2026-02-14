import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Sparkles, ArrowRight, Play } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CTASection() {
  const navigate = useNavigate();

  return (
    <section className="py-20 px-4">
      <div className="container mx-auto max-w-4xl">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="relative overflow-hidden bg-gradient-primary rounded-3xl p-8 md:p-12 text-center shadow-2xl"
        >
          {/* Background decoration */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 left-0 w-64 h-64 bg-white rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
            <div className="absolute bottom-0 right-0 w-64 h-64 bg-white rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
          </div>

          <div className="relative z-10">
            <motion.div
              initial={{ scale: 0 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true }}
              transition={{ type: "spring", delay: 0.2 }}
              className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-6"
            >
              <Sparkles className="w-8 h-8 text-white" />
            </motion.div>

            <h2 className="text-2xl md:text-4xl font-display font-bold text-primary-foreground mb-4">
              Ready to Create Something Amazing?
            </h2>
            <p className="text-primary-foreground/80 mb-8 max-w-xl mx-auto">
              Your first AI-generated presentation is just one prompt away. 
              No signup required to try.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="xl" 
                variant="glass"
                onClick={() => navigate("/dashboard")}
                className="bg-white/90 text-primary hover:bg-white"
              >
                <Sparkles className="w-5 h-5" />
                Start Creating Free
              </Button>
              <Button 
                size="xl" 
                variant="outline"
                className="border-white/30 text-primary-foreground hover:bg-white/10"
                onClick={() => navigate("/pricing")}
              >
                View Plans
                <ArrowRight className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
