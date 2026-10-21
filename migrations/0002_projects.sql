create table if not exists portal_projects (
  id                serial primary key,
  user_id           text not null,
  slug              text not null,
  code              text not null,
  title             text not null,
  summary           text not null,
  stage             text not null default 'proposed',
  health            text not null default 'on-track',
  visibility        text not null default 'internal',
  domain_ids        text not null default '[]',
  question_ids      text not null default '[]',
  programme_id      text,
  uses_middleware   boolean not null default false,
  lead_person_id    text not null,
  member_person_ids text not null default '[]',
  start_date        text,
  target_date       text,
  repo_url          text,
  doc_url           text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (user_id, slug)
);

create index if not exists portal_projects_user_id_idx on portal_projects (user_id);

create table if not exists portal_project_updates (
  id               serial primary key,
  user_id          text not null,
  project_id       integer not null references portal_projects(id) on delete cascade,
  author_person_id text not null,
  update_type      text not null default 'progress',
  health           text not null default 'on-track',
  title            text not null,
  body             text not null,
  next_steps       text,
  blockers         text,
  external_url     text,
  is_public        boolean not null default false,
  update_date      text not null,
  created_at       timestamptz not null default now()
);

create index if not exists portal_project_updates_user_project_idx
  on portal_project_updates (user_id, project_id, created_at desc);
