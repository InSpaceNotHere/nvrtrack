-- Session 9.6A
-- Structured template prescription metadata for ready-made training presets.

alter table public.workout_template_exercises
  add column if not exists working_sets integer,
  add column if not exists rep_range_min integer,
  add column if not exists rep_range_max integer,
  add column if not exists rest_seconds_min integer,
  add column if not exists rest_seconds_max integer,
  add column if not exists is_per_leg boolean not null default false;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'workout_template_exercises_working_sets_range'
      and conrelid = 'public.workout_template_exercises'::regclass
  ) then
    alter table public.workout_template_exercises
      add constraint workout_template_exercises_working_sets_range
      check (working_sets is null or (working_sets between 1 and 12));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'workout_template_exercises_rep_range_check'
      and conrelid = 'public.workout_template_exercises'::regclass
  ) then
    alter table public.workout_template_exercises
      add constraint workout_template_exercises_rep_range_check
      check (
        (
          rep_range_min is null and rep_range_max is null
        )
        or (
          rep_range_min is not null
          and rep_range_max is not null
          and rep_range_min between 1 and 50
          and rep_range_max between rep_range_min and 60
        )
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'workout_template_exercises_rest_range_check'
      and conrelid = 'public.workout_template_exercises'::regclass
  ) then
    alter table public.workout_template_exercises
      add constraint workout_template_exercises_rest_range_check
      check (
        (
          rest_seconds_min is null and rest_seconds_max is null
        )
        or (
          rest_seconds_min is not null
          and rest_seconds_max is not null
          and rest_seconds_min between 30 and 900
          and rest_seconds_max between rest_seconds_min and 1200
        )
      );
  end if;
end
$$;
