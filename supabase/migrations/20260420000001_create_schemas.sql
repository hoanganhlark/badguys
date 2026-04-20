-- Migration: Simplified for 2-project setup
-- Purpose: This project uses 2 separate Supabase projects (dev + prod)
-- Tables are created in the default public schema, not in custom dev/prod schemas
-- Each project (dev and prod) will have its own independent database with identical schema

create table users
(
    id                   bigserial
        primary key,
    username             text                                               not null
        unique,
    username_key         text                                               not null
        unique,
    password             text,
    role                 text
        constraint users_role_check
            check (role = ANY (ARRAY ['admin'::text, 'member'::text])),
    is_disabled          boolean                  default false,
    last_login_at        timestamp with time zone,
    client_last_login_at text,
    created_at           timestamp with time zone default now(),
    client_created_at    text,
    updated_at           timestamp with time zone,
    client_updated_at    text
);

alter table users
    owner to postgres;

create index idx_users_username_key
    on users (username_key);

grant delete, insert, references, select, trigger, truncate, update on users to anon;

grant delete, insert, references, select, trigger, truncate, update on users to authenticated;

grant delete, insert, references, select, trigger, truncate, update on users to service_role;

create table audit_events
(
    id                bigserial
        primary key,
    event_name        text                                               not null,
    event_type        text                     default 'event'::text
        constraint audit_events_event_type_check
            check (event_type = ANY (ARRAY ['event'::text, 'route_change'::text])),
    params            jsonb                    default '{}'::jsonb,
    user_properties   jsonb                    default '{}'::jsonb,
    page_path         text,
    mode              text,
    created_at        timestamp with time zone default now(),
    client_created_at text
);

alter table audit_events
    owner to postgres;

create index idx_audit_events_created_at
    on audit_events (created_at desc);

create index idx_audit_events_event_name
    on audit_events (event_name);

grant delete, insert, references, select, trigger, truncate, update on audit_events to anon;

grant delete, insert, references, select, trigger, truncate, update on audit_events to authenticated;

grant delete, insert, references, select, trigger, truncate, update on audit_events to service_role;

create table sessions
(
    id                bigserial
        primary key,
    datekey           text not null
        unique,
    summary_text      text,
    court_fee         numeric,
    shuttle_count     integer,
    shuttle_fee       numeric,
    total             numeric,
    male_fee          numeric,
    female_fee        numeric,
    females_count     integer,
    males_count       integer,
    set_players_count integer,
    players           jsonb,
    updated_at        timestamp with time zone,
    client_updated_at text
);

alter table sessions
    owner to postgres;

create index idx_sessions_datekey
    on sessions (datekey desc);

create index idx_sessions_updated_at
    on sessions (updated_at desc);

grant delete, insert, references, select, trigger, truncate, update on sessions to anon;

grant delete, insert, references, select, trigger, truncate, update on sessions to authenticated;

grant delete, insert, references, select, trigger, truncate, update on sessions to service_role;

create table ranking_snapshots
(
    id                bigserial
        primary key,
    ranks             jsonb                    default '[]'::jsonb,
    created_at        timestamp with time zone default now(),
    client_created_at text
);

alter table ranking_snapshots
    owner to postgres;

create index idx_ranking_snapshots_created_at
    on ranking_snapshots (created_at desc);

grant delete, insert, references, select, trigger, truncate, update on ranking_snapshots to anon;

grant delete, insert, references, select, trigger, truncate, update on ranking_snapshots to authenticated;

grant delete, insert, references, select, trigger, truncate, update on ranking_snapshots to service_role;

create table ranking_categories
(
    id                bigserial
        primary key,
    name              text not null
        unique,
    display_name      text not null,
    "order"           integer                  default 0,
    created_at        timestamp with time zone default now(),
    client_created_at timestamp with time zone,
    updated_at        timestamp with time zone,
    client_updated_at timestamp with time zone
);

alter table ranking_categories
    owner to postgres;

grant select, update, usage on sequence ranking_categories_id_seq to anon;

grant select, update, usage on sequence ranking_categories_id_seq to authenticated;

grant select, update, usage on sequence ranking_categories_id_seq to service_role;

create index idx_ranking_categories_name
    on ranking_categories (name);

grant delete, insert, references, select, trigger, truncate, update on ranking_categories to anon;

grant delete, insert, references, select, trigger, truncate, update on ranking_categories to authenticated;

grant delete, insert, references, select, trigger, truncate, update on ranking_categories to service_role;

create table ranking_members
(
    id               bigserial
        primary key,
    name             text not null
        unique,
    category_id      bigint
        references ranking_categories
            on delete set null,
    rating           numeric                  default 1500,
    rating_deviation numeric                  default 350,
    volatility       numeric                  default 0.06,
    last_match_at    timestamp with time zone,
    created_at       timestamp with time zone default now()
);

