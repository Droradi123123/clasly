-- Create lectures table for storing lecture sessions
CREATE TABLE public.lectures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  title TEXT NOT NULL DEFAULT 'Untitled Lecture',
  lecture_code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'ended')),
  current_slide_index INTEGER NOT NULL DEFAULT 0,
  slides JSONB NOT NULL DEFAULT '[]'::jsonb,
  settings JSONB DEFAULT '{}'::jsonb
);

-- Create students table for participants
CREATE TABLE public.students (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  lecture_id UUID NOT NULL REFERENCES public.lectures(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  emoji TEXT NOT NULL DEFAULT '😊',
  points INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(lecture_id, name)
);

-- Create responses table for activity responses
CREATE TABLE public.responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  lecture_id UUID NOT NULL REFERENCES public.lectures(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  slide_index INTEGER NOT NULL,
  response_data JSONB NOT NULL,
  is_correct BOOLEAN,
  points_earned INTEGER DEFAULT 0
);

-- Enable Row Level Security (but allow public access for this demo)
ALTER TABLE public.lectures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.responses ENABLE ROW LEVEL SECURITY;

-- Public read/write policies (for demo - no auth required)
CREATE POLICY "Allow public read access to lectures"
  ON public.lectures FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert to lectures"
  ON public.lectures FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update to lectures"
  ON public.lectures FOR UPDATE
  USING (true);

CREATE POLICY "Allow public read access to students"
  ON public.students FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert to students"
  ON public.students FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update to students"
  ON public.students FOR UPDATE
  USING (true);

CREATE POLICY "Allow public read access to responses"
  ON public.responses FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert to responses"
  ON public.responses FOR INSERT
  WITH CHECK (true);

-- Enable realtime for these tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.lectures;
ALTER PUBLICATION supabase_realtime ADD TABLE public.students;
ALTER PUBLICATION supabase_realtime ADD TABLE public.responses;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_lectures_updated_at
  BEFORE UPDATE ON public.lectures
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_lectures_code ON public.lectures(lecture_code);
CREATE INDEX idx_students_lecture ON public.students(lecture_id);
CREATE INDEX idx_responses_lecture ON public.responses(lecture_id);
CREATE INDEX idx_responses_student ON public.responses(student_id);