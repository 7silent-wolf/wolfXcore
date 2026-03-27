import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { Terminal, Square, Trash2, RotateCcw, ArrowLeft, ChevronDown, Send, TerminalSquare, Maximize2, Minimize2, X } from 'lucide-react';
import { toast } from 'sonner';
import LoadingSpinner from '../components/LoadingSpinner';

const getAuthHeaders = () => {
  const token = localStorage.getItem('jwt_token');
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
};

// ─── ANSI colour palette ───────────────────────────────────────────────────
const ANSI_FG = {
  30: '#4d4d4d', 31: '#ff5555', 32: '#50fa7b', 33: '#f1fa8c',
  34: '#6e9eff', 35: '#ff79c6', 36: '#8be9fd', 37: '#c8c8c8',
  90: '#808080', 91: '#ff6e6e', 92: '#69ff94', 93: '#ffffa5',
  94: '#d6acff', 95: '#ff92df', 96: '#a4ffff', 97: '#ffffff',
};

function ansi256(n) {
  if (n < 16) {
    const p = ['#000','#800000','#008000','#808000','#000080','#800080',
               '#008080','#c0c0c0','#808080','#f00','#0f0','#ff0',
               '#00f','#f0f','#0ff','#fff'];
    return p[n] || '#fff';
  }
  if (n > 231) {
    const v = Math.round(((n - 232) * 10 + 8)).toString(16).padStart(2, '0');
    return `#${v}${v}${v}`;
  }
  const idx = n - 16;
  const b = idx % 6, g = Math.floor(idx / 6) % 6, r = Math.floor(idx / 36);
  const cv = v => (v ? v * 40 + 55 : 0).toString(16).padStart(2, '0');
  return `#${cv(r)}${cv(g)}${cv(b)}`;
}

/**
 * Strip all non-colour ANSI escape sequences so they don't corrupt rendering.
 * Keeps SGR sequences (\x1b[...m) for colour/style parsing.
 * Removes: cursor movement, erase, scroll, title OSC, carriage returns, etc.
 */
