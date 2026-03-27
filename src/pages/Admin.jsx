import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  Users,
  Server,
  Activity,
  Trash2,
  UserCheck,
  UserX,
  Pause,
  Play,
  RefreshCw,
  Search,
  AlertTriangle,
  ExternalLink,
  CreditCard,
  DollarSign,
  Phone,
  Mail,
  Clock,
  TrendingUp,
  Upload,
  Zap,
  Crown,
  CheckCircle,
  X,
  Bell,
  Settings,
  Save,
  Send,
  Globe,
  MessageCircle,
  Youtube,
  Video,
  Plus,
  Eye,
  EyeOff,
  Edit2,
  BookOpen,
  Bot,
  Github,
  Tag,
  Package,
  ToggleLeft,
  ToggleRight,
  HardDrive,
  Database,
  BarChart3,
  Layers,
  Lock,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getCountryByCode, formatCurrency, convertFromKES } from '../lib/currencyConfig';
import LoadingSpinner from '../components/LoadingSpinner';
import { toast } from 'sonner';

const PANEL_URL = 'https://panel.xwolf.space';

const getAdminHeaders = () => {
  const token = localStorage.getItem('jwt_token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
};

const adminFetch = async (url, options = {}) => {
  const headers = { ...getAdminHeaders(), ...options.headers };
  return fetch(url, { ...options, headers });
};

const Admin = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const countryConfig = getCountryByCode(user?.countryCode || 'KE');
  const userCurrency = countryConfig.currency;
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState({ totalUsers: 0, totalServers: 0, totalNodes: 0 });
  const [users, setUsers] = useState([]);
  const [servers, setServers] = useState([]);
  const [payments, setPayments] = useState([]);
  const [paymentsTotalAmount, setPaymentsTotalAmount] = useState(0);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmAction, setConfirmAction] = useState(null);
  const [uploadServerTarget, setUploadServerTarget] = useState(null);
  const [uploadServerLoading, setUploadServerLoading] = useState(false);
  const [uploadServerNestId, setUploadServerNestId] = useState(5);
  const [uploadSuccess, setUploadSuccess] = useState(null);
  const [cleanupLoading, setCleanupLoading] = useState(false);
  const [siteSettings, setSiteSettings] = useState({
    whatsappChannel: '',
    whatsappGroup: '',
    youtube: '',
    supportPhone: '',
    supportPhoneDisplay: '',
  });
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [emailConfig, setEmailConfig] = useState({ emailUser: '', emailPass: '', emailPassSet: false });
  const [emailConfigLoading, setEmailConfigLoading] = useState(false);
  const [emailConfigSaving, setEmailConfigSaving] = useState(false);
  const [emailConfigTesting, setEmailConfigTesting] = useState(false);
  const [showEmailPass, setShowEmailPass] = useState(false);
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastType, setBroadcastType] = useState('info');
  const [broadcastSending, setBroadcastSending] = useState(false);
  const [tutorials, setTutorials] = useState([]);
  const [tutorialsLoading, setTutorialsLoading] = useState(false);
  const [tutorialForm, setTutorialForm] = useState({ title: '', description: '', videoUrl: '', category: 'General', published: true });
  const [tutorialSaving, setTutorialSaving] = useState(false);
  const [editingTutorial, setEditingTutorial] = useState(null);
  const [adminAlerts, setAdminAlerts] = useState([]);
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [alertFilter, setAlertFilter] = useState('all');
  const [botCatalog, setBotCatalog] = useState([]);
  const [botCatalogLoading, setBotCatalogLoading] = useState(false);
  const [botForm, setBotForm] = useState({ name: '', description: '', repoUrl: '', tag: 'bot', priceKES: 50, ramMB: 512, diskMB: 1024, mainFile: 'index.js', imageUrl: '', pairUrl: '' });
  const [botSaving, setBotSaving] = useState(false);
  const [editingBot, setEditingBot] = useState(null);
  const [diskStats, setDiskStats] = useState(null);
  const [diskLoading, setDiskLoading] = useState(false);
  const [diskCleanupLoading, setDiskCleanupLoading] = useState(false);
  const [diskUpdateId, setDiskUpdateId] = useState(null);
  const [diskUpdateValue, setDiskUpdateValue] = useState('');
  const [grantBalanceTarget, setGrantBalanceTarget] = useState(null);
  const [grantBalanceAmount, setGrantBalanceAmount] = useState('');
  const [grantBalanceNote, setGrantBalanceNote] = useState('');
  const [grantBalanceLoading, setGrantBalanceLoading] = useState(false);
  const [submissions, setSubmissions] = useState([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [subFilter, setSubFilter] = useState('pending');
  const [reviewingId, setReviewingId] = useState(null);
  const [reviewNote, setReviewNote] = useState('');
  const [reviewActionLoading, setReviewActionLoading] = useState(null);

  const handleGrantBalance = async () => {
    if (!grantBalanceTarget || !grantBalanceAmount || Number(grantBalanceAmount) < 1) return;
    setGrantBalanceLoading(true);
    try {
      const res = await adminFetch('/api/admin/grant-balance', {
        method: 'POST',
        body: JSON.stringify({ email: grantBalanceTarget.email, amountKES: Number(grantBalanceAmount), note: grantBalanceNote }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        setGrantBalanceTarget(null);
        setGrantBalanceAmount('');
        setGrantBalanceNote('');
      } else {
        toast.error(data.message || 'Failed to grant balance');
      }
    } catch {
      toast.error('Failed to grant balance');
    } finally {
      setGrantBalanceLoading(false);
    }
  };

  const fetchAlerts = async () => {
    setAlertsLoading(true);
    try {
      const res = await adminFetch('/api/admin/alerts');
      const data = await res.json();
      if (data.success) setAdminAlerts(data.alerts || []);
    } catch {
      toast.error('Failed to load alerts');
    } finally {
      setAlertsLoading(false);
    }
  };

  const resolveAlert = async (alertId) => {
    try {
      const res = await adminFetch(`/api/admin/alerts/${alertId}/resolve`, { method: 'PATCH' });
      const data = await res.json();
      if (data.success) {
        setAdminAlerts(prev => prev.map(a => a.id === alertId ? { ...a, ...data.alert } : a));
        toast.success('Alert resolved');
      }
    } catch {
      toast.error('Failed to resolve alert');
    }
  };

  const deleteAlert = async (alertId) => {
    try {
      const res = await adminFetch(`/api/admin/alerts/${alertId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setAdminAlerts(prev => prev.filter(a => a.id !== alertId));
        toast.success('Alert deleted');
      }
    } catch {
      toast.error('Failed to delete alert');
    }
  };

  const clearResolvedAlerts = async () => {
    try {
      const res = await adminFetch('/api/admin/alerts?resolvedOnly=true', { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setAdminAlerts(prev => prev.filter(a => !a.resolved));
        toast.success('Resolved alerts cleared');
      }
    } catch {
      toast.error('Failed to clear alerts');
    }
  };

  const fetchBotCatalog = async () => {
    setBotCatalogLoading(true);
    try {
      const res = await adminFetch('/api/admin/bot-catalog');
      const data = await res.json();
      if (data.success) setBotCatalog(data.bots || []);
      else toast.error('Failed to load bot catalog');
    } catch { toast.error('Failed to load bot catalog'); }
    finally { setBotCatalogLoading(false); }
  };

  const fetchSubmissions = async (status = subFilter) => {
    setSubmissionsLoading(true);
    try {
      const res = await adminFetch(`/api/admin/bot-submissions?status=${status}`);
      const data = await res.json();
      if (data.success) setSubmissions(data.submissions || []);
      else toast.error('Failed to load submissions');
    } catch { toast.error('Failed to load submissions'); }
    finally { setSubmissionsLoading(false); }
  };

  const handleReviewSubmission = async (id, action) => {
    setReviewActionLoading(id + action);
    try {
      const res = await adminFetch(`/api/admin/bot-submissions/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ action, reviewNote }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(action === 'approve' ? 'Bot approved and added to catalog!' : 'Submission rejected');
        setReviewingId(null);
        setReviewNote('');
        fetchSubmissions();
      } else {
        toast.error(data.message || 'Review failed');
      }
    } catch { toast.error('Review failed'); }
    finally { setReviewActionLoading(null); }
  };

  const fetchDiskStats = async () => {
    setDiskLoading(true);
    try {
      const res = await adminFetch('/api/admin/disk-stats');
      const data = await res.json();
      if (data.success) setDiskStats(data);
      else toast.error('Failed to load disk stats');
    } catch { toast.error('Failed to load disk stats'); }
    finally { setDiskLoading(false); }
  };

  const handleDiskCleanupSuspended = async () => {
    if (!window.confirm(`Delete ALL suspended servers? This cannot be undone.`)) return;
    setDiskCleanupLoading(true);
    try {
      const res = await adminFetch('/api/admin/disk-cleanup-suspended', { method: 'POST' });
      const data = await res.json();
      if (data.success) { toast.success(data.message); fetchDiskStats(); }
      else toast.error(data.message || 'Cleanup failed');
    } catch { toast.error('Cleanup failed'); }
    finally { setDiskCleanupLoading(false); }
  };

  const handleDiskLimitUpdate = async (serverId) => {
    if (!diskUpdateValue || isNaN(Number(diskUpdateValue))) return;
    try {
      const res = await adminFetch(`/api/admin/disk-update-limit/${serverId}`, {
        method: 'POST',
        body: JSON.stringify({ diskMB: Number(diskUpdateValue) }),
      });
      const data = await res.json();
      if (data.success) { toast.success(data.message); setDiskUpdateId(null); setDiskUpdateValue(''); fetchDiskStats(); }
      else toast.error(data.message || 'Update failed');
    } catch { toast.error('Update failed'); }
  };

  const saveBotToForm = (bot) => {
    setEditingBot(bot);
    setBotForm({ name: bot.name, description: bot.description, repoUrl: bot.repoUrl, tag: bot.tag || 'bot', priceKES: bot.priceKES || 50, ramMB: bot.ramMB || 512, diskMB: bot.diskMB || 1024, mainFile: bot.mainFile || 'index.js', imageUrl: bot.imageUrl || '', pairUrl: bot.pairUrl || '' });
  };

  const resetBotForm = () => {
    setEditingBot(null);
    setBotForm({ name: '', description: '', repoUrl: '', tag: 'bot', priceKES: 50, ramMB: 512, diskMB: 1024, mainFile: 'index.js', imageUrl: '', pairUrl: '' });
  };

  const handleSaveBot = async () => {
    if (!botForm.name.trim() || !botForm.description.trim() || !botForm.repoUrl.trim()) {
      toast.error('Name, description, and repo URL are required');
      return;
    }
    setBotSaving(true);
    try {
      const url = editingBot ? `/api/admin/bot-catalog/${editingBot.id}` : '/api/admin/bot-catalog';
      const method = editingBot ? 'PATCH' : 'POST';
      const res = await adminFetch(url, { method, body: JSON.stringify(botForm) });
      const data = await res.json();
      if (data.success) {
        toast.success(editingBot ? 'Bot updated' : 'Bot added to catalog');
        fetchBotCatalog();
        resetBotForm();
      } else {
        toast.error(data.message || 'Failed to save bot');
      }
    } catch { toast.error('Failed to save bot'); }
    finally { setBotSaving(false); }
  };

  const handleDeleteBot = async (botId) => {
    if (!window.confirm('Remove this bot from the catalog?')) return;
    try {
      const res = await adminFetch(`/api/admin/bot-catalog/${botId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) { toast.success('Bot removed'); fetchBotCatalog(); }
      else toast.error(data.message || 'Failed to remove bot');
    } catch { toast.error('Failed to remove bot'); }
  };

  const handleToggleBotActive = async (bot) => {
    try {
      const res = await adminFetch(`/api/admin/bot-catalog/${bot.id}`, { method: 'PATCH', body: JSON.stringify({ active: !bot.active }) });
      const data = await res.json();
      if (data.success) { fetchBotCatalog(); toast.success(bot.active ? 'Bot hidden from users' : 'Bot made visible'); }
    } catch { toast.error('Failed to update bot'); }
  };

  const [syncingBotId, setSyncingBotId] = useState(null);
  const handleSyncAppJson = async (bot) => {
    setSyncingBotId(bot.id);
    try {
      const res = await adminFetch(`/api/admin/bot-catalog/${bot.id}/refresh-appjson`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        toast.success(`app.json synced — ${Object.keys(data.bot.appJsonEnv || {}).length} env var(s) loaded`);
        fetchBotCatalog();
      } else {
        toast.error(data.message || 'Failed to sync app.json');
      }
    } catch { toast.error('Failed to sync app.json'); }
    finally { setSyncingBotId(null); }
  };

  const fetchSiteSettings = async () => {
    setSettingsLoading(true);
    try {
      const res = await adminFetch('/api/site-settings');
      const data = await res.json();
      if (data.success) setSiteSettings(data.settings);
    } catch {
      toast.error('Failed to load site settings');
    } finally {
      setSettingsLoading(false);
    }
  };

  const saveSiteSettings = async () => {
    setSettingsSaving(true);
    try {
      const res = await adminFetch('/api/admin/site-settings', {
        method: 'PUT',
        body: JSON.stringify(siteSettings),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Site settings saved');
        setSiteSettings(data.settings);
      } else {
        toast.error(data.message || 'Failed to save settings');
      }
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setSettingsSaving(false);
    }
  };

  const fetchEmailConfig = async () => {
    setEmailConfigLoading(true);
    try {
      const res = await adminFetch('/api/admin/email-config');
      const data = await res.json();
      if (data.success) setEmailConfig(prev => ({ ...prev, emailUser: data.emailUser, emailPassSet: data.emailPassSet, emailPass: '' }));
    } catch { toast.error('Failed to load email config'); }
    finally { setEmailConfigLoading(false); }
  };

  const saveEmailConfig = async () => {
    if (!emailConfig.emailUser.trim()) { toast.error('Email address is required'); return; }
    if (!emailConfig.emailPass.trim()) { toast.error('App password is required'); return; }
    setEmailConfigSaving(true);
    try {
      const res = await adminFetch('/api/admin/email-config', {
        method: 'PUT',
        body: JSON.stringify({ emailUser: emailConfig.emailUser, emailPass: emailConfig.emailPass }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Email config saved');
        setEmailConfig(prev => ({ ...prev, emailPass: '', emailPassSet: true }));
      } else {
        toast.error(data.message || 'Failed to save email config');
      }
    } catch { toast.error('Failed to save email config'); }
    finally { setEmailConfigSaving(false); }
  };

  const testEmailConfig = async () => {
    setEmailConfigTesting(true);
    try {
      const res = await adminFetch('/api/admin/email-config/test', { method: 'POST' });
      const data = await res.json();
      if (data.success) toast.success(data.message || 'Test email sent!');
      else toast.error(data.message || 'Test email failed');
    } catch { toast.error('Test email failed'); }
    finally { setEmailConfigTesting(false); }
  };

  const handleBroadcast = async () => {
    if (!broadcastTitle.trim() || !broadcastMessage.trim()) {
      toast.error('Title and message are required');
      return;
    }
    setBroadcastSending(true);
    try {
      const res = await adminFetch('/api/admin/broadcast-notification', {
        method: 'POST',
        body: JSON.stringify({ title: broadcastTitle, message: broadcastMessage, type: broadcastType }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || 'Notification sent');
        setBroadcastTitle('');
        setBroadcastMessage('');
        setBroadcastType('info');
      } else {
        toast.error(data.message || 'Failed to send notification');
      }
    } catch {
      toast.error('Failed to send notification');
    } finally {
      setBroadcastSending(false);
    }
  };

  const fetchTutorials = async () => {
    setTutorialsLoading(true);
    try {
      const res = await adminFetch('/api/admin/tutorials');
      const data = await res.json();
      if (data.success) setTutorials(data.tutorials);
    } catch {
      toast.error('Failed to load tutorials');
    } finally {
      setTutorialsLoading(false);
    }
  };

  const handleSaveTutorial = async () => {
    if (!tutorialForm.title.trim() || !tutorialForm.videoUrl.trim()) {
      toast.error('Title and video URL are required');
      return;
    }
    setTutorialSaving(true);
    try {
      const isEditing = !!editingTutorial;
      const url = isEditing ? `/api/admin/tutorials/${editingTutorial.id}` : '/api/admin/tutorials';
      const method = isEditing ? 'PATCH' : 'POST';
      const res = await adminFetch(url, { method, body: JSON.stringify(tutorialForm) });
      const data = await res.json();
      if (data.success) {
        toast.success(isEditing ? 'Tutorial updated' : 'Tutorial added');
        setTutorialForm({ title: '', description: '', videoUrl: '', category: 'General', published: true });
        setEditingTutorial(null);
        fetchTutorials();
      } else {
        toast.error(data.message || 'Failed to save tutorial');
      }
    } catch {
      toast.error('Failed to save tutorial');
    } finally {
      setTutorialSaving(false);
    }
  };

  const handleDeleteTutorial = async (id) => {
    try {
      const res = await adminFetch(`/api/admin/tutorials/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        toast.success('Tutorial deleted');
        fetchTutorials();
      } else {
        toast.error(data.message || 'Failed to delete tutorial');
      }
    } catch {
      toast.error('Failed to delete tutorial');
    }
  };

  const handleToggleTutorialPublish = async (tutorial) => {
    try {
      const res = await adminFetch(`/api/admin/tutorials/${tutorial.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ published: !tutorial.published }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.tutorial.published ? 'Tutorial published' : 'Tutorial unpublished');
        fetchTutorials();
      }
    } catch {
      toast.error('Failed to update tutorial');
    }
  };

  const startEditTutorial = (tutorial) => {
    setEditingTutorial(tutorial);
    setTutorialForm({
      title: tutorial.title,
      description: tutorial.description || '',
      videoUrl: tutorial.videoUrl,
      category: tutorial.category || 'General',
      published: tutorial.published !== false,
    });
  };

  const cancelEditTutorial = () => {
    setEditingTutorial(null);
    setTutorialForm({ title: '', description: '', videoUrl: '', category: 'General', published: true });
  };

  const handleUploadServer = async (targetUserId, plan) => {
    const targetUsername = uploadServerTarget?.username || 'User';
    setUploadServerLoading(true);
    try {
      const res = await adminFetch('/api/admin/upload-server', {
        method: 'POST',
        body: JSON.stringify({ adminUserId: user.id, targetUserId, plan, nestId: uploadServerNestId }),
      });
      const data = await res.json();
      if (data.success) {
        setUploadServerTarget(null);
        setUploadSuccess({ username: targetUsername, plan, serverName: data.server?.name });
        setStats(prev => ({ ...prev, totalServers: prev.totalServers + 1 }));
        fetchData();
      } else {
        toast.error(data.message || 'Failed to upload server');
      }
    } catch {
      toast.error('Failed to upload server');
    } finally {
      setUploadServerLoading(false);
    }
  };

  useEffect(() => {
    if (!user?.isAdmin) {
      navigate('/overview');
      return;
    }
    fetchData();
    fetchAlerts();
    if (user?.isAdmin) {
      fetchPayments();
    }
  }, [user, navigate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [overviewRes, usersRes, serversRes] = await Promise.all([
        adminFetch(`/api/admin/overview`),
        adminFetch(`/api/admin/users`),
        adminFetch(`/api/admin/servers`),
      ]);

      const [overviewData, usersData, serversData] = await Promise.all([
        overviewRes.json(),
        usersRes.json(),
        serversRes.json(),
      ]);

      if (overviewData.success) setStats(overviewData.stats);
      if (usersData.success) setUsers(usersData.users);
      if (serversData.success) setServers(serversData.servers);
    } catch (error) {
      toast.error('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  const fetchPayments = async () => {
    setPaymentsLoading(true);
    try {
      const res = await adminFetch(`/api/admin/payments?perPage=100`);
      const data = await res.json();
      if (data.success) {
        setPayments(data.payments || []);
        setPaymentsTotalAmount(data.totalAmount || 0);
      } else {
        toast.error('Failed to load payments');
      }
    } catch {
      toast.error('Failed to load payments');
    } finally {
      setPaymentsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'payments' && payments.length === 0 && !paymentsLoading && user?.isAdmin) {
      fetchPayments();
    }
    if (activeTab === 'site-settings' && !siteSettings.whatsappChannel) {
      fetchSiteSettings();
      fetchEmailConfig();
    }
    if (activeTab === 'disk' && !diskStats && !diskLoading) {
      fetchDiskStats();
    }
  }, [activeTab]);

  const handleDeleteUser = async (targetId) => {
    setActionLoading(`delete-user-${targetId}`);
    try {
      const res = await adminFetch(`/api/admin/users/${targetId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        toast.success('User deleted');
        setUsers(prev => prev.filter(u => u.id !== targetId));
        setStats(prev => ({ ...prev, totalUsers: prev.totalUsers - 1 }));
      } else {
        toast.error(data.message || 'Failed to delete user');
      }
    } catch {
      toast.error('Failed to delete user');
    } finally {
      setActionLoading(null);
      setConfirmAction(null);
    }
  };

  const handleToggleAdmin = async (targetId, makeAdmin) => {
    setActionLoading(`admin-${targetId}`);
    try {
      const res = await adminFetch(`/api/admin/users/${targetId}/admin`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isAdmin: makeAdmin }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(makeAdmin ? 'User promoted to admin' : 'Admin access removed');
        setUsers(prev => prev.map(u => u.id === targetId ? { ...u, isAdmin: makeAdmin } : u));
      } else {
        toast.error(data.message || 'Failed to update user');
      }
    } catch {
      toast.error('Failed to update user');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSuspendServer = async (serverId, suspend) => {
    setActionLoading(`suspend-${serverId}`);
    try {
      const action = suspend ? 'suspend' : 'unsuspend';
      const res = await adminFetch(`/api/admin/servers/${serverId}/${action}`, { method: 'PATCH' });
      const data = await res.json();
      if (data.success) {
        toast.success(suspend ? 'Server suspended' : 'Server unsuspended');
        setServers(prev => prev.map(s => s.id === serverId ? { ...s, suspended: suspend, status: suspend ? 'suspended' : 'online' } : s));
      } else {
        toast.error(data.message);
      }
    } catch {
      toast.error('Failed to update server');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteServer = async (serverId) => {
    setActionLoading(`delete-server-${serverId}`);
    try {
      const res = await adminFetch(`/api/admin/servers/${serverId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        toast.success('Server deleted');
        setServers(prev => prev.filter(s => s.id !== serverId));
        setStats(prev => ({ ...prev, totalServers: prev.totalServers - 1 }));
      } else {
        toast.error(data.message);
      }
    } catch {
      toast.error('Failed to delete server');
    } finally {
      setActionLoading(null);
      setConfirmAction(null);
    }
  };

  const handleCleanupExpired = async () => {
    setCleanupLoading(true);
    try {
      const res = await adminFetch('/api/admin/cleanup-expired', {
        method: 'POST',
        body: JSON.stringify({ userId: user.id }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.deleted === 0) {
          toast.info('No expired servers found');
        } else {
          toast.success(`Deleted ${data.deleted} expired server${data.deleted !== 1 ? 's' : ''}${data.failed > 0 ? ` (${data.failed} failed)` : ''}`);
          setServers(prev => prev.filter(s => {
            if (!s.isFreeServer) return true;
            if (!s.expiresAt) return true;
            return new Date(s.expiresAt) > new Date();
          }));
        }
      } else {
        toast.error(data.message || 'Cleanup failed');
      }
    } catch {
      toast.error('Failed to cleanup expired servers');
    } finally {
      setCleanupLoading(false);
    }
  };

  const filteredUsers = users.filter(u =>
    u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredServers = servers.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.ownerUsername.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPayments = payments.filter(p =>
    (p.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.reference || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.phone || '').includes(searchQuery) ||
    (p.customerName || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const statusColor = (status) => {
    switch (status) {
      case 'online': return 'text-green-400';
      case 'suspended': return 'text-red-400';
      case 'installing': return 'text-yellow-400';
      case 'error': return 'text-red-500';
      default: return 'text-gray-400';
    }
  };

  const statusDot = (status) => {
    switch (status) {
      case 'online': return 'bg-green-400';
      case 'suspended': return 'bg-red-400';
      case 'installing': return 'bg-yellow-400';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-KE', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const recentPayments = [...payments].slice(0, 5);

  if (!user?.isAdmin) return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'servers', label: 'Servers', icon: Server },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'alerts', label: 'Alerts', icon: AlertTriangle, badge: adminAlerts.filter(a => !a.resolved).length || null },
    { id: 'notifications', label: 'Notify', icon: Bell },
    { id: 'tutorials', label: 'Tutorials', icon: Video },
    { id: 'bots', label: 'Bot Catalog', icon: Bot },
    { id: 'submissions', label: 'Submissions', icon: Upload, badge: submissions.filter(s => s.status === 'pending').length || null },
    { id: 'disk', label: 'Disk', icon: HardDrive },
    { id: 'site-settings', label: 'Site', icon: Settings },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-wrap justify-between items-end gap-3">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="p-1.5 sm:p-2 bg-primary/10 rounded-lg">
            <Shield className="w-4 h-4 sm:w-6 sm:h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-lg sm:text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-gray-400 font-mono text-[10px] sm:text-sm">Manage users, servers, and system</p>
          </div>
        </div>
        <button
          onClick={() => { fetchData(); if (activeTab === 'payments' && user?.isAdmin) fetchPayments(); if (activeTab === 'tutorials') fetchTutorials(); if (activeTab === 'alerts') fetchAlerts(); if (activeTab === 'disk') fetchDiskStats(); }}
          className="group px-3 sm:px-4 py-1.5 sm:py-2 bg-primary/10 border border-primary/30 rounded-lg hover:bg-primary/20 transition-all"
        >
          <div className="flex items-center text-xs sm:text-sm font-mono">
            <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
            Refresh
          </div>
        </button>
      </div>

      <div className="flex gap-0.5 sm:gap-1 p-0.5 sm:p-1 rounded-lg sm:rounded-xl border border-primary/10 bg-black/30 backdrop-blur-sm">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setSearchQuery(''); if (tab.id === 'tutorials' && tutorials.length === 0) fetchTutorials(); if (tab.id === 'alerts' && adminAlerts.length === 0) fetchAlerts(); if (tab.id === 'bots' && botCatalog.length === 0) fetchBotCatalog(); if (tab.id === 'submissions') fetchSubmissions(); }}
            className={`relative flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 sm:py-2.5 rounded-md sm:rounded-lg font-mono text-[10px] sm:text-sm transition-all flex-1 min-w-0 ${
              activeTab === tab.id
                ? 'bg-primary/20 text-white border border-primary/30'
                : 'text-gray-400 hover:text-white hover:bg-primary/5'
            }`}
          >
            <tab.icon size={14} className="shrink-0" />
            <span className="hidden sm:inline">{tab.label}</span>
            {tab.badge > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 text-[9px] font-bold bg-red-500 text-white rounded-full flex items-center justify-center">
                {tab.badge > 9 ? '9+' : tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {activeTab !== 'overview' && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
          <input
            type="text"
            placeholder={`Search ${activeTab}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-black/30 border border-primary/20 rounded-lg text-sm font-mono text-white placeholder:text-gray-500 focus:border-primary/50 focus:outline-none"
          />
        </div>
      )}

      <AnimatePresence mode="wait">
        {activeTab === 'overview' && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            <div className={`grid grid-cols-2 ${user?.isAdmin ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-2 sm:gap-4`}>
              {[
                {
                  icon: Users,
                  label: 'Total Users',
                  value: stats.totalUsers,
                  subValue: 'Registered accounts',
                  iconColor: 'text-blue-400',
                  iconBg: 'bg-blue-500/10',
                  glowColor: 'rgba(59,130,246,0.15)',
                },
                {
                  icon: Server,
                  label: 'Total Servers',
                  value: stats.totalServers,
                  subValue: 'Active instances',
                  iconColor: 'text-green-400',
                  iconBg: 'bg-green-500/10',
                  glowColor: 'rgba(34,197,94,0.15)',
                },
                {
                  icon: Activity,
                  label: 'Nodes',
                  value: stats.totalNodes,
                  subValue: 'Infrastructure nodes',
                  iconColor: 'text-purple-400',
                  iconBg: 'bg-purple-500/10',
                  glowColor: 'rgba(168,85,247,0.15)',
                },
                ...(user?.isAdmin ? [{
                  icon: DollarSign,
                  label: 'Total Revenue',
                  value: formatCurrency(convertFromKES(paymentsTotalAmount, userCurrency), userCurrency),
                  subValue: `${payments.length} payments`,
                  iconColor: 'text-yellow-400',
                  iconBg: 'bg-yellow-500/10',
                  glowColor: 'rgba(234,179,8,0.15)',
                }] : []),
              ].map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <div
                    className="p-3 sm:p-5 rounded-xl border border-primary/20 bg-black/30 backdrop-blur-sm relative overflow-hidden group hover:border-primary/40 transition-all h-full"
                    style={{ boxShadow: `0 0 30px ${stat.glowColor}` }}
                  >
                    <div className="flex justify-between items-start gap-1">
                      <div className="min-w-0 flex-1">
                        <p className="text-gray-400 text-[9px] sm:text-xs uppercase tracking-wider mb-0.5 sm:mb-1 truncate">{stat.label}</p>
                        <h3 className="text-sm sm:text-2xl font-display font-bold text-white truncate">{stat.value}</h3>
                      </div>
                      <div className={`p-1 sm:p-2 ${stat.iconBg} rounded-lg shrink-0`}>
                        <stat.icon className={`w-3.5 h-3.5 sm:w-5 sm:h-5 ${stat.iconColor}`} />
                      </div>
                    </div>
                    <div className="mt-1.5 sm:mt-3 text-[9px] sm:text-xs text-gray-500 font-mono truncate">{stat.subValue}</div>
                  </div>
                </motion.div>
              ))}
            </div>

            {user?.isAdmin && recentPayments.length > 0 && (
              <div className="p-3 sm:p-5 rounded-xl border border-primary/20 bg-black/30 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <h3 className="font-bold text-xs sm:text-base flex items-center gap-1.5 sm:gap-2">
                    <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
                    Recent Payments
                  </h3>
                  <button
                    onClick={() => setActiveTab('payments')}
                    className="text-[10px] sm:text-xs text-primary font-mono hover:underline"
                  >
                    View All
                  </button>
                </div>
                <div className="space-y-1.5 sm:space-y-2">
                  {recentPayments.map((p) => (
                    <div key={p.id} className="flex items-center justify-between gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg bg-black/20 border border-primary/10">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0 ${p.method === 'M-Pesa' ? 'bg-green-500/10 border border-green-500/20' : 'bg-blue-500/10 border border-blue-500/20'}`}>
                          {p.method === 'M-Pesa' ? <Phone className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-green-400" /> : <CreditCard className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-blue-400" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] sm:text-sm font-mono font-semibold text-white truncate">{p.email || p.phone || 'Unknown'}</p>
                          <p className="text-[9px] sm:text-[10px] text-gray-500 font-mono">{formatDate(p.paidAt)}</p>
                        </div>
                      </div>
                      <span className="text-[10px] sm:text-sm font-mono font-bold text-green-400 shrink-0">+{formatCurrency(convertFromKES(p.amount, userCurrency), userCurrency)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'users' && (
          <motion.div
            key="users"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            <p className="text-xs text-gray-500 font-mono">{filteredUsers.length} users</p>
            {filteredUsers.length === 0 ? (
              <div className="p-8 rounded-xl border border-primary/20 bg-black/30 backdrop-blur-sm text-center">
                <p className="text-gray-400 font-mono">No users found</p>
              </div>
            ) : (
              filteredUsers.map((u, index) => (
                <motion.div
                  key={u.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="p-3 sm:p-4 rounded-xl border border-primary/20 bg-black/30 backdrop-blur-sm hover:border-primary/40 transition-all"
                >
                  <div className="flex items-center justify-between gap-3 sm:gap-4">
                    <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-primary font-mono text-xs sm:text-sm font-bold">
                          {u.username.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs sm:text-sm font-semibold text-white truncate">{u.username}</span>
                          {u.isAdmin && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary font-mono border border-primary/30">ADMIN</span>
                          )}
                        </div>
                        <p className="text-[10px] sm:text-xs text-gray-500 font-mono truncate">{u.email}</p>
                        <p className="text-[10px] sm:text-xs text-gray-600 font-mono">
                          {u.serverCount} server{u.serverCount !== 1 ? 's' : ''} · ID: {u.id}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                      <button
                        onClick={() => { setGrantBalanceTarget(u); setGrantBalanceAmount(''); setGrantBalanceNote(''); }}
                        title="Grant balance"
                        className="p-1.5 sm:p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                      >
                        <DollarSign size={14} />
                      </button>
                      <button
                        onClick={() => setUploadServerTarget(u)}
                        title="Upload server"
                        className="p-1.5 sm:p-2 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 hover:bg-green-500/20 transition-colors"
                      >
                        <Upload size={14} />
                      </button>
                      <button
                        onClick={() => handleToggleAdmin(u.id, !u.isAdmin)}
                        disabled={u.id === user.id || actionLoading === `admin-${u.id}`}
                        title={u.isAdmin ? 'Remove admin' : 'Make admin'}
                        className={`p-1.5 sm:p-2 rounded-lg border transition-colors disabled:opacity-30 ${
                          u.isAdmin
                            ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/20'
                            : 'bg-blue-500/10 border-blue-500/30 text-blue-400 hover:bg-blue-500/20'
                        }`}
                      >
                        {u.isAdmin ? <UserX size={14} /> : <UserCheck size={14} />}
                      </button>
                      <button
                        onClick={() => setConfirmAction({ type: 'deleteUser', id: u.id, name: u.username })}
                        disabled={u.id === user.id || actionLoading === `delete-user-${u.id}`}
                        title="Delete user"
                        className="p-1.5 sm:p-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-30"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </motion.div>
        )}

        {activeTab === 'servers' && (
          <motion.div
            key="servers"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500 font-mono">{filteredServers.length} servers</p>
              <button
                onClick={handleCleanupExpired}
                disabled={cleanupLoading}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-colors text-xs font-mono disabled:opacity-50"
              >
                {cleanupLoading ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    Cleaning up...
                  </>
                ) : (
                  <>
                    <Trash2 size={13} />
                    Delete All Expired
                  </>
                )}
              </button>
            </div>
            {filteredServers.length === 0 ? (
              <div className="p-8 rounded-xl border border-primary/20 bg-black/30 backdrop-blur-sm text-center">
                <p className="text-gray-400 font-mono">No servers found</p>
              </div>
            ) : (
              filteredServers.map((s, index) => (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="p-3 sm:p-4 rounded-xl border border-primary/20 bg-black/30 backdrop-blur-sm hover:border-primary/40 transition-all"
                >
                  <div className="flex items-start sm:items-center justify-between gap-3 sm:gap-4">
                    <div className="flex items-start sm:items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-primary/5 border border-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5 sm:mt-0">
                        <Server className="text-primary" size={16} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs sm:text-sm font-semibold text-white truncate">{s.name}</span>
                          <span className={`flex items-center gap-1 text-[10px] font-mono ${statusColor(s.status)}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${statusDot(s.status)}`} />
                            {s.status.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-[10px] sm:text-xs text-gray-500 font-mono truncate">
                          Owner: {s.ownerUsername} · Node {s.node} · ID: {s.id}
                        </p>
                        {s.limits && (
                          <p className="text-[10px] sm:text-xs text-gray-600 font-mono">
                            {s.limits.memory}MB RAM · {s.limits.disk}MB Disk · {s.limits.cpu}% CPU
                          </p>
                        )}
                        {s.isFreeServer && (
                          <div className="mt-0.5 space-y-0.5">
                            {s.deployedAt && (
                              <p className="text-[10px] sm:text-xs font-mono flex items-center gap-1 text-blue-400">
                                <Clock size={10} className="shrink-0" />
                                Deployed: {formatDate(s.deployedAt)}
                              </p>
                            )}
                            {s.expiresAt && (
                              <p className={`text-[10px] sm:text-xs font-mono flex items-center gap-1 ${
                                new Date(s.expiresAt) <= new Date() ? 'text-red-400' : 'text-green-400'
                              }`}>
                                <Clock size={10} className="shrink-0" />
                                {new Date(s.expiresAt) <= new Date()
                                  ? `Expired: ${formatDate(s.expiresAt)}`
                                  : `Expires: ${formatDate(s.expiresAt)}`
                                }
                              </p>
                            )}
                            <span className={`inline-block px-1.5 py-0 rounded text-[9px] font-mono ${
                              new Date(s.expiresAt) <= new Date()
                                ? 'bg-red-500/10 border border-red-500/20 text-red-400'
                                : 'bg-yellow-500/10 border border-yellow-500/20 text-yellow-400'
                            }`}>
                              {s.freeServerType === 'welcome' ? 'WELCOME TRIAL' : 'FREE TRIAL'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                      <a
                        href={`${PANEL_URL}/server/${s.identifier}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Open in panel"
                        className="p-1.5 sm:p-2 rounded-lg bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 transition-colors"
                      >
                        <ExternalLink size={14} />
                      </a>
                      {s.suspended ? (
                        <button
                          onClick={() => handleSuspendServer(s.id, false)}
                          disabled={actionLoading === `suspend-${s.id}`}
                          title="Unsuspend"
                          className="p-1.5 sm:p-2 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 hover:bg-green-500/20 transition-colors"
                        >
                          <Play size={14} />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleSuspendServer(s.id, true)}
                          disabled={actionLoading === `suspend-${s.id}`}
                          title="Suspend"
                          className="p-1.5 sm:p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/20 transition-colors"
                        >
                          <Pause size={14} />
                        </button>
                      )}
                      <button
                        onClick={() => setConfirmAction({ type: 'deleteServer', id: s.id, name: s.name })}
                        disabled={actionLoading === `delete-server-${s.id}`}
                        title="Delete server"
                        className="p-1.5 sm:p-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </motion.div>
        )}

        {activeTab === 'payments' && (
          <motion.div
            key="payments"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-4 sm:space-y-6"
          >
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4">
              <div className="p-2.5 sm:p-5 rounded-xl border border-green-500/20 bg-green-500/5">
                <p className="text-[9px] sm:text-xs text-gray-400 uppercase tracking-wider mb-0.5 sm:mb-1">Total Revenue</p>
                <h3 className="text-xs sm:text-2xl font-bold text-green-400 font-mono truncate">{formatCurrency(convertFromKES(paymentsTotalAmount, userCurrency), userCurrency)}</h3>
              </div>
              <div className="p-2.5 sm:p-5 rounded-xl border border-blue-500/20 bg-blue-500/5">
                <p className="text-[9px] sm:text-xs text-gray-400 uppercase tracking-wider mb-0.5 sm:mb-1">Total Payments</p>
                <h3 className="text-xs sm:text-2xl font-bold text-blue-400 font-mono">{payments.length}</h3>
              </div>
              <div className="p-2.5 sm:p-5 rounded-xl border border-yellow-500/20 bg-yellow-500/5 col-span-2 sm:col-span-1">
                <p className="text-[9px] sm:text-xs text-gray-400 uppercase tracking-wider mb-0.5 sm:mb-1">Avg Payment</p>
                <h3 className="text-xs sm:text-2xl font-bold text-yellow-400 font-mono truncate">
                  {payments.length > 0 ? formatCurrency(convertFromKES(Math.round(paymentsTotalAmount / payments.length), userCurrency), userCurrency) : formatCurrency(0, userCurrency)}
                </h3>
              </div>
            </div>

            {paymentsLoading ? (
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner size="lg" />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-500 font-mono">{filteredPayments.length} payments</p>
                  <button
                    onClick={fetchPayments}
                    className="text-xs text-primary font-mono hover:underline flex items-center gap-1"
                  >
                    <RefreshCw size={12} />
                    Refresh
                  </button>
                </div>

                {filteredPayments.length === 0 ? (
                  <div className="p-8 rounded-xl border border-primary/20 bg-black/30 backdrop-blur-sm text-center">
                    <CreditCard className="w-8 h-8 text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-400 font-mono">No payments found</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredPayments.map((p, index) => (
                      <motion.div
                        key={p.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.02 }}
                        className="p-3 sm:p-4 rounded-xl border border-primary/20 bg-black/30 backdrop-blur-sm hover:border-primary/40 transition-all"
                      >
                        <div className="flex items-start sm:items-center justify-between gap-3">
                          <div className="flex items-start sm:items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                            <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center shrink-0 mt-0.5 sm:mt-0 ${p.method === 'M-Pesa' ? 'bg-green-500/10 border border-green-500/20' : 'bg-blue-500/10 border border-blue-500/20'}`}>
                              {p.method === 'M-Pesa' ? <Phone className="w-4 h-4 text-green-400" /> : <CreditCard className="w-4 h-4 text-blue-400" />}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono text-xs sm:text-sm font-semibold text-white truncate">
                                  {p.customerName || p.email || 'Unknown'}
                                </span>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono border ${p.method === 'M-Pesa' ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-blue-500/10 border-blue-500/20 text-blue-400'}`}>
                                  {p.method}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 flex-wrap mt-0.5">
                                {p.email && (
                                  <span className="text-[10px] sm:text-xs text-gray-500 font-mono flex items-center gap-1 truncate">
                                    <Mail size={10} className="shrink-0" />
                                    {p.email}
                                  </span>
                                )}
                                {p.phone && (
                                  <span className="text-[10px] sm:text-xs text-gray-500 font-mono flex items-center gap-1">
                                    <Phone size={10} className="shrink-0" />
                                    {p.phone}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] text-gray-600 font-mono flex items-center gap-1">
                                  <Clock size={10} className="shrink-0" />
                                  {formatDate(p.paidAt)}
                                </span>
                                <span className="text-[10px] text-gray-600 font-mono">Ref: {p.reference?.slice(0, 12)}...</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-sm sm:text-base font-mono font-bold text-green-400">
                              +{formatCurrency(convertFromKES(p.amount, userCurrency), userCurrency)}
                            </span>
                            <p className="text-[10px] text-gray-500 font-mono">{p.currency}</p>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </>
            )}
          </motion.div>
        )}

        {activeTab === 'notifications' && (
          <motion.div
            key="notifications"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-4 sm:space-y-6"
          >
            <div className="rounded-xl border border-primary/20 bg-black/30 backdrop-blur-sm p-4 sm:p-6">
              <div className="flex items-center gap-2 mb-4">
                <Bell size={18} className="text-primary" />
                <h3 className="text-sm sm:text-lg font-bold">Broadcast Notification</h3>
              </div>
              <p className="text-xs text-gray-500 font-mono mb-4">Send a notification to all users on the platform.</p>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-mono text-gray-400 mb-1.5">Type</label>
                  <div className="flex gap-2 flex-wrap">
                    {[
                      { value: 'info', label: 'Info', active: 'bg-blue-500/10 border-blue-500/30 text-blue-400' },
                      { value: 'success', label: 'Success', active: 'bg-green-500/10 border-green-500/30 text-green-400' },
                      { value: 'warning', label: 'Warning', active: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400' },
                      { value: 'alert', label: 'Alert', active: 'bg-red-500/10 border-red-500/30 text-red-400' },
                    ].map(t => (
                      <button
                        key={t.value}
                        onClick={() => setBroadcastType(t.value)}
                        className={`px-3 py-1.5 rounded-lg font-mono text-xs border transition-all ${
                          broadcastType === t.value
                            ? t.active
                            : 'bg-black/30 border-primary/10 text-gray-500 hover:border-primary/20'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono text-gray-400 mb-1.5">Title</label>
                  <input
                    type="text"
                    value={broadcastTitle}
                    onChange={(e) => setBroadcastTitle(e.target.value)}
                    placeholder="Notification title..."
                    maxLength={200}
                    className="w-full px-4 py-2.5 bg-black/50 border border-primary/10 rounded-lg text-sm font-mono text-white placeholder-gray-600 focus:outline-none focus:border-primary/30 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-gray-400 mb-1.5">Message</label>
                  <textarea
                    value={broadcastMessage}
                    onChange={(e) => setBroadcastMessage(e.target.value)}
                    placeholder="Write your notification message..."
                    maxLength={1000}
                    rows={4}
                    className="w-full px-4 py-2.5 bg-black/50 border border-primary/10 rounded-lg text-sm font-mono text-white placeholder-gray-600 focus:outline-none focus:border-primary/30 transition-colors resize-none"
                  />
                  <p className="text-[10px] font-mono text-gray-600 mt-1">{broadcastMessage.length}/1000</p>
                </div>

                {broadcastTitle && broadcastMessage && (
                  <div className="p-3 rounded-lg border border-primary/10 bg-black/30">
                    <p className="text-[10px] font-mono text-gray-500 uppercase mb-1">Preview</p>
                    <p className="text-sm font-bold text-white">{broadcastTitle}</p>
                    <p className="text-xs text-gray-400 mt-1">{broadcastMessage}</p>
                  </div>
                )}

                <motion.button
                  onClick={handleBroadcast}
                  disabled={broadcastSending || !broadcastTitle.trim() || !broadcastMessage.trim()}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary font-mono text-sm font-semibold transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {broadcastSending ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <>
                      <Send size={14} />
                      Send to All Users
                    </>
                  )}
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'alerts' && (
          <motion.div
            key="alerts"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h2 className="text-lg font-display font-bold flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-400" />
                Security Alerts
                {adminAlerts.filter(a => !a.resolved).length > 0 && (
                  <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full font-mono">
                    {adminAlerts.filter(a => !a.resolved).length} unresolved
                  </span>
                )}
              </h2>
              <div className="flex gap-2">
                <select
                  value={alertFilter}
                  onChange={(e) => setAlertFilter(e.target.value)}
                  className="px-3 py-1.5 bg-black/40 border border-primary/20 rounded-lg text-xs font-mono text-gray-300 focus:outline-none"
                >
                  <option value="all">All Alerts</option>
                  <option value="unresolved">Unresolved</option>
                  <option value="resolved">Resolved</option>
                  <option value="bug_bot">Bug Bots</option>
                  <option value="server_expired">Expired Servers</option>
                  <option value="critical">Critical</option>
                </select>
                {user?.isSuperAdmin && adminAlerts.some(a => a.resolved) && (
                  <button
                    onClick={clearResolvedAlerts}
                    className="px-3 py-1.5 bg-red-500/10 border border-red-500/30 rounded-lg text-xs font-mono text-red-400 hover:bg-red-500/20 transition-colors"
                  >
                    Clear Resolved
                  </button>
                )}
              </div>
            </div>

            {alertsLoading ? (
              <div className="flex justify-center py-12"><LoadingSpinner /></div>
            ) : adminAlerts.length === 0 ? (
              <div className="text-center py-12 text-gray-500 font-mono text-sm">
                <AlertTriangle className="w-10 h-10 mx-auto mb-3 text-gray-600" />
                <p>No alerts yet. The system monitors for suspicious activity automatically.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {adminAlerts
                  .filter(a => {
                    if (alertFilter === 'unresolved') return !a.resolved;
                    if (alertFilter === 'resolved') return a.resolved;
                    if (alertFilter === 'bug_bot') return a.category === 'bug_bot';
                    if (alertFilter === 'server_expired') return a.category === 'server_expired';
                    if (alertFilter === 'critical') return a.severity === 'critical';
                    return true;
                  })
                  .map(alert => (
                    <motion.div
                      key={alert.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`p-4 rounded-xl border ${
                        alert.resolved
                          ? 'border-gray-700/50 bg-black/20 opacity-60'
                          : alert.severity === 'critical'
                            ? 'border-red-500/30 bg-red-500/5'
                            : alert.severity === 'warning'
                              ? 'border-yellow-500/30 bg-yellow-500/5'
                              : 'border-blue-500/30 bg-blue-500/5'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                              alert.severity === 'critical' ? 'bg-red-500/20 text-red-400'
                                : alert.severity === 'warning' ? 'bg-yellow-500/20 text-yellow-400'
                                  : 'bg-blue-500/20 text-blue-400'
                            }`}>
                              {alert.severity.toUpperCase()}
                            </span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-gray-700/50 text-gray-400">
                              {alert.category === 'bug_bot' ? 'BUG BOT' : alert.category === 'server_expired' ? 'EXPIRED' : alert.category.toUpperCase()}
                            </span>
                            {alert.resolved && (
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-green-500/20 text-green-400">RESOLVED</span>
                            )}
                          </div>
                          <h3 className="text-sm font-semibold text-white mb-1">{alert.title}</h3>
                          <p className="text-xs text-gray-400 font-mono break-words">{alert.message}</p>
                          {alert.metadata?.matches && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {alert.metadata.matches.map((m, i) => (
                                <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-red-400 font-mono">{m}</span>
                              ))}
                            </div>
                          )}
                          <p className="text-[10px] text-gray-500 font-mono mt-2">
                            {new Date(alert.createdAt).toLocaleString()}
                            {alert.resolvedBy && ` | Resolved by ${alert.resolvedBy}`}
                          </p>
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                          {!alert.resolved && (
                            <button
                              onClick={() => resolveAlert(alert.id)}
                              className="p-1.5 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 hover:bg-green-500/20 transition-colors"
                              title="Mark as resolved"
                            >
                              <CheckCircle size={14} />
                            </button>
                          )}
                          <button
                            onClick={() => deleteAlert(alert.id)}
                            className="p-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-colors"
                            title="Delete alert"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'tutorials' && (
          <motion.div
            key="tutorials"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-4 sm:space-y-6"
          >
            <div className="rounded-xl border border-primary/10 bg-black/30 backdrop-blur-sm p-4 sm:p-6">
              <h3 className="text-sm sm:text-base font-bold text-white mb-4 flex items-center gap-2">
                <Video size={16} className="text-primary" />
                {editingTutorial ? 'Edit Tutorial' : 'Add Tutorial'}
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-mono text-gray-400 mb-1 block">Title *</label>
                  <input
                    type="text"
                    value={tutorialForm.title}
                    onChange={(e) => setTutorialForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g. How to Claim Your Free Server"
                    className="w-full px-4 py-2.5 bg-black/50 border border-primary/10 rounded-lg text-sm font-mono text-white placeholder-gray-600 focus:outline-none focus:border-primary/30 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs font-mono text-gray-400 mb-1 block">Video URL * (YouTube link)</label>
                  <input
                    type="text"
                    value={tutorialForm.videoUrl}
                    onChange={(e) => setTutorialForm(prev => ({ ...prev, videoUrl: e.target.value }))}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="w-full px-4 py-2.5 bg-black/50 border border-primary/10 rounded-lg text-sm font-mono text-white placeholder-gray-600 focus:outline-none focus:border-primary/30 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs font-mono text-gray-400 mb-1 block">Description</label>
                  <textarea
                    value={tutorialForm.description}
                    onChange={(e) => setTutorialForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Brief description of what this tutorial covers..."
                    rows={2}
                    className="w-full px-4 py-2.5 bg-black/50 border border-primary/10 rounded-lg text-sm font-mono text-white placeholder-gray-600 focus:outline-none focus:border-primary/30 transition-colors resize-none"
                  />
                </div>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="text-xs font-mono text-gray-400 mb-1 block">Category</label>
                    <select
                      value={tutorialForm.category}
                      onChange={(e) => setTutorialForm(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full px-4 py-2.5 bg-black/50 border border-primary/10 rounded-lg text-sm font-mono text-white focus:outline-none focus:border-primary/30 transition-colors"
                    >
                      <option value="General">General</option>
                      <option value="Getting Started">Getting Started</option>
                      <option value="Payments">Payments</option>
                      <option value="Deployment">Deployment</option>
                      <option value="Server Management">Server Management</option>
                    </select>
                  </div>
                  <div className="flex items-end">
                    <label className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-primary/10 bg-black/50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={tutorialForm.published}
                        onChange={(e) => setTutorialForm(prev => ({ ...prev, published: e.target.checked }))}
                        className="rounded border-primary/30"
                      />
                      <span className="text-xs font-mono text-gray-400">Published</span>
                    </label>
                  </div>
                </div>
                <div className="flex gap-2">
                  <motion.button
                    onClick={handleSaveTutorial}
                    disabled={tutorialSaving}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary font-mono text-sm font-semibold transition-colors disabled:opacity-30"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {tutorialSaving ? <LoadingSpinner size="sm" /> : (
                      <>
                        {editingTutorial ? <Save size={14} /> : <Plus size={14} />}
                        {editingTutorial ? 'Update Tutorial' : 'Add Tutorial'}
                      </>
                    )}
                  </motion.button>
                  {editingTutorial && (
                    <button
                      onClick={cancelEditTutorial}
                      className="px-4 py-2.5 rounded-lg border border-primary/10 text-gray-400 hover:bg-primary/5 font-mono text-sm transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-primary/10 bg-black/30 backdrop-blur-sm p-4 sm:p-6">
              <h3 className="text-sm sm:text-base font-bold text-white mb-4 flex items-center gap-2">
                <BookOpen size={16} className="text-primary" />
                All Tutorials ({tutorials.length})
              </h3>
              {tutorialsLoading ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner size="md" />
                </div>
              ) : tutorials.length === 0 ? (
                <p className="text-center text-gray-500 font-mono text-sm py-8">No tutorials yet. Add one above.</p>
              ) : (
                <div className="space-y-3">
                  {tutorials.map(tutorial => (
                    <div
                      key={tutorial.id}
                      className={`flex items-start gap-3 p-3 rounded-lg border transition-all ${
                        tutorial.published ? 'border-primary/10 bg-black/20' : 'border-yellow-500/10 bg-yellow-500/5'
                      }`}
                    >
                      <div className="w-24 h-16 rounded-lg bg-black/50 overflow-hidden shrink-0">
                        {tutorial.youtubeId ? (
                          <img
                            src={`https://img.youtube.com/vi/${tutorial.youtubeId}/mqdefault.jpg`}
                            alt={tutorial.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Video size={20} className="text-gray-600" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-white truncate">{tutorial.title}</p>
                            <p className="text-[10px] font-mono text-gray-500 mt-0.5">
                              {tutorial.category} · {new Date(tutorial.createdAt).toLocaleDateString()}
                              {!tutorial.published && <span className="text-yellow-400 ml-1">(Draft)</span>}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => handleToggleTutorialPublish(tutorial)}
                              className="p-1.5 rounded-lg hover:bg-primary/10 transition-colors text-gray-400 hover:text-white"
                              title={tutorial.published ? 'Unpublish' : 'Publish'}
                            >
                              {tutorial.published ? <Eye size={14} /> : <EyeOff size={14} />}
                            </button>
                            <button
                              onClick={() => startEditTutorial(tutorial)}
                              className="p-1.5 rounded-lg hover:bg-primary/10 transition-colors text-gray-400 hover:text-primary"
                              title="Edit"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteTutorial(tutorial.id)}
                              className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors text-gray-400 hover:text-red-400"
                              title="Delete"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'bots' && (
          <motion.div
            key="bots"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-4 sm:space-y-6"
          >
            {/* Add / Edit Bot Form */}
            <div className="rounded-xl border border-primary/20 bg-black/30 backdrop-blur-sm p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                  <Bot className="w-4 h-4 text-primary" />
                  {editingBot ? 'Edit Bot' : 'Add Bot to Catalog'}
                </h3>
                {editingBot && (
                  <button onClick={resetBotForm} className="text-xs font-mono text-gray-500 hover:text-white transition-colors">
                    Cancel Edit
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 font-mono mb-1">Bot Name *</label>
                  <input data-testid="input-bot-name" type="text" value={botForm.name} onChange={e => setBotForm(f => ({ ...f, name: e.target.value }))} placeholder="WhatsApp MD Bot" className="w-full px-3 py-2 bg-black/50 border border-primary/20 rounded-lg text-sm text-gray-200 font-mono focus:outline-none focus:border-primary/50 transition-colors" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 font-mono mb-1">Tag</label>
                  <select data-testid="select-bot-tag" value={botForm.tag} onChange={e => setBotForm(f => ({ ...f, tag: e.target.value }))} className="w-full px-3 py-2 bg-black/50 border border-primary/20 rounded-lg text-sm text-gray-200 font-mono focus:outline-none focus:border-primary/50 transition-colors">
                    {['bot','whatsapp','telegram','discord','ai','api','utility','game'].map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs text-gray-400 font-mono mb-1">Description *</label>
                  <textarea data-testid="input-bot-description" value={botForm.description} onChange={e => setBotForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe what this bot does..." rows={2} className="w-full px-3 py-2 bg-black/50 border border-primary/20 rounded-lg text-sm text-gray-200 font-mono focus:outline-none focus:border-primary/50 transition-colors resize-none" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs text-gray-400 font-mono mb-1">GitHub Repo URL *</label>
                  <input data-testid="input-bot-repo" type="url" value={botForm.repoUrl} onChange={e => setBotForm(f => ({ ...f, repoUrl: e.target.value }))} placeholder="https://github.com/user/repo.git" className="w-full px-3 py-2 bg-black/50 border border-primary/20 rounded-lg text-sm text-gray-200 font-mono focus:outline-none focus:border-primary/50 transition-colors" />
                </div>
                <div className="sm:col-span-2">
                  <div className="flex items-center gap-2 px-3 py-2 bg-green-900/20 border border-green-500/20 rounded-lg">
                    <CheckCircle className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                    <span className="text-[11px] text-green-300 font-mono">
                      <span className="font-bold">app.json auto-detected</span> — when you save, the system reads <code className="text-green-400">app.json</code> directly from the repo root (tries <code>main</code> then <code>master</code>).
                    </span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 font-mono mb-1">Main File</label>
                  <input data-testid="input-bot-mainfile" type="text" value={botForm.mainFile} onChange={e => setBotForm(f => ({ ...f, mainFile: e.target.value }))} placeholder="index.js" className="w-full px-3 py-2 bg-black/50 border border-primary/20 rounded-lg text-sm text-gray-200 font-mono focus:outline-none focus:border-primary/50 transition-colors" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 font-mono mb-1">Price (KES)</label>
                  <input data-testid="input-bot-price" type="number" min={0} value={botForm.priceKES} onChange={e => setBotForm(f => ({ ...f, priceKES: Number(e.target.value) }))} className="w-full px-3 py-2 bg-black/50 border border-primary/20 rounded-lg text-sm text-gray-200 font-mono focus:outline-none focus:border-primary/50 transition-colors" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 font-mono mb-1">RAM (MB)</label>
                  <input data-testid="input-bot-ram" type="number" min={128} value={botForm.ramMB} onChange={e => setBotForm(f => ({ ...f, ramMB: Number(e.target.value) }))} className="w-full px-3 py-2 bg-black/50 border border-primary/20 rounded-lg text-sm text-gray-200 font-mono focus:outline-none focus:border-primary/50 transition-colors" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 font-mono mb-1">Disk (MB)</label>
                  <input data-testid="input-bot-disk" type="number" min={512} value={botForm.diskMB} onChange={e => setBotForm(f => ({ ...f, diskMB: Number(e.target.value) }))} className="w-full px-3 py-2 bg-black/50 border border-primary/20 rounded-lg text-sm text-gray-200 font-mono focus:outline-none focus:border-primary/50 transition-colors" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs text-gray-400 font-mono mb-1">Profile Image URL</label>
                  <div className="flex gap-2">
                    <input data-testid="input-bot-imageurl" type="url" value={botForm.imageUrl} onChange={e => setBotForm(f => ({ ...f, imageUrl: e.target.value }))} placeholder="https://example.com/bot-avatar.png" className="flex-1 px-3 py-2 bg-black/50 border border-primary/20 rounded-lg text-sm text-gray-200 font-mono focus:outline-none focus:border-primary/50 transition-colors" />
                    {botForm.imageUrl && (
                      <img src={botForm.imageUrl} alt="preview" className="w-9 h-9 rounded-lg object-cover border border-primary/20 shrink-0" onError={e => { e.target.style.display = 'none'; }} />
                    )}
                  </div>
                  <p className="text-[10px] text-gray-600 font-mono mt-1">Direct link to bot profile picture (optional)</p>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs text-gray-400 font-mono mb-1">Pair Site URL</label>
                  <input data-testid="input-bot-pairurl" type="url" value={botForm.pairUrl} onChange={e => setBotForm(f => ({ ...f, pairUrl: e.target.value }))} placeholder="https://pair.example.com" className="w-full px-3 py-2 bg-black/50 border border-primary/20 rounded-lg text-sm text-gray-200 font-mono focus:outline-none focus:border-primary/50 transition-colors" />
                  <p className="text-[10px] text-gray-600 font-mono mt-1">WhatsApp pairing website URL shown on the bot card (optional)</p>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  data-testid="button-save-bot"
                  onClick={handleSaveBot}
                  disabled={botSaving}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/20 border border-primary/40 text-primary text-sm font-mono font-semibold hover:bg-primary/30 transition-all disabled:opacity-50"
                >
                  {botSaving ? <LoadingSpinner size="sm" /> : <Save className="w-4 h-4" />}
                  {editingBot ? 'Save Changes' : 'Add Bot'}
                </button>
              </div>
            </div>

            {/* Catalog List */}
            <div className="rounded-xl border border-primary/20 bg-black/30 backdrop-blur-sm p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                  <Package className="w-4 h-4 text-primary" />
                  Catalog ({botCatalog.length} bots)
                </h3>
                <button onClick={fetchBotCatalog} className="text-xs text-primary font-mono flex items-center gap-1 hover:underline">
                  <RefreshCw className="w-3 h-3" />Refresh
                </button>
              </div>
              {botCatalogLoading ? (
                <div className="flex justify-center py-8"><LoadingSpinner /></div>
              ) : botCatalog.length === 0 ? (
                <p className="text-center text-gray-500 font-mono text-sm py-8">No bots in catalog yet. Add one above.</p>
              ) : (
                <div className="space-y-2">
                  {botCatalog.map(bot => (
                    <div key={bot.id} data-testid={`row-bot-${bot.id}`} className={`flex flex-col sm:flex-row sm:items-center gap-2 p-3 rounded-lg border transition-all ${bot.active === false ? 'border-gray-800 opacity-50' : 'border-primary/10 hover:border-primary/25'}`}>
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 overflow-hidden">
                          {bot.imageUrl ? (
                            <img src={bot.imageUrl} alt={bot.name} className="w-full h-full object-cover" onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='flex'; }} />
                          ) : null}
                          <Bot className={`w-4 h-4 text-primary ${bot.imageUrl ? 'hidden' : ''}`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-white font-mono truncate">{bot.name}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary font-mono">{bot.tag}</span>
                            {bot.active === false && <span className="text-[10px] text-gray-600 font-mono">[hidden]</span>}
                            {bot.pairUrl && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 font-mono">pair✓</span>}
                          </div>
                          <div className="flex items-center gap-3 mt-0.5 text-[10px] text-gray-600 font-mono flex-wrap">
                            <span>KES {bot.priceKES}</span>
                            <span>·</span>
                            <span>{bot.ramMB}MB RAM</span>
                            <span>·</span>
                            <a href={bot.repoUrl} target="_blank" rel="noopener noreferrer" className="text-primary/60 hover:text-primary flex items-center gap-0.5">
                              <Github className="w-3 h-3" />repo
                            </a>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Sync app.json from repo */}
                        <button
                          data-testid={`button-sync-appjson-${bot.id}`}
                          onClick={() => handleSyncAppJson(bot)}
                          disabled={syncingBotId === bot.id}
                          title="Sync app.json from repo (refresh env vars)"
                          className="p-1.5 rounded-lg border border-blue-500/20 text-blue-400/50 hover:text-blue-400 hover:border-blue-500/40 transition-all disabled:opacity-40"
                        >
                          <RefreshCw className={`w-4 h-4 ${syncingBotId === bot.id ? 'animate-spin' : ''}`} />
                        </button>
                        <button onClick={() => handleToggleBotActive(bot)} title={bot.active === false ? 'Show to users' : 'Hide from users'} className="p-1.5 rounded-lg border border-gray-700/50 text-gray-500 hover:text-yellow-400 hover:border-yellow-500/30 transition-all">
                          {bot.active === false ? <ToggleLeft className="w-4 h-4" /> : <ToggleRight className="w-4 h-4 text-green-400" />}
                        </button>
                        <button data-testid={`button-edit-bot-${bot.id}`} onClick={() => saveBotToForm(bot)} className="p-1.5 rounded-lg border border-gray-700/50 text-gray-500 hover:text-primary hover:border-primary/30 transition-all">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button data-testid={`button-delete-bot-${bot.id}`} onClick={() => handleDeleteBot(bot.id)} className="p-1.5 rounded-lg border border-red-500/10 text-red-400/50 hover:text-red-400 hover:border-red-500/30 transition-all">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'submissions' && (
          <motion.div key="submissions" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-primary" />
                <h2 className="text-base font-bold">Bot Submissions</h2>
              </div>
              <div className="flex items-center gap-2">
                {['pending','approved','rejected'].map(f => (
                  <button
                    key={f}
                    onClick={() => { setSubFilter(f); fetchSubmissions(f); }}
                    className={`px-3 py-1 text-xs font-mono rounded-lg border transition-all capitalize ${
                      subFilter === f
                        ? f === 'pending' ? 'bg-yellow-500/20 border-yellow-500/40 text-yellow-400'
                          : f === 'approved' ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                          : 'bg-red-500/20 border-red-500/40 text-red-400'
                        : 'bg-transparent border-gray-700/50 text-gray-500 hover:text-white'
                    }`}
                  >{f}</button>
                ))}
                <button onClick={() => fetchSubmissions()} className="px-3 py-1 text-xs font-mono bg-primary/10 border border-primary/30 rounded-lg hover:bg-primary/20 transition-all">Refresh</button>
              </div>
            </div>

            {submissionsLoading ? (
              <div className="flex justify-center py-12"><LoadingSpinner /></div>
            ) : submissions.length === 0 ? (
              <div className="rounded-xl border border-gray-800/50 bg-black/20 py-14 text-center">
                <p className="text-sm font-mono text-gray-600">No {subFilter} submissions</p>
              </div>
            ) : (
              <div className="space-y-3">
                {submissions.map(sub => (
                  <div key={sub.id} className="rounded-xl border border-primary/10 bg-black/30 overflow-hidden">
                    <div className="flex items-center gap-3 p-4">
                      {sub.imageUrl ? (
                        <img src={sub.imageUrl} alt={sub.botName} className="w-12 h-12 rounded-lg object-cover shrink-0 border border-gray-700/50" onError={e => e.target.style.display='none'} />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-primary/5 border border-primary/10 flex items-center justify-center shrink-0">
                          <Bot className="w-6 h-6 text-gray-600" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-mono font-bold text-white">{sub.botName}</p>
                          <span className="text-[10px] font-mono text-gray-600">v{sub.version}</span>
                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border capitalize ${
                            sub.status === 'pending' ? 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10'
                            : sub.status === 'approved' ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
                            : 'text-red-400 border-red-500/30 bg-red-500/10'
                          }`}>{sub.status}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                          <span className="text-[10px] font-mono text-gray-500">{sub.username} · {sub.gmail}</span>
                          <span className="text-[10px] font-mono text-gray-700">{new Date(sub.submittedAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      {sub.status === 'pending' && (
                        <button
                          onClick={() => setReviewingId(reviewingId === sub.id ? null : sub.id)}
                          className="px-3 py-1.5 text-xs font-mono bg-primary/10 border border-primary/30 rounded-lg hover:bg-primary/20 transition-all text-primary shrink-0"
                        >
                          {reviewingId === sub.id ? 'Close' : 'Review'}
                        </button>
                      )}
                    </div>

                    {/* Details */}
                    <div className="px-4 pb-3 pt-0 border-t border-white/5 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-[11px] font-mono">
                      <div className="flex gap-2 pt-2"><span className="text-gray-600 w-16 shrink-0">Repo</span><a href={sub.repoUrl} target="_blank" rel="noreferrer" className="text-primary/70 hover:text-primary truncate">{sub.repoUrl}</a></div>
                      <div className="flex gap-2 pt-2"><span className="text-gray-600 w-16 shrink-0">Pair Site</span><a href={sub.pairSite} target="_blank" rel="noreferrer" className="text-primary/70 hover:text-primary truncate">{sub.pairSite}</a></div>
                      {sub.description && <div className="flex gap-2 col-span-2"><span className="text-gray-600 w-16 shrink-0">About</span><span className="text-gray-400 leading-relaxed">{sub.description}</span></div>}
                      {sub.reviewNote && <div className="flex gap-2 col-span-2"><span className="text-gray-600 w-16 shrink-0">Note</span><span className={sub.status === 'rejected' ? 'text-red-400' : 'text-emerald-400'}>{sub.reviewNote}</span></div>}
                    </div>

                    {/* Review Panel */}
                    <AnimatePresence>
                      {reviewingId === sub.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-4 border-t border-primary/10 pt-3 space-y-3">
                            <textarea
                              value={reviewNote}
                              onChange={e => setReviewNote(e.target.value)}
                              placeholder="Optional note to developer (reason for rejection, feedback, etc.)"
                              rows={2}
                              className="w-full bg-black/60 border border-gray-700/50 rounded-lg px-3 py-2 text-xs font-mono text-white placeholder-gray-600 focus:outline-none focus:border-primary/50 resize-none"
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleReviewSubmission(sub.id, 'approve')}
                                disabled={!!reviewActionLoading}
                                data-testid={`button-approve-${sub.id}`}
                                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 text-xs font-mono font-semibold hover:bg-emerald-500/20 transition-all disabled:opacity-50"
                              >
                                {reviewActionLoading === sub.id + 'approve' ? <LoadingSpinner size="sm" /> : <CheckCircle className="w-3.5 h-3.5" />}
                                Approve & Add to Catalog
                              </button>
                              <button
                                onClick={() => handleReviewSubmission(sub.id, 'reject')}
                                disabled={!!reviewActionLoading}
                                data-testid={`button-reject-${sub.id}`}
                                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-red-500/40 bg-red-500/10 text-red-400 text-xs font-mono font-semibold hover:bg-red-500/20 transition-all disabled:opacity-50"
                              >
                                {reviewActionLoading === sub.id + 'reject' ? <LoadingSpinner size="sm" /> : <X className="w-3.5 h-3.5" />}
                                Reject
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'disk' && (
          <motion.div key="disk" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HardDrive className="w-5 h-5 text-primary" />
                <h2 className="text-base font-bold">Disk Management</h2>
              </div>
              <button
                onClick={fetchDiskStats}
                disabled={diskLoading}
                data-testid="button-refresh-disk"
                className="px-3 py-1.5 text-xs font-mono bg-primary/10 border border-primary/30 rounded-lg hover:bg-primary/20 transition-all disabled:opacity-50"
              >
                {diskLoading ? 'Loading...' : 'Refresh'}
              </button>
            </div>

            {diskLoading && !diskStats && (
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner />
              </div>
            )}

            {diskStats && (
              <>
                {/* Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-3 text-center">
                    <div className="text-xl font-bold text-white">{diskStats.totalServers}</div>
                    <div className="text-[10px] text-gray-400 font-mono mt-0.5">Total Servers</div>
                  </div>
                  <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-3 text-center">
                    <div className="text-xl font-bold text-yellow-400">{diskStats.suspendedCount}</div>
                    <div className="text-[10px] text-gray-400 font-mono mt-0.5">Suspended</div>
                  </div>
                  <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-3 text-center">
                    <div className="text-xl font-bold text-blue-400">{diskStats.totalAllocatedGB} GB</div>
                    <div className="text-[10px] text-gray-400 font-mono mt-0.5">Total Allocated</div>
                  </div>
                  <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-3 text-center">
                    <div className="text-xl font-bold text-green-400">
                      {(diskStats.servers.reduce((s, x) => s + (x.diskMB || 0), 0) / diskStats.servers.length / 1024).toFixed(1)} GB
                    </div>
                    <div className="text-[10px] text-gray-400 font-mono mt-0.5">Avg Per Server</div>
                  </div>
                </div>

                {/* Disk Usage Bar */}
                <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono text-gray-400">VPS Disk Usage</span>
                    <span className="text-xs font-mono text-gray-300">101 GB used / 148 GB total</span>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-3 overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-yellow-500 to-orange-500" style={{ width: '68%' }} />
                  </div>
                  <div className="flex justify-between mt-1.5 text-[10px] font-mono text-gray-500">
                    <span>68% used</span>
                    <span>42 GB free</span>
                  </div>
                </div>

                {/* Plan Limits Reference */}
                <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Layers className="w-4 h-4 text-primary" />
                    <span className="text-xs font-bold">Current Plan Disk Limits</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {Object.entries(diskStats.tierLimits || {}).map(([plan, limits]) => (
                      <div key={plan} className="bg-gray-800/50 rounded-lg p-2 text-center">
                        <div className="text-[10px] font-mono text-gray-400">{plan}</div>
                        <div className="text-sm font-bold text-white mt-0.5">{(limits.disk / 1024).toFixed(0)} GB</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Cleanup Actions */}
                {diskStats.suspendedCount > 0 && (
                  <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-bold text-red-400">Clean Up Suspended Servers</div>
                        <div className="text-[10px] text-gray-400 font-mono mt-0.5">
                          {diskStats.suspendedCount} suspended server{diskStats.suspendedCount !== 1 ? 's' : ''} found — deleting them frees disk space permanently.
                        </div>
                      </div>
                      <button
                        onClick={handleDiskCleanupSuspended}
                        disabled={diskCleanupLoading}
                        data-testid="button-cleanup-suspended"
                        className="flex-shrink-0 px-3 py-1.5 text-xs font-mono bg-red-500/10 border border-red-500/40 text-red-400 rounded-lg hover:bg-red-500/20 transition-all disabled:opacity-50"
                      >
                        {diskCleanupLoading ? 'Deleting...' : `Delete ${diskStats.suspendedCount} Suspended`}
                      </button>
                    </div>
                  </div>
                )}

                {/* Server List */}
                <div className="bg-gray-900/60 border border-gray-800 rounded-xl overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-800">
                    <Database className="w-4 h-4 text-primary" />
                    <span className="text-xs font-bold">Servers by Disk Allocation</span>
                    <span className="text-[10px] text-gray-500 font-mono ml-auto">sorted largest first</span>
                  </div>
                  <div className="divide-y divide-gray-800/50 max-h-96 overflow-y-auto">
                    {diskStats.servers.map((server) => (
                      <div key={server.id} className="flex items-center gap-2 px-3 py-2.5" data-testid={`row-server-disk-${server.id}`}>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-white truncate">{server.name}</span>
                            {server.suspended && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-yellow-500/15 text-yellow-400 font-mono flex-shrink-0">suspended</span>
                            )}
                          </div>
                          <div className="text-[10px] text-gray-500 font-mono">{server.identifier}</div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          {diskUpdateId === server.id ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                value={diskUpdateValue}
                                onChange={e => setDiskUpdateValue(e.target.value)}
                                placeholder="MB"
                                className="w-20 text-xs font-mono bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white"
                                data-testid={`input-disk-limit-${server.id}`}
                              />
                              <button
                                onClick={() => handleDiskLimitUpdate(server.id)}
                                className="text-[10px] px-2 py-1 bg-green-500/10 border border-green-500/30 text-green-400 rounded hover:bg-green-500/20"
                              >Save</button>
                              <button
                                onClick={() => { setDiskUpdateId(null); setDiskUpdateValue(''); }}
                                className="text-[10px] px-2 py-1 bg-gray-800 border border-gray-700 text-gray-400 rounded hover:bg-gray-700"
                              >✕</button>
                            </div>
                          ) : (
                            <button
                              onClick={() => { setDiskUpdateId(server.id); setDiskUpdateValue(String(server.diskMB)); }}
                              data-testid={`button-edit-disk-${server.id}`}
                              className="text-xs font-mono text-blue-400 hover:text-blue-300 transition-colors px-2 py-1 rounded hover:bg-blue-500/10"
                            >
                              {server.diskMB >= 1024 ? `${(server.diskMB / 1024).toFixed(1)} GB` : `${server.diskMB} MB`}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Terminal Commands Box */}
                <div className="bg-gray-950 border border-gray-700 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <BarChart3 className="w-4 h-4 text-green-400" />
                    <span className="text-xs font-bold text-green-400">Quick Cleanup Commands (run in Termius)</span>
                  </div>
                  <div className="space-y-2 text-[11px] font-mono text-gray-300">
                    <div className="bg-gray-900 rounded p-2">
                      <div className="text-gray-500 text-[10px] mb-1"># Real disk usage per server volume</div>
                      <div>du -sh /var/lib/pterodactyl/volumes/* 2&gt;/dev/null | sort -rh | head -20</div>
                    </div>
                    <div className="bg-gray-900 rounded p-2">
                      <div className="text-gray-500 text-[10px] mb-1"># Clean up Docker system (images, stopped containers)</div>
                      <div>docker system prune -af --volumes</div>
                    </div>
                    <div className="bg-gray-900 rounded p-2">
                      <div className="text-gray-500 text-[10px] mb-1"># Find & remove node_modules from specific volume UUID</div>
                      <div>rm -rf /var/lib/pterodactyl/volumes/[UUID]/node_modules</div>
                    </div>
                    <div className="bg-gray-900 rounded p-2">
                      <div className="text-gray-500 text-[10px] mb-1"># Current free disk</div>
                      <div>df -h /</div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        )}

        {activeTab === 'site-settings' && (
          <motion.div
            key="site-settings"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-4 sm:space-y-6"
          >
            <div className="rounded-xl border border-primary/20 bg-black/30 backdrop-blur-sm p-4 sm:p-6">
              <div className="flex items-center gap-2 mb-4">
                <Globe size={18} className="text-primary" />
                <h3 className="text-sm sm:text-lg font-bold">Social Links & Contact</h3>
              </div>
              <p className="text-xs text-gray-500 font-mono mb-4">Update the social links shown on the landing page, sidebar, and footer.</p>

              {settingsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <LoadingSpinner size="lg" />
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="flex items-center gap-2 text-xs font-mono text-gray-400 mb-1.5">
                      <MessageCircle size={12} className="text-green-400" />
                      WhatsApp Channel URL
                    </label>
                    <input
                      type="text"
                      value={siteSettings.whatsappChannel}
                      onChange={(e) => setSiteSettings(prev => ({ ...prev, whatsappChannel: e.target.value }))}
                      placeholder="https://whatsapp.com/channel/..."
                      className="w-full px-4 py-2.5 bg-black/50 border border-primary/10 rounded-lg text-sm font-mono text-white placeholder-gray-600 focus:outline-none focus:border-primary/30 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="flex items-center gap-2 text-xs font-mono text-gray-400 mb-1.5">
                      <Users size={12} className="text-green-400" />
                      WhatsApp Group URL
                    </label>
                    <input
                      type="text"
                      value={siteSettings.whatsappGroup}
                      onChange={(e) => setSiteSettings(prev => ({ ...prev, whatsappGroup: e.target.value }))}
                      placeholder="https://chat.whatsapp.com/..."
                      className="w-full px-4 py-2.5 bg-black/50 border border-primary/10 rounded-lg text-sm font-mono text-white placeholder-gray-600 focus:outline-none focus:border-primary/30 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="flex items-center gap-2 text-xs font-mono text-gray-400 mb-1.5">
                      <Youtube size={12} className="text-red-400" />
                      YouTube URL
                    </label>
                    <input
                      type="text"
                      value={siteSettings.youtube}
                      onChange={(e) => setSiteSettings(prev => ({ ...prev, youtube: e.target.value }))}
                      placeholder="https://www.youtube.com/@..."
                      className="w-full px-4 py-2.5 bg-black/50 border border-primary/10 rounded-lg text-sm font-mono text-white placeholder-gray-600 focus:outline-none focus:border-primary/30 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="flex items-center gap-2 text-xs font-mono text-gray-400 mb-1.5">
                      <Phone size={12} className="text-green-400" />
                      Support WhatsApp Link
                    </label>
                    <input
                      type="text"
                      value={siteSettings.supportPhone}
                      onChange={(e) => setSiteSettings(prev => ({ ...prev, supportPhone: e.target.value }))}
                      placeholder="https://wa.me/..."
                      className="w-full px-4 py-2.5 bg-black/50 border border-primary/10 rounded-lg text-sm font-mono text-white placeholder-gray-600 focus:outline-none focus:border-primary/30 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="flex items-center gap-2 text-xs font-mono text-gray-400 mb-1.5">
                      <Phone size={12} className="text-green-400" />
                      Support Phone Display
                    </label>
                    <input
                      type="text"
                      value={siteSettings.supportPhoneDisplay}
                      onChange={(e) => setSiteSettings(prev => ({ ...prev, supportPhoneDisplay: e.target.value }))}
                      placeholder="+254 713 046 497"
                      className="w-full px-4 py-2.5 bg-black/50 border border-primary/10 rounded-lg text-sm font-mono text-white placeholder-gray-600 focus:outline-none focus:border-primary/30 transition-colors"
                    />
                  </div>

                  <motion.button
                    onClick={saveSiteSettings}
                    disabled={settingsSaving}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary font-mono text-sm font-semibold transition-colors disabled:opacity-30"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {settingsSaving ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <>
                        <Save size={14} />
                        Save Settings
                      </>
                    )}
                  </motion.button>
                </div>
              )}
            </div>

            {/* Email Notification Config */}
            <div className="rounded-xl border border-primary/20 bg-black/30 backdrop-blur-sm p-4 sm:p-6">
              <div className="flex items-center gap-2 mb-1">
                <Mail size={18} className="text-primary" />
                <h3 className="text-sm sm:text-lg font-bold">Email Notifications</h3>
              </div>
              <p className="text-xs text-gray-500 font-mono mb-4">
                Configure a Gmail address to send bot submission review emails (approved/rejected) to developers.
                Use a <span className="text-primary">Gmail App Password</span> — not your regular password.
              </p>

              {emailConfigLoading ? (
                <div className="flex items-center justify-center py-8">
                  <LoadingSpinner size="lg" />
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="flex items-center gap-2 text-xs font-mono text-gray-400 mb-1.5">
                      <Mail size={12} className="text-primary" />
                      Sender Gmail Address
                    </label>
                    <input
                      type="email"
                      value={emailConfig.emailUser}
                      onChange={(e) => setEmailConfig(prev => ({ ...prev, emailUser: e.target.value }))}
                      placeholder="yourbot@gmail.com"
                      className="w-full px-4 py-2.5 bg-black/50 border border-primary/10 rounded-lg text-sm font-mono text-white placeholder-gray-600 focus:outline-none focus:border-primary/30 transition-colors"
                      data-testid="input-email-user"
                    />
                  </div>

                  <div>
                    <label className="flex items-center gap-2 text-xs font-mono text-gray-400 mb-1.5">
                      <Lock size={12} className="text-primary" />
                      Gmail App Password
                      {emailConfig.emailPassSet && (
                        <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/20 font-mono">configured</span>
                      )}
                    </label>
                    <div className="relative">
                      <input
                        type={showEmailPass ? 'text' : 'password'}
                        value={emailConfig.emailPass}
                        onChange={(e) => setEmailConfig(prev => ({ ...prev, emailPass: e.target.value }))}
                        placeholder={emailConfig.emailPassSet ? '••••••••••••••••' : 'xxxx xxxx xxxx xxxx'}
                        className="w-full px-4 py-2.5 pr-10 bg-black/50 border border-primary/10 rounded-lg text-sm font-mono text-white placeholder-gray-600 focus:outline-none focus:border-primary/30 transition-colors"
                        data-testid="input-email-pass"
                      />
                      <button
                        type="button"
                        onClick={() => setShowEmailPass(p => !p)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                      >
                        {showEmailPass ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                    <p className="text-[10px] text-gray-600 font-mono mt-1">
                      Google Account → Security → 2-Step Verification → App passwords → Generate
                    </p>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <motion.button
                      onClick={saveEmailConfig}
                      disabled={emailConfigSaving}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary font-mono text-sm font-semibold transition-colors disabled:opacity-30"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      data-testid="button-save-email-config"
                    >
                      {emailConfigSaving ? <LoadingSpinner size="sm" /> : <><Save size={14} />Save Config</>}
                    </motion.button>
                    <motion.button
                      onClick={testEmailConfig}
                      disabled={emailConfigTesting || !emailConfig.emailPassSet}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-black/50 hover:bg-primary/10 border border-primary/20 text-gray-400 hover:text-primary font-mono text-sm transition-colors disabled:opacity-30"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      data-testid="button-test-email"
                      title="Send a test email to the configured address"
                    >
                      {emailConfigTesting ? <LoadingSpinner size="sm" /> : <><Send size={14} />Test</>}
                    </motion.button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {confirmAction && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4"
            onClick={() => setConfirmAction(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-[calc(100%-1.5rem)] max-w-[340px] space-y-3 rounded-xl border border-primary/20 bg-black/95 backdrop-blur-md p-3 sm:p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center justify-center shrink-0">
                  <AlertTriangle className="text-red-400" size={16} />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Confirm Delete</h3>
                  <p className="text-[10px] text-gray-400 font-mono">This action cannot be undone</p>
                </div>
              </div>
              <p className="text-xs font-mono text-gray-300">
                Are you sure you want to delete{' '}
                <span className="text-red-400 font-bold">{confirmAction.name}</span>?
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmAction(null)}
                  className="flex-1 px-3 py-2 rounded-lg border border-primary/20 text-gray-400 hover:bg-primary/5 transition-colors font-mono text-xs"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (confirmAction.type === 'deleteUser') handleDeleteUser(confirmAction.id);
                    if (confirmAction.type === 'deleteServer') handleDeleteServer(confirmAction.id);
                  }}
                  disabled={actionLoading}
                  className="flex-1 px-3 py-2 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 transition-colors font-mono text-xs disabled:opacity-50"
                >
                  {actionLoading ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {uploadServerTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4"
            onClick={() => { if (!uploadServerLoading) setUploadServerTarget(null); }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-[calc(100%-1.5rem)] max-w-[340px] max-h-[80vh] overflow-y-auto rounded-xl border border-primary/20 bg-black/95 backdrop-blur-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-3 sm:p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm sm:text-base font-bold flex items-center gap-1.5 text-white">
                    <Upload className="w-4 h-4 text-primary" />
                    Upload Server
                  </h3>
                  <button
                    onClick={() => setUploadServerTarget(null)}
                    disabled={uploadServerLoading}
                    className="p-1 hover:bg-primary/10 rounded-lg transition-colors text-gray-400 hover:text-white disabled:opacity-30"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="flex items-center gap-2 mb-3 p-2 rounded-lg bg-primary/5 border border-primary/20">
                  <div className="w-6 h-6 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                    <span className="text-primary font-mono text-[10px] font-bold">
                      {uploadServerTarget.username.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-mono font-semibold text-white truncate">{uploadServerTarget.username}</p>
                    <p className="text-[9px] text-gray-500 font-mono truncate">{uploadServerTarget.email}</p>
                  </div>
                </div>

                <div className="mb-3">
                  <label className="text-[10px] font-mono text-gray-400 mb-1 block">Nest ID</label>
                  <input
                    type="number"
                    min="1"
                    value={uploadServerNestId}
                    onChange={(e) => setUploadServerNestId(parseInt(e.target.value) || 5)}
                    disabled={uploadServerLoading}
                    data-testid="input-nest-id"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-primary/20 bg-primary/5 text-white font-mono text-xs focus:outline-none focus:border-primary/50 disabled:opacity-50"
                  />
                </div>

                <div className="space-y-2">
                  {[
                    { name: 'Limited', icon: Shield, color: 'primary', specs: '5GB RAM · 10GB Disk · 1 vCPU' },
                    { name: 'Unlimited', icon: Zap, color: 'blue', specs: 'Full RAM · 40GB Disk · 2 vCPU' },
                    { name: 'Admin', icon: Crown, color: 'purple', specs: 'Full RAM · 80GB Disk · 4 vCPU' },
                  ].map((tier) => {
                    const borderCls = tier.color === 'primary' ? 'border-primary/20 hover:border-primary/50' : tier.color === 'blue' ? 'border-blue-500/20 hover:border-blue-500/50' : 'border-purple-500/20 hover:border-purple-500/50';
                    const bgCls = tier.color === 'primary' ? 'bg-primary/5' : tier.color === 'blue' ? 'bg-blue-500/5' : 'bg-purple-500/5';
                    const iconCls = tier.color === 'primary' ? 'text-primary' : tier.color === 'blue' ? 'text-blue-400' : 'text-purple-400';

                    return (
                      <motion.button
                        key={tier.name}
                        className={`w-full flex items-center gap-2.5 p-2.5 rounded-lg border ${borderCls} ${bgCls} transition-all disabled:opacity-50`}
                        whileTap={{ scale: 0.97 }}
                        disabled={uploadServerLoading}
                        onClick={() => {
                          if (!uploadServerLoading) handleUploadServer(uploadServerTarget.id, tier.name);
                        }}
                      >
                        <div className={`p-1.5 rounded-lg ${bgCls} border ${borderCls.split(' ')[0]} shrink-0`}>
                          <tier.icon className={`w-3.5 h-3.5 ${iconCls}`} />
                        </div>
                        <div className="flex-1 text-left min-w-0">
                          <p className="text-xs font-bold text-white">{tier.name}</p>
                          <p className="text-[9px] text-gray-500 font-mono truncate">{tier.specs}</p>
                        </div>
                        {uploadServerLoading ? (
                          <LoadingSpinner size="sm" />
                        ) : (
                          <Upload size={13} className={iconCls} />
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {uploadSuccess && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4"
            onClick={() => setUploadSuccess(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-[calc(100%-1.5rem)] max-w-[340px] rounded-xl border border-green-500/30 bg-black/95 backdrop-blur-md p-4 text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-400" />
              </div>
              <h3 className="text-sm font-bold text-white mb-1.5">Server Uploaded</h3>
              <p className="text-xs text-gray-400 font-mono mb-0.5">
                <span className="text-green-400 font-bold">{uploadSuccess.plan}</span> server uploaded to
              </p>
              <p className="text-xs font-mono font-bold text-white mb-3">{uploadSuccess.username}</p>
              {uploadSuccess.serverName && (
                <p className="text-[10px] text-gray-500 font-mono mb-3">Server: {uploadSuccess.serverName}</p>
              )}
              <button
                onClick={() => setUploadSuccess(null)}
                className="w-full px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 hover:bg-green-500/20 transition-colors font-mono text-xs"
              >
                Done
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {grantBalanceTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4"
            onClick={() => setGrantBalanceTarget(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-[calc(100%-1.5rem)] max-w-[360px] rounded-xl border border-emerald-500/30 bg-black/95 backdrop-blur-md p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Grant Balance</h3>
                  <p className="text-[10px] text-gray-500 font-mono">{grantBalanceTarget.username} · {grantBalanceTarget.email}</p>
                </div>
              </div>
              <div className="space-y-3 mb-4">
                <div>
                  <label className="block text-[10px] font-mono text-gray-400 mb-1">Amount (KES)</label>
                  <input
                    type="number"
                    min="1"
                    value={grantBalanceAmount}
                    onChange={(e) => setGrantBalanceAmount(e.target.value)}
                    placeholder="e.g. 50"
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white font-mono text-sm focus:outline-none focus:border-emerald-500/50 placeholder-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-gray-400 mb-1">Note (optional)</label>
                  <input
                    type="text"
                    value={grantBalanceNote}
                    onChange={(e) => setGrantBalanceNote(e.target.value)}
                    placeholder="e.g. Free trial credit"
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white font-mono text-sm focus:outline-none focus:border-emerald-500/50 placeholder-gray-600"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setGrantBalanceTarget(null)}
                  className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10 transition-colors font-mono text-xs"
                >
                  Cancel
                </button>
                <button
                  onClick={handleGrantBalance}
                  disabled={grantBalanceLoading || !grantBalanceAmount || Number(grantBalanceAmount) < 1}
                  className="flex-1 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 transition-colors font-mono text-xs disabled:opacity-50"
                >
                  {grantBalanceLoading ? 'Granting...' : 'Grant KES ' + (grantBalanceAmount || '0')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Admin;
