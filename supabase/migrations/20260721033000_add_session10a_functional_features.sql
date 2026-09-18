-- Session 10A functional parity foundation
-- Adds workout planner, progress photos, body measurements, weekly journal,
-- and in-app notifications framework.

alter table public.profiles
  add column if not exists timezone text not null default 'UTC';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_timezone_format_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_timezone_format_check
      check (char_length(btrim(timezone)) between 1 and 64);
  end if;
end
$$;

create table if not exists public.workout_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  template_type text not null default 'custom',
  estimated_duration_minutes integer,
  notes text,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workout_templates_name_not_blank check (btrim(name) <> ''),
  constraint workout_templates_name_max_len check (char_length(name) <= 120),
  constraint workout_templates_type_check check (template_type in ('push', 'pull', 'legs', 'upper', 'lower', 'custom')),
  constraint workout_templates_estimated_duration_range check (
    estimated_duration_minutes is null or (estimated_duration_minutes >= 1 and estimated_duration_minutes <= 300)
  ),
  constraint workout_templates_notes_max_len check (notes is null or char_length(notes) <= 2000),
  constraint workout_templates_id_user_id_unique unique (id, user_id)
);

create unique index if not exists workout_templates_user_id_name_lower_unique_idx
  on public.workout_templates (user_id, lower(name));

create index if not exists workout_templates_user_id_is_archived_idx
  on public.workout_templates (user_id, is_archived, updated_at desc);

create table if not exists public.workout_template_exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  template_id uuid not null,
  exercise_id uuid references public.exercises (id) on delete set null,
  catalog_exercise_id uuid references public.exercise_catalog (id) on delete set null,
  exercise_name text not null,
  position integer not null,
  notes text,
  primary_muscles text[] not null default '{}'::text[],
  secondary_muscles text[] not null default '{}'::text[],
  body_region text,
  movement_pattern text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workout_template_exercises_template_owner_fkey foreign key (template_id, user_id)
    references public.workout_templates (id, user_id)
    on delete cascade,
  constraint workout_template_exercises_name_not_blank check (btrim(exercise_name) <> ''),
  constraint workout_template_exercises_name_max_len check (char_length(exercise_name) <= 120),
  constraint workout_template_exercises_position_nonnegative check (position >= 0),
  constraint workout_template_exercises_notes_max_len check (notes is null or char_length(notes) <= 1000),
  constraint workout_template_exercises_template_position_unique unique (template_id, position),
  constraint workout_template_exercises_single_reference_check check (num_nonnulls(exercise_id, catalog_exercise_id) <= 1),
  constraint workout_template_exercises_muscle_arrays_no_overlap check (
    not (primary_muscles && secondary_muscles)
  ),
  constraint workout_template_exercises_muscles_supported_values check (
    (primary_muscles || secondary_muscles) <@ array[
      'chest', 'front_delts', 'side_delts', 'rear_delts', 'triceps', 'biceps', 'forearms',
      'lats', 'upper_back', 'traps', 'lower_back', 'abs', 'obliques', 'glutes',
      'quads', 'hamstrings', 'adductors', 'calves', 'hip_flexors'
    ]::text[]
  ),
  constraint workout_template_exercises_body_region_check check (
    body_region is null
    or body_region in ('upper_body', 'lower_body', 'core', 'posterior_chain', 'full_body')
  ),
  constraint workout_template_exercises_movement_pattern_check check (
    movement_pattern is null
    or movement_pattern in (
      'horizontal_press', 'vertical_press', 'horizontal_pull', 'vertical_pull',
      'squat', 'hinge', 'unilateral_leg', 'knee_extension', 'knee_flexion',
      'ankle_plantarflexion', 'shoulder_abduction', 'shoulder_flexion',
      'elbow_flexion', 'elbow_extension', 'upper_pull', 'core',
      'hip_abduction', 'hip_adduction', 'carry', 'full_body', 'cardio', 'isometric'
    )
  )
);

create index if not exists workout_template_exercises_user_id_template_id_position_idx
  on public.workout_template_exercises (user_id, template_id, position);

create index if not exists workout_template_exercises_primary_muscles_gin_idx
  on public.workout_template_exercises using gin (primary_muscles);

create table if not exists public.workout_weekday_schedule (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  weekday smallint not null,
  template_id uuid references public.workout_templates (id) on delete set null,
  is_rest_day boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workout_weekday_schedule_weekday_range check (weekday >= 0 and weekday <= 6),
  constraint workout_weekday_schedule_user_weekday_unique unique (user_id, weekday),
  constraint workout_weekday_schedule_rest_or_template check (not (is_rest_day and template_id is not null))
);

