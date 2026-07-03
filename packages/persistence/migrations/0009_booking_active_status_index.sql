DROP INDEX IF EXISTS bookings_active_job_professional_unique_idx;

CREATE UNIQUE INDEX IF NOT EXISTS bookings_active_job_professional_unique_idx
  ON bookings(job_id, professional_id)
  WHERE status IN ('requested', 'accepted', 'confirmed', 'checked_in', 'checked_out');
