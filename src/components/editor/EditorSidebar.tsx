import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Palette, Type, AlignLeft, AlignCenter, AlignRight, Check, Plus, Trophy, CheckCircle, ImageIcon, X, Loader2 } from "lucide-react";
import { Slide, GRADIENT_PRESETS, FontFamily, FontSize, TextAlign, SlideDesign, isQuizSlide, isInteractiveSlide, OverlayImagePosition } from "@/types/slides";
import { ThemeId } from "@/types/themes";
import { DesignStyleId } from "@/types/designStyles";
import { ThemeSelector } from "./ThemeSelector";
import { DesignStyleSelector } from "./DesignStyleSelector";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface EditorSidebarProps {
  slide: Slide;
  onUpdateDesign: (design: SlideDesign) => void;
  onUpdateContent?: (content: any) => void;
  selectedThemeId?: ThemeId;
  onSelectTheme?: (themeId: ThemeId) => void;
  selectedDesignStyleId?: DesignStyleId;
  onSelectDesignStyle?: (styleId: DesignStyleId) => void;
  onPremiumThemeBlocked?: () => void;
}

const FONT_OPTIONS: { value: FontFamily; label: string }[] = [
  { value: 'Inter', label: 'Inter' },
  { value: 'Space Grotesk', label: 'Space Grotesk' },
  { value: 'Poppins', label: 'Poppins' },
  { value: 'Lora', label: 'Lora' },
  { value: 'Roboto', label: 'Roboto' },
  { value: 'Open Sans', label: 'Open Sans' },
];

const FONT_SIZE_OPTIONS: { value: FontSize; label: string }[] = [
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'large', label: 'Large' },
];

