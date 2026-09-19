-- Session 8 database foundation:
-- - private user-owned exercise library
-- - private user-owned workouts with ordered exercises and sets
-- - historical exercise-name snapshots for stable workout history

create table if not exists public.exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  muscle_group text,
  equipment text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint exercises_name_not_blank check (btrim(name) <> ''),
  constraint exercises_name_max_len check (char_length(name) <= 120),
  constraint exercises_muscle_group_max_len check (muscle_group is null or char_length(muscle_group) <= 80),
  constraint exercises_equipment_max_len check (equipment is null or char_length(equipment) <= 80),
  constraint exercises_notes_max_len check (notes is null or char_length(notes) <= 1000),
  constraint exercises_id_user_id_unique unique (id, user_id)
);

create table if not exists public.workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  workout_date date not null,
  started_at timestamptz,
  completed_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workouts_name_not_blank check (btrim(name) <> ''),
  constraint workouts_name_max_len check (char_length(name) <= 120),
  constraint workouts_notes_max_len check (notes is null or char_length(notes) <= 2000),
  constraint workouts_started_completed_order check (
    started_at is null
    or completed_at is null
    or completed_at >= started_at
  ),
  constraint workouts_id_user_id_unique unique (id, user_id)
);

create table if not exists public.workout_exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  workout_id uuid not null,
  exercise_id uuid references public.exercises (id) on delete set null,
  exercise_name text not null,
  position integer not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workout_exercises_exercise_name_not_blank check (btrim(exercise_name) <> ''),
  constraint workout_exercises_exercise_name_max_len check (char_length(exercise_name) <= 120),
  constraint workout_exercises_notes_max_len check (notes is null or char_length(notes) <= 1000),
  constraint workout_exercises_position_nonnegative check (position >= 0),
  constraint workout_exercises_id_user_id_unique unique (id, user_id),
  constraint workout_exercises_workout_position_unique unique (workout_id, position),
  constraint workout_exercises_workout_owner_fkey foreign key (workout_id, user_id)
    references public.workouts (id, user_id)
    on delete cascade
);

create table if not exists public.workout_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  workout_exercise_id uuid not null,
  position integer not null,
  set_type text not null default 'working',
  weight numeric,
  weight_unit text,
  reps integer,
  rpe numeric,
  is_completed boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workout_sets_position_nonnegative check (position >= 0),
  constraint workout_sets_set_type_check check (set_type in ('warmup', 'working', 'top', 'backoff', 'drop', 'failure')),
  constraint workout_sets_weight_nonnegative check (weight is null or weight >= 0),
  constraint workout_sets_weight_unit_check check (weight_unit is null or weight_unit in ('lb', 'kg')),
  constraint workout_sets_weight_unit_requires_weight check (weight_unit is null or weight is not null),
  constraint workout_sets_reps_nonnegative check (reps is null or reps >= 0),
  constraint workout_sets_rpe_range check (rpe is null or (rpe >= 1 and rpe <= 10)),
  constraint workout_sets_completed_requires_details check (
    not is_completed
    or reps is not null
    or weight is not null
    or btrim(coalesce(notes, '')) <> ''
  ),
  constraint workout_sets_notes_max_len check (notes is null or char_length(notes) <= 1000),
  constraint workout_sets_workout_exercise_position_unique unique (workout_exercise_id, position),
  constraint workout_sets_workout_exercise_owner_fkey foreign key (workout_exercise_id, user_id)
    references public.workout_exercises (id, user_id)
    on delete cascade
);

create or replace function public.validate_workout_exercise_exercise_owner()
returns trigger
language plpgsql
as $$
declare
  exercise_owner uuid;
begin
  if new.exercise_id is null then
    return new;
  end if;

  select e.user_id
  into exercise_owner
  from public.exercises e
  where e.id = new.exercise_id;

  if exercise_owner is null then
    raise exception 'Exercise not found for the provided exercise_id.';
  end if;

  if exercise_owner <> new.user_id then
    raise exception 'Exercise ownership mismatch.';
  end if;

  return new;
end;
$$;

create index if not exists exercises_user_id_created_at_desc_idx
  on public.exercises (user_id, created_at desc);

create unique index if not exists exercises_user_id_name_lower_unique_idx
  on public.exercises (user_id, lower(name));

create index if not exists exercises_user_id_updated_at_desc_idx
  on public.exercises (user_id, updated_at desc);

