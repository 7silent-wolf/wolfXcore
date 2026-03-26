# WolfHost

A premium hosting platform that allows users to deploy servers, pay via M-Pesa/Paystack, manage their infrastructure, and earn through referrals.

## Architecture

- **Frontend**: React + TypeScript + Vite, served from the Express server via the built `dist/` folder
- **Backend**: Express.js (Node.js, ESM modules) on port 5000
- **Auth**: JWT-based authentication (stored in localStorage)
- **Payments**: Paystack integration (M-Pesa and card)
- **Server management**: Pterodactyl panel API integration

## Key Files

- `server/index.js` — Main Express server (~3900 lines), handles all API routes and serves the built frontend
- `src/` — React frontend source
- `src/services/api.js` — All frontend API calls (~2300 lines)
- `server/config/countries.js` — Currency/FX rate config
- `server/*.json` — Flat-file data storage (users, servers, messages, notifications, etc.)

## Data Storage

Uses JSON flat files in `server/`:
- `bot_catalog.json` — Bot catalog entries (name, repoUrl, mainFile, priceKES, etc.)
- `bot_deployments.json` — Pterodactyl panel bot deployment records
- `direct_deployments.json` — Direct bot deployment records (wolfdeploy-style)
- `user_credentials.json` — Hashed passwords
- `notifications.json` — Per-user notifications
- `community_messages.json` — Community chat
- `spending.json` — Records of server purchases (used for balance calculation)
- `deposits.json` — **Local deposit records** (recorded when payments are verified; used as primary source for balance calculation)
- `referrals.json` — Referral codes and tracking
- `tasks.json` — Completed social tasks per user
- `deploy_claims.json` — GitHub deploy claims
- `welcome_claims.json` — Free trial claims
- `free_servers.json` — Available free server pool
- `admin_alerts.json` — Admin notifications

## Balance Calculation

Balance = local deposits (deposits.json) - local spending (spending.json).
- **Primary**: Local `deposits.json` — written when any payment is verified (M-Pesa, card, mobile money, bank transfer, USSD). All currencies are converted to KES.
- **Fallback**: Paystack API — used only for users who have no local deposit records (backward compatibility with payments made before this system).
- This makes balance reliable and independent of Paystack API availability.

## Environment Variables

- `NODE_ENV` — `development` (set in Replit shared env)
- `PORT` — `5000` (set in Replit shared env)
- `JWT_SECRET` — Required in production (auto-generated random in dev)
- `PAYSTACK_SECRET_KEY` — Paystack payment processing
- `PTERODACTYL_API_KEY` — Pterodactyl panel API key
- `PTERODACTYL_API_URL` — Defaults to `https://panel.xwolf.space`
- `SUPER_ADMIN_USERNAME` — Optional. Only needed to unlock "Clear Resolved Alerts" (destructive super-admin action). Revenue, payments tab, and Total Revenue card are visible to all admins without this env var.

## Running the App

The `npm run dev` script builds the Vite frontend then starts Express. The workflow "Start application" runs this automatically on port 5000.

## Payment Flow (Paystack)

- **M-Pesa / Mobile Money**: STK push via `/api/mpesa/charge` → poll `/api/mpesa/verify/:reference` → `recordDeposit` writes to `deposits.json`
- **Card**: Initialize via `/api/card/initialize` → Paystack checkout tab → user clicks verify → `/api/card/verify/:reference` → `recordDeposit` writes to `deposits.json`
- **Card redirect callback** (Billing page): When Paystack redirects back with `?reference=`, the `VerifyPayment` component opens automatically and calls `/api/card/verify/:reference`
- **VerifyPayment bug fix** (2026-03-22): Was checking `result.status` instead of `result.success`, causing all verifications to always show as "failed". Fixed.

## Paystack API Optimizations (2026-03-22)

- `paystackFetch` now has a 15-second `AbortController` timeout to prevent hanging
- `resolvePaystackCustomer` results are cached (10-min TTL) per email to avoid repeated API calls on every page load
- `fetchUserTransactions` no longer hard-codes `currency=KES`, allowing transactions in GHS/NGN/etc. to show in the billing/wallet pages

## Admin Dashboard — Total Revenue Fix (2026-03-22)

