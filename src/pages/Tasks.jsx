import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle,
  Circle,
  ExternalLink,
  Gift,
  Server,
  Clock,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';

const TASK_ICONS = {
  whatsapp_channel: '💬',
  whatsapp_group: '👥',
  telegram_group: '✈️',
  youtube_channel: '▶️',
};

const Tasks = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [completedCount, setCompletedCount] = useState(0);
  const [totalTasks, setTotalTasks] = useState(4);
  const [allCompleted, setAllCompleted] = useState(false);
  const [freeServerClaimed, setFreeServerClaimed] = useState(false);
  const [freeServer, setFreeServer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [completingTask, setCompletingTask] = useState(null);
  const [openedTasks, setOpenedTasks] = useState({});
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const userId = user?.panelId || user?.id;
  const userEmail = user?.email;

  const fetchTasks = async () => {
    try {
      const token = localStorage.getItem('jwt_token');
      const tHeaders = {};
      if (token) tHeaders['Authorization'] = `Bearer ${token}`;
      const res = await fetch(`/api/tasks?userId=${userId}`, { headers: tHeaders });
      const data = await res.json();
      if (data.success) {
        setTasks(data.tasks);
        setCompletedCount(data.completedCount);
        setTotalTasks(data.totalTasks);
        setAllCompleted(data.allCompleted);
        setFreeServerClaimed(data.freeServerClaimed);
        setFreeServer(data.freeServer);
      }
    } catch (e) {
      console.error('Failed to fetch tasks:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) fetchTasks();
  }, [userId]);

  const handleOpenLink = (taskId, link) => {
    window.open(link, '_blank', 'noopener,noreferrer');
    setOpenedTasks(prev => ({ ...prev, [taskId]: true }));
  };

  const handleCompleteTask = async (taskId) => {
    setCompletingTask(taskId);
    setError('');
    try {
      const token = localStorage.getItem('jwt_token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/tasks/complete', {
        method: 'POST',
        headers,
        body: JSON.stringify({ userId: userId.toString(), taskId }),
      });
      const data = await res.json();
      if (data.success) {
        setCompletedCount(data.completedCount);
        setAllCompleted(data.allCompleted);
        setTasks(prev => prev.map(t =>
          t.id === taskId ? { ...t, completed: true, completedAt: new Date().toISOString() } : t
        ));
      }
    } catch (e) {
      setError('Failed to mark task as completed');
    } finally {
      setCompletingTask(null);
    }
  };

  const handleClaimServer = async () => {
    setClaiming(true);
    setError('');
    setSuccessMsg('');
    try {
      const token = localStorage.getItem('jwt_token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/tasks/claim-server', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          userId: userId.toString(),
          userEmail,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setFreeServerClaimed(true);
        setFreeServer(data.server);
        setSuccessMsg('Your free trial server has been created! It will be available for 3 days.');
      } else {
        setError(data.message || 'Failed to claim free server');
      }
    } catch (e) {
      setError('Failed to claim free server. Please try again.');
    } finally {
      setClaiming(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" text="Loading tasks..." />
      </div>
    );
  }

  const progressPercent = totalTasks > 0 ? (completedCount / totalTasks) * 100 : 0;

  const getTimeRemaining = () => {
    if (!freeServer?.expiresAt) return null;
    const diff = new Date(freeServer.expiresAt) - new Date();
    if (diff <= 0) return 'Expired';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    if (days > 0) return `${days}d ${remainingHours}h remaining`;
    return `${remainingHours}h remaining`;
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-white">Tasks & Rewards</h1>
        <p className="text-gray-400 mt-1 font-mono text-sm">
          Complete all tasks to unlock a free trial server
        </p>
      </div>

      <div className="p-5 rounded-xl border border-primary/20 bg-black/30 backdrop-blur">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-mono text-gray-400">Progress</span>
          <span className="text-sm font-mono text-primary">
            {completedCount}/{totalTasks} Tasks Completed
          </span>
        </div>
        <div className="w-full h-3 bg-black/50 rounded-full border border-primary/10 overflow-hidden">
          <motion.div
            className="h-full bg-primary/80 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        </div>
      </div>

      <div className="space-y-3">
        {tasks.map((task, index) => (
          <motion.div
            key={task.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`p-4 rounded-xl border backdrop-blur transition-all ${
              task.completed
                ? 'border-primary/30 bg-primary/5'
                : 'border-gray-700/50 bg-black/30'
            }`}
          >
            <div className="flex items-center gap-4">
              <div className="text-2xl flex-shrink-0">
                {TASK_ICONS[task.id]}
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="text-white font-mono text-sm font-medium">
                  {task.name}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  {task.completed ? (
                    <span className="flex items-center gap-1 text-xs text-primary font-mono">
                      <CheckCircle size={12} />
                      Completed
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-gray-500 font-mono">
                      <Circle size={12} />
                      Not Completed
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => handleOpenLink(task.id, task.link)}
                  className="px-3 py-1.5 text-xs font-mono rounded-lg border border-gray-600/50 text-gray-300 hover:text-white hover:border-gray-500 transition-all flex items-center gap-1"
                >
                  Open
                  <ExternalLink size={12} />
                </button>

                {!task.completed && openedTasks[task.id] && (
                  <button
                    onClick={() => handleCompleteTask(task.id)}
                    disabled={completingTask === task.id}
                    className="px-3 py-1.5 text-xs font-mono rounded-lg border border-primary/30 text-primary hover:bg-primary/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                  >
                    {completingTask === task.id ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <CheckCircle size={12} />
                    )}
                    Mark Done
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 rounded-xl border border-red-500/30 bg-red-500/5 flex items-center gap-3"
          >
            <AlertCircle size={18} className="text-red-400 flex-shrink-0" />
            <span className="text-sm font-mono text-red-300">{error}</span>
          </motion.div>
        )}

        {successMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 rounded-xl border border-primary/30 bg-primary/5 flex items-center gap-3"
          >
            <CheckCircle size={18} className="text-primary flex-shrink-0" />
            <span className="text-sm font-mono text-primary">{successMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {freeServerClaimed && freeServer && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-5 rounded-xl border border-primary/20 bg-black/30 backdrop-blur"
        >
          <div className="flex items-center gap-3 mb-3">
            <Server size={20} className="text-primary" />
            <h3 className="text-white font-mono font-medium">Your Free Trial Server</h3>
          </div>
          <div className="space-y-2 text-sm font-mono">
            <div className="flex justify-between">
              <span className="text-gray-400">Server Name</span>
              <span className="text-white">{freeServer.name || freeServer.serverName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Server ID</span>
              <span className="text-white">{freeServer.identifier || freeServer.serverId}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Time Left</span>
              <span className="flex items-center gap-1 text-yellow-400">
                <Clock size={14} />
                {getTimeRemaining()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Resources</span>
              <span className="text-gray-300">1GB RAM / 5GB Disk / 1 vCPU</span>
            </div>
          </div>
          <a
            href={`https://panel.xwolf.space/server/${freeServer.identifier}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-primary/30 text-primary hover:bg-primary/10 transition-all font-mono text-sm"
          >
            Manage Server
            <ExternalLink size={14} />
          </a>
        </motion.div>
      )}

      {!freeServerClaimed && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-5 rounded-xl border border-primary/20 bg-black/30 backdrop-blur text-center"
        >
          <Gift size={32} className="text-primary mx-auto mb-3" />
          <h3 className="text-white font-mono font-medium mb-1">Free Trial Server</h3>
          <p className="text-gray-400 text-sm font-mono mb-4">
            Complete all 4 tasks to unlock a free 3-day trial server (1GB RAM, 5GB Disk)
          </p>

          {allCompleted ? (
            <button
              onClick={handleClaimServer}
              disabled={claiming}
              className="px-6 py-2.5 rounded-lg bg-primary/20 border border-primary/40 text-primary font-mono text-sm font-semibold hover:bg-primary/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mx-auto"
            >
              {claiming ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Creating Server...
                </>
              ) : (
                <>
                  <Server size={16} />
                  Unlock My Free Server
                </>
              )}
            </button>
          ) : (
            <div className="text-xs font-mono text-gray-500">
              {totalTasks - completedCount} task{totalTasks - completedCount !== 1 ? 's' : ''} remaining
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
};

export default Tasks;
