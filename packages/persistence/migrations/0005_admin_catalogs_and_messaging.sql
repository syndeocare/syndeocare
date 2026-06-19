DO $$
BEGIN
  CREATE TYPE admin_catalog_kind AS ENUM (
    'certification',
    'document_type',
    'job_role',
    'legal_page',
    'specialty'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE conversation_kind AS ENUM ('admin', 'standard');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS admin_catalog_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind admin_catalog_kind NOT NULL,
  name TEXT NOT NULL,
  name_ar TEXT,
  abbreviation TEXT,
  description TEXT,
  content TEXT,
  slug TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_required BOOLEAN NOT NULL DEFAULT FALSE,
  applies_to TEXT NOT NULL DEFAULT 'both',
  allowed_extensions TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  max_size_mb INTEGER NOT NULL DEFAULT 10,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS admin_catalog_items_kind_active_idx
  ON admin_catalog_items(kind, is_active, display_order);

CREATE INDEX IF NOT EXISTS admin_catalog_items_kind_name_idx
  ON admin_catalog_items(kind, name);

CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind conversation_kind NOT NULL DEFAULT 'standard',
  admin_actor_id UUID REFERENCES actors(id) ON DELETE CASCADE,
  target_actor_id UUID REFERENCES actors(id) ON DELETE CASCADE,
  professional_id UUID REFERENCES professional_profiles(id) ON DELETE CASCADE,
  clinic_id UUID REFERENCES clinic_profiles(id) ON DELETE CASCADE,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT conversations_shape_check CHECK (
    (
      kind = 'admin'
      AND admin_actor_id IS NOT NULL
      AND target_actor_id IS NOT NULL
      AND admin_actor_id <> target_actor_id
    )
    OR
    (
      kind = 'standard'
      AND professional_id IS NOT NULL
      AND clinic_id IS NOT NULL
    )
  )
);

CREATE INDEX IF NOT EXISTS conversations_admin_target_idx
  ON conversations(admin_actor_id, target_actor_id);

CREATE INDEX IF NOT EXISTS conversations_clinic_professional_idx
  ON conversations(clinic_id, professional_id);

CREATE INDEX IF NOT EXISTS conversations_last_message_idx
  ON conversations(kind, last_message_at);

CREATE TABLE IF NOT EXISTS conversation_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_actor_id UUID NOT NULL REFERENCES actors(id) ON DELETE CASCADE,
  sender_role user_role NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  file_url TEXT,
  file_type TEXT,
  file_name TEXT,
  file_size INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS conversation_messages_conversation_created_idx
  ON conversation_messages(conversation_id, created_at);

CREATE INDEX IF NOT EXISTS conversation_messages_unread_idx
  ON conversation_messages(conversation_id, is_read);
