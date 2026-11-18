create table if not exists cetls_wiki_pages (
  slug             text primary key,
  path             text not null unique,
  title            text not null,
  is_custom        boolean not null default false,
  published_rev_id integer,
  updated_at       text not null
);

create table if not exists cetls_wiki_revisions (
  id           serial primary key,
  page_slug    text not null references cetls_wiki_pages(slug) on delete cascade,
  rev_number   integer not null,
  status       text not null default 'draft' check (status in ('draft', 'in_review', 'published', 'archived')),
  title        text not null,
  markdown     text not null,
  edit_summary text not null default '',
  author_email text not null,
  created_at   text not null,
  updated_at   text not null,
  submitted_by text,
  submitted_at text,
  reviewed_by  text,
  reviewed_at  text,
  review_note  text
);

create index if not exists cetls_wiki_revisions_page_idx
  on cetls_wiki_revisions (page_slug, rev_number desc);

create index if not exists cetls_wiki_revisions_status_idx
  on cetls_wiki_revisions (status, id desc);
