create table users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text unique,
  created_at timestamptz not null default now()
);

create table groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table group_members (
  group_id uuid not null references groups(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  primary key (group_id, user_id)
);

create table expenses (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  paid_by uuid not null references users(id),
  description text not null,
  amount_cents integer not null check (amount_cents > 0),
  created_at timestamptz not null default now()
);

create table expense_splits (
  expense_id uuid not null references expenses(id) on delete cascade,
  user_id uuid not null references users(id),
  share_cents integer not null check (share_cents >= 0),
  primary key (expense_id, user_id)
);

create table settlements (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  from_user uuid not null references users(id),
  to_user uuid not null references users(id),
  amount_cents integer not null check (amount_cents > 0),
  created_at timestamptz not null default now(),
  check (from_user <> to_user)
);

create index on expenses (group_id);
create index on settlements (group_id);

alter table users enable row level security;
alter table groups enable row level security;
alter table group_members enable row level security;
alter table expenses enable row level security;
alter table expense_splits enable row level security;
alter table settlements enable row level security;