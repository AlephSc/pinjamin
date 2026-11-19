ALTER TABLE loans ADD COLUMN IF NOT EXISTS return_request_date date;
ALTER TABLE loans ADD COLUMN IF NOT EXISTS return_request_condition text;
ALTER TABLE loan_returns ADD COLUMN IF NOT EXISTS request_returned_at date;
ALTER TABLE loan_returns ADD COLUMN IF NOT EXISTS request_condition text;
ALTER TABLE loan_returns ADD COLUMN IF NOT EXISTS request_note text;

UPDATE loan_returns r
SET request_returned_at = COALESCE(r.request_returned_at, r.returned_at),
    request_condition = COALESCE(r.request_condition, r.condition),
    request_note = COALESCE(r.request_note, r.note)
FROM loans l
WHERE l.id = r.loan_id AND l.return_requested_at IS NOT NULL;
