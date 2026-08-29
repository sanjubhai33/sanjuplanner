-- Add Google Calendar sync fields to tasks
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS google_event_id TEXT;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS google_calendar_id TEXT;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS google_etag TEXT;

CREATE INDEX IF NOT EXISTS tasks_google_event_id_idx ON public.tasks (user_id, google_event_id);

-- Store encrypted per-user connector connection keys (server-side only)
CREATE TABLE public.app_user_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  connector_id TEXT NOT NULL,
  connection_key_ciphertext TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, connector_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_user_connections TO service_role;
ALTER TABLE public.app_user_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages app user connections"
  ON public.app_user_connections
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
