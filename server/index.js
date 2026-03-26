import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { body, query, param, validationResult } from 'express-validator';
import jwt from 'jsonwebtoken';
import { convertToKES } from './config/countries.js';
import { spawn } from 'child_process';
import { tmpdir } from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

const serverLog = IS_PRODUCTION ? () => {} : console.log.bind(console);
const serverDebug = IS_PRODUCTION ? () => {} : console.debug.bind(console);

const JWT_SECRET = process.env.JWT_SECRET || (IS_PRODUCTION ? (() => { throw new Error('JWT_SECRET must be set in production'); })() : crypto.randomBytes(64).toString('hex'));
const JWT_EXPIRY = '7d';

function generateToken(user) {
  return jwt.sign({
    userId: user.id,
    email: user.email,
    username: user.username,
    isAdmin: user.isAdmin || false,
    isSuperAdmin: user.isSuperAdmin || false,
  }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user || !req.user.isAdmin) {
    securityLog('ALERT', 'ADMIN_ACCESS_DENIED', { ip: req._clientIp, userId: req.user?.userId });
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }
  next();
}

function requireSuperAdmin(req, res, next) {
  if (!req.user || !req.user.isSuperAdmin) {
    securityLog('ALERT', 'SUPER_ADMIN_ACCESS_DENIED', { ip: req._clientIp, userId: req.user?.userId });
    return res.status(403).json({ success: false, message: 'Super admin access required' });
  }
  next();
}

const app = express();

app.disable('x-powered-by');

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://js.paystack.co"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
      imgSrc: ["'self'", "data:", "blob:", "https:", "https://img.youtube.com"],
      connectSrc: ["'self'", "https://api.paystack.co", "wss:", "ws:"],
      frameSrc: ["'self'", "https://js.paystack.co", "https://www.youtube.com", "https://youtube.com"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: [],
      workerSrc: ["'self'"],
      manifestSrc: ["'self'"],
      frameAncestors: ["'self'", "https://*.replit.dev", "https://*.replit.app", "https://*.repl.co", "https://replit.com"],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
  hsts: IS_PRODUCTION ? { maxAge: 63072000, includeSubDomains: true, preload: true } : false,
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  xContentTypeOptions: true,
  xDnsPrefetchControl: { allow: false },
  xDownloadOptions: true,
  xFrameOptions: false,
  xPermittedCrossDomainPolicies: { permittedPolicies: 'none' },
  xPoweredBy: false,
}));

app.use((req, res, next) => {
  res.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(self)');
  res.set('X-Content-Type-Options', 'nosniff');
  if (IS_PRODUCTION) {
    res.set('X-Robots-Tag', 'noindex, nofollow, nosnippet, noarchive');
  }
  res.removeHeader('X-Powered-By');
  res.removeHeader('Server');
  next();
});

app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    const allowed = [
      /^https?:\/\/localhost(:\d+)?$/,
      /^https?:\/\/.*\.repl\.co$/,
      /^https?:\/\/.*\.replit\.dev$/,
      /^https?:\/\/.*\.replit\.app$/,
      /^https?:\/\/.*\.repl\.dev$/,
      /^https?:\/\/.*\.wss\.replit\.dev$/,
      /^https?:\/\/(host\.)?xwolf\.space$/,
    ];
    if (allowed.some(re => re.test(origin))) return callback(null, true);
    callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  maxAge: 86400,
}));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));

const SECURITY_LOG_FILE = path.join(__dirname, 'security.log');

function securityLog(level, event, details = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    event,
    ...details,
  };
  const line = JSON.stringify(entry) + '\n';
  try {
    fs.appendFileSync(SECURITY_LOG_FILE, line);
  } catch (e) {}
  if (!IS_PRODUCTION && (level === 'WARN' || level === 'ALERT')) {
    console.warn(`[SECURITY:${level}] ${event}`, JSON.stringify(details));
  }
}

function getClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || 'unknown';
}

app.use((req, res, next) => {
  req._clientIp = getClientIp(req);
  req._requestId = crypto.randomUUID();
  next();
});

app.use((req, res, next) => {
  const blocked = ['.env', '.git', '.htaccess', 'wp-admin', 'wp-login', 'phpinfo',
    'phpmyadmin', '.php', 'xmlrpc', 'wp-content', 'wp-includes', '.asp', '.aspx',
    'cgi-bin', '.bak', '.sql', '.log', 'debug', '.config', 'web.config',
    '.DS_Store', 'Thumbs.db', '.idea', '.vscode', 'node_modules', '.npmrc',
    'package.json', 'package-lock', '.gitignore', 'tsconfig', 'vite.config',
    'tailwind.config', 'postcss.config', 'src/'];
  const lp = req.path.toLowerCase();
  const isBlocked = blocked.some(p => lp.includes(p)) || lp.startsWith('/server/');
  if (isBlocked) {
    securityLog('WARN', 'BLOCKED_PATH', { ip: req._clientIp, path: req.path });
    return res.status(404).json({ message: 'Not found' });
  }
  next();
});

const noopMiddleware = (req, res, next) => next();
const globalLimiter   = noopMiddleware;
const authLimiter     = noopMiddleware;
const paymentLimiter  = noopMiddleware;
const adminLimiter    = noopMiddleware;
const chatLimiter     = noopMiddleware;
const registerLimiter = noopMiddleware;

const registrationTracker = new Map();
const REGISTRATION_CLEANUP_INTERVAL = 60 * 60 * 1000;
setInterval(() => {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  for (const [ip, data] of registrationTracker.entries()) {
    if (data.lastAttempt < cutoff) registrationTracker.delete(ip);
  }
}, REGISTRATION_CLEANUP_INTERVAL);

function checkRegistrationAbuse(req, res, next) {
  const ip = req._clientIp || getClientIp(req);
  const now = Date.now();
  const tracker = registrationTracker.get(ip) || { count: 0, firstAttempt: now, lastAttempt: now };

  const windowMs = 24 * 60 * 60 * 1000;
  if (now - tracker.firstAttempt > windowMs) {
    tracker.count = 0;
    tracker.firstAttempt = now;
  }

  tracker.count++;
  tracker.lastAttempt = now;
  registrationTracker.set(ip, tracker);

  if (tracker.count > 5) {
    securityLog('ALERT', 'REGISTRATION_ABUSE_BLOCKED', { ip, count: tracker.count, email: req.body?.email });
    return res.status(429).json({ success: false, message: 'Too many accounts created from this network. Please contact support.' });
  }

  next();
}

app.use('/api/', globalLimiter);

function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    securityLog('WARN', 'VALIDATION_FAILED', { ip: req._clientIp, path: req.path, errors: errors.array().map(e => e.msg) });
    return res.status(400).json({ success: false, message: errors.array()[0].msg });
  }
  next();
}

function sanitizeString(val) {
  if (typeof val !== 'string') return val;
  return val.replace(/[<>]/g, '').trim();
}

const TASKS_FILE = path.join(__dirname, 'tasks.json');
const FREE_SERVERS_FILE = path.join(__dirname, 'free_servers.json');
const WELCOME_CLAIMS_FILE = path.join(__dirname, 'welcome_claims.json');
const NOTIFICATIONS_FILE = path.join(__dirname, 'notifications.json');
const ADMIN_ALERTS_FILE = path.join(__dirname, 'admin_alerts.json');

function loadNotifications() {
  try {
    if (fs.existsSync(NOTIFICATIONS_FILE)) {
      return JSON.parse(fs.readFileSync(NOTIFICATIONS_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('Error loading notifications:', e);
  }
  return {};
}

function saveNotifications(data) {
  try {
    fs.writeFileSync(NOTIFICATIONS_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.error('Error saving notifications:', e);
  }
}

function addNotification(userId, type, title, message) {
  const allNotifs = loadNotifications();
  const key = userId.toString();
  if (!allNotifs[key]) allNotifs[key] = [];
  allNotifs[key].unshift({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    title,
    message,
    read: false,
    createdAt: new Date().toISOString(),
  });
  if (allNotifs[key].length > 50) allNotifs[key] = allNotifs[key].slice(0, 50);
  saveNotifications(allNotifs);
}

function loadAdminAlerts() {
  try {
    if (fs.existsSync(ADMIN_ALERTS_FILE)) {
      return JSON.parse(fs.readFileSync(ADMIN_ALERTS_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('Error loading admin alerts:', e);
  }
  return [];
}

function saveAdminAlerts(data) {
  try {
    fs.writeFileSync(ADMIN_ALERTS_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.error('Error saving admin alerts:', e);
  }
}

function addAdminAlert(severity, category, title, message, metadata = {}) {
  const alerts = loadAdminAlerts();
  alerts.unshift({
    id: `alert-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    severity,
    category,
    title,
    message,
    metadata,
    resolved: false,
    createdAt: new Date().toISOString(),
  });
  if (alerts.length > 200) alerts.length = 200;
  saveAdminAlerts(alerts);

  if (_superAdminIdCache) {
    addNotification(_superAdminIdCache, 'alert', `[${severity.toUpperCase()}] ${title}`, message);
  }
  serverLog(`[ADMIN ALERT] [${severity}] ${category}: ${title} - ${message}`);
}

async function notifyAdmin(title, message, severity = 'info', category = 'system', metadata = {}) {
  addAdminAlert(severity, category, title, message, metadata);
}

const BUG_BOT_PATTERNS = [
  { pattern: /\b(raid|raider|raiding)\b/i, reason: 'Raid bot detected' },
  { pattern: /\b(nuk(?:e|er|ing))\b/i, reason: 'Nuker bot detected' },
  { pattern: /\b(spam(?:mer|ming|bot)?)\b/i, reason: 'Spam bot detected' },
  { pattern: /\b(mass[\s-]?dm|mass[\s-]?ban|mass[\s-]?kick)\b/i, reason: 'Mass action bot detected' },
  { pattern: /\b(token[\s-]?grab(?:ber|bing)?|token[\s-]?log(?:ger|ging)?)\b/i, reason: 'Token grabber detected' },
  { pattern: /\b(selfbot|self[\s-]?bot)\b/i, reason: 'Self bot detected' },
  { pattern: /\b(crash(?:er|ing)?[\s-]?bot)\b/i, reason: 'Crasher bot detected' },
  { pattern: /\b(ddos|dos[\s-]?bot|stress(?:er|test))\b/i, reason: 'DDoS/stress tool detected' },
  { pattern: /\b(phish(?:ing|er)?)\b/i, reason: 'Phishing tool detected' },
  { pattern: /\b(nitro[\s-]?gen(?:erator)?|nitro[\s-]?snip(?:er|ing)?)\b/i, reason: 'Nitro generator/sniper detected' },
  { pattern: /\b(account[\s-]?gen(?:erator)?|acc[\s-]?gen)\b/i, reason: 'Account generator detected' },
  { pattern: /\b(brute[\s-]?force|credential[\s-]?stuff(?:ing|er)?)\b/i, reason: 'Brute force tool detected' },
  { pattern: /\b(scraper|scraping[\s-]?bot)\b/i, reason: 'Scraping bot detected' },
  { pattern: /\b(webhook[\s-]?spam|webhook[\s-]?flood)\b/i, reason: 'Webhook abuse detected' },
  { pattern: /\b(server[\s-]?destroy(?:er)?|channel[\s-]?destroy(?:er)?)\b/i, reason: 'Server destroyer detected' },
  { pattern: /\b(ban[\s-]?bot|kick[\s-]?bot|prune[\s-]?bot)\b/i, reason: 'Ban/kick bot detected' },
  { pattern: /\b(malware|trojan|keylog(?:ger|ging)?)\b/i, reason: 'Malware detected' },
  { pattern: /\b(proxy[\s-]?scraper|ip[\s-]?grab(?:ber)?)\b/i, reason: 'Proxy scraper/IP grabber detected' },
];

function scanForBugBot(serverName, description = '') {
  const combined = `${serverName} ${description}`.toLowerCase();
  const matches = [];
  for (const { pattern, reason } of BUG_BOT_PATTERNS) {
    if (pattern.test(combined)) {
      matches.push(reason);
    }
  }
  return matches;
}

function loadWelcomeClaims() {
  try {
    if (fs.existsSync(WELCOME_CLAIMS_FILE)) {
      return JSON.parse(fs.readFileSync(WELCOME_CLAIMS_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('Error loading welcome claims:', e);
  }
  return {};
}

function saveWelcomeClaims(data) {
  try {
    fs.writeFileSync(WELCOME_CLAIMS_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.error('Error saving welcome claims:', e);
  }
}

function loadTasks() {
  try {
    if (fs.existsSync(TASKS_FILE)) {
      return JSON.parse(fs.readFileSync(TASKS_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('Error loading tasks:', e);
  }
  return {};
}

function saveTasks(data) {
  try {
    fs.writeFileSync(TASKS_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.error('Error saving tasks:', e);
  }
}

function loadFreeServers() {
  try {
    if (fs.existsSync(FREE_SERVERS_FILE)) {
      return JSON.parse(fs.readFileSync(FREE_SERVERS_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('Error loading free servers:', e);
  }
  return [];
}

function saveFreeServers(data) {
  try {
    fs.writeFileSync(FREE_SERVERS_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.error('Error saving free servers:', e);
  }
}

const SPENDING_FILE = path.join(__dirname, 'spending.json');

function loadSpending() {
  try {
    if (fs.existsSync(SPENDING_FILE)) {
      return JSON.parse(fs.readFileSync(SPENDING_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('Error loading spending data:', e);
  }
  return [];
}

function saveSpending(records) {
  try {
    fs.writeFileSync(SPENDING_FILE, JSON.stringify(records, null, 2), 'utf8');
  } catch (e) {
    console.error('Error saving spending data:', e);
  }
}

function recordSpending(email, amount, description, serverId) {
  const records = loadSpending();
  records.push({
    email: email.toLowerCase(),
    amount,
    description,
    serverId: serverId?.toString() || '',
    date: new Date().toISOString(),
  });
  saveSpending(records);
}

const REFERRALS_FILE = path.join(__dirname, 'referrals.json');

function loadReferrals() {
  try {
    if (fs.existsSync(REFERRALS_FILE)) {
      return JSON.parse(fs.readFileSync(REFERRALS_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('Error loading referrals:', e);
  }
  return { codes: {}, referrals: [] };
}

function saveReferrals(data) {
  try {
    fs.writeFileSync(REFERRALS_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.error('Error saving referrals:', e);
  }
}

function getReferralCode(userId, email) {
  const data = loadReferrals();
  const existing = Object.entries(data.codes).find(([code, info]) => info.userId === userId.toString());
  if (existing) return existing[0];
  const code = 'WOLF-' + Math.random().toString(36).substr(2, 6).toUpperCase();
  data.codes[code] = { userId: userId.toString(), email: email.toLowerCase(), createdAt: new Date().toISOString() };
  saveReferrals(data);
  return code;
}

function recordReferral(referrerCode, referredUserId, referredEmail, referredUsername) {
  const data = loadReferrals();
  const codeInfo = data.codes[referrerCode];
  if (!codeInfo) return false;
  if (codeInfo.userId === referredUserId.toString()) return false;
  const already = data.referrals.find(r => r.referredUserId === referredUserId.toString());
  if (already) return false;
  data.referrals.push({
    referrerCode,
    referrerUserId: codeInfo.userId,
    referrerEmail: codeInfo.email,
    referredUserId: referredUserId.toString(),
    referredEmail: referredEmail.toLowerCase(),
    referredUsername,
    registeredAt: new Date().toISOString(),
    completed: false,
    completedAt: null,
  });
  saveReferrals(data);
  return true;
}

function completeReferral(referredEmail) {
  const data = loadReferrals();
  const ref = data.referrals.find(r => r.referredEmail === referredEmail.toLowerCase() && !r.completed);
  if (!ref) return null;
  ref.completed = true;
  ref.completedAt = new Date().toISOString();
  saveReferrals(data);
  return ref;
}

function getReferrerStats(userId) {
  const data = loadReferrals();
  const myReferrals = data.referrals.filter(r => r.referrerUserId === userId.toString());
  const completedCount = myReferrals.filter(r => r.completed).length;
  return { total: myReferrals.length, completed: completedCount, referrals: myReferrals };
}

function getTotalSpending(email) {
  const records = loadSpending();
  return records
    .filter(r => r.email === email.toLowerCase())
    .reduce((sum, r) => sum + r.amount, 0);
}

function refundSpending(serverId) {
  const records = loadSpending();
  const updated = records.filter(r => r.serverId !== serverId.toString());
  if (updated.length !== records.length) {
    saveSpending(updated);
    return true;
  }
  return false;
}

const DEPOSITS_FILE = path.join(__dirname, 'deposits.json');

function loadDeposits() {
  try {
    if (fs.existsSync(DEPOSITS_FILE)) {
      return JSON.parse(fs.readFileSync(DEPOSITS_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('Error loading deposits:', e);
  }
  return [];
}

function saveDeposits(data) {
  try {
    fs.writeFileSync(DEPOSITS_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.error('Error saving deposits:', e);
  }
}

function recordDeposit(email, amountKES, reference, currency = 'KES', method = 'mpesa') {
  if (!email || amountKES <= 0) return;
  const records = loadDeposits();
  const alreadyRecorded = records.some(r => r.reference === reference);
  if (alreadyRecorded) return;
  records.push({
    email: email.toLowerCase(),
    amountKES,
    reference,
    currency,
    method,
    date: new Date().toISOString(),
  });
  saveDeposits(records);
  serverLog(`Recorded local deposit: ${amountKES} KES for ${email} (${method}, ref: ${reference})`);
}

function getTotalDepositsKES(email) {
  const records = loadDeposits();
  return records
    .filter(r => r.email === email.toLowerCase())
    .reduce((sum, r) => sum + (r.amountKES || 0), 0);
}

function hasLocalDeposits(email) {
  const records = loadDeposits();
  return records.some(r => r.email === email.toLowerCase());
}

const USER_CREDENTIALS_FILE = path.join(__dirname, 'user_credentials.json');

function loadUserCredentials() {
  try {
    if (fs.existsSync(USER_CREDENTIALS_FILE)) {
      return JSON.parse(fs.readFileSync(USER_CREDENTIALS_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('Error loading user credentials:', e);
  }
  return {};
}

function saveUserCredentials(data) {
  try {
    fs.writeFileSync(USER_CREDENTIALS_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.error('Error saving user credentials:', e);
  }
}

function hashPassword(password, salt) {
  if (!salt) salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { hash, salt };
}

function verifyPassword(password, storedHash, storedSalt) {
  const { hash } = hashPassword(password, storedSalt);
  return hash === storedHash;
}

function storeUserPassword(email, password) {
  const creds = loadUserCredentials();
  const { hash, salt } = hashPassword(password);
  creds[email.toLowerCase()] = { hash, salt, updatedAt: new Date().toISOString() };
  saveUserCredentials(creds);
}

function checkUserPassword(email, password) {
  const creds = loadUserCredentials();
  const entry = creds[email.toLowerCase()];
  if (!entry) return null;
  return verifyPassword(password, entry.hash, entry.salt);
}

const USERS_FILE = path.join(__dirname, 'users.json');

function loadUsersDB() {
  try {
    if (fs.existsSync(USERS_FILE)) {
      return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('Error loading users db:', e);
  }
  return { users: [], nextId: 1 };
}

function saveUsersDB(db) {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(db, null, 2), 'utf8');
  } catch (e) {
    console.error('Error saving users db:', e);
  }
}

function findUserByEmail(email) {
  const db = loadUsersDB();
  return db.users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
}

function findUserByUsername(username) {
  const db = loadUsersDB();
  return db.users.find(u => u.username.toLowerCase() === username.toLowerCase()) || null;
}

function createLocalUser({ email, username, firstName, lastName, isAdmin = false }) {
  const db = loadUsersDB();
  const existing = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (existing) return { error: 'email_taken' };
  const existingUsername = db.users.find(u => u.username.toLowerCase() === username.toLowerCase());
  if (existingUsername) return { error: 'username_taken' };
  const newUser = {
    id: db.nextId++,
    email: email.toLowerCase(),
    username,
    firstName,
    lastName,
    isAdmin,
    createdAt: new Date().toISOString(),
  };
  db.users.push(newUser);
  saveUsersDB(db);
  return { user: newUser };
}

const PAYSTACK_API_URL = 'https://api.paystack.co';
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

const PTERODACTYL_API_URL = process.env.PTERODACTYL_API_URL || 'https://panel.xwolf.space';
const PTERODACTYL_API_KEY = process.env.PTERODACTYL_API_KEY;
// Load superadmin config from file (created by setup_superadmin.cjs) with env var fallback
const SUPERADMIN_CONFIG_FILE = path.join(__dirname, 'superadmin_config.json');
function loadSuperadminConfig() {
  try {
    if (fs.existsSync(SUPERADMIN_CONFIG_FILE)) {
      const c = JSON.parse(fs.readFileSync(SUPERADMIN_CONFIG_FILE, 'utf8'));
      return { username: c.username || '', key: c.key || '' };
    }
  } catch (e) { console.error('Failed to load superadmin_config.json:', e.message); }
  return { username: process.env.SUPER_ADMIN_USERNAME || '', key: process.env.SUPERADMIN_KEY || '' };
}
const _saConfig = loadSuperadminConfig();
const SUPER_ADMIN_USERNAME = _saConfig.username;
if (!SUPER_ADMIN_USERNAME) console.warn('[SuperAdmin] No superadmin username configured — run server/setup_superadmin.cjs to set one up.');

if (!PAYSTACK_SECRET_KEY) {
  console.error('PAYSTACK_SECRET_KEY is not set');
}

if (!PTERODACTYL_API_KEY) {
  console.log('PTERODACTYL_API_KEY is not set — server management features disabled');
}

const PAYSTACK_FETCH_TIMEOUT_MS = 15000;

async function paystackFetch(path, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PAYSTACK_FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(`${PAYSTACK_API_URL}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    return response;
  } finally {
    clearTimeout(timer);
  }
}

const _paystackCustomerCache = new Map();
const PAYSTACK_CUSTOMER_CACHE_TTL = 10 * 60 * 1000;

async function resolvePaystackCustomer(email) {
  if (!email) return null;
  const lowerEmail = email.toLowerCase();
  const cached = _paystackCustomerCache.get(lowerEmail);
  if (cached && Date.now() - cached.ts < PAYSTACK_CUSTOMER_CACHE_TTL) {
    return cached.code;
  }
  try {
    const res = await paystackFetch(`/customer/${encodeURIComponent(lowerEmail)}`);
    const data = await res.json();
    if (res.ok && data.status && data.data) {
      const code = data.data.customer_code || null;
      _paystackCustomerCache.set(lowerEmail, { code, ts: Date.now() });
      return code;
    }
  } catch (e) {}
  _paystackCustomerCache.set(lowerEmail, { code: null, ts: Date.now() });
  return null;
}

async function fetchUserTransactions(email, perPage = 100, page = 1, status = null) {
  let customerCode = null;
  if (email) {
    customerCode = await resolvePaystackCustomer(email);
  }

  let basePath = `/transaction?perPage=${perPage}&page=${page}`;
  if (status) basePath += `&status=${status}`;

  if (customerCode) {
    const res = await paystackFetch(`${basePath}&customer=${encodeURIComponent(customerCode)}`);
    const data = await res.json();
    if (res.ok && data.status && (data.data || []).length > 0) {
      return { transactions: data.data, meta: data.meta || {} };
    }
  }

  const res = await paystackFetch(basePath);
  const data = await res.json();
  if (!res.ok || !data.status) return { transactions: [], meta: {} };

  if (email) {
    const filterEmail = email.toLowerCase();
    const filtered = (data.data || []).filter(txn => {
      const txnEmail = (txn.customer?.email || '').toLowerCase();
      const metaEmail = (txn.metadata?.user_email || '').toLowerCase();
      const metaPhone = txn.metadata?.phone_number || '';
      const authPhone = txn.authorization?.mobile_money_number || '';
      const phoneFromEmail = filterEmail.replace(/@.*$/, '');
      return txnEmail === filterEmail
        || metaEmail === filterEmail
        || (metaPhone && filterEmail.includes(metaPhone))
        || (authPhone && filterEmail.includes(authPhone))
        || (phoneFromEmail.match(/^\d{10,}$/) && (metaPhone.includes(phoneFromEmail) || authPhone.includes(phoneFromEmail)));
    });
    return { transactions: filtered, meta: data.meta || {} };
  }

  return { transactions: data.data || [], meta: data.meta || {} };
}

app.post('/api/mpesa/charge', paymentLimiter, authenticateToken, [
  body('phone').isString().trim().notEmpty().withMessage('Phone number is required')
    .matches(/^[0-9+\-\s()]+$/).withMessage('Invalid phone number format'),
  body('amount').isNumeric().withMessage('Amount must be a number')
    .custom(v => Number(v) >= 50).withMessage('Minimum deposit is 50 KSH'),
  body('userEmail').optional().isEmail().normalizeEmail(),
], handleValidationErrors, async (req, res) => {
  try {
    const { phone, amount, metadata, userEmail } = req.body;
    securityLog('INFO', 'MPESA_CHARGE_ATTEMPT', { ip: req._clientIp, phone: phone?.slice(-4), amount, email: userEmail });

    if (!phone || !amount) {
      return res.status(400).json({ success: false, message: 'Phone and amount are required' });
    }

    if (amount < 50) {
      return res.status(400).json({ success: false, message: 'Minimum deposit is 50 KSH' });
    }

    let formattedPhone = phone.toString().replace(/\D/g, '');
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '254' + formattedPhone.substring(1);
    } else if (formattedPhone.startsWith('+254')) {
      formattedPhone = formattedPhone.substring(1);
    } else if (!formattedPhone.startsWith('254')) {
      formattedPhone = '254' + formattedPhone;
    }

    if (formattedPhone.length !== 12 || !formattedPhone.startsWith('254')) {
      return res.status(400).json({ success: false, message: 'Invalid Kenyan phone number. Use format: 0713046497' });
    }

    const amountInCents = Math.round(amount * 100);
    const paystackPhone = '+' + formattedPhone;
    const chargeEmail = userEmail || `${formattedPhone}@mpesa.ke`;

    serverLog('Sending to Paystack:', { phone: paystackPhone, amount: amountInCents, email: chargeEmail });

    const response = await paystackFetch('/charge', {
      method: 'POST',
      body: JSON.stringify({
        email: chargeEmail,
        amount: amountInCents,
        currency: 'KES',
        mobile_money: {
          phone: paystackPhone,
          provider: 'mpesa',
        },
        metadata: {
          ...metadata,
          payment_type: 'mpesa_stk',
          phone_number: formattedPhone,
          user_email: chargeEmail,
          country: 'KE',
        },
      }),
    });

    const data = await response.json();
    serverLog('Paystack response:', JSON.stringify(data));

    if (!response.ok || !data.status) {
      const errorMessage = data.message || 'Failed to initiate M-Pesa payment';
      return res.status(response.status || 400).json({ success: false, message: errorMessage });
    }

    return res.json({
      success: true,
      data: data.data,
      message: 'M-Pesa STK Push initiated. Check your phone to enter PIN.',
      reference: data.data.reference,
    });
  } catch (error) {
    console.error('M-Pesa charge error:', error);
    return res.status(500).json({ success: false, message: 'Server error initiating payment' });
  }
});

app.get('/api/mpesa/verify/:reference', authenticateToken, async (req, res) => {
  try {
    const { reference } = req.params;

    if (!reference) {
      return res.status(400).json({ success: false, message: 'Reference is required' });
    }

    const response = await paystackFetch(`/transaction/verify/${encodeURIComponent(reference)}`);
    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        message: data.message || 'Verification failed',
      });
    }

    const isSuccess = data.status === true && data.data?.status === 'success';
    if (isSuccess && req.user?.userId) {
      const amount = data.data?.amount ? (data.data.amount / 100) : 0;
      const email = data.data?.customer?.email || req.user.email;
      const reference = data.data?.reference || req.params.reference;
      recordDeposit(email, amount, reference, 'KES', 'mpesa');
      addNotification(req.user.userId, 'payment', 'M-Pesa Payment Received', `KES ${amount.toLocaleString()} has been added to your wallet via M-Pesa.`);
    }

    return res.json({
      success: data.status === true,
      data: data.data,
      message: data.message,
    });
  } catch (error) {
    console.error('Verification error:', error);
    return res.status(500).json({ success: false, message: 'Server error verifying payment' });
  }
});

app.post('/api/card/initialize', paymentLimiter, authenticateToken, [
  body('amount').isNumeric().withMessage('Amount must be a number')
    .custom(v => Number(v) >= 50).withMessage('Minimum deposit is 50 KSH'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
], handleValidationErrors, async (req, res) => {
  try {
    const { email, amount, metadata, callbackUrl } = req.body;

    if (!email || !amount) {
      return res.status(400).json({ success: false, message: 'Email and amount are required' });
    }

    if (amount < 50) {
      return res.status(400).json({ success: false, message: 'Minimum deposit is 50 KSH' });
    }

    const amountInCents = Math.round(amount * 100);

    serverLog('Initializing card payment:', { email, amount: amountInCents, callbackUrl });

    const response = await paystackFetch('/transaction/initialize', {
      method: 'POST',
      body: JSON.stringify({
        email,
        amount: amountInCents,
        currency: 'KES',
        callback_url: callbackUrl || undefined,
        channels: ['card'],
        metadata: {
          ...metadata,
          payment_type: 'card',
          country: 'KE',
        },
      }),
    });

    const data = await response.json();
    serverLog('Paystack card init response:', JSON.stringify(data));

    if (!response.ok || !data.status) {
      const errorMessage = data.message || 'Failed to initialize card payment';
      return res.status(response.status || 400).json({ success: false, message: errorMessage });
    }

    return res.json({
      success: true,
      data: data.data,
      message: 'Card payment initialized. Redirecting to checkout...',
      authorizationUrl: data.data.authorization_url,
      reference: data.data.reference,
      accessCode: data.data.access_code,
    });
  } catch (error) {
    console.error('Card initialize error:', error);
    return res.status(500).json({ success: false, message: 'Server error initializing card payment' });
  }
});

app.get('/api/card/verify/:reference', authenticateToken, async (req, res) => {
  try {
    const { reference } = req.params;

    if (!reference) {
      return res.status(400).json({ success: false, message: 'Reference is required' });
    }

    const response = await paystackFetch(`/transaction/verify/${encodeURIComponent(reference)}`);
    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        message: data.message || 'Verification failed',
      });
    }

    const cardSuccess = data.status === true && data.data?.status === 'success';
    if (cardSuccess && req.user?.userId) {
      const amount = data.data?.amount ? (data.data.amount / 100) : 0;
      const email = data.data?.customer?.email || req.user.email;
      const reference = data.data?.reference || req.params.reference;
      const currency = data.data?.currency || 'KES';
      const amountKES = currency === 'KES' ? amount : convertToKES(amount, currency);
      recordDeposit(email, amountKES, reference, currency, 'card');
      addNotification(req.user.userId, 'payment', 'Card Payment Received', `KES ${amountKES.toLocaleString()} has been added to your wallet via card.`);
    }

    return res.json({
      success: cardSuccess,
      data: data.data,
      message: data.message,
    });
  } catch (error) {
    console.error('Card verification error:', error);
    return res.status(500).json({ success: false, message: 'Server error verifying card payment' });
  }
});

app.post('/api/mpesa/submit-otp', paymentLimiter, authenticateToken, async (req, res) => {
  try {
    const { otp, reference } = req.body;

    if (!otp || !reference) {
      return res.status(400).json({ success: false, message: 'OTP and reference are required' });
    }

    const response = await paystackFetch('/charge/submit_otp', {
      method: 'POST',
      body: JSON.stringify({ otp, reference }),
    });

    const data = await response.json();

    return res.json({
      success: data.status === true,
      data: data.data,
      message: data.message,
    });
  } catch (error) {
    console.error('Submit OTP error:', error);
    return res.status(500).json({ success: false, message: 'Server error submitting OTP' });
  }
});

app.post('/api/mobile-money/charge', paymentLimiter, authenticateToken, [
  body('phone').isString().trim().notEmpty().withMessage('Phone number is required')
    .matches(/^[0-9+\-\s()]+$/).withMessage('Invalid phone number format'),
  body('amount').isNumeric().withMessage('Amount must be a number')
    .custom(v => Number(v) >= 50).withMessage('Minimum deposit is 50 KSH'),
  body('provider').isString().trim().notEmpty().withMessage('Provider is required'),
  body('userEmail').optional().isEmail().normalizeEmail(),
], handleValidationErrors, async (req, res) => {
  try {
    const { phone, amount, countryCode, provider, metadata, userEmail } = req.body;

    if (!phone || !amount || !countryCode || !provider) {
      return res.status(400).json({ success: false, message: 'Phone, amount, country, and provider are required' });
    }

    if (amount < 50) {
      return res.status(400).json({ success: false, message: 'Minimum deposit is 50 KSH' });
    }

    const PHONE_CONFIGS = {
      GH: { prefix: '233', length: 12, currency: 'GHS' },
      CI: { prefix: '225', length: 12, currency: 'XOF' },
    };

    const phoneConfig = PHONE_CONFIGS[countryCode];
    if (!phoneConfig) {
      return res.status(400).json({ success: false, message: `Mobile money is not supported for country: ${countryCode}` });
    }

    let formattedPhone = phone.toString().replace(/\D/g, '');
    if (formattedPhone.startsWith('0')) {
      formattedPhone = phoneConfig.prefix + formattedPhone.substring(1);
    } else if (formattedPhone.startsWith('+' + phoneConfig.prefix)) {
      formattedPhone = formattedPhone.substring(1);
    } else if (!formattedPhone.startsWith(phoneConfig.prefix)) {
      formattedPhone = phoneConfig.prefix + formattedPhone;
    }

    const amountInCents = Math.round(amount * 100);
    const paystackPhone = '+' + formattedPhone;
    const chargeEmail = userEmail || `${formattedPhone}@mobilemoney.${countryCode.toLowerCase()}`;

    const chargeCurrency = phoneConfig.currency;
    serverLog('Sending Mobile Money to Paystack:', { phone: paystackPhone, amount: amountInCents, provider, countryCode, currency: chargeCurrency, email: chargeEmail });

    const response = await paystackFetch('/charge', {
      method: 'POST',
      body: JSON.stringify({
        email: chargeEmail,
        amount: amountInCents,
        currency: chargeCurrency,
        mobile_money: {
          phone: paystackPhone,
          provider: provider,
        },
        metadata: {
          ...metadata,
          payment_type: 'mobile_money',
          phone_number: formattedPhone,
          user_email: chargeEmail,
          country: countryCode,
          provider: provider,
        },
      }),
    });

    const data = await response.json();
    serverLog('Paystack mobile money response:', JSON.stringify(data));

    if (!response.ok || !data.status) {
      const errorMessage = data.message || 'Failed to initiate mobile money payment';
      return res.status(response.status || 400).json({ success: false, message: errorMessage });
    }

    return res.json({
      success: true,
      data: data.data,
      message: data.message || 'Mobile money payment initiated. Check your phone to authorize.',
      reference: data.data.reference,
    });
  } catch (error) {
    console.error('Mobile money charge error:', error);
    return res.status(500).json({ success: false, message: 'Server error initiating mobile money payment' });
  }
});

app.get('/api/mobile-money/verify/:reference', authenticateToken, async (req, res) => {
  try {
    const { reference } = req.params;

    if (!reference) {
      return res.status(400).json({ success: false, message: 'Reference is required' });
    }

    const response = await paystackFetch(`/transaction/verify/${encodeURIComponent(reference)}`);
    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        message: data.message || 'Verification failed',
      });
    }

    const isSuccess = data.status === true && data.data?.status === 'success';
    if (isSuccess && req.user?.userId) {
      const amount = data.data?.amount ? (data.data.amount / 100) : 0;
      const currency = data.data?.currency || 'KES';
      const amountKES = currency === 'KES' ? amount : convertToKES(amount, currency);
      const email = data.data?.customer?.email || req.user.email;
      const reference = data.data?.reference || req.params.reference;
      const provider = data.data?.metadata?.provider || 'Mobile Money';
      recordDeposit(email, amountKES, reference, currency, 'mobile_money');
      addNotification(req.user.userId, 'payment', 'Mobile Money Payment Received', `KES ${amountKES.toLocaleString()} has been added to your wallet via ${provider}.`);
    }

    return res.json({
      success: data.status === true,
      data: data.data,
      message: data.message,
    });
  } catch (error) {
    console.error('Mobile money verification error:', error);
    return res.status(500).json({ success: false, message: 'Server error verifying payment' });
  }
});

