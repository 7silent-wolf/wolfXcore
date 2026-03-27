import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, Github, Globe, Image, Tag, Mail, FileText,
  CheckCircle, Clock, XCircle, ChevronDown, ChevronUp,
  Send, Bot, ArrowRight, Code2, Sparkles, Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import LoadingSpinner from '../components/LoadingSpinner';

const getAuthHeaders = () => {
  const token = localStorage.getItem('jwt_token');
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
};

const STATUS_META = {
  pending:  { label: 'Under Review', color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20', icon: Clock },
  approved: { label: 'Approved',     color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', icon: CheckCircle },
  rejected: { label: 'Rejected',     color: 'text-red-400',     bg: 'bg-red-500/10 border-red-500/20',     icon: XCircle },
};

const EMPTY_FORM = {
  botName: '', gmail: '', repoUrl: '', version: '', pairSite: '', imageUrl: '', description: '',
};

/* ── Marquee row (infinite horizontal scroll) ─────────────────────── */
function MarqueeRow({ bots, direction = 'left', speed = 35 }) {
  // Duplicate bots so the scroll feels seamless
  const items = [...bots, ...bots, ...bots];
  const animStyle = {
    display: 'flex',
    gap: '16px',
    animation: `marquee-${direction} ${speed}s linear infinite`,
    willChange: 'transform',
  };
  return (
    <div style={{ overflow: 'hidden', display: 'flex' }}>
      <div style={animStyle}>
        {items.map((bot, i) => (
          <BotCard key={`${bot.id}-${i}`} bot={bot} />
        ))}
      </div>
    </div>
  );
}

/* ── Individual bot card for the showcase ────────────────────────── */
function BotCard({ bot }) {
  return (
    <div
      style={{ minWidth: '180px', maxWidth: '180px' }}
      className="rounded-xl border border-primary/15 bg-black/60 backdrop-blur-sm p-3 flex flex-col gap-2 select-none"
    >
      <div className="w-full h-24 rounded-lg overflow-hidden bg-black/40 border border-gray-800/50 relative">
        {bot.imageUrl ? (
          <img
            src={bot.imageUrl}
            alt={bot.name}
            className="w-full h-full object-cover opacity-80"
            onError={e => { e.target.style.display = 'none'; }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Bot className="w-8 h-8 text-primary/30" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
      </div>
      <div>
        <p className="text-xs font-mono font-bold text-primary/90 truncate">{bot.name}</p>
        <p className="text-[10px] font-mono text-gray-600 truncate leading-tight mt-0.5">
          {bot.appJsonDescription || bot.description || 'WhatsApp Bot'}
        </p>
      </div>
    </div>
  );
}

/* ── Main page ───────────────────────────────────────────────────── */
export default function SubmitBot() {
  const [step, setStep]             = useState('landing'); // 'landing' | 'form'
  const [bots, setBots]             = useState([]);
  const [loadingBots, setLoadingBots] = useState(true);
  const [ctaHovered, setCtaHovered] = useState(false);

  // Form state (kept from original)
  const [form, setForm]           = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [submissions, setSubmissions] = useState([]);
  const [loadingSubs, setLoadingSubs] = useState(true);
  const [previewImg, setPreviewImg] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    fetchCatalog();
    fetchMySubmissions();
  }, []);

  const fetchCatalog = async () => {
    setLoadingBots(true);
    try {
      const res = await fetch('/api/bots/catalog', { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success) setBots(data.bots || data.catalog || []);
    } catch {}
    finally { setLoadingBots(false); }
  };

  const fetchMySubmissions = async () => {
    setLoadingSubs(true);
    try {
      const res = await fetch('/api/bots/my-submissions', { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success) setSubmissions(data.submissions);
    } catch {}
    finally { setLoadingSubs(false); }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
    if (name === 'imageUrl') setPreviewImg(value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/bots/submit', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        setForm(EMPTY_FORM);
        setPreviewImg('');
        fetchMySubmissions();
      } else {
        toast.error(data.message || 'Submission failed');
      }
    } catch { toast.error('Network error'); }
    finally { setSubmitting(false); }
  };

  const hasPending = submissions.some(s => s.status === 'pending');

  // Split bots into two rows for the marquee
  const mid = Math.ceil(bots.length / 2);
  const row1 = bots.length > 0 ? bots.slice(0, mid) : PLACEHOLDER_BOTS.slice(0, 4);
  const row2 = bots.length > 0 ? bots.slice(mid)   : PLACEHOLDER_BOTS.slice(4);

  /* ── Landing screen ────────────────────────────────────────────── */
  if (step === 'landing') {
    return (
      <>
        {/* Inject marquee keyframes */}
        <style>{`
          @keyframes marquee-left  { from { transform: translateX(0) } to { transform: translateX(-33.33%) } }
          @keyframes marquee-right { from { transform: translateX(-33.33%) } to { transform: translateX(0) } }
          @keyframes pulse-glow    { 0%,100% { box-shadow: 0 0 20px 2px hsl(var(--primary)/0.3); } 50% { box-shadow: 0 0 40px 8px hsl(var(--primary)/0.6); } }
          @keyframes float-up      { 0%,100% { transform: translateY(0px); } 50% { transform: translateY(-6px); } }
        `}</style>

        <AnimatePresence>
          <motion.div
            key="landing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.4 }}
            className="min-h-[80vh] flex flex-col items-center justify-center relative overflow-hidden"
          >
            {/* ── Bot showcase behind the CTA ─────────────── */}
            <div className="absolute inset-0 flex flex-col justify-center gap-4 py-8 pointer-events-none select-none"
                 style={{ opacity: 0.35, filter: 'blur(0.5px)' }}>
              {/* Extra top padding so cards don't overlap the header */}
              <div style={{ height: '24px' }} />
              <MarqueeRow bots={row1} direction="left"  speed={40} />
              <MarqueeRow bots={row2} direction="right" speed={50} />
              {row1.length > 2 && <MarqueeRow bots={[...row2, ...row1].slice(0,6)} direction="left" speed={45} />}
            </div>

            {/* ── Dark gradient overlay ─────────────────────── */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/70 pointer-events-none" />

            {/* ── CTA card ─────────────────────────────────── */}
            <motion.div
              initial={{ opacity: 0, y: 32 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6, ease: 'easeOut' }}
              className="relative z-10 flex flex-col items-center text-center px-6 max-w-lg mx-auto"
            >
              {/* Icon cluster */}
              <div className="relative mb-6" style={{ animation: 'float-up 3s ease-in-out infinite' }}>
                <div className="w-20 h-20 rounded-2xl border border-primary/30 bg-primary/5 flex items-center justify-center"
                     style={{ boxShadow: '0 0 40px 8px hsl(var(--primary)/0.15)' }}>
                  <Code2 className="w-9 h-9 text-primary" />
                </div>
                <div className="absolute -top-2 -right-2 w-7 h-7 rounded-lg bg-black border border-primary/20 flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5 text-primary/70" />
                </div>
                <div className="absolute -bottom-2 -left-2 w-7 h-7 rounded-lg bg-black border border-primary/20 flex items-center justify-center">
                  <Zap className="w-3.5 h-3.5 text-primary/70" />
                </div>
              </div>

              {/* Headline */}
              <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-white leading-tight mb-3">
                Are you a{' '}
                <span className="text-primary relative">
                  developer
                  <span className="absolute -bottom-1 left-0 right-0 h-0.5 bg-primary/40 rounded-full" />
                </span>
                ?
              </h1>

              <p className="text-sm text-gray-400 font-mono leading-relaxed mb-2">
                wolfXnode is looking for talented bot developers to join the platform.
                Get your WhatsApp bot in front of thousands of users.
              </p>

              {/* Live bot count badge */}
              {bots.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.6 }}
                  className="flex items-center gap-2 text-[11px] font-mono text-primary/70 bg-primary/5 border border-primary/15 rounded-full px-3 py-1 mb-6"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  {bots.length} bots already live on the platform
                </motion.div>
              )}
              {bots.length === 0 && <div className="mb-6" />}

              {/* CTA button */}
              <motion.button
                data-testid="button-cta-continue"
                onClick={() => setStep('form')}
                onMouseEnter={() => setCtaHovered(true)}
                onMouseLeave={() => setCtaHovered(false)}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="group flex items-center gap-3 px-8 py-4 rounded-2xl border border-primary/50 bg-primary/10 text-primary font-mono font-bold text-base transition-all duration-200 hover:bg-primary/20"
                style={{ animation: 'pulse-glow 2.5s ease-in-out infinite' }}
              >
                <span>Willing to be part of us?</span>
                <motion.span
                  animate={{ x: ctaHovered ? 6 : 0 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                >
                  <ArrowRight className="w-5 h-5" />
                </motion.span>
              </motion.button>

              <p className="mt-4 text-[10px] font-mono text-gray-700">
                Click to open the developer submission form
              </p>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </>
    );
  }

  /* ── Form screen ───────────────────────────────────────────────── */
  const Field = ({ label, name, placeholder, type = 'text', icon: Icon, hint }) => (
    <div className="space-y-1.5">
      <label className="text-[11px] font-mono text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
        <Icon className="w-3 h-3" /> {label}
      </label>
      <input
        type={type}
        name={name}
        value={form[name]}
        onChange={handleChange}
        placeholder={placeholder}
        required={name !== 'description'}
        data-testid={`input-${name}`}
        className="w-full bg-black/60 border border-gray-700/50 rounded-lg px-3 py-2.5 text-sm font-mono text-white placeholder-gray-600 focus:outline-none focus:border-primary/50 focus:bg-black/80 transition-all"
      />
      {hint && <p className="text-[10px] font-mono text-gray-600">{hint}</p>}
    </div>
  );

  return (
    <AnimatePresence>
      <motion.div
        key="form"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className="max-w-3xl mx-auto space-y-8 pb-12"
      >
        {/* Header with back cue */}
        <div>
          <button
            onClick={() => setStep('landing')}
            className="text-[11px] font-mono text-gray-600 hover:text-primary transition-colors mb-3 flex items-center gap-1"
            data-testid="button-back-to-landing"
          >
            ← back
          </button>
          <h1 className="text-xl sm:text-2xl font-display font-bold text-white flex items-center gap-2">
            <Upload className="text-primary w-5 h-5" />
            Submit Your Bot
          </h1>
          <p className="text-xs text-gray-500 font-mono mt-1">
            Share your WhatsApp bot with the wolfXnode community. Submissions are reviewed by admins before going live.
          </p>
        </div>

        {/* Submission Form */}
        <div className="rounded-xl border border-primary/15 bg-black/40 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-primary/10 bg-black/30 flex items-center gap-2">
            <Bot className="w-4 h-4 text-primary" />
            <span className="text-sm font-mono font-semibold text-primary">Bot Details</span>
            {hasPending && (
              <span className="ml-auto text-[10px] font-mono text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 px-2 py-0.5 rounded-full">
                Pending review — form locked
              </span>
            )}
          </div>

          <form onSubmit={handleSubmit} className="p-5 space-y-5">
            {hasPending && (
              <div className="p-3 rounded-lg border border-yellow-500/20 bg-yellow-500/5 text-[11px] font-mono text-yellow-400/80">
                You already have a submission under review. You can submit again once it has been approved or rejected.
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Bot Name"  name="botName" placeholder="e.g. WOLFBOT"  icon={Bot} />
              <Field label="Version"   name="version"  placeholder="e.g. v2.1.0"  icon={Tag} />
            </div>

            <Field
              label="Your Gmail"
              name="gmail"
              type="email"
              placeholder="yourname@gmail.com"
              icon={Mail}
              hint="Used to contact you about your submission"
            />

            <Field
              label="GitHub Repo URL"
              name="repoUrl"
              placeholder="https://github.com/yourusername/yourbot"
              icon={Github}
              hint="Must be public so wolfXnode can clone it"
            />

            <Field
              label="Pair / Session Site"
              name="pairSite"
              placeholder="https://yourpairsite.com"
              icon={Globe}
              hint="The site users visit to get their session ID"
            />

            {/* Image URL with live preview */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                <Image className="w-3 h-3" /> Bot Image URL (JPG/PNG)
              </label>
              <div className="flex gap-3 items-start">
                <input
                  type="url"
                  name="imageUrl"
                  value={form.imageUrl}
                  onChange={handleChange}
                  placeholder="https://i.imgur.com/yourbot.jpg"
                  required
                  data-testid="input-imageUrl"
                  className="flex-1 bg-black/60 border border-gray-700/50 rounded-lg px-3 py-2.5 text-sm font-mono text-white placeholder-gray-600 focus:outline-none focus:border-primary/50 transition-all"
                />
                {previewImg && (
                  <div className="w-12 h-12 rounded-lg border border-gray-700/50 overflow-hidden shrink-0 bg-black/40">
                    <img
                      src={previewImg}
                      alt="preview"
                      className="w-full h-full object-cover"
                      onError={() => setPreviewImg('')}
                    />
                  </div>
                )}
              </div>
              <p className="text-[10px] font-mono text-gray-600">Direct image link — use Imgur, GitHub raw, or similar</p>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3 h-3" /> Description (optional)
              </label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="Briefly describe what your bot does, its features, and how to use it…"
                rows={3}
                maxLength={500}
                data-testid="input-description"
                className="w-full bg-black/60 border border-gray-700/50 rounded-lg px-3 py-2.5 text-sm font-mono text-white placeholder-gray-600 focus:outline-none focus:border-primary/50 transition-all resize-none"
              />
              <p className="text-[10px] font-mono text-gray-600 text-right">{form.description.length}/500</p>
            </div>

            <button
              type="submit"
              disabled={submitting || hasPending}
              data-testid="button-submit-bot"
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-primary/40 bg-primary/10 text-primary font-mono text-sm font-semibold hover:bg-primary/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting ? <LoadingSpinner size="sm" /> : <Send className="w-4 h-4" />}
              {submitting ? 'Submitting…' : 'Submit for Review'}
            </button>
          </form>
        </div>

        {/* Guidelines */}
        <div className="rounded-xl border border-gray-700/30 bg-black/20 p-4 space-y-2">
          <h3 className="text-xs font-mono font-semibold text-gray-400 uppercase tracking-wider">Submission Guidelines</h3>
          <ul className="space-y-1.5 text-[11px] font-mono text-gray-600 leading-relaxed">
            <li>• The GitHub repo must be <span className="text-gray-400">public</span> and contain a working bot</li>
            <li>• Include an <span className="text-gray-400">app.json</span> in the root of your repo defining required env vars</li>
            <li>• The bot must start with <span className="text-gray-400">node index.js</span> or define the entry in app.json</li>
            <li>• Bots that contain malicious code or spam will be permanently banned</li>
            <li>• You may only have <span className="text-gray-400">one pending submission</span> at a time</li>
            <li>• Reviews typically take <span className="text-gray-400">24–48 hours</span></li>
          </ul>
        </div>

        {/* My Submissions */}
        <div className="space-y-3">
          <h2 className="text-sm font-mono font-semibold text-gray-400 uppercase tracking-wider">My Submissions</h2>

          {loadingSubs ? (
            <div className="flex justify-center py-8"><LoadingSpinner /></div>
          ) : submissions.length === 0 ? (
            <div className="rounded-xl border border-gray-800/50 bg-black/20 py-10 text-center">
              <p className="text-xs font-mono text-gray-600">No submissions yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {submissions.map(sub => {
                const meta = STATUS_META[sub.status] || STATUS_META.pending;
                const StatusIcon = meta.icon;
                const isExpanded = expandedId === sub.id;
                return (
                  <motion.div key={sub.id} layout className={`rounded-xl border bg-black/40 overflow-hidden ${meta.bg}`}>
                    <button
                      className="w-full flex items-center gap-3 p-4 text-left"
                      onClick={() => setExpandedId(isExpanded ? null : sub.id)}
                      data-testid={`submission-${sub.id}`}
                    >
                      {sub.imageUrl ? (
                        <img src={sub.imageUrl} alt={sub.botName} className="w-10 h-10 rounded-lg object-cover shrink-0 border border-gray-700/50" onError={e => e.target.style.display='none'} />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-primary/5 border border-primary/10 flex items-center justify-center shrink-0">
                          <Bot className="w-5 h-5 text-gray-600" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-mono font-semibold text-white truncate">{sub.botName}</p>
                        <p className="text-[10px] font-mono text-gray-600">{new Date(sub.submittedAt).toLocaleDateString('en-KE', { dateStyle: 'medium' })}</p>
                      </div>
                      <span className={`flex items-center gap-1.5 text-[10px] font-mono font-semibold px-2.5 py-1 rounded-full border ${meta.bg} ${meta.color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {meta.label}
                      </span>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-600 shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-600 shrink-0" />}
                    </button>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-4 pt-0 border-t border-white/5 space-y-2 text-[11px] font-mono text-gray-500">
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 pt-3">
                              <span className="text-gray-600">Version</span><span className="text-gray-400">{sub.version}</span>
                              <span className="text-gray-600">Gmail</span><span className="text-gray-400 truncate">{sub.gmail}</span>
                              <span className="text-gray-600">Repo</span><a href={sub.repoUrl} target="_blank" rel="noreferrer" className="text-primary/70 hover:text-primary truncate">{sub.repoUrl}</a>
                              <span className="text-gray-600">Pair Site</span><a href={sub.pairSite} target="_blank" rel="noreferrer" className="text-primary/70 hover:text-primary truncate">{sub.pairSite}</a>
                            </div>
                            {sub.description && <p className="text-gray-500 pt-1 leading-relaxed">{sub.description}</p>}
                            {sub.reviewNote && (
                              <div className={`mt-2 p-2 rounded-lg border ${sub.status === 'rejected' ? 'border-red-500/20 bg-red-500/5 text-red-400' : 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400'}`}>
                                <span className="font-semibold">Admin note: </span>{sub.reviewNote}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ── Placeholder cards shown while catalog is loading ──────────── */
const PLACEHOLDER_BOTS = [
  { id: 'p1', name: 'WOLFBOT',   imageUrl: '', appJsonDescription: 'Professional WhatsApp Bot' },
  { id: 'p2', name: 'JUNE-X',    imageUrl: '', appJsonDescription: 'Feature-rich Baileys bot' },
  { id: 'p3', name: 'CASPER XD', imageUrl: '', appJsonDescription: 'Multi-device WhatsApp Bot' },
  { id: 'p4', name: 'TOOSII-XD', imageUrl: '', appJsonDescription: 'Powerful automation bot' },
  { id: 'p5', name: 'BWM-XMD',   imageUrl: '', appJsonDescription: 'Advanced WhatsApp Bot' },
  { id: 'p6', name: 'DEVIL-BOT', imageUrl: '', appJsonDescription: 'Lightning-fast bot engine' },
  { id: 'p7', name: 'QUEEN-MD',  imageUrl: '', appJsonDescription: 'Smart assistant bot' },
  { id: 'p8', name: 'ALPHA-BOT', imageUrl: '', appJsonDescription: 'Community-powered bot' },
];
