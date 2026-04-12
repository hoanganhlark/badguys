# BadGuys App

A lightweight badminton cost-sharing app with a minimalist UI.

## Features

- Calculate total session cost from:
  - Court fee
  - Shuttle count (converted by tube price)
- Split costs with rules:
  - Female fixed cap (configurable)
  - Per-set pricing (configurable)
- Copy a session summary to clipboard
- Telegram notifications:
  - Guest visit event
  - Copy button event with summary content
- Deployment version shown in sidebar

## Project Structure

- `index.html`: main source file (placeholders for Telegram values)
- `index.local.html`: local generated file with injected values from `.env`
- `.github/workflows/deploy-pages.yml`: GitHub Pages deploy workflow and secret injection
- `scripts/inject-env.ps1`: local env injector script
- `.env.example`: local env template

## Local Setup

1. Create local env file:

```powershell
Copy-Item .env.example .env
```

2. Update `.env` values:

```env
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
TELEGRAM_GROUP_CHAT_ID=your_group_chat_id_here
FIREBASE_API_KEY=your_firebase_api_key_here
FIREBASE_PROJECT_ID=your_firebase_project_id_here
APP_VERSION=v-local
BADGUY_FEMALE_MAX=60
BADGUY_TUBE_PRICE=290
BADGUY_SET_PRICE=12
BADGUY_SHUTTLES_PER_TUBE=12
BADGUY_ROUND_RESULT=true
BADGUY_ENABLE_COURT_COUNT=true
```

3. Inject values into local build file:

```powershell
./scripts/inject-env.ps1
```

4. Open `index.local.html` in your browser.

## Deploy Setup (GitHub Pages)

Set these repository secrets:

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_GROUP_CHAT_ID`
- `FIREBASE_API_KEY`
- `FIREBASE_PROJECT_ID`

Optional repository variables (GitHub Actions Variables):

- `BADGUY_FEMALE_MAX`
- `BADGUY_TUBE_PRICE`
- `BADGUY_SET_PRICE`
- `BADGUY_SHUTTLES_PER_TUBE`
- `BADGUY_ROUND_RESULT`
- `BADGUY_ENABLE_COURT_COUNT`

If these variables are not set, deploy falls back to in-app defaults: 60, 290, 12, 12, `true`, and `true`.

On deploy, workflow will:

- Auto-generate app version: `vYYYY.MM.DD.RUN_NUMBER`
- Inject version + Telegram values into deployed artifact
- Inject Firebase API key + project ID into deployed artifact

## Notes

- This is a static frontend app.
- Secret injection prevents committing token values to git history.
- Runtime values are still present in delivered client files. For real secret protection, route Telegram calls through a backend/serverless endpoint.