app.post('/api/bank-transfer/charge', paymentLimiter, authenticateToken, [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('amount').isNumeric().withMessage('Amount must be a number')
    .custom(v => Number(v) >= 100).withMessage('Minimum deposit is 100 NGN'),
], handleValidationErrors, async (req, res) => {
  try {
    const { email, amount, metadata } = req.body;

    if (!email || !amount) {
      return res.status(400).json({ success: false, message: 'Email and amount are required' });
    }

    if (amount < 100) {
      return res.status(400).json({ success: false, message: 'Minimum deposit is 100 NGN' });
    }

    const amountInCents = Math.round(amount * 100);

    serverLog('Sending Bank Transfer to Paystack:', { email, amount: amountInCents });

    const response = await paystackFetch('/charge', {
      method: 'POST',
      body: JSON.stringify({
        email,
        amount: amountInCents,
        currency: 'NGN',
        bank_transfer: {},
        metadata: {
          ...metadata,
          payment_type: 'bank_transfer',
          user_email: email,
          country: 'NG',
        },
      }),
    });

    const data = await response.json();
    serverLog('Paystack bank transfer response:', JSON.stringify(data));

    if (!response.ok || !data.status) {
      const errorMessage = data.message || 'Failed to initiate bank transfer';
      return res.status(response.status || 400).json({ success: false, message: errorMessage });
    }

    return res.json({
      success: true,
      data: data.data,
      message: data.message || 'Bank transfer initiated. Please transfer to the provided account.',
      reference: data.data.reference,
    });
  } catch (error) {
    console.error('Bank transfer charge error:', error);
    return res.status(500).json({ success: false, message: 'Server error initiating bank transfer' });
  }
});

app.get('/api/bank-transfer/verify/:reference', authenticateToken, async (req, res) => {
  try {
    const { reference } = req.params;

    if (!reference) {
      return res.status(400).json({ success: false, message: 'Reference is required' });
    }

    const response = await paystackFetch(`/transaction/verify/${encodeURIComponent(reference)}`);
    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        message: data.message || 'Verification failed',
      });
    }

    const isSuccess = data.status === true && data.data?.status === 'success';
    if (isSuccess && req.user?.userId) {
      const amount = data.data?.amount ? (data.data.amount / 100) : 0;
      const currency = data.data?.currency || 'NGN';
      const amountKES = convertToKES(amount, currency);
      const email = data.data?.customer?.email || req.user.email;
      const reference = data.data?.reference || req.params.reference;
      recordDeposit(email, amountKES, reference, currency, 'bank_transfer');
      addNotification(req.user.userId, 'payment', 'Bank Transfer Payment Received', `KES ${amountKES.toLocaleString()} has been added to your wallet via Bank Transfer.`);
    }

    return res.json({
      success: data.status === true,
      data: data.data,
      message: data.message,
    });
  } catch (error) {
    console.error('Bank transfer verification error:', error);
    return res.status(500).json({ success: false, message: 'Server error verifying payment' });
  }
});

app.post('/api/ussd/charge', paymentLimiter, authenticateToken, [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('amount').isNumeric().withMessage('Amount must be a number')
    .custom(v => Number(v) >= 100).withMessage('Minimum deposit is 100 NGN'),
  body('bankCode').isString().trim().notEmpty().withMessage('Bank code is required'),
], handleValidationErrors, async (req, res) => {
  try {
    const { email, amount, bankCode, metadata } = req.body;

    if (!email || !amount || !bankCode) {
      return res.status(400).json({ success: false, message: 'Email, amount, and bank code are required' });
    }

    if (amount < 100) {
      return res.status(400).json({ success: false, message: 'Minimum deposit is 100 NGN' });
    }

    const validBankCodes = ['737', '919', '822'];
    if (!validBankCodes.includes(bankCode)) {
      return res.status(400).json({ success: false, message: 'Invalid bank code. Supported: GTBank (737), UBA (919), Sterling (822)' });
    }

    const amountInCents = Math.round(amount * 100);

    serverLog('Sending USSD charge to Paystack:', { email, amount: amountInCents, bankCode });

    const response = await paystackFetch('/charge', {
      method: 'POST',
      body: JSON.stringify({
        email,
        amount: amountInCents,
        currency: 'NGN',
        ussd: {
          type: bankCode,
        },
        metadata: {
          ...metadata,
          payment_type: 'ussd',
          user_email: email,
          country: 'NG',
          bank_code: bankCode,
        },
      }),
    });

    const data = await response.json();
    serverLog('Paystack USSD response:', JSON.stringify(data));

    if (!response.ok || !data.status) {
      const errorMessage = data.message || 'Failed to initiate USSD payment';
      return res.status(response.status || 400).json({ success: false, message: errorMessage });
    }

    return res.json({
      success: true,
      data: data.data,
      message: data.message || 'USSD payment initiated. Dial the code to complete payment.',
      reference: data.data.reference,
    });
  } catch (error) {
    console.error('USSD charge error:', error);
    return res.status(500).json({ success: false, message: 'Server error initiating USSD payment' });
  }
});

app.get('/api/ussd/verify/:reference', authenticateToken, async (req, res) => {
  try {
    const { reference } = req.params;

    if (!reference) {
      return res.status(400).json({ success: false, message: 'Reference is required' });
    }

    const response = await paystackFetch(`/transaction/verify/${encodeURIComponent(reference)}`);
    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        message: data.message || 'Verification failed',
      });
    }

    const isSuccess = data.status === true && data.data?.status === 'success';
    if (isSuccess && req.user?.userId) {
      const amount = data.data?.amount ? (data.data.amount / 100) : 0;
      const currency = data.data?.currency || 'NGN';
      const amountKES = convertToKES(amount, currency);
      const email = data.data?.customer?.email || req.user.email;
      const reference = data.data?.reference || req.params.reference;
      const bankCode = data.data?.metadata?.bank_code || 'USSD';
      const bankName = bankCode === '737' ? 'GTBank' : bankCode === '919' ? 'UBA' : bankCode === '822' ? 'Sterling Bank' : 'USSD';
      recordDeposit(email, amountKES, reference, currency, 'ussd');
      addNotification(req.user.userId, 'payment', 'USSD Payment Received', `KES ${amountKES.toLocaleString()} has been added to your wallet via ${bankName} USSD.`);
    }

    return res.json({
      success: data.status === true,
      data: data.data,
      message: data.message,
    });
  } catch (error) {
    console.error('USSD verification error:', error);
    return res.status(500).json({ success: false, message: 'Server error verifying payment' });
  }
});