alter table ranking_members
    owner to postgres;

grant select, update, usage on sequence ranking_members_id_seq to anon;

grant select, update, usage on sequence ranking_members_id_seq to authenticated;

grant select, update, usage on sequence ranking_members_id_seq to service_role;

create index idx_ranking_members_name
    on ranking_members (name);

create index idx_ranking_members_category_id
    on ranking_members (category_id);

grant delete, insert, references, select, trigger, truncate, update on ranking_members to anon;

grant delete, insert, references, select, trigger, truncate, update on ranking_members to authenticated;

grant delete, insert, references, select, trigger, truncate, update on ranking_members to service_role;

create table ranking_matches
(
    id         bigserial
        primary key,
    type       text                     not null
        constraint ranking_matches_type_check
            check (type = ANY (ARRAY ['singles'::text, 'doubles'::text])),
    date       timestamp with time zone not null,
    created_at timestamp with time zone default now()
);

alter table ranking_matches
    owner to postgres;

grant select, update, usage on sequence ranking_matches_id_seq to anon;

grant select, update, usage on sequence ranking_matches_id_seq to authenticated;

grant select, update, usage on sequence ranking_matches_id_seq to service_role;

create index idx_ranking_matches_date
    on ranking_matches (date desc);

grant delete, insert, references, select, trigger, truncate, update on ranking_matches to anon;

grant delete, insert, references, select, trigger, truncate, update on ranking_matches to authenticated;

grant delete, insert, references, select, trigger, truncate, update on ranking_matches to service_role;

create table ranking_match_players
(
    id        bigserial
        primary key,
    match_id  bigint  not null
        references ranking_matches
            on delete cascade,
    member_id bigint  not null
        references ranking_members
            on delete cascade,
    team      integer not null
        constraint ranking_match_players_team_check
            check (team = ANY (ARRAY [1, 2]))
);

alter table ranking_match_players
    owner to postgres;

grant select, update, usage on sequence ranking_match_players_id_seq to anon;

grant select, update, usage on sequence ranking_match_players_id_seq to authenticated;

grant select, update, usage on sequence ranking_match_players_id_seq to service_role;

create index idx_ranking_match_players_match
    on ranking_match_players (match_id);

create index idx_ranking_match_players_member
    on ranking_match_players (member_id);

grant delete, insert, references, select, trigger, truncate, update on ranking_match_players to anon;

grant delete, insert, references, select, trigger, truncate, update on ranking_match_players to authenticated;

grant delete, insert, references, select, trigger, truncate, update on ranking_match_players to service_role;

create table ranking_match_sets
(
    id          bigserial
        primary key,
    match_id    bigint  not null
        references ranking_matches
            on delete cascade,
    set_number  integer not null,
    team1_score integer not null,
    team2_score integer not null
);

alter table ranking_match_sets
    owner to postgres;

grant select, update, usage on sequence ranking_match_sets_id_seq to anon;

grant select, update, usage on sequence ranking_match_sets_id_seq to authenticated;

grant select, update, usage on sequence ranking_match_sets_id_seq to service_role;

create index idx_ranking_match_sets_match
    on ranking_match_sets (match_id);

grant delete, insert, references, select, trigger, truncate, update on ranking_match_sets to anon;

grant delete, insert, references, select, trigger, truncate, update on ranking_match_sets to authenticated;

grant delete, insert, references, select, trigger, truncate, update on ranking_match_sets to service_role;

create table matches
(
    id                  bigserial
        primary key,
    match_type          text                     default 'singles'::text
        constraint matches_match_type_check
            check (match_type = ANY (ARRAY ['singles'::text, 'doubles'::text])),
    player_a            text                     not null,
    player_b            text                     not null,
    score               text                     not null,
    played_at           timestamp with time zone not null,
    duration_minutes    integer,
    created_by          bigint                   not null
        references users
            on delete cascade,
    created_by_username text                     not null,
    created_at          timestamp with time zone default now(),
    client_created_at   timestamp with time zone,
    updated_at          timestamp with time zone,
    client_updated_at   timestamp with time zone
);

alter table matches
    owner to postgres;

grant select, update, usage on sequence matches_id_seq to anon;

grant select, update, usage on sequence matches_id_seq to authenticated;

grant select, update, usage on sequence matches_id_seq to service_role;

create index idx_matches_created_by
    on matches (created_by);

create index idx_matches_played_at
    on matches (played_at desc);

grant delete, insert, references, select, trigger, truncate, update on matches to anon;

grant delete, insert, references, select, trigger, truncate, update on matches to authenticated;

grant delete, insert, references, select, trigger, truncate, update on matches to service_role;