create table if not exists public.workout_schedule_overrides (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  plan_date date not null,
  template_id uuid references public.workout_templates (id) on delete set null,
  status text not null default 'scheduled',
  is_rest_day boolean not null default false,
  moved_to_date date,
  moved_from_date date,
  workout_id uuid references public.workouts (id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workout_schedule_overrides_status_check check (status in ('scheduled', 'completed', 'skipped', 'moved')),
  constraint workout_schedule_overrides_user_plan_date_unique unique (user_id, plan_date),
  constraint workout_schedule_overrides_rest_or_template check (not (is_rest_day and template_id is not null)),
  constraint workout_schedule_overrides_notes_max_len check (notes is null or char_length(notes) <= 1000)
);

create index if not exists workout_schedule_overrides_user_id_plan_date_idx
  on public.workout_schedule_overrides (user_id, plan_date desc);

create table if not exists public.progress_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  photo_date date not null,
  view text not null,
  storage_path text not null,
  mime_type text not null,
  byte_size integer not null,
  original_filename text not null,
  weight numeric,
  weight_unit text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint progress_photos_user_date_view_unique unique (user_id, photo_date, view),
  constraint progress_photos_view_check check (view in ('front', 'side', 'back')),
  constraint progress_photos_storage_path_not_blank check (btrim(storage_path) <> ''),
  constraint progress_photos_mime_type_check check (mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  constraint progress_photos_byte_size_check check (byte_size > 0 and byte_size <= 4194304),
  constraint progress_photos_original_filename_not_blank check (btrim(original_filename) <> ''),
  constraint progress_photos_original_filename_max_len check (char_length(original_filename) <= 255),
  constraint progress_photos_weight_nonnegative check (weight is null or weight > 0),
  constraint progress_photos_weight_unit_check check (weight_unit is null or weight_unit in ('lb', 'kg')),
  constraint progress_photos_notes_max_len check (notes is null or char_length(notes) <= 1000)
);

create index if not exists progress_photos_user_id_photo_date_idx
  on public.progress_photos (user_id, photo_date desc, created_at desc);

create unique index if not exists progress_photos_user_id_storage_path_unique_idx
  on public.progress_photos (user_id, storage_path);

create table if not exists public.body_measurement_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  entry_date date not null,
  measurements jsonb not null default '{}'::jsonb,
  custom_measurements jsonb not null default '{}'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint body_measurement_entries_user_entry_date_unique unique (user_id, entry_date),
  constraint body_measurement_entries_notes_max_len check (notes is null or char_length(notes) <= 1000),
  constraint body_measurement_entries_measurements_object check (jsonb_typeof(measurements) = 'object'),
  constraint body_measurement_entries_custom_measurements_object check (jsonb_typeof(custom_measurements) = 'object')
);

create index if not exists body_measurement_entries_user_id_entry_date_idx
  on public.body_measurement_entries (user_id, entry_date desc);

create table if not exists public.weekly_journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  week_start date not null,
  notes text,
  mood text,
  recovery integer,
  energy integer,
  sleep_hours numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint weekly_journal_entries_user_week_unique unique (user_id, week_start),
  constraint weekly_journal_entries_notes_max_len check (notes is null or char_length(notes) <= 4000),
  constraint weekly_journal_entries_mood_max_len check (mood is null or char_length(mood) <= 80),
  constraint weekly_journal_entries_recovery_range check (recovery is null or (recovery >= 1 and recovery <= 10)),
  constraint weekly_journal_entries_energy_range check (energy is null or (energy >= 1 and energy <= 10)),
  constraint weekly_journal_entries_sleep_hours_range check (sleep_hours is null or (sleep_hours >= 0 and sleep_hours <= 24))
);

create index if not exists weekly_journal_entries_user_id_week_start_idx
  on public.weekly_journal_entries (user_id, week_start desc);

create table if not exists public.notification_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  workout_reminder_enabled boolean not null default true,
  protein_reminder_enabled boolean not null default true,
  weight_reminder_enabled boolean not null default true,
  photo_reminder_enabled boolean not null default true,
  new_pr_enabled boolean not null default true,
  workout_streak_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  scheduled_for timestamptz,
  is_read boolean not null default false,
  read_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notifications_type_check check (
    type in (
      'workout_reminder',
      'protein_reminder',
      'weight_reminder',
      'photo_reminder',
      'new_pr',
      'workout_streak'
    )
  ),
  constraint notifications_title_not_blank check (btrim(title) <> ''),
  constraint notifications_title_max_len check (char_length(title) <= 160),
  constraint notifications_body_not_blank check (btrim(body) <> ''),
  constraint notifications_body_max_len check (char_length(body) <= 4000),
  constraint notifications_metadata_object check (jsonb_typeof(metadata) = 'object')
);