function preprocess(raw) {
  return raw
    // Carriage returns used by bots for in-place line rewrites
    .replace(/\r/g, '')
    // Null bytes
    .replace(/\x00/g, '')
    // OSC sequences: \x1b] ... \x07  or  \x1b] ... \x1b\
    .replace(/\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g, '')
    // Non-SGR CSI sequences: \x1b[ ... <final-byte> where final ≠ 'm' (0x6D)
    // Parameter bytes: 0x20–0x3F  Final bytes: 0x40–0x7E excluding 'm'
    .replace(/\x1b\[[\x20-\x3F]*[\x40-\x6C\x6E-\x7E]/g, '')
    // Single-char escape sequences like \x1bM (reverse index), \x1b= etc.
    .replace(/\x1b[^\[]/g, '');
}

function parseAnsi(raw) {
  const segments = [];
  const re = /\x1b\[([0-9;]*)m/g;
  let last = 0;
  let style = {};
  let m;
  while ((m = re.exec(raw)) !== null) {
    if (m.index > last) segments.push({ text: raw.slice(last, m.index), style: { ...style } });
    const codes = m[1].length ? m[1].split(';').map(Number) : [0];
    let i = 0;
    while (i < codes.length) {
      const c = codes[i];
      if (c === 0 || c === '') { style = {}; }
      else if (c === 1) { style.fontWeight = 'bold'; }
      else if (c === 2) { style.opacity = '0.65'; }
      else if (c === 3) { style.fontStyle = 'italic'; }
      else if (c === 4) { style.textDecoration = 'underline'; }
      else if (c === 22) { delete style.fontWeight; delete style.opacity; }
      else if (c === 23) { delete style.fontStyle; }
      else if (c === 24) { delete style.textDecoration; }
      else if (c >= 30 && c <= 37) { style.color = ANSI_FG[c]; }
      else if (c >= 90 && c <= 97) { style.color = ANSI_FG[c]; }
      else if (c === 39) { delete style.color; }
      else if (c === 38) {
        if (codes[i + 1] === 2) {
          style.color = `rgb(${codes[i+2]||0},${codes[i+3]||0},${codes[i+4]||0})`;
          i += 4;
        } else if (codes[i + 1] === 5) {
          style.color = ansi256(codes[i + 2] || 0);
          i += 2;
        }
      }
      i++;
    }
    last = m.index + m[0].length;
  }
  if (last < raw.length) segments.push({ text: raw.slice(last), style: { ...style } });
  return segments;
}

function hasColorAnsi(s) { return /\x1b\[[0-9;]*m/.test(s); }

function AnsiSpan({ text }) {
  const cleaned = preprocess(text);
  if (!hasColorAnsi(cleaned)) return <span>{cleaned}</span>;
  const parts = parseAnsi(cleaned);
  return (
    <>
      {parts.map((p, i) => (
        <span key={i} style={Object.keys(p.style).length ? p.style : undefined}>{p.text}</span>
      ))}
    </>
  );
}

const LEVEL_META = {
  info:    { label: 'wolfXnode', cls: 'text-emerald-400' },
  warn:    { label: 'WARN    ', cls: 'text-yellow-400'  },
  error:   { label: 'ERR     ', cls: 'text-red-400'     },
  success: { label: 'OK      ', cls: 'text-emerald-300' },
};

const MSG_FALLBACK = {
  info:    'text-gray-200',
  warn:    'text-yellow-200',
  error:   'text-red-300',
  success: 'text-emerald-200',
};

const STATUS_META = {
  queued:    { color: 'text-yellow-400',  dot: 'bg-yellow-400',                  label: 'Queued'      },
  deploying: { color: 'text-blue-400',    dot: 'bg-blue-400 animate-pulse',      label: 'Installing…' },
  running:   { color: 'text-emerald-400', dot: 'bg-emerald-400 animate-pulse',   label: 'Running'     },
  stopped:   { color: 'text-gray-400',    dot: 'bg-gray-500',                    label: 'Stopped'     },
  failed:    { color: 'text-red-400',     dot: 'bg-red-500',                     label: 'Failed'      },
};

const LIMIT_OPTIONS = [
  { label: 'Last 100 lines',  value: 100  },
  { label: 'Last 200 lines',  value: 200  },
  { label: 'Last 500 lines',  value: 500  },
  { label: 'Last 1000 lines', value: 1000 },
  { label: 'All lines',       value: 0    },
];

export default function DirectBotLog() {
  const { id } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();

  const [logs, setLogs]           = useState([]);
  const [status, setStatus]       = useState('queued');
  const [botName]                 = useState(state?.botName || 'Bot');
  const [serverName]              = useState(state?.serverName || '');
  const [loading, setLoading]     = useState(true);
  const [actionBusy, setActionBusy] = useState(false);
  const [elapsed, setElapsed]     = useState(0);
  const [autoScroll, setAutoScroll] = useState(true);
  const [totalLines, setTotalLines] = useState(0);
  const [limit, setLimit]         = useState(200);
  const [showLimitMenu, setShowLimitMenu] = useState(false);
  const [inputVal, setInputVal]   = useState('');
  const [shellMode, setShellMode] = useState(false);
  const [sending, setSending]     = useState(false);

  const logEndRef  = useRef(null);
  const inputRef   = useRef(null);
  const logBoxRef  = useRef(null);
  const startTime  = useRef(Date.now());
  const pollRef    = useRef(null);
  // Tracks the NEXT line index to fetch — using a ref avoids stale closures in the interval
  const nextLineRef = useRef(0);
  const statusRef   = useRef('queued');

  // Elapsed timer
  useEffect(() => {
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startTime.current) / 1000)), 1000);
    return () => clearInterval(t);
  }, []);

  // Build URL for initial load (tail or all)
  const buildInitUrl = useCallback((lim) => {
    return lim > 0
      ? `/api/bots/direct/${id}/logs?tail=${lim}`
      : `/api/bots/direct/${id}/logs?since=0`;
  }, [id]);

  // Fetch initial batch of logs (tail mode)
  const loadInitial = useCallback(async (lim) => {
    setLoading(true);
    setLogs([]);
    nextLineRef.current = 0;
    try {
      const res = await fetch(buildInitUrl(lim), { headers: getAuthHeaders() });
      if (!res.ok) return;
      const data = await res.json();
      if (!data.success) return;
      statusRef.current = data.status;
      setStatus(data.status);
      setTotalLines(data.total);
      setLogs(data.logs || []);
      // Next poll starts from the end of the file
      nextLineRef.current = data.total;
    } catch {}
    finally { setLoading(false); }
  }, [buildInitUrl]);

  // Fetch only NEW lines since the last known line
  const pollNew = useCallback(async () => {
    if (statusRef.current === 'stopped' || statusRef.current === 'failed') return;
    try {
      const since = nextLineRef.current;
      const res = await fetch(`/api/bots/direct/${id}/logs?since=${since}`, { headers: getAuthHeaders() });
      if (!res.ok) return;
      const data = await res.json();
      if (!data.success) return;
      statusRef.current = data.status;
      setStatus(data.status);
      setTotalLines(data.total);
      if (data.logs && data.logs.length > 0) {
        setLogs(prev => [...prev, ...data.logs]);
        nextLineRef.current = data.total;
      }
    } catch {}
  }, [id]);

  // Start/restart the polling interval
  const startPolling = useCallback(() => {
    clearInterval(pollRef.current);
    pollRef.current = setInterval(pollNew, 2000);
  }, [pollNew]);

  // On mount or id change: load initial logs then start polling
  useEffect(() => {
    loadInitial(limit).then(startPolling);
    return () => clearInterval(pollRef.current);
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  // When status changes to stopped/failed, stop polling
  useEffect(() => {
    if (status === 'stopped' || status === 'failed') {
      clearInterval(pollRef.current);
    }
  }, [status]);

  // Auto-scroll
  useEffect(() => {
    if (autoScroll && logEndRef.current) logEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [logs, autoScroll]);

  const handleScroll = () => {
    const el = logBoxRef.current;
    if (!el) return;
    setAutoScroll(el.scrollHeight - el.scrollTop - el.clientHeight < 60);
  };

  // Change limit: reload from tail with new limit
  const handleLimitChange = (newLimit) => {
    setLimit(newLimit);
    setShowLimitMenu(false);
    statusRef.current = 'queued';
    setStatus('queued');
    clearInterval(pollRef.current);
    loadInitial(newLimit).then(startPolling);
  };

  const doAction = async (endpoint, method = 'POST', successMsg, onSuccess) => {
    setActionBusy(true);
    try {
      const res  = await fetch(`/api/bots/direct/${id}/${endpoint}`, { method, headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success) { toast.success(successMsg); if (onSuccess) onSuccess(); }
      else toast.error(data.message || 'Action failed');
    } catch { toast.error('Action failed'); }
    finally { setActionBusy(false); }
  };

  const handleStop = () => doAction('stop', 'POST', 'Bot stopped', () => {
    statusRef.current = 'stopped';
    setStatus('stopped');
    clearInterval(pollRef.current);
  });

  const handleRestart = () => doAction('restart', 'POST', 'Bot restarting…', () => {
    statusRef.current = 'queued';
    setStatus('queued');
    startTime.current = Date.now();
    clearInterval(pollRef.current);
    setLogs([]);
    nextLineRef.current = 0;
    // Give server a moment to update the log file, then reload
    setTimeout(() => loadInitial(limit).then(startPolling), 1500);
  });

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Close fullscreen on ESC
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && isFullscreen) setIsFullscreen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isFullscreen]);

  const handleDelete = () => setShowDeleteModal(true);
  const confirmDeleteAction = () => {
    setShowDeleteModal(false);
    doAction('', 'DELETE', 'Deployment deleted', () => navigate('/my-bots'));
  };

  const sendInput = async () => {
    const val = inputVal.trim();
    if (!val || sending) return;
    setSending(true);
    const endpoint = shellMode ? 'exec' : 'stdin';
    const body     = shellMode ? { cmd: val } : { input: val };
    try {
      const res  = await fetch(`/api/bots/direct/${id}/${endpoint}`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!data.success) toast.error(data.message || 'Send failed');
      else setInputVal('');
    } catch { toast.error('Send failed'); }
    finally { setSending(false); inputRef.current?.focus(); }
  };

  const fmtTime = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  const meta = STATUS_META[status] || STATUS_META.queued;
  const limitLabel = LIMIT_OPTIONS.find(o => o.value === limit)?.label || 'Last 200 lines';
  const isLive = status === 'running' || status === 'deploying' || status === 'queued';

  return (
    <div className="space-y-5 pb-10 max-w-4xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/my-bots')}
            className="p-2 rounded-lg border border-gray-700/50 text-gray-500 hover:text-white hover:border-primary/30 transition-all"
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-white font-mono flex items-center gap-2">
              <Terminal className="w-5 h-5 text-emerald-400" />
              {serverName || botName}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full border flex items-center gap-1.5 ${meta.color} border-current/20 bg-current/5`}>
                <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                {meta.label}
              </span>
              <span className="text-[10px] font-mono text-gray-600">⏱ {fmtTime(elapsed)}</span>
              <span className="text-[10px] font-mono text-gray-600">{logs.length} lines shown</span>
              {totalLines > 0 && (
                <span className="text-[10px] font-mono text-gray-700">/ {totalLines} total</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {isLive && (
            <button
              data-testid="button-stop-bot"
              onClick={handleStop}
              disabled={actionBusy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-yellow-500/30 text-yellow-400 text-xs font-mono hover:bg-yellow-500/10 transition-all disabled:opacity-50"
            >
              <Square className="w-3.5 h-3.5" /> Stop
            </button>
          )}
          <button
            data-testid="button-restart-bot"
            onClick={handleRestart}
            disabled={actionBusy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-500/30 text-emerald-400 text-xs font-mono hover:bg-emerald-500/10 transition-all disabled:opacity-50"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Restart
          </button>
          <button
            data-testid="button-delete-bot"
            onClick={handleDelete}
            disabled={actionBusy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-500/30 text-red-400 text-xs font-mono hover:bg-red-500/10 transition-all disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </button>
        </div>
      </div>

      {/* Terminal */}
      <div
        className={
          isFullscreen
            ? 'fixed inset-0 z-50 flex flex-col bg-black/98 border-t border-emerald-500/20'
            : 'rounded-xl border border-emerald-500/20 bg-black/80 backdrop-blur-sm overflow-hidden'
        }
        style={isFullscreen ? {} : { boxShadow: '0 0 40px rgba(0,0,0,0.6)' }}
      >
        {/* Title bar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-emerald-500/15 bg-black/60">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
            <span className="text-[10px] font-mono text-gray-600 ml-2">stdout/stderr — {botName}</span>
          </div>
          <div className="flex items-center gap-2">
            {/* Limit selector */}
            <div className="relative">
              <button
                onClick={() => setShowLimitMenu(v => !v)}
                className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded border border-gray-700 text-gray-400 hover:border-emerald-500/40 hover:text-emerald-400 transition-all"
                data-testid="button-limit-selector"
              >
                {limitLabel} <ChevronDown className="w-2.5 h-2.5" />
              </button>
              {showLimitMenu && (
                <div className="absolute right-0 top-6 z-50 bg-gray-900 border border-gray-700 rounded-lg shadow-xl overflow-hidden min-w-[140px]">
                  {LIMIT_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => handleLimitChange(opt.value)}
                      className={`w-full text-left px-3 py-1.5 text-[10px] font-mono hover:bg-gray-800 transition-colors ${
                        limit === opt.value ? 'text-emerald-400' : 'text-gray-300'
                      }`}
                      data-testid={`limit-option-${opt.value}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={() => setAutoScroll(v => !v)}
              className={`text-[10px] font-mono px-2 py-0.5 rounded border transition-all ${
                autoScroll ? 'border-emerald-500/40 text-emerald-400' : 'border-gray-700 text-gray-600'
              }`}
              data-testid="button-autoscroll"
            >
              auto-scroll {autoScroll ? 'on' : 'off'}
            </button>
            <button
              onClick={() => {
                clearInterval(pollRef.current);
                statusRef.current = 'queued';
                setStatus('queued');
                loadInitial(limit).then(startPolling);
              }}
              className="text-[10px] font-mono text-gray-600 hover:text-gray-400 transition-colors"
              data-testid="button-clear-logs"
            >
              reload
            </button>
            <button
              onClick={() => setIsFullscreen(v => !v)}
              title={isFullscreen ? 'Exit fullscreen (ESC)' : 'Fullscreen'}
              className="text-[10px] font-mono text-gray-600 hover:text-emerald-400 transition-colors ml-1"
              data-testid="button-fullscreen"
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Log lines */}
        <div
          ref={logBoxRef}
          onScroll={handleScroll}
          className={`overflow-y-auto p-4 font-mono space-y-0.5 text-gray-200 ${isFullscreen ? 'flex-1' : 'h-[440px]'}`}
          style={{ scrollBehavior: 'smooth' }}
          data-testid="log-terminal"
        >
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <LoadingSpinner size="md" />
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-2">
              <Terminal className="w-8 h-8 text-gray-700" />
              <p className="text-xs text-gray-600 font-mono">
                {status === 'queued' ? 'Waiting for deployment to start…' : 'No logs yet.'}
              </p>
            </div>
          ) : (
            <>
              {limit > 0 && totalLines > limit && (
                <div className="text-[9px] font-mono text-gray-700 text-center py-1 mb-1 border-b border-gray-800">
                  ↑ showing last {limit} of {totalLines} lines — use the selector to load more
                </div>
              )}
              {logs.map((log, i) => {
                const lm = LEVEL_META[log.level] || LEVEL_META.info;
                return (
                  <div key={i} className="flex items-start gap-2 leading-5 min-w-0">
                    <span className="text-[9px] text-gray-700 flex-shrink-0 mt-0.5 w-[52px] text-right select-none">
                      {log.ts ? new Date(log.ts).toLocaleTimeString('en-GB', { hour12: false }) : ''}
                    </span>
                    <span className={`text-[9px] flex-shrink-0 font-bold tracking-wider w-[58px] ${lm.cls} select-none`}>
                      {lm.label}
                    </span>
                    <span
                      className={`text-[11px] min-w-0 flex-1 ${MSG_FALLBACK[log.level] || 'text-gray-200'}`}
                      style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflowWrap: 'anywhere' }}
                    >
                      <AnsiSpan text={log.msg} />
                    </span>
                  </div>
                );
              })}
            </>
          )}

          {/* Blinking cursor — only when live */}
          {isLive && (
            <div className="flex items-center gap-1 mt-1">
              <span className="text-[11px] text-emerald-500 font-mono">$</span>
              <span className="w-2 h-3.5 bg-emerald-500/80 animate-pulse rounded-sm" />
            </div>
          )}

          <div ref={logEndRef} />
        </div>

        {/* Interactive console input */}
        <div className="border-t border-emerald-500/15 bg-black/40 px-3 py-2 flex items-center gap-2" title="stdin: sends keypresses to the running bot process | shell: runs a command in the bot directory">
          {/* Mode toggle */}
          <button
            onClick={() => setShellMode(v => !v)}
            title={shellMode ? 'Shell mode — runs commands in bot directory' : 'Stdin mode — sends input to running bot'}
            className={`flex-shrink-0 flex items-center gap-1 text-[10px] font-mono px-2 py-1 rounded border transition-all ${
              shellMode
                ? 'border-yellow-500/50 text-yellow-400 bg-yellow-500/10'
                : 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10'
            }`}
            data-testid="button-console-mode"
          >
            {shellMode ? <TerminalSquare className="w-3 h-3" /> : <Send className="w-3 h-3" />}
            {shellMode ? 'shell' : 'stdin'}
          </button>

          {/* Prompt prefix */}
          <span className="text-[11px] font-mono text-emerald-500 flex-shrink-0 select-none">
            {shellMode ? '$' : '>'}
          </span>

          {/* Input */}
          <input
            ref={inputRef}
            type="text"
            value={inputVal}
            onChange={e => setInputVal(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') sendInput(); }}
            placeholder={shellMode ? 'ls, npm start, cat .env …' : 'type input for bot (e.g. 1, phone number…)'}
            className="flex-1 bg-transparent text-[11px] font-mono text-gray-200 placeholder:text-gray-700 outline-none min-w-0"
            data-testid="input-console"
            autoComplete="off"
            spellCheck={false}
          />

          {/* Send button */}
          <button
            onClick={sendInput}
            disabled={sending || !inputVal.trim()}
            className="flex-shrink-0 flex items-center gap-1 text-[10px] font-mono px-2.5 py-1 rounded border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/15 transition-all disabled:opacity-30"
            data-testid="button-send-input"
          >
            <Send className="w-3 h-3" />
            {sending ? '…' : 'Send'}
          </button>
        </div>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Type',       value: 'Direct Process' },
          { label: 'Bot',        value: botName           },
          { label: 'Status',     value: meta.label        },
          { label: 'Uptime',     value: fmtTime(elapsed)  },
        ].map(({ label, value }) => (
          <div key={label} className="p-3 rounded-lg border border-gray-700/40 bg-black/30">
            <div className="text-[9px] font-mono text-gray-600 uppercase tracking-wider mb-1">{label}</div>
            <div className="text-xs font-mono text-white truncate">{value}</div>
          </div>
        ))}
      </div>

      <div className="p-3 rounded-lg border border-yellow-500/20 bg-yellow-500/5 text-[10px] font-mono text-yellow-300/70 leading-relaxed">
        ⚠ Direct deployments run as a process on the wolfXnode server. They will stop if the server restarts. Use{' '}
        <span className="text-yellow-300 font-bold">Restart</span> to bring the bot back up.
      </div>

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowDeleteModal(false)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-sm rounded-xl border border-red-500/30 bg-[#0a0a0a] shadow-2xl p-6 space-y-4"
            style={{ boxShadow: '0 0 40px rgba(239,68,68,0.15)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                <Trash2 className="w-4 h-4 text-red-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white font-mono">Delete Bot</h3>
                <p className="text-[11px] text-gray-500 font-mono mt-0.5">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-xs font-mono text-gray-400 leading-relaxed">
              Permanently delete <span className="text-white font-semibold">"{serverName || botName}"</span>? The process will be killed and all logs removed.
            </p>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-2 rounded-lg border border-gray-700/50 text-gray-400 text-xs font-mono hover:bg-gray-800/50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteAction}
                className="flex-1 py-2 rounded-lg border border-red-500/40 bg-red-500/10 text-red-400 text-xs font-mono font-semibold hover:bg-red-500/20 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
