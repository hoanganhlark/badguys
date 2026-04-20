-- Migration: Convert all primary keys to bigserial
-- Purpose: Use incremental bigserial IDs instead of UUID for all tables

-- Step 1: Drop all tables in reverse order of foreign key dependencies
DROP TABLE IF EXISTS ranking_match_sets CASCADE;
DROP TABLE IF EXISTS ranking_match_players CASCADE;
DROP TABLE IF EXISTS ranking_matches CASCADE;
DROP TABLE IF EXISTS ranking_members CASCADE;
DROP TABLE IF EXISTS ranking_categories CASCADE;
DROP TABLE IF EXISTS matches CASCADE;
DROP TABLE IF EXISTS ranking_snapshots CASCADE;
DROP TABLE IF EXISTS audit_events CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Step 2: Recreate all tables with bigserial primary keys

-- Users table
CREATE TABLE users (
    id                   bigserial
        primary key,
    username             text not null
        unique,
    username_key         text not null
        unique,
    password             text,
    role                 text
        constraint users_role_check
            check (role = ANY (ARRAY ['admin'::text, 'member'::text])),
    is_disabled          boolean default false,
    last_login_at        timestamp with time zone,
    client_last_login_at text,
    created_at           timestamp with time zone default now(),
    client_created_at    text,
    updated_at           timestamp with time zone,
    client_updated_at    text
);

ALTER TABLE users OWNER TO postgres;

CREATE INDEX idx_users_username_key ON users (username_key);

GRANT delete, insert, references, select, trigger, truncate, update ON users TO anon;
GRANT delete, insert, references, select, trigger, truncate, update ON users TO authenticated;
GRANT delete, insert, references, select, trigger, truncate, update ON users TO service_role;

-- Audit events table
CREATE TABLE audit_events (
    id                bigserial
        primary key,
    event_name        text not null,
    event_type        text default 'event'::text
        constraint audit_events_event_type_check
            check (event_type = ANY (ARRAY ['event'::text, 'route_change'::text])),
    params            jsonb default '{}'::jsonb,
    user_properties   jsonb default '{}'::jsonb,
    page_path         text,
    mode              text,
    created_at        timestamp with time zone default now(),
    client_created_at text
);

ALTER TABLE audit_events OWNER TO postgres;

CREATE INDEX idx_audit_events_created_at ON audit_events (created_at desc);
CREATE INDEX idx_audit_events_event_name ON audit_events (event_name);

GRANT delete, insert, references, select, trigger, truncate, update ON audit_events TO anon;
GRANT delete, insert, references, select, trigger, truncate, update ON audit_events TO authenticated;
GRANT delete, insert, references, select, trigger, truncate, update ON audit_events TO service_role;

