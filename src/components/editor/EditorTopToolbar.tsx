import { useState } from "react";
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
import { Slide, SlideDesign, FontFamily, FontSize, TextAlign, GRADIENT_PRESETS } from "@/types/slides";
import { ThemeId } from "@/types/themes";
import { ThemeSelector } from "./ThemeSelector";

interface EditorTopToolbarProps {
  slide: Slide;
  onUpdateDesign: (design: SlideDesign) => void;
  selectedThemeId: ThemeId;
  onSelectTheme: (themeId: ThemeId) => void;
  onPremiumThemeBlocked?: () => void;
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
}: EditorTopToolbarProps) {
  const design = slide.design || {};
  const [showBgPicker, setShowBgPicker] = useState(false);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [customBgColor, setCustomBgColor] = useState(design.backgroundColor || "#6366f1");

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
                  <Label className="text-xs text-muted-foreground">Custom Color</Label>
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
        </div>
      </div>
    </div>
  );
}
