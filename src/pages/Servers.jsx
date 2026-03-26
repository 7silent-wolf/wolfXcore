import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Server, 
  Plus, 
  Grid, 
  List, 
  Search,
  AlertCircle,
  CheckCircle,
  X,
  ArrowUpRight,
  Play,
  StopCircle,
  RefreshCw,
  Terminal,
  Trash2,
  Wallet,
  Shield,
  Zap,
  Crown,
  Check,
  ExternalLink
} from 'lucide-react';
import { serverAPI, walletAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { getCountryByCode, formatCurrency, convertFromKES } from '../lib/currencyConfig';
import LoadingSpinner from '../components/LoadingSpinner';

const SERVER_TIERS = {
  Limited: {
    price: 50,
    color: 'primary',
    specs: { cpu: '1 vCPU', ram: '5GB', storage: '10GB', slots: '10 Slots' },
    features: ['5GB RAM Allocation', 'Nest 5 (Wolfhost)', 'Basic DDoS Protection', 'Community Support'],
  },
  Unlimited: {
    price: 100,
    color: 'blue',
    specs: { cpu: '2 vCPU', ram: 'Unlimited', storage: '40GB', slots: 'Unlimited' },
    features: ['Full RAM Access', 'Nest 5 (Wolfhost)', 'Advanced DDoS Protection', 'Priority Support'],
  },
  Admin: {
    price: 250,
    color: 'purple',
    specs: { cpu: '4 vCPU', ram: 'Unlimited', storage: '80GB', slots: 'Unlimited' },
    features: ['Full RAM Access', 'Admin Panel Access', 'Full DDoS Protection', '24/7 Support'],
  },
};

const PLAN_PRICES = Object.fromEntries(
  Object.entries(SERVER_TIERS).map(([k, v]) => [k, v.price])
);

const Servers = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const countryConfig = getCountryByCode(user?.countryCode || 'KE');
  const userCurrency = countryConfig.currency;
  const [servers, setServers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showConsoleModal, setShowConsoleModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [serverToDelete, setServerToDelete] = useState(null);
  const [selectedServer, setSelectedServer] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [walletBalance, setWalletBalance] = useState(0);
  const [balanceLoaded, setBalanceLoaded] = useState(false);

  const [newServer, setNewServer] = useState({ name: '', plan: 'Limited' });
  const [selectedTier, setSelectedTier] = useState(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchServers();
    fetchBalance();
  }, []);

  const fetchBalance = async () => {
    try {
      const result = await walletAPI.getBalance();
      if (result.success) {
        setWalletBalance(result.balance);
      }
    } catch (err) {
      console.error('Error fetching balance:', err);
    } finally {
      setBalanceLoaded(true);
    }
  };

  const fetchServers = async () => {
    try {
      const result = await serverAPI.getServers();
      if (result.success) {
        setServers(result.servers);
      }
    } catch (err) {
      showMessage('error', 'Failed to fetch servers');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 4000);
  };

  const handleDeployClick = () => {
    if (!balanceLoaded) {
      showMessage('error', 'Loading wallet balance, please wait...');
      return;
    }
    const minRequired = PLAN_PRICES['Limited'];
    if (walletBalance < minRequired) {
      showMessage('error', `Insufficient balance (${formatCurrency(convertFromKES(walletBalance, userCurrency), userCurrency)}). Minimum ${formatCurrency(convertFromKES(minRequired, userCurrency), userCurrency)} required. Redirecting to wallet...`);
      setTimeout(() => navigate('/wallet'), 2000);
      return;
    }
    setSelectedTier(null);
    setNewServer({ name: '', plan: 'Limited' });
    setShowCreateModal(true);
  };

  const handleStart = async (serverId) => {
    showMessage('success', 'Use the Pterodactyl panel to start your server. Opening panel...');
    window.open('https://panel.xwolf.space', '_blank');
  };

  const handleStop = async (serverId) => {
    showMessage('success', 'Use the Pterodactyl panel to stop your server. Opening panel...');
    window.open('https://panel.xwolf.space', '_blank');
  };

  const handleRestart = async (serverId) => {
    showMessage('success', 'Use the Pterodactyl panel to restart your server. Opening panel...');
    window.open('https://panel.xwolf.space', '_blank');
  };

  const handleDelete = async (serverId) => {
    const server = servers.find(s => s.id === serverId);
    if (!server) return;
    setServerToDelete(server);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!serverToDelete) return;
    try {
      const result = await serverAPI.deleteServer(serverToDelete.id);
      if (result.success) {
        setServers(servers.filter(s => s.id !== serverToDelete.id));
        showMessage('success', `Server "${serverToDelete.name}" deleted successfully from the panel`);
      } else {
        showMessage('error', result.message || 'Failed to delete server');
      }
    } catch (err) {
      showMessage('error', 'Failed to delete server');
    }
    setShowDeleteModal(false);
    setServerToDelete(null);
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setServerToDelete(null);
  };

  const handleConsole = (serverId) => {
    showMessage('success', 'Opening server console on the panel...');
    const server = servers.find(s => s.id === serverId);
    if (server?.identifier) {
      window.open(`https://panel.xwolf.space/server/${server.identifier}`, '_blank');
    } else {
      window.open('https://panel.xwolf.space', '_blank');
    }
  };

  const handleCreateServer = async (e) => {
    e.preventDefault();
    if (!newServer.name.trim()) {
      showMessage('error', 'Server name is required');
      return;
    }

    const planCost = PLAN_PRICES[newServer.plan] || 50;
    if (!balanceLoaded || walletBalance < planCost) {
      showMessage('error', `Insufficient balance for ${newServer.plan} plan. You need ${formatCurrency(convertFromKES(planCost, userCurrency), userCurrency)} but have ${formatCurrency(convertFromKES(walletBalance, userCurrency), userCurrency)}. Redirecting to wallet...`);
      setShowCreateModal(false);
      setTimeout(() => navigate('/wallet'), 2000);
      return;
    }

    setCreating(true);
    try {
      const user = JSON.parse(localStorage.getItem('current_user') || '{}');
      const result = await serverAPI.createServer({
        name: newServer.name,
        plan: newServer.plan,
        userId: user.panelId || user.id,
        userEmail: user.email,
      });
      if (result.success) {
        showMessage('success', 'Server created successfully on the panel!');
        setShowCreateModal(false);
        setNewServer({ name: '', plan: 'Limited' });
        setSelectedTier(null);
        fetchServers();
        fetchBalance();
      } else {
        showMessage('error', result.message || 'Failed to create server');
      }
    } catch (err) {
      showMessage('error', 'Failed to create server');
    } finally {
      setCreating(false);
    }
  };

  const filteredServers = servers.filter(server =>
    server.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (server.ip && server.ip.includes(searchQuery)) ||
    (server.identifier && server.identifier.includes(searchQuery))
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <LoadingSpinner size="lg" text="Loading servers..." />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-8">
      <div className="flex flex-wrap justify-between items-end gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold mb-1 sm:mb-2">Server Management</h1>
          <p className="text-gray-400 font-mono text-xs sm:text-sm">
            Deploy and manage your infrastructure
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 bg-black/30 border border-primary/20 rounded-lg font-mono text-xs sm:text-sm" data-testid="text-wallet-balance-servers">
            <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
            <span className="text-gray-400">Balance:</span>
            <span className="text-primary">{balanceLoaded ? formatCurrency(convertFromKES(walletBalance, userCurrency), userCurrency) : '...'}</span>
          </div>
          <motion.button
            className="group px-3 sm:px-4 py-1.5 sm:py-2 bg-primary/10 border border-primary/30 rounded-lg hover:bg-primary/20 transition-all flex items-center gap-2"
            onClick={handleDeployClick}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
            data-testid="button-deploy-server"
          >
            <div className="flex items-center text-xs sm:text-sm font-mono">
              <Plus className="w-4 h-4 mr-1.5 sm:mr-2" />
              Deploy
              <ArrowUpRight className="w-3.5 h-3.5 ml-1.5 group-hover:rotate-45 transition-transform hidden sm:block" />
            </div>
          </motion.button>
        </div>
      </div>

      <AnimatePresence>
        {message.text && (
          <motion.div
            className={`
              fixed top-20 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl max-w-md
              ${message.type === 'success' ? 'bg-primary/5 border border-primary/30 text-primary' : ''}
              ${message.type === 'error' ? 'bg-red-500/5 border border-red-500/30 text-red-400' : ''}
            `}
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            data-testid="text-server-message"
          >
            {message.type === 'success' ? <CheckCircle size={18} className="shrink-0" /> : <AlertCircle size={18} className="shrink-0" />}
            <span className="text-sm font-mono">{message.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="p-3 sm:p-6 rounded-xl border border-primary/20 bg-black/30 backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-center">
          <div className="relative flex-1 w-full">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search servers by name or IP..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-black/40 border border-primary/20 rounded-lg px-4 py-2 pl-10 text-sm font-mono placeholder-gray-500 focus:outline-none focus:border-primary/40 transition-colors"
              data-testid="input-search-servers"
            />
          </div>
          <div className="flex items-center gap-2 border border-primary/20 rounded-lg p-1 bg-black/40">
            <button
              className={`p-2 rounded ${viewMode === 'grid' ? 'bg-primary/10 text-primary' : 'text-gray-400 hover:text-gray-300'}`}
              onClick={() => setViewMode('grid')}
              data-testid="button-view-grid"
            >
              <Grid size={18} />
            </button>
            <button
              className={`p-2 rounded ${viewMode === 'list' ? 'bg-primary/10 text-primary' : 'text-gray-400 hover:text-gray-300'}`}
              onClick={() => setViewMode('list')}
              data-testid="button-view-list"
            >
              <List size={18} />
            </button>
          </div>
        </div>
      </div>

      {filteredServers.length === 0 ? (
        <div className="p-6 sm:p-12 rounded-xl border border-primary/20 bg-black/30 backdrop-blur-sm text-center">
          <Server size={36} className="mx-auto text-gray-500 mb-3 sm:mb-4" />
          <h3 className="text-base sm:text-lg font-bold mb-2">No servers found</h3>
          <p className="text-gray-500 mb-2 font-mono">
            {searchQuery ? 'Try a different search term' : 'Deploy your first server to get started'}
          </p>
          {!searchQuery && (
            <>
              <p className="text-gray-600 mb-6 font-mono text-xs">
                Minimum balance required: {formatCurrency(convertFromKES(PLAN_PRICES['Limited'], userCurrency), userCurrency)}
              </p>
              <button
                className="px-4 py-2 bg-primary/10 border border-primary/30 rounded-lg hover:bg-primary/20 transition-all inline-flex items-center gap-2 font-mono text-sm"
                onClick={handleDeployClick}
                data-testid="button-deploy-server-empty"
              >
                <Plus size={16} />
                Deploy Server
              </button>
            </>
          )}
        </div>
      ) : (
        <div className={`grid gap-3 sm:gap-6 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3' : 'grid-cols-1'}`}>
          {filteredServers.map((server, index) => (
            <motion.div
              key={server.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <div className="p-3 sm:p-6 rounded-xl border border-primary/20 bg-black/30 backdrop-blur-sm hover:border-primary/40 transition-all group" data-testid={`card-server-${server.id}`}>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Server className="w-5 h-5 text-primary" />
                      <h3 className="font-bold truncate">{server.name}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${server.status === 'online' || server.status === 'running' ? 'bg-green-500 animate-pulse' : server.status === 'installing' ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'}`} />
                      <span className="text-xs font-mono text-gray-400">{(server.status || 'unknown').toUpperCase()}</span>
                      <span className="text-xs font-mono text-primary">·</span>
                      <span className="text-xs font-mono text-gray-400">{server.ip || server.identifier || 'Provisioning...'}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className={`px-2 py-1 rounded text-xs font-mono ${server.plan === 'Admin' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : server.plan === 'Unlimited' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-primary/10 text-primary border border-primary/20'}`}>
                      {server.plan}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="p-3 rounded-lg border border-primary/10 bg-black/20">
                    <p className="text-xs text-gray-500 mb-1">CPU</p>
                    <p className="font-mono text-sm">{server.cpu || '4 vCPU'}</p>
                  </div>
                  <div className="p-3 rounded-lg border border-primary/10 bg-black/20">
                    <p className="text-xs text-gray-500 mb-1">RAM</p>
                    <p className="font-mono text-sm">{server.ram || '8GB'}</p>
                  </div>
                  <div className="p-3 rounded-lg border border-primary/10 bg-black/20">
                    <p className="text-xs text-gray-500 mb-1">Storage</p>
                    <p className="font-mono text-sm">{server.storage || '80GB'}</p>
                  </div>
                  <div className="p-3 rounded-lg border border-primary/10 bg-black/20">
                    <p className="text-xs text-gray-500 mb-1">Uptime</p>
                    <p className="font-mono text-sm">{server.uptime || '99.9%'}</p>
                  </div>
                </div>

                <motion.a
                  href={server.identifier ? `https://panel.xwolf.space/server/${server.identifier}` : 'https://panel.xwolf.space'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full mb-3 px-4 py-2.5 bg-primary/10 hover:bg-primary/20 border border-primary/30 rounded-lg text-sm font-mono flex items-center justify-center gap-2 transition-all text-primary font-semibold"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  data-testid={`button-manage-server-${server.id}`}
                >
                  <ExternalLink size={16} />
                  Manage Server
                </motion.a>

                <div className="flex flex-wrap gap-2">
                  <motion.button
                    onClick={() => (server.status === 'online' || server.status === 'running') ? handleStop(server.id) : handleStart(server.id)}
                    className="flex-1 px-3 py-2 bg-primary/10 hover:bg-primary/20 border border-primary/20 rounded-lg text-xs font-mono flex items-center justify-center gap-1 transition-all"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    data-testid={`button-toggle-server-${server.id}`}
                  >
                    {(server.status === 'online' || server.status === 'running') ? <StopCircle size={14} /> : <Play size={14} />}
                    {(server.status === 'online' || server.status === 'running') ? 'Stop' : 'Start'}
                  </motion.button>
                  <motion.button
                    onClick={() => handleRestart(server.id)}
                    className="flex-1 px-3 py-2 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-lg text-xs font-mono flex items-center justify-center gap-1 transition-all"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    data-testid={`button-restart-server-${server.id}`}
                  >
                    <RefreshCw size={14} />
                    Restart
                  </motion.button>
                  <motion.button
                    onClick={() => handleConsole(server.id)}
                    className="flex-1 px-3 py-2 bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 rounded-lg text-xs font-mono flex items-center justify-center gap-1 transition-all"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    data-testid={`button-console-server-${server.id}`}
                  >
                    <Terminal size={14} />
                    Console
                  </motion.button>
                  <motion.button
                    onClick={() => handleDelete(server.id)}
                    className="flex-1 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg text-xs font-mono flex items-center justify-center gap-1 transition-all"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    data-testid={`button-delete-server-${server.id}`}
                  >
                    <Trash2 size={14} />
                    Delete
                  </motion.button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {showCreateModal && !selectedTier && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              className="w-[calc(100%-1.5rem)] max-w-[340px] max-h-[80vh] overflow-y-auto bg-black/95 backdrop-blur-sm border border-primary/20 rounded-xl shadow-2xl"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-3 sm:p-4">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-sm sm:text-base font-bold flex items-center gap-1.5">
                    <Server className="w-4 h-4 text-primary" />
                    Choose Server Tier
                  </h2>
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="p-1 hover:bg-primary/10 rounded-lg transition-colors text-gray-400 hover:text-white"
                    data-testid="button-close-create-modal"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="flex items-center gap-2 mb-3 p-2 bg-black/40 border border-primary/10 rounded-lg">
                  <Wallet className="w-3 h-3 text-primary shrink-0" />
                  <span className="text-[11px] font-mono text-gray-400">Balance:</span>
                  <span className="text-[11px] font-mono font-bold text-primary">
                    {balanceLoaded ? formatCurrency(convertFromKES(walletBalance, userCurrency), userCurrency) : '...'}
                  </span>
                  {balanceLoaded && walletBalance < PLAN_PRICES['Limited'] && (
                    <button
                      onClick={() => { setShowCreateModal(false); navigate('/wallet'); }}
                      className="text-[10px] text-yellow-400 ml-auto font-mono underline hover:text-yellow-300 transition-colors"
                      data-testid="link-topup-from-tiers"
                    >
                      Top Up
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  {Object.entries(SERVER_TIERS).map(([tierName, tier]) => {
                    const canAfford = balanceLoaded && walletBalance >= tier.price;
                    const TierIcon = tierName === 'Limited' ? Shield : tierName === 'Unlimited' ? Zap : Crown;
                    const borderColor = tierName === 'Limited' ? 'border-primary/20' : tierName === 'Unlimited' ? 'border-blue-500/20' : 'border-purple-500/20';
                    const hoverBorder = tierName === 'Limited' ? 'hover:border-primary/50' : tierName === 'Unlimited' ? 'hover:border-blue-500/50' : 'hover:border-purple-500/50';
                    const iconColor = tierName === 'Limited' ? 'text-primary' : tierName === 'Unlimited' ? 'text-blue-400' : 'text-purple-400';
                    const bgGlow = tierName === 'Limited' ? 'bg-primary/5' : tierName === 'Unlimited' ? 'bg-blue-500/5' : 'bg-purple-500/5';
                    const priceColor = tierName === 'Limited' ? 'text-primary' : tierName === 'Unlimited' ? 'text-blue-400' : 'text-purple-400';

                    const specEntries = Object.entries(tier.specs);

                    return (
                      <motion.button
                        key={tierName}
                        className={`w-full text-left p-2.5 rounded-lg border ${borderColor} ${hoverBorder} ${bgGlow} transition-all ${!canAfford ? 'opacity-40 cursor-not-allowed' : ''}`}
                        whileTap={canAfford ? { scale: 0.97 } : {}}
                        disabled={!canAfford}
                        onClick={() => {
                          if (!canAfford) return;
                          setSelectedTier(tierName);
                          setNewServer({ name: '', plan: tierName });
                        }}
                        data-testid={`card-tier-${tierName.toLowerCase()}`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className={`p-1.5 rounded-lg ${bgGlow} border ${borderColor} shrink-0`}>
                            <TierIcon className={`w-3.5 h-3.5 ${iconColor}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-xs font-bold text-white">{tierName}</p>
                              {tierName === 'Unlimited' && (
                                <span className="px-1 py-0.5 bg-blue-500/20 border border-blue-500/30 rounded text-[7px] font-mono text-blue-400 uppercase leading-none">Popular</span>
                              )}
                            </div>
                            <p className="text-[9px] text-gray-500 font-mono truncate">{specEntries.map(([k, v]) => `${v} ${k}`).join(' · ')}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className={`text-xs font-bold ${priceColor}`}>{formatCurrency(convertFromKES(tier.price, userCurrency), userCurrency)}</p>
                            <p className="text-[7px] text-gray-600 font-mono">/month</p>
                          </div>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>

                {balanceLoaded && walletBalance < PLAN_PRICES['Limited'] && (
                  <p className="text-[9px] text-gray-600 font-mono text-center mt-2">Deposit funds to unlock server tiers</p>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCreateModal && selectedTier && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              className="w-[calc(100%-1.5rem)] max-w-[340px] max-h-[80vh] overflow-y-auto bg-black/95 backdrop-blur-sm border border-primary/20 rounded-xl shadow-2xl"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-3 sm:p-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm sm:text-base font-bold flex items-center gap-1.5">
                    <Plus className="w-4 h-4 text-primary" />
                    Deploy {selectedTier} Server
                  </h2>
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="p-1 hover:bg-primary/10 rounded-lg transition-colors text-gray-400 hover:text-white"
                    data-testid="button-close-name-modal"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className={`flex items-center gap-2 mb-3 p-2 rounded-lg border ${
                  selectedTier === 'Limited' ? 'bg-primary/5 border-primary/20' : selectedTier === 'Unlimited' ? 'bg-blue-500/5 border-blue-500/20' : 'bg-purple-500/5 border-purple-500/20'
                }`}>
                  {selectedTier === 'Limited' ? <Shield className="w-3.5 h-3.5 text-primary" /> : selectedTier === 'Unlimited' ? <Zap className="w-3.5 h-3.5 text-blue-400" /> : <Crown className="w-3.5 h-3.5 text-purple-400" />}
                  <div className="flex-1">
                    <span className="text-xs font-mono font-bold">{selectedTier} Server</span>
                    <span className="text-[10px] text-gray-500 font-mono ml-1.5">{formatCurrency(convertFromKES(PLAN_PRICES[selectedTier], userCurrency), userCurrency)}/mo</span>
                  </div>
                  <button
                    onClick={() => setSelectedTier(null)}
                    className="text-[10px] text-gray-400 hover:text-white font-mono underline transition-colors"
                    data-testid="button-change-tier"
                  >
                    Change
                  </button>
                </div>

                <form onSubmit={handleCreateServer} className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2 font-mono">
                      Server Name
                    </label>
                    <input
                      type="text"
                      value={newServer.name}
                      onChange={(e) => setNewServer({ ...newServer, name: e.target.value })}
                      className="w-full bg-black/40 border border-primary/20 rounded-lg px-3 py-2 text-sm font-mono placeholder-gray-500 focus:outline-none focus:border-primary/40 transition-colors"
                      placeholder="my-awesome-server"
                      autoFocus
                      data-testid="input-server-name"
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setSelectedTier(null)}
                      className="flex-1 px-4 py-2 text-gray-400 hover:text-white hover:bg-white/5 border border-gray-700 rounded-lg font-mono text-sm transition-all"
                      data-testid="button-back-to-tiers"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      className={`flex-1 px-4 py-2 rounded-lg font-mono text-sm flex items-center justify-center gap-2 transition-all border ${
                        selectedTier === 'Limited' ? 'bg-primary/10 hover:bg-primary/20 border-primary/30 text-primary' : selectedTier === 'Unlimited' ? 'bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/30 text-blue-400' : 'bg-purple-500/10 hover:bg-purple-500/20 border-purple-500/30 text-purple-400'
                      }`}
                      disabled={creating}
                      data-testid="button-confirm-deploy"
                    >
                      {creating ? <LoadingSpinner size="sm" /> : <Plus size={16} />}
                      {creating ? 'Deploying...' : `Deploy (${formatCurrency(convertFromKES(PLAN_PRICES[selectedTier], userCurrency), userCurrency)})`}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showConsoleModal && selectedServer && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowConsoleModal(false)}
          >
            <motion.div
              className="w-full max-w-2xl bg-black/90 backdrop-blur-sm border border-primary/20 rounded-xl shadow-2xl"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <Terminal className="w-5 h-5 text-primary" />
                    Console - {selectedServer.name}
                  </h2>
                  <button
                    onClick={() => setShowConsoleModal(false)}
                    className="p-2 hover:bg-primary/10 rounded-lg transition-colors text-gray-400 hover:text-white"
                    data-testid="button-close-console"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="bg-black/40 border border-primary/10 rounded-lg p-4 h-64 overflow-y-auto font-mono text-sm">
                  <div className="text-primary">$ systemctl start wolfhost</div>
                  <div className="text-gray-500">[INFO] Starting server instance...</div>
                  <div className="text-gray-500">[INFO] Loading configuration from /etc/wolfhost/server.conf</div>
                  <div className="text-primary">[OK] Server initialized on {selectedServer.ip}:25565</div>
                  <div className="text-gray-500">[INFO] Memory allocated: {selectedServer.ram || '8GB'}</div>
                  <div className="text-gray-500">[INFO] CPU cores: {selectedServer.cpu || '4'}</div>
                  <div className="text-primary">[SUCCESS] Ready for connections!</div>
                  <div className="mt-4">
                    <div className="text-green-500">[STATUS] Server is running normally</div>
                    <div className="text-gray-500">[METRICS] CPU: 12% | RAM: 45% | NET: 1.2MB/s</div>
                  </div>
                  <div className="mt-4 flex items-center">
                    <span className="text-primary">wolfhost@server:~$ </span>
                    <span className="ml-1 bg-primary/20 px-1 animate-pulse">█</span>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button className="px-3 py-1 bg-primary/10 hover:bg-primary/20 border border-primary/20 rounded text-xs font-mono transition-all" data-testid="button-ctrl-c">
                    Ctrl+C
                  </button>
                  <button className="px-3 py-1 bg-primary/10 hover:bg-primary/20 border border-primary/20 rounded text-xs font-mono transition-all" data-testid="button-clear-console">
                    Clear
                  </button>
                  <button className="px-3 py-1 bg-primary/10 hover:bg-primary/20 border border-primary/20 rounded text-xs font-mono transition-all ml-auto" data-testid="button-copy-logs">
                    Copy Logs
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDeleteModal && serverToDelete && (
          <motion.div
            className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={cancelDelete}
          >
            <motion.div
              className="w-[calc(100%-1.5rem)] max-w-[340px] max-h-[80vh] overflow-y-auto bg-black/90 backdrop-blur-sm border border-red-500/20 rounded-xl shadow-2xl"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-3 sm:p-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm sm:text-base font-bold flex items-center gap-1.5 text-red-400">
                    <AlertCircle className="w-4 h-4" />
                    Confirm Deletion
                  </h2>
                  <button
                    onClick={cancelDelete}
                    className="p-1 hover:bg-red-500/10 rounded-lg transition-colors text-gray-400 hover:text-white"
                    data-testid="button-close-delete-modal"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="mb-4">
                  <div className="flex items-center gap-2 p-2 bg-red-500/5 border border-red-500/10 rounded-lg mb-3">
                    <Server className="w-4 h-4 text-red-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="font-bold text-xs truncate">{serverToDelete.name}</p>
                      <p className="text-[10px] text-gray-500 font-mono">{serverToDelete.ip} · {serverToDelete.plan}</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400">
                    Are you sure you want to delete this server? This action cannot be undone.
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={cancelDelete}
                    className="flex-1 px-3 py-2 text-gray-400 hover:text-white hover:bg-white/5 border border-gray-700 rounded-lg font-mono text-xs transition-all"
                    data-testid="button-cancel-delete"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDelete}
                    className="flex-1 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg font-mono text-xs flex items-center justify-center gap-1.5 transition-all"
                    data-testid="button-confirm-delete"
                  >
                    <Trash2 size={14} />
                    Delete
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Servers;
