-- Migration 0001: initial schema for task.gershoncrm.com
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  template_slug text not null,
  company_name text not null,
  client_first_name text,
  client_last_name text,
  client_title text,
  client_email text not null,
  client_linkedin_url text,
  client_domain text,
  status text not null default 'planning' check (status in ('planning','in_progress','completed','archived')),
  start_date date,
  end_date date,
  created_by_email text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index projects_status_idx          on public.projects(status);
create index projects_template_idx        on public.projects(template_slug);
create index projects_client_linkedin_idx on public.projects(client_linkedin_url);
create index projects_client_email_idx    on public.projects(client_email);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  position int not null default 0,
  name text not null,
  description text,
  assigned_to text,
  status text not null default 'pending' check (status in ('pending','in_progress','completed')),
  priority text not null default 'medium' check (priority in ('low','medium','high')),
  due_date date,
  notes text,
  template_item_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index tasks_project_id_idx on public.tasks(project_id);
create index tasks_status_idx     on public.tasks(status);
create index tasks_assigned_idx   on public.tasks(assigned_to);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger projects_set_updated_at before update on public.projects
  for each row execute procedure public.set_updated_at();
create trigger tasks_set_updated_at before update on public.tasks
  for each row execute procedure public.set_updated_at();

create or replace view public.project_progress as
select
  p.id as project_id, p.company_name, p.template_slug, p.status,
  count(t.id) as total_tasks,
  count(t.id) filter (where t.status = 'completed') as completed_tasks,
  case when count(t.id) = 0 then 0
       else round((count(t.id) filter (where t.status = 'completed'))::numeric / count(t.id) * 100, 1)
  end as percent_complete,
  p.updated_at
from public.projects p
left join public.tasks t on t.project_id = p.id
group by p.id;