create index if not exists notifications_user_id_created_at_desc_idx
  on public.notifications (user_id, created_at desc);

create index if not exists notifications_user_id_is_read_idx
  on public.notifications (user_id, is_read, created_at desc);

create or replace function public.validate_workout_template_owner()
returns trigger
language plpgsql
as $$
declare
  owner_id uuid;
begin
  if new.template_id is null then
    return new;
  end if;

  select user_id
  into owner_id
  from public.workout_templates
  where id = new.template_id;

  if owner_id is null then
    raise exception 'Template not found for provided template_id.';
  end if;

  if owner_id <> new.user_id then
    raise exception 'Template ownership mismatch.';
  end if;

  return new;
end;
$$;

create or replace function public.validate_workout_schedule_override_workout_owner()
returns trigger
language plpgsql
as $$
declare
  workout_owner uuid;
begin
  if new.workout_id is null then
    return new;
  end if;

  select user_id
  into workout_owner
  from public.workouts
  where id = new.workout_id;

  if workout_owner is null then
    raise exception 'Workout not found for provided workout_id.';
  end if;

  if workout_owner <> new.user_id then
    raise exception 'Workout ownership mismatch.';
  end if;

  return new;
end;
$$;

create or replace function public.validate_workout_template_exercise_owner()
returns trigger
language plpgsql
as $$
declare
  exercise_owner uuid;
begin
  if new.exercise_id is null then
    return new;
  end if;

  select user_id
  into exercise_owner
  from public.exercises
  where id = new.exercise_id;

  if exercise_owner is null then
    raise exception 'Exercise not found for provided exercise_id.';
  end if;

  if exercise_owner <> new.user_id then
    raise exception 'Exercise ownership mismatch.';
  end if;

  return new;
end;
$$;

drop trigger if exists workout_templates_set_updated_at on public.workout_templates;
create trigger workout_templates_set_updated_at
before update on public.workout_templates
for each row
execute function public.set_updated_at();

drop trigger if exists workout_template_exercises_set_updated_at on public.workout_template_exercises;
create trigger workout_template_exercises_set_updated_at
before update on public.workout_template_exercises
for each row
execute function public.set_updated_at();

drop trigger if exists workout_weekday_schedule_set_updated_at on public.workout_weekday_schedule;
create trigger workout_weekday_schedule_set_updated_at
before update on public.workout_weekday_schedule
for each row
execute function public.set_updated_at();

drop trigger if exists workout_schedule_overrides_set_updated_at on public.workout_schedule_overrides;
create trigger workout_schedule_overrides_set_updated_at
before update on public.workout_schedule_overrides
for each row
execute function public.set_updated_at();

drop trigger if exists progress_photos_set_updated_at on public.progress_photos;
create trigger progress_photos_set_updated_at
before update on public.progress_photos
for each row
execute function public.set_updated_at();

drop trigger if exists body_measurement_entries_set_updated_at on public.body_measurement_entries;
create trigger body_measurement_entries_set_updated_at
before update on public.body_measurement_entries
for each row
execute function public.set_updated_at();

drop trigger if exists weekly_journal_entries_set_updated_at on public.weekly_journal_entries;
create trigger weekly_journal_entries_set_updated_at
before update on public.weekly_journal_entries
for each row
execute function public.set_updated_at();

drop trigger if exists notification_preferences_set_updated_at on public.notification_preferences;
create trigger notification_preferences_set_updated_at
before update on public.notification_preferences
for each row
execute function public.set_updated_at();

drop trigger if exists notifications_set_updated_at on public.notifications;
create trigger notifications_set_updated_at
before update on public.notifications
for each row
execute function public.set_updated_at();

drop trigger if exists workout_weekday_schedule_validate_template_owner on public.workout_weekday_schedule;
create trigger workout_weekday_schedule_validate_template_owner
before insert or update on public.workout_weekday_schedule
for each row
execute function public.validate_workout_template_owner();

drop trigger if exists workout_schedule_overrides_validate_template_owner on public.workout_schedule_overrides;
create trigger workout_schedule_overrides_validate_template_owner
before insert or update on public.workout_schedule_overrides
for each row
execute function public.validate_workout_template_owner();

