-- Session 9.5A
-- Global built-in exercise catalog and optional catalog references for workout exercises.

create table if not exists public.exercise_catalog (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  normalized_name text not null,
  aliases text[] not null default '{}'::text[],
  primary_muscle_group text not null,
  secondary_muscle_groups text[] not null default '{}'::text[],
  equipment text not null,
  movement_pattern text not null,
  instructions text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint exercise_catalog_name_not_blank check (btrim(name) <> ''),
  constraint exercise_catalog_name_max_len check (char_length(name) <= 120),
  constraint exercise_catalog_normalized_name_not_blank check (btrim(normalized_name) <> ''),
  constraint exercise_catalog_primary_muscle_group_not_blank check (btrim(primary_muscle_group) <> ''),
  constraint exercise_catalog_equipment_not_blank check (btrim(equipment) <> ''),
  constraint exercise_catalog_movement_pattern_not_blank check (btrim(movement_pattern) <> ''),
  constraint exercise_catalog_instructions_max_len check (instructions is null or char_length(instructions) <= 4000)
);

create unique index if not exists exercise_catalog_normalized_name_unique_idx
  on public.exercise_catalog (normalized_name);

create unique index if not exists exercise_catalog_name_lower_unique_idx
  on public.exercise_catalog (lower(name));

create index if not exists exercise_catalog_primary_muscle_group_idx
  on public.exercise_catalog (primary_muscle_group);

create index if not exists exercise_catalog_equipment_idx
  on public.exercise_catalog (equipment);

create index if not exists exercise_catalog_is_active_idx
  on public.exercise_catalog (is_active);

create index if not exists exercise_catalog_aliases_gin_idx
  on public.exercise_catalog
  using gin (aliases);

drop trigger if exists exercise_catalog_set_updated_at on public.exercise_catalog;
create trigger exercise_catalog_set_updated_at
before update on public.exercise_catalog
for each row
execute function public.set_updated_at();

alter table public.workout_exercises
  add column if not exists catalog_exercise_id uuid references public.exercise_catalog (id) on delete set null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'workout_exercises_single_reference_check'
      and conrelid = 'public.workout_exercises'::regclass
  ) then
    alter table public.workout_exercises
      add constraint workout_exercises_single_reference_check
      check (num_nonnulls(exercise_id, catalog_exercise_id) <= 1);
  end if;
end
$$;

create index if not exists workout_exercises_user_id_catalog_exercise_id_idx
  on public.workout_exercises (user_id, catalog_exercise_id);

