import { supabase } from "@/integrations/supabase/client";
import { Slide } from "@/types/slides";
import { Json } from "@/integrations/supabase/types";
import { z } from "zod";

// Input validation schemas
const studentNameSchema = z.string().min(1, "Name is required").max(50, "Name must be under 50 characters").trim();
const emojiSchema = z.string().max(10, "Emoji must be under 10 characters");
const lectureCodeSchema = z.string().regex(/^\d{6}$/, "Invalid lecture code format");
const lectureTitleSchema = z.string().min(1, "Title is required").max(200, "Title must be under 200 characters").trim();

// Generate a unique 6-digit lecture code
export function generateLectureCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Create a new lecture in the database
export async function createLecture(title: string, slides: Slide[], userId?: string) {
  // Validate input
  const validatedTitle = lectureTitleSchema.parse(title);
  
  // Get user ID from session if not provided
  let finalUserId = userId;
  if (!finalUserId) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User must be authenticated to create a lecture');
    finalUserId = user.id;
  }
  
  const lectureCode = generateLectureCode();
  
  const { data, error } = await supabase
    .from('lectures')
    .insert({
      title: validatedTitle,
      lecture_code: lectureCode,
      slides: JSON.parse(JSON.stringify(slides)) as Json,
      status: 'draft',
      current_slide_index: 0,
      user_id: finalUserId,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Get lecture by ID
export async function getLecture(lectureId: string) {
  const { data, error } = await supabase
    .from('lectures')
    .select('*')
    .eq('id', lectureId)
    .single();

  if (error) throw error;
  return data;
}

// Get lecture by code (for students joining)
export async function getLectureByCode(code: string) {
  const { data, error } = await supabase
    .from('lectures')
    .select('*')
    .eq('lecture_code', code)
    .single();

  if (error) return null;
  return data;
}

// Update lecture status and current slide. updated_at is set on every call so postgres_changes and polling (sync layers 2 & 3) detect changes.
export async function updateLecture(lectureId: string, updates: {
  status?: string;
  current_slide_index?: number;
  slides?: Slide[];
  settings?: Record<string, unknown>;
}) {
  const updateData: Record<string, unknown> = { 
    ...updates,
    updated_at: new Date().toISOString(),
  };
  if (updates.slides) {
    updateData.slides = JSON.parse(JSON.stringify(updates.slides)) as Json;
  }
  if (updates.settings) {
    updateData.settings = JSON.parse(JSON.stringify(updates.settings)) as Json;
  }
  
  const { data, error } = await supabase
    .from('lectures')
    .update(updateData)
    .eq('id', lectureId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Start a lecture (set to active)
export async function startLecture(lectureId: string) {
  return updateLecture(lectureId, { status: 'active', current_slide_index: 0 });
}

// End a lecture
export async function endLecture(lectureId: string) {
  return updateLecture(lectureId, { status: 'ended' });
}

// Navigate to next/previous slide
export async function navigateSlide(lectureId: string, slideIndex: number) {
  return updateLecture(lectureId, { current_slide_index: slideIndex });
}

// Join lecture as student
export async function joinLecture(lectureId: string, name: string, emoji: string) {
  // Validate inputs
  const validatedName = studentNameSchema.parse(name);
  const validatedEmoji = emojiSchema.parse(emoji);
  
  const { data, error } = await supabase
    .from('students')
    .insert({
      lecture_id: lectureId,
      name: validatedName,
      emoji: validatedEmoji,
    })
    .select()
    .single();

  if (error) {
    // If duplicate, try to get existing student
    if (error.code === '23505') {
      const { data: existing } = await supabase
        .from('students')
        .select('*')
        .eq('lecture_id', lectureId)
        .eq('name', validatedName)
        .single();
      return existing;
    }
    throw error;
  }
  return data;
}

// Get students in a lecture
export async function getStudents(lectureId: string) {
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .eq('lecture_id', lectureId)
    .order('points', { ascending: false });

  if (error) throw error;
  return data || [];
}

// Submit a response
export async function submitResponse(
  lectureId: string,
  studentId: string,
  slideIndex: number,
  responseData: Record<string, unknown>,
  isCorrect?: boolean,
  pointsEarned?: number
) {
  const { data, error } = await supabase
    .from('responses')
    .insert({
      lecture_id: lectureId,
      student_id: studentId,
      slide_index: slideIndex,
      response_data: responseData as Json,
      is_correct: isCorrect,
      points_earned: pointsEarned || 0,
    })
    .select()
    .single();

  if (error) throw error;

  // Update student points directly
  if (pointsEarned && pointsEarned > 0) {
    const { data: student } = await supabase
      .from('students')
      .select('points')
      .eq('id', studentId)
      .single();
    
    if (student) {
      await supabase
        .from('students')
        .update({ points: (student.points || 0) + pointsEarned })
        .eq('id', studentId);
    }
  }

  return data;
}

// Get responses for a slide
export async function getResponses(lectureId: string, slideIndex: number) {
  const { data, error } = await supabase
    .from('responses')
    .select('*')
    .eq('lecture_id', lectureId)
    .eq('slide_index', slideIndex)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

// Get all responses for a lecture (all slides) – for analytics
export async function getAllResponsesForLecture(lectureId: string) {
  const { data, error } = await supabase
    .from('responses')
    .select('*')
    .eq('lecture_id', lectureId)
    .order('slide_index', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

// Duplicate a lecture: same title + " (Copy)", same slides, new code, status draft. No students/responses/questions.
export async function duplicateLecture(lectureId: string) {
  const lecture = await getLecture(lectureId);
  if (!lecture) throw new Error('Lecture not found');
  const slides = (lecture.slides as unknown as Slide[]) || [];
  const newTitle = `${lecture.title} (Copy)`;
  return createLecture(newTitle, slides.length ? [...slides] : []);
}

// Subscribe to lecture updates (for students)
export function subscribeLecture(lectureId: string, callback: (lecture: unknown) => void) {
  return supabase
    .channel(`lecture-${lectureId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'lectures',
        filter: `id=eq.${lectureId}`,
      },
      (payload) => {
        callback(payload.new);
      }
    )
    .subscribe();
}

// Subscribe to student updates (for presenter)
export function subscribeStudents(lectureId: string, callback: (students: unknown[]) => void) {
  return supabase
    .channel(`students-${lectureId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'students',
        filter: `lecture_id=eq.${lectureId}`,
      },
      async () => {
        const students = await getStudents(lectureId);
        callback(students);
      }
    )
    .subscribe();
}

// Subscribe to response updates (for presenter)
export function subscribeResponses(
  lectureId: string, 
  slideIndex: number,
  callback: (responses: unknown[]) => void
) {
  return supabase
    .channel(`responses-${lectureId}-${slideIndex}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'responses',
        filter: `lecture_id=eq.${lectureId}`,
      },
      async () => {
        const responses = await getResponses(lectureId, slideIndex);
        callback(responses);
      }
    )
    .subscribe();
}
