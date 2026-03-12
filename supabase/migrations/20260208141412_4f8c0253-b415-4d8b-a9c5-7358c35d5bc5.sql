-- Enable realtime updates for credits/subscription so UI reflects deductions immediately
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_credits;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_subscriptions;