app.get('/api/transactions', authenticateToken, async (req, res) => {
  try {
    const email = req.user.email;
    const { perPage = 50, page = 1, status } = req.query;

    const { transactions: allTransactions, meta } = await fetchUserTransactions(
      email || null,
      parseInt(perPage),
      parseInt(page),
      status || null
    );

    const deposits = allTransactions.map((txn) => ({
      id: txn.id,
      reference: txn.reference,
      amount: txn.amount / 100,
      currency: txn.currency,
      status: txn.status,
      channel: txn.channel,
      paidAt: txn.paid_at || txn.transaction_date,
      createdAt: txn.created_at,
      phone: txn.metadata?.phone_number || txn.authorization?.mobile_money_number || '',
      type: txn.metadata?.type || 'wallet_topup',
      description: txn.channel === 'mobile_money'
        ? (txn.metadata?.provider === 'mpesa' ? 'M-Pesa deposit' : 
           txn.metadata?.provider === 'mtn' ? 'MTN Mobile Money deposit' :
           txn.metadata?.provider === 'vod' ? 'Vodafone Cash deposit' :
           txn.metadata?.provider === 'tgo' ? 'AirtelTigo Money deposit' :
           txn.metadata?.provider === 'wave' ? 'Wave deposit' :
           'Mobile Money deposit')
        : txn.channel === 'card'
        ? 'Card payment'
        : txn.channel || 'Payment',
      method: txn.channel === 'mobile_money' 
        ? (txn.metadata?.country === 'KE' ? 'M-Pesa' : 
           txn.metadata?.provider === 'mtn' ? 'MTN MoMo' :
           txn.metadata?.provider === 'vod' ? 'Vodafone Cash' :
           txn.metadata?.provider === 'tgo' ? 'AirtelTigo' :
           txn.metadata?.provider === 'wave' ? 'Wave' :
           'Mobile Money')
        : txn.channel === 'card' ? 'Card' : txn.channel || 'Unknown',
      cardType: txn.authorization?.card_type || '',
      last4: txn.authorization?.last4 || '',
      email: txn.customer?.email || '',
      direction: 'credit',
    }));

    let spendingRecords = [];
    if (email) {
      const allSpending = loadSpending().filter(r => r.email === email.toLowerCase());
      spendingRecords = allSpending.map((r, i) => ({
        id: `spend-${i}-${Date.now()}`,
        reference: `SERVER-${r.serverId}`,
        amount: r.amount,
        currency: 'KES',
        status: 'success',
        channel: 'server_purchase',
        paidAt: r.date,
        createdAt: r.date,
        phone: '',
        type: 'server_purchase',
        description: r.description,
        method: 'Wallet',
        cardType: '',
        last4: '',
        email: r.email,
        direction: 'debit',
      }));
    }

    const transactions = [...deposits, ...spendingRecords].sort((a, b) =>
      new Date(b.paidAt || b.createdAt) - new Date(a.paidAt || a.createdAt)
    );

    return res.json({
      success: true,
      transactions,
      meta: {
        total: meta.total || transactions.length,
        page: meta.page || parseInt(page),
        pageCount: meta.pageCount || 1,
        perPage: meta.perPage || parseInt(perPage),
      },
    });
  } catch (error) {
    console.error('Transactions fetch error:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching transactions' });
  }
});

app.get('/api/transactions/totals', authenticateToken, async (req, res) => {
  try {
    const email = req.user.email;
    const spending = getTotalSpending(email);

    const localDepositsTotal = getTotalDepositsKES(email);

    if (hasLocalDeposits(email)) {
      const balance = Math.max(0, localDepositsTotal - spending);
      return res.json({
        success: true,
        totalDeposits: localDepositsTotal,
        totalSpending: spending,
        totalCount: loadDeposits().filter(r => r.email === email.toLowerCase()).length,
        balance,
        source: 'local',
      });
    }

    const { transactions } = await fetchUserTransactions(email, 100, 1, 'success');
    const paystackTotal = transactions.reduce((sum, txn) => {
      const currency = txn.currency || 'KES';
      const amount = txn.amount / 100;
      return sum + (currency === 'KES' ? amount : convertToKES(amount, currency));
    }, 0);

    const balance = Math.max(0, paystackTotal - spending);

    return res.json({
      success: true,
      totalDeposits: paystackTotal,
      totalSpending: spending,
      totalCount: transactions.length,
      balance,
      source: 'paystack',
    });
  } catch (error) {
    console.error('Totals fetch error:', error);
    return res.json({
      success: true,
      totalDeposits: 0,
      totalSpending: 0,
      totalCount: 0,
      balance: 0,
    });
  }
});

app.get('/api/admin/payments', adminLimiter, authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { perPage = 50, page = 1 } = req.query;

    const { transactions: allTxns } = await fetchUserTransactions(null, parseInt(perPage), parseInt(page), 'success');

    const payments = allTxns.map(txn => {
      const rawAmount = txn.amount / 100;
      const currency = txn.currency || 'KES';
      const amountKES = currency === 'KES' ? rawAmount : convertToKES(rawAmount, currency);
      return {
        id: txn.id,
        reference: txn.reference,
        amount: rawAmount,
        amountKES,
        currency,
        status: txn.status,
        channel: txn.channel,
        paidAt: txn.paid_at || txn.transaction_date,
        createdAt: txn.created_at,
        email: txn.customer?.email || '',
        phone: txn.metadata?.phone_number || txn.authorization?.mobile_money_number || '',
        method: txn.channel === 'mobile_money'
          ? (txn.metadata?.country === 'KE' ? 'M-Pesa' : txn.metadata?.provider === 'mtn' ? 'MTN MoMo' : txn.metadata?.provider === 'vod' ? 'Vodafone Cash' : txn.metadata?.provider === 'tgo' ? 'AirtelTigo' : txn.metadata?.provider === 'wave' ? 'Wave' : 'Mobile Money')
          : txn.channel === 'card' ? 'Card'
          : txn.channel === 'bank_transfer' ? 'Bank Transfer'
          : txn.channel === 'ussd' ? 'USSD'
          : txn.channel || 'Unknown',
        customerName: txn.customer?.first_name ? `${txn.customer.first_name} ${txn.customer.last_name || ''}`.trim() : '',
      };
    });

    const localDepositsTotal = loadDeposits().reduce((sum, d) => sum + (d.amountKES || 0), 0);
    const paystackTotal = payments.reduce((sum, p) => sum + p.amountKES, 0);
    const totalAmount = Math.max(localDepositsTotal, paystackTotal);

    return res.json({
      success: true,
      payments,
      totalAmount,
      totalCount: payments.length,
    });
  } catch (error) {
    console.error('Admin payments fetch error:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching payments' });
  }
});

app.post('/api/auth/login', authLimiter, [
  body('email').isString().trim().notEmpty().withMessage('Email or username is required')
    .isLength({ max: 255 }).withMessage('Input too long'),
  body('password').isString().notEmpty().withMessage('Password is required')
    .isLength({ min: 1, max: 128 }).withMessage('Password too long'),
], handleValidationErrors, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email/username and password are required' });
    }

    const isEmail = email.includes('@');
    const localUser = isEmail ? findUserByEmail(email) : findUserByUsername(email);

    if (!localUser) {
      return res.status(401).json({ success: false, message: 'No account found with those credentials. Please sign up first.' });
    }

    const loginEmail = localUser.email;
    const passwordCheck = checkUserPassword(loginEmail, password);

    if (passwordCheck === null) {
      return res.status(401).json({ success: false, message: 'No password set for this account. Please register again or contact support.' });
    } else if (passwordCheck === false) {
      securityLog('WARN', 'LOGIN_FAILED', { ip: req._clientIp, email: loginEmail, reason: 'wrong_password' });
      return res.status(401).json({ success: false, message: 'Invalid password. Please try again.' });
    }

    securityLog('INFO', 'LOGIN_SUCCESS', { ip: req._clientIp, email: loginEmail, userId: localUser.id });

    const userPayload = {
      id: localUser.id,
      email: localUser.email,
      username: localUser.username,
      firstName: localUser.firstName,
      lastName: localUser.lastName,
      panelId: localUser.id,
      isAdmin: localUser.isAdmin || false,
      isSuperAdmin: isSuperAdminByUsername(localUser.username),
    };

    const token = generateToken(userPayload);

    return res.json({
      success: true,
      message: 'Login successful',
      user: userPayload,
      token,
    });
  } catch (error) {
    console.error('Login error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error during login' });
  }
});

app.post('/api/auth/register', registerLimiter, checkRegistrationAbuse, [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required')
    .isLength({ max: 255 }).withMessage('Email too long'),
  body('username').isString().trim().notEmpty().withMessage('Username is required')
    .isLength({ min: 3, max: 32 }).withMessage('Username must be 3-32 characters')
    .matches(/^[a-zA-Z0-9_.-]+$/).withMessage('Username can only contain letters, numbers, underscores, dots, and hyphens'),
  body('password').isString().notEmpty().withMessage('Password is required')
    .isLength({ min: 6, max: 128 }).withMessage('Password must be 6-128 characters'),
  body('referralCode').optional().isString().trim().isLength({ max: 32 }),
], handleValidationErrors, async (req, res) => {
  try {
    const { email, username, password, referralCode } = req.body;

    if (!email || !username || !password) {
      return res.status(400).json({ success: false, message: 'Email, username, and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    const nameParts = username.split(' ');
    const firstName = nameParts[0] || username;
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : username;

    const result = createLocalUser({ email, username, firstName, lastName });

    if (result.error === 'email_taken') {
      return res.status(409).json({ success: false, message: 'An account with this email already exists' });
    }
    if (result.error === 'username_taken') {
      return res.status(409).json({ success: false, message: 'This username is already taken' });
    }
    if (!result.user) {
      return res.status(500).json({ success: false, message: 'Failed to create account' });
    }

    const newUser = result.user;

    storeUserPassword(newUser.email, password);
    serverLog('Stored password hash for new user:', newUser.email);

    if (referralCode) {
      const recorded = recordReferral(referralCode, newUser.id, newUser.email, newUser.username);
      serverLog(`Referral tracking: code=${referralCode}, newUser=${newUser.id}, recorded=${recorded}`);
    }

    const userId = newUser.id.toString();

    const allTasks = loadTasks();
    if (!allTasks[userId]) allTasks[userId] = {};
    for (const task of TASK_DEFINITIONS) {
      if (!allTasks[userId][task.id]) {
        allTasks[userId][task.id] = new Date().toISOString();
      }
    }
    saveTasks(allTasks);

    addNotification(newUser.id, 'welcome', 'Welcome!', 'Your account has been created successfully!');

    const userPayload = {
      id: newUser.id,
      email: newUser.email,
      username: newUser.username,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      panelId: newUser.id,
      isAdmin: newUser.isAdmin || false,
      isSuperAdmin: isSuperAdminByUsername(newUser.username),
    };

    const token = generateToken(userPayload);

    return res.json({
      success: true,
      message: 'Account created successfully',
      user: userPayload,
      token,
      isNewUser: true,
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ success: false, message: 'Server error creating account' });
  }
});

app.get('/api/referrals', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const email = req.user.email;

    const code = getReferralCode(userId, email);
    const stats = getReferrerStats(userId);

    return res.json({
      success: true,
      code,
      totalReferrals: stats.completed,
      pendingReferrals: stats.total - stats.completed,
      referrals: stats.referrals.map(r => ({
        id: r.referredUserId,
        username: r.referredUsername,
        email: r.referredEmail,
        registeredAt: r.registeredAt,
        completed: r.completed,
        completedAt: r.completedAt,
        status: r.completed ? 'completed' : 'pending',
      })),
    });
  } catch (error) {
    console.error('Referrals fetch error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch referrals' });
  }
});

app.get('/api/referrals/check-admin-reward', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const stats = getReferrerStats(userId);
    if (stats.completed >= 10) {
      const isAlreadyAdmin = await verifyAdmin(userId);
      if (!isAlreadyAdmin) {
        const userRes = await pteroFetch(`/users/${userId}`);
        const userData = await userRes.json();
        if (userRes.ok) {
          const attrs = userData.attributes;
          const updateRes = await pteroFetch(`/users/${userId}`, {
            method: 'PATCH',
            body: JSON.stringify({
              email: attrs.email,
              username: attrs.username,
              first_name: attrs.first_name,
              last_name: attrs.last_name,
              root_admin: true,
            }),
          });
          if (updateRes.ok) {
            serverLog(`Auto-awarded admin to user ${userId} for reaching 10 referrals`);
            return res.json({ success: true, awarded: true, message: 'Congratulations! You reached 10 referrals and have been awarded Admin Panel access!' });
          }
        }
      }
      return res.json({ success: true, awarded: false, alreadyAdmin: isAlreadyAdmin, eligible: true });
    }
    return res.json({ success: true, awarded: false, eligible: false, completedReferrals: stats.completed });
  } catch (error) {
    console.error('Admin reward check error:', error);
    return res.status(500).json({ success: false, message: 'Failed to check admin reward' });
  }
});

async function verifyAdmin(userId) {
  try {
    const response = await pteroFetch(`/users/${userId}`);
    if (!response.ok) return false;
    const data = await response.json();
    return data.attributes?.root_admin === true;
  } catch (e) {
    return false;
  }
}

function isSuperAdminById(userId) {
  return userId?.toString() === _superAdminIdCache?.toString();
}

let _superAdminIdCache = null;

async function resolveSuperAdminId() {
  if (!SUPER_ADMIN_USERNAME) return null;
  if (_superAdminIdCache) return _superAdminIdCache;
  try {
    const res = await pteroFetch(`/users?filter[username]=${SUPER_ADMIN_USERNAME}`);
    if (res.ok) {
      const data = await res.json();
      const found = (data.data || []).find(u => u.attributes.username === SUPER_ADMIN_USERNAME);
      if (found) {
        _superAdminIdCache = found.attributes.id;
        return _superAdminIdCache;
      }
    }
  } catch (e) {
    console.error('Failed to resolve super admin ID:', e);
  }
  return null;
}

function isSuperAdminByUsername(username) {
  if (!SUPER_ADMIN_USERNAME || !username) return false;
  return username.toLowerCase() === SUPER_ADMIN_USERNAME.toLowerCase();
}

app.get('/api/admin/overview', adminLimiter, authenticateToken, requireAdmin, async (req, res) => {
  try {
    const usersRes = await pteroFetch('/users?per_page=1');
    const usersData = await usersRes.json();
    const serversRes = await pteroFetch('/servers?per_page=1');
    const serversData = await serversRes.json();
    const nodesRes = await pteroFetch('/nodes?per_page=100');
    const nodesData = await nodesRes.json();

    return res.json({
      success: true,
      stats: {
        totalUsers: usersData.meta?.pagination?.total || 0,
        totalServers: serversData.meta?.pagination?.total || 0,
        totalNodes: nodesData.meta?.pagination?.total || 0,
      },
    });
  } catch (error) {
    console.error('Admin overview error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch overview' });
  }
});

app.get('/api/admin/users', adminLimiter, authenticateToken, requireAdmin, async (req, res) => {
  try {
    let allUsers = [];
    let currentPage = 1;
    let totalPages = 1;

    while (currentPage <= totalPages) {
      const response = await pteroFetch(`/users?per_page=100&page=${currentPage}&include=servers`);
      const data = await response.json();

      if (!response.ok) {
        return res.status(500).json({ success: false, message: 'Failed to fetch users' });
      }

      const pageUsers = (data.data || []).map(u => ({
        id: u.attributes.id,
        email: u.attributes.email,
        username: u.attributes.username,
        firstName: u.attributes.first_name,
        lastName: u.attributes.last_name,
        isAdmin: u.attributes.root_admin,
        createdAt: u.attributes.created_at,
        serverCount: u.attributes.relationships?.servers?.data?.length || 0,
      }));

      allUsers = allUsers.concat(pageUsers);
      totalPages = data.meta?.pagination?.total_pages || 1;
      currentPage++;
    }

    return res.json({ success: true, users: allUsers, total: allUsers.length });
  } catch (error) {
    console.error('Admin users error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch users' });
  }
});

