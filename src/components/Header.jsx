import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Wallet, 
  Bell, 
  User, 
  LogOut, 
  Settings, 
  ChevronDown,
  Menu,
  X,
  Server,
  CreditCard,
  UserPlus,
  Gift,
  CheckCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getCountryByCode, formatCurrency, convertFromKES } from '../lib/currencyConfig';
import { walletAPI } from '../services/api';

const notifIcons = {
  welcome: Gift,
  server: Server,
  payment: CreditCard,
  referral: UserPlus,
  info: Bell,
};

const notifColors = {
  welcome: 'text-primary',
  server: 'text-blue-400',
  payment: 'text-green-400',
  referral: 'text-purple-400',
  info: 'text-gray-400',
};

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const Header = ({ onMenuToggle, isSidebarOpen }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [headerBalance, setHeaderBalance] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const notifRef = useRef(null);
  const userMenuRef = useRef(null);

  useEffect(() => {
    const fetchBal = async () => {
      try {
        const result = await walletAPI.getBalance();
        if (result.success) setHeaderBalance(result.balance);
      } catch (e) { /* ignore */ }
    };
    fetchBal();
    const interval = setInterval(fetchBal, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    if (!user?.id) return;
    try {
      const token = localStorage.getItem('jwt_token');
      const nHeaders = {};
      if (token) nHeaders['Authorization'] = `Bearer ${token}`;
      const res = await fetch(`/api/notifications?userId=${user.id}`, { headers: nHeaders });
      const data = await res.json();
      if (data.success) {
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (e) { /* ignore */ }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, [user?.id]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAllRead = async () => {
    if (!user?.id) return;
    try {
      const token = localStorage.getItem('jwt_token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      await fetch('/api/notifications/read', {
        method: 'POST',
        headers,
        body: JSON.stringify({ userId: user.id.toString() }),
      });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (e) { /* ignore */ }
  };

  const markOneRead = async (notifId) => {
    if (!user?.id) return;
    try {
      const token = localStorage.getItem('jwt_token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      await fetch('/api/notifications/read', {
        method: 'POST',
        headers,
        body: JSON.stringify({ userId: user.id.toString(), notificationId: notifId }),
      });
      setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (e) { /* ignore */ }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-50 h-16 border-b border-gray-800/60 bg-black/60 backdrop-blur-md">
      <div className="h-full px-4 lg:px-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuToggle}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-800/50 transition-colors text-gray-400"
          >
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          
          <Link to="/overview" className="flex items-center gap-3">
            <motion.div
              className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center"
              whileHover={{ scale: 1.05 }}
              transition={{ type: 'spring', stiffness: 400 }}
            >
              <span className="text-lg font-display font-bold text-primary/80">W</span>
            </motion.div>
            <span className="hidden sm:block text-lg font-display font-bold">
              <span className="text-primary/80">WOLF</span>
              <span className="text-gray-400">HOST</span>
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link to="/wallet">
            <motion.div
              className="px-3 py-1.5 flex items-center gap-2 cursor-pointer rounded-lg border border-gray-700/50 bg-black/40 hover:border-gray-600/60 transition-all"
              whileHover={{ scale: 1.02 }}
            >
              <Wallet size={14} className="text-gray-400" />
              <span className="font-mono text-sm text-gray-200">
                {formatCurrency(convertFromKES(headerBalance, getCountryByCode(user?.countryCode || 'KE').currency), getCountryByCode(user?.countryCode || 'KE').currency)}
              </span>
            </motion.div>
          </Link>

          <div className="relative" ref={notifRef}>
            <motion.button
              className="relative p-2 rounded-lg hover:bg-gray-800/50 transition-colors text-gray-400 hover:text-gray-200"
              onClick={() => setShowNotifications(!showNotifications)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-primary text-black text-[10px] font-bold rounded-full">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </motion.button>

            <AnimatePresence>
              {showNotifications && (
                <motion.div
                  className="absolute right-0 mt-2 w-[calc(100vw-2rem)] sm:w-80 max-w-[320px] rounded-xl border border-gray-700/50 bg-[#0a0a0a]/95 backdrop-blur-md shadow-2xl overflow-hidden"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <div className="p-3 border-b border-gray-800/60 flex items-center justify-between">
                    <span className="font-mono text-sm text-gray-300">Notifications</span>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllRead}
                        className="flex items-center gap-1 text-xs text-primary/70 hover:text-primary transition-colors font-mono"
                      >
                        <CheckCheck size={12} />
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center">
                        <Bell size={24} className="mx-auto text-gray-600 mb-2" />
                        <p className="text-sm text-gray-500 font-mono">No notifications yet</p>
                      </div>
                    ) : (
                      notifications.map((notif) => {
                        const IconComponent = notifIcons[notif.type] || Bell;
                        const iconColor = notifColors[notif.type] || 'text-gray-400';
                        return (
                          <div
                            key={notif.id}
                            className={`p-3 border-b border-gray-800/40 hover:bg-gray-800/30 transition-colors cursor-pointer flex gap-3 ${!notif.read ? 'bg-primary/5' : ''}`}
                            onClick={() => !notif.read && markOneRead(notif.id)}
                          >
                            <div className={`mt-0.5 flex-shrink-0 ${iconColor}`}>
                              <IconComponent size={16} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className={`text-sm font-medium ${!notif.read ? 'text-white' : 'text-gray-400'}`}>
                                  {notif.title}
                                </p>
                                {!notif.read && (
                                  <span className="w-1.5 h-1.5 bg-primary rounded-full flex-shrink-0" />
                                )}
                              </div>
                              <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{notif.message}</p>
                              <span className="text-[10px] text-gray-600 font-mono mt-1 block">{timeAgo(notif.createdAt)}</span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="relative" ref={userMenuRef}>
            <motion.button
              className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-800/50 transition-colors"
              onClick={() => setShowUserMenu(!showUserMenu)}
              whileHover={{ scale: 1.02 }}
            >
              <div className="w-8 h-8 rounded-full bg-gray-800/80 border border-gray-700/50 flex items-center justify-center">
                <User size={14} className="text-gray-400" />
              </div>
              <span className="hidden sm:block text-sm font-mono text-gray-300">{user?.username || 'User'}</span>
              <ChevronDown size={14} className="hidden sm:block text-gray-500" />
            </motion.button>

            <AnimatePresence>
              {showUserMenu && (
                <motion.div
                  className="absolute right-0 mt-2 w-56 rounded-xl border border-gray-700/50 bg-[#0a0a0a]/95 backdrop-blur-md shadow-2xl overflow-hidden"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <div className="p-4 border-b border-gray-800/60">
                    <p className="font-mono text-sm text-white">{user?.username}</p>
                    <p className="text-xs text-gray-500 font-mono mt-0.5">{user?.email}</p>
                  </div>
                  <div className="p-1.5">
                    <Link
                      to="/settings"
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-800/50 transition-colors text-gray-300 hover:text-white"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <Settings size={15} className="text-gray-500" />
                      <span className="text-sm font-mono">Settings</span>
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-red-500/10 text-gray-300 hover:text-red-400 transition-colors"
                    >
                      <LogOut size={15} className="text-gray-500" />
                      <span className="text-sm font-mono">Logout</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