export function EditorSidebar({ 
  slide, 
  onUpdateDesign, 
  onUpdateContent,
  selectedThemeId = 'neon-cyber', 
  onSelectTheme, 
  selectedDesignStyleId = 'dynamic', 
  onSelectDesignStyle,
  onPremiumThemeBlocked,
}: EditorSidebarProps) {
  // Provide default design object if undefined
  const design = slide.design || {};
  const content = slide.content as any;
  const [customBgColor, setCustomBgColor] = useState(design.backgroundColor || '#6366f1');
  const [customTextColor, setCustomTextColor] = useState(design.textColor || '#ffffff');
  const [showBgPicker, setShowBgPicker] = useState(false);
  const [showTextPicker, setShowTextPicker] = useState(false);
  
  const isQuiz = isQuizSlide(slide.type);
  const isInteractive = isInteractiveSlide(slide.type);

  const updateDesign = (updates: Partial<SlideDesign>) => {
    onUpdateDesign({ ...design, ...updates });
  };

  const updateContent = (updates: any) => {
    if (onUpdateContent) {
      onUpdateContent({ ...content, ...updates });
    }
  };

  return (
    <div className="w-72 flex-shrink-0 border-l border-border/50 bg-card/30 flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
      {/* Slide Type Badge */}
      <div className="pb-4 border-b border-border/50">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
            <Palette className="w-4 h-4 text-primary" />
            Slide Design
          </h3>
          {isQuiz && (
            <span className="px-2 py-1 text-[10px] font-bold rounded-full bg-green-500/20 text-green-600 flex items-center gap-1">
              <Trophy className="w-3 h-3" />
              QUIZ
            </span>
          )}
          {isInteractive && (
            <span className="px-2 py-1 text-[10px] font-bold rounded-full bg-blue-500/20 text-blue-600">
              INTERACTIVE
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {isQuiz ? 'Competition slide with correct answer' : isInteractive ? 'Engagement slide, no scoring' : 'Static content slide'}
        </p>
      </div>

      {/* Quiz Settings - Only for quiz slides */}
      {isQuiz && onUpdateContent && (
        <div className="space-y-4 pb-4 border-b border-border/50">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <Label className="text-sm font-medium">Correct Answer</Label>
          </div>
          
          {/* Yes/No correct answer */}
          {slide.type === 'yesno' && (
            <RadioGroup
              value={content.correctAnswer === true ? 'yes' : content.correctAnswer === false ? 'no' : 'none'}
              onValueChange={(value) => updateContent({ 
                correctAnswer: value === 'yes' ? true : value === 'no' ? false : undefined 
              })}
              className="flex gap-3"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="yes" id="yes" />
                <Label htmlFor="yes" className="text-sm cursor-pointer">Yes</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="no" id="no" />
                <Label htmlFor="no" className="text-sm cursor-pointer">No</Label>
              </div>
            </RadioGroup>
          )}
          
          {/* Quiz correct answer (already handled in main editor, show indicator) */}
          {slide.type === 'quiz' && (
            <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/20">
              <p className="text-xs text-green-700">
                Click on an option in the slide to set it as correct
              </p>
              {typeof content.correctAnswer === 'number' && content.options && (
                <p className="text-sm font-medium text-green-600 mt-1">
                  ✓ {content.options[content.correctAnswer]}
                </p>
              )}
            </div>
          )}
          
          {/* Guess Number correct answer */}
          {slide.type === 'guess_number' && (
            <div className="space-y-2">
              <Input
                type="number"
                value={content.correctNumber || ''}
                onChange={(e) => updateContent({ correctNumber: parseInt(e.target.value) || 0 })}
                placeholder="Correct number"
                className="h-9"
              />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs text-muted-foreground">Min</Label>
                  <Input
                    type="number"
                    value={content.minRange || 1}
                    onChange={(e) => updateContent({ minRange: parseInt(e.target.value) || 1 })}
                    className="h-8"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Max</Label>
                  <Input
                    type="number"
                    value={content.maxRange || 100}
                    onChange={(e) => updateContent({ maxRange: parseInt(e.target.value) || 100 })}
                    className="h-8"
                  />
                </div>
              </div>
            </div>
          )}
          
          {/* Ranking correct order */}
          {slide.type === 'ranking' && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                The order shown in the editor is the correct order
              </p>
              {content.items && (
                <div className="space-y-1">
                  {content.items.map((item: string, index: number) => (
                    <div key={index} className="flex items-center gap-2 p-2 rounded bg-muted/50 text-xs">
                      <span className="w-5 h-5 rounded-full bg-green-500/20 text-green-600 flex items-center justify-center text-[10px] font-bold">
                        {index + 1}
                      </span>
                      <span className="truncate">{item}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          
        </div>
      )}


      {/* Theme Selector */}
      {onSelectTheme && (
        <div className="space-y-3 pb-4 border-b border-border/50">
          <ThemeSelector
            selectedThemeId={selectedThemeId}
            onSelectTheme={onSelectTheme}
            onPremiumBlocked={onPremiumThemeBlocked}
          />
        </div>
      )}

      {/* Slide Image Overlay - Moved higher for visibility */}
      <SlideImageOverlay 
        design={design} 
        onUpdateDesign={updateDesign} 
      />

      {/* Background Gradients */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Background</Label>
        <div className="grid grid-cols-5 gap-2">
          {GRADIENT_PRESETS.map((preset) => (
            <motion.button
              key={preset.id}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => updateDesign({ gradientPreset: preset.id, backgroundColor: undefined })}
              className={`
                relative w-full aspect-square rounded-lg overflow-hidden shadow-sm
                ${design.gradientPreset === preset.id && !design.backgroundColor ? 'ring-2 ring-primary ring-offset-1' : ''}
              `}
              style={{
                background: `linear-gradient(${preset.angle}deg, ${preset.colors.join(', ')})`,
              }}
              title={preset.name}
            >
              {design.gradientPreset === preset.id && !design.backgroundColor && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
            </motion.button>
          ))}
          
          {/* Custom Color Picker - Rainbow gradient button */}
          <Popover open={showBgPicker} onOpenChange={setShowBgPicker}>
            <PopoverTrigger asChild>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className={`
                  relative w-full aspect-square rounded-lg overflow-hidden shadow-sm border-2
                  ${design.backgroundColor ? 'ring-2 ring-primary ring-offset-1' : 'border-muted-foreground/30'}
                `}
                style={{ 
                  background: design.backgroundColor 
                    ? design.backgroundColor 
                    : 'conic-gradient(from 0deg, #ff0000, #ff8000, #ffff00, #80ff00, #00ff00, #00ff80, #00ffff, #0080ff, #0000ff, #8000ff, #ff00ff, #ff0080, #ff0000)'
                }}
                title="Custom color picker"
              >
                {design.backgroundColor && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
              </motion.button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-3" align="start">
              <div className="space-y-2">
                <Label className="text-xs">Custom Color</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={customBgColor}
                    onChange={(e) => setCustomBgColor(e.target.value)}
                    className="w-10 h-8 p-0 border-0 cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={customBgColor}
                    onChange={(e) => setCustomBgColor(e.target.value)}
                    className="flex-1 h-8 text-xs font-mono"
                    placeholder="#000000"
                  />
                </div>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    updateDesign({ backgroundColor: customBgColor, gradientPreset: undefined });
                    setShowBgPicker(false);
                  }}
                  className="w-full py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium"
                >
                  Apply
                </motion.button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Text Color */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Text Color</Label>
        <div className="flex gap-2 flex-wrap">
          {['#ffffff', '#000000', '#f1f5f9', '#fef3c7', '#dbeafe'].map((color) => (
            <motion.button
              key={color}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => updateDesign({ textColor: color })}
              className={`
                w-7 h-7 rounded-md shadow-sm border-2
                ${design.textColor === color ? 'border-primary ring-1 ring-primary' : 'border-border'}
              `}
              style={{ backgroundColor: color }}
            />
          ))}
          
          {/* Custom Text Color Picker - Rainbow gradient button */}
          <Popover open={showTextPicker} onOpenChange={setShowTextPicker}>
            <PopoverTrigger asChild>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className={`
                  w-7 h-7 rounded-md shadow-sm border-2 relative overflow-hidden
                  ${design.textColor && !['#ffffff', '#000000', '#f1f5f9', '#fef3c7', '#dbeafe'].includes(design.textColor) 
                    ? 'ring-1 ring-primary' 
                    : 'border-muted-foreground/30'}
                `}
                style={{ 
                  background: design.textColor && !['#ffffff', '#000000', '#f1f5f9', '#fef3c7', '#dbeafe'].includes(design.textColor) 
                    ? design.textColor 
                    : 'conic-gradient(from 0deg, #ff0000, #ff8000, #ffff00, #80ff00, #00ff00, #00ff80, #00ffff, #0080ff, #0000ff, #8000ff, #ff00ff, #ff0080, #ff0000)'
                }}
                title="Custom text color picker"
              >
                {design.textColor && !['#ffffff', '#000000', '#f1f5f9', '#fef3c7', '#dbeafe'].includes(design.textColor) && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                    <Check className="w-2 h-2 text-white" />
                  </div>
                )}
              </motion.button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-3" align="start">
              <div className="space-y-2">
                <Label className="text-xs">Custom Text Color</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={customTextColor}
                    onChange={(e) => setCustomTextColor(e.target.value)}
                    className="w-10 h-8 p-0 border-0 cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={customTextColor}
                    onChange={(e) => setCustomTextColor(e.target.value)}
                    className="flex-1 h-8 text-xs font-mono"
                    placeholder="#ffffff"
                  />
                </div>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    updateDesign({ textColor: customTextColor });
                    setShowTextPicker(false);
                  }}
                  className="w-full py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium"
                >
                  Apply
                </motion.button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Typography */}
      <div className="space-y-3">
        <Label className="text-sm font-medium flex items-center gap-2">
          <Type className="w-4 h-4" />
          Typography
        </Label>
        
        {/* Font Family */}
        <Select
          value={design.fontFamily || 'Inter'}
          onValueChange={(value) => updateDesign({ fontFamily: value as FontFamily })}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select font" />
          </SelectTrigger>
          <SelectContent>
            {FONT_OPTIONS.map((font) => (
              <SelectItem key={font.value} value={font.value} style={{ fontFamily: font.value }}>
                {font.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Font Size */}
        <Select
          value={design.fontSize || 'medium'}
          onValueChange={(value) => updateDesign({ fontSize: value as FontSize })}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Font size" />
          </SelectTrigger>
          <SelectContent>
            {FONT_SIZE_OPTIONS.map((size) => (
              <SelectItem key={size.value} value={size.value}>
                {size.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Text Alignment & Direction */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Alignment</Label>
          {/* RTL Toggle */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              const nextDir = (design.direction || 'ltr') === 'rtl' ? 'ltr' : 'rtl';
              const next: Partial<SlideDesign> = { direction: nextDir };

              // Keep center alignment if user chose it; otherwise align with direction.
              if (design.textAlign !== 'center') {
                next.textAlign = nextDir === 'rtl' ? 'right' : 'left';
              }

              updateDesign(next);
            }}
            className={`
              px-2 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1
              ${(design.direction || 'ltr') === 'rtl'
                ? 'bg-primary text-primary-foreground' 
                : 'bg-muted/50 text-muted-foreground hover:bg-muted'
              }
            `}
            title="Toggle RTL (Right-to-Left) for Hebrew text"
          >
            <span className="text-[10px]">עב</span>
            <span>RTL</span>
          </motion.button>
        </div>
        <div className="flex gap-2">
          {[
            { value: 'left', icon: AlignLeft, label: 'LTR' },
            { value: 'center', icon: AlignCenter, label: 'Center' },
            { value: 'right', icon: AlignRight, label: 'RTL' },
          ].map(({ value, icon: Icon }) => (
            <motion.button
              key={value}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => updateDesign({ textAlign: value as TextAlign })}
              className={`
                flex-1 p-2 rounded-lg border transition-all
                ${design.textAlign === value 
                  ? 'bg-primary text-primary-foreground border-primary' 
                  : 'bg-muted/50 text-muted-foreground border-border hover:border-primary/50'
                }
              `}
            >
              <Icon className="w-4 h-4 mx-auto" />
            </motion.button>
          ))}
        </div>
      </div>


      {/* Slide Type Info */}
      <div className="pt-4 border-t border-border/50">
        <div className="p-3 rounded-lg bg-muted/50">
          <p className="text-xs text-muted-foreground">Slide Type</p>
          <p className="font-medium text-foreground capitalize">{slide.type.replace('_', ' ')}</p>
        </div>
      </div>
      </div>
    </div>
  );
}

// Slide Image Overlay Component - Improved design
function SlideImageOverlay({ 
  design, 
  onUpdateDesign 
}: { 
  design: SlideDesign; 
  onUpdateDesign: (updates: Partial<SlideDesign>) => void;
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [urlInput, setUrlInput] = useState(design.overlayImageUrl || '');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setUrlInput(design.overlayImageUrl || '');
  }, [design.overlayImageUrl]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be smaller than 5MB');
      return;
    }

    setIsUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
      const filePath = `overlays/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('slide-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      let displayUrl: string;
      try {
        const { data: signedData } = await supabase.storage
          .from('slide-images')
          .createSignedUrl(filePath, 60 * 60 * 24 * 365); // 1 year
        if (signedData?.signedUrl) {
          displayUrl = signedData.signedUrl;
        } else {
          const { data: publicData } = supabase.storage.from('slide-images').getPublicUrl(filePath);
          displayUrl = publicData.publicUrl;
        }
      } catch {
        const { data: publicData } = supabase.storage.from('slide-images').getPublicUrl(filePath);
        displayUrl = publicData.publicUrl;
      }
      onUpdateDesign({ 
        overlayImageUrl: displayUrl,
        overlayImagePosition: design.overlayImagePosition || 'background'
      });
      toast.success('Image uploaded');
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error('Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  };

  const handleUrlSubmit = () => {
    if (urlInput.trim()) {
      onUpdateDesign({ 
        overlayImageUrl: urlInput.trim(),
        overlayImagePosition: design.overlayImagePosition || 'background'
      });
      setShowUrlInput(false);
    }
  };

  const clearImage = () => {
    onUpdateDesign({ overlayImageUrl: undefined, overlayImagePosition: 'none' });
    setUrlInput('');
  };

  return (
    <div className="space-y-3 pb-4 border-b border-border/50">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-primary" />
          Slide Image
        </Label>
        {design.overlayImageUrl && (
          <button
            onClick={clearImage}
            className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
            title="Remove image"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {design.overlayImageUrl ? (
        <div className="space-y-3">
          {/* Image preview - nicer styling */}
          <div className="relative group rounded-xl overflow-hidden border-2 border-border/50 bg-muted/30 shadow-sm">
            <div className="aspect-video">
              <img 
                src={design.overlayImageUrl} 
                alt="Slide overlay" 
                className="w-full h-full object-cover"
              />
            </div>
            {/* Overlay with change button */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs"
              >
                <ImageIcon className="w-3 h-3 mr-1" />
                Change
              </Button>
            </div>
          </div>

          {/* Position selector - improved visual design */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground font-medium">Position</Label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { value: 'background', label: 'BG', icon: '◐' },
                { value: 'left', label: 'Left', icon: '◧' },
                { value: 'right', label: 'Right', icon: '◨' },
              ].map((option) => (
                <motion.button
                  key={option.value}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onUpdateDesign({ overlayImagePosition: option.value as OverlayImagePosition })}
                  className={`
                    py-2 px-3 rounded-lg border text-xs font-medium transition-all flex flex-col items-center gap-1
                    ${design.overlayImagePosition === option.value 
                      ? 'bg-primary text-primary-foreground border-primary shadow-sm' 
                      : 'bg-muted/50 text-muted-foreground border-border hover:border-primary/50 hover:bg-muted'
                    }
                  `}
                >
                  <span className="text-base">{option.icon}</span>
                  <span>{option.label}</span>
                </motion.button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
          
          {/* Upload area - improved design */}
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className={`
              w-full py-6 px-4 rounded-xl border-2 border-dashed border-border/70 
              bg-muted/30 hover:bg-muted/50 hover:border-primary/40 
              transition-all flex flex-col items-center gap-2
              ${isUploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            {isUploading ? (
              <>
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <span className="text-xs text-muted-foreground">Uploading...</span>
              </>
            ) : (
              <>
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <ImageIcon className="w-5 h-5 text-primary" />
                </div>
                <span className="text-sm font-medium text-foreground">Upload Image</span>
                <span className="text-xs text-muted-foreground">or drag and drop</span>
              </>
            )}
          </motion.button>

          {/* URL input toggle */}
          {showUrlInput ? (
            <div className="flex gap-2">
              <Input
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="Paste image URL..."
                className="flex-1 h-9 text-xs"
                onKeyDown={(e) => e.key === 'Enter' && handleUrlSubmit()}
              />
              <Button 
                onClick={handleUrlSubmit}
                disabled={!urlInput.trim()}
                size="sm"
                className="h-9 px-3"
              >
                Add
              </Button>
              <Button 
                onClick={() => setShowUrlInput(false)}
                size="sm"
                variant="ghost"
                className="h-9 px-2"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <button
              onClick={() => setShowUrlInput(true)}
              className="w-full text-center text-xs text-muted-foreground hover:text-primary transition-colors py-1"
            >
              Or use image URL
            </button>
          )}
        </div>
      )}
    </div>
  );
}