with raw_seed as (
  -- Explicit canonical entries and alias-heavy records first.
  select *
  from (
    values
      (1, 'Barbell Bench Press', 'barbell', 'horizontal_press', array['bench', 'bb bench', 'flat bench']::text[]),
      (1, 'Incline Barbell Bench Press', 'barbell', 'horizontal_press', array['incline bench', 'incline barbell bench']::text[]),
      (1, 'Dumbbell Bench Press', 'dumbbell', 'horizontal_press', array['db bench', 'dumbbell flat bench']::text[]),
      (1, 'Incline Dumbbell Bench Press', 'dumbbell', 'horizontal_press', array['incline db bench', 'incline dumbbell bench']::text[]),
      (1, 'Smith Machine Incline Press', 'smith machine', 'horizontal_press', array['smith incline press']::text[]),
      (1, 'Cable Fly', 'cable', 'horizontal_press', array['cable chest fly']::text[]),
      (1, 'Back Squat', 'barbell', 'squat', array['barbell back squat', 'squat']::text[]),
      (1, 'Front Squat', 'barbell', 'squat', array['barbell front squat']::text[]),
      (1, 'Romanian Deadlift', 'barbell', 'hinge', array['rdl', 'barbell rdl']::text[]),
      (1, 'Conventional Deadlift', 'barbell', 'hinge', array['deadlift', 'conventional dl']::text[]),
      (1, 'Lat Pulldown', 'cable', 'vertical_pull', array['pulldown', 'lat pull down']::text[]),
      (1, 'Pull-Up', 'bodyweight', 'vertical_pull', array['pullup']::text[]),
      (1, 'Barbell Row', 'barbell', 'horizontal_pull', array['barbell bent over row', 'bb row']::text[]),
      (1, 'Chest-Supported Row', 'machine', 'horizontal_pull', array['chest supported row']::text[]),
      (1, 'Dumbbell Lateral Raise', 'dumbbell', 'shoulder_abduction', array['side raise', 'db lateral raise']::text[]),
      (1, 'Cable Lateral Raise', 'cable', 'shoulder_abduction', array['cable side raise']::text[]),
      (1, 'Barbell Curl', 'barbell', 'elbow_flexion', array['bb curl']::text[]),
      (1, 'Preacher Curl', 'machine', 'elbow_flexion', array['ez preacher curl']::text[]),
      (1, 'Triceps Pushdown', 'cable', 'elbow_extension', array['tricep pressdown', 'triceps pressdown', 'rope pushdown']::text[]),
      (1, 'Leg Press', 'machine', 'squat', array['machine leg press']::text[]),
      (1, 'Leg Extension', 'machine', 'knee_extension', array['machine leg extension']::text[]),
      (1, 'Seated Leg Curl', 'machine', 'knee_flexion', array['machine leg curl']::text[]),
      (1, 'Standing Calf Raise', 'machine', 'ankle_plantarflexion', array['calf raise standing']::text[]),
      (1, 'Overhead Press', 'barbell', 'vertical_press', array['military press']::text[]),
      (1, 'Push Press', 'barbell', 'vertical_press', array['bb push press']::text[]),
      (1, 'Hip Thrust', 'barbell', 'hinge', array['barbell hip thrust']::text[]),
      (1, 'Face Pull', 'cable', 'horizontal_pull', array['rope face pull']::text[]),
      (1, 'Seated Cable Row', 'cable', 'horizontal_pull', array['cable row']::text[]),
      (1, 'Assisted Dip', 'machine', 'vertical_press', array['dip machine']::text[]),
      (1, 'Assisted Pull-Up', 'machine', 'vertical_pull', array['assisted pullup']::text[]),
      (1, 'Chest Press Machine', 'machine', 'horizontal_press', array['machine chest press']::text[]),
      (1, 'Incline Chest Press Machine', 'machine', 'horizontal_press', array['machine incline chest press']::text[]),
      (1, 'Seated Leg Press', 'plate-loaded', 'squat', array['plate loaded leg press']::text[]),
      (1, 'Hack Squat Machine', 'machine', 'squat', array['machine hack squat']::text[]),
      (1, 'Walking Lunge', 'bodyweight', 'unilateral_leg', array['walking lunges']::text[]),
      (1, 'Chin-Up', 'bodyweight', 'vertical_pull', array['chinup']::text[]),
      (1, 'Bodyweight Squat', 'bodyweight', 'squat', array['air squat']::text[]),
      (1, 'Treadmill Run', 'cardio', 'cardio', array['running treadmill']::text[]),
      (1, 'Stationary Bike', 'cardio', 'cardio', array['exercise bike', 'spin bike']::text[]),
      (1, 'Rowing Machine', 'cardio', 'cardio', array['rower', 'erg row']::text[])
  ) as explicit_seed(priority, name, equipment, movement_pattern, aliases)

  union all

  -- Barbell catalog additions.
  select 2, 'Barbell ' || x.name, 'barbell', x.movement_pattern, '{}'::text[]
  from (
    values
      ('Incline Bench Press', 'horizontal_press'),
      ('Decline Bench Press', 'horizontal_press'),
      ('Floor Press', 'horizontal_press'),
      ('Close-Grip Bench Press', 'horizontal_press'),
      ('Pin Press', 'horizontal_press'),
      ('Behind-the-Neck Press', 'vertical_press'),
      ('Bradford Press', 'vertical_press'),
      ('Pause Back Squat', 'squat'),
      ('Box Squat', 'squat'),
      ('Zercher Squat', 'squat'),
      ('Split Squat', 'unilateral_leg'),
      ('Good Morning', 'hinge'),
      ('Stiff-Leg Deadlift', 'hinge'),
      ('Sumo Deadlift', 'hinge'),
      ('Deficit Deadlift', 'hinge'),
      ('Rack Pull', 'hinge'),
      ('Snatch-Grip Deadlift', 'hinge'),
      ('Pendlay Row', 'horizontal_pull'),
      ('Bent-Over Row', 'horizontal_pull'),
      ('Underhand Row', 'horizontal_pull'),
      ('High Pull', 'upper_pull'),
      ('Shrug', 'upper_pull'),
      ('Glute Bridge', 'hinge'),
      ('Lunge', 'unilateral_leg'),
      ('Reverse Lunge', 'unilateral_leg'),
      ('Walking Lunge', 'unilateral_leg'),
      ('Standing Calf Raise', 'ankle_plantarflexion'),
      ('Seated Calf Raise', 'ankle_plantarflexion'),
      ('Reverse Curl', 'elbow_flexion'),
      ('Drag Curl', 'elbow_flexion'),
      ('Skull Crusher', 'elbow_extension'),
      ('JM Press', 'elbow_extension'),
      ('Landmine Press', 'vertical_press'),
      ('Landmine Row', 'horizontal_pull'),
      ('Hip Thrust', 'hinge'),
      ('Hack Squat', 'squat'),
      ('Front Raise', 'shoulder_flexion'),
      ('Upright Row', 'upper_pull'),
      ('Biceps Curl', 'elbow_flexion'),
      ('Overhead Triceps Extension', 'elbow_extension'),
      ('Ab Rollout', 'core'),
      ('Split Jerk', 'vertical_press')
  ) as x(name, movement_pattern)

  union all

  -- Dumbbell catalog additions.
  select 2, 'Dumbbell ' || x.name, 'dumbbell', x.movement_pattern, '{}'::text[]
  from (
    values
      ('Incline Press', 'horizontal_press'),
      ('Decline Press', 'horizontal_press'),
      ('Floor Press', 'horizontal_press'),
      ('Fly', 'horizontal_press'),
      ('Incline Fly', 'horizontal_press'),
      ('Pullover', 'horizontal_pull'),
      ('Shoulder Press', 'vertical_press'),
      ('Arnold Press', 'vertical_press'),
      ('Lateral Raise', 'shoulder_abduction'),
      ('Front Raise', 'shoulder_flexion'),
      ('Rear Delt Fly', 'horizontal_pull'),
      ('Upright Row', 'upper_pull'),
      ('Shrug', 'upper_pull'),
      ('Bent-Over Row', 'horizontal_pull'),
      ('Single-Arm Row', 'horizontal_pull'),
      ('Chest-Supported Row', 'horizontal_pull'),
      ('Renegade Row', 'horizontal_pull'),
      ('Romanian Deadlift', 'hinge'),
      ('Stiff-Leg Deadlift', 'hinge'),
      ('Goblet Squat', 'squat'),
      ('Front Squat', 'squat'),
      ('Split Squat', 'unilateral_leg'),
      ('Bulgarian Split Squat', 'unilateral_leg'),
      ('Step-Up', 'unilateral_leg'),
      ('Lunge', 'unilateral_leg'),
      ('Reverse Lunge', 'unilateral_leg'),
      ('Walking Lunge', 'unilateral_leg'),
      ('Hip Thrust', 'hinge'),
      ('Glute Bridge', 'hinge'),
      ('Calf Raise', 'ankle_plantarflexion'),
      ('Hammer Curl', 'elbow_flexion'),
      ('Biceps Curl', 'elbow_flexion'),
      ('Concentration Curl', 'elbow_flexion'),
      ('Zottman Curl', 'elbow_flexion'),
      ('Incline Curl', 'elbow_flexion'),
      ('Preacher Curl', 'elbow_flexion'),
      ('Triceps Extension', 'elbow_extension'),
      ('Overhead Triceps Extension', 'elbow_extension'),
      ('Skull Crusher', 'elbow_extension'),
      ('Kickback', 'elbow_extension'),
      ('Farmer Carry', 'carry'),
      ('Suitcase Carry', 'carry'),
      ('Thruster', 'full_body'),
      ('Snatch', 'full_body'),
      ('Clean', 'full_body')
  ) as x(name, movement_pattern)

  union all

  -- Cable catalog additions.
  select 2, 'Cable ' || x.name, 'cable', x.movement_pattern, '{}'::text[]
  from (
    values
      ('High-to-Low Fly', 'horizontal_press'),
      ('Low-to-High Fly', 'horizontal_press'),
      ('Crossover', 'horizontal_press'),
      ('Chest Press', 'horizontal_press'),
      ('Incline Press', 'horizontal_press'),
      ('Single-Arm Press', 'horizontal_press'),
      ('Seated Row', 'horizontal_pull'),
      ('Single-Arm Row', 'horizontal_pull'),
      ('Wide-Grip Lat Pulldown', 'vertical_pull'),
      ('Close-Grip Lat Pulldown', 'vertical_pull'),
      ('Straight-Arm Pulldown', 'vertical_pull'),
      ('Face Pull', 'horizontal_pull'),
      ('Rear Delt Fly', 'horizontal_pull'),
      ('Upright Row', 'upper_pull'),
      ('Lateral Raise', 'shoulder_abduction'),
      ('Front Raise', 'shoulder_flexion'),
      ('Y Raise', 'shoulder_abduction'),
      ('Biceps Curl', 'elbow_flexion'),
      ('Hammer Curl', 'elbow_flexion'),
      ('Bayesian Curl', 'elbow_flexion'),
      ('Triceps Pushdown', 'elbow_extension'),
      ('Overhead Triceps Extension', 'elbow_extension'),
      ('Rope Overhead Triceps Extension', 'elbow_extension'),
      ('Crunch', 'core'),
      ('Pallof Press', 'core'),
      ('Woodchop', 'core'),
      ('Reverse Woodchop', 'core'),
      ('Pull-Through', 'hinge'),
      ('Glute Kickback', 'hinge'),
      ('Hip Abduction', 'hip_abduction'),
      ('Hip Adduction', 'hip_adduction'),
      ('Leg Curl', 'knee_flexion'),
      ('Leg Extension', 'knee_extension'),
      ('Lunge', 'unilateral_leg'),
      ('Split Squat', 'unilateral_leg'),
      ('Lateral Lunge', 'unilateral_leg'),
      ('Shrug', 'upper_pull'),
      ('Pullover', 'vertical_pull'),
      ('Reverse Fly', 'horizontal_pull'),
      ('Standing Chest Press', 'horizontal_press')
  ) as x(name, movement_pattern)

  union all

  -- Selectorized machine catalog additions.
  select 2, 'Machine ' || x.name, 'machine', x.movement_pattern, '{}'::text[]
  from (
    values
      ('Chest Press', 'horizontal_press'),
      ('Incline Chest Press', 'horizontal_press'),
      ('Shoulder Press', 'vertical_press'),
      ('Lateral Raise', 'shoulder_abduction'),
      ('Pec Deck Fly', 'horizontal_press'),
      ('Rear Delt Fly', 'horizontal_pull'),
      ('Lat Pulldown', 'vertical_pull'),
      ('Seated Row', 'horizontal_pull'),
      ('High Row', 'horizontal_pull'),
      ('Low Row', 'horizontal_pull'),
      ('Pullover', 'vertical_pull'),
      ('Biceps Curl', 'elbow_flexion'),
      ('Triceps Extension', 'elbow_extension'),
      ('Dip', 'vertical_press'),
      ('Leg Press', 'squat'),
      ('Hack Squat', 'squat'),
      ('Pendulum Squat', 'squat'),
      ('Belt Squat', 'squat'),
      ('Leg Extension', 'knee_extension'),
      ('Seated Leg Curl', 'knee_flexion'),
      ('Lying Leg Curl', 'knee_flexion'),
      ('Standing Leg Curl', 'knee_flexion'),
      ('Glute Drive', 'hinge'),
      ('Hip Abduction', 'hip_abduction'),
      ('Hip Adduction', 'hip_adduction'),
      ('Calf Raise', 'ankle_plantarflexion'),
      ('Seated Calf Raise', 'ankle_plantarflexion'),
      ('Ab Crunch', 'core'),
      ('Rotary Torso', 'core'),
      ('Back Extension', 'hinge'),
      ('Shrug', 'upper_pull'),
      ('Front Raise', 'shoulder_flexion'),
      ('Reverse Fly', 'horizontal_pull'),
      ('Single-Arm Row', 'horizontal_pull'),
      ('Split Squat', 'unilateral_leg'),
      ('Lunge', 'unilateral_leg')
  ) as x(name, movement_pattern)

  union all

  -- Smith machine catalog additions.
  select 2, 'Smith Machine ' || x.name, 'smith machine', x.movement_pattern, '{}'::text[]
  from (
    values
      ('Bench Press', 'horizontal_press'),
      ('Incline Press', 'horizontal_press'),
      ('Decline Press', 'horizontal_press'),
      ('Close-Grip Bench Press', 'horizontal_press'),
      ('Shoulder Press', 'vertical_press'),
      ('Behind-the-Neck Press', 'vertical_press'),
      ('Front Squat', 'squat'),
      ('Back Squat', 'squat'),
      ('Box Squat', 'squat'),
      ('Split Squat', 'unilateral_leg'),
      ('Bulgarian Split Squat', 'unilateral_leg'),
      ('Lunge', 'unilateral_leg'),
      ('Reverse Lunge', 'unilateral_leg'),
      ('Romanian Deadlift', 'hinge'),
      ('Conventional Deadlift', 'hinge'),
      ('Good Morning', 'hinge'),
      ('Hip Thrust', 'hinge'),
      ('Calf Raise', 'ankle_plantarflexion'),
      ('Shrug', 'upper_pull'),
      ('Bent-Over Row', 'horizontal_pull'),
      ('Upright Row', 'upper_pull'),
      ('High Pull', 'upper_pull'),
      ('Drag Curl', 'elbow_flexion'),
      ('Skull Crusher', 'elbow_extension'),
      ('JM Press', 'elbow_extension')
  ) as x(name, movement_pattern)

  union all

  -- Bodyweight catalog additions.
  select 2, x.name, 'bodyweight', x.movement_pattern, '{}'::text[]
  from (
    values
      ('Push-Up', 'horizontal_press'),
      ('Incline Push-Up', 'horizontal_press'),
      ('Decline Push-Up', 'horizontal_press'),
      ('Deficit Push-Up', 'horizontal_press'),
      ('Diamond Push-Up', 'horizontal_press'),
      ('Pike Push-Up', 'vertical_press'),
      ('Handstand Push-Up', 'vertical_press'),
      ('Dip', 'vertical_press'),
      ('Bench Dip', 'vertical_press'),
      ('Neutral-Grip Pull-Up', 'vertical_pull'),
      ('Inverted Row', 'horizontal_pull'),
      ('Australian Pull-Up', 'horizontal_pull'),
      ('Jump Squat', 'squat'),
      ('Split Squat', 'unilateral_leg'),
      ('Bulgarian Split Squat', 'unilateral_leg'),
      ('Reverse Lunge', 'unilateral_leg'),
      ('Step-Up', 'unilateral_leg'),
      ('Single-Leg Glute Bridge', 'hinge'),
      ('Nordic Hamstring Curl', 'knee_flexion'),
      ('Single-Leg Calf Raise', 'ankle_plantarflexion'),
      ('Crunch', 'core'),
      ('Bicycle Crunch', 'core'),
      ('Leg Raise', 'core'),
      ('Hanging Leg Raise', 'core'),
      ('Plank', 'core'),
      ('Side Plank', 'core'),
      ('Mountain Climber', 'core'),
      ('Burpee', 'full_body'),
      ('Jumping Jack', 'cardio'),
      ('High Knees', 'cardio'),
      ('Skater Jump', 'cardio'),
      ('Bear Crawl', 'full_body'),
      ('Wall Sit', 'isometric'),
      ('Reverse Crunch', 'core'),
      ('Hollow Hold', 'core')
  ) as x(name, movement_pattern)

  union all

  -- Plate-loaded catalog additions.
  select 2, x.name, 'plate-loaded', x.movement_pattern, '{}'::text[]
  from (
    values
      ('Plate-Loaded Chest Press', 'horizontal_press'),
      ('Plate-Loaded Incline Chest Press', 'horizontal_press'),
      ('Plate-Loaded Shoulder Press', 'vertical_press'),
      ('Plate-Loaded Seated Row', 'horizontal_pull'),
      ('Plate-Loaded High Row', 'horizontal_pull'),
      ('Plate-Loaded Iso-Lateral Row', 'horizontal_pull'),
      ('Plate-Loaded Pulldown', 'vertical_pull'),
      ('Plate-Loaded Squat Press', 'squat'),
      ('Plate-Loaded Leg Press', 'squat'),
      ('Plate-Loaded Hack Squat', 'squat'),
      ('Plate-Loaded Calf Raise', 'ankle_plantarflexion'),
      ('Plate-Loaded Seated Calf Raise', 'ankle_plantarflexion'),
      ('Plate-Loaded Glute Drive', 'hinge'),
      ('Plate-Loaded Hip Press', 'hinge'),
      ('Plate-Loaded Shrug', 'upper_pull'),
      ('Plate-Loaded Dip', 'vertical_press'),
      ('Plate-Loaded Pullover', 'vertical_pull'),
      ('Plate-Loaded Reverse Fly', 'horizontal_pull'),
      ('Plate-Loaded Biceps Curl', 'elbow_flexion'),
      ('Plate-Loaded Triceps Press', 'elbow_extension')
  ) as x(name, movement_pattern)

  union all

  -- Cardio catalog additions.
  select 2, x.name, 'cardio', 'cardio', '{}'::text[]
  from (
    values
      ('Treadmill Incline Walk'),
      ('Outdoor Run'),
      ('Outdoor Walk'),
      ('Air Bike'),
      ('Ski Erg'),
      ('Elliptical'),
      ('Stair Climber'),
      ('Jump Rope'),
      ('Assault Bike Sprint'),
      ('Sled Push'),
      ('Sled Pull'),
      ('Swimming'),
      ('Cycling'),
      ('Arc Trainer'),
      ('Battle Rope Waves'),
      ('Shadow Boxing'),
      ('Rowing Intervals'),
      ('Jog'),
      ('Ruck Walk'),
      ('Hike'),
      ('Farmer Carry Conditioning'),
      ('Burpee Intervals'),
      ('Stair Run'),
      ('Tempo Run'),
      ('Spin Bike')
  ) as x(name)
),
dedup_seed as (
  select distinct on (lower(name))
    priority,
    btrim(name) as name,
    equipment,
    movement_pattern,
    aliases
  from raw_seed
  where btrim(name) <> ''
  order by lower(name), priority
),
prepared_seed as (
  select
    name,
    btrim(regexp_replace(regexp_replace(lower(name), '[^a-z0-9 ]', ' ', 'g'), '\s+', ' ', 'g')) as normalized_name,
    aliases,
    case
      when movement_pattern = 'cardio' then 'cardio'
      when name ilike '%calf%' then 'calves'
      when name ilike '%leg extension%' then 'quadriceps'
      when name ilike '%leg curl%' or name ilike '%hamstring%' then 'hamstrings'
      when name ilike '%squat%' or name ilike '%lunge%' or name ilike '%step-up%' then 'quadriceps'
      when name ilike '%deadlift%' or name ilike '%good morning%' or name ilike '%hip thrust%' or name ilike '%glute%' then 'glutes'
      when name ilike '%press%' and name ilike '%shoulder%' then 'shoulders'
      when name ilike '%lateral raise%' or name ilike '%rear delt%' or name ilike '%front raise%' then 'shoulders'
      when name ilike '%bench press%' or name ilike '%chest press%' or name ilike '%fly%' or name ilike '%push-up%' or name ilike '%dip%' then 'chest'
      when name ilike '%row%' or name ilike '%pulldown%' or name ilike '%pull-up%' or name ilike '%chin-up%' or name ilike '%pullover%' or name ilike '%face pull%' then 'back'
      when name ilike '%curl%' then 'biceps'
      when name ilike '%triceps%' or name ilike '%skull crusher%' or name ilike '%jm press%' or name ilike '%pushdown%' then 'triceps'
      when name ilike '%plank%' or name ilike '%crunch%' or name ilike '%pallof%' or name ilike '%woodchop%' or name ilike '%hollow hold%' then 'core'
      else 'full body'
    end as primary_muscle_group,
    case
      when movement_pattern = 'cardio' then '{}'::text[]
      when name ilike '%bench press%' or name ilike '%chest press%' then array['triceps', 'shoulders']::text[]
      when name ilike '%overhead press%' or name ilike '%shoulder press%' then array['triceps', 'upper chest']::text[]
      when name ilike '%row%' or name ilike '%pulldown%' or name ilike '%pull-up%' or name ilike '%chin-up%' then array['biceps', 'rear delts']::text[]
      when name ilike '%squat%' or name ilike '%lunge%' then array['glutes', 'adductors']::text[]
      when name ilike '%deadlift%' or name ilike '%hinge%' or name ilike '%good morning%' then array['hamstrings', 'lower back']::text[]
      when name ilike '%curl%' then array['forearms']::text[]
      when name ilike '%triceps%' or name ilike '%skull crusher%' or name ilike '%pushdown%' then array['shoulders']::text[]
      when name ilike '%plank%' or name ilike '%crunch%' then array['obliques']::text[]
      else '{}'::text[]
    end as secondary_muscle_groups,
    equipment,
    movement_pattern
  from dedup_seed
)
insert into public.exercise_catalog (
  name,
  normalized_name,
  aliases,
  primary_muscle_group,
  secondary_muscle_groups,
  equipment,
  movement_pattern,
  instructions,
  is_active
)
select
  name,
  normalized_name,
  aliases,
  primary_muscle_group,
  secondary_muscle_groups,
  equipment,
  movement_pattern,
  null as instructions,
  true as is_active
from prepared_seed
on conflict (normalized_name)
do update set
  name = excluded.name,
  aliases = excluded.aliases,
  primary_muscle_group = excluded.primary_muscle_group,
  secondary_muscle_groups = excluded.secondary_muscle_groups,
  equipment = excluded.equipment,
  movement_pattern = excluded.movement_pattern,
  is_active = excluded.is_active,
  updated_at = now();

alter table public.exercise_catalog enable row level security;

drop policy if exists exercise_catalog_select_active on public.exercise_catalog;
create policy exercise_catalog_select_active
on public.exercise_catalog
for select
to authenticated
using (is_active = true);

grant select on public.exercise_catalog to authenticated;
