ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'checked_in';
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'checked_out';

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS check_in_time TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS check_out_time TIMESTAMPTZ;
