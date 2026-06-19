CREATE TABLE IF NOT EXISTS user_preferences (
  actor_id UUID PRIMARY KEY REFERENCES actors(id) ON DELETE CASCADE,
  language TEXT NOT NULL DEFAULT 'en',
  theme TEXT NOT NULL DEFAULT 'system',
  notifications_email BOOLEAN NOT NULL DEFAULT TRUE,
  notifications_push BOOLEAN NOT NULL DEFAULT TRUE,
  notifications_in_app BOOLEAN NOT NULL DEFAULT TRUE,
  email_new_jobs BOOLEAN NOT NULL DEFAULT TRUE,
  email_new_messages BOOLEAN NOT NULL DEFAULT TRUE,
  email_booking_updates BOOLEAN NOT NULL DEFAULT TRUE,
  email_digest TEXT NOT NULL DEFAULT 'daily',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
