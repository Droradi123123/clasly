import { motion } from "framer-motion";
import { Check, Sparkles, Minimize2 } from "lucide-react";
import { DesignStyleId, DesignStyle, getAllDesignStyles } from "@/types/designStyles";
import { cn } from "@/lib/utils";

interface DesignStyleSelectorProps {
  selectedStyleId: DesignStyleId;
  onSelectStyle: (styleId: DesignStyleId) => void;
}

export function DesignStyleSelector({ selectedStyleId, onSelectStyle }: DesignStyleSelectorProps) {
  const styles = getAllDesignStyles();

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-primary" />
        <label className="text-sm font-medium">Presentation Style</label>
      </div>
      
      <div className="grid grid-cols-2 gap-2">
        {styles.map((style) => (
          <DesignStyleCard
            key={style.id}
            style={style}
            isSelected={selectedStyleId === style.id}
            onClick={() => onSelectStyle(style.id)}
          />
        ))}
      </div>
    </div>
  );
}

interface DesignStyleCardProps {
  style: DesignStyle;
  isSelected: boolean;
  onClick: () => void;
}

function DesignStyleCard({ style, isSelected, onClick }: DesignStyleCardProps) {
  const getStyleIcon = () => {
    switch (style.id) {
      case 'minimal':
        return <Minimize2 className="w-5 h-5" />;
      case 'dynamic':
        return <Sparkles className="w-5 h-5" />;
      default:
        return <Sparkles className="w-5 h-5" />;
    }
  };

  const getPreviewContent = () => {
    if (style.id === 'minimal') {
      // Clean, simple bars
      return (
        <div className="flex flex-col gap-1 w-full">
          <div className="h-2 w-full bg-indigo-200 rounded-sm" />
          <div className="h-2 w-3/4 bg-indigo-300 rounded-sm" />
          <div className="h-2 w-1/2 bg-indigo-400 rounded-sm" />
        </div>
      );
    }
    
    // Dynamic - colorful, animated feel
    return (
      <div className="flex gap-1 w-full h-8 items-end">
        <motion.div 
          className="w-1/4 bg-gradient-to-t from-orange-500 to-amber-400 rounded-sm"
          animate={{ height: ["60%", "80%", "60%"] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
        <motion.div 
          className="w-1/4 bg-gradient-to-t from-pink-500 to-rose-400 rounded-sm"
          animate={{ height: ["40%", "100%", "40%"] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
        />
        <motion.div 
          className="w-1/4 bg-gradient-to-t from-violet-500 to-purple-400 rounded-sm"
          animate={{ height: ["80%", "50%", "80%"] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
        />
        <motion.div 
          className="w-1/4 bg-gradient-to-t from-cyan-500 to-blue-400 rounded-sm"
          animate={{ height: ["50%", "70%", "50%"] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: 0.6 }}
        />
      </div>
    );
  };

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        "relative flex flex-col items-center p-3 rounded-xl border-2 transition-all",
        isSelected
          ? "border-primary bg-primary/10 shadow-md"
          : "border-border/50 bg-card/50 hover:border-primary/50 hover:bg-muted/50"
      )}
    >
      {/* Selected check */}
      {isSelected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center shadow-lg z-10"
        >
          <Check className="w-3 h-3 text-primary-foreground" />
        </motion.div>
      )}

      {/* Preview area */}
      <div className="w-full h-10 mb-2 flex items-center justify-center px-2 bg-muted/30 rounded-lg">
        {getPreviewContent()}
      </div>

      {/* Style info */}
      <div className="flex items-center gap-1.5 mb-0.5">
        <span className="text-xs text-muted-foreground">{getStyleIcon()}</span>
        <span className="font-medium text-sm">{style.name}</span>
      </div>
      
      <p className="text-[10px] text-muted-foreground text-center leading-tight">
        {style.description}
      </p>
    </motion.button>
  );
}
