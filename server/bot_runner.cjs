'use strict';
/**
 * WolfHost Bot Runner
 * Spawned as a detached process. Runs the bot, captures all output
 * and writes structured JSONL lines to the log file.
 * Survives WolfHost server restarts (detached + stdio ignored by parent).
 */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const LOG_FILE  = process.env.WOLFHOST_LOG_FILE;
const ENTRY     = process.argv[2];
const BOT_DIR   = process.argv[3] || process.cwd();

if (!LOG_FILE || !ENTRY) {
  process.stderr.write('[bot_runner] Missing WOLFHOST_LOG_FILE or entry file\n');
  process.exit(1);
}

const logStream = fs.createWriteStream(LOG_FILE, { flags: 'a' });

function writeLine(level, msg) {
  try {
    logStream.write(JSON.stringify({ ts: new Date().toISOString(), level, msg }) + '\n');
  } catch {}
}

writeLine('info', `[Runner] Starting: node ${ENTRY}`);

// Patterns to suppress — internal Node.js noise that bots can't control
const SUPPRESS_RE = /MODULE_TYPELESS_PACKAGE_JSON|Reparsing as ES module because module syntax|To eliminate this warning, add "type": "module"|Use `node --trace-warnings/;

const bot = spawn(process.execPath, ['--no-warnings', ENTRY], {
  cwd: BOT_DIR,
  env: { ...process.env, NODE_NO_WARNINGS: '1' },
  stdio: ['ignore', 'pipe', 'pipe'],
});

bot.stdout.on('data', chunk => {
  const lines = chunk.toString().split('\n');
  lines.forEach(l => { if (l && !SUPPRESS_RE.test(l)) writeLine('info', l); });
});

bot.stderr.on('data', chunk => {
  const lines = chunk.toString().split('\n');
  lines.forEach(l => { if (l && !SUPPRESS_RE.test(l)) writeLine('warn', l); });
});

bot.on('close', code => {
  writeLine('info', `[Runner] Process exited with code ${code}`);
  logStream.end();
  process.exit(code || 0);
});

bot.on('error', err => {
  writeLine('error', `[Runner] Spawn error: ${err.message}`);
  logStream.end();
  process.exit(1);
});

// Forward termination signals to bot
['SIGTERM', 'SIGINT'].forEach(sig => {
  process.on(sig, () => {
    writeLine('info', `[Runner] Received ${sig}, stopping bot…`);
    bot.kill(sig);
  });
});
