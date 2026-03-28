# Clasly Product Requirements (For Cursor)
**Author:** Ariel (AI Co-Founder)
**Vision:** Expand Clasly into a Dual-Track Platform: "Clasly for Education" (current) and "Clasly for Webinars" (high-converting sales tool).
**Design Principle (CRITICAL):** Radical simplicity. Keep the mobile UI massive and clear. DO NOT build complex presenter dashboards, teleprompters, hotkeys, haptic feedback, or confusion meters. Focus strictly on performance and monetization.

Please implement the following features. Work methodically through the phases.

### PHASE 1: Core Architecture & AI Scale (Applies to all tracks)
**Target:** `src/lib/lectureService.ts`, `Present.tsx`, `Student.tsx`, `supabase/functions/generate-slides/index.ts`
1. **Supabase Broadcast & Presence (Zero-Latency):** 
   - Refactor slide navigation (`current_slide_index`) and Emoji reactions to use Supabase Broadcast (In-Memory Pub/Sub). 
   - Replace the static `students` DB table with Supabase Presence to track live participants in real-time (handles tab closes automatically). 
   - Sync to DB asynchronously as a backup.
2. **Throttled RPC for Polls:** Create an RPC or Edge Function to batch/throttle student poll submissions to prevent DB lockups during massive concurrent voting.
3. **Gemini Structured Outputs & Async Images:** 
   - Use `responseSchema` in the Gemini API call to enforce strict JSON output. Remove manual string parsing (`cleanAndParseJSON`).
   - Decouple text from images: Return slide text/structure to the frontend immediately. Generate images asynchronously.
4. **Dynamic Slide Count:** Remove the strict "EXACTLY X slides" prompt. Instruct the AI to "Choose the optimal number of slides between 5 and 12 based on topic depth."

### PHASE 2: The Webinar Track & Monetization
**Target:** `supabase/migrations/`, `Dashboard.tsx`, `Editor.tsx`, `Student.tsx`, `LectureAnalytics.tsx`
1. **Lecture Mode Flag:** Add `lecture_mode` ('education' | 'webinar') to the `lectures` table. Add a toggle in the "New Lecture" flow.
2. **Lead Capture Gate:** If `lecture_mode === 'webinar'`, require attendees to enter their Email + Name on their phones before joining. Save to a `lecture_leads` table.
3. **Live "Call To Action" (CTA):** Editor feature to configure a global CTA (e.g., "Buy Course", URL). Presenter gets a "Trigger CTA" button that pops up a massive link button on all student phones.
4. **Live Raffle:** Presenter gets a "Pick a Winner" button. It randomly selects a name from the active Presence list and displays it with confetti on the main screen.
5. **Lead Scoring:** In the Analytics page, score attendees based on engagement (answered polls, clicked CTA). Make it exportable to CSV.

### PHASE 3: Radically Simple UX Enhancements
**Target:** `Student.tsx`, `Editor.tsx`
1. **Massive Mobile UI:** In `Student.tsx`, make all interactive answer buttons (polls, quizzes) extremely large and clear. 
2. **Simple Waiting Screens:** Add a clean, distraction-free waiting state on mobile after an attendee submits an answer (e.g., "Answer received, waiting for presenter").
3. **Progressive AI Loading:** Enhance the "Generating AI" state in the Dashboard/Editor with progressive loading text ("Analyzing topic...", "Writing slides...") instead of a static spinner.
4. **Magic Wand (Inline AI):** Add a small quick-edit button next to text elements in the Editor to modify sentences via AI ("Make shorter", "Make a quiz") without regenerating the whole presentation.
