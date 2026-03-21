import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return new Response(
        JSON.stringify({ error: 'No file provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const fileName = file.name.toLowerCase();
    const fileBuffer = await file.arrayBuffer();
    
    // Convert ArrayBuffer to base64 in chunks to avoid stack overflow
    const uint8Array = new Uint8Array(fileBuffer);
    let base64Content = '';
    const chunkSize = 8192;
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.slice(i, i + chunkSize);
      base64Content += String.fromCharCode(...chunk);
    }
    base64Content = btoa(base64Content);

    // Determine file type
    const isPDF = fileName.endsWith('.pdf');
    const isPPTX = fileName.endsWith('.pptx') || fileName.endsWith('.ppt');
    const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(fileName);
    
    if (!isPDF && !isPPTX && !isImage) {
      return new Response(
        JSON.stringify({ error: 'Unsupported file format. Please upload PDF, PPTX, or image files.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // For images, create a single slide with the image
    if (isImage) {
      const dataUrl = `data:${file.type};base64,${base64Content}`;
      return new Response(
        JSON.stringify({
          slides: [{
            pageNumber: 1,
            imageUrl: dataUrl,
            title: file.name.replace(/\.[^/.]+$/, ''),
            type: 'image',
          }],
          totalPages: 1,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // For PDF/PPTX, use AI to analyze and extract slides
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      console.log('LOVABLE_API_KEY not found, returning placeholder');
      return new Response(
        JSON.stringify({
          slides: [{
            pageNumber: 1,
            imageUrl: null,
            title: `Imported: ${file.name}`,
            content: 'For best results, export your slides as individual images (PNG/JPG) and upload them.',
            type: 'content',
          }],
          totalPages: 1,
          message: 'AI processing not available. Please export slides as images.',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing ${isPDF ? 'PDF' : 'PPTX'} file: ${fileName}`);
    
    // Use AI to analyze the document
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are a presentation analyzer. Analyze the uploaded document and extract ALL slides/pages.
For each slide, extract:
- The slide number (pageNumber)
- The main title or heading
- The content/body text
- The type of slide (title, content, image, bullet_points)

IMPORTANT: You MUST identify and return ALL slides in the presentation, not just one.
Count the total number of slides/pages and create an entry for each one.

Return a JSON object with this exact structure:
{
  "slides": [
    {
      "pageNumber": 1,
      "title": "Slide title here",
      "content": "Main content or bullet points as text",
      "type": "title" | "content" | "bullet_points"
    },
    // ... more slides
  ],
  "totalPages": <number of slides>
}

If you cannot read the content clearly, still create entries for each page you can detect with placeholder content.`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analyze this ${isPDF ? 'PDF document' : 'PowerPoint presentation'} named "${file.name}". 
                
Extract ALL slides/pages and their content. Make sure to identify every slide in the document and return them all.
If the document has multiple pages/slides, return an array with all of them.`
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${isPDF ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.presentationml.presentation'};base64,${base64Content}`,
                },
              },
            ],
          },
        ],
        max_tokens: 8000,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      
      // If AI fails, return a helpful fallback
      return new Response(
        JSON.stringify({
          slides: [{
            pageNumber: 1,
            imageUrl: null,
            title: `Imported: ${file.name}`,
            content: 'Could not parse this file format. For best results, export your presentation slides as individual images (PNG/JPG) and upload them.',
            type: 'content',
          }],
          totalPages: 1,
          message: 'AI parsing failed. Try uploading slides as images instead.',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiResult = await response.json();
    const content = aiResult.choices?.[0]?.message?.content;
    
    if (!content) {
      console.error('No content from AI');
      return new Response(
        JSON.stringify({
          slides: [{
            pageNumber: 1,
            title: `Imported: ${file.name}`,
            content: 'Could not extract content. Try exporting as images.',
            type: 'content',
          }],
          totalPages: 1,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const parsed = JSON.parse(content);
    console.log(`Successfully parsed ${parsed.slides?.length || 0} slides`);
    
    // Ensure slides array exists and has proper format
    if (!parsed.slides || !Array.isArray(parsed.slides) || parsed.slides.length === 0) {
      return new Response(
        JSON.stringify({
          slides: [{
            pageNumber: 1,
            title: `Imported: ${file.name}`,
            content: 'Could not extract slides. Try exporting as images.',
            type: 'content',
          }],
          totalPages: 1,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify(parsed),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error parsing presentation:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to parse presentation';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
