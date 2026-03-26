#!/usr/bin/env node
/**
 * wolfXnode Superadmin Setup Script
 * Run this once on VPS to configure the superadmin account and key.
 * Usage: node server/setup_superadmin.cjs
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const crypto = require('crypto');

const CONFIG_FILE = path.join(__dirname, 'superadmin_config.json');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise(resolve => rl.question(q, resolve));

function generateKey(len = 24) {
  return crypto.randomBytes(len).toString('base64url').slice(0, len);
}

function loadExisting() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    }
  } catch (_) {}
  return {};
}

async function main() {
  console.log('\n╔══════════════════════════════════════╗');
  console.log('║   wolfXnode  —  Superadmin Setup      ║');
  console.log('╚══════════════════════════════════════╝\n');

  const existing = loadExisting();

  if (existing.username) {
    console.log(`Current superadmin: ${existing.username}`);
    console.log(`Current key:        ${existing.key}\n`);
    const change = await ask('Do you want to change the superadmin config? (y/N): ');
    if (change.trim().toLowerCase() !== 'y') {
      console.log('\nNo changes made.\n');
      rl.close();
      return;
    }
  }

  // Step 1: Username
  let username = '';
  while (!username) {
    username = (await ask('Enter superadmin username (e.g. wolf): ')).trim();
    if (!username) console.log('  ✗ Username cannot be empty.');
  }

  // Step 2: Key
  console.log('\nSuperadmin key options:');
  console.log('  1. Generate a random key (recommended)');
  console.log('  2. Enter your own key');

  let choice = '';
  while (!['1', '2'].includes(choice)) {
    choice = (await ask('\nChoice (1 or 2): ')).trim();
  }

  let key = '';
  if (choice === '1') {
    key = generateKey();
    console.log(`\n  ✓ Generated key: ${key}`);
    console.log('  (Save this somewhere safe — you will need it to access /superadmin)\n');
  } else {
    while (key.length < 6) {
      key = (await ask('Enter your key (min 6 characters): ')).trim();
      if (key.length < 6) console.log('  ✗ Key must be at least 6 characters.');
    }
  }

  // Save config
  const config = { username, key };
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');

  console.log('\n╔══════════════════════════════════════╗');
  console.log('║           ✓  Config Saved             ║');
  console.log('╚══════════════════════════════════════╝');
  console.log(`\n  Superadmin username : ${username}`);
  console.log(`  Superadmin key      : ${key}`);
  console.log('\n  → Log in as this user → open sidebar → click Superadmin');
  console.log('  → Enter the key above to unlock the panel.\n');
  console.log('  Restart the server for changes to take effect.\n');

  rl.close();
}

main().catch(e => { console.error('Setup error:', e.message); rl.close(); process.exit(1); });
