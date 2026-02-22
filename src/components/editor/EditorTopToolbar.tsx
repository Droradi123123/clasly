import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Palette,
  ImageIcon,
  Sparkles,
  Type,
  ChevronDown,
  Loader2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slide, SlideDesign, FontFamily, FontSize, TextAlign, GRADIENT_PRESETS, OverlayImagePosition, LogoPosition, LogoScope } from "@/types/slides";
import { ThemeId } from "@/types/themes";
import { ThemeSelector } from "./ThemeSelector";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Lock } from "lucide-react";

interface EditorTopToolbarProps {
  slide: Slide;
  onUpdateDesign: (design: SlideDesign) => void;
  selectedThemeId: ThemeId;
  onSelectTheme: (themeId: ThemeId) => void;
  onPremiumThemeBlocked?: () => void;
  /** When logo scope is 'all', propagate to all slides */
  onUpdateDesignForAllSlides?: (updates: Partial<SlideDesign>) => void;
  /** Pro-only: logo upload. When false and user tries logo, call this. */
  isPro?: boolean;
  onPremiumLogoBlocked?: () => void;
  /** Pro-only: custom color picker. When false and user tries custom color, call this. */
  onPremiumColorBlocked?: () => void;
}

const FONT_OPTIONS: { value: FontFamily; label: string }[] = [
  { value: "Inter", label: "Inter" },
  { value: "Space Grotesk", label: "Space Grotesk" },
  { value: "Poppins", label: "Poppins" },
  { value: "Lora", label: "Lora" },
  { value: "Roboto", label: "Roboto" },
  { value: "Open Sans", label: "Open Sans" },
];

const FONT_SIZE_OPTIONS: { value: FontSize; label: string; size: string }[] = [
  { value: "small", label: "Small", size: "14" },
  { value: "medium", label: "Medium", size: "18" },
  { value: "large", label: "Large", size: "24" },
];

