import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  Receipt,
  Wallet,
  Settings,
  Shield,
  LogOut,
  X,
  MessageSquare,
  ExternalLink,
  BookOpen,
  Bot,
  Terminal,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/overview' },
  { icon: Bot, label: 'Available Bots', path: '/available-bots' },
  { icon: Terminal, label: 'My Bots', path: '/my-bots' },
  { icon: Users, label: 'Referrals', path: '/referrals' },
  { icon: Receipt, label: 'Billing', path: '/billing' },
  { icon: Wallet, label: 'Wallet', path: '/wallet' },
  { icon: BookOpen, label: 'Tutorials', path: '/tutorials' },
  { icon: MessageSquare, label: 'Community', path: '/community' },
  { icon: Settings, label: 'Settings', path: '/settings' },
];

const Sidebar = ({ isOpen, onClose }) => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [siteLinks, setSiteLinks] = useState({
    whatsappChannel: 'https://whatsapp.com/channel/0029Vb6dn9nEQIaqEMNclK3Y',
    whatsappGroup: 'https://chat.whatsapp.com/HjFc3pud3IA0R0WGr1V2Xu',
    youtube: 'https://www.youtube.com/@Silentwolf906',
  });

  useEffect(() => {
    fetch('/api/site-settings')
      .then(r => r.json())
      .then(data => { if (data.success) setSiteLinks(data.settings); })
      .catch(() => {});
  }, []);

  const isAdminUnlocked = user?.isAdmin === true;

  const handleSignOut = () => {
    logout();
    onClose();
  };

  return (
    <>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        className={`
          fixed top-0 left-0 z-40 h-screen w-64 
          border-r border-primary/10 bg-black/90 backdrop-blur-xl
          lg:sticky lg:block
          ${isOpen ? 'block' : 'hidden lg:block'}
        `}
        initial={{ x: -256 }}
        animate={{ x: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      >
        {/* Mobile Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg hover:bg-primary/5 lg:hidden border border-primary/5"
        >
          <X size={20} className="text-gray-500 hover:text-primary/80 transition-colors" />
        </button>

        <div className="flex flex-col h-full overflow-y-auto">
        {/* Logo/Header */}
        <div className="p-6 border-b border-primary/10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/5 border border-primary/10 flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-primary/80 drop-shadow-[0_0_3px_rgba(var(--primary)/0.4)]" />
            </div>
            <h1 className="text-xl font-display font-bold text-primary/90">WOLFHOST</h1>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-2">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onClose}
              >
                <motion.div
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group
                    ${isActive 
                      ? 'bg-primary/5 border border-primary/30' 
                      : 'hover:bg-primary/3 border border-primary/5 hover:border-primary/20'
                    }
                  `}
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Icon 
                    size={20} 
                    className={`
                      ${isActive 
                        ? 'text-primary drop-shadow-[0_0_3px_rgba(var(--primary)/0.5)]' 
                        : 'text-gray-500 group-hover:text-primary/80 transition-colors'
                      }
                    `} 
                  />
                  <span 
                    className={`
                      font-mono text-sm ${isActive 
                        ? 'text-primary font-semibold' 
                        : 'text-gray-400 group-hover:text-primary/80 transition-colors'
                      }
                    `}
                  >
                    {item.label}
                  </span>
                  {isActive && (
                    <motion.div
                      className="ml-auto w-2 h-2 rounded-full bg-primary"
                      layoutId="activeIndicator"
                      style={{ boxShadow: '0 0 6px rgba(var(--primary), 0.6)' }}
                    />
                  )}
                </motion.div>
              </Link>
            );
          })}

          {/* Admin Panel - Visible to admins only */}
          {isAdminUnlocked && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 pt-4 border-t border-primary/10 space-y-2"
            >
              <Link to="/admin" onClick={onClose}>
                <motion.div
                  className="flex items-center gap-3 px-4 py-3 rounded-lg bg-primary/5 border border-primary/30 group"
                  whileHover={{ x: 4 }}
                >
                  <Shield size={20} className="text-primary drop-shadow-[0_0_3px_rgba(var(--primary)/0.5)]" />
                  <span className="font-mono text-sm text-primary font-semibold">Admin Panel</span>
                </motion.div>
              </Link>

              {user?.isSuperAdmin && (
                <Link to="/superadmin" onClick={onClose}>
                  <motion.div
                    className="flex items-center gap-3 px-4 py-3 rounded-lg bg-yellow-500/5 border border-yellow-500/30 group"
                    whileHover={{ x: 4 }}
                  >
                    <Sparkles size={20} className="text-yellow-400" />
                    <span className="font-mono text-sm text-yellow-400 font-semibold">Superadmin</span>
                    <span className="ml-auto text-xs bg-yellow-500/10 px-2 py-0.5 rounded-full text-yellow-400/80 font-mono">
                      SA
                    </span>
                  </motion.div>
                </Link>
              )}
            </motion.div>
          )}
        </nav>

        {/* User Info */}
        <div className="mt-auto px-4 pb-2 pt-4">
          <div className="p-3 rounded-lg border border-primary/10 bg-black/50">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-mono text-gray-500 uppercase tracking-wider">
                LOGGED IN AS
              </p>
              <p className="text-sm font-mono text-white truncate max-w-[120px]">
                {user?.username || user?.name || 'User'}
              </p>
            </div>
            <motion.button
              onClick={handleSignOut}
              className="w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg border border-primary/10 hover:border-primary/30 hover:bg-primary/5 transition-all duration-200 group"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <LogOut size={14} className="text-gray-500 group-hover:text-primary/80 transition-colors" />
              <span className="text-xs font-mono text-gray-400 group-hover:text-primary/80 transition-colors">
                SIGN OUT
              </span>
            </motion.button>
          </div>
        </div>

        {/* Social Links */}
        <div className="px-4 pb-2 pt-2">
          <div className="p-3 rounded-lg border border-primary/10 bg-black/50">
            <div className="text-xs font-mono text-gray-500 uppercase tracking-wider mb-2">Join Us</div>
            <div className="space-y-1.5">
              {siteLinks.whatsappChannel && (
                <a
                  href={siteLinks.whatsappChannel}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-primary/5 transition-colors group"
                >
                  <span className="text-sm">📢</span>
                  <span className="text-xs font-mono text-gray-400 group-hover:text-primary/80 transition-colors flex-1">WA Channel</span>
                  <ExternalLink size={10} className="text-gray-600 group-hover:text-primary/60" />
                </a>
              )}
              {siteLinks.whatsappGroup && (
                <a
                  href={siteLinks.whatsappGroup}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-primary/5 transition-colors group"
                >
                  <span className="text-sm">💬</span>
                  <span className="text-xs font-mono text-gray-400 group-hover:text-primary/80 transition-colors flex-1">WA Group</span>
                  <ExternalLink size={10} className="text-gray-600 group-hover:text-primary/60" />
                </a>
              )}
              {siteLinks.youtube && (
                <a
                  href={siteLinks.youtube}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-primary/5 transition-colors group"
                >
                  <span className="text-sm">▶️</span>
                  <span className="text-xs font-mono text-gray-400 group-hover:text-primary/80 transition-colors flex-1">YouTube</span>
                  <ExternalLink size={10} className="text-gray-600 group-hover:text-primary/60" />
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Stats */}
        <div className="px-4 pb-4 pt-2">
          <div className="p-4 rounded-lg border border-primary/10 bg-black/50">
            <div className="text-xs font-mono text-gray-500 uppercase tracking-wider mb-2">System Status</div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="text-sm font-mono text-primary">OPTIMAL</span>
              </div>
              <span className="text-xs font-mono text-gray-500">All secure</span>
            </div>
          </div>
        </div>
        </div>
      </motion.aside>
    </>
  );
};

export default Sidebar;