app.patch('/api/admin/users/:id/admin', adminLimiter, authenticateToken, requireAdmin, async (req, res) => {
  try {
    const targetId = req.params.id;
    const { isAdmin } = req.body;
    securityLog('INFO', 'ADMIN_TOGGLE', { ip: req._clientIp, adminUserId: req.user.userId, targetId, isAdmin });

    const userRes = await pteroFetch(`/users/${targetId}`);
    const userData = await userRes.json();
    if (!userRes.ok) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const attrs = userData.attributes;
    const updateRes = await pteroFetch(`/users/${targetId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        email: attrs.email,
        username: attrs.username,
        first_name: attrs.first_name,
        last_name: attrs.last_name,
        root_admin: isAdmin,
      }),
    });

    if (!updateRes.ok) {
      const errData = await updateRes.json();
      return res.status(500).json({ success: false, message: errData.errors?.[0]?.detail || 'Failed to update user' });
    }

    return res.json({ success: true, message: `User ${isAdmin ? 'promoted to' : 'removed from'} admin` });
  } catch (error) {
    console.error('Admin toggle error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update user' });
  }
});

app.delete('/api/admin/users/:id', adminLimiter, authenticateToken, requireAdmin, async (req, res) => {
  try {
    const userId = req.user.userId;
    securityLog('WARN', 'ADMIN_DELETE_USER', { ip: req._clientIp, adminUserId: userId, targetId: req.params.id });

    const targetId = req.params.id;

    if (targetId.toString() === userId.toString()) {
      return res.status(400).json({ success: false, message: 'Cannot delete yourself' });
    }

    const deleteRes = await pteroFetch(`/users/${targetId}`, { method: 'DELETE' });

    if (!deleteRes.ok && deleteRes.status !== 204) {
      return res.status(500).json({ success: false, message: 'Failed to delete user' });
    }

    return res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('Admin delete user error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete user' });
  }
});

app.post('/api/admin/grant-balance', adminLimiter, authenticateToken, requireAdmin, [
  body('email').isEmail().withMessage('Valid email required'),
  body('amountKES').isFloat({ min: 1 }).withMessage('Amount must be at least 1 KES'),
  body('note').optional().isString().isLength({ max: 200 }),
], handleValidationErrors, (req, res) => {
  try {
    const { email, amountKES, note } = req.body;
    const adminEmail = req.user.email;
    securityLog('INFO', 'ADMIN_GRANT_BALANCE', { ip: req._clientIp, adminEmail, targetEmail: email, amountKES });
    const reference = `admin-grant-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    recordDeposit(email.toLowerCase(), Number(amountKES), reference, 'KES', note ? `admin-grant: ${note}` : 'admin-grant');
    serverLog(`Admin ${adminEmail} granted KES ${amountKES} to ${email}`);
    return res.json({ success: true, message: `KES ${amountKES} granted to ${email}` });
  } catch (e) {
    console.error('Grant balance error:', e);
    return res.status(500).json({ success: false, message: 'Failed to grant balance' });
  }
});

app.get('/api/admin/debug-egg', adminLimiter, authenticateToken, requireAdmin, async (req, res) => {
  try {
    cachedEggVars = null;
    eggVarsCacheTime = 0;

    const nestsRes = await pteroFetch('/nests');
    if (!nestsRes.ok) {
      return res.json({ success: false, message: 'Failed to list nests', status: nestsRes.status });
    }
    const nestsData = await nestsRes.json();
    const nestIds = (nestsData.data || []).map(n => ({ id: n.attributes.id, name: n.attributes.name }));

    const allEggs = [];
    let foundEgg = null;

    for (const nest of nestIds) {
      const eggsRes = await pteroFetch(`/nests/${nest.id}/eggs?include=variables`);
      if (!eggsRes.ok) continue;
      const eggsData = await eggsRes.json();
      for (const egg of (eggsData.data || [])) {
        const eggInfo = {
          nestId: nest.id,
          nestName: nest.name,
          eggId: egg.attributes.id,
          eggName: egg.attributes.name,
          variables: (egg.attributes?.relationships?.variables?.data || []).map(v => ({
            name: v.attributes.name,
            env_variable: v.attributes.env_variable,
            default_value: v.attributes.default_value,
            rules: v.attributes.rules,
          })),
        };
        allEggs.push(eggInfo);
        if (egg.attributes.id === SERVER_EGG_ID) foundEgg = eggInfo;
      }
    }

    res.json({
      success: true,
      targetEggId: SERVER_EGG_ID,
      foundEgg,
      allEggs,
      currentDefaults: DEFAULT_ENV_VALUES,
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

app.get('/api/admin/servers', adminLimiter, authenticateToken, requireAdmin, async (req, res) => {
  try {
    const response = await pteroFetch('/servers?per_page=100&include=user');
    const data = await response.json();

    if (!response.ok) {
      return res.status(500).json({ success: false, message: 'Failed to fetch servers' });
    }

    const freeServers = loadFreeServers();

    const servers = (data.data || []).map(s => {
      const attrs = s.attributes;
      const owner = attrs.relationships?.user?.attributes;
      let status = 'online';
      if (attrs.suspended) status = 'suspended';
      else if (attrs.status === 'installing') status = 'installing';
      else if (attrs.status === 'install_failed') status = 'error';

      const freeRecord = freeServers.find(fs => Number(fs.serverId) === Number(attrs.id));

      const serverName = (attrs.name || '').toLowerCase();
      const isNamedFreeTrial = serverName.includes('free-trial') || serverName.includes('welcome-trial');
      const isFree = !!freeRecord || isNamedFreeTrial;

      let expiresAt = null;
      let freeServerType = null;
      let deployedAt = null;
      if (freeRecord || isNamedFreeTrial) {
        const created = new Date(attrs.created_at);
        if (attrs.created_at && !isNaN(created.getTime())) {
          deployedAt = created.toISOString();
          expiresAt = new Date(created.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString();
        }
        if (freeRecord) {
          freeServerType = freeRecord.type || 'task';
        } else {
          freeServerType = serverName.includes('welcome') ? 'welcome' : 'task';
        }
      }

      return {
        id: attrs.id,
        identifier: attrs.identifier,
        uuid: attrs.uuid,
        name: attrs.name,
        status,
        node: attrs.node,
        suspended: attrs.suspended,
        ownerId: attrs.user,
        ownerUsername: owner?.username || 'Unknown',
        ownerEmail: owner?.email || '',
        limits: attrs.limits,
        createdAt: attrs.created_at,
        deployedAt,
        expiresAt,
        isFreeServer: isFree,
        freeServerType,
      };
    });

    return res.json({ success: true, servers, total: data.meta?.pagination?.total || servers.length });
  } catch (error) {
    console.error('Admin servers error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch servers' });
  }
});

app.patch('/api/admin/servers/:id/suspend', adminLimiter, authenticateToken, requireAdmin, async (req, res) => {
  try {
    const serverId = req.params.id;
    const suspendRes = await pteroFetch(`/servers/${serverId}/suspend`, { method: 'POST' });

    if (!suspendRes.ok && suspendRes.status !== 204) {
      return res.status(500).json({ success: false, message: 'Failed to suspend server' });
    }

    return res.json({ success: true, message: 'Server suspended' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to suspend server' });
  }
});

app.patch('/api/admin/servers/:id/unsuspend', adminLimiter, authenticateToken, requireAdmin, async (req, res) => {
  try {
    const serverId = req.params.id;
    const unsuspendRes = await pteroFetch(`/servers/${serverId}/unsuspend`, { method: 'POST' });

    if (!unsuspendRes.ok && unsuspendRes.status !== 204) {
      return res.status(500).json({ success: false, message: 'Failed to unsuspend server' });
    }

    return res.json({ success: true, message: 'Server unsuspended' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to unsuspend server' });
  }
});

app.delete('/api/admin/servers/:id', adminLimiter, authenticateToken, requireAdmin, async (req, res) => {
  try {
    const serverId = req.params.id;
    const deleteRes = await pteroFetch(`/servers/${serverId}`, { method: 'DELETE' });

    if (!deleteRes.ok && deleteRes.status !== 204) {
      return res.status(500).json({ success: false, message: 'Failed to delete server' });
    }

    return res.json({ success: true, message: 'Server deleted successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to delete server' });
  }
});

app.post('/api/admin/cleanup-expired', adminLimiter, authenticateToken, requireAdmin, async (req, res) => {
  try {
    const freeServers = loadFreeServers();
    const now = new Date();
    const expired = freeServers.filter(s => new Date(s.expiresAt) <= now);

    if (expired.length === 0) {
      return res.json({ success: true, message: 'No expired servers found', deleted: 0, total: freeServers.length });
    }

    serverLog(`[Admin Cleanup] Admin ${userId} triggered cleanup of ${expired.length} expired servers`);
    let deletedCount = 0;
    const failures = [];

    for (const server of expired) {
      try {
        await pteroFetch(`/servers/${server.serverId}/suspend`, { method: 'POST' });

        const deleteRes = await pteroFetch(`/servers/${server.serverId}`, { method: 'DELETE' });
        if (deleteRes.status === 204 || deleteRes.ok || deleteRes.status === 404) {
          deletedCount++;
          serverLog(`[Admin Cleanup] Deleted expired server ${server.serverId} (user ${server.userId})`);
          addNotification(
            server.userId,
            'server',
            'Free Trial Expired',
            'Your free trial server has expired and been removed. Upgrade to a paid plan to keep your server running!'
          );
        } else {
          failures.push({ serverId: server.serverId, reason: `Delete failed with status ${deleteRes.status}` });
        }
      } catch (e) {
        failures.push({ serverId: server.serverId, reason: e.message });
      }
    }

    const remaining = freeServers.filter(s => new Date(s.expiresAt) > now);
    const alsoRemoveDeleted = remaining;
    const failedIds = failures.map(f => f.serverId);
    const finalList = freeServers.filter(s => {
      if (new Date(s.expiresAt) > now) return true;
      if (failedIds.includes(s.serverId)) return true;
      return false;
    });
    saveFreeServers(finalList);

    serverLog(`[Admin Cleanup] Complete. Deleted ${deletedCount}/${expired.length}, ${finalList.length} remaining`);

    return res.json({
      success: true,
      message: `Deleted ${deletedCount} expired server${deletedCount !== 1 ? 's' : ''}`,
      deleted: deletedCount,
      failed: failures.length,
      remaining: finalList.length,
      failures: failures.length > 0 ? failures : undefined
    });
  } catch (error) {
    console.error('[Admin Cleanup] Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to cleanup expired servers' });
  }
});

// ── Disk Management ────────────────────────────────────────────────────────────

app.get('/api/admin/disk-stats', adminLimiter, authenticateToken, requireAdmin, async (req, res) => {
  try {
    let allServers = [];
    let page = 1;
    while (true) {
      const r = await pteroFetch(`/servers?per_page=100&page=${page}`);
      const data = await r.json();
      if (!data.data || data.data.length === 0) break;
      allServers = allServers.concat(data.data);
      if (!data.meta || page >= data.meta.pagination.total_pages) break;
      page++;
    }

    const servers = allServers.map(s => ({
      id: s.attributes.id,
      uuid: s.attributes.uuid,
      identifier: s.attributes.identifier,
      name: s.attributes.name,
      status: s.attributes.status,
      suspended: s.attributes.suspended,
      diskMB: s.attributes.limits.disk,
      memoryMB: s.attributes.limits.memory,
    }));

    const totalAllocatedMB = servers.reduce((sum, s) => sum + (s.diskMB || 0), 0);
    const suspendedServers = servers.filter(s => s.suspended);
    const sortedByDisk = [...servers].sort((a, b) => b.diskMB - a.diskMB);

    res.json({
      success: true,
      totalServers: servers.length,
      suspendedCount: suspendedServers.length,
      totalAllocatedGB: (totalAllocatedMB / 1024).toFixed(2),
      servers: sortedByDisk,
      tierLimits: TIER_LIMITS,
    });
  } catch (err) {
    console.error('[Disk Stats] Error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch disk stats' });
  }
});

app.post('/api/admin/disk-cleanup-suspended', adminLimiter, authenticateToken, requireAdmin, async (req, res) => {
  try {
    let allServers = [];
    let page = 1;
    while (true) {
      const r = await pteroFetch(`/servers?per_page=100&page=${page}`);
      const data = await r.json();
      if (!data.data || data.data.length === 0) break;
      allServers = allServers.concat(data.data);
      if (!data.meta || page >= data.meta.pagination.total_pages) break;
      page++;
    }

    const suspended = allServers.filter(s => s.attributes.suspended);
    let deleted = 0;
    const failures = [];

    for (const s of suspended) {
      try {
        const delRes = await pteroFetch(`/servers/${s.attributes.id}`, { method: 'DELETE' });
        if (delRes.status === 204 || delRes.ok || delRes.status === 404) {
          deleted++;
          serverLog(`[Disk Cleanup] Deleted suspended server ${s.attributes.id} (${s.attributes.name})`);
        } else {
          failures.push({ id: s.attributes.id, name: s.attributes.name, status: delRes.status });
        }
      } catch (e) {
        failures.push({ id: s.attributes.id, name: s.attributes.name, error: e.message });
      }
    }

    res.json({
      success: true,
      message: `Deleted ${deleted} suspended server${deleted !== 1 ? 's' : ''}`,
      deleted,
      failed: failures.length,
      failures: failures.length > 0 ? failures : undefined,
    });
  } catch (err) {
    console.error('[Disk Cleanup] Error:', err);
    res.status(500).json({ success: false, message: 'Failed to cleanup suspended servers' });
  }
});

app.post('/api/admin/disk-update-limit/:id', adminLimiter, authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { diskMB } = req.body;
  if (!diskMB || isNaN(Number(diskMB)) || Number(diskMB) < 128) {
    return res.status(400).json({ success: false, message: 'diskMB must be >= 128' });
  }
  try {
    const buildRes = await pteroFetch(`/servers/${id}/build`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ disk: Number(diskMB) }),
    });
    if (!buildRes.ok && buildRes.status !== 200) {
      const err = await buildRes.text();
      return res.status(500).json({ success: false, message: `Pterodactyl error: ${err}` });
    }
    res.json({ success: true, message: `Disk limit updated to ${diskMB} MB` });
  } catch (err) {
    console.error('[Disk Update] Error:', err);
    res.status(500).json({ success: false, message: 'Failed to update disk limit' });
  }
});

// ── End Disk Management ────────────────────────────────────────────────────────

const TIER_LIMITS = {
  Limited: {
    memory: 512,
    swap: 0,
    disk: 3072,
    io: 100,
    cpu: 80,
    databases: 1,
    allocations: 1,
    backups: 1,
  },
  Unlimited: {
    memory: 2048,
    swap: 0,
    disk: 10240,
    io: 200,
    cpu: 150,
    databases: 2,
    allocations: 2,
    backups: 3,
  },
  Admin: {
    memory: 4096,
    swap: 0,
    disk: 20480,
    io: 300,
    cpu: 300,
    databases: 5,
    allocations: 5,
    backups: 5,
  },
};

const PTERO_FETCH_TIMEOUT_MS = 15000;

async function pteroFetch(path, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PTERO_FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(`${PTERODACTYL_API_URL}/api/application${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        'Authorization': `Bearer ${PTERODACTYL_API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options.headers,
      },
    });
    return response;
  } finally {
    clearTimeout(timer);
  }
}

const SERVER_EGG_ID = 15;
const SERVER_NEST_ID = 5;
const SERVER_DOCKER_IMAGE = 'ghcr.io/pelican-eggs/yolks:nodejs_24';
const SERVER_STARTUP = 'if [[ -d .git ]] && [[ {{AUTO_UPDATE}} == "1" ]]; then git pull; fi; if [[ ! -z ${NODE_PACKAGES} ]]; then /usr/local/bin/npm install ${NODE_PACKAGES}; fi; if [[ ! -z ${UNNODE_PACKAGES} ]]; then /usr/local/bin/npm uninstall ${UNNODE_PACKAGES}; fi; if [ -f /home/container/package.json ]; then /usr/local/bin/npm install; fi; if [[ "${MAIN_FILE}" == "*.js" ]]; then /usr/local/bin/node "/home/container/${MAIN_FILE}" ${NODE_ARGS}; else /usr/local/bin/ts-node --esm "/home/container/${MAIN_FILE}" ${NODE_ARGS}; fi';

const DEFAULT_ENV_VALUES = {
  'USER_UPLOAD': '1',
  'MAIN_FILE': 'index.js',
  'GIT_ADDRESS': '',
  'BRANCH': '',
  'USERNAME': '',
  'ACCESS_TOKEN': '',
  'AUTO_UPDATE': '0',
  'NODE_PACKAGES': '',
  'UNNODE_PACKAGES': '',
  'NODE_ARGS': '',
};

let cachedEggVars = null;
let cachedEggStartup = null;
let cachedEggDockerImage = null;
let eggVarsCacheTime = 0;
const EGG_CACHE_TTL = 5 * 60 * 1000;

async function getEggEnvironment() {
  const now = Date.now();
  if (cachedEggVars && (now - eggVarsCacheTime) < EGG_CACHE_TTL) {
    serverLog('Using cached egg variables:', Object.keys(cachedEggVars));
    return { ...cachedEggVars };
  }

  try {
    const nestsRes = await pteroFetch('/nests');
    if (!nestsRes.ok) {
      console.error('Failed to list nests:', nestsRes.status, await nestsRes.text());
      serverLog('FALLBACK: Could not list nests, using default env vars');
      return { ...DEFAULT_ENV_VALUES };
    }
    const nestsData = await nestsRes.json();
    const nestIds = (nestsData.data || []).map(n => n.attributes.id);
    serverLog('Found nests:', nestIds);

    for (const nid of nestIds) {
      const res = await pteroFetch(`/nests/${nid}/eggs/${SERVER_EGG_ID}?include=variables`);
      if (res.ok) {
        const data = await res.json();
        const eggAttrs = data.attributes || {};
        const variables = eggAttrs?.relationships?.variables?.data || [];
        const env = {};
        for (const v of variables) {
          const attr = v.attributes;
          const envVar = attr.env_variable;
          const isRequired = (attr.rules || '').includes('required');
          env[envVar] = DEFAULT_ENV_VALUES[envVar] !== undefined ? DEFAULT_ENV_VALUES[envVar] : (attr.default_value || '');
          serverLog(`  Egg var: ${attr.name} -> env_variable=${envVar}, default=${attr.default_value}, required=${isRequired}, sending=${env[envVar]}`);
        }
        if (eggAttrs.startup) {
          cachedEggStartup = eggAttrs.startup;
          serverLog('Egg startup command:', cachedEggStartup);
        }
        if (eggAttrs.docker_image) {
          cachedEggDockerImage = eggAttrs.docker_image;
          serverLog('Egg docker image:', cachedEggDockerImage);
        } else if (eggAttrs.docker_images && Object.keys(eggAttrs.docker_images).length > 0) {
          const images = Object.values(eggAttrs.docker_images);
          cachedEggDockerImage = images[images.length - 1];
          serverLog('Egg docker images:', JSON.stringify(eggAttrs.docker_images), '-> using:', cachedEggDockerImage);
        }
        cachedEggVars = env;
        eggVarsCacheTime = now;
        serverLog('Egg environment resolved from nest', nid, ':', JSON.stringify(env));
        return { ...env };
      } else {
        serverLog(`Egg ${SERVER_EGG_ID} not found in nest ${nid} (status ${res.status})`);
      }
    }

    serverLog('WARNING: Egg not found in any nest, trying all eggs approach...');

    for (const nid of nestIds) {
      const eggsRes = await pteroFetch(`/nests/${nid}/eggs?include=variables`);
      if (!eggsRes.ok) continue;
      const eggsData = await eggsRes.json();
      for (const egg of (eggsData.data || [])) {
        serverLog(`  Nest ${nid} has egg: id=${egg.attributes.id}, name=${egg.attributes.name}`);
        if (egg.attributes.id === SERVER_EGG_ID) {
          const variables = egg.attributes?.relationships?.variables?.data || [];
          const env = {};
          for (const v of variables) {
            const attr = v.attributes;
            const envVar = attr.env_variable;
            env[envVar] = DEFAULT_ENV_VALUES[envVar] !== undefined ? DEFAULT_ENV_VALUES[envVar] : (attr.default_value || '');
            serverLog(`  Egg var: ${attr.name} -> env_variable=${envVar}, sending=${env[envVar]}`);
          }
          cachedEggVars = env;
          eggVarsCacheTime = now;
          return { ...env };
        }
      }
    }
  } catch (e) {
    console.error('Error fetching egg variables:', e.message, e.stack);
  }

  serverLog('FALLBACK: Using default environment variables (egg fetch failed completely)');
  return { ...DEFAULT_ENV_VALUES };
}

let _cachedNodeIds = null;
let _nodeIdsCacheTime = 0;
const NODE_IDS_CACHE_TTL = 10 * 60 * 1000;

let _allocCache = {};
let _allocCacheTime = {};
const ALLOC_CACHE_TTL = 2 * 60 * 1000;

async function findFreeAllocation(nodeId = null) {
  try {
    const nodeIds = [];
    if (nodeId) {
      nodeIds.push(nodeId);
    } else {
      const now = Date.now();
      if (_cachedNodeIds && (now - _nodeIdsCacheTime) < NODE_IDS_CACHE_TTL) {
        nodeIds.push(..._cachedNodeIds);
      } else {
        const nodesRes = await pteroFetch('/nodes?per_page=100');
        const nodesData = await nodesRes.json();
        if (nodesRes.ok && nodesData.data) {
          nodesData.data.forEach(n => nodeIds.push(n.attributes.id));
        }
        if (nodeIds.length === 0) nodeIds.push(1);
        _cachedNodeIds = [...nodeIds];
        _nodeIdsCacheTime = now;
      }
    }

    for (const nid of nodeIds) {
      const now = Date.now();
      if (!_allocCache[nid] || (now - (_allocCacheTime[nid] || 0)) > ALLOC_CACHE_TTL) {
        const allAllocs = [];
        let page = 1;
        let lastPage = 1;
        while (page <= lastPage) {
          const response = await pteroFetch(`/nodes/${nid}/allocations?per_page=100&page=${page}`);
          const data = await response.json();
          if (!response.ok || !data.data) break;
          allAllocs.push(...data.data);
          if (data.meta?.pagination) lastPage = data.meta.pagination.total_pages || 1;
          page++;
        }
        _allocCache[nid] = allAllocs;
        _allocCacheTime[nid] = now;
      }

      const free = _allocCache[nid].find(a => !a.attributes.assigned);
      if (free) {
        _allocCache[nid] = _allocCache[nid].filter(a => a.attributes.id !== free.attributes.id);
        serverLog(`Found free allocation ${free.attributes.id} on node ${nid} (port ${free.attributes.port})`);
        return free.attributes.id;
      }

      serverLog(`No free allocations found on node ${nid}`);
    }

    console.error('No free allocations found on any node');
    return null;
  } catch (err) {
    console.error('Error finding free allocation:', err.message);
    _allocCache = {};
    _allocCacheTime = {};
    return null;
  }
}

const TIER_PRICES = { Limited: 50, Unlimited: 100, Admin: 250 };

app.post('/api/admin/upload-server', adminLimiter, authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { targetUserId, plan, nestId } = req.body;

    if (!targetUserId || !plan) {
      return res.status(400).json({ success: false, message: 'Target user ID and plan are required' });
    }

    const tierConfig = TIER_LIMITS[plan];
    if (!tierConfig) {
      return res.status(400).json({ success: false, message: 'Invalid server plan' });
    }

    const resolvedNestId = (nestId && Number.isInteger(parseInt(nestId)) && parseInt(nestId) > 0)
      ? parseInt(nestId)
      : SERVER_NEST_ID;

    const pteroUser = await verifyPteroUser(targetUserId);
    if (!pteroUser) {
      return res.status(404).json({ success: false, message: 'Target user not found on the panel' });
    }

    const allocationId = await findFreeAllocation();
    if (!allocationId) {
      return res.status(503).json({ success: false, message: 'No available ports. Please try again later.' });
    }

    const serverName = `${pteroUser.username}-${plan.toLowerCase()}-${Date.now().toString(36)}`;

    const eggEnv = await getEggEnvironment();

    const serverPayload = {
      name: serverName,
      user: parseInt(targetUserId),
      egg: SERVER_EGG_ID,
      nest: resolvedNestId,
      docker_image: cachedEggDockerImage || SERVER_DOCKER_IMAGE,
      startup: cachedEggStartup || SERVER_STARTUP,
      environment: eggEnv,
      limits: {
        memory: tierConfig.memory,
        swap: tierConfig.swap,
        disk: tierConfig.disk,
        io: tierConfig.io,
        cpu: tierConfig.cpu,
      },
      feature_limits: {
        databases: tierConfig.databases,
        allocations: tierConfig.allocations,
        backups: tierConfig.backups,
      },
      allocation: {
        default: allocationId,
      },
      description: `WolfHost ${plan} Plan - Uploaded by Admin`,
      start_on_completion: false,
      external_id: `wolfhost-admin-${targetUserId}-${Date.now()}`,
    };

    const pteroResponse = await pteroFetch('/servers', {
      method: 'POST',
      body: JSON.stringify(serverPayload),
    });

    const pteroData = await pteroResponse.json();

    if (!pteroResponse.ok) {
      console.error('Admin upload server error:', JSON.stringify(pteroData));
      let errorMessage = 'Failed to create server on the panel';
      if (pteroData.errors && pteroData.errors.length > 0) {
        errorMessage = pteroData.errors.map(e => e.detail).join(', ');
      }
      return res.status(pteroResponse.status || 500).json({ success: false, message: errorMessage });
    }

    const serverAttrs = pteroData.attributes;
    serverLog('Admin uploaded server:', serverAttrs.id, 'for user:', pteroUser.username);

    return res.json({
      success: true,
      message: `Server uploaded to ${pteroUser.username} successfully`,
      server: {
        id: serverAttrs.id,
        name: serverAttrs.name,
        identifier: serverAttrs.identifier,
      },
    });
  } catch (error) {
    console.error('Admin upload server error:', error);
    return res.status(500).json({ success: false, message: 'Failed to upload server' });
  }
});

async function verifyUserBalance(email, requiredAmount) {
  try {
    const spending = getTotalSpending(email);

    if (hasLocalDeposits(email)) {
      const localDeposits = getTotalDepositsKES(email);
      const balance = Math.max(0, localDeposits - spending);
      serverLog(`Balance check (local): deposits=${localDeposits} spending=${spending} balance=${balance} required=${requiredAmount}`);
      return balance;
    }

    const { transactions } = await fetchUserTransactions(email, 100, 1, 'success');
    const totalDeposits = transactions.reduce((sum, txn) => {
      const currency = txn.currency || 'KES';
      const amount = txn.amount / 100;
      return sum + (currency === 'KES' ? amount : convertToKES(amount, currency));
    }, 0);
    const balance = Math.max(0, totalDeposits - spending);
    serverLog(`Balance check (paystack): deposits=${totalDeposits} spending=${spending} balance=${balance} required=${requiredAmount}`);
    return balance;
  } catch (e) {
    console.error('Balance verification error:', e);
    return 0;
  }
}

async function verifyPteroUser(userId) {
  try {
    const response = await pteroFetch(`/users/${userId}`);
    if (!response.ok) return null;
    const data = await response.json();
    return data.attributes || null;
  } catch (e) {
    return null;
  }
}

