-- Migration: Insert default users
-- Purpose: Seed default admin and member users
-- ============================================================================
-- Insert default users
-- ============================================================================
INSERT INTO
  users (
    username,
    username_key,
    password,
    role,
    is_disabled,
    created_at,
    client_created_at
  )
VALUES
  (
    'bi',
    'bi',
    '14a688e2943afc4df39f0af9301bb8b5',
    'admin',
    false,
    '2026-04-21T00:00:00.000Z',
    '2026-04-21T00:00:00.000Z'
  ),
  (
    'thien',
    'thien',
    'b7249574f68d2fecaa13d9f721e9129b',
    'member',
    false,
    '2026-04-21T00:00:00.000Z',
    '2026-04-21T00:00:00.000Z'
  ) ON CONFLICT (username_key) DO NOTHING;

INSERT INTO
  ranking_categories (
    id,
    name,
    display_name,
    "order",
    created_at,
    client_created_at,
    updated_at,
    client_updated_at
  )
VALUES
  (
    1,
    'yo',
    'Yo',
    1,
    '2026-04-20 19:56:26.253000 +00:00',
    '2026-04-20 19:56:26.253000 +00:00',
    NULL,
    NULL
  ),
  (
    2,
    'lo',
    'Lo',
    2,
    '2026-04-20 19:56:52.903000 +00:00',
    '2026-04-20 19:56:52.903000 +00:00',
    NULL,
    NULL
  ),
  (
    3,
    'ne',
    'Nè',
    3,
    '2026-04-20 19:56:58.829000 +00:00',
    '2026-04-20 19:56:58.829000 +00:00',
    NULL,
    NULL
  );

INSERT INTO
  ranking_members (
    id,
    name,
    category_id,
    rating,
    rating_deviation,
    volatility,
    last_match_at,
    created_at
  )
VALUES
  (
    1,
    'Bi',
    1,
    1500,
    350,
    0.06,
    NULL,
    '2026-04-20 19:56:33.921332 +00:00'
  ),
  (
    2,
    'Khang',
    1,
    1500,
    350,
    0.06,
    NULL,
    '2026-04-20 19:57:08.740697 +00:00'
  ),
  (
    3,
    'Phương',
    1,
    1500,
    350,
    0.06,
    NULL,
    '2026-04-20 19:57:13.890839 +00:00'
  ),
  (
    4,
    'Thiện',
    1,
    1500,
    350,
    0.06,
    NULL,
    '2026-04-20 19:57:16.849661 +00:00'
  );