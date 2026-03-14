-- Queue table for welcome emails (webhooks on auth.users may not be available)
CREATE TABLE IF NOT EXISTS public.welcome_email_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Trigger function: enqueue welcome email on new user signup
CREATE OR REPLACE FUNCTION public.enqueue_welcome_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.welcome_email_queue (email, full_name)
  VALUES (
    new.email,
    new.raw_user_meta_data->>'full_name'
  );
  RETURN new;
END;
$$;

-- Trigger on auth.users AFTER INSERT
DROP TRIGGER IF EXISTS on_auth_user_created_welcome ON auth.users;
CREATE TRIGGER on_auth_user_created_welcome
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.enqueue_welcome_email();
