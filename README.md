# Badguys

A badminton session cost-sharing calculator. Splits court fees and shuttle costs among players with configurable rules for female caps, per-set pricing, and custom fees.

## Features

- **Cost calculation** — court fee + shuttle cost (auto-converted from tube price), split across all players
- **Flexible player rules:**
  - Female players: capped at a configurable max fee
  - Per-set players: pay a flat per-set rate, excluded from shared pool
  - Custom-fee players: pay a fixed amount, excluded from shared pool
  - Surcharge: add an extra fee on top of any player's base cost
- **Session summary** — formatted clipboard text with full breakdown
- **Session history** — saved to Firestore, viewable and deletable (admin only)
- **Telegram notifications** — guest visit and copy events (configurable)
- **Admin mode** — toggles session deletion and suppresses outgoing notifications

## Player input syntax

Each line in the player text area represents one player. Modifiers are appended to the name:

| Modifier | Meaning                      | Example     |
| -------- | ---------------------------- | ----------- |
| `n`      | Female player (capped fee)   | `Lan n`     |
| `2s`     | Plays by set (2 sets)        | `Hung 2s`   |
| `30k`    | Custom fixed fee             | `Nam 30k`   |
| `+10k`   | Surcharge on top of base fee | `Minh +10k` |

Numbered list format is also accepted: `1. Lan n`, `2/ Hung 2s`.

## Tech stack

- React 18 + TypeScript
- Vite 5
- Tailwind CSS
- Firebase Firestore
- Telegram Bot API

## Local development

**1. Create a local env file:**

```bash
cp .env.example .env.local
```

**2. Fill in `.env.local`:**

```env
VITE_TELEGRAM_BOT_TOKEN=your_telegram_bot_token
VITE_TELEGRAM_GROUP_CHAT_ID=your_group_chat_id
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
VITE_APP_VERSION=v-local

# Optional — falls back to these defaults if omitted
VITE_BADGUY_FEMALE_MAX=60
VITE_BADGUY_TUBE_PRICE=290
VITE_BADGUY_SET_PRICE=12
VITE_BADGUY_SHUTTLES_PER_TUBE=12
VITE_BADGUY_ROUND_RESULT=true
VITE_BADGUY_ENABLE_COURT_COUNT=true
VITE_BADGUY_ENABLE_TELEGRAM_NOTIFICATION=true
VITE_FIREBASE_COLLECTION_SESSIONS=dev-sessions
```

**3. Start the dev server:**

```bash
npm install
npm run dev
```

## Firestore seed helpers

```bash
# Seed default ranking categories to dev collection
npm run seed:ranking-categories

# Seed default ranking categories to production collection
npm run seed:ranking-categories -- --prod

# Seed default users to dev collection
npm run seed:users
```

## Deployment (GitHub Pages)

The workflow in `.github/workflows/deploy-pages.yml` auto-deploys on push to `main`.

**Required repository secrets:**

| Secret                        | Description            |
| ----------------------------- | ---------------------- |
| `VITE_TELEGRAM_BOT_TOKEN`     | Telegram bot token     |
| `VITE_TELEGRAM_GROUP_CHAT_ID` | Telegram group chat ID |
| `VITE_FIREBASE_API_KEY`       | Firebase API key       |
| `VITE_FIREBASE_PROJECT_ID`    | Firebase project ID    |

**Optional repository variables** (fall back to defaults if not set):

`VITE_BADGUY_FEMALE_MAX`, `VITE_BADGUY_TUBE_PRICE`, `VITE_BADGUY_SET_PRICE`, `VITE_BADGUY_SHUTTLES_PER_TUBE`, `VITE_BADGUY_ROUND_RESULT`, `VITE_BADGUY_ENABLE_COURT_COUNT`, `VITE_FIREBASE_COLLECTION_SESSIONS`

On each deploy the workflow auto-generates a version tag (`vYYYY.MM.DD.RUN_NUMBER`) and sends a Telegram notification on success or failure.

## Notes

- This is a static frontend app with no backend. Secrets are embedded in the built client bundle.
- To avoid exposing the Telegram bot token publicly, route Telegram calls through a serverless function or backend proxy.
- Firebase Firestore security rules should restrict writes to your app's origin in production.