-- Sessions table
CREATE TABLE sessions (
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

ALTER TABLE sessions OWNER TO postgres;

CREATE INDEX idx_sessions_datekey ON sessions (datekey desc);
CREATE INDEX idx_sessions_updated_at ON sessions (updated_at desc);

GRANT delete, insert, references, select, trigger, truncate, update ON sessions TO anon;
GRANT delete, insert, references, select, trigger, truncate, update ON sessions TO authenticated;
GRANT delete, insert, references, select, trigger, truncate, update ON sessions TO service_role;

-- Ranking snapshots table
CREATE TABLE ranking_snapshots (
    id                bigserial
        primary key,
    ranks             jsonb default '[]'::jsonb,
    created_at        timestamp with time zone default now(),
    client_created_at text
);

ALTER TABLE ranking_snapshots OWNER TO postgres;

CREATE INDEX idx_ranking_snapshots_created_at ON ranking_snapshots (created_at desc);

GRANT delete, insert, references, select, trigger, truncate, update ON ranking_snapshots TO anon;
GRANT delete, insert, references, select, trigger, truncate, update ON ranking_snapshots TO authenticated;
GRANT delete, insert, references, select, trigger, truncate, update ON ranking_snapshots TO service_role;

-- Ranking categories table
CREATE TABLE ranking_categories (
    id                bigserial
        primary key,
    name              text not null
        unique,
    display_name      text not null,
    "order"           integer default 0,
    created_at        timestamp with time zone default now(),
    client_created_at timestamp with time zone,
    updated_at        timestamp with time zone,
    client_updated_at timestamp with time zone
);

ALTER TABLE ranking_categories OWNER TO postgres;

GRANT select, update, usage ON sequence ranking_categories_id_seq TO anon;
GRANT select, update, usage ON sequence ranking_categories_id_seq TO authenticated;
GRANT select, update, usage ON sequence ranking_categories_id_seq TO service_role;

CREATE INDEX idx_ranking_categories_name ON ranking_categories (name);

GRANT delete, insert, references, select, trigger, truncate, update ON ranking_categories TO anon;
GRANT delete, insert, references, select, trigger, truncate, update ON ranking_categories TO authenticated;
GRANT delete, insert, references, select, trigger, truncate, update ON ranking_categories TO service_role;

-- Ranking members table
CREATE TABLE ranking_members (
    id               bigserial
        primary key,
    name             text not null
        unique,
    category_id      bigint
        references ranking_categories
            on delete set null,
    rating           numeric default 1500,
    rating_deviation numeric default 350,
    volatility       numeric default 0.06,
    last_match_at    timestamp with time zone,
    created_at       timestamp with time zone default now()
);

ALTER TABLE ranking_members OWNER TO postgres;

GRANT select, update, usage ON sequence ranking_members_id_seq TO anon;
GRANT select, update, usage ON sequence ranking_members_id_seq TO authenticated;
GRANT select, update, usage ON sequence ranking_members_id_seq TO service_role;

CREATE INDEX idx_ranking_members_name ON ranking_members (name);
CREATE INDEX idx_ranking_members_category_id ON ranking_members (category_id);

GRANT delete, insert, references, select, trigger, truncate, update ON ranking_members TO anon;
GRANT delete, insert, references, select, trigger, truncate, update ON ranking_members TO authenticated;
GRANT delete, insert, references, select, trigger, truncate, update ON ranking_members TO service_role;

-- Ranking matches table
CREATE TABLE ranking_matches (
    id         bigserial
        primary key,
    type       text not null
        constraint ranking_matches_type_check
            check (type = ANY (ARRAY ['singles'::text, 'doubles'::text])),
    date       timestamp with time zone not null,
    created_at timestamp with time zone default now()
);

ALTER TABLE ranking_matches OWNER TO postgres;

GRANT select, update, usage ON sequence ranking_matches_id_seq TO anon;
GRANT select, update, usage ON sequence ranking_matches_id_seq TO authenticated;
GRANT select, update, usage ON sequence ranking_matches_id_seq TO service_role;

CREATE INDEX idx_ranking_matches_date ON ranking_matches (date desc);

GRANT delete, insert, references, select, trigger, truncate, update ON ranking_matches TO anon;
GRANT delete, insert, references, select, trigger, truncate, update ON ranking_matches TO authenticated;
GRANT delete, insert, references, select, trigger, truncate, update ON ranking_matches TO service_role;

-- Ranking match players table
CREATE TABLE ranking_match_players (
    id        bigserial
        primary key,
    match_id  bigint not null
        references ranking_matches
            on delete cascade,
    member_id bigint not null
        references ranking_members
            on delete cascade,
    team      integer not null
        constraint ranking_match_players_team_check
            check (team = ANY (ARRAY [1, 2]))
);

ALTER TABLE ranking_match_players OWNER TO postgres;

GRANT select, update, usage ON sequence ranking_match_players_id_seq TO anon;
GRANT select, update, usage ON sequence ranking_match_players_id_seq TO authenticated;
GRANT select, update, usage ON sequence ranking_match_players_id_seq TO service_role;

CREATE INDEX idx_ranking_match_players_match ON ranking_match_players (match_id);
CREATE INDEX idx_ranking_match_players_member ON ranking_match_players (member_id);

GRANT delete, insert, references, select, trigger, truncate, update ON ranking_match_players TO anon;
GRANT delete, insert, references, select, trigger, truncate, update ON ranking_match_players TO authenticated;
GRANT delete, insert, references, select, trigger, truncate, update ON ranking_match_players TO service_role;

-- Ranking match sets table
CREATE TABLE ranking_match_sets (
    id          bigserial
        primary key,
    match_id    bigint not null
        references ranking_matches
            on delete cascade,
    set_number  integer not null,
    team1_score integer not null,
    team2_score integer not null
);

ALTER TABLE ranking_match_sets OWNER TO postgres;

GRANT select, update, usage ON sequence ranking_match_sets_id_seq TO anon;
GRANT select, update, usage ON sequence ranking_match_sets_id_seq TO authenticated;
GRANT select, update, usage ON sequence ranking_match_sets_id_seq TO service_role;

CREATE INDEX idx_ranking_match_sets_match ON ranking_match_sets (match_id);

GRANT delete, insert, references, select, trigger, truncate, update ON ranking_match_sets TO anon;
GRANT delete, insert, references, select, trigger, truncate, update ON ranking_match_sets TO authenticated;
GRANT delete, insert, references, select, trigger, truncate, update ON ranking_match_sets TO service_role;

-- Matches table
CREATE TABLE matches (
    id                  bigserial
        primary key,
    match_type          text default 'singles'::text
        constraint matches_match_type_check
            check (match_type = ANY (ARRAY ['singles'::text, 'doubles'::text])),
    player_a            text not null,
    player_b            text not null,
    score               text not null,
    played_at           timestamp with time zone not null,
    duration_minutes    integer,
    created_by          bigint not null
        references users
            on delete cascade,
    created_by_username text not null,
    created_at          timestamp with time zone default now(),
    client_created_at   timestamp with time zone,
    updated_at          timestamp with time zone,
    client_updated_at   timestamp with time zone
);

ALTER TABLE matches OWNER TO postgres;

GRANT select, update, usage ON sequence matches_id_seq TO anon;
GRANT select, update, usage ON sequence matches_id_seq TO authenticated;
GRANT select, update, usage ON sequence matches_id_seq TO service_role;

CREATE INDEX idx_matches_created_by ON matches (created_by);
CREATE INDEX idx_matches_played_at ON matches (played_at desc);

GRANT delete, insert, references, select, trigger, truncate, update ON matches TO anon;
GRANT delete, insert, references, select, trigger, truncate, update ON matches TO authenticated;
GRANT delete, insert, references, select, trigger, truncate, update ON matches TO service_role;


INSERT INTO users (username, username_key, password, role, is_disabled, created_at, client_created_at)
VALUES
  ('bi', 'bi', '14a688e2943afc4df39f0af9301bb8b5', 'admin', false, '2026-04-21T00:00:00.000Z', '2026-04-21T00:00:00.000Z'),
  ('thien', 'thien', 'b7249574f68d2fecaa13d9f721e9129b', 'member', false, '2026-04-21T00:00:00.000Z', '2026-04-21T00:00:00.000Z')
ON CONFLICT (username_key) DO NOTHING;