app.post('/api/servers/create', authenticateToken, [
  body('name').isString().trim().notEmpty().withMessage('Server name is required')
    .isLength({ max: 100 }).withMessage('Server name too long')
    .matches(/^[a-zA-Z0-9_\-. ]+$/).withMessage('Server name contains invalid characters'),
  body('plan').isString().trim().isIn(['Limited', 'Unlimited', 'Admin']).withMessage('Invalid server plan'),
], handleValidationErrors, async (req, res) => {
  try {
    const userId = req.user.userId;
    const userEmail = req.user.email;
    const { name, plan } = req.body;
    securityLog('INFO', 'SERVER_CREATE_ATTEMPT', { ip: req._clientIp, userId, plan, email: userEmail });

    if (!name || !plan || !userId || !userEmail) {
      return res.status(400).json({ success: false, message: 'Server name, plan, user ID, and email are required' });
    }

    const tierConfig = TIER_LIMITS[plan];
    if (!tierConfig) {
      return res.status(400).json({ success: false, message: 'Invalid server plan' });
    }

    const pteroUser = await verifyPteroUser(userId);
    if (!pteroUser) {
      return res.status(403).json({ success: false, message: 'User not found on the panel' });
    }

    if (pteroUser.email.toLowerCase() !== userEmail.toLowerCase()) {
      return res.status(403).json({ success: false, message: 'User verification failed' });
    }

    const requiredAmount = TIER_PRICES[plan] || 50;
    const balance = await verifyUserBalance(userEmail, requiredAmount);
    if (balance < requiredAmount) {
      return res.status(402).json({
        success: false,
        message: `Insufficient balance. You need KES ${requiredAmount} but have KES ${balance.toFixed(2)}. Please top up your wallet first.`,
      });
    }

    const allocationId = await findFreeAllocation();
    if (!allocationId) {
      return res.status(503).json({ success: false, message: 'No available ports. Please try again later or contact support.' });
    }

    const bugBotMatches = scanForBugBot(name);
    if (bugBotMatches.length > 0) {
      await notifyAdmin(
        'Suspicious Server Deployment',
        `User ${userEmail} (ID: ${userId}) attempted to deploy server "${name}" with suspicious content: ${bugBotMatches.join(', ')}`,
        'critical',
        'bug_bot',
        { userId, userEmail, serverName: name, plan, matches: bugBotMatches }
      );
      return res.status(403).json({ success: false, message: 'Server name contains prohibited content. This has been flagged for review.' });
    }

    serverLog('Creating Pterodactyl server:', { name, plan, userId, allocationId, verifiedBalance: balance });

    const eggEnv = await getEggEnvironment();

    const serverPayload = {
      name: name,
      user: parseInt(userId),
      egg: SERVER_EGG_ID,
      nest: SERVER_NEST_ID,
      docker_image: cachedEggDockerImage || SERVER_DOCKER_IMAGE,
      startup: cachedEggStartup || SERVER_STARTUP,
      environment: eggEnv,
      limits: {
        memory: tierConfig.memory,
        swap: tierConfig.swap,
        disk: tierConfig.disk,
        io: tierConfig.io,
        cpu: tierConfig.cpu,
      },
      feature_limits: {
        databases: tierConfig.databases,
        allocations: tierConfig.allocations,
        backups: tierConfig.backups,
      },
      allocation: {
        default: allocationId,
      },
      description: `WolfHost ${plan} Plan - Created via WolfHost Panel`,
      start_on_completion: false,
      external_id: `wolfhost-${userId}-${Date.now()}`,
    };

    let pteroResponse;
    try {
      pteroResponse = await pteroFetch('/servers', {
        method: 'POST',
        body: JSON.stringify(serverPayload),
        signal: AbortSignal.timeout(20000),
      });
    } catch (fetchErr) {
      console.error('Pterodactyl connection error during server create:', fetchErr.message);
      const isTimeout = fetchErr.name === 'TimeoutError' || fetchErr.name === 'AbortError';
      return res.status(503).json({
        success: false,
        message: isTimeout
          ? 'Panel connection timed out. Please try again in a moment.'
          : 'Could not reach the panel. Please check your connection and try again.',
      });
    }

    const pteroData = await pteroResponse.json();

    if (!pteroResponse.ok) {
      console.error('Pterodactyl server create error:', JSON.stringify(pteroData));
      let errorMessage = 'Failed to create server on the panel';
      if (pteroData.errors && pteroData.errors.length > 0) {
        errorMessage = pteroData.errors.map(e => e.detail || e.code || e.status).filter(Boolean).join(', ');
      }
      return res.status(pteroResponse.status || 500).json({ success: false, message: errorMessage });
    }

    const serverAttrs = pteroData.attributes;
    serverLog('Server created successfully:', serverAttrs.id, serverAttrs.identifier);

    recordSpending(userEmail, requiredAmount, `Server "${name}" (${plan} plan)`, serverAttrs.id);
    serverLog(`Recorded spending: KES ${requiredAmount} for user ${userEmail}, server ${serverAttrs.id}`);

    addNotification(userId, 'server', 'Server Created', `Your "${name}" server (${plan} plan) has been deployed successfully!`);

    const completedRef = completeReferral(userEmail);
    if (completedRef) {
      serverLog(`Referral completed: ${userEmail} purchased a server, crediting referrer ${completedRef.referrerEmail}`);
      addNotification(completedRef.referrerUserId, 'referral', 'Referral Completed!', `Your referral ${userEmail} just purchased a server. Keep referring to earn admin access!`);
      const referrerStats = getReferrerStats(completedRef.referrerUserId);
      if (referrerStats.completed >= 10) {
        const isAlreadyAdmin = await verifyAdmin(completedRef.referrerUserId);
        if (!isAlreadyAdmin) {
          try {
            const userRes = await pteroFetch(`/users/${completedRef.referrerUserId}`);
            const userData = await userRes.json();
            if (userRes.ok) {
              const attrs = userData.attributes;
              await pteroFetch(`/users/${completedRef.referrerUserId}`, {
                method: 'PATCH',
                body: JSON.stringify({
                  email: attrs.email,
                  username: attrs.username,
                  first_name: attrs.first_name,
                  last_name: attrs.last_name,
                  root_admin: true,
                }),
              });
              serverLog(`Auto-awarded admin to referrer ${completedRef.referrerUserId} for reaching 10 referrals`);
            }
          } catch (e) {
            console.error('Error auto-awarding admin:', e);
          }
        }
      }
    }

    return res.json({
      success: true,
      message: 'Server created successfully',
      server: {
        id: serverAttrs.id,
        identifier: serverAttrs.identifier,
        uuid: serverAttrs.uuid,
        name: serverAttrs.name,
        description: serverAttrs.description,
        plan: plan,
        status: serverAttrs.suspended ? 'suspended' : 'installing',
        node: serverAttrs.node,
        allocation: serverAttrs.allocation,
        limits: serverAttrs.limits,
        feature_limits: serverAttrs.feature_limits,
      },
    });
  } catch (error) {
    console.error('Server creation error:', error.message, error.stack);
    return res.status(500).json({ success: false, message: `Server creation failed: ${error.message}` });
  }
});

app.get('/api/servers', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    if (req.query.userId && parseInt(req.query.userId) !== userId) {
      securityLog('ALERT', 'IDOR_ATTEMPT', { ip: req._clientIp, authenticatedUserId: userId, requestedUserId: req.query.userId });
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID is required' });
    }

    const pteroResponse = await pteroFetch(`/users/${userId}?include=servers`);
    const pteroData = await pteroResponse.json();

    if (!pteroResponse.ok) {
      console.error('Pterodactyl servers fetch error:', JSON.stringify(pteroData));
      return res.json({ success: true, servers: [] });
    }

    const userServers = pteroData.attributes?.relationships?.servers?.data || [];

    const formatMem = (m) => {
      if (m === 0 || m > 100000) return 'Unlimited';
      if (m >= 1024) return `${Math.round(m / 1024)}GB`;
      return `${m}MB`;
    };
    const formatDisk = (d) => {
      if (d === 0 || d > 1000000) return 'Unlimited';
      if (d >= 1024) return `${Math.round(d / 1024)}GB`;
      return `${d}MB`;
    };

    const nodeIds = [...new Set(userServers.map(s => s.attributes.node).filter(Boolean))];
    const allocMap = {};
    await Promise.all(nodeIds.map(async (nid) => {
      try {
        const allocRes = await pteroFetch(`/nodes/${nid}/allocations?per_page=100`);
        const allocData = await allocRes.json();
        if (allocRes.ok && allocData.data) {
          allocData.data.forEach(a => { allocMap[a.attributes.id] = a.attributes; });
        }
      } catch (e) {}
    }));

    const servers = userServers.map((s) => {
      const attrs = s.attributes;
      let ip = '';
      let port = '';

      if (attrs.allocation && allocMap[attrs.allocation]) {
        const alloc = allocMap[attrs.allocation];
        ip = alloc.alias || alloc.ip;
        port = alloc.port;
      }

      const mem = attrs.limits.memory;
      const cpu = attrs.limits.cpu;
      let plan = 'Limited';
      if (mem >= 4096 || (mem === 0 && cpu >= 300)) plan = 'Admin';
      else if (mem >= 2048 || (mem === 0 && cpu >= 150)) plan = 'Unlimited';

      let status = 'online';
      if (attrs.suspended || attrs.status === 'suspended') status = 'suspended';
      else if (attrs.status === 'installing') status = 'installing';
      else if (attrs.status === 'install_failed') status = 'error';

      return {
        id: attrs.id.toString(),
        identifier: attrs.identifier,
        name: attrs.name,
        status,
        plan,
        ip: ip ? `${ip}:${port}` : '',
        cpu: `${cpu}%`,
        ram: formatMem(mem),
        storage: formatDisk(attrs.limits.disk),
        uptime: '-',
      };
    });

    return res.json({
      success: true,
      servers,
      total: servers.length,
    });
  } catch (error) {
    console.error('Servers fetch error:', error);
    return res.json({ success: true, servers: [] });
  }
});

app.delete('/api/servers/:serverId', authenticateToken, async (req, res) => {
  try {
    const { serverId } = req.params;
    const userId = req.user.userId;
    const userEmail = req.user.email;

    if (!serverId) {
      return res.status(400).json({ success: false, message: 'Server ID is required' });
    }

    const serverRes = await pteroFetch(`/servers/${serverId}`);
    if (serverRes.ok) {
      const serverData = await serverRes.json();
      if (serverData.attributes && serverData.attributes.user !== parseInt(userId)) {
        return res.status(403).json({ success: false, message: 'You do not own this server' });
      }
    }

    serverLog('Deleting Pterodactyl server:', serverId);

    const pteroResponse = await pteroFetch(`/servers/${serverId}`, {
      method: 'DELETE',
    });

    if (pteroResponse.status === 204 || pteroResponse.ok) {
      serverLog('Server deleted successfully:', serverId);
      return res.json({ success: true, message: 'Server deleted successfully' });
    }

    const pteroData = await pteroResponse.json().catch(() => ({}));
    console.error('Pterodactyl delete error:', JSON.stringify(pteroData));
    return res.status(pteroResponse.status || 500).json({
      success: false,
      message: pteroData.errors?.[0]?.detail || 'Failed to delete server',
    });
  } catch (error) {
    console.error('Server deletion error:', error);
    return res.status(500).json({ success: false, message: 'Server error deleting server' });
  }
});

const TASK_DEFINITIONS = [
  { id: 'whatsapp_channel', name: 'Follow WhatsApp Channel', link: 'https://whatsapp.com/channel/0029Vb6dn9nEQIaqEMNclK3Y' },
  { id: 'whatsapp_group', name: 'Join WhatsApp Group', link: 'https://chat.whatsapp.com/HjFc3pud3IA0R0WGr1V2Xu' },
  { id: 'telegram_group', name: 'Join Telegram Group', link: 'https://t.me/+qoyEyvEgHC5mODVk' },
  { id: 'youtube_channel', name: 'Subscribe to YouTube Channel', link: 'https://www.youtube.com/@silentwolf906' },
];

const FREE_SERVER_LIFETIME_MS = 3 * 24 * 60 * 60 * 1000;

const FREE_SERVER_LIMITS = {
  memory: 512,
  swap: 0,
  disk: 1024,
  io: 50,
  cpu: 50,
  databases: 0,
  allocations: 1,
  backups: 0,
};

app.get('/api/tasks', authenticateToken, (req, res) => {
  try {
    const userId = req.user.userId;

    const allTasks = loadTasks();
    const userTasks = allTasks[userId] || {};

    const tasks = TASK_DEFINITIONS.map(t => ({
      ...t,
      completed: !!userTasks[t.id],
      completedAt: userTasks[t.id] || null,
    }));

    const completedCount = tasks.filter(t => t.completed).length;

    const freeServers = loadFreeServers();
    const userFreeServer = freeServers.find(s => s.userId === userId.toString());

    return res.json({
      success: true,
      tasks,
      completedCount,
      totalTasks: TASK_DEFINITIONS.length,
      allCompleted: completedCount === TASK_DEFINITIONS.length,
      freeServerClaimed: !!userFreeServer,
      freeServer: userFreeServer || null,
    });
  } catch (error) {
    console.error('Tasks fetch error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch tasks' });
  }
});

app.post('/api/tasks/complete', authenticateToken, (req, res) => {
  try {
    const userId = req.user.userId;
    const { taskId } = req.body;
    if (!taskId) return res.status(400).json({ success: false, message: 'taskId is required' });

    const validTask = TASK_DEFINITIONS.find(t => t.id === taskId);
    if (!validTask) return res.status(400).json({ success: false, message: 'Invalid task ID' });

    const allTasks = loadTasks();
    if (!allTasks[userId]) allTasks[userId] = {};

    if (allTasks[userId][taskId]) {
      return res.json({ success: true, message: 'Task already completed', alreadyCompleted: true });
    }

    allTasks[userId][taskId] = new Date().toISOString();
    saveTasks(allTasks);

    const completedCount = Object.keys(allTasks[userId]).length;

    return res.json({
      success: true,
      message: 'Task completed',
      completedCount,
      totalTasks: TASK_DEFINITIONS.length,
      allCompleted: completedCount === TASK_DEFINITIONS.length,
    });
  } catch (error) {
    console.error('Task complete error:', error);
    return res.status(500).json({ success: false, message: 'Failed to complete task' });
  }
});

app.post('/api/tasks/claim-server', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const userEmail = req.user.email;

    const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || req.connection?.remoteAddress || 'unknown';

    const allTasks = loadTasks();
    const userTasks = allTasks[userId] || {};
    const completedCount = TASK_DEFINITIONS.filter(t => userTasks[t.id]).length;
    if (completedCount < TASK_DEFINITIONS.length) {
      return res.status(400).json({ success: false, message: 'Complete all tasks first' });
    }

    const freeServers = loadFreeServers();

    const existingUser = freeServers.find(s => s.userId === userId.toString());
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'You have already claimed your free server' });
    }

    if (clientIp && clientIp !== 'unknown') {
      const existingIp = freeServers.find(s => s.ip === clientIp);
      if (existingIp) {
        serverLog(`Suspicious: IP ${clientIp} already claimed a free server (user ${existingIp.userId}), now user ${userId} trying`);
        return res.status(400).json({ success: false, message: 'A free server has already been claimed from this network' });
      }
    }

    const pteroUser = await verifyPteroUser(userId);
    if (!pteroUser) {
      return res.status(403).json({ success: false, message: 'User not found on the panel' });
    }

    const allocationId = await findFreeAllocation();
    if (!allocationId) {
      return res.status(503).json({ success: false, message: 'No available ports. Please try again later.' });
    }

    const serverName = `${pteroUser.username}-free-trial`;
    const expiresAt = new Date(Date.now() + FREE_SERVER_LIFETIME_MS).toISOString();

    serverLog('Creating free trial server:', { serverName, userId, allocationId, expiresAt });

    const eggEnv = await getEggEnvironment();

    const serverPayload = {
      name: serverName,
      user: parseInt(userId),
      egg: SERVER_EGG_ID,
      nest: SERVER_NEST_ID,
      docker_image: cachedEggDockerImage || SERVER_DOCKER_IMAGE,
      startup: cachedEggStartup || SERVER_STARTUP,
      environment: eggEnv,
      limits: {
        memory: FREE_SERVER_LIMITS.memory,
        swap: FREE_SERVER_LIMITS.swap,
        disk: FREE_SERVER_LIMITS.disk,
        io: FREE_SERVER_LIMITS.io,
        cpu: FREE_SERVER_LIMITS.cpu,
      },
      feature_limits: {
        databases: FREE_SERVER_LIMITS.databases,
        allocations: FREE_SERVER_LIMITS.allocations,
        backups: FREE_SERVER_LIMITS.backups,
      },
      allocation: { default: allocationId },
      description: `WolfHost Free Trial - Expires ${new Date(Date.now() + FREE_SERVER_LIFETIME_MS).toLocaleDateString()}`,
      start_on_completion: false,
      external_id: `wolfhost-free-${userId}-${Date.now()}`,
    };

    let pteroResponse;
    try {
      pteroResponse = await pteroFetch('/servers', {
        method: 'POST',
        body: JSON.stringify(serverPayload),
        signal: AbortSignal.timeout(20000),
      });
    } catch (fetchErr) {
      console.error('Pterodactyl connection error during free server create:', fetchErr.message);
      const isTimeout = fetchErr.name === 'TimeoutError' || fetchErr.name === 'AbortError';
      return res.status(503).json({
        success: false,
        message: isTimeout
          ? 'Panel connection timed out. Please try again in a moment.'
          : 'Could not reach the panel. Please check your connection and try again.',
      });
    }

    const pteroData = await pteroResponse.json();

    if (!pteroResponse.ok) {
      console.error('Free server create error:', JSON.stringify(pteroData));
      let errorMessage = 'Failed to create free server';
      if (pteroData.errors && pteroData.errors.length > 0) {
        errorMessage = pteroData.errors.map(e => e.detail || e.code || e.status).filter(Boolean).join(', ');
      }
      return res.status(500).json({ success: false, message: errorMessage });
    }

    const serverAttrs = pteroData.attributes;

    const freeServerRecord = {
      userId: userId.toString(),
      userEmail: userEmail.toLowerCase(),
      ip: clientIp,
      serverId: serverAttrs.id,
      identifier: serverAttrs.identifier,
      serverName: serverAttrs.name,
      createdAt: new Date().toISOString(),
      expiresAt,
    };

    freeServers.push(freeServerRecord);
    saveFreeServers(freeServers);

    serverLog(`Free trial server created: ${serverAttrs.id} for user ${userId}, expires ${expiresAt}`);

    return res.json({
      success: true,
      message: 'Free trial server created! It will be available for 3 days.',
      server: {
        id: serverAttrs.id,
        identifier: serverAttrs.identifier,
        name: serverAttrs.name,
        expiresAt,
      },
    });
  } catch (error) {
    console.error('Free server claim error:', error);
    return res.status(500).json({ success: false, message: 'Server error creating free server' });
  }
});

app.post('/api/free-server/claim-welcome', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const userEmail = req.user.email;

    const welcomeClaims = loadWelcomeClaims();
    if (welcomeClaims[userId.toString()]) {
      return res.status(400).json({ success: false, message: 'You have already claimed your free server', alreadyClaimed: true });
    }

    const pteroUser = await verifyPteroUser(userId);
    if (!pteroUser) {
      return res.status(403).json({ success: false, message: 'User not found on the panel' });
    }

    if (pteroUser.email.toLowerCase() !== userEmail.toLowerCase()) {
      return res.status(403).json({ success: false, message: 'User verification failed' });
    }

    const allocationId = await findFreeAllocation();
    if (!allocationId) {
      return res.status(503).json({ success: false, message: 'No available ports. Please try again later.' });
    }

    let customName = req.body?.serverName;
    if (customName && typeof customName === 'string') {
      customName = customName.trim().replace(/[^a-zA-Z0-9_\- ]/g, '').substring(0, 50);
    }
    const serverName = customName && customName.length >= 3 ? customName : `${pteroUser.username}-welcome-trial`;

    const bugBotMatches = scanForBugBot(serverName);
    if (bugBotMatches.length > 0) {
      await notifyAdmin(
        'Suspicious Free Server Claim',
        `User ${userEmail} (ID: ${userId}) attempted to claim a free server named "${serverName}" with suspicious content: ${bugBotMatches.join(', ')}`,
        'critical',
        'bug_bot',
        { userId, userEmail, serverName, type: 'free_trial', matches: bugBotMatches }
      );
      return res.status(403).json({ success: false, message: 'Server name contains prohibited content. This has been flagged for review.' });
    }
    const expiresAt = new Date(Date.now() + FREE_SERVER_LIFETIME_MS).toISOString();

    serverLog('Creating welcome free trial server:', { serverName, userId, allocationId, expiresAt });

    const eggEnv = await getEggEnvironment();

    const serverPayload = {
      name: serverName,
      user: parseInt(userId),
      egg: SERVER_EGG_ID,
      nest: SERVER_NEST_ID,
      docker_image: cachedEggDockerImage || SERVER_DOCKER_IMAGE,
      startup: cachedEggStartup || SERVER_STARTUP,
      environment: eggEnv,
      limits: {
        memory: FREE_SERVER_LIMITS.memory,
        swap: FREE_SERVER_LIMITS.swap,
        disk: FREE_SERVER_LIMITS.disk,
        io: FREE_SERVER_LIMITS.io,
        cpu: FREE_SERVER_LIMITS.cpu,
      },
      feature_limits: {
        databases: FREE_SERVER_LIMITS.databases,
        allocations: FREE_SERVER_LIMITS.allocations,
        backups: FREE_SERVER_LIMITS.backups,
      },
      allocation: { default: allocationId },
      description: `WolfHost Welcome Trial - Expires ${new Date(Date.now() + FREE_SERVER_LIFETIME_MS).toLocaleDateString()}`,
      start_on_completion: false,
      external_id: `wolfhost-welcome-${userId}-${Date.now()}`,
    };

    let pteroResponse;
    try {
      pteroResponse = await pteroFetch('/servers', {
        method: 'POST',
        body: JSON.stringify(serverPayload),
        signal: AbortSignal.timeout(20000),
      });
    } catch (fetchErr) {
      console.error('Pterodactyl connection error during welcome server create:', fetchErr.message);
      const isTimeout = fetchErr.name === 'TimeoutError' || fetchErr.name === 'AbortError';
      return res.status(503).json({
        success: false,
        message: isTimeout
          ? 'Panel connection timed out. Please try again in a moment.'
          : 'Could not reach the panel. Please check your connection and try again.',
      });
    }

    const pteroData = await pteroResponse.json();

    if (!pteroResponse.ok) {
      console.error('Welcome free server create error:', JSON.stringify(pteroData));
      let errorMessage = 'Failed to create free server';
      if (pteroData.errors && pteroData.errors.length > 0) {
        errorMessage = pteroData.errors.map(e => e.detail || e.code || e.status).filter(Boolean).join(', ');
      }
      return res.status(500).json({ success: false, message: errorMessage });
    }

    const serverAttrs = pteroData.attributes;

    const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || req.connection?.remoteAddress || 'unknown';

    const freeServerRecord = {
      userId: userId.toString(),
      userEmail: userEmail.toLowerCase(),
      ip: clientIp,
      serverId: serverAttrs.id,
      identifier: serverAttrs.identifier,
      serverName: serverAttrs.name,
      createdAt: new Date().toISOString(),
      expiresAt,
      type: 'welcome',
    };

    const freeServers = loadFreeServers();
    freeServers.push(freeServerRecord);
    saveFreeServers(freeServers);

    const updatedClaims = loadWelcomeClaims();
    updatedClaims[userId.toString()] = {
      claimedAt: new Date().toISOString(),
      serverId: serverAttrs.id,
      expiresAt,
    };
    saveWelcomeClaims(updatedClaims);

    addNotification(userId, 'server', 'Free Trial Server Ready!', `Your free 3-day trial server "${serverAttrs.name}" is live! It expires on ${new Date(expiresAt).toLocaleDateString()}.`);

    serverLog(`Welcome trial server created: ${serverAttrs.id} for user ${userId}, expires ${expiresAt}`);

    return res.json({
      success: true,
      message: 'Your free 3-day trial server has been created!',
      server: {
        id: serverAttrs.id,
        identifier: serverAttrs.identifier,
        name: serverAttrs.name,
        expiresAt,
      },
    });
  } catch (error) {
    console.error('Welcome free server claim error:', error);
    return res.status(500).json({ success: false, message: 'Server error creating free server' });
  }
});

