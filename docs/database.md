# Database

Neon PostgreSQL uses the shared contract in `db/schema.sql`. The only connection setting is `DATABASE_URL`; do not commit credentials or `.env` files. Set it in the local shell or Vercel project environment. Server code imports `lib/server/db` only; its parameterized `query()` helper and `withTransaction()` require Node.js runtime routes.

## Migration and demo seed

Run from repository root with `DATABASE_URL` set:

```sh
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f db/schema.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f db/seed.sql
```

For an existing database that has not yet received the return-request columns, apply migrations in order before deploying this application version:

```sh
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f db/migrations/20261117_return_requests.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f db/migrations/20261118_return_audit.sql
```

If `20261117_return_requests.sql` is already applied, run only the second command. Both migrations are idempotent. The first adds request timestamp/note fields; the second adds separate requested date/condition audit fields and backfills existing returns linked to pending requests. Confirm the required columns exist in `public.loans` and `public.loan_returns` before deploying. Protect `DATABASE_URL`; never place it in source control.

## Shared-contract notes

`loans` holds one tool per loan row, `approved` remains separate from `borrowed`, and `loan_returns.loan_id` is unique. The DB helper leaves status transitions and stock invariants to the caller/SQL transaction; the current schema does not automatically change stock or calculate fines. `settings` has no seeded daily fine rate.

`lib/types.ts` includes API projections (`categoryId`, names, `kinds`, `available`) that differ from persisted rows; queries should alias/map explicitly. `Summary` has no backing DB view yet. `LoanReturn` omits persisted `recorded_by` and `created_at`, as expected for a public projection.

The PRD describes `description`, `updated_at`, loan-item/multi-tool loans, return-request states and fields, and denda settings absent from this shared schema. It also describes active-user/role indexes not present here. Treat the schema and types as the coordinated contract; resolve PRD requirements with the orchestrator before changing it.
