import { motion, AnimatePresence } from 'framer-motion';
import { Gift, Server, X, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const WelcomeFreeServerPopup = ({ onClose }) => {
  const navigate = useNavigate();

  const handleDismiss = () => {
    localStorage.setItem('welcome_popup_dismissed', 'true');
    onClose();
  };

  const handleGoToClaim = () => {
    localStorage.setItem('welcome_popup_dismissed', 'true');
    onClose();
    navigate('/claim-server');
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={handleDismiss} />

        <motion.div
          className="relative w-full max-w-md rounded-2xl border border-primary/30 bg-[#0a0a0a] p-6 shadow-2xl shadow-primary/10"
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        >
          <button
            onClick={handleDismiss}
            className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>

          <div className="text-center">
            <motion.div
              className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 border border-primary/30 mb-4"
              animate={{ boxShadow: ['0 0 15px hsl(120 100% 50% / 0.1)', '0 0 30px hsl(120 100% 50% / 0.3)', '0 0 15px hsl(120 100% 50% / 0.1)'] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Gift className="w-8 h-8 text-primary" />
            </motion.div>

            <h2 className="text-2xl font-display font-bold text-white mb-2">
              Welcome to <span className="text-primary">WOLF</span><span className="text-gray-400">HOST</span>!
            </h2>
            <p className="text-gray-400 text-sm mb-6">
              As a new member, you get a <span className="text-primary font-semibold">free 3-day trial server</span> to explore our platform. Claim it now!
            </p>

            <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 mb-6">
              <div className="flex items-center gap-3 text-left">
                <Server className="w-5 h-5 text-primary flex-shrink-0" />
                <div>
                  <p className="text-white text-sm font-semibold">Free Trial Server</p>
                  <p className="text-gray-500 text-xs font-mono">1GB RAM | 5GB Disk | 1 vCPU | 3 Days</p>
                </div>
              </div>
            </div>

            <motion.button
              onClick={handleGoToClaim}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary font-mono font-semibold transition-colors"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Gift className="w-5 h-5" />
              Claim My Free Server
              <ArrowRight className="w-4 h-4" />
            </motion.button>

            <button
              onClick={handleDismiss}
              className="mt-3 text-xs text-gray-500 hover:text-gray-400 transition-colors"
            >
              Maybe later
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default WelcomeFreeServerPopup;
