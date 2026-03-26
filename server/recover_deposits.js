import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DEPOSITS_FILE = path.join(__dirname, 'deposits.json');
const SPENDING_FILE = path.join(__dirname, 'spending.json');
const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;

if (!PAYSTACK_SECRET) {
  console.error('ERROR: PAYSTACK_SECRET_KEY environment variable is not set.');
  process.exit(1);
}

function loadJSON(file) {
  try {
    if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {}
  return [];
}

async function fetchTransactions(email) {
  let allTxns = [];
  let page = 1;
  while (true) {
    const url = `https://api.paystack.co/transaction?email=${encodeURIComponent(email)}&status=success&perPage=100&page=${page}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` },
    });
    const data = await res.json();
    if (!data.status || !data.data || data.data.length === 0) break;
    allTxns = allTxns.concat(data.data);
    if (data.data.length < 100) break;
    page++;
  }
  return allTxns;
}

function convertToKES(amount, currency) {
  const rates = { USD: 130, EUR: 140, GBP: 165, NGN: 0.085 };
  return amount * (rates[currency] || 1);
}

async function main() {
  const spending = loadJSON(SPENDING_FILE);
  const deposits = loadJSON(DEPOSITS_FILE);
  const existingRefs = new Set(deposits.map(d => d.reference));

  const affectedEmails = [...new Set(spending.map(s => s.email.toLowerCase()))];
  console.log(`Found ${affectedEmails.length} unique user(s) with spending records:`);
  affectedEmails.forEach(e => console.log(`  - ${e}`));

  let totalAdded = 0;

  for (const email of affectedEmails) {
    const currentDeposits = deposits.filter(d => d.email === email).reduce((s, d) => s + d.amountKES, 0);
    const currentSpending = spending.filter(s => s.email.toLowerCase() === email).reduce((s, d) => s + d.amount, 0);
    console.log(`\nProcessing: ${email}`);
    console.log(`  Recorded deposits: ${currentDeposits} KES | Spending: ${currentSpending} KES`);

    let txns;
    try {
      txns = await fetchTransactions(email);
    } catch (e) {
      console.error(`  ERROR fetching transactions: ${e.message}`);
      continue;
    }

    console.log(`  Found ${txns.length} successful transaction(s) on Paystack`);

    let addedForUser = 0;
    for (const txn of txns) {
      if (existingRefs.has(txn.reference)) continue;
      const currency = txn.currency || 'KES';
      const rawAmount = txn.amount / 100;
      const amountKES = currency === 'KES' ? rawAmount : convertToKES(rawAmount, currency);
      const entry = {
        email,
        amountKES: Math.round(amountKES * 100) / 100,
        reference: txn.reference,
        currency,
        method: txn.channel || 'unknown',
        date: txn.paid_at || txn.created_at,
        recovered: true,
      };
      deposits.push(entry);
      existingRefs.add(txn.reference);
      addedForUser++;
      totalAdded++;
      console.log(`  + Added: ${amountKES} KES (ref: ${txn.reference}, method: ${txn.channel})`);
    }

    if (addedForUser === 0) console.log(`  No new transactions to add.`);

    const newTotal = deposits.filter(d => d.email === email).reduce((s, d) => s + d.amountKES, 0);
    const newBalance = Math.max(0, newTotal - currentSpending);
    console.log(`  New total deposits: ${newTotal} KES | Balance after recovery: ${newBalance} KES`);
  }

  if (totalAdded > 0) {
    fs.writeFileSync(DEPOSITS_FILE, JSON.stringify(deposits, null, 2), 'utf8');
    console.log(`\nDone. Added ${totalAdded} missing deposit record(s) to deposits.json.`);
  } else {
    console.log(`\nNo missing records found. deposits.json unchanged.`);
  }
}

main().catch(e => { console.error('Fatal error:', e.message); process.exit(1); });
