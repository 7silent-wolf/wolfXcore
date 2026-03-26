import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  Copy,
  CheckCircle,
  Share2,
  Shield,
  Gift,
  ExternalLink,
  Clock,
  Award,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { referralAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { toast } from 'sonner';

const Referrals = () => {
  const { user } = useAuth();
  const [referrals, setReferrals] = useState([]);
  const [referralCode, setReferralCode] = useState('');
  const [referralLink, setReferralLink] = useState('');
  const [completedCount, setCompletedCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [adminAwarded, setAdminAwarded] = useState(false);

  useEffect(() => {
    fetchReferralData();
  }, []);

  const fetchReferralData = async () => {
    setLoading(true);
    try {
      const [referralsResult, linkResult] = await Promise.all([
        referralAPI.getReferrals(),
        referralAPI.getReferralLink(),
      ]);

      if (referralsResult.success) {
        setReferrals(referralsResult.referrals || []);
        setCompletedCount(referralsResult.totalReferrals || 0);
        setPendingCount(referralsResult.pendingReferrals || 0);
      }

      if (linkResult.success) {
        setReferralCode(linkResult.code);
        setReferralLink(linkResult.link);
      }

      const rewardCheck = await referralAPI.checkAdminReward();
      if (rewardCheck.awarded) {
        setAdminAwarded(true);
        toast.success(rewardCheck.message);
      }
    } catch (err) {
      console.error('Error fetching referral data:', err);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const shareReferral = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Join WolfHost',
        text: `Sign up for WolfHost using my referral link and get started with server hosting!`,
        url: referralLink,
      });
    } else {
      copyToClipboard(referralLink);
    }
  };

  const isAdminUnlocked = completedCount >= 10 || user?.isAdmin;
  const progress = Math.min((completedCount / 10) * 100, 100);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <LoadingSpinner size="lg" text="Loading referrals..." />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-8">
      <div className="flex flex-wrap justify-between items-end gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold mb-1 sm:mb-2">Referral Program</h1>
          <p className="text-gray-400 font-mono text-xs sm:text-sm">
            Invite friends, earn rewards. 10 referrals = Admin Panel!
          </p>
        </div>
        <button
          onClick={fetchReferralData}
          className="group px-4 py-2 bg-primary/10 border border-primary/30 rounded-lg hover:bg-primary/20 transition-all"
        >
          <div className="flex items-center text-sm font-mono">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </div>
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-6">
        {[
          {
            icon: CheckCircle,
            label: 'Completed',
            value: completedCount,
            subValue: 'Successful referrals',
            iconColor: 'text-green-400',
            iconBg: 'bg-green-500/10',
            glowColor: 'rgba(34,197,94,0.15)',
          },
          {
            icon: Clock,
            label: 'Pending',
            value: pendingCount,
            subValue: 'Waiting to buy a server',
            iconColor: 'text-yellow-400',
            iconBg: 'bg-yellow-500/10',
            glowColor: 'rgba(234,179,8,0.15)',
          },
          {
            icon: Shield,
            label: 'Admin Panel',
            value: isAdminUnlocked ? 'UNLOCKED' : 'LOCKED',
            subValue: isAdminUnlocked ? 'Full admin access granted' : `${10 - completedCount} more to unlock`,
            iconColor: isAdminUnlocked ? 'text-primary' : 'text-gray-500',
            iconBg: isAdminUnlocked ? 'bg-primary/10' : 'bg-gray-500/10',
            glowColor: isAdminUnlocked ? 'rgba(0,255,0,0.15)' : 'rgba(100,100,100,0.1)',
          },
        ].map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={index === 2 ? 'col-span-2 sm:col-span-1' : ''}
          >
            <div
              className="p-3 sm:p-6 rounded-xl border border-primary/20 bg-black/30 backdrop-blur-sm relative overflow-hidden group hover:border-primary/40 transition-all"
              style={{ boxShadow: `0 0 40px ${stat.glowColor}` }}
            >
              <div className="flex justify-between items-start">
                <div className="min-w-0 flex-1">
                  <p className="text-gray-400 text-[10px] sm:text-xs uppercase tracking-wider mb-1">{stat.label}</p>
                  <h3 className="text-base sm:text-2xl font-display font-bold text-white truncate">{stat.value}</h3>
                </div>
                <div className={`p-1.5 sm:p-2 ${stat.iconBg} rounded-lg ml-2 shrink-0`}>
                  <stat.icon className={`w-4 h-4 sm:w-5 sm:h-5 ${stat.iconColor}`} />
                </div>
              </div>
              <div className="mt-2 sm:mt-4 text-[10px] sm:text-xs text-gray-500 font-mono truncate">{stat.subValue}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {adminAwarded && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-4 sm:p-6 rounded-xl border border-primary/20 bg-black/30 backdrop-blur-sm text-center space-y-3"
        >
          <Award className="mx-auto text-primary" size={36} />
          <h2 className="text-xl font-bold text-white">Congratulations!</h2>
          <p className="text-gray-400 font-mono">
            You've reached 10 referrals and have been awarded Admin Panel access!
          </p>
          <a
            href="/admin"
            className="inline-flex items-center gap-2 px-6 py-2 rounded-lg bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 transition-colors font-mono text-sm"
          >
            Access Admin Panel <ExternalLink size={14} />
          </a>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="p-3 sm:p-6 rounded-xl border border-primary/20 bg-black/30 backdrop-blur-sm"
      >
        <h2 className="text-base sm:text-xl font-bold mb-3 sm:mb-4 flex items-center">
          <Share2 className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-primary" /> Your Referral Link
        </h2>

        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="flex-1 relative">
            <input
              type="text"
              value={referralLink}
              readOnly
              className="w-full bg-black/40 border border-primary/20 rounded-lg px-4 py-3 font-mono text-sm text-white focus:outline-none focus:border-primary/40"
            />
            <button
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 hover:bg-primary/10 rounded-lg transition-colors"
              onClick={() => copyToClipboard(referralLink)}
            >
              {copied ? <CheckCircle size={18} className="text-primary" /> : <Copy size={18} className="text-gray-400" />}
            </button>
          </div>
          <button
            className="px-4 py-3 bg-primary/10 hover:bg-primary/20 border border-primary/30 rounded-lg flex items-center justify-center gap-2 transition-all font-mono text-sm"
            onClick={shareReferral}
          >
            <Share2 size={16} />
            Share
          </button>
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-400">
          <span className="font-mono">Referral Code:</span>
          <span className="font-mono text-white font-bold">{referralCode}</span>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="p-3 sm:p-6 rounded-xl border border-primary/20 bg-black/30 backdrop-blur-sm"
      >
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <h2 className="text-base sm:text-xl font-bold flex items-center">
            <Shield className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-primary" /> Admin Panel Progress
          </h2>
          <span className="font-mono text-sm text-gray-400">{completedCount}/10</span>
        </div>

        <div className="mb-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-400 font-mono">Progress</span>
            <span className="text-white font-mono">{Math.round(progress)}%</span>
          </div>
          <div className="h-3 bg-primary/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1, delay: 0.3 }}
            />
          </div>
        </div>

        <p className="text-sm text-gray-400 font-mono">
          {isAdminUnlocked
            ? 'Admin Panel unlocked! You have full admin access.'
            : `${10 - completedCount} more completed referrals needed. A referral is completed when the invited user purchases a server.`
          }
        </p>
        {isAdminUnlocked && (
          <a
            href="/admin"
            className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 transition-colors font-mono text-sm"
          >
            Access Admin Panel <ExternalLink size={14} />
          </a>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="p-3 sm:p-6 rounded-xl border border-primary/20 bg-black/30 backdrop-blur-sm"
      >
        <h2 className="text-base sm:text-xl font-bold mb-3 sm:mb-4 flex items-center">
          <Users className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-primary" /> Your Referrals
        </h2>

        {referrals.length === 0 ? (
          <div className="text-center py-8">
            <Users size={48} className="mx-auto text-gray-600 mb-4" />
            <p className="text-gray-400 font-mono">No referrals yet. Share your link to get started!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {referrals.map((ref, index) => (
              <motion.div
                key={ref.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center justify-between p-4 rounded-lg bg-black/20 border border-primary/10 hover:border-primary/20 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <span className="text-primary font-mono text-xs font-bold">
                      {(ref.username || '?').charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-mono text-sm text-white">{ref.username}</p>
                    <p className="text-xs text-gray-500 font-mono">{ref.email}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-xs font-mono px-2 py-1 rounded-full ${
                    ref.completed
                      ? 'bg-green-500/10 text-green-400 border border-green-500/30'
                      : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30'
                  }`}>
                    {ref.completed ? 'COMPLETED' : 'PENDING'}
                  </span>
                  <p className="text-[10px] text-gray-600 font-mono mt-1">
                    {new Date(ref.registeredAt).toLocaleDateString()}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="p-3 sm:p-6 rounded-xl border border-primary/20 bg-black/30 backdrop-blur-sm"
        >
          <h3 className="font-bold mb-3 sm:mb-4 flex items-center text-sm sm:text-base">
            <Gift className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-primary" /> How it Works
          </h3>
          <ul className="space-y-3 text-sm text-gray-400 font-mono">
            <li className="flex items-start gap-3">
              <span className="text-white font-bold min-w-[20px]">1.</span>
              Share your unique referral link with friends
            </li>
            <li className="flex items-start gap-3">
              <span className="text-white font-bold min-w-[20px]">2.</span>
              They sign up using your link
            </li>
            <li className="flex items-start gap-3">
              <span className="text-white font-bold min-w-[20px]">3.</span>
              When they purchase a server, your referral is completed
            </li>
            <li className="flex items-start gap-3">
              <span className="text-white font-bold min-w-[20px]">4.</span>
              Reach 10 completed referrals to unlock Admin Panel!
            </li>
          </ul>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="p-3 sm:p-6 rounded-xl border border-primary/20 bg-black/30 backdrop-blur-sm"
        >
          <h3 className="font-bold mb-3 sm:mb-4 flex items-center text-sm sm:text-base">
            <Award className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-primary" /> Rewards
          </h3>
          <ul className="space-y-3 text-sm font-mono">
            <li className="flex items-center justify-between">
              <span className="text-gray-400">Per Completed Referral</span>
              <span className="text-green-400">+1 Point</span>
            </li>
            <li className="flex items-center justify-between">
              <span className="text-gray-400">5 Referrals</span>
              <span className="text-blue-400">Halfway There!</span>
            </li>
            <li className="flex items-center justify-between">
              <span className="text-gray-400">10 Referrals</span>
              <span className="text-white font-bold">Admin Panel Access</span>
            </li>
          </ul>
        </motion.div>
      </div>
    </div>
  );
};

export default Referrals;