create index if not exists workouts_user_id_workout_date_desc_idx
  on public.workouts (user_id, workout_date desc);

create index if not exists workouts_user_id_created_at_desc_idx
  on public.workouts (user_id, created_at desc);

create index if not exists workout_exercises_user_id_workout_id_position_idx
  on public.workout_exercises (user_id, workout_id, position);

create index if not exists workout_exercises_user_id_exercise_id_idx
  on public.workout_exercises (user_id, exercise_id);

create index if not exists workout_sets_user_id_workout_exercise_id_position_idx
  on public.workout_sets (user_id, workout_exercise_id, position);

drop trigger if exists exercises_set_updated_at on public.exercises;
create trigger exercises_set_updated_at
before update on public.exercises
for each row
execute function public.set_updated_at();

drop trigger if exists workouts_set_updated_at on public.workouts;
create trigger workouts_set_updated_at
before update on public.workouts
for each row
execute function public.set_updated_at();

drop trigger if exists workout_exercises_set_updated_at on public.workout_exercises;
create trigger workout_exercises_set_updated_at
before update on public.workout_exercises
for each row
execute function public.set_updated_at();

drop trigger if exists workout_sets_set_updated_at on public.workout_sets;
create trigger workout_sets_set_updated_at
before update on public.workout_sets
for each row
execute function public.set_updated_at();

drop trigger if exists workout_exercises_validate_exercise_owner on public.workout_exercises;
create trigger workout_exercises_validate_exercise_owner
before insert or update on public.workout_exercises
for each row
execute function public.validate_workout_exercise_exercise_owner();

alter table public.exercises enable row level security;
alter table public.workouts enable row level security;
alter table public.workout_exercises enable row level security;
alter table public.workout_sets enable row level security;

drop policy if exists exercises_select_own on public.exercises;
create policy exercises_select_own
on public.exercises
for select
using (auth.uid() = user_id);

drop policy if exists exercises_insert_own on public.exercises;
create policy exercises_insert_own
on public.exercises
for insert
with check (auth.uid() = user_id);

drop policy if exists exercises_update_own on public.exercises;
create policy exercises_update_own
on public.exercises
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists exercises_delete_own on public.exercises;
create policy exercises_delete_own
on public.exercises
for delete
using (auth.uid() = user_id);

drop policy if exists workouts_select_own on public.workouts;
create policy workouts_select_own
on public.workouts
for select
using (auth.uid() = user_id);

drop policy if exists workouts_insert_own on public.workouts;
create policy workouts_insert_own
on public.workouts
for insert
with check (auth.uid() = user_id);

drop policy if exists workouts_update_own on public.workouts;
create policy workouts_update_own
on public.workouts
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists workouts_delete_own on public.workouts;
create policy workouts_delete_own
on public.workouts
for delete
using (auth.uid() = user_id);

drop policy if exists workout_exercises_select_own on public.workout_exercises;
create policy workout_exercises_select_own
on public.workout_exercises
for select
using (auth.uid() = user_id);

drop policy if exists workout_exercises_insert_own on public.workout_exercises;
create policy workout_exercises_insert_own
on public.workout_exercises
for insert
with check (auth.uid() = user_id);

drop policy if exists workout_exercises_update_own on public.workout_exercises;
create policy workout_exercises_update_own
on public.workout_exercises
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists workout_exercises_delete_own on public.workout_exercises;
create policy workout_exercises_delete_own
on public.workout_exercises
for delete
using (auth.uid() = user_id);

drop policy if exists workout_sets_select_own on public.workout_sets;
create policy workout_sets_select_own
on public.workout_sets
for select
using (auth.uid() = user_id);

drop policy if exists workout_sets_insert_own on public.workout_sets;
create policy workout_sets_insert_own
on public.workout_sets
for insert
with check (auth.uid() = user_id);

drop policy if exists workout_sets_update_own on public.workout_sets;
create policy workout_sets_update_own
on public.workout_sets
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists workout_sets_delete_own on public.workout_sets;
create policy workout_sets_delete_own
on public.workout_sets
for delete
using (auth.uid() = user_id);

grant select, insert, update, delete on public.exercises to authenticated;
grant select, insert, update, delete on public.workouts to authenticated;
grant select, insert, update, delete on public.workout_exercises to authenticated;
grant select, insert, update, delete on public.workout_sets to authenticated;
