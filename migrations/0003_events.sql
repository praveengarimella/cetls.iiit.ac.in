create table if not exists cetls_event_users (
  email      text primary key,
  name       text not null,
  role       text not null default 'editor' check (role in ('admin', 'editor')),
  added_by   text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists cetls_events (
  id                       text primary key,
  slug                     text not null unique,
  title                    text not null,
  summary                  text not null,
  description              text,
  category                 text not null check (category in ('roundtable', 'workshop', 'talk', 'launch', 'advisory', 'internal')),
  domains                  text not null default '[]',
  start_iso                text not null,
  end_iso                  text not null,
  all_day                  boolean not null default false,
  timezone                 text not null default 'Asia/Kolkata',
  recurrence               text,
  recurrence_parent_id     text,
  recurrence_original_date text,
  mode                     text not null check (mode in ('in-person', 'online', 'hybrid')),
  venue                    text not null default '{}',
  online_url               text,
  access                   text not null default 'open' check (access in ('open', 'invitation-only')),
  series                   text not null default '[]',
  partners                 text not null default '[]',
  image                    text,
  status                   text not null default 'draft' check (status in ('draft', 'submitted', 'pending', 'published', 'cancelled')),
  approved_by              text,
  approved_at              text,
  pending_fields           text not null default '[]',
  cancel_reason            text,
  links                    text not null default '[]',
  deleted                  boolean not null default false,
  created_by               text not null,
  created_at               text not null,
  updated_by               text not null,
  updated_at               text not null
);

create index if not exists cetls_events_status_deleted_idx on cetls_events (status, deleted);
create index if not exists cetls_events_start_iso_idx on cetls_events (start_iso);
create index if not exists cetls_events_slug_idx on cetls_events (slug);

create table if not exists cetls_event_audit (
  id          serial primary key,
  event_id    text not null,
  event_slug  text not null,
  actor_email text not null,
  action      text not null,
  diff_json   text not null default '{}',
  created_at  text not null
);

create index if not exists cetls_event_audit_event_id_idx on cetls_event_audit (event_id, id desc);

create table if not exists cetls_event_uploads (
  id          text primary key,
  mime_type   text not null,
  alt_text    text not null,
  data_base64 text not null,
  size_bytes  integer not null,
  uploaded_by text not null,
  created_at  timestamptz not null default now()
);
