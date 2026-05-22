ALTER TABLE professional_profiles
  ADD COLUMN IF NOT EXISTS profile_image_url TEXT;

ALTER TABLE clinic_profiles
  ADD COLUMN IF NOT EXISTS logo_url TEXT;

ALTER TABLE onboarding_records
  ADD COLUMN IF NOT EXISTS uploaded_documents JSONB NOT NULL DEFAULT '[]'::jsonb;
