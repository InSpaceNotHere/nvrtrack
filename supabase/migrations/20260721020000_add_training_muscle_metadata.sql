-- Session 9.6
-- Add structured muscle metadata for catalog, custom exercises, and workout snapshots.

alter table public.exercise_catalog
  add column if not exists primary_muscles text[] not null default '{}'::text[],
  add column if not exists secondary_muscles text[] not null default '{}'::text[],
  add column if not exists body_region text,
  add column if not exists muscle_metadata_version integer not null default 1;

alter table public.exercises
  add column if not exists primary_muscles text[] not null default '{}'::text[],
  add column if not exists secondary_muscles text[] not null default '{}'::text[],
  add column if not exists body_region text,
  add column if not exists movement_pattern text,
  add column if not exists muscle_metadata_version integer not null default 1;

alter table public.workout_exercises
  add column if not exists source_primary_muscles text[] not null default '{}'::text[],
  add column if not exists source_secondary_muscles text[] not null default '{}'::text[],
  add column if not exists source_body_region text,
  add column if not exists source_movement_pattern text,
  add column if not exists source_muscle_metadata_version integer;

create index if not exists exercise_catalog_primary_muscles_gin_idx
  on public.exercise_catalog using gin (primary_muscles);

create index if not exists exercise_catalog_body_region_idx
  on public.exercise_catalog (body_region);

create index if not exists exercise_catalog_movement_pattern_idx
  on public.exercise_catalog (movement_pattern);

create index if not exists exercises_user_id_primary_muscles_gin_idx
  on public.exercises using gin (primary_muscles);

create index if not exists exercises_user_id_body_region_idx
  on public.exercises (user_id, body_region);

create index if not exists exercises_user_id_movement_pattern_idx
  on public.exercises (user_id, movement_pattern);