app.get('/api/free-server/status', authenticateToken, (req, res) => {
  try {
    const userId = req.user.userId;

    const welcomeClaims = loadWelcomeClaims();
    const hasClaimed = !!welcomeClaims[userId.toString()];

    const freeServers = loadFreeServers();
    const userFreeServer = freeServers.find(s => s.userId === userId.toString());

    return res.json({
      success: true,
      hasFreeServer: hasClaimed || !!userFreeServer,
      freeServer: userFreeServer || null,
      claimed: hasClaimed,
    });
  } catch (error) {
    console.error('Free server status error:', error);
    return res.status(500).json({ success: false, message: 'Failed to check free server status' });
  }
});

async function cleanupExpiredFreeServers() {
  try {
    const freeServers = loadFreeServers();
    const now = new Date();
    const expired = freeServers.filter(s => new Date(s.expiresAt) <= now);

    if (expired.length === 0) return;

    serverLog(`[Cleanup] Found ${expired.length} expired free servers to remove...`);
    const successfullyRemoved = [];

    for (const server of expired) {
      try {
        const suspendRes = await pteroFetch(`/servers/${server.serverId}/suspend`, { method: 'POST' });
        if (suspendRes.status === 204 || suspendRes.ok) {
          serverLog(`[Cleanup] Suspended expired server ${server.serverId}`);
        } else {
          serverLog(`[Cleanup] Suspend returned status ${suspendRes.status} for server ${server.serverId} (may already be suspended)`);
        }

        const deleteRes = await pteroFetch(`/servers/${server.serverId}`, { method: 'DELETE' });
        if (deleteRes.status === 204 || deleteRes.ok) {
          serverLog(`[Cleanup] Deleted expired free server ${server.serverId} (user ${server.userId})`);
          successfullyRemoved.push(server.serverId);
          addNotification(
            server.userId,
            'server',
            'Free Trial Expired',
            `Your free trial server has expired and been removed. Upgrade to a paid plan to keep your server running!`
          );
        } else if (deleteRes.status === 404) {
          serverLog(`[Cleanup] Server ${server.serverId} already deleted from panel, removing from tracking`);
          successfullyRemoved.push(server.serverId);
        } else {
          console.error(`[Cleanup] Failed to delete expired server ${server.serverId}: status ${deleteRes.status}`);
        }
      } catch (e) {
        console.error(`[Cleanup] Error processing expired server ${server.serverId}:`, e.message);
      }
    }

    if (successfullyRemoved.length > 0) {
      const expiredDetails = expired
        .filter(s => successfullyRemoved.includes(s.serverId))
        .map(s => `"${s.serverName}" (user ${s.userEmail || s.userId})`)
        .join(', ');
      await notifyAdmin(
        'Free Trial Servers Expired',
        `${successfullyRemoved.length} free trial server(s) expired and were removed: ${expiredDetails}`,
        'info',
        'server_expired',
        { count: successfullyRemoved.length, serverIds: successfullyRemoved }
      );
    }

    const remaining = freeServers.filter(s => {
      if (successfullyRemoved.includes(s.serverId)) return false;
      if (new Date(s.expiresAt) > now) return true;
      return true;
    });
    saveFreeServers(remaining);
    serverLog(`[Cleanup] Complete. Removed ${successfullyRemoved.length}, ${remaining.length} servers remaining.`);
  } catch (e) {
    console.error('[Cleanup] Free server cleanup error:', e);
  }
}

setInterval(cleanupExpiredFreeServers, 5 * 60 * 1000);
setTimeout(cleanupExpiredFreeServers, 15000);

async function scanExistingServersForBugBots() {
  try {
    const alerts = loadAdminAlerts();
    const alreadyFlagged = new Set(
      alerts.filter(a => a.category === 'bug_bot' && a.metadata?.serverId).map(a => a.metadata.serverId.toString())
    );

    let flaggedCount = 0;
    let page = 1;
    let totalPages = 1;

    while (page <= totalPages) {
      const response = await pteroFetch(`/servers?per_page=100&page=${page}&include=user`);
      if (!response.ok) break;
      const data = await response.json();
      const servers = data.data || [];
      totalPages = data.meta?.pagination?.total_pages || 1;

      for (const s of servers) {
        const attrs = s.attributes;
        if (alreadyFlagged.has(attrs.id.toString())) continue;

        const matches = scanForBugBot(attrs.name, attrs.description || '');
        if (matches.length > 0) {
          const owner = attrs.relationships?.user?.attributes;
          await notifyAdmin(
            'Suspicious Server Detected (Scan)',
            `Server "${attrs.name}" (ID: ${attrs.id}) owned by ${owner?.email || `user #${attrs.user}`} flagged: ${matches.join(', ')}`,
            'warning',
            'bug_bot',
            { serverId: attrs.id, serverName: attrs.name, ownerId: attrs.user, ownerEmail: owner?.email, matches }
          );
          flaggedCount++;
        }
      }
      page++;
    }

    if (flaggedCount > 0) {
      serverLog(`[BugBot Scan] Flagged ${flaggedCount} suspicious server(s)`);
    }
  } catch (e) {
    console.error('[BugBot Scan] Error:', e.message);
  }
}

setInterval(scanExistingServersForBugBots, 60 * 60 * 1000);
setTimeout(scanExistingServersForBugBots, 5 * 60 * 1000);

app.get('/api/admin/alerts', adminLimiter, authenticateToken, requireAdmin, (req, res) => {
  try {
    const alerts = loadAdminAlerts();
    return res.json({ success: true, alerts });
  } catch (error) {
    console.error('Admin alerts error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load alerts' });
  }
});

app.patch('/api/admin/alerts/:id/resolve', adminLimiter, authenticateToken, requireAdmin, (req, res) => {
  try {
    const alerts = loadAdminAlerts();
    const idx = alerts.findIndex(a => a.id === req.params.id);
    if (idx === -1) {
      return res.status(404).json({ success: false, message: 'Alert not found' });
    }
    alerts[idx].resolved = true;
    alerts[idx].resolvedAt = new Date().toISOString();
    alerts[idx].resolvedBy = req.user.email || req.user.username;
    saveAdminAlerts(alerts);
    return res.json({ success: true, alert: alerts[idx] });
  } catch (error) {
    console.error('Admin alert resolve error:', error);
    return res.status(500).json({ success: false, message: 'Failed to resolve alert' });
  }
});

app.delete('/api/admin/alerts/:id', adminLimiter, authenticateToken, requireAdmin, (req, res) => {
  try {
    let alerts = loadAdminAlerts();
    const idx = alerts.findIndex(a => a.id === req.params.id);
    if (idx === -1) {
      return res.status(404).json({ success: false, message: 'Alert not found' });
    }
    alerts.splice(idx, 1);
    saveAdminAlerts(alerts);
    return res.json({ success: true });
  } catch (error) {
    console.error('Admin alert delete error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete alert' });
  }
});

app.delete('/api/admin/alerts', adminLimiter, authenticateToken, requireSuperAdmin, (req, res) => {
  try {
    const { resolvedOnly } = req.query;
    if (resolvedOnly === 'true') {
      const alerts = loadAdminAlerts().filter(a => !a.resolved);
      saveAdminAlerts(alerts);
      return res.json({ success: true, message: 'Resolved alerts cleared' });
    }
    saveAdminAlerts([]);
    return res.json({ success: true, message: 'All alerts cleared' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to clear alerts' });
  }
});

app.post('/api/wolf/chat', chatLimiter, authenticateToken, [
  body('message').isString().trim().notEmpty().withMessage('Message is required')
    .isLength({ max: 2000 }).withMessage('Message too long'),
], handleValidationErrors, async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, error: 'Message is required' });
    }

    const systemContext = `You are W.O.L.F (Wise Operational Learning Function), the AI assistant for WolfHost - a game server hosting platform. You help users navigate the platform and answer questions about:
- Creating and managing game servers (Minecraft, etc.)
- Wallet top-ups via M-Pesa or Card payments (minimum 50 KSH)
- Server tiers: Limited (50 KSH), Unlimited (100 KSH), Admin (250 KSH)
- Billing and transaction history
- Referral program (refer 10 friends who buy servers to earn Admin Panel access)
- Account settings
Keep responses concise, friendly, and helpful. If asked about something unrelated to WolfHost, politely redirect to hosting topics.`;

    const fullQuery = `${systemContext}\n\nUser: ${message.trim()}`;
    const apiUrl = `https://apiskeith.vercel.app/ai/grok?q=${encodeURIComponent(fullQuery)}`;

    const response = await fetch(apiUrl, { 
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(30000)
    });

    if (!response.ok) {
      throw new Error(`API responded with status ${response.status}`);
    }

    const data = await response.json();
    const answer = data?.answer || data?.response || data?.result || data?.message || JSON.stringify(data);

    res.json({ success: true, response: answer });
  } catch (error) {
    console.error('W.O.L.F chat error:', error.message);
    res.status(500).json({ 
      success: false, 
      error: 'W.O.L.F is temporarily unavailable. Please try again.' 
    });
  }
});

app.get('/api/notifications', authenticateToken, (req, res) => {
  try {
    const userId = req.user.userId;

    const allNotifs = loadNotifications();
    const userNotifs = allNotifs[userId.toString()] || [];
    const unreadCount = userNotifs.filter(n => !n.read).length;

    return res.json({
      success: true,
      notifications: userNotifs,
      unreadCount,
    });
  } catch (error) {
    console.error('Notifications fetch error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch notifications' });
  }
});

app.post('/api/notifications/read', authenticateToken, (req, res) => {
  try {
    const userId = req.user.userId;
    const { notificationId } = req.body;

    const allNotifs = loadNotifications();
    const key = userId.toString();
    if (!allNotifs[key]) return res.json({ success: true });

    if (notificationId) {
      const notif = allNotifs[key].find(n => n.id === notificationId);
      if (notif) notif.read = true;
    } else {
      allNotifs[key].forEach(n => { n.read = true; });
    }

    saveNotifications(allNotifs);
    return res.json({ success: true });
  } catch (error) {
    console.error('Notification read error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update notifications' });
  }
});

const SITE_SETTINGS_FILE = path.join(__dirname, 'site_settings.json');

