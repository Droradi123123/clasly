-- Migration: Strip base64 image data from lectures.slides JSONB
-- Root cause: AI-generated images stored as data:image/png;base64,... strings
-- made the lectures table 689 MB (> 512 MB DB RAM), causing Supabase crashes.
-- Images now go to Supabase Storage; only public URLs belong in the DB.

-- Step 1: Strip base64 from design.overlayImageUrl
UPDATE public.lectures
SET slides = (
  SELECT jsonb_agg(
    CASE
      WHEN slide->'design'->>'overlayImageUrl' LIKE 'data:image%'
      THEN jsonb_set(slide, '{design}', (slide->'design') - 'overlayImageUrl')
      ELSE slide
    END
  )
  FROM jsonb_array_elements(slides) AS slide
)
WHERE slides::text LIKE '%data:image%';

-- Step 2: Strip base64 from content.imageUrl
UPDATE public.lectures
SET slides = (
  SELECT jsonb_agg(
    CASE
      WHEN slide->'content'->>'imageUrl' LIKE 'data:image%'
      THEN jsonb_set(slide, '{content}', (slide->'content') - 'imageUrl')
      ELSE slide
    END
  )
  FROM jsonb_array_elements(slides) AS slide
)
WHERE slides::text LIKE '%data:image%';

-- Step 3: Strip base64 from design.logoUrl (rare but possible)
UPDATE public.lectures
SET slides = (
  SELECT jsonb_agg(
    CASE
      WHEN slide->'design'->>'logoUrl' LIKE 'data:image%'
      THEN jsonb_set(slide, '{design}', (slide->'design') - 'logoUrl')
      ELSE slide
    END
  )
  FROM jsonb_array_elements(slides) AS slide
)
WHERE slides::text LIKE '%data:image%';

-- Step 4: Strip imagePrompt fields (generation artifacts, no value in DB)
UPDATE public.lectures
SET slides = (
  SELECT jsonb_agg(
    CASE
      WHEN slide ? 'imagePrompt'
      THEN slide - 'imagePrompt'
      ELSE slide
    END
  )
  FROM jsonb_array_elements(slides) AS slide
)
WHERE slides::text LIKE '%imagePrompt%';