create index if not exists workout_exercises_user_id_workout_id_source_primary_muscles_gin_idx
  on public.workout_exercises using gin (source_primary_muscles);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'exercise_catalog_primary_muscles_not_empty'
      and conrelid = 'public.exercise_catalog'::regclass
  ) then
    alter table public.exercise_catalog
      add constraint exercise_catalog_primary_muscles_not_empty
      check (cardinality(primary_muscles) > 0 or btrim(primary_muscle_group) <> '');
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'exercise_catalog_muscle_arrays_no_overlap'
      and conrelid = 'public.exercise_catalog'::regclass
  ) then
    alter table public.exercise_catalog
      add constraint exercise_catalog_muscle_arrays_no_overlap
      check (
        not exists (
          select 1
          from unnest(primary_muscles) as muscle
          where muscle = any(secondary_muscles)
        )
      );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'exercise_catalog_muscles_supported_values'
      and conrelid = 'public.exercise_catalog'::regclass
  ) then
    alter table public.exercise_catalog
      add constraint exercise_catalog_muscles_supported_values
      check (
        not exists (
          select 1
          from unnest(primary_muscles || secondary_muscles) as muscle
          where muscle not in (
            'chest', 'front_delts', 'side_delts', 'rear_delts', 'triceps', 'biceps', 'forearms',
            'lats', 'upper_back', 'traps', 'lower_back', 'abs', 'obliques', 'glutes',
            'quads', 'hamstrings', 'adductors', 'calves', 'hip_flexors'
          )
        )
      );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'exercises_muscle_arrays_no_overlap'
      and conrelid = 'public.exercises'::regclass
  ) then
    alter table public.exercises
      add constraint exercises_muscle_arrays_no_overlap
      check (
        not exists (
          select 1
          from unnest(primary_muscles) as muscle
          where muscle = any(secondary_muscles)
        )
      );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'exercises_muscles_supported_values'
      and conrelid = 'public.exercises'::regclass
  ) then
    alter table public.exercises
      add constraint exercises_muscles_supported_values
      check (
        not exists (
          select 1
          from unnest(primary_muscles || secondary_muscles) as muscle
          where muscle not in (
            'chest', 'front_delts', 'side_delts', 'rear_delts', 'triceps', 'biceps', 'forearms',
            'lats', 'upper_back', 'traps', 'lower_back', 'abs', 'obliques', 'glutes',
            'quads', 'hamstrings', 'adductors', 'calves', 'hip_flexors'
          )
        )
      );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'workout_exercises_source_muscle_arrays_no_overlap'
      and conrelid = 'public.workout_exercises'::regclass
  ) then
    alter table public.workout_exercises
      add constraint workout_exercises_source_muscle_arrays_no_overlap
      check (
        not exists (
          select 1
          from unnest(source_primary_muscles) as muscle
          where muscle = any(source_secondary_muscles)
        )
      );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'workout_exercises_source_muscles_supported_values'
      and conrelid = 'public.workout_exercises'::regclass
  ) then
    alter table public.workout_exercises
      add constraint workout_exercises_source_muscles_supported_values
      check (
        not exists (
          select 1
          from unnest(source_primary_muscles || source_secondary_muscles) as muscle
          where muscle not in (
            'chest', 'front_delts', 'side_delts', 'rear_delts', 'triceps', 'biceps', 'forearms',
            'lats', 'upper_back', 'traps', 'lower_back', 'abs', 'obliques', 'glutes',
            'quads', 'hamstrings', 'adductors', 'calves', 'hip_flexors'
          )
        )
      );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'exercise_catalog_body_region_check'
      and conrelid = 'public.exercise_catalog'::regclass
  ) then
    alter table public.exercise_catalog
      add constraint exercise_catalog_body_region_check
      check (
        body_region is null
        or body_region in ('upper_body', 'lower_body', 'core', 'posterior_chain', 'full_body')
      );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'exercises_body_region_check'
      and conrelid = 'public.exercises'::regclass
  ) then
    alter table public.exercises
      add constraint exercises_body_region_check
      check (
        body_region is null
        or body_region in ('upper_body', 'lower_body', 'core', 'posterior_chain', 'full_body')
      );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'exercises_movement_pattern_check'
      and conrelid = 'public.exercises'::regclass
  ) then
    alter table public.exercises
      add constraint exercises_movement_pattern_check
      check (
        movement_pattern is null
        or movement_pattern in (
          'horizontal_press', 'vertical_press', 'horizontal_pull', 'vertical_pull',
          'squat', 'hinge', 'unilateral_leg', 'knee_extension', 'knee_flexion',
          'ankle_plantarflexion', 'shoulder_abduction', 'shoulder_flexion',
          'elbow_flexion', 'elbow_extension', 'upper_pull', 'core',
          'hip_abduction', 'hip_adduction', 'carry', 'full_body', 'cardio', 'isometric'
        )
      );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'workout_exercises_source_body_region_check'
      and conrelid = 'public.workout_exercises'::regclass
  ) then
    alter table public.workout_exercises
      add constraint workout_exercises_source_body_region_check
      check (
        source_body_region is null
        or source_body_region in ('upper_body', 'lower_body', 'core', 'posterior_chain', 'full_body')
      );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'workout_exercises_source_movement_pattern_check'
      and conrelid = 'public.workout_exercises'::regclass
  ) then
    alter table public.workout_exercises
      add constraint workout_exercises_source_movement_pattern_check
      check (
        source_movement_pattern is null
        or source_movement_pattern in (
          'horizontal_press', 'vertical_press', 'horizontal_pull', 'vertical_pull',
          'squat', 'hinge', 'unilateral_leg', 'knee_extension', 'knee_flexion',
          'ankle_plantarflexion', 'shoulder_abduction', 'shoulder_flexion',
          'elbow_flexion', 'elbow_extension', 'upper_pull', 'core',
          'hip_abduction', 'hip_adduction', 'carry', 'full_body', 'cardio', 'isometric'
        )
      );
  end if;
end
$$;

