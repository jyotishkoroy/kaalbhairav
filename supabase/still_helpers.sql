-- Copyright (c) 2026 Jyotishko Roy.
-- Proprietary and confidential. All rights reserved.
-- Project: TarayAI - https://tarayai.com

create table if not exists public.still_prompts (
  id int generated always as identity primary key,
  prompt text not null,
  is_active boolean default true,
  created_at timestamptz default now()
);

alter table public.still_prompts enable row level security;

drop policy if exists "prompts_public_read" on public.still_prompts;
create policy "prompts_public_read" on public.still_prompts for select
  to authenticated using (is_active);

insert into public.still_prompts (prompt)
select prompt
from (
  values
    ('What are you pretending not to know?'),
    ('If fear were not a factor, what would you do this week?'),
    ('What is the smallest honest thing you can say right now?'),
    ('What have you outgrown but not yet let go of?'),
    ('What would enough look like, for today?'),
    ('What is one small act of devotion you can offer today?')
) as seed(prompt)
where not exists (
  select 1 from public.still_prompts where still_prompts.prompt = seed.prompt
);

create or replace function public.get_todays_prompt()
returns text language plpgsql security definer as $$
declare
  total int;
  idx int;
  result text;
begin
  select count(*) into total from public.still_prompts where is_active = true;
  if total = 0 then return null; end if;

  idx := (extract(doy from current_date)::int % total);

  select prompt into result
  from public.still_prompts
  where is_active = true
  order by id
  limit 1 offset idx;

  return result;
end $$;

create or replace function public.bump_still_streak(p_user_id uuid)
returns void language plpgsql security definer as $$
declare
  prog public.still_progress;
  today date := current_date;
  last date;
begin
  select * into prog from public.still_progress where user_id = p_user_id;

  if not found then
    insert into public.still_progress (
      user_id,
      current_streak,
      longest_streak,
      total_sessions,
      last_session_at
    )
    values (p_user_id, 1, 1, 1, now());
    return;
  end if;

  last := prog.last_session_at::date;

  if last = today then
    update public.still_progress
      set total_sessions = total_sessions + 1,
          last_session_at = now()
      where user_id = p_user_id;
  elsif last = today - 1 then
    update public.still_progress
      set current_streak = current_streak + 1,
          longest_streak = greatest(longest_streak, current_streak + 1),
          total_sessions = total_sessions + 1,
          last_session_at = now()
      where user_id = p_user_id;
  else
    update public.still_progress
      set current_streak = 1,
          total_sessions = total_sessions + 1,
          last_session_at = now()
      where user_id = p_user_id;
  end if;
end $$;
