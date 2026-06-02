DO $$
BEGIN
  CREATE TYPE employment_type AS ENUM ('temporary_shift', 'permanent_role', 'contract');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE job_status AS ENUM ('open', 'filled', 'closed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE booking_status AS ENUM ('requested', 'accepted', 'confirmed', 'completed', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE compensation_unit AS ENUM ('hour', 'day', 'shift', 'contract');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS job_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinic_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  specialty TEXT NOT NULL,
  employment_type employment_type NOT NULL,
  status job_status NOT NULL DEFAULT 'open',
  city TEXT NOT NULL,
  region TEXT NOT NULL,
  latitude NUMERIC(9,6) NOT NULL,
  longitude NUMERIC(9,6) NOT NULL,
  radius_km INTEGER,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ,
  compensation_amount NUMERIC(12,2) NOT NULL,
  compensation_currency TEXT NOT NULL,
  compensation_unit compensation_unit NOT NULL,
  verification_required BOOLEAN NOT NULL DEFAULT TRUE,
  summary TEXT NOT NULL,
  description TEXT NOT NULL,
  requirements TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  languages TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  contact_preference TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES job_listings(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES clinic_profiles(id) ON DELETE CASCADE,
  professional_id UUID NOT NULL REFERENCES professional_profiles(id) ON DELETE CASCADE,
  status booking_status NOT NULL DEFAULT 'requested',
  notes TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS job_listings_clinic_status_idx
  ON job_listings(clinic_id, status);
CREATE INDEX IF NOT EXISTS job_listings_city_idx
  ON job_listings(city);
CREATE INDEX IF NOT EXISTS job_listings_specialty_idx
  ON job_listings(specialty);
CREATE INDEX IF NOT EXISTS job_listings_starts_at_idx
  ON job_listings(starts_at);

CREATE INDEX IF NOT EXISTS bookings_clinic_status_idx
  ON bookings(clinic_id, status);
CREATE INDEX IF NOT EXISTS bookings_professional_status_idx
  ON bookings(professional_id, status);
CREATE INDEX IF NOT EXISTS bookings_job_professional_idx
  ON bookings(job_id, professional_id);