with mapped_catalog as (
  select
    ec.id,
    case
      when ec.normalized_name like '%bench press%' or ec.normalized_name like '%chest press%' or ec.normalized_name like '%push up%' or ec.normalized_name like '%fly%' then array['chest']::text[]
      when ec.normalized_name like '%deadlift%' then array['glutes', 'hamstrings', 'lower_back']::text[]
      when ec.normalized_name like '%pull up%' or ec.normalized_name like '%chin up%' or ec.normalized_name like '%pulldown%' then array['lats', 'upper_back']::text[]
      when ec.normalized_name like '%row%' then array['upper_back', 'lats']::text[]
      when ec.normalized_name like '%squat%' then array['quads', 'glutes']::text[]
      when ec.normalized_name like '%lunge%' or ec.normalized_name like '%split squat%' or ec.normalized_name like '%step up%' then array['quads', 'glutes']::text[]
      when ec.normalized_name like '%leg extension%' then array['quads']::text[]
      when ec.normalized_name like '%leg curl%' or ec.normalized_name like '%hamstring%' then array['hamstrings']::text[]
      when ec.normalized_name like '%calf%' then array['calves']::text[]
      when ec.normalized_name like '%hip thrust%' or ec.normalized_name like '%glute bridge%' or ec.normalized_name like '%glute drive%' then array['glutes']::text[]
      when ec.normalized_name like '%lateral raise%' then array['side_delts']::text[]
      when ec.normalized_name like '%rear delt%' or ec.normalized_name like '%reverse fly%' or ec.normalized_name like '%face pull%' then array['rear_delts', 'upper_back']::text[]
      when ec.normalized_name like '%front raise%' then array['front_delts']::text[]
      when ec.normalized_name like '%curl%' then array['biceps']::text[]
      when ec.normalized_name like '%triceps%' or ec.normalized_name like '%pushdown%' or ec.normalized_name like '%skull crusher%' or ec.normalized_name like '%jm press%' then array['triceps']::text[]
      when ec.normalized_name like '%ab%' or ec.normalized_name like '%crunch%' or ec.normalized_name like '%plank%' or ec.normalized_name like '%woodchop%' or ec.normalized_name like '%pallof%' then array['abs', 'obliques']::text[]
      else case ec.movement_pattern
        when 'horizontal_press' then array['chest']::text[]
        when 'vertical_press' then array['front_delts', 'triceps']::text[]
        when 'horizontal_pull' then array['upper_back', 'lats']::text[]
        when 'vertical_pull' then array['lats', 'upper_back']::text[]
        when 'squat' then array['quads', 'glutes']::text[]
        when 'hinge' then array['glutes', 'hamstrings', 'lower_back']::text[]
        when 'unilateral_leg' then array['quads', 'glutes']::text[]
        when 'knee_extension' then array['quads']::text[]
        when 'knee_flexion' then array['hamstrings']::text[]
        when 'ankle_plantarflexion' then array['calves']::text[]
        when 'shoulder_abduction' then array['side_delts']::text[]
        when 'shoulder_flexion' then array['front_delts']::text[]
        when 'elbow_flexion' then array['biceps']::text[]
        when 'elbow_extension' then array['triceps']::text[]
        when 'upper_pull' then array['traps', 'upper_back']::text[]
        when 'core' then array['abs']::text[]
        when 'hip_abduction' then array['glutes']::text[]
        when 'hip_adduction' then array['adductors']::text[]
        when 'carry' then array['forearms', 'traps']::text[]
        when 'full_body' then array['glutes', 'upper_back']::text[]
        when 'cardio' then array['quads', 'calves', 'hip_flexors']::text[]
        when 'isometric' then array['abs']::text[]
        else array['upper_back']::text[]
      end
    end as mapped_primary,
    case ec.movement_pattern
      when 'horizontal_press' then array['front_delts', 'triceps']::text[]
      when 'vertical_press' then array['side_delts', 'triceps', 'chest']::text[]
      when 'horizontal_pull' then array['biceps', 'rear_delts', 'forearms']::text[]
      when 'vertical_pull' then array['biceps', 'rear_delts', 'forearms']::text[]
      when 'squat' then array['hamstrings', 'adductors', 'lower_back']::text[]
      when 'hinge' then array['traps', 'upper_back', 'forearms']::text[]
      when 'unilateral_leg' then array['hamstrings', 'adductors']::text[]
      when 'knee_extension' then array['glutes']::text[]
      when 'knee_flexion' then array['glutes']::text[]
      when 'ankle_plantarflexion' then array['hamstrings']::text[]
      when 'shoulder_abduction' then array['front_delts', 'rear_delts']::text[]
      when 'shoulder_flexion' then array['side_delts', 'chest']::text[]
      when 'elbow_flexion' then array['forearms']::text[]
      when 'elbow_extension' then array['front_delts']::text[]
      when 'upper_pull' then array['rear_delts', 'biceps', 'forearms']::text[]
      when 'core' then array['obliques', 'hip_flexors']::text[]
      when 'hip_abduction' then array['hamstrings']::text[]
      when 'hip_adduction' then array['quads']::text[]
      when 'carry' then array['upper_back', 'abs']::text[]
      when 'full_body' then array['quads', 'hamstrings', 'triceps']::text[]
      when 'cardio' then array['glutes', 'hamstrings']::text[]
      when 'isometric' then array['obliques']::text[]
      else '{}'::text[]
    end as mapped_secondary,
    case
      when ec.normalized_name like '%deadlift%' or ec.normalized_name like '%good morning%' then 'posterior_chain'
      when ec.movement_pattern in ('squat', 'unilateral_leg', 'knee_extension', 'knee_flexion', 'ankle_plantarflexion', 'hip_abduction', 'hip_adduction') then 'lower_body'
      when ec.movement_pattern in ('core', 'isometric') then 'core'
      when ec.movement_pattern in ('cardio', 'full_body', 'carry') then 'full_body'
      else 'upper_body'
    end as mapped_body_region
  from public.exercise_catalog ec
)
update public.exercise_catalog as ec
set
  primary_muscles = mapped.mapped_primary,
  secondary_muscles = (
    select coalesce(array_agg(muscle), '{}'::text[])
    from (
      select distinct muscle
      from unnest(mapped.mapped_secondary) as muscle
      where muscle <> all(mapped.mapped_primary)
    ) as filtered
  ),
  body_region = mapped.mapped_body_region,
  muscle_metadata_version = 1
