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
APP_VERSION=v-local
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

On deploy, workflow will:

- Auto-generate app version: `vYYYY.MM.DD.RUN_NUMBER`
- Inject version + Telegram values into deployed artifact

## Notes

- This is a static frontend app.
- Secret injection prevents committing token values to git history.
- Runtime values are still present in delivered client files. For real secret protection, route Telegram calls through a backend/serverless endpoint.
