CREATE UNIQUE INDEX IF NOT EXISTS bookings_active_job_professional_unique_idx
  ON bookings(job_id, professional_id)
  WHERE status IN ('requested', 'accepted', 'confirmed');

CREATE UNIQUE INDEX IF NOT EXISTS conversations_standard_clinic_professional_unique_idx
  ON conversations(clinic_id, professional_id)
  WHERE kind = 'standard';

CREATE UNIQUE INDEX IF NOT EXISTS conversations_admin_target_unique_idx
  ON conversations(admin_actor_id, target_actor_id)
  WHERE kind = 'admin';
