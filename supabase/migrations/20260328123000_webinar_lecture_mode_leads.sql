-- Webinar track: lecture mode, lead capture, CTA timestamp on lead row

ALTER TABLE public.lectures
  ADD COLUMN lecture_mode text NOT NULL DEFAULT 'education';

ALTER TABLE public.lectures
  ADD CONSTRAINT lectures_lecture_mode_check CHECK (lecture_mode IN ('education', 'webinar'));

CREATE TABLE public.lecture_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lecture_id uuid NOT NULL REFERENCES public.lectures(id) ON DELETE CASCADE,
  email text NOT NULL,
  name text NOT NULL,
  student_id uuid REFERENCES public.students(id) ON DELETE SET NULL,
  cta_clicked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_lecture_leads_lecture_id ON public.lecture_leads(lecture_id);
CREATE INDEX idx_lecture_leads_lecture_email ON public.lecture_leads(lecture_id, lower(email));

ALTER TABLE public.lecture_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lecture owners read leads"
  ON public.lecture_leads FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.lectures l
      WHERE l.id = lecture_leads.lecture_id
        AND (l.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

CREATE POLICY "Anyone can insert lecture leads"
  ON public.lecture_leads FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update lecture leads for CTA"
  ON public.lecture_leads FOR UPDATE
  USING (true)
  WITH CHECK (true);
