/**
 * convert-to-images — Converts PPTX to slide images (Visual Replication).
 * Deploy with verify_jwt = false in supabase/config.toml so PPTX import works
 * without 401 (client still sends token when available).
 */
// @ts-ignore - esm.sh modules
import JSZip from "https://esm.sh/jszip@3.10.1";
// @ts-ignore - esm.sh modules
import { DOMParser } from "https://esm.sh/@xmldom/xmldom@0.8.10";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Standard PPTX dimensions in EMUs (English Metric Units)
const EMU_PER_INCH = 914400;
const EMU_PER_POINT = 12700;

// Presentation canvas we render into (matches the app's slide canvas)
const TARGET_SLIDE_WIDTH = 1920;
const TARGET_SLIDE_HEIGHT = 1080;

// Helper to convert ArrayBuffer to base64 in chunks
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 8192;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.slice(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  return btoa(binary);
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Convert EMU to pixels mapped into our target canvas.
// IMPORTANT: slideWidthEmu/slideHeightEmu must come from ppt/presentation.xml (sldSz).
function emuToPixelX(emu: number, slideWidthEmu: number): number {
  return Math.round((emu / slideWidthEmu) * TARGET_SLIDE_WIDTH);
}

function emuToPixelY(emu: number, slideHeightEmu: number): number {
  return Math.round((emu / slideHeightEmu) * TARGET_SLIDE_HEIGHT);
}

function emuToPoints(emu: number): number {
  return Math.round(emu / EMU_PER_POINT);
}

// Parse color from PPTX XML (handles srgbClr, schemeClr, etc.)
function parseColor(colorNode: Element | null, themeColors: Record<string, string>): string {
  if (!colorNode) return '#FFFFFF';
  
  // Check for srgbClr (direct RGB)
  const srgbClr = colorNode.getElementsByTagName('a:srgbClr')[0];
  if (srgbClr) {
    const val = srgbClr.getAttribute('val');
    if (val) return `#${val}`;
  }
  
  // Check for schemeClr (theme reference)
  const schemeClr = colorNode.getElementsByTagName('a:schemeClr')[0];
  if (schemeClr) {
    const val = schemeClr.getAttribute('val');
    if (val && themeColors[val]) return themeColors[val];
  }
  
  return '#FFFFFF';
}

// Parse theme colors from theme XML
function parseThemeColors(themeXml: string): Record<string, string> {
  const colors: Record<string, string> = {
    'dk1': '#000000',
    'lt1': '#FFFFFF',
    'dk2': '#1F497D',
    'lt2': '#EEECE1',
    'accent1': '#4472C4',
    'accent2': '#ED7D31',
    'accent3': '#A5A5A5',
    'accent4': '#FFC000',
    'accent5': '#5B9BD5',
    'accent6': '#70AD47',
    'hlink': '#0563C1',
    'folHlink': '#954F72',
    'tx1': '#000000',
    'tx2': '#1F497D',
    'bg1': '#FFFFFF',
    'bg2': '#EEECE1',
  };
  
  try {
    const doc = new DOMParser().parseFromString(themeXml, 'text/xml');
    const clrScheme = doc.getElementsByTagName('a:clrScheme')[0];
    if (!clrScheme) return colors;
    
    const colorNames = ['dk1', 'lt1', 'dk2', 'lt2', 'accent1', 'accent2', 'accent3', 'accent4', 'accent5', 'accent6', 'hlink', 'folHlink'];
    
    for (const name of colorNames) {
      const colorEl = clrScheme.getElementsByTagName(`a:${name}`)[0];
      if (colorEl) {
        const srgbClr = colorEl.getElementsByTagName('a:srgbClr')[0];
        if (srgbClr) {
          const val = srgbClr.getAttribute('val');
          if (val) colors[name] = `#${val}`;
        }
        const sysClr = colorEl.getElementsByTagName('a:sysClr')[0];
        if (sysClr) {
          const lastClr = sysClr.getAttribute('lastClr');
          if (lastClr) colors[name] = `#${lastClr}`;
        }
      }
    }
  } catch (e) {
    console.error('Error parsing theme colors:', e);
  }
  
  return colors;
}

interface MediaFile {
  path: string;
  data: string; // base64 data URL
  mimeType: string;
}

interface TextRun {
  text: string;
  fontSize: number;
  fontFamily: string;
  bold: boolean;
  italic: boolean;
  color: string;
}

interface TextParagraph {
  runs: TextRun[];
  alignment: string;
  bulletChar?: string;
  level: number;
}

interface ShapeElement {
  type: 'text' | 'image' | 'shape' | 'line';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  paragraphs?: TextParagraph[];
  imageRid?: string;
  fillColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
  shapeType?: string;
}

interface SlideData {
  background: string;
  elements: ShapeElement[];
}

// Extract position and size from shape
function parseTransform(
  spPr: Element,
  slideWidthEmu: number,
  slideHeightEmu: number,
): { x: number; y: number; width: number; height: number; rotation: number } {
  let x = 0, y = 0, width = 0, height = 0, rotation = 0;

  const xfrm = spPr.getElementsByTagName('a:xfrm')[0];
  if (xfrm) {
    rotation = parseInt(xfrm.getAttribute('rot') || '0', 10) / 60000; // Convert from 1/60000 degrees

    const off = xfrm.getElementsByTagName('a:off')[0];
    if (off) {
      x = emuToPixelX(parseInt(off.getAttribute('x') || '0', 10), slideWidthEmu);
      y = emuToPixelY(parseInt(off.getAttribute('y') || '0', 10), slideHeightEmu);
    }

    const ext = xfrm.getElementsByTagName('a:ext')[0];
    if (ext) {
      width = emuToPixelX(parseInt(ext.getAttribute('cx') || '0', 10), slideWidthEmu);
      height = emuToPixelY(parseInt(ext.getAttribute('cy') || '0', 10), slideHeightEmu);
    }
  }

  return { x, y, width, height, rotation };
}

// Parse text body from shape
function parseTextBody(txBody: Element, themeColors: Record<string, string>): TextParagraph[] {
  const paragraphs: TextParagraph[] = [];
  const pNodes = txBody.getElementsByTagName('a:p');
  
  for (let i = 0; i < pNodes.length; i++) {
    const pNode = pNodes[i];
    const runs: TextRun[] = [];
    let alignment = 'left';
    let bulletChar: string | undefined;
    let level = 0;
    
    // Get paragraph properties
    const pPr = pNode.getElementsByTagName('a:pPr')[0];
    if (pPr) {
      const algn = pPr.getAttribute('algn');
      if (algn === 'ctr') alignment = 'center';
      else if (algn === 'r') alignment = 'right';
      else if (algn === 'just') alignment = 'justify';
      
      level = parseInt(pPr.getAttribute('lvl') || '0', 10);
      
      const buChar = pPr.getElementsByTagName('a:buChar')[0];
      if (buChar) {
        bulletChar = buChar.getAttribute('char') || '•';
      }
      const buAutoNum = pPr.getElementsByTagName('a:buAutoNum')[0];
      if (buAutoNum) {
        bulletChar = '•';
      }
    }
    
    // Get runs
    const rNodes = pNode.getElementsByTagName('a:r');
    for (let j = 0; j < rNodes.length; j++) {
      const rNode = rNodes[j];
      const tNode = rNode.getElementsByTagName('a:t')[0];
      if (!tNode || !tNode.textContent) continue;
      
      let fontSize = 24;
      let fontFamily = 'Arial';
      let bold = false;
      let italic = false;
      let color = '#000000';
      
      const rPr = rNode.getElementsByTagName('a:rPr')[0];
      if (rPr) {
        const sz = rPr.getAttribute('sz');
        if (sz) fontSize = Math.round(parseInt(sz, 10) / 100);
        
        const b = rPr.getAttribute('b');
        bold = b === '1' || b === 'true';
        
        const i = rPr.getAttribute('i');
        italic = i === '1' || i === 'true';
        
        // Get color
        const solidFill = rPr.getElementsByTagName('a:solidFill')[0];
        if (solidFill) {
          color = parseColor(solidFill, themeColors);
        }
        
        // Get font
        const latin = rPr.getElementsByTagName('a:latin')[0];
        if (latin) {
          const typeface = latin.getAttribute('typeface');
          if (typeface) fontFamily = typeface;
        }
      }
      
      runs.push({
        text: tNode.textContent,
        fontSize,
        fontFamily,
        bold,
        italic,
        color,
      });
    }
    
    // Also check for field text (a:fld)
    const fldNodes = pNode.getElementsByTagName('a:fld');
    for (let j = 0; j < fldNodes.length; j++) {
      const fldNode = fldNodes[j];
      const tNode = fldNode.getElementsByTagName('a:t')[0];
      if (tNode && tNode.textContent) {
        runs.push({
          text: tNode.textContent,
          fontSize: 24,
          fontFamily: 'Arial',
          bold: false,
          italic: false,
          color: '#000000',
        });
      }
    }
    
    if (runs.length > 0 || bulletChar) {
      paragraphs.push({ runs, alignment, bulletChar, level });
    }
  }
  
  return paragraphs;
}

// Parse slide relationships to map rId to media files
async function parseRelationships(zip: JSZip, slideNum: number): Promise<Record<string, string>> {
  const rels: Record<string, string> = {};
  const relsPath = `ppt/slides/_rels/slide${slideNum}.xml.rels`;
  const relsFile = zip.file(relsPath);
  
  if (relsFile) {
    try {
      const relsXml = await relsFile.async('string');
      const doc = new DOMParser().parseFromString(relsXml, 'text/xml');
      const relNodes = doc.getElementsByTagName('Relationship');
      
      for (let i = 0; i < relNodes.length; i++) {
        const rel = relNodes[i];
        const id = rel.getAttribute('Id');
        const target = rel.getAttribute('Target');
        if (id && target) {
          // Normalize path (remove ../)
          rels[id] = target.replace('../', 'ppt/');
        }
      }
    } catch (e) {
      console.error(`Error parsing rels for slide ${slideNum}:`, e);
    }
  }
  
  return rels;
}

// Extract media files from PPTX
async function extractMedia(zip: JSZip): Promise<Record<string, MediaFile>> {
  const media: Record<string, MediaFile> = {};
  
  const mediaFolder = zip.folder('ppt/media');
  if (mediaFolder) {
    const files = Object.keys(zip.files).filter(path => path.startsWith('ppt/media/'));
    
    for (const path of files) {
      const file = zip.file(path);
      if (file && !file.dir) {
        try {
          const data = await file.async('arraybuffer');
          const base64 = arrayBufferToBase64(data);
          const ext = path.split('.').pop()?.toLowerCase() || '';
          
          let mimeType = 'image/png';
          if (ext === 'jpg' || ext === 'jpeg') mimeType = 'image/jpeg';
          else if (ext === 'gif') mimeType = 'image/gif';
          else if (ext === 'svg') mimeType = 'image/svg+xml';
          else if (ext === 'emf' || ext === 'wmf') mimeType = 'image/png'; // Can't render EMF/WMF
          
          media[path] = {
            path,
            data: `data:${mimeType};base64,${base64}`,
            mimeType,
          };
        } catch (e) {
          console.error(`Error extracting media ${path}:`, e);
        }
      }
    }
  }
  
  return media;
}

// Parse a single slide
function parseSlide(
  slideXml: string,
  themeColors: Record<string, string>,
  rels: Record<string, string>,
  slideWidthEmu: number,
  slideHeightEmu: number,
): SlideData {
  const doc = new DOMParser().parseFromString(slideXml, 'text/xml');
  const elements: ShapeElement[] = [];
  let background = '#FFFFFF';

  // Parse background
  const cSld = doc.getElementsByTagName('p:cSld')[0];
  if (cSld) {
    const bg = cSld.getElementsByTagName('p:bg')[0];
    if (bg) {
      const solidFill = bg.getElementsByTagName('a:solidFill')[0];
      if (solidFill) {
        background = parseColor(solidFill, themeColors);
      }

      const gradFill = bg.getElementsByTagName('a:gradFill')[0];
      if (gradFill) {
        // For gradients, just use the first color
        const gsLst = gradFill.getElementsByTagName('a:gs')[0];
        if (gsLst) {
          background = parseColor(gsLst, themeColors);
        }
      }
    }
  }

  // Parse shapes (sp)
  const shapes = doc.getElementsByTagName('p:sp');
  for (let i = 0; i < shapes.length; i++) {
    const shape = shapes[i];
    const spPr = shape.getElementsByTagName('p:spPr')[0];
    const txBody = shape.getElementsByTagName('p:txBody')[0];

    if (!spPr) continue;

    const transform = parseTransform(spPr, slideWidthEmu, slideHeightEmu);

    // Get fill color
    let fillColor: string | undefined;
    const solidFill = spPr.getElementsByTagName('a:solidFill')[0];
    if (solidFill) {
      fillColor = parseColor(solidFill, themeColors);
    }

    // Get stroke
    let strokeColor: string | undefined;
    let strokeWidth = 0;
    const ln = spPr.getElementsByTagName('a:ln')[0];
    if (ln) {
      const lnFill = ln.getElementsByTagName('a:solidFill')[0];
      if (lnFill) {
        strokeColor = parseColor(lnFill, themeColors);
        strokeWidth = Math.max(1, emuToPoints(parseInt(ln.getAttribute('w') || '12700', 10)));
      }
    }

    if (txBody) {
      const paragraphs = parseTextBody(txBody, themeColors);
      if (paragraphs.length > 0 || fillColor) {
        elements.push({
          type: 'text',
          ...transform,
          paragraphs,
          fillColor,
          strokeColor,
          strokeWidth,
        });
      }
    } else if (fillColor || strokeColor) {
      // Shape without text
      elements.push({
        type: 'shape',
        ...transform,
        fillColor,
        strokeColor,
        strokeWidth,
      });
    }
  }

  // Parse pictures (pic)
  const pics = doc.getElementsByTagName('p:pic');
  for (let i = 0; i < pics.length; i++) {
    const pic = pics[i];
    const spPr = pic.getElementsByTagName('p:spPr')[0];
    const blipFill = pic.getElementsByTagName('p:blipFill')[0];

    if (!spPr || !blipFill) continue;

    const transform = parseTransform(spPr, slideWidthEmu, slideHeightEmu);

    // Get image reference
    const blip = blipFill.getElementsByTagName('a:blip')[0];
    if (blip) {
      const embed = blip.getAttribute('r:embed');
      if (embed) {
        elements.push({
          type: 'image',
          ...transform,
          imageRid: embed,
        });
      }
    }
  }

  // Sort elements by their position (rough z-index approximation)
  elements.sort((a, b) => {
    if (a.type === 'image' && b.type !== 'image') return -1;
    if (a.type !== 'image' && b.type === 'image') return 1;
    return 0;
  });

  return { background, elements };
}

// Render slide to SVG
function renderSlideToSvg(
  slideData: SlideData,
  slideNum: number,
  totalSlides: number,
  rels: Record<string, string>,
  media: Record<string, MediaFile>
): string {
  let elementsHtml = '';
  
  for (const el of slideData.elements) {
    if (el.type === 'image') {
      const mediaPath = rels[el.imageRid || ''];
      const mediaFile = mediaPath ? media[mediaPath] : null;
      
      if (mediaFile && !mediaFile.mimeType.includes('emf') && !mediaFile.mimeType.includes('wmf')) {
        elementsHtml += `
    <image 
      href="${mediaFile.data}" 
      x="${el.x}" y="${el.y}" 
      width="${el.width}" height="${el.height}"
      preserveAspectRatio="xMidYMid meet"
      ${el.rotation ? `transform="rotate(${el.rotation} ${el.x + el.width/2} ${el.y + el.height/2})"` : ''}
    />`;
      }
    } else if (el.type === 'shape' && el.fillColor) {
      elementsHtml += `
    <rect 
      x="${el.x}" y="${el.y}" 
      width="${el.width}" height="${el.height}"
      fill="${el.fillColor}"
      ${el.strokeColor ? `stroke="${el.strokeColor}" stroke-width="${el.strokeWidth}"` : ''}
      ${el.rotation ? `transform="rotate(${el.rotation} ${el.x + el.width/2} ${el.y + el.height/2})"` : ''}
    />`;
    } else if (el.type === 'text' && el.paragraphs) {
      // Background rect if has fill
      if (el.fillColor) {
        elementsHtml += `
    <rect 
      x="${el.x}" y="${el.y}" 
      width="${el.width}" height="${el.height}"
      fill="${el.fillColor}"
      ${el.strokeColor ? `stroke="${el.strokeColor}" stroke-width="${el.strokeWidth}"` : ''}
    />`;
      }
      
      // Render text
      let textY = el.y + 10;
      for (const para of el.paragraphs) {
        let textX = el.x + 10 + (para.level * 30);
        let anchor = 'start';
        
        if (para.alignment === 'center') {
          textX = el.x + el.width / 2;
          anchor = 'middle';
        } else if (para.alignment === 'right') {
          textX = el.x + el.width - 10;
          anchor = 'end';
        }
        
        // Calculate line height based on largest font in paragraph
        const maxFontSize = Math.max(...para.runs.map(r => r.fontSize), 24);
        textY += maxFontSize;
        
        // Bullet
        if (para.bulletChar && para.runs.length > 0) {
          elementsHtml += `
    <text x="${textX - 20}" y="${textY}" 
          font-size="${maxFontSize}px" 
          fill="${para.runs[0].color}"
          text-anchor="${anchor}">
      ${escapeXml(para.bulletChar)}
    </text>`;
        }
        
        // Text runs
        let currentX = textX;
        for (const run of para.runs) {
          const fontWeight = run.bold ? 'bold' : 'normal';
          const fontStyle = run.italic ? 'italic' : 'normal';
          
          elementsHtml += `
    <text x="${currentX}" y="${textY}" 
          font-family="${escapeXml(run.fontFamily)}, Arial, sans-serif" 
          font-size="${run.fontSize}px" 
          font-weight="${fontWeight}"
          font-style="${fontStyle}"
          fill="${run.color}"
          text-anchor="${anchor}">
      ${escapeXml(run.text)}
    </text>`;
          
          // Rough advance (won't be perfect without font metrics)
          if (anchor === 'start') {
            currentX += run.text.length * run.fontSize * 0.6;
          }
        }
        
        textY += maxFontSize * 0.3; // Line spacing
      }
    }
  }
  
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${TARGET_SLIDE_WIDTH} ${TARGET_SLIDE_HEIGHT}" width="${TARGET_SLIDE_WIDTH}" height="${TARGET_SLIDE_HEIGHT}">
  <rect width="${TARGET_SLIDE_WIDTH}" height="${TARGET_SLIDE_HEIGHT}" fill="${slideData.background}"/>
  ${elementsHtml}
</svg>`;

  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
}

function getPresentationSlideSizeEmu(zip: JSZip): Promise<{ widthEmu: number; heightEmu: number }> {
  // Default fallback is classic 4:3 (10in x 7.5in)
  const fallback = { widthEmu: 9144000, heightEmu: 6858000 };

  return (async () => {
    try {
      const presFile = zip.file('ppt/presentation.xml');
      if (!presFile) return fallback;

      const presXml = await presFile.async('string');
      const doc = new DOMParser().parseFromString(presXml, 'text/xml');
      const sldSz = doc.getElementsByTagName('p:sldSz')[0];
      if (!sldSz) return fallback;

      const cx = parseInt(sldSz.getAttribute('cx') || '', 10);
      const cy = parseInt(sldSz.getAttribute('cy') || '', 10);
      if (!Number.isFinite(cx) || !Number.isFinite(cy) || cx <= 0 || cy <= 0) return fallback;

      return { widthEmu: cx, heightEmu: cy };
    } catch (e) {
      console.error('Error reading presentation slide size:', e);
      return fallback;
    }
  })();
}

// Main PPTX parsing function
async function parsePptxToImages(arrayBuffer: ArrayBuffer): Promise<{ pageNumber: number; imageData: string }[]> {
  const zip = new JSZip();
  await zip.loadAsync(arrayBuffer);

  const images: { pageNumber: number; imageData: string }[] = [];

  // Read actual slide size (this is the main fix for "margins" / tiny text)
  const { widthEmu: slideWidthEmu, heightEmu: slideHeightEmu } = await getPresentationSlideSizeEmu(zip);
  console.log(`Slide size (EMU): ${slideWidthEmu} x ${slideHeightEmu}`);

  // Load theme colors
  let themeColors: Record<string, string> = {};
  const themeFile = zip.file('ppt/theme/theme1.xml');
  if (themeFile) {
    const themeXml = await themeFile.async('string');
    themeColors = parseThemeColors(themeXml);
  }

  // Extract all media files
  console.log('Extracting media files...');
  const media = await extractMedia(zip);
  console.log(`Extracted ${Object.keys(media).length} media files`);

  // Count slides
  let slideIndex = 1;
  const slideFiles: string[] = [];
  while (true) {
    const slidePath = `ppt/slides/slide${slideIndex}.xml`;
    if (zip.file(slidePath)) {
      slideFiles.push(slidePath);
      slideIndex++;
    } else {
      break;
    }
  }

  const totalSlides = slideFiles.length;
  console.log(`Found ${totalSlides} slides`);

  // Process each slide
  for (let i = 0; i < slideFiles.length; i++) {
    const slideNum = i + 1;
    const slideFile = zip.file(slideFiles[i]);

    if (!slideFile) continue;

    try {
      const slideXml = await slideFile.async('string');
      const rels = await parseRelationships(zip, slideNum);
      const slideData = parseSlide(slideXml, themeColors, rels, slideWidthEmu, slideHeightEmu);
      const svgData = renderSlideToSvg(slideData, slideNum, totalSlides, rels, media);

      images.push({
        pageNumber: slideNum,
        imageData: svgData,
      });
    } catch (e) {
      console.error(`Error processing slide ${slideNum}:`, e);
      // Create fallback slide
      images.push({
        pageNumber: slideNum,
        imageData: createFallbackSlide(slideNum, totalSlides),
      });
    }
  }

  return images;
}

function createFallbackSlide(pageNumber: number, totalSlides: number): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" width="1920" height="1080">
  <rect width="1920" height="1080" fill="#1e293b"/>
  <text x="960" y="500" font-family="Arial, sans-serif" font-size="48" fill="white" text-anchor="middle">
    Slide ${pageNumber}
  </text>
  <text x="960" y="580" font-family="Arial, sans-serif" font-size="24" fill="#94a3b8" text-anchor="middle">
    Content could not be rendered
  </text>
  <text x="960" y="1020" font-family="Arial, sans-serif" font-size="20" fill="#64748b" text-anchor="middle">
    ${pageNumber} / ${totalSlides}
  </text>
</svg>`;
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return jsonResponse({ error: 'No file provided' }, 400);
    }

    const fileName = file.name.toLowerCase();
    const isPptx = fileName.endsWith('.pptx') || fileName.endsWith('.ppt');
    const isPdf = file.type === 'application/pdf' || fileName.endsWith('.pdf');

    console.log(`Processing: ${file.name}, size: ${file.size}`);

    const arrayBuffer = await file.arrayBuffer();

    if (isPptx) {
      console.log('Processing PPTX with full visual parsing...');
      const images = await parsePptxToImages(arrayBuffer);
      
      if (images.length === 0) {
        return jsonResponse({
          error: 'No slides found',
          images: [],
          totalSlides: 0,
        }, 400);
      }
      
      console.log(`Successfully rendered ${images.length} slides`);
      return jsonResponse({
        images,
        totalSlides: images.length,
        message: `Converted ${images.length} slides from PPTX`,
      });
    }

    if (isPdf) {
      // PDF should be handled client-side with pdfjs for pixel-perfect rendering
      return jsonResponse({
        error: 'PDF files should be processed client-side for best quality. Please use the browser-based PDF renderer.',
        images: [],
        totalSlides: 0,
      }, 400);
    }

    return jsonResponse({ error: 'Unsupported file format. Please upload PPTX or PDF.' }, 400);

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Processing error:', msg);
    return jsonResponse({ error: msg }, 500);
  }
});
