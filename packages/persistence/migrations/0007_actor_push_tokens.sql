CREATE TABLE IF NOT EXISTS actor_push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID NOT NULL REFERENCES actors(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'expo',
  platform TEXT NOT NULL,
  token TEXT NOT NULL,
  device_id TEXT,
  device_name TEXT,
  app_version TEXT,
  last_registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS actor_push_tokens_actor_idx
  ON actor_push_tokens(actor_id);

CREATE INDEX IF NOT EXISTS actor_push_tokens_actor_provider_platform_idx
  ON actor_push_tokens(actor_id, provider, platform);

CREATE UNIQUE INDEX IF NOT EXISTS actor_push_tokens_token_unique_idx
  ON actor_push_tokens(token);
