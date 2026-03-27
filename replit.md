# wolfXnode

A Heroku-style WhatsApp bot hosting platform. Users deploy bots from GitHub repos using `app.json` for env var templates, with one-click deploy, real-time ANSI-colored logs, persistent bot processes that survive server restarts, an interactive web console for stdin input, and a developer bot submission system with admin review workflow.

---

## Architecture

- **Frontend**: React + TypeScript + Vite, served from Express via the built `dist/` folder
- **Backend**: Express.js (Node.js, ESM modules) on port 5000
- **Auth**: JWT-based (stored in `localStorage`)
- **Payments**: Paystack integration (currently all prices set to 0 — free mode)
- **Bot runner**: Detached `bot_runner.cjs` process per bot (PTY via `script -q`) — survives server restarts
- **Data storage**: Flat JSON files in `server/*.json` — no database needed

---

## Key Files

| File | Purpose |
|---|---|
| `server/index.js` | Main Express server (~5300 lines) — all API routes |
| `server/bot_runner.cjs` | Detached bot process wrapper (PTY + log capture + stdin polling) |
| `server/tools/unzip` | Shell wrapper → delegates to `unzip.cjs` |
| `server/tools/unzip.cjs` | Pure-JS unzip shim using `adm-zip` (no system binary needed) |
| `src/` | React frontend source |
| `src/pages/MyBots.jsx` | My Bots page — Panel Bots + Direct Bots tabs |
| `src/pages/DirectBotLog.jsx` | Fullscreen ANSI terminal log viewer with React Portal |
| `src/pages/Admin.jsx` | Admin dashboard — Bot Catalog, Submissions, Site Settings, Email Config |
| `vcf.html` | Standalone contact card page (wolfXnode theme — no React) |
| `server/*.json` | Flat-file data stores (see list below) |

---

## Data Files (`server/*.json`)

| File | Contents |
|---|---|
| `bot_catalog.json` | Admin-managed deployable bots (name, repoUrl, mainFile, priceKES, tag, etc.) |
| `bot_deployments.json` | Pterodactyl panel bot deployment records |
| `direct_deployments.json` | Direct process deployment records (id, userId, repoUrl, mainFile, status, runnerPid, envVars) |
| `bot_submissions.json` | Developer-submitted bots awaiting admin review |
| `bot_logs/` | Per-deployment JSONL log files (keyed by deployment id) |
| `site_settings.json` | Theme vars, platform name, email config (emailUser/emailPass stripped from public API) |
| `user_credentials.json` | Hashed passwords |
| `notifications.json` | Per-user notifications |
| `community_messages.json` | Community chat messages |
| `spending.json` | Records of spending (guarded by `price > 0` in free mode) |
| `deposits.json` | Verified deposit records |
| `referrals.json` | Referral codes and tracking |
| `tasks.json` | Completed social tasks per user |
| `deploy_claims.json` | GitHub deploy claims |
| `welcome_claims.json` | Free trial claims |
| `admin_alerts.json` | Admin security / event notifications |
| `superadmin_config.json` | `{ "username": "wolf", "key": "Silentwolf906." }` |

---

## Direct Bot Runner (wolfXnode native)

Bots run as **detached Node.js processes** on the wolfXnode server (no Pterodactyl panel required):

1. Clones the bot's GitHub repo via `git clone --depth=1`
2. Runs `npm install`
3. Launches `bot_runner.cjs` which wraps the bot in a PTY (`script -q -c "node --no-warnings ENTRY" /dev/null`)
4. Captures stdout/stderr as structured JSONL log lines to `server/bot_logs/<deployId>.jsonl`
5. Polls `.wolfxnode_stdin` file every 300ms and pipes input to the bot process (web console stdin)
6. Processes are **detached** — they survive wolfXnode server restarts
7. On server restart, `direct_deployments.json` is read and any dead deployments are auto-restarted

### Key constants
- `BOTS_BASE_DIR` — defaults to `/tmp/wolfxnode-bots`; set to `/var/wolfhost-bots` on VPS
- Bot port formula: `10000 + (parseInt(deployId.replace(/-/g,'').slice(0,6), 16) % 50000)` (deterministic)
- `BOT_PATCHED_PATH` — `server/tools/` prepended to `PATH` for all spawned processes

### API routes
| Method | Route | Description |
|---|---|---|
| POST | `/api/bots/direct-deploy` | Clone + install + launch bot |
| GET | `/api/bots/my-direct-deployments` | User's direct deployments |
| GET | `/api/bots/direct/:id/logs` | Structured log lines (JSONL) |
| POST | `/api/bots/direct/:id/stop` | Kill bot runner process |
| POST | `/api/bots/direct/:id/restart` | Restart bot (re-runs deployment flow) |
| DELETE | `/api/bots/direct/:id` | Stop + delete all files |
| POST | `/api/bots/direct/:id/exec` | Run a shell command in bot's directory |
| POST | `/api/bots/direct/:id/stdin` | Write text to bot's `.wolfxnode_stdin` file |

