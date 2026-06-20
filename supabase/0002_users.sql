-- Migration 0002: per-user accounts for task.gershoncrm.com
create table public.app_users (
  email text primary key,
  password_hash text not null,
  display_name text not null default '',
  must_change_password boolean not null default true,
  created_at timestamptz not null default now()
);

-- Seed: Winnie and Aina with initial password 'gershon2013' (must change on first login)
-- Hash format: pbkdf2:sha256:310000:<salt_hex>:<hash_hex>
insert into public.app_users (email, password_hash, display_name, must_change_password) values
  ('winnie.lauren@gershonconsulting.com', 'pbkdf2:sha256:310000:84200b03f19f1bb70babb2b277a36272:21962ac734cef20133bda79da5b9a0837b2da29d290f339cceac93085398d0e9', 'Winnie Lauren', true),
  ('aina.rama@gershonconsulting.com',     'pbkdf2:sha256:310000:84200b03f19f1bb70babb2b277a36272:21962ac734cef20133bda79da5b9a0837b2da29d290f339cceac93085398d0e9', 'Aina Rama',     true);
