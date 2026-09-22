-- Onboarding V1 additive profile fields:
-- - structured onboarding answers
-- - versioned completion metadata
-- - no destructive changes to existing user data

alter table public.profiles
  add column if not exists primary_goal text,
  add column if not exists training_experience text,
  add column if not exists desired_training_days smallint,
  add column if not exists desired_training_days_state text not null default 'unspecified',
  add column if not exists training_environment text,
  add column if not exists discovery_source text,
  add column if not exists onboarding_version_completed integer,
  add column if not exists onboarding_completed_at timestamptz;

alter table public.profiles
  drop constraint if exists profiles_primary_goal_check,
  add constraint profiles_primary_goal_check
    check (
      primary_goal is null
      or primary_goal in (
        'build_muscle',
        'get_stronger',
        'lose_fat',
        'improve_consistency',
        'general_fitness',
        'not_sure',
        'prefer_not_to_answer'
      )
    ),
  drop constraint if exists profiles_training_experience_check,
  add constraint profiles_training_experience_check
    check (
      training_experience is null
      or training_experience in (
        'new',
        'some_experience',
        'experienced',
        'prefer_not_to_answer'
      )
    ),
  drop constraint if exists profiles_desired_training_days_state_check,
  add constraint profiles_desired_training_days_state_check
    check (
      desired_training_days_state in (
        'unspecified',
        'specified',
        'not_sure',
        'prefer_not_to_answer'
      )
    ),
  drop constraint if exists profiles_desired_training_days_consistency_check,
  add constraint profiles_desired_training_days_consistency_check
    check (
      (desired_training_days_state = 'specified' and desired_training_days between 2 and 6)
      or (
        desired_training_days_state in ('unspecified', 'not_sure', 'prefer_not_to_answer')
        and desired_training_days is null
      )
    ),
  drop constraint if exists profiles_training_environment_check,
  add constraint profiles_training_environment_check
    check (
      training_environment is null
      or training_environment in (
        'full_gym',
        'home_equipment',
        'bodyweight',
        'mixed',
        'prefer_not_to_answer'
      )
    ),
  drop constraint if exists profiles_discovery_source_check,
  add constraint profiles_discovery_source_check
    check (
      discovery_source is null
      or discovery_source in (
        'tiktok',
        'instagram',
        'youtube',
        'search',
        'friend',
        'other',
        'dont_remember',
        'prefer_not_to_answer'
      )
    ),
  drop constraint if exists profiles_onboarding_version_nonnegative_check,
  add constraint profiles_onboarding_version_nonnegative_check
    check (onboarding_version_completed is null or onboarding_version_completed >= 1),
  drop constraint if exists profiles_onboarding_completion_pair_check,
  add constraint profiles_onboarding_completion_pair_check
    check ((onboarding_version_completed is null) = (onboarding_completed_at is null));

