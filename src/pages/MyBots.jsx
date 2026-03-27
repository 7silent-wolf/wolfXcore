import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bot, ExternalLink, Trash2, RefreshCw, Terminal, Zap, Clock, AlertCircle, Plus, Server, Square, RotateCcw, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { Link, useNavigate } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';

const getAuthHeaders = () => {
  const token = localStorage.getItem('jwt_token');
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
};

const PANEL_URL = 'https://panel.xwolf.space';

const STATUS_COLOR = {
  running:   'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  deploying: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  queued:    'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  stopped:   'text-gray-400 bg-gray-500/10 border-gray-500/20',
  failed:    'text-red-400 bg-red-500/10 border-red-500/20',
};

export default function MyBots() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('direct'); // 'panel' | 'direct'
  const [panelDeployments, setPanelDeployments] = useState([]);
  const [directDeployments, setDirectDeployments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);
  const [actionBusy, setActionBusy] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [panelRes, directRes] = await Promise.all([
        fetch('/api/bots/my-deployments', { headers: getAuthHeaders() }),
        fetch('/api/bots/my-direct-deployments', { headers: getAuthHeaders() }),
      ]);
      const [panelData, directData] = await Promise.all([panelRes.json(), directRes.json()]);
      const panel  = panelData.success  ? panelData.deployments  : [];
      const direct = directData.success ? directData.deployments : [];
      setPanelDeployments(panel);
      setDirectDeployments(direct);
      // Auto-select the tab that has bots; prefer direct if both have bots
      if (direct.length > 0) setTab('direct');
      else if (panel.length > 0) setTab('panel');
    } catch {
      toast.error('Failed to load deployments');
    } finally {
      setLoading(false);
    }
  };

  const handlePanelDelete = async (dep) => {
    setDeleting(dep.id);
    try {
      const res = await fetch(`/api/bots/my-deployments/${dep.id}`, { method: 'DELETE', headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success) {
        toast.success('Bot removed');
        setPanelDeployments(prev => prev.filter(d => d.id !== dep.id));
      } else {
        toast.error(data.message || 'Failed to remove bot');
      }
    } catch { toast.error('Failed to remove bot'); }
    finally { setDeleting(null); }
  };

  const handleDirectAction = async (dep, action) => {
    setActionBusy(`${dep.id}-${action}`);
    try {
      const method = action === 'delete' ? 'DELETE' : 'POST';
      const endpoint = action === 'delete' ? '' : action;
      const url = `/api/bots/direct/${dep.id}${endpoint ? '/' + endpoint : ''}`;
      const res = await fetch(url, { method, headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success) {
        if (action === 'delete') {
          toast.success('Bot deleted');
          setDirectDeployments(prev => prev.filter(d => d.id !== dep.id));
        } else if (action === 'stop') {
          toast.success('Bot stopped');
          setDirectDeployments(prev => prev.map(d => d.id === dep.id ? { ...d, status: 'stopped' } : d));
        } else if (action === 'restart') {
          toast.success('Bot restarting…');
          setDirectDeployments(prev => prev.map(d => d.id === dep.id ? { ...d, status: 'queued' } : d));
        }
      } else {
        toast.error(data.message || 'Action failed');
      }
    } catch { toast.error('Action failed'); }
    finally { setActionBusy(null); }
  };

  const handleConfirmDelete = () => {
    if (!confirmDel) return;
    const { dep, type } = confirmDel;
    setConfirmDel(null);
    if (type === 'panel') handlePanelDelete(dep);
    else handleDirectAction(dep, 'delete');
  };

  const formatDate = (iso) => {
    try { return new Date(iso).toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' }); }
    catch { return iso; }
  };

  const totalBots = panelDeployments.length + directDeployments.length;

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-display font-bold text-white flex items-center gap-2">
            <Terminal className="text-primary w-5 h-5 sm:w-6 sm:h-6" />
            My Bots
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1 font-mono">{totalBots} deployed bot{totalBots !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            data-testid="button-refresh-bots"
            onClick={fetchAll}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-primary/20 text-xs text-primary font-mono hover:bg-primary/10 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
          <Link
            to="/available-bots"
            data-testid="link-browse-bots"
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/30 text-xs text-primary font-mono font-semibold hover:bg-primary/20 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Deploy New
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-700/40">
        <button
          data-testid="tab-panel-bots"
          onClick={() => setTab('panel')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-mono font-semibold border-b-2 transition-all ${
            tab === 'panel'
              ? 'border-primary text-primary'
              : 'border-transparent text-gray-500 hover:text-gray-300'
          }`}
        >
          <Server className="w-3.5 h-3.5" />
          Panel Bots
          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
            tab === 'panel' ? 'bg-primary/20 text-primary' : 'bg-gray-700/50 text-gray-500'
          }`}>{panelDeployments.length}</span>
        </button>
        <button
          data-testid="tab-direct-bots"
          onClick={() => setTab('direct')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-mono font-semibold border-b-2 transition-all ${
            tab === 'direct'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-gray-500 hover:text-gray-300'
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          Direct Bots
          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
            tab === 'direct' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-700/50 text-gray-500'
          }`}>{directDeployments.length}</span>
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <LoadingSpinner size="lg" />
        </div>
      ) : tab === 'panel' ? (
        <>
          {panelDeployments.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-3">
              {panelDeployments.map((dep, i) => (
                <motion.div
                  key={dep.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  data-testid={`card-deployment-${dep.id}`}
                  className="p-4 rounded-xl border border-primary/15 bg-black/30 backdrop-blur-sm hover:border-primary/25 transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                        <Server className="w-5 h-5 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-bold text-white font-mono truncate" data-testid={`text-bot-server-name-${dep.id}`}>
                            {dep.serverName}
                          </h3>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-mono ${STATUS_COLOR[dep.status] || STATUS_COLOR.running}`}>
                            {dep.status || 'running'}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary/70 font-mono border border-primary/15">panel</span>
                        </div>
                        <p className="text-xs text-gray-500 font-mono mt-0.5" data-testid={`text-bot-name-${dep.id}`}>{dep.botName}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="flex items-center gap-1 text-[10px] text-gray-600 font-mono">
                            <Clock className="w-3 h-3" />
                            {formatDate(dep.deployedAt)}
                          </span>
                          <span className="text-[10px] text-gray-700">·</span>
                          <span className="text-[10px] text-yellow-600 font-mono">KES {dep.priceKES} paid</span>
                          {dep.serverIdentifier && (
                            <>
                              <span className="text-[10px] text-gray-700">·</span>
                              <span className="text-[10px] text-gray-600 font-mono">ID: {dep.serverIdentifier}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {/* In-app deploy log page */}
                      {dep.serverIdentifier && (
                        <Link
                          to={`/bots/deploying/${dep.serverIdentifier}`}
                          state={{ botName: dep.botName, serverName: dep.serverName }}
                          data-testid={`link-logs-${dep.id}`}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary/20 text-xs text-primary font-mono hover:bg-primary/10 transition-colors"
                        >
                          <Terminal className="w-3.5 h-3.5" />
                          Logs
                        </Link>
                      )}
                      {/* External panel console */}
                      {dep.serverIdentifier && (
                        <a
                          href={`${PANEL_URL}/server/${dep.serverIdentifier}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          data-testid={`link-panel-${dep.id}`}
                          className="p-2 rounded-lg border border-gray-700/40 text-gray-500 hover:text-primary/80 hover:border-primary/30 transition-colors"
                          title="Open panel console"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                      <button
                        data-testid={`button-delete-bot-${dep.id}`}
                        onClick={() => setConfirmDel({ dep, type: 'panel' })}
                        disabled={deleting === dep.id}
                        className="p-2 rounded-lg border border-red-500/20 text-red-400/60 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/30 transition-all disabled:opacity-40"
                        title="Remove bot"
                      >
                        {deleting === dep.id ? <LoadingSpinner size="sm" /> : <Trash2 className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
          <div className="flex items-start gap-2.5 p-3 rounded-lg border border-yellow-500/15 bg-yellow-500/5">
            <AlertCircle className="w-4 h-4 text-yellow-500/60 shrink-0 mt-0.5" />
            <p className="text-xs text-gray-500 font-mono leading-relaxed">
              Click <strong className="text-gray-400">Console</strong> to manage your bot on the Pterodactyl panel. Panel bots run in isolated containers and survive server restarts.
            </p>
          </div>
        </>
      ) : (
        <>
          {directDeployments.length === 0 ? (
            <EmptyState isDirect />
          ) : (
            <div className="space-y-3">
              {directDeployments.map((dep, i) => (
                <motion.div
                  key={dep.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  data-testid={`card-direct-deployment-${dep.id}`}
                  className="p-4 rounded-xl border border-emerald-500/15 bg-black/30 backdrop-blur-sm hover:border-emerald-500/25 transition-all cursor-pointer"
                  onClick={() => navigate(`/bots/direct/${dep.id}/logs`, { state: { botName: dep.botName, serverName: dep.serverName } })}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                        <Terminal className="w-5 h-5 text-emerald-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-bold text-white font-mono truncate" data-testid={`text-direct-bot-name-${dep.id}`}>
                            {dep.serverName}
                          </h3>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-mono ${STATUS_COLOR[dep.status] || STATUS_COLOR.stopped}`}>
                            {dep.status}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400/70 font-mono border border-emerald-500/15">direct</span>
                        </div>
                        <p className="text-xs text-gray-500 font-mono mt-0.5">{dep.botName}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="flex items-center gap-1 text-[10px] text-gray-600 font-mono">
                            <Clock className="w-3 h-3" />
                            {formatDate(dep.deployedAt)}
                          </span>
                          <span className="text-[10px] text-gray-700">·</span>
                          <span className="text-[10px] text-yellow-600 font-mono">KES {dep.priceKES} paid</span>
                          {dep.pid && (
                            <>
                              <span className="text-[10px] text-gray-700">·</span>
                              <span className="text-[10px] text-gray-600 font-mono">PID {dep.pid}</span>
                            </>
                          )}
                          <span className="text-[10px] text-gray-700">·</span>
                          <span className="text-[10px] text-gray-600 font-mono">{dep.logCount || 0} log lines</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                      {/* View logs */}
                      <button
                        data-testid={`button-view-logs-${dep.id}`}
                        onClick={() => navigate(`/bots/direct/${dep.id}/logs`, { state: { botName: dep.botName, serverName: dep.serverName } })}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-500/20 text-xs text-emerald-400 font-mono hover:bg-emerald-500/10 transition-colors"
                      >
                        <Terminal className="w-3.5 h-3.5" />
                        Logs
                      </button>
                      {/* Stop / Restart */}
                      {(dep.status === 'running' || dep.status === 'deploying') && (
                        <button
                          data-testid={`button-stop-direct-${dep.id}`}
                          onClick={() => handleDirectAction(dep, 'stop')}
                          disabled={actionBusy === `${dep.id}-stop`}
                          className="p-2 rounded-lg border border-yellow-500/20 text-yellow-400/60 hover:text-yellow-400 hover:bg-yellow-500/10 transition-all disabled:opacity-40"
                          title="Stop bot"
                        >
                          {actionBusy === `${dep.id}-stop` ? <LoadingSpinner size="sm" /> : <Square className="w-3.5 h-3.5" />}
                        </button>
                      )}
                      {(dep.status === 'stopped' || dep.status === 'failed') && (
                        <button
                          data-testid={`button-restart-direct-${dep.id}`}
                          onClick={() => handleDirectAction(dep, 'restart')}
                          disabled={actionBusy === `${dep.id}-restart`}
                          className="p-2 rounded-lg border border-emerald-500/20 text-emerald-400/60 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all disabled:opacity-40"
                          title="Restart bot"
                        >
                          {actionBusy === `${dep.id}-restart` ? <LoadingSpinner size="sm" /> : <RotateCcw className="w-3.5 h-3.5" />}
                        </button>
                      )}
                      <button
                        data-testid={`button-delete-direct-${dep.id}`}
                        onClick={() => setConfirmDel({ dep, type: 'direct' })}
                        disabled={actionBusy === `${dep.id}-delete`}
                        className="p-2 rounded-lg border border-red-500/20 text-red-400/60 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/30 transition-all disabled:opacity-40"
                        title="Delete bot"
                      >
                        {actionBusy === `${dep.id}-delete` ? <LoadingSpinner size="sm" /> : <Trash2 className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
          <div className="flex items-start gap-2.5 p-3 rounded-lg border border-yellow-500/15 bg-yellow-500/5">
            <AlertCircle className="w-4 h-4 text-yellow-500/60 shrink-0 mt-0.5" />
            <p className="text-xs text-gray-500 font-mono leading-relaxed">
              Direct bots run as processes on the wolfXnode server. They will stop if the server restarts — click <strong className="text-gray-400">Restart</strong> to bring them back. Click a card to view live logs.
            </p>
          </div>
        </>
      )}

      {confirmDel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setConfirmDel(null)}>
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
              Permanently delete <span className="text-white font-semibold">"{confirmDel.dep.serverName}"</span>? The bot process will be stopped and all data removed.
            </p>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setConfirmDel(null)}
                className="flex-1 py-2 rounded-lg border border-gray-700/50 text-gray-400 text-xs font-mono hover:bg-gray-800/50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
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

function EmptyState({ isDirect = false }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-20 text-center space-y-4"
    >
      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${isDirect ? 'bg-emerald-500/5 border border-emerald-500/10' : 'bg-primary/5 border border-primary/10'}`}>
        {isDirect ? <Terminal className="w-8 h-8 text-gray-700" /> : <Bot className="w-8 h-8 text-gray-700" />}
      </div>
      <div>
        <p className="text-gray-400 font-mono text-sm mb-1">
          {isDirect ? 'No direct bots deployed yet' : 'No panel bots deployed yet'}
        </p>
        <p className="text-gray-600 font-mono text-xs">
          {isDirect ? 'Use "Direct Deploy" from the bot catalog for live log streaming' : 'Browse the catalog and deploy your first bot to the panel'}
        </p>
      </div>
      <Link
        to="/available-bots"
        data-testid="link-go-to-catalog"
        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-mono font-semibold transition-colors ${
          isDirect
            ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
            : 'bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20'
        }`}
      >
        <Zap className="w-4 h-4" />
        {isDirect ? 'Browse & Direct Deploy' : 'Browse Available Bots'}
      </Link>
    </motion.div>
  );
}