function loadSiteSettings() {
  try {
    if (fs.existsSync(SITE_SETTINGS_FILE)) {
      return JSON.parse(fs.readFileSync(SITE_SETTINGS_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('Error loading site settings:', e);
  }
  return {
    whatsappChannel: 'https://whatsapp.com/channel/0029Vb6dn9nEQIaqEMNclK3Y',
    whatsappGroup: 'https://chat.whatsapp.com/HjFc3pud3IA0R0WGr1V2Xu',
    youtube: 'https://www.youtube.com/@Silentwolf906',
    supportPhone: 'https://wa.me/254713046497',
    supportPhoneDisplay: '+254 713 046 497',
  };
}

function saveSiteSettings(settings) {
  try {
    fs.writeFileSync(SITE_SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf8');
  } catch (e) {
    console.error('Error saving site settings:', e);
  }
}

app.get('/api/site-settings', (req, res) => {
  try {
    const settings = loadSiteSettings();
    return res.json({ success: true, settings });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to load settings' });
  }
});

app.put('/api/admin/site-settings', adminLimiter, authenticateToken, requireAdmin, [
  body('whatsappChannel').optional().isString().trim(),
  body('whatsappGroup').optional().isString().trim(),
  body('youtube').optional().isString().trim(),
  body('supportPhone').optional().isString().trim(),
  body('supportPhoneDisplay').optional().isString().trim(),
  body('siteName').optional().isString().trim().isLength({ max: 60 }),
  body('siteTagline').optional().isString().trim().isLength({ max: 120 }),
  body('theme').optional().isString().trim(),
  body('themeVars').optional().isObject(),
], handleValidationErrors, (req, res) => {
  try {
    const current = loadSiteSettings();
    const updated = { ...current };
    const fields = ['whatsappChannel', 'whatsappGroup', 'youtube', 'supportPhone', 'supportPhoneDisplay', 'siteName', 'siteTagline', 'theme'];
    for (const field of fields) {
      if (req.body[field] !== undefined) {
        updated[field] = sanitizeString(req.body[field]);
      }
    }
    // themeVars is an object — validate keys are strings and values are safe HSL strings
    if (req.body.themeVars && typeof req.body.themeVars === 'object') {
      const safeVars = {};
      const HSL_RE = /^[\d.]+ [\d.]+% [\d.]+%$/;
      for (const [k, v] of Object.entries(req.body.themeVars)) {
        if (typeof k === 'string' && typeof v === 'string' && (HSL_RE.test(v.trim()) || v.trim() === '')) {
          safeVars[k] = v.trim();
        }
      }
      updated.themeVars = safeVars;
    }
    saveSiteSettings(updated);
    return res.json({ success: true, settings: updated });
  } catch (error) {
    console.error('Site settings update error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update settings' });
  }
});

// Superadmin key — loaded from superadmin_config.json (set up by setup_superadmin.cjs)
const SUPERADMIN_KEY = _saConfig.key || process.env.SUPERADMIN_KEY || 'Silentwolf906.';

app.post('/api/superadmin/verify-key', authenticateToken, requireAdmin, [
  body('key').isString().trim().notEmpty(),
], handleValidationErrors, (req, res) => {
  if (req.body.key === SUPERADMIN_KEY) {
    return res.json({ success: true });
  }
  securityLog('WARN', 'SUPERADMIN_KEY_WRONG', { ip: req._clientIp, userId: req.user?.userId });
  return res.status(403).json({ success: false, message: 'Invalid superadmin key' });
});

app.post('/api/superadmin/reset-theme', authenticateToken, requireAdmin, (req, res) => {
  try {
    const current = loadSiteSettings();
    delete current.theme;
    delete current.themeVars;
    saveSiteSettings(current);
    return res.json({ success: true });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Reset failed' });
  }
});

app.post('/api/admin/broadcast-notification', adminLimiter, authenticateToken, requireAdmin, [
  body('title').isString().trim().isLength({ min: 1, max: 200 }).withMessage('Title is required (max 200 chars)'),
  body('message').isString().trim().isLength({ min: 1, max: 1000 }).withMessage('Message is required (max 1000 chars)'),
  body('type').optional().isString().isIn(['info', 'warning', 'success', 'alert']).withMessage('Invalid type'),
], handleValidationErrors, (req, res) => {
  try {
    const { title, message, type = 'info' } = req.body;
    const allNotifs = loadNotifications();
    const allUsers = Object.keys(allNotifs);

    let userCount = 0;
    if (allUsers.length > 0) {
      for (const userId of allUsers) {
        addNotification(userId, type, title, message);
        userCount++;
      }
    }

    const userFiles = [
      path.join(__dirname, 'user_credentials.json'),
      path.join(__dirname, 'welcome_claims.json'),
    ];
    for (const file of userFiles) {
      try {
        if (fs.existsSync(file)) {
          const data = JSON.parse(fs.readFileSync(file, 'utf8'));
          for (const key of Object.keys(data)) {
            if (!allNotifs[key]) {
              addNotification(key, type, title, message);
              userCount++;
            }
          }
        }
      } catch (e) {}
    }

    return res.json({ success: true, userCount, message: `Notification sent to ${userCount} users` });
  } catch (error) {
    console.error('Broadcast notification error:', error);
    return res.status(500).json({ success: false, message: 'Failed to broadcast notification' });
  }
});

const TUTORIALS_FILE = path.join(__dirname, 'tutorials.json');

function loadTutorials() {
  try {
    if (fs.existsSync(TUTORIALS_FILE)) {
      return JSON.parse(fs.readFileSync(TUTORIALS_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('Error loading tutorials:', e);
  }
  return [];
}

function saveTutorials(data) {
  try {
    fs.writeFileSync(TUTORIALS_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.error('Error saving tutorials:', e);
  }
}

function extractYouTubeId(url) {
  if (!url) return null;
  // Enhanced patterns to match various YouTube URL formats including mobile, shorts, and si parameter
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /^[a-zA-Z0-9_-]{11}$/ // Support just the ID
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

app.get('/api/tutorials', (req, res) => {
  try {
    const tutorials = loadTutorials();
    const published = tutorials.filter(t => t.published !== false);
    published.sort((a, b) => (b.order || 0) - (a.order || 0) || new Date(b.createdAt) - new Date(a.createdAt));
    return res.json({ success: true, tutorials: published });
  } catch (error) {
    console.error('Tutorials fetch error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch tutorials' });
  }
});

app.get('/api/admin/tutorials', authenticateToken, requireAdmin, (req, res) => {
  try {
    const tutorials = loadTutorials();
    tutorials.sort((a, b) => (b.order || 0) - (a.order || 0) || new Date(b.createdAt) - new Date(a.createdAt));
    return res.json({ success: true, tutorials });
  } catch (error) {
    console.error('Admin tutorials fetch error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch tutorials' });
  }
});

app.post('/api/admin/tutorials', authenticateToken, requireAdmin, [
  body('title').isString().trim().notEmpty().withMessage('Title is required')
    .isLength({ max: 200 }).withMessage('Title too long'),
  body('description').optional().isString().trim().isLength({ max: 1000 }),
  body('videoUrl').isString().trim().notEmpty().withMessage('Video URL is required')
    .isLength({ max: 500 }).withMessage('URL too long'),
  body('category').optional().isString().trim().isLength({ max: 50 }),
  body('published').optional().isBoolean(),
], handleValidationErrors, (req, res) => {
  try {
    const { title, description, videoUrl, category, published } = req.body;

    const youtubeId = extractYouTubeId(videoUrl);
    if (!youtubeId) {
      return res.status(400).json({ success: false, message: 'Invalid YouTube URL. Please provide a valid YouTube video link.' });
    }

    const tutorials = loadTutorials();
    const tutorial = {
      id: `tut-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: title.trim(),
      description: (description || '').trim(),
      videoUrl: videoUrl.trim(),
      youtubeId,
      category: (category || 'General').trim(),
      published: published !== false,
      order: tutorials.length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: req.user.email,
    };

    tutorials.push(tutorial);
    saveTutorials(tutorials);

    return res.json({ success: true, tutorial, message: 'Tutorial added successfully' });
  } catch (error) {
    console.error('Tutorial create error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create tutorial' });
  }
});

app.patch('/api/admin/tutorials/:id', authenticateToken, requireAdmin, [
  param('id').isString().trim().notEmpty(),
  body('title').optional().isString().trim().isLength({ max: 200 }),
  body('description').optional().isString().trim().isLength({ max: 1000 }),
  body('videoUrl').optional().isString().trim().isLength({ max: 500 }),
  body('category').optional().isString().trim().isLength({ max: 50 }),
  body('published').optional().isBoolean(),
], handleValidationErrors, (req, res) => {
  try {
    const tutorials = loadTutorials();
    const idx = tutorials.findIndex(t => t.id === req.params.id);
    if (idx === -1) {
      return res.status(404).json({ success: false, message: 'Tutorial not found' });
    }

    const updates = req.body;
    if (updates.title !== undefined) tutorials[idx].title = updates.title.trim();
    if (updates.description !== undefined) tutorials[idx].description = updates.description.trim();
    if (updates.videoUrl !== undefined) {
      const newYoutubeId = extractYouTubeId(updates.videoUrl);
      if (!newYoutubeId) {
        return res.status(400).json({ success: false, message: 'Invalid YouTube URL. Please provide a valid YouTube video link.' });
      }
      tutorials[idx].videoUrl = updates.videoUrl.trim();
      tutorials[idx].youtubeId = newYoutubeId;
    }
    if (updates.category !== undefined) tutorials[idx].category = updates.category.trim();
    if (updates.published !== undefined) tutorials[idx].published = updates.published;
    tutorials[idx].updatedAt = new Date().toISOString();

    saveTutorials(tutorials);

    return res.json({ success: true, tutorial: tutorials[idx], message: 'Tutorial updated' });
  } catch (error) {
    console.error('Tutorial update error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update tutorial' });
  }
});

app.delete('/api/admin/tutorials/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const tutorials = loadTutorials();
    const idx = tutorials.findIndex(t => t.id === req.params.id);
    if (idx === -1) {
      return res.status(404).json({ success: false, message: 'Tutorial not found' });
    }

    tutorials.splice(idx, 1);
    saveTutorials(tutorials);

    return res.json({ success: true, message: 'Tutorial deleted' });
  } catch (error) {
    console.error('Tutorial delete error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete tutorial' });
  }
});

const TUTORIAL_COMMENTS_FILE = path.join(__dirname, 'tutorial_comments.json');

function loadTutorialComments() {
  try {
    if (fs.existsSync(TUTORIAL_COMMENTS_FILE)) {
      return JSON.parse(fs.readFileSync(TUTORIAL_COMMENTS_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('Error loading tutorial comments:', e);
  }
  return {};
}

function saveTutorialComments(data) {
  try {
    fs.writeFileSync(TUTORIAL_COMMENTS_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.error('Error saving tutorial comments:', e);
  }
}

const TUTORIAL_LIKES_FILE = path.join(__dirname, 'tutorial_likes.json');

function loadTutorialLikes() {
  try {
    if (fs.existsSync(TUTORIAL_LIKES_FILE)) {
      return JSON.parse(fs.readFileSync(TUTORIAL_LIKES_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('Error loading tutorial likes:', e);
  }
  return {};
}

function saveTutorialLikes(data) {
  try {
    fs.writeFileSync(TUTORIAL_LIKES_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.error('Error saving tutorial likes:', e);
  }
}

app.get('/api/tutorials/:id/likes', (req, res) => {
  try {
    const allLikes = loadTutorialLikes();
    const likers = allLikes[req.params.id] || [];
    const token = req.headers['authorization']?.split(' ')[1];
    let liked = false;
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        liked = likers.includes(decoded.userId?.toString());
      } catch (_) {}
    }
    return res.json({ success: true, count: likers.length, liked });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to load likes' });
  }
});

app.post('/api/tutorials/:id/like', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId?.toString();
    const allLikes = loadTutorialLikes();
    if (!allLikes[id]) allLikes[id] = [];
    const idx = allLikes[id].indexOf(userId);
    let liked;
    if (idx === -1) {
      allLikes[id].push(userId);
      liked = true;
    } else {
      allLikes[id].splice(idx, 1);
      liked = false;
    }
    saveTutorialLikes(allLikes);
    return res.json({ success: true, liked, count: allLikes[id].length });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to toggle like' });
  }
});

app.get('/api/tutorials/:id/comments', (req, res) => {
  try {
    const allComments = loadTutorialComments();
    const comments = (allComments[req.params.id] || []).slice(0, 100);
    return res.json({ success: true, comments });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to load comments' });
  }
});

app.post('/api/tutorials/:id/comments', authenticateToken, [
  body('text').isString().trim().notEmpty().withMessage('Comment cannot be empty')
    .isLength({ max: 500 }).withMessage('Comment too long (max 500 chars)'),
], handleValidationErrors, (req, res) => {
  try {
    const { id } = req.params;
    const tutorials = loadTutorials();
    if (!tutorials.find(t => t.id === id)) {
      return res.status(404).json({ success: false, message: 'Tutorial not found' });
    }
    const allComments = loadTutorialComments();
    if (!allComments[id]) allComments[id] = [];
    const userComments = allComments[id].filter(c => c.userId === req.user.userId);
    if (userComments.length >= 20) {
      return res.status(429).json({ success: false, message: 'Comment limit reached for this tutorial' });
    }
    const comment = {
      id: `c-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      text: req.body.text.trim(),
      userId: req.user.userId,
      username: req.user.username || req.user.email.split('@')[0],
      createdAt: new Date().toISOString(),
    };
    allComments[id].unshift(comment);
    if (allComments[id].length > 200) allComments[id] = allComments[id].slice(0, 200);
    saveTutorialComments(allComments);
    return res.json({ success: true, comment });
  } catch (e) {
    console.error('Tutorial comment post error:', e);
    return res.status(500).json({ success: false, message: 'Failed to post comment' });
  }
});

app.delete('/api/tutorials/:id/comments/:commentId', authenticateToken, (req, res) => {
  try {
    const { id, commentId } = req.params;
    const allComments = loadTutorialComments();
    if (!allComments[id]) return res.status(404).json({ success: false, message: 'No comments found' });
    const idx = allComments[id].findIndex(c => c.id === commentId);
    if (idx === -1) return res.status(404).json({ success: false, message: 'Comment not found' });
    const comment = allComments[id][idx];
    if (comment.userId !== req.user.userId && !req.user.isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    allComments[id].splice(idx, 1);
    saveTutorialComments(allComments);
    return res.json({ success: true, message: 'Comment deleted' });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to delete comment' });
  }
});

const COMMUNITY_MESSAGES_FILE = path.join(__dirname, 'community_messages.json');
const COMMUNITY_ACTIVE_FILE = path.join(__dirname, 'community_active.json');
const COMMUNITY_MAX_MESSAGES = 200;

function loadCommunityMessages() {
  try {
    if (fs.existsSync(COMMUNITY_MESSAGES_FILE)) {
      return JSON.parse(fs.readFileSync(COMMUNITY_MESSAGES_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('Error loading community messages:', e);
  }
  return [];
}

function saveCommunityMessages(messages) {
  try {
    if (messages.length > COMMUNITY_MAX_MESSAGES) {
      messages = messages.slice(-COMMUNITY_MAX_MESSAGES);
    }
    fs.writeFileSync(COMMUNITY_MESSAGES_FILE, JSON.stringify(messages, null, 2), 'utf8');
  } catch (e) {
    console.error('Error saving community messages:', e);
  }
}

function trackActiveUser(userId) {
  try {
    let active = {};
    if (fs.existsSync(COMMUNITY_ACTIVE_FILE)) {
      active = JSON.parse(fs.readFileSync(COMMUNITY_ACTIVE_FILE, 'utf8'));
    }
    active[userId] = Date.now();
    const fiveMinAgo = Date.now() - 5 * 60 * 1000;
    for (const uid of Object.keys(active)) {
      if (active[uid] < fiveMinAgo) delete active[uid];
    }
    fs.writeFileSync(COMMUNITY_ACTIVE_FILE, JSON.stringify(active), 'utf8');
    return Object.keys(active).length;
  } catch (e) {
    return 0;
  }
}

const communityLimiter = noopMiddleware;

app.get('/api/community/messages', authenticateToken, (req, res) => {
  try {
    const messages = loadCommunityMessages();
    const onlineCount = trackActiveUser(req.user.userId);
    return res.json({ success: true, messages, onlineCount });
  } catch (error) {
    console.error('Community fetch error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load messages' });
  }
});

app.post('/api/community/messages',
  authenticateToken,
  communityLimiter,
  body('message').isString().trim().isLength({ min: 1, max: 500 }).withMessage('Message must be 1-500 characters'),
  body('replyTo').optional().isString().trim(),
  handleValidationErrors,
  (req, res) => {
    try {
      const messages = loadCommunityMessages();
      const newMsg = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        userId: req.user.userId,
        username: req.user.username || req.user.email.split('@')[0],
        isAdmin: req.user.isAdmin || false,
        message: sanitizeString(req.body.message),
        createdAt: new Date().toISOString(),
      };

      if (req.body.replyTo) {
        const replyMsg = messages.find(m => m.id === req.body.replyTo);
        if (replyMsg) {
          newMsg.replyTo = {
            id: replyMsg.id,
            username: replyMsg.username,
            message: replyMsg.message.length > 100 ? replyMsg.message.slice(0, 100) + '...' : replyMsg.message,
          };
        }
      }

      messages.push(newMsg);
      saveCommunityMessages(messages);
      return res.json({ success: true, message: newMsg });
    } catch (error) {
      console.error('Community send error:', error);
      return res.status(500).json({ success: false, message: 'Failed to send message' });
    }
  }
);

app.patch('/api/community/messages/:messageId',
  authenticateToken,
  body('message').isString().trim().isLength({ min: 1, max: 500 }).withMessage('Message must be 1-500 characters'),
  handleValidationErrors,
  (req, res) => {
    try {
      const messages = loadCommunityMessages();
      const msgIndex = messages.findIndex(m => m.id === req.params.messageId);
      if (msgIndex === -1) {
        return res.status(404).json({ success: false, message: 'Message not found' });
      }
      const msg = messages[msgIndex];
      if (msg.userId !== req.user.userId) {
        return res.status(403).json({ success: false, message: 'You can only edit your own messages' });
      }
      msg.message = sanitizeString(req.body.message);
      msg.edited = true;
      msg.editedAt = new Date().toISOString();
      messages[msgIndex] = msg;
      saveCommunityMessages(messages);
      return res.json({ success: true, message: msg });
    } catch (error) {
      console.error('Community edit error:', error);
      return res.status(500).json({ success: false, message: 'Failed to edit message' });
    }
  }
);

app.delete('/api/community/messages/:messageId', authenticateToken, (req, res) => {
  try {
    const messages = loadCommunityMessages();
    const msgIndex = messages.findIndex(m => m.id === req.params.messageId);
    if (msgIndex === -1) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }
    const msg = messages[msgIndex];
    if (msg.userId !== req.user.userId && !req.user.isAdmin) {
      return res.status(403).json({ success: false, message: 'You can only delete your own messages' });
    }
    messages.splice(msgIndex, 1);
    saveCommunityMessages(messages);
    return res.json({ success: true });
  } catch (error) {
    console.error('Community delete error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete message' });
  }
});

// ============================================================
// BOT CATALOG
// ============================================================
const BOT_CATALOG_FILE = path.join(__dirname, 'bot_catalog.json');
const BOT_DEPLOYMENTS_FILE = path.join(__dirname, 'bot_deployments.json');

function loadBotCatalog() {
  try {
    if (fs.existsSync(BOT_CATALOG_FILE)) return JSON.parse(fs.readFileSync(BOT_CATALOG_FILE, 'utf8'));
  } catch (e) { console.error('Error loading bot catalog:', e); }
  return [];
}
function saveBotCatalog(data) {
  try { fs.writeFileSync(BOT_CATALOG_FILE, JSON.stringify(data, null, 2), 'utf8'); } catch (e) { console.error('Error saving bot catalog:', e); }
}

function loadBotDeployments() {
  try {
    if (fs.existsSync(BOT_DEPLOYMENTS_FILE)) return JSON.parse(fs.readFileSync(BOT_DEPLOYMENTS_FILE, 'utf8'));
  } catch (e) { console.error('Error loading bot deployments:', e); }
  return [];
}
function saveBotDeployments(data) {
  try { fs.writeFileSync(BOT_DEPLOYMENTS_FILE, JSON.stringify(data, null, 2), 'utf8'); } catch (e) { console.error('Error saving bot deployments:', e); }
}

const BOT_DEPLOYMENT_PRICE = 50;

// ============================================================
// DIRECT BOT RUNNER (wolfdeploy-style — no Pterodactyl)
// ============================================================
const DIRECT_DEPLOYMENTS_FILE = path.join(__dirname, 'direct_deployments.json');
const BOTS_BASE_DIR = process.env.BOTS_BASE_DIR || path.join(tmpdir(), 'wolfhost-bots');
const BOT_LOG_DIR   = path.join(__dirname, 'bot_logs');
const BOT_RUNNER    = path.join(__dirname, 'bot_runner.cjs');
fs.mkdirSync(BOTS_BASE_DIR, { recursive: true });
fs.mkdirSync(BOT_LOG_DIR,   { recursive: true });

// In-memory store of running processes + logs
const _directProcesses = new Map(); // id → ChildProcess (runner pid handle, for newly launched)
const _directLogs = new Map();      // id → [{ts, level, msg}]  (install-phase only; bot logs on disk)
const _directStatus = new Map();    // id → 'queued'|'deploying'|'running'|'stopped'|'failed'

// ── Log-file helpers ──────────────────────────────────────────────────────
function getBotLogFile(id) { return path.join(BOT_LOG_DIR, `${id}.jsonl`); }

function readBotLogFile(id, since = 0) {
  const file = getBotLogFile(id);
  if (!fs.existsSync(file)) return [];
  try {
    const lines = fs.readFileSync(file, 'utf8').split('\n').filter(Boolean);
    return lines.slice(since).map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  } catch { return []; }
}

function countBotLogLines(id) {
  const file = getBotLogFile(id);
  if (!fs.existsSync(file)) return 0;
  try { return fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).length; } catch { return 0; }
}

function appendBotLog(id, level, msg) {
  try {
    const line = JSON.stringify({ ts: new Date().toISOString(), level, msg }) + '\n';
    fs.appendFileSync(getBotLogFile(id), line, 'utf8');
  } catch {}
}

// ── PID liveness check ───────────────────────────────────────────────────
function isPidAlive(pid) {
  if (!pid) return false;
  try { process.kill(pid, 0); return true; } catch { return false; }
}

function loadDirectDeployments() {
  try {
    if (fs.existsSync(DIRECT_DEPLOYMENTS_FILE)) return JSON.parse(fs.readFileSync(DIRECT_DEPLOYMENTS_FILE, 'utf8'));
  } catch (e) { console.error('Error loading direct deployments:', e); }
  return [];
}
function saveDirectDeployments(data) {
  try { fs.writeFileSync(DIRECT_DEPLOYMENTS_FILE, JSON.stringify(data, null, 2), 'utf8'); } catch (e) { console.error('Error saving direct deployments:', e); }
}
function addDirectLog(id, level, msg) {
  if (!_directLogs.has(id)) _directLogs.set(id, []);
  const logs = _directLogs.get(id);
  if (logs.length >= 800) logs.shift();
  const entry = { ts: new Date().toISOString(), level, msg };
  logs.push(entry);
  appendBotLog(id, level, msg);
}
function setDirectStatus(id, status) {
  _directStatus.set(id, status);
  // Persist to JSON too
  const all = loadDirectDeployments();
  const idx = all.findIndex(d => d.id === id);
  if (idx !== -1) { all[idx].status = status; all[idx].updatedAt = new Date().toISOString(); saveDirectDeployments(all); }
}

// On startup: check which bots are still alive (by PID) — reconnect if alive, restart if dead
(function recoverDirectDeployments() {
  const all = loadDirectDeployments();
  let stillAlive = 0, needRestart = 0;
  const toRestart = [];

  all.forEach(d => {
    _directLogs.set(d.id, []);

    if (d.status === 'stopped' || d.status === 'failed') {
      _directStatus.set(d.id, d.status);
      return;
    }

    if (d.status === 'running' || d.status === 'deploying' || d.status === 'queued') {
      if (isPidAlive(d.runnerPid)) {
        // Bot is still running — no action needed, just reconnect status
        _directStatus.set(d.id, 'running');
        stillAlive++;
        serverLog(`[DirectRunner] Bot ${d.id} (PID ${d.runnerPid}) still alive — reconnected`);
      } else {
        _directStatus.set(d.id, 'queued');
        toRestart.push(d);
        needRestart++;
      }
    }
  });

  serverLog(`[DirectRunner] Recovered ${all.length} deployment(s): ${stillAlive} alive, ${needRestart} will restart`);

  // Stagger restarts so we don't hammer git/npm at once
  toRestart.forEach((d, idx) => {
    setTimeout(() => {
      serverLog(`[DirectRunner] Restarting dead deployment ${d.id} (${d.botName || d.botId})`);
      appendBotLog(d.id, 'info', '[WolfHost] Server restarted — bot was not running, restarting now…');
      const saved = loadDirectDeployments();
      const entry = saved.find(s => s.id === d.id);
      if (entry) { entry.status = 'queued'; entry.updatedAt = new Date().toISOString(); saveDirectDeployments(saved); }
      runDirectDeployment(d.id, d.repoUrl, d.mainFile || 'index.js', d.envVars || {}).catch(e => {
        serverLog(`[DirectRunner] Auto-restart failed for ${d.id}: ${e.message}`);
      });
    }, idx * 6000);
  });
})();

async function spawnStep(deployId, cmd, args, opts) {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { ...opts, stdio: ['ignore', 'pipe', 'pipe'] });
    proc.stdout?.on('data', d => d.toString().split('\n').forEach(l => l.trim() && addDirectLog(deployId, 'info', l.trim())));
    proc.stderr?.on('data', d => d.toString().split('\n').forEach(l => l.trim() && addDirectLog(deployId, 'warn', l.trim())));
    proc.on('close', code => code === 0 ? resolve() : reject(new Error(`${cmd} exited with code ${code}`)));
    proc.on('error', reject);
  });
}

async function runDirectDeployment(deployId, repoUrl, mainFile, envVars) {
  const deployDir = path.join(BOTS_BASE_DIR, deployId);
  try {
    setDirectStatus(deployId, 'deploying');

    // Step 1: git clone (skip if already cloned)
    if (!fs.existsSync(path.join(deployDir, 'package.json'))) {
      addDirectLog(deployId, 'info', `Cloning ${repoUrl}...`);
      fs.mkdirSync(deployDir, { recursive: true });
      await spawnStep(deployId, 'git', ['clone', '--depth=1', repoUrl, deployDir], {});
      addDirectLog(deployId, 'success', 'Repository cloned.');

      // Step 2: npm install
      addDirectLog(deployId, 'info', 'Installing dependencies (npm install)...');
      await spawnStep(deployId, 'npm', ['install', '--legacy-peer-deps', '--no-audit', '--prefer-offline'], { cwd: deployDir });
      addDirectLog(deployId, 'success', 'Dependencies installed.');
    } else {
      addDirectLog(deployId, 'info', 'Repository already present — skipping clone & install.');
    }

    // Step 3: write .env
    // Compute unique port now so it goes into .env too (for bots that read PORT via dotenv)
    const _botPort = 10000 + (parseInt(deployId.replace(/-/g, '').slice(0, 6), 16) % 50000);
    const envFilePath = path.join(deployDir, '.env');
    if (!fs.existsSync(envFilePath)) {
      // Fresh deploy — write all env vars including PORT
      const envWithPort = { ...envVars, PORT: String(_botPort) };
      const envLines = Object.entries(envWithPort).map(([k, v]) => `${k}="${String(v).replace(/"/g, '\\"')}"`).join('\n');
      fs.writeFileSync(envFilePath, envLines + '\n', 'utf8');
      addDirectLog(deployId, 'info', `Environment set (${Object.keys(envVars).length} vars, port=${_botPort}).`);
    } else {
      // Restart — preserve the existing .env so bot-written changes (session files, updated vars) survive
      addDirectLog(deployId, 'info', `Preserving existing .env on restart (port=${_botPort}).`);
    }

    // Step 4: launch bot as a DETACHED runner process (survives WolfHost restarts)
    const entryFile = mainFile || 'index.js';
    addDirectLog(deployId, 'info', `Launching detached runner: node ${entryFile}`);
    const botEnv = {
      ...process.env,
      ...envVars,
      PORT: String(_botPort),
      NODE_ENV: 'production',
      WOLFHOST_LOG_FILE: getBotLogFile(deployId),
    };
    addDirectLog(deployId, 'info', `Assigned bot port: ${_botPort}`);
    const runner = spawn(process.execPath, [BOT_RUNNER, entryFile, deployDir], {
      cwd: deployDir,
      env: botEnv,
      detached: true,
      stdio: 'ignore',
    });
    runner.unref(); // Detach from parent — survives server restart

    const runnerPid = runner.pid;
    _directProcesses.set(deployId, runner);
    setDirectStatus(deployId, 'running');

    // Save PID to deployment record so we can kill/check it on restart
    const allDeps = loadDirectDeployments();
    const depIdx = allDeps.findIndex(d => d.id === deployId);
    if (depIdx !== -1) { allDeps[depIdx].runnerPid = runnerPid; allDeps[depIdx].envVars = envVars; saveDirectDeployments(allDeps); }

    addDirectLog(deployId, 'success', `Bot runner started (PID ${runnerPid}) — bot output streaming to log file`);

  } catch (err) {
    addDirectLog(deployId, 'error', `Deployment failed: ${err.message}`);
    setDirectStatus(deployId, 'failed');
  }
}

// POST /api/bots/direct-deploy
app.post('/api/bots/direct-deploy', authenticateToken, [
  body('botId').isString().trim().notEmpty(),
  body('serverName').isString().trim().notEmpty().isLength({ max: 100 }),
  body('envVars').optional().isObject(),
], handleValidationErrors, async (req, res) => {
  try {
    const userId = req.user.userId;
    const userEmail = req.user.email;
    const { botId, serverName, envVars = {} } = req.body;

    const catalog = loadBotCatalog();
    const bot = catalog.find(b => b.id === botId && b.active !== false);
    if (!bot) return res.status(404).json({ success: false, message: 'Bot not found in catalog' });

    const price = bot.priceKES || BOT_DEPLOYMENT_PRICE;
    const isAdmin = req.user.isAdmin || false;
    if (!isAdmin) {
      const balance = await verifyUserBalance(userEmail, price);
      if (balance < price) {
        return res.status(402).json({ success: false, message: `Insufficient balance. Need KES ${price}, have KES ${balance.toFixed(2)}.` });
      }
    }

    const id = crypto.randomUUID();
    const deployment = {
      id,
      type: 'direct',
      userId: userId.toString(),
      userEmail: userEmail.toLowerCase(),
      botId: bot.id,
      botName: bot.name,
      serverName: serverName.trim(),
      repoUrl: bot.repoUrl,
      mainFile: bot.mainFile || 'index.js',
      envVars,
      priceKES: price,
      status: 'queued',
      deployedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const all = loadDirectDeployments();
    all.push(deployment);
    saveDirectDeployments(all);
    _directStatus.set(id, 'queued');
    _directLogs.set(id, [{ ts: new Date().toISOString(), level: 'info', msg: `Deployment "${serverName}" queued for "${bot.name}"` }]);

    if (!isAdmin) recordSpending(userEmail, price, `Direct Bot "${bot.name}"`, id);
    addNotification(userId, 'server', 'Bot Deploying', `Your "${bot.name}" bot is starting up!`);

    // Start deployment in background (non-blocking)
    runDirectDeployment(id, bot.repoUrl, bot.mainFile || 'index.js', envVars).catch(() => {});

    return res.json({ success: true, deploymentId: id, botName: bot.name, serverName: serverName.trim() });
  } catch (e) {
    console.error('Direct deploy error:', e);
    return res.status(500).json({ success: false, message: 'Deployment failed. Please try again.' });
  }
});

// GET /api/bots/my-direct-deployments
app.get('/api/bots/my-direct-deployments', authenticateToken, (req, res) => {
  const userId = req.user.userId.toString();
  const all = loadDirectDeployments().filter(d => d.userId === userId);
  const result = all.map(d => {
    // Reconcile live PID status
    const status = (() => {
      const mem = _directStatus.get(d.id) || d.status;
      if (mem === 'running' && d.runnerPid && !isPidAlive(d.runnerPid)) return 'stopped';
      return mem;
    })();
    return { ...d, status, logCount: countBotLogLines(d.id) };
  });
  return res.json({ success: true, deployments: result });
});

// GET /api/bots/direct/:id/logs — reads from persistent JSONL log file
app.get('/api/bots/direct/:id/logs', authenticateToken, (req, res) => {
  const userId = req.user.userId.toString();
  const all = loadDirectDeployments();
  const dep = all.find(d => d.id === req.params.id && d.userId === userId);
  if (!dep) return res.status(404).json({ success: false, message: 'Deployment not found' });

  // Live-check PID so status stays accurate
  let status = _directStatus.get(req.params.id) || dep.status;
  if (status === 'running' && dep.runnerPid && !isPidAlive(dep.runnerPid)) {
    status = 'stopped';
    _directStatus.set(req.params.id, 'stopped');
  }

  const total = countBotLogLines(req.params.id);
  let logs, startAt;
  if (req.query.tail) {
    const tail = Math.max(1, parseInt(req.query.tail) || 200);
    startAt = Math.max(0, total - tail);
    logs = readBotLogFile(req.params.id, startAt);
  } else {
    startAt = req.query.since ? Math.max(0, parseInt(req.query.since)) : 0;
    logs = readBotLogFile(req.params.id, startAt);
  }
  return res.json({ success: true, status, logs, total, startAt });
});

function killRunnerPid(dep, id) {
  // Try in-memory handle first, fall back to saved PID from disk
  const proc = _directProcesses.get(id);
  if (proc) { try { proc.kill('SIGTERM'); } catch {} _directProcesses.delete(id); }
  if (dep.runnerPid && isPidAlive(dep.runnerPid)) {
    try { process.kill(dep.runnerPid, 'SIGTERM'); } catch {}
    setTimeout(() => { if (isPidAlive(dep.runnerPid)) { try { process.kill(dep.runnerPid, 'SIGKILL'); } catch {} } }, 4000);
  }
}

// POST /api/bots/direct/:id/stop
app.post('/api/bots/direct/:id/stop', authenticateToken, async (req, res) => {
  const userId = req.user.userId.toString();
  const all = loadDirectDeployments();
  const dep = all.find(d => d.id === req.params.id && d.userId === userId);
  if (!dep) return res.status(404).json({ success: false, message: 'Deployment not found' });

  appendBotLog(req.params.id, 'warn', '[WolfHost] Stop requested — sending SIGTERM to runner…');
  killRunnerPid(dep, req.params.id);
  setDirectStatus(req.params.id, 'stopped');
  appendBotLog(req.params.id, 'info', '[WolfHost] Bot stopped.');
  return res.json({ success: true });
});

// POST /api/bots/direct/:id/restart
app.post('/api/bots/direct/:id/restart', authenticateToken, async (req, res) => {
  const userId = req.user.userId.toString();
  const all = loadDirectDeployments();
  const dep = all.find(d => d.id === req.params.id && d.userId === userId);
  if (!dep) return res.status(404).json({ success: false, message: 'Deployment not found' });

  appendBotLog(req.params.id, 'info', '[WolfHost] Restart requested — stopping old process…');
  killRunnerPid(dep, req.params.id);
  appendBotLog(req.params.id, 'info', '[WolfHost] Restarting bot…');
  setDirectStatus(req.params.id, 'queued');
  runDirectDeployment(req.params.id, dep.repoUrl, dep.mainFile, dep.envVars || {}).catch(() => {});
  return res.json({ success: true });
});

// DELETE /api/bots/direct/:id
app.delete('/api/bots/direct/:id', authenticateToken, async (req, res) => {
  const userId = req.user.userId.toString();
  const all = loadDirectDeployments();
  const idx = all.findIndex(d => d.id === req.params.id && d.userId === userId);
  if (idx === -1) return res.status(404).json({ success: false, message: 'Deployment not found' });

  const dep = all[idx];
  killRunnerPid(dep, dep.id);

  const deployDir = path.join(BOTS_BASE_DIR, dep.id);
  try { if (fs.existsSync(deployDir)) fs.rmSync(deployDir, { recursive: true, force: true }); } catch (_) {}
  try { const lf = getBotLogFile(dep.id); if (fs.existsSync(lf)) fs.unlinkSync(lf); } catch (_) {}

  all.splice(idx, 1);
  saveDirectDeployments(all);
  _directLogs.delete(dep.id);
  _directStatus.delete(dep.id);

  return res.json({ success: true });
});

// ============================================================
// END DIRECT BOT RUNNER
// ============================================================


// Admin: list bots in catalog
app.get('/api/admin/bot-catalog', adminLimiter, authenticateToken, requireAdmin, (req, res) => {
  return res.json({ success: true, bots: loadBotCatalog() });
});

// Helper: auto-fetch app.json from a GitHub repo URL
async function resolveAppJsonFromRepo(repoUrl) {
  if (!repoUrl) return {};
  try {
    // Convert https://github.com/owner/repo[.git][/...] → raw URL
    const clean = repoUrl.trim().replace(/\.git$/, '').replace(/\/$/, '');
    const match = clean.match(/github\.com\/([^/]+)\/([^/]+)/);
    if (!match) return {};
    const [, owner, repo] = match;
    // Try main then master
    for (const branch of ['main', 'master']) {
      const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/app.json`;
      try {
        const r = await fetch(rawUrl, { signal: AbortSignal.timeout(8000) });
        if (r.ok) {
          const appJson = await r.json();
          serverLog(`[app.json] Resolved from ${rawUrl}`);
          return {
            appJsonUrl: rawUrl,
            appJsonName: appJson.name || '',
            appJsonDescription: appJson.description || '',
            appJsonEnv: appJson.env || {},
            appJsonKeywords: appJson.keywords || [],
          };
        }
      } catch (_) {}
    }
    serverLog(`[app.json] No app.json found in ${owner}/${repo} (tried main & master)`);
  } catch (e) {
    serverLog('[app.json] Resolution error:', e.message);
  }
  return {};
}

// Admin: add bot to catalog
app.post('/api/admin/bot-catalog', adminLimiter, authenticateToken, requireAdmin, [
  body('name').isString().trim().notEmpty().isLength({ max: 100 }),
  body('description').isString().trim().notEmpty().isLength({ max: 500 }),
  body('repoUrl').isString().trim().notEmpty().isLength({ max: 500 }),
  body('tag').optional({ nullable: true }).isString().trim().isLength({ max: 50 }),
  body('priceKES').optional().isNumeric(),
  body('ramMB').optional().isNumeric(),
  body('diskMB').optional().isNumeric(),
  body('mainFile').optional({ nullable: true }).isString().trim().isLength({ max: 100 }),
], handleValidationErrors, async (req, res) => {
  try {
    const { name, description, repoUrl, tag, priceKES, ramMB, diskMB, mainFile } = req.body;
    const bots = loadBotCatalog();

    const resolvedConfig = await resolveAppJsonFromRepo(repoUrl);

    const bot = {
      id: crypto.randomUUID(),
      name: name.trim(),
      description: description.trim(),
      repoUrl: repoUrl.trim(),
      tag: tag?.trim() || 'bot',
      priceKES: Number(priceKES) || BOT_DEPLOYMENT_PRICE,
      ramMB: Number(ramMB) || 512,
      diskMB: Number(diskMB) || 1024,
      mainFile: mainFile?.trim() || 'index.js',
      ...resolvedConfig,
      createdAt: new Date().toISOString(),
      active: true,
    };

    bots.push(bot);
    saveBotCatalog(bots);
    return res.json({ success: true, bot });
  } catch (e) {
    console.error('Add bot catalog error:', e);
    return res.status(500).json({ success: false, message: 'Failed to add bot' });
  }
});

// Admin: update bot in catalog
app.patch('/api/admin/bot-catalog/:id', adminLimiter, authenticateToken, requireAdmin, async (req, res) => {
  try {
    const bots = loadBotCatalog();
    const idx = bots.findIndex(b => b.id === req.params.id);
    if (idx === -1) return res.status(404).json({ success: false, message: 'Bot not found' });
    const allowed = ['name', 'description', 'repoUrl', 'tag', 'priceKES', 'ramMB', 'diskMB', 'mainFile', 'active', 'imageUrl', 'pairUrl'];
    allowed.forEach(k => { if (req.body[k] !== undefined) bots[idx][k] = req.body[k]; });
    // Re-resolve app.json if repoUrl changed
    if (req.body.repoUrl) {
      const resolved = await resolveAppJsonFromRepo(req.body.repoUrl);
      Object.assign(bots[idx], resolved);
    }
    saveBotCatalog(bots);
    return res.json({ success: true, bot: bots[idx] });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to update bot' });
  }
});

// Admin: delete bot from catalog
app.delete('/api/admin/bot-catalog/:id', adminLimiter, authenticateToken, requireAdmin, (req, res) => {
  try {
    const bots = loadBotCatalog();
    const idx = bots.findIndex(b => b.id === req.params.id);
    if (idx === -1) return res.status(404).json({ success: false, message: 'Bot not found' });
    bots.splice(idx, 1);
    saveBotCatalog(bots);
    return res.json({ success: true });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to delete bot' });
  }
});

// Public: list active bots (authenticated users)
app.get('/api/bots/catalog', authenticateToken, (req, res) => {
  const bots = loadBotCatalog().filter(b => b.active !== false);
  const allDeps = loadDirectDeployments();
  const botsWithCount = bots.map(b => ({
    ...b,
    deploymentCount: allDeps.filter(d => d.botId === b.id).length,
  }));
  return res.json({ success: true, bots: botsWithCount });
});

// In-memory cache: appjson per botId, TTL 5 min
const _appJsonCache = new Map(); // botId → { data, fetchedAt }

// Public: get live (fresh) app.json for a bot — fetches direct from GitHub, 5-min cache
app.get('/api/bots/catalog/:id/live-appjson', authenticateToken, async (req, res) => {
  const bots = loadBotCatalog();
  const bot = bots.find(b => b.id === req.params.id);
  if (!bot) return res.status(404).json({ success: false, message: 'Bot not found' });

  const cached = _appJsonCache.get(bot.id);
  if (cached && Date.now() - cached.fetchedAt < 5 * 60 * 1000) {
    return res.json({ success: true, fromCache: true, ...cached.data });
  }

  // Fetch fresh from GitHub
  const resolved = await resolveAppJsonFromRepo(bot.repoUrl);
  const data = {
    appJsonEnv: resolved.appJsonEnv || bot.appJsonEnv || {},
    appJsonName: resolved.appJsonName || bot.appJsonName || bot.name,
    appJsonDescription: resolved.appJsonDescription || bot.appJsonDescription || bot.description,
    appJsonKeywords: resolved.appJsonKeywords || bot.appJsonKeywords || [],
  };
  _appJsonCache.set(bot.id, { data, fetchedAt: Date.now() });
  return res.json({ success: true, fromCache: false, ...data });
});

// Admin: force-refresh app.json for a bot from GitHub and save to catalog
app.post('/api/admin/bot-catalog/:id/refresh-appjson', adminLimiter, authenticateToken, requireAdmin, async (req, res) => {
  try {
    const bots = loadBotCatalog();
    const idx = bots.findIndex(b => b.id === req.params.id);
    if (idx === -1) return res.status(404).json({ success: false, message: 'Bot not found' });

    const resolved = await resolveAppJsonFromRepo(bots[idx].repoUrl);
    if (!resolved.appJsonUrl) {
      return res.status(422).json({ success: false, message: 'No app.json found in the repository (tried main & master branches)' });
    }

    Object.assign(bots[idx], resolved);
    saveBotCatalog(bots);
    // Also invalidate in-memory cache
    _appJsonCache.delete(req.params.id);
    return res.json({ success: true, bot: bots[idx], message: 'app.json refreshed successfully' });
  } catch (e) {
    console.error('Refresh appjson error:', e);
    return res.status(500).json({ success: false, message: 'Failed to refresh app.json' });
  }
});

// User: deploy a bot
app.post('/api/bots/deploy', authenticateToken, [
  body('botId').isString().trim().notEmpty(),
  body('serverName').isString().trim().notEmpty().isLength({ max: 100 })
    .matches(/^[a-zA-Z0-9_\-. ]+$/).withMessage('Server name contains invalid characters'),
  body('sessionId').optional({ nullable: true }).isString().isLength({ max: 500000 }).withMessage('Session ID is too long'),
  body('envOverrides').optional().isObject(),
], handleValidationErrors, async (req, res) => {
  try {
    const userId = req.user.userId;
    const userEmail = req.user.email;
    const { botId, serverName, sessionId, envOverrides = {} } = req.body;

    const catalog = loadBotCatalog();
    const bot = catalog.find(b => b.id === botId && b.active !== false);
    if (!bot) return res.status(404).json({ success: false, message: 'Bot not found in catalog' });

    const price = bot.priceKES || BOT_DEPLOYMENT_PRICE;
    const isAdmin = req.user.isAdmin || false;
    if (!isAdmin) {
      const balance = await verifyUserBalance(userEmail, price);
      if (balance < price) {
        return res.status(402).json({
          success: false,
          message: `Insufficient balance. You need KES ${price} but have KES ${balance.toFixed(2)}. Please top up your wallet first.`,
        });
      }
    }

    const allocationId = await findFreeAllocation();
    if (!allocationId) return res.status(503).json({ success: false, message: 'No available ports. Please try again later.' });

    const eggEnv = await getEggEnvironment();
    const botEnv = {
      ...eggEnv,
      GIT_ADDRESS: bot.repoUrl,
      MAIN_FILE: bot.mainFile || 'index.js',
      AUTO_UPDATE: '0',
      USER_UPLOAD: '0',
      ...(sessionId ? { SESSION_ID: sessionId } : {}),
      ...envOverrides,
    };

    const serverPayload = {
      name: serverName.trim(),
      user: parseInt(userId),
      egg: SERVER_EGG_ID,
      nest: SERVER_NEST_ID,
      docker_image: cachedEggDockerImage || SERVER_DOCKER_IMAGE,
      startup: cachedEggStartup || SERVER_STARTUP,
      environment: botEnv,
      limits: {
        memory: bot.ramMB || 512,
        swap: 0,
        disk: bot.diskMB || 1024,
        io: 500,
        cpu: 100,
      },
      feature_limits: { databases: 0, allocations: 1, backups: 1 },
      allocation: { default: allocationId },
      description: `WolfHost Bot: ${bot.name}`,
      start_on_completion: true,
      external_id: `wolfbot-${userId}-${Date.now()}`,
    };

    let pteroResponse;
    try {
      pteroResponse = await pteroFetch('/servers', {
        method: 'POST',
        body: JSON.stringify(serverPayload),
        signal: AbortSignal.timeout(20000),
      });
    } catch (fetchErr) {
      const isTimeout = fetchErr.name === 'TimeoutError' || fetchErr.name === 'AbortError';
      return res.status(503).json({ success: false, message: isTimeout ? 'Panel timed out. Please try again.' : 'Could not reach the panel.' });
    }

    const pteroData = await pteroResponse.json();
    if (!pteroResponse.ok) {
      const errs = pteroData.errors?.map(e => e.detail || e.code).filter(Boolean).join(', ') || 'Failed to create server on panel';
      return res.status(pteroResponse.status || 500).json({ success: false, message: errs });
    }

    const serverAttrs = pteroData.attributes;
    if (!isAdmin) recordSpending(userEmail, price, `Bot "${bot.name}" deployment`, serverAttrs.id);

    const deployment = {
      id: crypto.randomUUID(),
      userId: userId.toString(),
      userEmail: userEmail.toLowerCase(),
      botId: bot.id,
      botName: bot.name,
      serverId: serverAttrs.id,
      serverIdentifier: serverAttrs.identifier,
      serverName: serverAttrs.name,
      sessionId: sessionId || '',
      priceKES: price,
      status: 'running',
      deployedAt: new Date().toISOString(),
    };
    const deployments = loadBotDeployments();
    deployments.push(deployment);
    saveBotDeployments(deployments);

    addNotification(userId, 'server', 'Bot Deployed', `Your "${bot.name}" bot "${serverName}" is now deploying!`);

    return res.json({ success: true, deployment, server: { id: serverAttrs.id, identifier: serverAttrs.identifier, name: serverAttrs.name } });
  } catch (e) {
    console.error('Bot deploy error:', e);
    return res.status(500).json({ success: false, message: 'Deployment failed. Please try again.' });
  }
});

// User: my deployed bots
app.get('/api/bots/my-deployments', authenticateToken, (req, res) => {
  const userId = req.user.userId.toString();
  const deployments = loadBotDeployments().filter(d => d.userId === userId);
  return res.json({ success: true, deployments });
});

// User: delete a bot deployment (just removes from list; server remains on panel)
app.delete('/api/bots/my-deployments/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId.toString();
    const deployments = loadBotDeployments();
    const idx = deployments.findIndex(d => d.id === req.params.id && d.userId === userId);
    if (idx === -1) return res.status(404).json({ success: false, message: 'Deployment not found' });

    const dep = deployments[idx];
    try {
      await pteroFetch(`/servers/${dep.serverId}`, { method: 'DELETE', signal: AbortSignal.timeout(10000) });
    } catch (e) { serverLog('Could not delete panel server:', e.message); }

    deployments.splice(idx, 1);
    saveBotDeployments(deployments);
    return res.json({ success: true });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to remove deployment' });
  }
});

// User: get live status of a bot server from Pterodactyl
app.get('/api/bots/server-status/:serverId', authenticateToken, async (req, res) => {
  const userId = req.user.userId.toString();
  const { serverId } = req.params;
  // Verify this server belongs to the requesting user
  const deployments = loadBotDeployments();
  const dep = deployments.find(d => d.serverId === serverId && d.userId === userId);
  if (!dep) return res.status(404).json({ success: false, message: 'Deployment not found' });

  try {
    const r = await pteroFetch(`/servers/${serverId}`);
    if (!r.ok) return res.status(r.status).json({ success: false, message: 'Could not reach panel' });
    const data = await r.json();
    const attrs = data.attributes;
    let phase = 'running';
    if (attrs.status === 'installing') phase = 'installing';
    else if (attrs.status === 'suspended') phase = 'suspended';
    else if (attrs.is_installing) phase = 'installing';
    else if (attrs.is_suspended) phase = 'suspended';
    return res.json({
      success: true,
      serverId: attrs.id,
      identifier: attrs.identifier,
      name: attrs.name,
      status: attrs.status,
      phase,
      isInstalling: attrs.is_installing || attrs.status === 'installing',
      isSuspended: attrs.is_suspended || attrs.status === 'suspended',
      deployment: dep,
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to fetch server status' });
  }
});

// Admin: all deployments
app.get('/api/admin/bot-deployments', adminLimiter, authenticateToken, requireAdmin, (req, res) => {
  return res.json({ success: true, deployments: loadBotDeployments() });
});

const distPath = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath, {
    setHeaders: (res, filePath) => {
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      res.set('X-Content-Type-Options', 'nosniff');
      if (filePath.endsWith('.js') || filePath.endsWith('.css')) {
        res.set('Cache-Control', 'public, max-age=31536000, immutable');
      }
      if (filePath.endsWith('.map')) {
        res.status(404).end();
        return;
      }
    },
    dotfiles: 'deny',
    index: false,
  }));

  app.use((req, res, next) => {
    if (req.path.endsWith('.map')) {
      return res.status(404).json({ message: 'Not found' });
    }
    next();
  });

  app.use((req, res, next) => {
    if (!req.path.startsWith('/api/')) {
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.set('X-Content-Type-Options', 'nosniff');
      res.sendFile(path.join(distPath, 'index.html'));
    } else {
      next();
    }
  });
} else {
  app.get('/', (req, res) => {
    res.json({ status: 'ok' });
  });
}

app.use((err, req, res, next) => {
  const requestId = req._requestId || 'unknown';
  const ip = req._clientIp || getClientIp(req);

  if (err.type === 'entity.parse.failed') {
    securityLog('WARN', 'MALFORMED_JSON', { ip, path: req.path });
    return res.status(400).json({ success: false, message: 'Invalid request body' });
  }

  if (err.type === 'entity.too.large') {
    securityLog('WARN', 'REQUEST_TOO_LARGE', { ip, path: req.path });
    return res.status(413).json({ success: false, message: 'Request too large' });
  }

  if (!IS_PRODUCTION) {
    console.error(`[ERROR:${requestId}] ${req.method} ${req.path}:`, err.message);
  }
  securityLog('ALERT', 'UNHANDLED_ERROR', { ip, path: req.path, method: req.method, requestId, error: err.message });

  res.status(err.status || 500).json({
    success: false,
    message: 'An internal error occurred',
  });
});

process.on('unhandledRejection', (reason) => {
  console.error('[UNHANDLED_REJECTION]', reason?.message || reason);
  securityLog('ALERT', 'UNHANDLED_REJECTION', { error: reason?.message || String(reason) });
});

process.on('uncaughtException', (err) => {
  console.error('[UNCAUGHT_EXCEPTION]', err.message);
  securityLog('ALERT', 'UNCAUGHT_EXCEPTION', { error: err.message });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', async () => {
  console.log(`WolfHost server running on port ${PORT}`);
  console.log(`Security: helmet=ON, cors=RESTRICTED, rate-limiting=OFF, input-validation=ON`);
  console.log(`Mode: ${IS_PRODUCTION ? 'PRODUCTION' : 'DEVELOPMENT'}`);

  if (PTERODACTYL_API_KEY) {
    try {
      console.log('Startup: Fetching Pterodactyl egg variables...');
      const env = await getEggEnvironment();
      console.log('Startup: Egg environment keys:', JSON.stringify(Object.keys(env)));
      console.log('Startup: Egg environment values:', JSON.stringify(env));
      console.log('Startup: Egg startup:', cachedEggStartup ? 'FROM EGG' : 'HARDCODED FALLBACK');
      console.log('Startup: Egg docker image:', cachedEggDockerImage || 'HARDCODED FALLBACK');
    } catch (e) {
      console.error('Startup: Failed to fetch egg variables:', e.message);
    }

    try {
      const adminId = await resolveSuperAdminId();
      if (adminId) {
        console.log('Startup: Super admin ID resolved:', adminId);
      }
    } catch (e) {
      console.error('Startup: Failed to resolve super admin ID:', e.message);
    }
  }
});
