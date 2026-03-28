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
export async function createLecture(
  title: string,
  slides: Slide[],
  userId?: string,
  options?: { lecture_mode?: 'education' | 'webinar' },
) {
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
  const mode = options?.lecture_mode === 'webinar' ? 'webinar' : 'education';
  
  const { data, error } = await supabase
    .from('lectures')
    .insert({
      title: validatedTitle,
      lecture_code: lectureCode,
      slides: JSON.parse(JSON.stringify(slides)) as Json,
      status: 'draft',
      current_slide_index: 0,
      user_id: finalUserId,
      lecture_mode: mode,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Get lecture by ID (with 10s timeout and retry for transient failures)
const LECTURE_FETCH_TIMEOUT_MS = 10000;
const LECTURE_FETCH_RETRY_DELAY_MS = 1500;
const LECTURE_FETCH_MAX_RETRIES = 2;

async function fetchLectureOnce(lectureId: string) {
  const { data, error } = await supabase
    .from('lectures')
    .select('*')
    .eq('id', lectureId)
    .single();

  if (error) throw error;
  return data;
}

export async function getLecture(lectureId: string) {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= LECTURE_FETCH_MAX_RETRIES; attempt++) {
    try {
      const fetchPromise = fetchLectureOnce(lectureId);
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(
          () => reject(new Error('Lecture load timed out. Please try again.')),
          LECTURE_FETCH_TIMEOUT_MS
        );
      });
      return await Promise.race([fetchPromise, timeoutPromise]);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < LECTURE_FETCH_MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, LECTURE_FETCH_RETRY_DELAY_MS));
      }
    }
  }

  throw lastError ?? new Error('Failed to load lecture');
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

const UPDATE_LECTURE_MAX_RETRIES = 2;
const UPDATE_LECTURE_BASE_DELAY_MS = 500;

function isRetryableError(error: { message?: string; code?: string }): boolean {
  const msg = (error.message || '').toLowerCase();
  const code = (error.code || '').toString();
  // 5xx, network/fetch errors, timeout, connection refused
  return (
    /^5\d{2}$/.test(code) ||
    /network|fetch|timeout|econnrefused|econnreset|socket|unhealthy/i.test(msg)
  );
}

// Update lecture status and current slide. updated_at is set on every call so postgres_changes and polling (sync layers 2 & 3) detect changes.
// Retries 1–2 times on 5xx/network errors with exponential backoff.
export async function updateLecture(lectureId: string, updates: {
  status?: string;
  current_slide_index?: number;
  slides?: Slide[];
  settings?: Record<string, unknown>;
  lecture_mode?: 'education' | 'webinar';
  /** ISO timestamp when the current participative slide's timer started; null when not applicable */
  activity_started_at?: string | null;
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

  let lastError: Error | null = null;
  let retriedWithoutActivityStartedAt = false;
  for (let attempt = 0; attempt <= UPDATE_LECTURE_MAX_RETRIES; attempt++) {
    try {
      const { data, error } = await supabase
        .from('lectures')
        .update(updateData)
        .eq('id', lectureId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      const errObj = err as { message?: string; code?: string };
      const msg = (errObj.message || '').toLowerCase();

      // Resilience: if production DB is missing `activity_started_at`, don't block slide sync.
      // Retry once without the column so current_slide_index updates still succeed.
      if (
        !retriedWithoutActivityStartedAt &&
        'activity_started_at' in updateData &&
        (msg.includes('activity_started_at') && msg.includes('column') && msg.includes('does not exist'))
      ) {
        retriedWithoutActivityStartedAt = true;
        delete (updateData as any).activity_started_at;
        continue;
      }

      if (attempt < UPDATE_LECTURE_MAX_RETRIES && isRetryableError(errObj)) {
        const delay = UPDATE_LECTURE_BASE_DELAY_MS * Math.pow(2, attempt);
        await new Promise((r) => setTimeout(r, delay));
      } else {
        throw lastError;
      }
    }
  }
  throw lastError ?? new Error('Failed to update lecture');
}

// Start a lecture (set to active)
export async function startLecture(lectureId: string) {
  return updateLecture(lectureId, {
    status: 'active',
    current_slide_index: 0,
    activity_started_at: null,
  });
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

/** Best-effort DB backup for “active” tab (Presence is source of truth for live). */
export async function setStudentActive(studentId: string, active: boolean) {
  const { error } = await supabase.from("students").update({ is_active: active }).eq("id", studentId);
  if (error) console.warn("[lectureService] setStudentActive:", error.message);
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

// Submit a response (transactional insert + points via RPC; advisory lock per lecture+slide)
export async function submitResponse(
  lectureId: string,
  studentId: string,
  slideIndex: number,
  responseData: Record<string, unknown>,
  isCorrect?: boolean,
  pointsEarned?: number
) {
  const { data, error } = await supabase.rpc("submit_student_response", {
    p_lecture_id: lectureId,
    p_student_id: studentId,
    p_slide_index: slideIndex,
    p_response_data: responseData as Json,
    p_is_correct: isCorrect ?? null,
    p_points_earned: pointsEarned ?? 0,
  });

  if (error) throw error;
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
  const mode = (lecture as { lecture_mode?: string }).lecture_mode === "webinar" ? "webinar" : "education";
  return createLecture(newTitle, slides.length ? [...slides] : [], undefined, { lecture_mode: mode });
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

const RESPONSES_DEBOUNCE_MS = 120;

// Subscribe to response updates (for presenter). Uses payload.new for instant display, then debounced getResponses to reconcile.
export function subscribeResponses(
  lectureId: string,
  slideIndex: number,
  callback: (responses: unknown[]) => void
) {
  let lastResponses: unknown[] = [];
  let debounceId: ReturnType<typeof setTimeout> | null = null;

  const runGetResponses = () => {
    getResponses(lectureId, slideIndex).then((responses) => {
      lastResponses = responses;
      callback(responses);
    });
  };

  const channel = supabase
    .channel(`responses-${lectureId}-${slideIndex}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'responses',
        filter: `lecture_id=eq.${lectureId}`,
      },
      (payload) => {
        const newRow = payload.new as Record<string, unknown> | undefined;
        const rowSlideIndex = newRow && typeof newRow.slide_index === 'number' ? newRow.slide_index : null;
        if (rowSlideIndex === slideIndex && newRow) {
          lastResponses = [...lastResponses, newRow];
          callback(lastResponses);
        }
        if (debounceId) clearTimeout(debounceId);
        debounceId = setTimeout(() => {
          debounceId = null;
          runGetResponses();
        }, RESPONSES_DEBOUNCE_MS);
      }
    )
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        runGetResponses();
      }
    });

  return channel;
}
