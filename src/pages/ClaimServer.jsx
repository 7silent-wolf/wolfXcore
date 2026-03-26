import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Gift, Server, Clock, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const ClaimServer = () => {
  const { user } = useAuth();
  const [serverName, setServerName] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);
  const [alreadyClaimed, setAlreadyClaimed] = useState(false);
  const [existingServer, setExistingServer] = useState(null);

  useEffect(() => {
    checkClaimStatus();
  }, []);

  const checkClaimStatus = async () => {
    try {
      const token = localStorage.getItem('jwt_token');
      const res = await fetch('/api/free-server/status', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setAlreadyClaimed(data.claimed || data.hasFreeServer);
        if (data.freeServer) {
          setExistingServer(data.freeServer);
        }
      }
    } catch (e) {
    } finally {
      setChecking(false);
    }
  };

  const handleClaim = async (e) => {
    e.preventDefault();
    if (!serverName.trim()) {
      setError('Please enter a name for your server');
      return;
    }
    if (serverName.trim().length < 3) {
      setError('Server name must be at least 3 characters');
      return;
    }
    if (serverName.trim().length > 50) {
      setError('Server name must be under 50 characters');
      return;
    }
    if (!/^[a-zA-Z0-9_\- ]+$/.test(serverName.trim())) {
      setError('Server name can only contain letters, numbers, spaces, hyphens, and underscores');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('jwt_token');
      const res = await fetch('/api/free-server/claim-welcome', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ serverName: serverName.trim() }),
      });
      const data = await res.json();

      if (data.success) {
        setSuccess(data);
        setAlreadyClaimed(true);
      } else {
        if (data.alreadyClaimed) {
          setAlreadyClaimed(true);
          setError('You have already claimed your free server.');
        } else {
          setError(data.message || 'Failed to claim server');
        }
      }
    } catch (e) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Gift className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-white">Claim Free Server</h1>
            <p className="text-sm font-mono text-gray-400">Get a free 3-day trial server</p>
          </div>
        </div>

        {success ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-6 rounded-xl border border-green-500/30 bg-green-500/5"
          >
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-500" />
              <h2 className="text-xl font-display font-bold text-green-400">Server Created!</h2>
            </div>
            <div className="space-y-3 font-mono text-sm">
              <div className="flex justify-between py-2 border-b border-green-500/10">
                <span className="text-gray-400">Server Name</span>
                <span className="text-white">{success.server?.name}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-green-500/10">
                <span className="text-gray-400">Server ID</span>
                <span className="text-white">{success.server?.identifier}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-green-500/10">
                <span className="text-gray-400">Expires</span>
                <span className="text-yellow-400">{success.server?.expiresAt ? new Date(success.server.expiresAt).toLocaleDateString() : '3 days from now'}</span>
              </div>
            </div>
            <p className="mt-4 text-sm text-gray-400">
              Your server is now live! Head over to <a href="/servers" className="text-primary hover:underline">My Servers</a> to manage it.
            </p>
          </motion.div>
        ) : alreadyClaimed ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-6 rounded-xl border border-yellow-500/30 bg-yellow-500/5"
          >
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="w-8 h-8 text-yellow-500" />
              <h2 className="text-xl font-display font-bold text-yellow-400">Already Claimed</h2>
            </div>
            <p className="text-gray-400 font-mono text-sm mb-4">
              You have already claimed your free trial server. Each account is entitled to one free server.
            </p>
            {existingServer && (
              <div className="space-y-2 font-mono text-sm mt-4 p-4 rounded-lg border border-primary/10 bg-black/30">
                <div className="flex justify-between">
                  <span className="text-gray-400">Server</span>
                  <span className="text-white">{existingServer.serverName}</span>
                </div>
                {existingServer.expiresAt && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Expires</span>
                    <span className="text-yellow-400">{new Date(existingServer.expiresAt).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            )}
            <p className="mt-4 text-sm text-gray-400">
              Want more? <a href="/servers" className="text-primary hover:underline">Purchase a server</a> for permanent hosting.
            </p>
          </motion.div>
        ) : (
          <div className="space-y-6">
            <div className="p-6 rounded-xl border border-primary/20 bg-primary/5">
              <h2 className="text-lg font-display font-bold text-white mb-3">What You Get</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex items-center gap-3 p-3 rounded-lg border border-primary/10 bg-black/30">
                  <Server className="w-5 h-5 text-primary flex-shrink-0" />
                  <div>
                    <p className="text-sm font-mono text-white">Limited Server</p>
                    <p className="text-xs font-mono text-gray-500">1GB RAM, 5GB Disk</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg border border-primary/10 bg-black/30">
                  <Clock className="w-5 h-5 text-yellow-500 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-mono text-white">3-Day Trial</p>
                    <p className="text-xs font-mono text-gray-500">Auto-expires</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg border border-primary/10 bg-black/30">
                  <Gift className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-mono text-white">100% Free</p>
                    <p className="text-xs font-mono text-gray-500">No payment needed</p>
                  </div>
                </div>
              </div>
            </div>

            <form onSubmit={handleClaim} className="p-6 rounded-xl border border-primary/20 bg-black/30">
              <label htmlFor="serverName" className="block text-sm font-mono text-gray-400 mb-2">
                Server Name
              </label>
              <input
                id="serverName"
                type="text"
                value={serverName}
                onChange={(e) => { setServerName(e.target.value); setError(''); }}
                placeholder="e.g. my-discord-bot"
                className="w-full px-4 py-3 rounded-lg border border-primary/20 bg-black/50 text-white font-mono text-sm placeholder:text-gray-600 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all"
                disabled={loading}
                maxLength={50}
              />
              <p className="mt-2 text-xs font-mono text-gray-500">
                Letters, numbers, spaces, hyphens, and underscores only.
              </p>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-3 p-3 rounded-lg border border-red-500/30 bg-red-500/5"
                >
                  <p className="text-sm font-mono text-red-400">{error}</p>
                </motion.div>
              )}

              <motion.button
                type="submit"
                disabled={loading || !serverName.trim()}
                className="mt-4 w-full px-6 py-3 rounded-lg bg-primary/10 border border-primary/30 text-primary font-mono font-semibold text-sm hover:bg-primary/20 hover:border-primary/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                whileHover={{ scale: loading ? 1 : 1.02 }}
                whileTap={{ scale: loading ? 1 : 0.98 }}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating Server...
                  </>
                ) : (
                  <>
                    <Gift className="w-4 h-4" />
                    Claim Free Server
                  </>
                )}
              </motion.button>
            </form>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default ClaimServer;
