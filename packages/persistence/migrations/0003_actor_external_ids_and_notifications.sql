ALTER TABLE actors
  ADD COLUMN IF NOT EXISTS external_user_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS actors_external_user_id_idx
  ON actors (external_user_id)
  WHERE external_user_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS app_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_external_user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS app_notifications_recipient_created_idx
  ON app_notifications (recipient_external_user_id, created_at DESC);