- **Root cause**: `/api/admin/payments` required `requireSuperAdmin`, but `SUPER_ADMIN_USERNAME` env var was never set, making it permanently return 403 for every user. All revenue-related UI was gated behind `user?.isSuperAdmin` which was always `false`.
- **Fix**: Changed `/api/admin/payments` to `requireAdmin` so all panel admins can access it. Updated all `isSuperAdmin` guards in `Admin.jsx` (stat card, Payments tab, Recent Payments widget, refresh button, grid layout) to `isAdmin`. `SUPER_ADMIN_USERNAME` is still used for destructive-only actions like "Clear Resolved Alerts".
- **Revenue total**: Now takes `Math.max(localDepositsTotal from deposits.json, paystackTotal)` to ensure the most complete figure is shown. Each payment's `amountKES` is derived with `convertToKES` for correct multi-currency totals.

## Bot Deployment Platform

### Data files
- `server/bot_catalog.json` — Admin-managed list of deployable bots (name, description, repoUrl, appJsonUrl, tag, priceKES, ramMB, diskMB, mainFile)
- `server/bot_deployments.json` — Records of each bot deployed by users (userId, serverId, serverIdentifier, etc.)

### API routes
- `GET /api/bots/catalog` — List active bots (authenticated users)
- `POST /api/bots/deploy` — Deploy a bot; deducts `priceKES` from wallet via `verifyUserBalance` + `recordSpending`; creates Pterodactyl server with `GIT_ADDRESS=repoUrl`, `AUTO_UPDATE=0`, `start_on_completion=true`; accepts optional `sessionId` written to `SESSION_ID` env var
- `GET /api/bots/my-deployments` — User's deployed bots
- `DELETE /api/bots/my-deployments/:id` — Delete deployment record + panel server
- `GET /api/admin/bot-catalog` — Admin: full catalog
- `POST /api/admin/bot-catalog` — Admin: add bot (fetches app.json if URL provided)
- `PATCH /api/admin/bot-catalog/:id` — Admin: update bot
- `DELETE /api/admin/bot-catalog/:id` — Admin: remove bot
- `GET /api/admin/bot-deployments` — Admin: all user deployments

### Frontend pages
- `/available-bots` — Browse catalog. Each bot has two deploy buttons: **Panel** (Pterodactyl container) and **Direct** (wolfdeploy-style process). Modal has mode tabs.
- `/my-bots` — Two tabs: **Panel Bots** (Pterodactyl) and **Direct Bots** (process runner). Direct bots show status, log count, PID; stop/restart/delete inline.
- `/bots/direct/:id/logs` — Live terminal log viewer for direct deployments. Polls `/api/bots/direct/:id/logs` every 2.5s. Shows stdout/stderr, status badge, elapsed timer.
- Admin page > "Bot Catalog" tab — Add/edit/delete/toggle visibility of bots

## Direct Bot Runner (wolfdeploy-style)

Bots can be deployed as **direct Node.js processes** on the WolfHost server (no Pterodactyl panel required):
- Clones the bot's GitHub repo → `npm install` → `node <mainFile>`
- Captures stdout/stderr as structured log lines (up to 800 per deployment)
- Persists deployment metadata to `direct_deployments.json` (logs are in-memory only)
- On server restart, processes die — the UI shows "stopped" and provides a Restart button
- `BOTS_BASE_DIR` env var overrides the default `/tmp/wolfhost-bots/` directory
- API: `POST /api/bots/direct-deploy`, `GET /api/bots/my-direct-deployments`, `GET /api/bots/direct/:id/logs`, `POST /api/bots/direct/:id/stop`, `POST /api/bots/direct/:id/restart`, `DELETE /api/bots/direct/:id`

### Node capacity (as of 2026-03-22)
- Node `silent` at `node.xwolf.space` — unlimited RAM/disk configured, ~330 free port allocations remaining
- 89 servers currently active; 53 GB RAM + 490 GB disk allocated

## Security

- Helmet.js for HTTP security headers
- Rate limiting on all API routes (auth, payments, registration)
- Input validation with express-validator
- JWT authentication for protected routes
- CORS restricted to localhost, Replit, and xwolf.space domains
- Path-based attack blocking (SQL injection patterns, config file access, etc.)
- Security event logging to `server/security.log`
