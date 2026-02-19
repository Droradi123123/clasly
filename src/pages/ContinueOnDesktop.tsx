import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Monitor, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Header from "@/components/layout/Header";

const ContinueOnDesktop = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="max-w-md w-full text-center"
        >
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/10 text-primary mb-6">
            <Monitor className="w-10 h-10" />
          </div>
          <h1 className="text-2xl font-display font-bold text-foreground mb-3">
            Continue on Desktop
          </h1>
          <p className="text-muted-foreground mb-8 leading-relaxed">
            Building interactive presentations is available on desktop. Open the site on your computer to create, edit, or present.
          </p>
          <Button
            size="lg"
            variant="outline"
            onClick={() => navigate("/")}
            className="gap-2"
          >
            Back to Home
            <ArrowRight className="w-4 h-4 rtl:rotate-180" />
          </Button>
        </motion.div>
      </main>
    </div>
  );
};

export default ContinueOnDesktop;
