-- Harvest: island themes and unlockable crops

-- Which land the farm sits on.
alter table public.profiles
  add column if not exists theme text not null default 'floating'
  check (theme in ('floating', 'farm', 'backyard', 'ocean'));

-- Three new crops that unlock with practice.
alter table public.habits drop constraint if exists habits_crop_type_check;
alter table public.habits
  add constraint habits_crop_type_check
  check (crop_type in ('carrot', 'sunflower', 'wheat', 'strawberry', 'lavender', 'tomato', 'pumpkin', 'rose', 'cherry'));
