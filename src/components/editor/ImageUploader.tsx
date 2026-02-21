import { useState, useRef } from "react";
import { Upload, Image, Link as LinkIcon, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SlideImage } from "@/components/editor/SlideImage";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ImageUploaderProps {
  value?: string;
  onChange: (url: string) => void;
  placeholder?: string;
  className?: string;
}

export function ImageUploader({ 
  value, 
  onChange, 
  placeholder = "Add an image...",
  className = ""
}: ImageUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [urlInput, setUrlInput] = useState(value || '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be smaller than 5MB');
      return;
    }

    setIsUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
      const filePath = `slides/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('slide-images')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      // Use public URL when bucket is public – stable, no expiry, fewer CORS issues
      const { data: publicData } = supabase.storage.from('slide-images').getPublicUrl(filePath);
      const displayUrl = publicData.publicUrl;
      onChange(displayUrl);
      toast.success('Image uploaded successfully');
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error('Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  };

  const handleUrlSubmit = () => {
    if (urlInput.trim()) {
      onChange(urlInput.trim());
    }
  };

  const clearImage = () => {
    onChange('');
    setUrlInput('');
  };

  if (value) {
    return (
      <div className={`relative rounded-lg overflow-hidden ${className}`}>
        <SlideImage
          src={value}
          alt="Uploaded"
          className="w-full h-full object-cover"
        />
        <button
          onClick={clearImage}
          className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 hover:bg-black/80 text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className={`border-2 border-dashed border-white/20 rounded-lg p-4 ${className}`}>
      <Tabs defaultValue="upload" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-white/10">
          <TabsTrigger value="upload" className="data-[state=active]:bg-white/20">
            <Upload className="w-4 h-4 mr-2" />
            Upload
          </TabsTrigger>
          <TabsTrigger value="url" className="data-[state=active]:bg-white/20">
            <LinkIcon className="w-4 h-4 mr-2" />
            URL
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="mt-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            variant="ghost"
            className="w-full h-24 flex flex-col items-center justify-center gap-2 text-white/60 hover:text-white hover:bg-white/10 border border-white/10"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                <span className="text-sm">Uploading...</span>
              </>
            ) : (
              <>
                <Image className="w-6 h-6" />
                <span className="text-sm">{placeholder}</span>
              </>
            )}
          </Button>
        </TabsContent>

        <TabsContent value="url" className="mt-4 space-y-2">
          <Input
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="https://example.com/image.jpg"
            className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
          />
          <Button 
            onClick={handleUrlSubmit}
            disabled={!urlInput.trim()}
            variant="ghost" 
            className="w-full text-white/60 hover:text-white hover:bg-white/10"
          >
            Apply URL
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  );
}
