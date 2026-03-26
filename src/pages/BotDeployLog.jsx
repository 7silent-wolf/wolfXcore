import { useState, useEffect, useRef } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Bot, CheckCircle, Clock, Loader2, ExternalLink, Terminal,
  ArrowLeft, Zap, AlertCircle, RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';

const PANEL_URL = 'https://panel.xwolf.space';
const POLL_INTERVAL_MS = 4000;

const getAuthHeaders = () => {
  const token = localStorage.getItem('jwt_token');
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
};

const STEPS = [
  { key: 'created',     label: 'Server created on panel',       desc: 'Allocating resources & port' },
  { key: 'installing',  label: 'Installing dependencies',        desc: 'Cloning repo & running npm install' },
  { key: 'starting',    label: 'Starting your bot',              desc: 'Launching process on the server' },
  { key: 'running',     label: 'Bot is live!',                   desc: 'Your bot is online and running' },
];

function stepIndex(phase) {
  if (phase === 'installing') return 1;
  if (phase === 'starting')   return 2;
  if (phase === 'running')    return 3;
  return 0;
}

export default function BotDeployLog() {
  const { serverId } = useParams();
  const { state } = useLocation();

  const [status, setStatus] = useState(null);
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef(null);
  const timerRef = useRef(null);
  const startTime = useRef(Date.now());
  const logsEndRef = useRef(null);

  const addLog = (msg, type = 'info') => {
    const ts = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { ts, msg, type, id: Date.now() + Math.random() }]);
  };

  const fetchStatus = async () => {
    try {
      const res = await fetch(`/api/bots/server-status/${serverId}`, { headers: getAuthHeaders() });
      const data = await res.json();
      if (!data.success) {
        setError(data.message || 'Could not fetch status');
        return;
      }
      const prev = status;
      setStatus(data);

      if (!prev) {
        addLog(`Server "${data.name}" created successfully`, 'success');
        addLog(`Pterodactyl identifier: ${data.identifier}`, 'info');
        addLog('Installing bot files from GitHub...', 'info');
      } else if (prev.phase === 'installing' && data.phase !== 'installing') {
        addLog('Installation complete!', 'success');
        addLog('Starting bot process...', 'info');
      } else if (prev.phase !== 'running' && data.phase === 'running') {
        addLog('Bot is now running!', 'success');
        setDone(true);
        clearInterval(intervalRef.current);
        clearInterval(timerRef.current);
      }
    } catch {
      addLog('Could not reach server — retrying...', 'warn');
    }
  };

  useEffect(() => {
    addLog('Deployment initiated — waiting for panel confirmation...', 'info');

    fetchStatus();
    intervalRef.current = setInterval(fetchStatus, POLL_INTERVAL_MS);
    timerRef.current = setInterval(() => setElapsed(Math.floor((Date.now() - startTime.current) / 1000)), 1000);

    return () => {
      clearInterval(intervalRef.current);
      clearInterval(timerRef.current);
    };
  }, [serverId]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const phase = status?.phase || (done ? 'running' : 'installing');
  const currentStep = stepIndex(phase);
  const botName = state?.botName || status?.deployment?.botName || 'Bot';
  const serverName = state?.serverName || status?.name || serverId;
  const identifier = status?.identifier;

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/my-bots" className="p-2 rounded-lg hover:bg-white/5 transition-colors text-gray-400 hover:text-white">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="p-2 bg-primary/10 rounded-lg">
          <Bot className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-white">Deploying {botName}</h1>
          <p className="text-[11px] text-gray-400 font-mono">{serverName}</p>
        </div>
        <div className="ml-auto text-right">
          <div className="text-xs font-mono text-gray-400">Elapsed</div>
          <div className="text-sm font-mono text-white">{elapsed}s</div>
        </div>
      </div>

      {/* Step progress */}
      <div className="bg-gray-900/70 border border-gray-800 rounded-2xl p-5">
        <div className="space-y-4">
          {STEPS.map((step, i) => {
            const isDone = done ? true : i < currentStep;
            const isActive = !done && i === currentStep;
            const isPending = !done && i > currentStep;

            return (
              <motion.div
                key={step.key}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex items-start gap-3"
                data-testid={`step-${step.key}`}
              >
                <div className="flex-shrink-0 mt-0.5">
                  {isDone ? (
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  ) : isActive ? (
                    <Loader2 className="w-5 h-5 text-primary animate-spin" />
                  ) : (
                    <div className="w-5 h-5 rounded-full border-2 border-gray-700 flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-gray-700" />
                    </div>
                  )}
                </div>
                <div>
                  <div className={`text-sm font-semibold ${isDone ? 'text-green-400' : isActive ? 'text-white' : 'text-gray-600'}`}>
                    {step.label}
                  </div>
                  <div className={`text-[11px] font-mono ${isPending ? 'text-gray-700' : 'text-gray-400'}`}>
                    {step.desc}
                  </div>
                </div>
                {isActive && (
                  <div className="ml-auto flex-shrink-0">
                    <span className="text-[10px] font-mono text-primary animate-pulse">in progress...</span>
                  </div>
                )}
                {isDone && i === STEPS.length - 1 && (
                  <div className="ml-auto flex-shrink-0">
                    <span className="text-[10px] font-mono text-green-400">✓ complete</span>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Progress bar */}
        <div className="mt-5 w-full bg-gray-800 rounded-full h-1.5 overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-primary to-green-400 rounded-full"
            initial={{ width: '5%' }}
            animate={{ width: done ? '100%' : `${Math.min(5 + currentStep * 28, 95)}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Success actions */}
      <AnimatePresence>
        {done && identifier && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-green-900/20 border border-green-500/30 rounded-2xl p-5"
          >
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-5 h-5 text-green-400" />
              <span className="font-bold text-green-300">Your bot is live!</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <a
                href={`${PANEL_URL}/server/${identifier}`}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="link-open-console"
                className="flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/30 text-primary rounded-lg hover:bg-primary/20 transition-all text-sm font-mono"
              >
                <Terminal className="w-4 h-4" />
                Open Console
                <ExternalLink className="w-3 h-3 opacity-60" />
              </a>
              <Link
                to="/my-bots"
                className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-gray-700 text-gray-300 rounded-lg hover:bg-white/10 transition-all text-sm font-mono"
              >
                <Bot className="w-4 h-4" />
                My Bots
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Still installing — show panel link anyway */}
      {!done && identifier && (
        <div className="flex items-center justify-between px-4 py-3 bg-gray-900/50 border border-gray-800 rounded-xl">
          <span className="text-xs text-gray-400 font-mono">Watch live in the panel</span>
          <a
            href={`${PANEL_URL}/server/${identifier}`}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="link-panel-console"
            className="flex items-center gap-1.5 text-xs font-mono text-primary hover:text-primary/80 transition-colors"
          >
            Open Console <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}

      {/* Log terminal */}
      <div className="bg-black/80 border border-gray-800 rounded-2xl overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-800 bg-gray-900/50">
          <Terminal className="w-4 h-4 text-gray-400" />
          <span className="text-xs font-mono text-gray-400">Deployment log</span>
          {!done && <Loader2 className="w-3 h-3 text-primary animate-spin ml-auto" />}
          {done && <CheckCircle className="w-3 h-3 text-green-400 ml-auto" />}
        </div>
        <div className="p-4 space-y-1 max-h-56 overflow-y-auto font-mono text-[11px]">
          {logs.map(log => (
            <motion.div
              key={log.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-2"
            >
              <span className="text-gray-600 flex-shrink-0">{log.ts}</span>
              <span className={
                log.type === 'success' ? 'text-green-400' :
                log.type === 'warn'    ? 'text-yellow-400' :
                log.type === 'error'   ? 'text-red-400' :
                'text-gray-300'
              }>
                {log.msg}
              </span>
            </motion.div>
          ))}
          <div ref={logsEndRef} />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-900/20 border border-red-500/30 rounded-xl text-xs text-red-300 font-mono">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Note */}
      {!done && (
        <p className="text-center text-[11px] text-gray-600 font-mono">
          Installation usually takes 1–3 minutes. You can close this page — your bot will keep deploying.
        </p>
      )}
    </div>
  );
}