---

## Zip Extraction Support

Because many bots have self-update commands that call `unzip`, and the system may not have the native binary:

- `server/tools/unzip` — a shell script wrapper (`#!/bin/sh`) that calls `server/tools/unzip.cjs`
- `server/tools/unzip.cjs` — full drop-in `unzip` CLI emulator using `adm-zip` (installed as npm dep)
- Supports: `unzip file.zip`, `unzip -o file.zip -d outdir`, `unzip -l file.zip`
- `server/tools/` is prepended to `PATH` in every environment wolfXnode spawns:
  - `botEnv` when launching/restarting a bot runner
  - `bot_runner.cjs` when it forks the actual bot script
  - `spawnStep()` used during `git clone` / `npm install` steps
  - The `/api/bots/direct/:id/exec` endpoint (web shell commands)

On a real VPS, `sudo apt install unzip` works fine too — the real binary will take priority in `PATH`.

---

## Bot Submission System

Developers can submit their bots for inclusion in the public catalog:

- `POST /api/bot-submissions` — Submit (title, description, repoUrl, contact)
- `GET /api/admin/bot-submissions` — Admin: list all submissions (pending/approved/rejected)
- `POST /api/admin/bot-submissions/:id/approve` — Approve: creates a catalog entry with `tag: 'community'`
- `POST /api/admin/bot-submissions/:id/reject` — Reject: sends rejection email if email config set

---

## Email Notifications

Configured in Admin > Site Settings > Email Config tab:

- Stored in `site_settings.json` as `emailUser` (Gmail address) + `emailPass` (App Password)
- **Never exposed** via the public `GET /api/site-settings` endpoint — admin-only
- `sendReviewEmail(toEmail, botName, status, reason?)` — sends HTML email on approve/reject
- Test button available in admin UI (`POST /api/admin/email-config/test`)
- API: `GET /api/admin/email-config`, `PUT /api/admin/email-config`

---

## Free Mode

All prices are set to zero:
- `BOT_DEPLOYMENT_PRICE = 0`
- `TIER_PRICES = { Limited: 0, Unlimited: 0, Admin: 0 }`
- All balance checks removed from deploy handlers
- `recordSpending()` is guarded with `if (price > 0)` — no spending recorded in free mode
- "KES X paid" labels hidden in `MyBots.jsx` when price is 0

**To go commercial**: restore the price constants and remove the `price > 0` guard in `recordSpending`.

---

## Fullscreen Console Log

`DirectBotLog.jsx` renders the terminal via a **React Portal** (`createPortal` to `document.body`):
- `z-[9999]` — fully independent of layout stacking context
- Press **ESC** or click **⤡** button to exit fullscreen
- Log box grows to fill the full viewport height

---

## VCF / Contact Page

`vcf.html` — standalone HTML page (no React) at the `/vcf.html` route:
- wolfXnode neon-green theme (Orbitron + JetBrains Mono fonts)
- Animated grid + floating orbs background
- Download `.vcf` button + contact links grid

---

## Security & Rate Limiting

- Helmet.js for HTTP security headers
- **Rate limiting currently OFF** — all 7 limiters replaced with `noopMiddleware`; server logs `rate-limiting=OFF`
- Input validation with `express-validator`
- JWT authentication for protected routes
- CORS restricted to localhost, Replit, and xwolf.space domains
- Path-based attack blocking (SQL injection, config file access, etc.)
- Security event logging to `server/security.log`

---

## Environment Variables

| Variable | Default / Notes |
|---|---|
| `NODE_ENV` | `development` in Replit |
| `PORT` | `5000` |
| `JWT_SECRET` | Auto-generated in dev; **required** in production |
| `PAYSTACK_SECRET_KEY` | Paystack payments (optional in free mode) |
| `PTERODACTYL_API_KEY` | Pterodactyl panel features (optional) |
| `PTERODACTYL_API_URL` | Defaults to `https://panel.xwolf.space` |
| `BOTS_BASE_DIR` | `/tmp/wolfxnode-bots` (dev); `/var/wolfhost-bots` (VPS) |

---

## VPS Deployment Notes

1. Node.js 20 + PM2 for process persistence
2. Set `BOTS_BASE_DIR=/var/wolfhost-bots`, `JWT_SECRET`, `NODE_ENV=production` in `.env`
3. Mount the `server/` directory as a persistent volume if using Docker (JSON data files live here)
4. `sudo apt install unzip zip git` — native tools (our shim is a fallback, not a replacement)
5. `npm install` in project root — installs `adm-zip` and all other dependencies

---

## Running the App

`npm run dev` → builds Vite frontend → starts Express on port 5000.
The "Start application" workflow runs this automatically.
