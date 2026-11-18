create table if not exists cetls_site_revisions (
  id             serial primary key,
  version_number integer not null,
  status         text not null default 'draft' check (status in ('draft', 'in_review', 'published', 'archived')),
  title          text not null default 'Untitled revision',
  change_summary text not null default '',
  content_json   text not null,
  created_by     text not null,
  created_at     text not null,
  updated_by     text not null,
  updated_at     text not null,
  submitted_by   text,
  submitted_at   text,
  reviewed_by    text,
  reviewed_at    text,
  review_note    text,
  published_by   text,
  published_at   text
);

create index if not exists cetls_site_revisions_status_idx
  on cetls_site_revisions (status, id desc);

create table if not exists cetls_site_content_audit (
  id          serial primary key,
  revision_id integer not null,
  actor_email text not null,
  action      text not null,
  note        text not null default '',
  created_at  text not null
);

create index if not exists cetls_site_content_audit_rev_idx
  on cetls_site_content_audit (revision_id, id desc);