from mapped_catalog as mapped
where ec.id = mapped.id;

update public.exercises
set
  primary_muscles = case lower(coalesce(muscle_group, ''))
    when 'chest' then array['chest']::text[]
    when 'shoulders' then array['front_delts']::text[]
    when 'triceps' then array['triceps']::text[]
    when 'biceps' then array['biceps']::text[]
    when 'forearms' then array['forearms']::text[]
    when 'back' then array['upper_back']::text[]
    when 'lats' then array['lats']::text[]
    when 'traps' then array['traps']::text[]
    when 'glutes' then array['glutes']::text[]
    when 'quadriceps' then array['quads']::text[]
    when 'quads' then array['quads']::text[]
    when 'hamstrings' then array['hamstrings']::text[]
    when 'adductors' then array['adductors']::text[]
    when 'calves' then array['calves']::text[]
    when 'core' then array['abs']::text[]
    when 'abs' then array['abs']::text[]
    when 'obliques' then array['obliques']::text[]
    when 'hip_flexors' then array['hip_flexors']::text[]
    else '{}'::text[]
  end,
  secondary_muscles = '{}'::text[],
  body_region = case lower(coalesce(muscle_group, ''))
    when 'core' then 'core'
    when 'abs' then 'core'
    when 'obliques' then 'core'
    when 'quadriceps' then 'lower_body'
    when 'quads' then 'lower_body'
    when 'hamstrings' then 'lower_body'
    when 'adductors' then 'lower_body'
    when 'calves' then 'lower_body'
    when 'glutes' then 'posterior_chain'
    when 'back' then 'upper_body'
    else null
  end,
  movement_pattern = null,
  muscle_metadata_version = 1
where cardinality(primary_muscles) = 0
  and cardinality(secondary_muscles) = 0;

update public.workout_exercises as we
set
  source_primary_muscles = ec.primary_muscles,
  source_secondary_muscles = ec.secondary_muscles,
  source_body_region = ec.body_region,
  source_movement_pattern = ec.movement_pattern,
  source_muscle_metadata_version = ec.muscle_metadata_version
from public.exercise_catalog as ec
where we.catalog_exercise_id = ec.id;

update public.workout_exercises as we
set
  source_primary_muscles = ex.primary_muscles,
  source_secondary_muscles = ex.secondary_muscles,
  source_body_region = ex.body_region,
  source_movement_pattern = ex.movement_pattern,
  source_muscle_metadata_version = ex.muscle_metadata_version
from public.exercises as ex
where we.exercise_id = ex.id;