drop trigger if exists workout_schedule_overrides_validate_workout_owner on public.workout_schedule_overrides;
create trigger workout_schedule_overrides_validate_workout_owner
before insert or update on public.workout_schedule_overrides
for each row
execute function public.validate_workout_schedule_override_workout_owner();

drop trigger if exists workout_template_exercises_validate_template_owner on public.workout_template_exercises;
create trigger workout_template_exercises_validate_template_owner
before insert or update on public.workout_template_exercises
for each row
execute function public.validate_workout_template_owner();

drop trigger if exists workout_template_exercises_validate_exercise_owner on public.workout_template_exercises;
create trigger workout_template_exercises_validate_exercise_owner
before insert or update on public.workout_template_exercises
for each row
execute function public.validate_workout_template_exercise_owner();

alter table public.workout_templates enable row level security;
alter table public.workout_template_exercises enable row level security;
alter table public.workout_weekday_schedule enable row level security;
alter table public.workout_schedule_overrides enable row level security;
alter table public.progress_photos enable row level security;
alter table public.body_measurement_entries enable row level security;
alter table public.weekly_journal_entries enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.notifications enable row level security;

drop policy if exists workout_templates_select_own on public.workout_templates;
create policy workout_templates_select_own on public.workout_templates
for select using (auth.uid() = user_id);

drop policy if exists workout_templates_insert_own on public.workout_templates;
create policy workout_templates_insert_own on public.workout_templates
for insert with check (auth.uid() = user_id);

drop policy if exists workout_templates_update_own on public.workout_templates;
create policy workout_templates_update_own on public.workout_templates
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists workout_templates_delete_own on public.workout_templates;
create policy workout_templates_delete_own on public.workout_templates
for delete using (auth.uid() = user_id);

drop policy if exists workout_template_exercises_select_own on public.workout_template_exercises;
create policy workout_template_exercises_select_own on public.workout_template_exercises
for select using (auth.uid() = user_id);

drop policy if exists workout_template_exercises_insert_own on public.workout_template_exercises;
create policy workout_template_exercises_insert_own on public.workout_template_exercises
for insert with check (auth.uid() = user_id);

drop policy if exists workout_template_exercises_update_own on public.workout_template_exercises;
create policy workout_template_exercises_update_own on public.workout_template_exercises
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists workout_template_exercises_delete_own on public.workout_template_exercises;
create policy workout_template_exercises_delete_own on public.workout_template_exercises
for delete using (auth.uid() = user_id);

drop policy if exists workout_weekday_schedule_select_own on public.workout_weekday_schedule;
create policy workout_weekday_schedule_select_own on public.workout_weekday_schedule
for select using (auth.uid() = user_id);

drop policy if exists workout_weekday_schedule_insert_own on public.workout_weekday_schedule;
create policy workout_weekday_schedule_insert_own on public.workout_weekday_schedule
for insert with check (auth.uid() = user_id);

drop policy if exists workout_weekday_schedule_update_own on public.workout_weekday_schedule;
create policy workout_weekday_schedule_update_own on public.workout_weekday_schedule
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists workout_weekday_schedule_delete_own on public.workout_weekday_schedule;
create policy workout_weekday_schedule_delete_own on public.workout_weekday_schedule
for delete using (auth.uid() = user_id);

drop policy if exists workout_schedule_overrides_select_own on public.workout_schedule_overrides;
create policy workout_schedule_overrides_select_own on public.workout_schedule_overrides
for select using (auth.uid() = user_id);

drop policy if exists workout_schedule_overrides_insert_own on public.workout_schedule_overrides;
create policy workout_schedule_overrides_insert_own on public.workout_schedule_overrides
for insert with check (auth.uid() = user_id);

drop policy if exists workout_schedule_overrides_update_own on public.workout_schedule_overrides;
create policy workout_schedule_overrides_update_own on public.workout_schedule_overrides
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists workout_schedule_overrides_delete_own on public.workout_schedule_overrides;
create policy workout_schedule_overrides_delete_own on public.workout_schedule_overrides
for delete using (auth.uid() = user_id);

drop policy if exists progress_photos_select_own on public.progress_photos;
create policy progress_photos_select_own on public.progress_photos
for select using (auth.uid() = user_id);

drop policy if exists progress_photos_insert_own on public.progress_photos;
create policy progress_photos_insert_own on public.progress_photos
for insert with check (auth.uid() = user_id);

drop policy if exists progress_photos_update_own on public.progress_photos;
create policy progress_photos_update_own on public.progress_photos
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists progress_photos_delete_own on public.progress_photos;
create policy progress_photos_delete_own on public.progress_photos
for delete using (auth.uid() = user_id);

