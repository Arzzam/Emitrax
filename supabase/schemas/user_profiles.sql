

create table public.user_profiles (
  id uuid not null,
  email text null,
  userdata jsonb null,
  appdata jsonb null,
  constraint profiles_pkey primary key (id),
  constraint profiles_id_key unique (id),
  constraint profiles_id_fkey foreign KEY (id) references auth.users (id) on update CASCADE on delete CASCADE
) TABLESPACE pg_default;