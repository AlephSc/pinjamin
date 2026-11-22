-- Google login support. Idempotent so fresh installs and existing databases converge.
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS provider text CHECK (provider IN ('password','google'));
UPDATE users SET provider='password' WHERE provider IS NULL;
ALTER TABLE users ALTER COLUMN provider SET NOT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified boolean NOT NULL DEFAULT true;

-- Existing password accounts keep password semantics.
UPDATE users
SET provider = CASE WHEN password_hash IS NULL THEN 'google' ELSE 'password' END
WHERE provider = 'password' AND password_hash IS NULL;
