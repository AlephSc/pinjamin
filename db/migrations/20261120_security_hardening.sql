-- Security hardening: persistent rate limiting + session revocation version.
CREATE TABLE IF NOT EXISTS rate_limits (
  key text PRIMARY KEY,
  tokens double precision NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version integer NOT NULL DEFAULT 1;
