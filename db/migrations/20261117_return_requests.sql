ALTER TABLE loans ADD COLUMN IF NOT EXISTS return_requested_at timestamptz;
ALTER TABLE loans ADD COLUMN IF NOT EXISTS return_request_note text;