export function EditorTopToolbar({
  slide,
  onUpdateDesign,
  selectedThemeId,
  onSelectTheme,
  onPremiumThemeBlocked,
  isPro = false,
  onPremiumLogoBlocked,
  onPremiumColorBlocked,
}: EditorTopToolbarProps) {
  const design = slide.design || {};
  const [showBgPicker, setShowBgPicker] = useState(false);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [showLogoPicker, setShowLogoPicker] = useState(false);
  const [customBgColor, setCustomBgColor] = useState(design.backgroundColor || "#6366f1");
  const [imageUrlInput, setImageUrlInput] = useState(design.overlayImageUrl || "");
  const [logoUrlInput, setLogoUrlInput] = useState(design.logoUrl || "");

  useEffect(() => {
    setImageUrlInput(design.overlayImageUrl || "");
  }, [design.overlayImageUrl]);
  useEffect(() => {
    setLogoUrlInput(design.logoUrl || "");
  }, [design.logoUrl]);

  const updateDesign = (updates: Partial<SlideDesign>) => {
    onUpdateDesign({ ...design, ...updates });
  };

  const isRtl = design.direction === "rtl";

  return (
    <div className="flex-shrink-0 border-b border-border/50 bg-card/80 backdrop-blur-sm">
      <div className="flex items-center gap-1 px-4 py-2 overflow-x-auto">
        {/* Group A - Typography */}
        <div className="flex items-center gap-1 pr-3 border-r border-border/50">
          {/* Font Family */}
          <Select
            value={design.fontFamily || "Inter"}
            onValueChange={(value) => updateDesign({ fontFamily: value as FontFamily })}
          >
            <SelectTrigger className="w-[130px] h-8 text-xs">
              <SelectValue placeholder="Font" />
            </SelectTrigger>
            <SelectContent>
              {FONT_OPTIONS.map((font) => (
                <SelectItem
                  key={font.value}
                  value={font.value}
                  style={{ fontFamily: font.value }}
                >
                  {font.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Font Size */}
          <Select
            value={design.fontSize || "medium"}
            onValueChange={(value) => updateDesign({ fontSize: value as FontSize })}
          >
            <SelectTrigger className="w-[90px] h-8 text-xs">
              <SelectValue placeholder="Size" />
            </SelectTrigger>
            <SelectContent>
              {FONT_SIZE_OPTIONS.map((size) => (
                <SelectItem key={size.value} value={size.value}>
                  {size.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Divider */}
          <div className="w-px h-5 bg-border/50 mx-1" />

          {/* Text Color with color bar indicator */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 relative">
                <Type className="w-4 h-4" />
                <div
                  className="absolute bottom-0.5 left-1 right-1 h-1 rounded-full"
                  style={{ backgroundColor: design.textColor || "#ffffff" }}
                />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-3" align="start">
              <div className="space-y-2">
                <Label className="text-xs">Text Color</Label>
                <div className="flex flex-wrap gap-2">
                  {["#ffffff", "#000000", "#f1f5f9", "#fef3c7", "#dbeafe", "#fee2e2", "#d1fae5"].map(
                    (color) => (
                      <motion.button
                        key={color}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => updateDesign({ textColor: color })}
                        className={`w-6 h-6 rounded-md shadow-sm border-2 ${
                          design.textColor === color
                            ? "border-primary ring-1 ring-primary"
                            : "border-border"
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    )
                  )}
                </div>
                <div className="flex gap-2 pt-2">
                  <Input
                    type="color"
                    value={design.textColor || "#ffffff"}
                    onChange={(e) => updateDesign({ textColor: e.target.value })}
                    className="w-10 h-8 p-0 border-0 cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={design.textColor || "#ffffff"}
                    onChange={(e) => updateDesign({ textColor: e.target.value })}
                    className="flex-1 h-8 text-xs font-mono"
                    placeholder="#ffffff"
                  />
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Group B - Alignment & Direction */}
        <div className="flex items-center gap-1 px-3 border-r border-border/50">
          {/* Text Alignment */}
          {[
            { value: "left", icon: AlignLeft },
            { value: "center", icon: AlignCenter },
            { value: "right", icon: AlignRight },
          ].map(({ value, icon: Icon }) => (
            <Button
              key={value}
              variant={design.textAlign === value ? "secondary" : "ghost"}
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => updateDesign({ textAlign: value as TextAlign })}
            >
              <Icon className="w-4 h-4" />
            </Button>
          ))}

          {/* Divider */}
          <div className="w-px h-5 bg-border/50 mx-1" />

          {/* RTL / LTR Toggle */}
          <Button
            variant={isRtl ? "secondary" : "ghost"}
            size="sm"
            className="h-8 px-2 gap-1 text-xs"
            onClick={() => {
              const nextDir = isRtl ? "ltr" : "rtl";
              const updates: Partial<SlideDesign> = { direction: nextDir };
              // Auto-adjust alignment with direction if not centered
              if (design.textAlign !== "center") {
                updates.textAlign = nextDir === "rtl" ? "right" : "left";
              }
              updateDesign(updates);
            }}
          >
            <span className="font-bold">עב</span>
            RTL
          </Button>
          <Button
            variant={!isRtl ? "secondary" : "ghost"}
            size="sm"
            className="h-8 px-2 gap-1 text-xs"
            onClick={() => {
              const updates: Partial<SlideDesign> = { direction: "ltr" };
              if (design.textAlign !== "center") {
                updates.textAlign = "left";
              }
              updateDesign(updates);
            }}
          >
            <span className="font-bold">EN</span>
            LTR
          </Button>
        </div>

        {/* Group C - Slide Style */}
        <div className="flex items-center gap-1 px-3">
          {/* Background Picker */}
          <Popover open={showBgPicker} onOpenChange={setShowBgPicker}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs">
                <div
                  className="w-4 h-4 rounded border border-border/50"
                  style={{
                    background: design.gradientPreset
                      ? (() => {
                          const preset = GRADIENT_PRESETS.find(
                            (g) => g.id === design.gradientPreset
                          );
                          return preset
                            ? `linear-gradient(${preset.angle}deg, ${preset.colors.join(", ")})`
                            : design.backgroundColor || "#6366f1";
                        })()
                      : design.backgroundColor || "#6366f1",
                  }}
                />
                Background
                <ChevronDown className="w-3 h-3" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3" align="start">
              <div className="space-y-3">
                <Label className="text-xs font-medium">Background</Label>
                <div className="grid grid-cols-5 gap-2">
                  {GRADIENT_PRESETS.map((preset) => (
                    <motion.button
                      key={preset.id}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        updateDesign({ gradientPreset: preset.id, backgroundColor: undefined });
                        setShowBgPicker(false);
                      }}
                      className={`w-full aspect-square rounded-lg overflow-hidden shadow-sm ${
                        design.gradientPreset === preset.id && !design.backgroundColor
                          ? "ring-2 ring-primary ring-offset-1"
                          : ""
                      }`}
                      style={{
                        background: `linear-gradient(${preset.angle}deg, ${preset.colors.join(", ")})`,
                      }}
                      title={preset.name}
                    />
                  ))}
                </div>
                <div className="pt-2 border-t border-border/50">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                    Custom Color {!isPro && <Lock className="w-3 h-3 text-amber-500" />}
                  </Label>
                  {isPro ? (
                    <div className="flex gap-2 mt-2">
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
                      <Button
                        size="sm"
                        className="h-8"
                        onClick={() => {
                          updateDesign({ backgroundColor: customBgColor, gradientPreset: undefined });
                          setShowBgPicker(false);
                        }}
                      >
                        Apply
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-2 gap-1.5"
                      onClick={() => onPremiumColorBlocked?.()}
                    >
                      <Lock className="w-3.5 h-3.5" />
                      Unlock with Pro
                    </Button>
                  )}
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Theme Picker */}
          <Popover open={showThemePicker} onOpenChange={setShowThemePicker}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs">
                <Sparkles className="w-4 h-4" />
                Theme
                <ChevronDown className="w-3 h-3" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-3" align="start">
              <ThemeSelector
                selectedThemeId={selectedThemeId}
                onSelectTheme={(id) => {
                  onSelectTheme(id);
                  setShowThemePicker(false);
                }}
                onPremiumBlocked={onPremiumThemeBlocked}
              />
            </PopoverContent>
          </Popover>

          {/* Image Picker - upload or URL */}
          <ImageAndPositionPopover
            design={design}
            imageUrlInput={imageUrlInput}
            setImageUrlInput={setImageUrlInput}
            onUpdateDesign={updateDesign}
            showImagePicker={showImagePicker}
            setShowImagePicker={setShowImagePicker}
            variant="image"
          />

          {/* Logo Picker – Pro only */}
          {isPro ? (
            <ImageAndPositionPopover
              design={design}
              imageUrlInput={logoUrlInput}
              setImageUrlInput={setLogoUrlInput}
              onUpdateDesign={updateDesign}
              onUpdateDesignForAllSlides={onUpdateDesignForAllSlides}
              showImagePicker={showLogoPicker}
              setShowImagePicker={setShowLogoPicker}
              variant="logo"
            />
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 text-xs opacity-70"
              onClick={() => onPremiumLogoBlocked?.()}
              title="Logo upload is a Pro feature"
            >
              <ImageIcon className="w-4 h-4" />
              Logo
              <Lock className="w-3 h-3" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// Shared component for Image and Logo (upload, URL, position)
function ImageAndPositionPopover({
  design,
  imageUrlInput,
  setImageUrlInput,
  onUpdateDesign,
  onUpdateDesignForAllSlides,
  showImagePicker,
  setShowImagePicker,
  variant,
}: {
  design: SlideDesign;
  imageUrlInput: string;
  setImageUrlInput: (v: string) => void;
  onUpdateDesign: (u: Partial<SlideDesign>) => void;
  onUpdateDesignForAllSlides?: (u: Partial<SlideDesign>) => void;
  showImagePicker: boolean;
  setShowImagePicker: (v: boolean) => void;
  variant: "image" | "logo";
}) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isImage = variant === "image";
  const field = isImage ? "overlayImageUrl" : "logoUrl";
  const value = isImage ? design.overlayImageUrl : design.logoUrl;

  const apply = (url: string, extra?: Partial<SlideDesign>) => {
    if (isImage) {
      onUpdateDesign({ overlayImageUrl: url, overlayImagePosition: extra?.overlayImagePosition ?? design.overlayImagePosition ?? "background" });
    } else {
      const updates: Partial<SlideDesign> = {
        logoUrl: url,
        logoPosition: extra?.logoPosition ?? design.logoPosition ?? "top-right",
        logoScope: extra?.logoScope ?? design.logoScope ?? "current",
      };
      if (updates.logoScope === "all" && onUpdateDesignForAllSlides) {
        onUpdateDesignForAllSlides(updates);
      } else {
        onUpdateDesign(updates);
      }
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image must be smaller than 10MB for best quality");
      return;
    }
    setIsUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `overlays/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("slide-images").upload(path, file, { upsert: false });
      if (error) throw error;
      const { data: publicData } = supabase.storage.from("slide-images").getPublicUrl(path);
      // Try signed URL for private buckets; fallback to public (bucket must be Public in Supabase)
      let displayUrl = publicData.publicUrl;
      try {
        const { data: signedData } = await supabase.storage.from("slide-images").createSignedUrl(path, 60 * 60 * 24 * 365);
        if (signedData?.signedUrl) displayUrl = signedData.signedUrl;
      } catch {
        // Use public URL if signed fails (ensure slide-images bucket is Public in Supabase Dashboard)
      }
      apply(displayUrl);
      setImageUrlInput(displayUrl);
      toast.success("Image uploaded");
    } catch (err: any) {
      toast.error(err?.message || "Upload failed");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const clear = () => {
    if (isImage) {
      onUpdateDesign({ overlayImageUrl: undefined, overlayImagePosition: "none" });
    } else {
      const u: Partial<SlideDesign> = { logoUrl: undefined, logoPosition: undefined, logoScope: undefined };
      if (design.logoScope === "all" && onUpdateDesignForAllSlides) {
        onUpdateDesignForAllSlides(u);
      } else {
        onUpdateDesign(u);
      }
    }
    setImageUrlInput("");
  };

  return (
    <Popover open={showImagePicker} onOpenChange={setShowImagePicker}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs">
          <ImageIcon className="w-4 h-4" />
          {isImage ? "Image" : "Logo"}
          {value && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
          <ChevronDown className="w-3 h-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="start">
        <div className="space-y-3">
          <Label className="text-xs font-medium">{isImage ? "Slide Image" : "Logo"}</Label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleUpload}
            className="hidden"
          />
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Upload"}
            </Button>
            <Input
              value={imageUrlInput}
              onChange={(e) => setImageUrlInput(e.target.value)}
              placeholder="Paste image URL"
              className="h-8 text-xs"
              onKeyDown={(e) => e.key === "Enter" && imageUrlInput.trim() && (apply(imageUrlInput.trim()), setShowImagePicker(false))}
            />
            <Button
              size="sm"
              onClick={() => imageUrlInput.trim() && (apply(imageUrlInput.trim()), setShowImagePicker(false))}
              disabled={!imageUrlInput.trim()}
            >
              Add
            </Button>
          </div>
          {value && (
            <>
              <div className="aspect-video rounded-lg overflow-hidden border bg-muted/30">
                <img src={value} alt="" className="w-full h-full object-cover" />
              </div>
              {isImage ? (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Position (half image / half slide)</Label>
                  <div className="grid grid-cols-3 gap-1">
                    {[
                      { v: "left" as OverlayImagePosition, l: "Left" },
                      { v: "right" as OverlayImagePosition, l: "Right" },
                      { v: "background" as OverlayImagePosition, l: "Background" },
                    ].map(({ v, l }) => (
                      <Button
                        key={v}
                        variant={design.overlayImagePosition === v ? "secondary" : "outline"}
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => onUpdateDesign({ overlayImagePosition: v })}
                      >
                        {l}
                      </Button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Logo position</Label>
                  <div className="grid grid-cols-2 gap-1">
                    {(["top-left", "top-right", "bottom-left", "bottom-right"] as LogoPosition[]).map((v) => (
                      <Button
                        key={v}
                        variant={design.logoPosition === v ? "secondary" : "outline"}
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => {
                          const u = { logoPosition: v };
                          design.logoScope === "all" && onUpdateDesignForAllSlides ? onUpdateDesignForAllSlides(u) : onUpdateDesign(u);
                        }}
                      >
                        {v.replace("-", " ")}
                      </Button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground">Scope</Label>
                    <div className="flex gap-1">
                      <Button
                        variant={design.logoScope === "current" ? "secondary" : "outline"}
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => onUpdateDesign({ logoScope: "current" })}
                      >
                        This slide
                      </Button>
                      <Button
                        variant={design.logoScope === "all" ? "secondary" : "outline"}
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => {
                          const u = { logoUrl: design.logoUrl, logoPosition: design.logoPosition ?? "top-right", logoScope: "all" as LogoScope };
                          onUpdateDesignForAllSlides ? onUpdateDesignForAllSlides(u) : onUpdateDesign(u);
                        }}
                      >
                        All slides
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              <Button variant="ghost" size="sm" className="w-full h-8 text-destructive" onClick={clear}>
                <X className="w-4 h-4 mr-1" />
                Remove
              </Button>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
