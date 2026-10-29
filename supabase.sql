-- Rode isto uma vez no Supabase: SQL Editor -> New query -> Run.
-- Uma linha por usuário, com o estado inteiro do planejamento em JSON.
create table if not exists public.caixa_state (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  data       jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.caixa_state enable row level security;

-- Cada pessoa só enxerga e altera a própria linha.
create policy "dono le"       on public.caixa_state for select using (auth.uid() = user_id);
create policy "dono insere"   on public.caixa_state for insert with check (auth.uid() = user_id);
create policy "dono atualiza" on public.caixa_state for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
