CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  CREATE TYPE user_role AS ENUM ('admin', 'clinic', 'professional');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE verification_status AS ENUM ('not_started', 'pending_review', 'approved', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE availability_status AS ENUM ('available', 'limited', 'unavailable');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS actors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_subject TEXT NOT NULL UNIQUE,
  role user_role NOT NULL,
  email TEXT,
  display_name TEXT,
  onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
  verification_status verification_status NOT NULL DEFAULT 'not_started',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS onboarding_records (
  actor_id UUID PRIMARY KEY REFERENCES actors(id) ON DELETE CASCADE,
  submitted_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  next_action TEXT NOT NULL,
  required_documents TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  missing_documents TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  rejection_reason TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS professional_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID NOT NULL UNIQUE REFERENCES actors(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  specialty TEXT NOT NULL,
  years_experience INTEGER NOT NULL DEFAULT 0,
  languages TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  rating NUMERIC(3,2) NOT NULL DEFAULT 0,
  availability_status availability_status NOT NULL DEFAULT 'unavailable',
  next_available_at TIMESTAMPTZ,
  location_radius_km INTEGER NOT NULL DEFAULT 0,
  city TEXT NOT NULL,
  region TEXT NOT NULL,
  latitude NUMERIC(9,6) NOT NULL,
  longitude NUMERIC(9,6) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS clinic_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID NOT NULL UNIQUE REFERENCES actors(id) ON DELETE CASCADE,
  organization_name TEXT NOT NULL,
  facility_type TEXT NOT NULL,
  city TEXT NOT NULL,
  region TEXT NOT NULL,
  latitude NUMERIC(9,6) NOT NULL,
  longitude NUMERIC(9,6) NOT NULL,
  open_roles INTEGER NOT NULL DEFAULT 0,
  rating NUMERIC(3,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS actors_role_idx ON actors(role);
CREATE INDEX IF NOT EXISTS actors_verification_status_idx ON actors(verification_status);
CREATE INDEX IF NOT EXISTS professional_profiles_specialty_idx ON professional_profiles(specialty);
CREATE INDEX IF NOT EXISTS clinic_profiles_city_idx ON clinic_profiles(city);
