create table if not exists public.manager_targets (
  name text primary key,
  target_points integer not null default 35,
  updated_at timestamp with time zone not null default now()
);