drop policy if exists body_measurement_entries_select_own on public.body_measurement_entries;
create policy body_measurement_entries_select_own on public.body_measurement_entries
for select using (auth.uid() = user_id);

drop policy if exists body_measurement_entries_insert_own on public.body_measurement_entries;
create policy body_measurement_entries_insert_own on public.body_measurement_entries
for insert with check (auth.uid() = user_id);

drop policy if exists body_measurement_entries_update_own on public.body_measurement_entries;
create policy body_measurement_entries_update_own on public.body_measurement_entries
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists body_measurement_entries_delete_own on public.body_measurement_entries;
create policy body_measurement_entries_delete_own on public.body_measurement_entries
for delete using (auth.uid() = user_id);

drop policy if exists weekly_journal_entries_select_own on public.weekly_journal_entries;
create policy weekly_journal_entries_select_own on public.weekly_journal_entries
for select using (auth.uid() = user_id);

drop policy if exists weekly_journal_entries_insert_own on public.weekly_journal_entries;
create policy weekly_journal_entries_insert_own on public.weekly_journal_entries
for insert with check (auth.uid() = user_id);

drop policy if exists weekly_journal_entries_update_own on public.weekly_journal_entries;
create policy weekly_journal_entries_update_own on public.weekly_journal_entries
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists weekly_journal_entries_delete_own on public.weekly_journal_entries;
create policy weekly_journal_entries_delete_own on public.weekly_journal_entries
for delete using (auth.uid() = user_id);

drop policy if exists notification_preferences_select_own on public.notification_preferences;
create policy notification_preferences_select_own on public.notification_preferences
for select using (auth.uid() = user_id);

drop policy if exists notification_preferences_insert_own on public.notification_preferences;
create policy notification_preferences_insert_own on public.notification_preferences
for insert with check (auth.uid() = user_id);

drop policy if exists notification_preferences_update_own on public.notification_preferences;
create policy notification_preferences_update_own on public.notification_preferences
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists notification_preferences_delete_own on public.notification_preferences;
create policy notification_preferences_delete_own on public.notification_preferences
for delete using (auth.uid() = user_id);

drop policy if exists notifications_select_own on public.notifications;
create policy notifications_select_own on public.notifications
for select using (auth.uid() = user_id);

drop policy if exists notifications_insert_own on public.notifications;
create policy notifications_insert_own on public.notifications
for insert with check (auth.uid() = user_id);

drop policy if exists notifications_update_own on public.notifications;
create policy notifications_update_own on public.notifications
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists notifications_delete_own on public.notifications;
create policy notifications_delete_own on public.notifications
for delete using (auth.uid() = user_id);

grant select, insert, update, delete on public.workout_templates to authenticated;
grant select, insert, update, delete on public.workout_template_exercises to authenticated;
grant select, insert, update, delete on public.workout_weekday_schedule to authenticated;
grant select, insert, update, delete on public.workout_schedule_overrides to authenticated;
grant select, insert, update, delete on public.progress_photos to authenticated;
grant select, insert, update, delete on public.body_measurement_entries to authenticated;
grant select, insert, update, delete on public.weekly_journal_entries to authenticated;
grant select, insert, update, delete on public.notification_preferences to authenticated;
grant select, insert, update, delete on public.notifications to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'progress-photos',
  'progress-photos',
  false,
  4194304,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists progress_photos_storage_select_own on storage.objects;
create policy progress_photos_storage_select_own
on storage.objects
for select
to authenticated
using (
  bucket_id = 'progress-photos'
  and auth.uid() is not null
  and name like auth.uid()::text || '/%'
);

drop policy if exists progress_photos_storage_insert_own on storage.objects;
create policy progress_photos_storage_insert_own
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'progress-photos'
  and auth.uid() is not null
  and name like auth.uid()::text || '/%'
);

drop policy if exists progress_photos_storage_update_own on storage.objects;
create policy progress_photos_storage_update_own
on storage.objects
for update
to authenticated
using (
  bucket_id = 'progress-photos'
  and auth.uid() is not null
  and name like auth.uid()::text || '/%'
)
with check (
  bucket_id = 'progress-photos'
  and auth.uid() is not null
  and name like auth.uid()::text || '/%'
);

drop policy if exists progress_photos_storage_delete_own on storage.objects;
create policy progress_photos_storage_delete_own
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'progress-photos'
  and auth.uid() is not null
  and name like auth.uid()::text || '/%'
);
