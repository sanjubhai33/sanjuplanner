CREATE TABLE public.google_oauth_pending (
  token text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.google_oauth_pending TO service_role;
ALTER TABLE public.google_oauth_pending ENABLE ROW LEVEL SECURITY;