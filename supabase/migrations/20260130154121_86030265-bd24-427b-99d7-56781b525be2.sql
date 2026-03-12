-- Create storage bucket for slide images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('slide-images', 'slide-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to slide images
CREATE POLICY "Public read access for slide images" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'slide-images');

-- Allow anyone to upload slide images (for now, since no auth)
CREATE POLICY "Anyone can upload slide images" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'slide-images');

-- Allow anyone to update their uploaded images
CREATE POLICY "Anyone can update slide images" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'slide-images');

-- Allow anyone to delete slide images
CREATE POLICY "Anyone can delete slide images" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'slide-images');