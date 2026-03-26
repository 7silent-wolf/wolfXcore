<p align="center">
  <img src="https://i.ibb.co/4g7rWmss/Chat-GPT-Image-Jan-28-2026-10-30-54-AM.png" alt="wolfXnode Logo" width="180"/>
</p>

<h1 align="center">wolfXnode</h1>

<p align="center">
  ⚡ Fast • 🔒 Secure • 🐺 Powerful WhatsApp Bot Hosting Platform
</p>

---

## 🚀 About wolfXnode

**wolfXnode** is a Heroku-like hosting platform built specifically for WhatsApp bots.  
Deploy bots directly from GitHub repositories, manage them with real-time logs, and keep them running persistently — even through server restarts.  
Designed for speed, scalability, and a clean developer experience, wolfXnode delivers a futuristic, neon-themed platform built on the **wolf mindset** — sharp, fast, and reliable.

---

## ✨ Features

- 🤖 **One-click bot deployment** from any GitHub repository
- 📋 **`app.json` support** — define environment variable templates per bot
- 🟢 **Real-time ANSI-colored logs** streamed live to your browser
- 🔁 **Persistent bot processes** — bots survive server restarts
- 💰 **M-Pesa & Paystack payments** for bot deployments (KES)
- 🛡️ **SuperAdmin panel** with full theme customization (12+ presets)
- 🎨 **Live theme switching** — colors, branding, social links
- 🔐 **Key-gated superadmin access** with config-file authentication
- 📊 **Admin dashboard** — manage users, bots, deposits, and alerts

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite + SWC |
| Backend | Node.js + Express |
| Database | PostgreSQL (Drizzle ORM) |
| Styling | Tailwind CSS + shadcn/ui |
| Auth | Session-based (express-session) |
| Payments | Paystack + M-Pesa STK Push |
| Bot Runtime | Node.js child processes (persistent) |
| Fonts | Orbitron + JetBrains Mono |

---

## 📂 Project Structure

```
wolfXnode/
├── client/src/
│   ├── pages/          # React pages (Home, MyBots, Admin, SuperAdmin, ...)
│   ├── components/     # Sidebar, Layout, UI components
│   └── context/        # ThemeProvider
├── server/
│   ├── index.js        # Express server + API routes
│   ├── bot_runner.cjs  # Bot process manager (spawn, restart, logs)
│   ├── storage.ts      # Database interface
│   └── bot_catalog.json# Available bot templates
├── shared/
│   └── schema.ts       # Drizzle ORM schema + Zod types
└── .gitignore
```

---

## ⚙️ Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `SESSION_SECRET` | Express session secret |
| `PAYSTACK_SECRET_KEY` | Paystack API key (for payments) |
| `BOTS_BASE_DIR` | Directory where bot files are stored (default: `/tmp/wolfhost-bots`) |

> **VPS tip:** Set `BOTS_BASE_DIR=/var/wolfhost-bots` for persistent bot storage across reboots.

---

## 🐺 SuperAdmin Setup

Run the setup script once on your server:

```bash
node server/setup_superadmin.cjs
```

It will prompt you to set a username and generate or enter an access key, then save them to `server/superadmin_config.json`. Restart the server after setup.

---

## 🚀 Getting Started

```bash
npm install
npm run dev
```

The app runs on a single port — Vite serves the frontend and Express handles the API on the same server.

---

<p align="center">Built with 🐺 by <strong>Silent Wolf</strong></p>
