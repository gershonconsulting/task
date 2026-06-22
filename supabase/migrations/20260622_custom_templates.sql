-- Migration: custom_templates table
-- Run this once in the Supabase SQL Editor (Dashboard → SQL Editor → New query).
-- After running, users can create and manage custom templates in the app.

create table if not exists custom_templates (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique,
  label        text not null,
  icon         text not null default '📋',
  color        text not null default '#6366f1',
  description  text not null default '',
  tasks        jsonb not null default '[]'::jsonb,
  created_by   text not null default 'unknown',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Keep updated_at in sync automatically
create or replace function update_custom_templates_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_custom_templates_updated_at on custom_templates;
create trigger trg_custom_templates_updated_at
  before update on custom_templates
  for each row execute function update_custom_templates_updated_at();

-- RLS: service-role key (used by the app) bypasses RLS automatically.
-- Enable RLS so direct client access is blocked if RLS policies don't permit it.
alter table custom_templates enable row level security;

