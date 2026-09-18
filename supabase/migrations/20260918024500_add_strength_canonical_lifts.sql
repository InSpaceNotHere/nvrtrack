-- Session 10C P0.1
-- Adds structured canonical lift identity for trustworthy strength semantics.

alter table public.exercise_catalog
  add column if not exists canonical_lift text;

alter table public.exercises
  add column if not exists canonical_lift text;

alter table public.workout_exercises
  add column if not exists source_canonical_lift text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'exercise_catalog_canonical_lift_check'
      and conrelid = 'public.exercise_catalog'::regclass
  ) then
    alter table public.exercise_catalog
      add constraint exercise_catalog_canonical_lift_check
      check (canonical_lift is null or canonical_lift in ('bench_press', 'squat', 'deadlift'));
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'exercises_canonical_lift_check'
      and conrelid = 'public.exercises'::regclass
  ) then
    alter table public.exercises
      add constraint exercises_canonical_lift_check
      check (canonical_lift is null or canonical_lift in ('bench_press', 'squat', 'deadlift'));
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'workout_exercises_source_canonical_lift_check'
      and conrelid = 'public.workout_exercises'::regclass
  ) then
    alter table public.workout_exercises
      add constraint workout_exercises_source_canonical_lift_check
      check (source_canonical_lift is null or source_canonical_lift in ('bench_press', 'squat', 'deadlift'));
  end if;
end
$$;

create index if not exists exercise_catalog_canonical_lift_idx
  on public.exercise_catalog (canonical_lift);

create index if not exists exercises_user_id_canonical_lift_idx
  on public.exercises (user_id, canonical_lift);

create index if not exists workout_exercises_user_id_source_canonical_lift_idx
  on public.workout_exercises (user_id, source_canonical_lift);

-- Catalog backfill only for explicitly reviewed canonical competition variants.
update public.exercise_catalog
set canonical_lift = 'bench_press'
where lower(btrim(name)) = 'barbell bench press';

update public.exercise_catalog
set canonical_lift = 'squat'
where lower(btrim(name)) = 'back squat';

update public.exercise_catalog
set canonical_lift = 'deadlift'
where lower(btrim(name)) = 'conventional deadlift';

-- Custom/user exercise backfill only for exact canonical names.
update public.exercises
set canonical_lift = 'bench_press'
where canonical_lift is null
  and lower(btrim(name)) = 'barbell bench press';

update public.exercises
set canonical_lift = 'squat'
where canonical_lift is null
  and lower(btrim(name)) = 'back squat';

update public.exercises
set canonical_lift = 'deadlift'
where canonical_lift is null
  and lower(btrim(name)) = 'conventional deadlift';

-- Historical snapshot backfill prefers explicit linked metadata.
update public.workout_exercises as we
set source_canonical_lift = ec.canonical_lift
from public.exercise_catalog as ec
where we.catalog_exercise_id = ec.id
  and we.source_canonical_lift is null
  and ec.canonical_lift is not null;

update public.workout_exercises as we
set source_canonical_lift = ex.canonical_lift
from public.exercises as ex
where we.exercise_id = ex.id
  and we.source_canonical_lift is null
  and ex.canonical_lift is not null;

-- Snapshot-only backfill remains strict: only exact canonical names are classified.
update public.workout_exercises
set source_canonical_lift = 'bench_press'
where source_canonical_lift is null
  and catalog_exercise_id is null
  and exercise_id is null
  and lower(btrim(exercise_name)) = 'barbell bench press';

update public.workout_exercises
set source_canonical_lift = 'squat'
where source_canonical_lift is null
  and catalog_exercise_id is null
  and exercise_id is null
  and lower(btrim(exercise_name)) = 'back squat';

update public.workout_exercises
set source_canonical_lift = 'deadlift'
where source_canonical_lift is null
  and catalog_exercise_id is null
  and exercise_id is null
  and lower(btrim(exercise_name)) = 'conventional deadlift';
