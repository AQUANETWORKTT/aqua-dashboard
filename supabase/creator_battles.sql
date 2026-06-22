create table if not exists public.creator_battles (
  id uuid primary key,
  requester_username text not null,
  requester_avatar text,
  accepter_username text,
  accepter_avatar text,
  battle_date date not null,
  battle_time time not null,
  battle_at timestamp without time zone not null,
  estimated_score text not null,
  status text not null default 'available' check (status in ('available', 'accepted', 'cancelled')),
  created_at timestamp with time zone not null default now(),
  accepted_at timestamp with time zone,
  updated_at timestamp with time zone not null default now()
);

create index if not exists creator_battles_status_battle_at_idx
  on public.creator_battles (status, battle_at);
