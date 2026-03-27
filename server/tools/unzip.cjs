'use strict';
/**
 * wolfXnode unzip shim — drop-in replacement for the `unzip` CLI tool.
 * Uses adm-zip (pure JS, no native deps). Supports the common flags bots use:
 *   unzip file.zip
 *   unzip -o file.zip            (overwrite — always on)
 *   unzip -o file.zip -d outdir  (extract to a specific directory)
 *   unzip -l file.zip            (list contents only)
 */
const path = require('path');
const fs   = require('fs');

// Resolve adm-zip: try node_modules at project root first
let AdmZip;
const candidates = [
  path.resolve(__dirname, '../../node_modules/adm-zip'),
  path.resolve(__dirname, '../node_modules/adm-zip'),
  'adm-zip',
];
for (const c of candidates) {
  try { AdmZip = require(c); break; } catch (_) {}
}
if (!AdmZip) {
  process.stderr.write('unzip: adm-zip not found — run: npm install adm-zip\n');
  process.exit(1);
}

const args = process.argv.slice(2);

if (!args.length) {
  process.stderr.write('Usage: unzip [-o] [-l] <file.zip> [-d <dir>]\n');
  process.exit(1);
}

let listOnly = false;
let dest     = '.';
let zipFile  = null;
let i = 0;

while (i < args.length) {
  const a = args[i];
  if (a === '-d') {
    i++;
    if (i < args.length) dest = args[i];
  } else if (a === '-l') {
    listOnly = true;
  } else if (/^-[ofu]+$/.test(a)) {
    // -o / -f / -u — always overwrite; flag accepted but ignored
  } else if (!a.startsWith('-')) {
    if (zipFile === null) zipFile = a;
    // additional positional args are file filters — ignored, extract everything
  }
  i++;
}

if (!zipFile) {
  process.stderr.write('unzip: no zip file specified\n');
  process.exit(1);
}

if (!fs.existsSync(zipFile)) {
  process.stderr.write(`unzip: cannot find or open ${zipFile}\n`);
  process.exit(1);
}

try {
  const zip = new AdmZip(zipFile);

  if (listOnly) {
    const entries = zip.getEntries();
    console.log(`Archive:  ${zipFile}`);
    console.log(`${'Length'.padStart(10)}  ${'Date'.padEnd(10)}  Name`);
    console.log(`${'-'.repeat(10)}  ${'-'.repeat(10)}  ${'-'.repeat(40)}`);
    let total = 0;
    entries.forEach(e => {
      const t = e.header.time;
      const d = `${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,'0')}-${String(t.getDate()).padStart(2,'0')}`;
      console.log(`${String(e.header.size).padStart(10)}  ${d}  ${e.entryName}`);
      total += e.header.size;
    });
    console.log(`${'-'.repeat(62)}`);
    console.log(`${String(total).padStart(10)}                  ${entries.length} file(s)`);
    process.exit(0);
  }

  console.log(`Archive:  ${zipFile}`);
  fs.mkdirSync(dest, { recursive: true });
  zip.extractAllTo(dest, /*overwrite=*/true);
  const entries = zip.getEntries();
  entries.forEach(e => {
    if (!e.isDirectory) {
      process.stdout.write(`  inflating: ${path.join(dest, e.entryName)}\n`);
    }
  });
  process.stdout.write(`\nExtracted ${entries.filter(e=>!e.isDirectory).length} file(s) to: ${path.resolve(dest)}\n`);
} catch (err) {
  process.stderr.write(`unzip: ${err.message}\n`);
  process.exit(1);
}
