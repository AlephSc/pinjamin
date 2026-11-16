-- Pinjamin schema (PostgreSQL 15+)
-- Sumber kebenaran struktur data. Dipakai Neon (produksi) dan PGlite (dev/uji lokal).

create table if not exists categories (
  id serial primary key,
  name text not null unique
);

create table if not exists users (
  id serial primary key,
  name text not null,
  email text not null unique,
  password_hash text not null,
  role text not null check (role in ('admin','petugas','peminjam')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists tools (
  id serial primary key,
  code text not null unique,
  name text not null,
  category_id integer not null references categories(id) on delete restrict,
  stock integer not null check (stock >= 0),
  available integer not null check (available >= 0),
  condition text not null default 'Baik',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint tools_available_not_over_stock check (available <= stock)
);

create table if not exists loans (
  id serial primary key,
  code text not null unique,
  borrower_id integer not null references users(id) on delete restrict,
  tool_id integer not null references tools(id) on delete restrict,
  qty integer not null check (qty > 0),
  borrow_date date not null,
  due_date date not null,
  status text not null default 'pending'
    check (status in ('pending','approved','rejected','borrowed','late','returned')),
  purpose text not null,
  note text,
  decided_by integer references users(id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  constraint loans_due_not_before_borrow check (due_date >= borrow_date)
);

create table if not exists loan_returns (
  id serial primary key,
  loan_id integer not null unique references loans(id) on delete cascade,
  returned_at date not null,
  condition text not null,
  note text,
  fine integer not null default 0 check (fine >= 0),
  recorded_by integer references users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists activity_logs (
  id serial primary key,
  actor_id integer references users(id) on delete set null,
  actor_name text not null,
  action text not null,
  target text not null,
  created_at timestamptz not null default now()
);

create table if not exists settings (
  key text primary key,
  value text not null
);

create index if not exists idx_loans_status on loans(status);
create index if not exists idx_loans_borrower on loans(borrower_id);
create index if not exists idx_tools_category on tools(category_id);
create index if not exists idx_logs_created on activity_logs(created_at desc);
