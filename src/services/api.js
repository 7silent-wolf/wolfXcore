// src/services/api.js

// ======================
// CONFIGURATION
// ======================

const API_BASE_URL = '/api';

const API_DELAY = 300;

// ======================
// UTILITY FUNCTIONS
// ======================

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const getAuthToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('jwt_token');
  }
  return null;
};

const authHeaders = () => {
  const token = getAuthToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

const authFetch = async (url, options = {}) => {
  const headers = { ...authHeaders(), ...options.headers };
  const response = await fetch(url, { ...options, headers });
  if (response.status === 401) {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('jwt_token');
      localStorage.removeItem('current_user');
      window.location.href = '/login';
    }
    throw new Error('Session expired. Please log in again.');
  }
  return response;
};


// ======================
// AUTH API
// ======================

export const authAPI = {
  login: async (credentials) => {
    try {
      const email = credentials.email || credentials;
      const password = credentials.password || arguments[1];

      if (!email || !password) {
        throw new Error('Email and password are required');
      }

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        return {
          success: false,
          error: data.message || 'Login failed. Please check your credentials.',
          message: data.message || 'Login failed. Please check your credentials.'
        };
      }

      const userData = {
        id: data.user.panelId || data.user.id,
        email: data.user.email,
        name: data.user.firstName && data.user.lastName
          ? `${data.user.firstName} ${data.user.lastName}`
          : data.user.username,
        username: data.user.username,
        phone: '',
        wallet: 0.00,
        referrals: 0,
        tier: 'basic',
        createdAt: new Date().toISOString().split('T')[0],
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.user.email}`,
        country: localStorage.getItem('user_country') || 'KE',
        countryCode: localStorage.getItem('user_country') || 'KE',
        isEmailVerified: true,
        isPhoneVerified: false,
        twoFactorEnabled: false,
        panelId: data.user.panelId,
        isAdmin: data.user.isAdmin || false,
        isSuperAdmin: data.user.isSuperAdmin || false,
        lastLogin: new Date().toISOString(),
      };

      if (typeof window !== 'undefined') {
        localStorage.setItem('current_user', JSON.stringify(userData));
        if (data.token) {
          localStorage.setItem('jwt_token', data.token);
        }
      }

      return {
        success: true,
        user: userData,
        token: data.token,
        message: 'Login successful'
      };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        error: error.message || 'Login failed. Please check your credentials.',
        message: error.message || 'Login failed. Please check your credentials.'
      };
    }
  },

  register: async (userData) => {
    try {
      if (!userData.email || !userData.password) {
        throw new Error('Email and password are required');
      }

      if (userData.password.length < 6) {
        throw new Error('Password must be at least 6 characters');
      }

      const payload = {
        email: userData.email,
        username: userData.username || userData.email.split('@')[0],
        password: userData.password,
      };
      if (userData.referralCode) {
        payload.referralCode = userData.referralCode;
      }

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        return {
          success: false,
          error: data.message || 'Registration failed',
          message: data.message || 'Registration failed'
        };
      }

      const newUser = {
        id: data.user.panelId || data.user.id,
        email: data.user.email,
        name: data.user.username || userData.username,
        username: data.user.username,
        phone: '',
        wallet: 0.00,
        referrals: 0,
        tier: 'basic',
        createdAt: new Date().toISOString().split('T')[0],
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${userData.email}`,
        country: localStorage.getItem('user_country') || 'KE',
        countryCode: localStorage.getItem('user_country') || 'KE',
        isEmailVerified: false,
        isPhoneVerified: false,
        twoFactorEnabled: false,
        panelId: data.user.panelId,
        isAdmin: data.user.isAdmin || false,
        isSuperAdmin: data.user.isSuperAdmin || false,
      };

      if (typeof window !== 'undefined') {
        localStorage.setItem('current_user', JSON.stringify(newUser));
        if (data.token) {
          localStorage.setItem('jwt_token', data.token);
        }
      }

      return {
        success: true,
        user: newUser,
        token: data.token,
        message: 'Registration successful'
      };
    } catch (error) {
      console.error('Register error:', error);
      return {
        success: false,
        error: error.message || 'Registration failed',
        message: error.message || 'Registration failed'
      };
    }
  },

  logout: async () => {
    try {
      await delay(API_DELAY);
      console.log('👋 Mock logout');
      
      // Clear localStorage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('jwt_token');
        localStorage.removeItem('current_user');
      }
      
      return { 
        success: true, 
        message: 'Logged out successfully' 
      };
    } catch (error) {
      return { 
        success: false, 
        message: 'Logout failed' 
      };
    }
  },

  // Required by AuthContext
  getUser: async () => {
    try {
      await delay(API_DELAY);

      if (typeof window !== 'undefined') {
        const token = localStorage.getItem('auth_token');
        const storedUser = localStorage.getItem('current_user');
        if (token && storedUser) {
          return {
            success: true,
            user: JSON.parse(storedUser)
          };
        }
      }

      return {
        success: false,
        message: 'Not logged in'
      };
    } catch (error) {
      console.error('Get user error:', error);
      return { 
        success: false, 
        message: 'Failed to get user data' 
      };
    }
  },

  // Alias for getUser
  getCurrentUser: async () => {
    return authAPI.getUser();
  },

  updateProfile: async (profileData) => {
    try {
      await delay(API_DELAY);
      console.log('🔄 Mock update profile:', profileData);
      
      // Get current user
      const currentUserResponse = await authAPI.getUser();
      const currentUser = currentUserResponse.user;
      
      const updatedUser = {
        ...currentUser,
        ...profileData,
        updatedAt: new Date().toISOString()
      };
      
      // Update localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('current_user', JSON.stringify(updatedUser));
      }
      
      return {
        success: true,
        user: updatedUser,
        message: 'Profile updated successfully'
      };
    } catch (error) {
      console.error('Update profile error:', error);
      return { 
        success: false, 
        message: 'Failed to update profile' 
      };
    }
  },

  verifyPhone: async (phone, code) => {
    try {
      await delay(API_DELAY);
      console.log('📱 Mock verify phone:', phone);
      
      // Update user verification status
      const currentUserResponse = await authAPI.getUser();
      const currentUser = currentUserResponse.user;
      
      const updatedUser = {
        ...currentUser,
        phone: phone,
        isPhoneVerified: true,
        phoneVerifiedAt: new Date().toISOString()
      };
      
      if (typeof window !== 'undefined') {
        localStorage.setItem('current_user', JSON.stringify(updatedUser));
      }
      
      return {
        success: true,
        user: updatedUser,
        message: 'Phone number verified successfully'
      };
    } catch (error) {
      return { 
        success: false, 
        message: 'Failed to verify phone number' 
      };
    }
  },

  verifyEmail: async (code) => {
    try {
      await delay(API_DELAY);
      
      const currentUserResponse = await authAPI.getUser();
      const currentUser = currentUserResponse.user;
      
      const updatedUser = {
        ...currentUser,
        isEmailVerified: true,
        emailVerifiedAt: new Date().toISOString()
      };
      
      if (typeof window !== 'undefined') {
        localStorage.setItem('current_user', JSON.stringify(updatedUser));
      }
      
      return {
        success: true,
        user: updatedUser,
        message: 'Email verified successfully'
      };
    } catch (error) {
      return { 
        success: false, 
        message: 'Failed to verify email' 
      };
    }
  },

  resetPassword: async (email) => {
    try {
      await delay(API_DELAY);
      console.log('🔐 Mock password reset for:', email);
      
      return {
        success: true,
        message: 'Password reset instructions sent to your email'
      };
    } catch (error) {
      return { 
        success: false, 
        message: 'Failed to reset password' 
      };
    }
  }
};

// ======================
// STATS API
// ======================

export const statsAPI = {
  getOverviewStats: async () => {
    try {
      let balance = 0;
      let totalMpesaDeposits = 0;
      let txnCount = 0;
      try {
        let userEmail = '';
        try {
          const storedUser = localStorage.getItem('current_user');
          if (storedUser) {
            const u = JSON.parse(storedUser);
            userEmail = u.email || '';
          }
        } catch (e) {}
        const params = userEmail ? `?email=${encodeURIComponent(userEmail)}` : '';
        const totalsRes = await authFetch(`/api/transactions/totals${params}`);
        const totalsData = await totalsRes.json();
        if (totalsData.success) {
          balance = totalsData.balance;
          totalMpesaDeposits = totalsData.totalDeposits;
          txnCount = totalsData.totalCount || 0;
        }
      } catch (e) {
        console.error('Failed to fetch totals for stats:', e);
      }

      return {
        success: true,
        stats: {
          totalServers: 3,
          activeServers: 2,
          totalRevenue: totalMpesaDeposits,
          pendingInvoices: 1,
          referralCount: 5,
          referralEarnings: 1250.00,
          monthlyGrowth: 15.5,
          uptime: 99.8,
          storageUsed: '65%',
          bandwidthUsed: '42%',
          currentBalance: balance,
          monthlyVisitors: 12450,
          conversionRate: 3.2,
          averageResponseTime: 45
        }
      };
    } catch (error) {
      console.error('Stats error:', error);
      return { success: false, stats: {}, message: 'Failed to load dashboard stats' };
    }
  },

  // Alias for compatibility
  getDashboardStats: async () => {
    return statsAPI.getOverviewStats();
  },

  // Get performance stats
  getPerformanceStats: async () => {
    try {
      await delay(API_DELAY);
      
      return {
        success: true,
        performance: {
          cpuUsage: [45, 50, 40, 60, 55, 48, 52],
          memoryUsage: [68, 65, 70, 62, 75, 68, 72],
          storageUsage: [42, 44, 46, 48, 50, 52, 54],
          bandwidthUsage: [120, 145, 130, 160, 140, 135, 150],
          responseTimes: [45, 42, 48, 40, 46, 43, 47],
          uptimeHistory: [99.8, 99.7, 99.9, 99.8, 99.6, 99.9, 99.8]
        }
      };
    } catch (error) {
      return { 
        success: false, 
        performance: {} 
      };
    }
  },

  getRevenueStats: async () => {
    try {
      let totalDeposits = 0;
      let txnCount = 0;
      const depositsByMonth = {};

      try {
        let userEmail = '';
        try {
          const storedUser = localStorage.getItem('current_user');
          if (storedUser) {
            const u = JSON.parse(storedUser);
            userEmail = u.email || '';
          }
        } catch (e) {}
        const emailParam = userEmail ? `&email=${encodeURIComponent(userEmail)}` : '';
        const response = await authFetch(`/api/transactions?perPage=100&status=success${emailParam}`);
        const data = await response.json();
        if (data.success && data.transactions) {
          data.transactions.forEach(txn => {
            if (txn.amount > 0) {
              totalDeposits += txn.amount;
              txnCount++;
              const date = new Date(txn.paidAt || txn.createdAt);
              const month = date.toLocaleString('en-US', { month: 'short' });
              depositsByMonth[month] = (depositsByMonth[month] || 0) + txn.amount;
            }
          });
        }
      } catch (e) {
        console.error('Failed to fetch revenue data:', e);
      }

      return {
        success: true,
        revenue: {
          monthly: depositsByMonth,
          total: totalDeposits,
          growth: 0,
          averageTransaction: txnCount > 0 ? totalDeposits / txnCount : 0
        }
      };
    } catch (error) {
      return { success: false, revenue: {} };
    }
  }
};

// ======================
// ACTIVITY API
// ======================

export const activityAPI = {
  getRecentActivity: async (limit = 10) => {
    try {
      let mpesaActivities = [];
      try {
        const response = await authFetch(`/api/transactions?perPage=${limit}`);
        const data = await response.json();
        if (data.success && data.transactions) {
          mpesaActivities = data.transactions.map(txn => ({
            id: txn.id || txn.reference,
            type: 'deposit',
            message: `M-Pesa deposit of KES ${txn.amount.toLocaleString()} ${txn.phone ? 'from ' + txn.phone : ''}`,
            timestamp: txn.paidAt || txn.createdAt,
            icon: 'wallet',
            color: txn.status === 'success' ? 'green' : 'orange',
            amount: txn.amount,
            status: txn.status === 'success' ? 'completed' : txn.status
          }));
        }
      } catch (e) {
        console.error('Failed to fetch activities from backend:', e);
      }

      return {
        success: true,
        activities: mpesaActivities.slice(0, limit),
        total: mpesaActivities.length
      };
    } catch (error) {
      console.error('Activity error:', error);
      return { 
        success: false, 
        activities: [],
        message: 'Failed to load recent activity' 
      };
    }
  },

  // Get all activity with filtering
  getAllActivity: async (filters = {}) => {
    try {
      await delay(API_DELAY);
      
      const mpesaTransactions = JSON.parse(localStorage.getItem('mpesa_transactions') || '[]');
      const allActivities = await activityAPI.getRecentActivity(100);
      
      // Apply filters
      let filtered = allActivities.activities;
      
      if (filters.type) {
        filtered = filtered.filter(activity => activity.type === filters.type);
      }
      
      if (filters.startDate) {
        filtered = filtered.filter(activity => new Date(activity.timestamp) >= new Date(filters.startDate));
      }
      
      if (filters.endDate) {
        filtered = filtered.filter(activity => new Date(activity.timestamp) <= new Date(filters.endDate));
      }
      
      return {
        success: true,
        activities: filtered,
        total: filtered.length,
        filters: filters
      };
    } catch (error) {
      return { 
        success: false, 
        activities: [] 
      };
    }
  }
};

// ======================
// REFERRAL API
// ======================

export const referralAPI = {
  getReferrals: async () => {
    try {
      const user = JSON.parse(localStorage.getItem('current_user') || '{}');
      if (!user.id) return { success: false, referrals: [], totalReferrals: 0 };

      const response = await authFetch(`/api/referrals?userId=${user.id}&email=${encodeURIComponent(user.email || '')}`, {
        signal: AbortSignal.timeout(10000),
      });
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Referrals error:', error);
      return { success: false, referrals: [], totalReferrals: 0, message: 'Failed to load referrals' };
    }
  },

  getReferralLink: async () => {
    try {
      const user = JSON.parse(localStorage.getItem('current_user') || '{}');
      if (!user.id) return { success: false, code: '', link: '' };

      const response = await authFetch(`/api/referrals?userId=${user.id}&email=${encodeURIComponent(user.email || '')}`, {
        signal: AbortSignal.timeout(10000),
      });
      const data = await response.json();
      if (data.success) {
        const baseUrl = window.location.origin;
        return {
          success: true,
          code: data.code,
          link: `${baseUrl}/register?ref=${data.code}`,
        };
      }
      return { success: false, code: '', link: '' };
    } catch (error) {
      console.error('Referral link error:', error);
      return { success: false, code: '', link: '' };
    }
  },

  checkAdminReward: async () => {
    try {
      const user = JSON.parse(localStorage.getItem('current_user') || '{}');
      if (!user.id) return { success: false };

      const response = await authFetch(`/api/referrals/check-admin-reward?userId=${user.id}`, {
        signal: AbortSignal.timeout(10000),
      });
      return await response.json();
    } catch (error) {
      console.error('Admin reward check error:', error);
      return { success: false };
    }
  },
};

// ======================
// SERVER API
// ======================

export const serverAPI = {
  getServers: async () => {
    try {
      const user = JSON.parse(localStorage.getItem('current_user') || '{}');
      if (!user.panelId && !user.id) {
        return { success: true, servers: [], total: 0 };
      }
      const userId = user.panelId || user.id;
      const response = await authFetch(`/api/servers?userId=${encodeURIComponent(userId)}`, {
        signal: AbortSignal.timeout(15000),
      });
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Servers error:', error);
      return { success: false, servers: [], message: 'Failed to load servers' };
    }
  },

  createServer: async (serverData) => {
    try {
      const response = await authFetch('/api/servers/create', {
        method: 'POST',
        body: JSON.stringify(serverData),
        signal: AbortSignal.timeout(30000),
      });
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Create server error:', error);
      return { success: false, message: 'Failed to create server' };
    }
  },

  deleteServer: async (serverId) => {
    try {
      const user = JSON.parse(localStorage.getItem('current_user') || '{}');
      const userId = user.panelId || user.id;
      const userEmail = user.email || '';
      const params = new URLSearchParams({ userId, userEmail });
      const response = await authFetch(`/api/servers/${serverId}?${params}`, {
        method: 'DELETE',
        signal: AbortSignal.timeout(15000),
      });
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Delete server error:', error);
      return { success: false, message: 'Failed to delete server' };
    }
  },

  startServer: async (serverId) => {
    return { success: true, message: 'Use the Pterodactyl panel to start/stop servers' };
  },

  stopServer: async (serverId) => {
    return { success: true, message: 'Use the Pterodactyl panel to start/stop servers' };
  },

  restartServer: async (serverId) => {
    return { success: true, message: 'Use the Pterodactyl panel to restart servers' };
  },

  getServerMetrics: async (serverId) => {
    return { success: true, metrics: {} };
  },

  getServerTypes: async () => {
    return {
      success: true,
      types: [
        { id: 'Limited', name: 'Limited', cpu: 1, memory: 5, storage: 10, price: 50, description: '5GB RAM, Nest 5' },
        { id: 'Unlimited', name: 'Unlimited', cpu: 2, memory: 0, storage: 40, price: 100, description: 'Full RAM access, Nest 5' },
        { id: 'Admin', name: 'Admin', cpu: 4, memory: 0, storage: 80, price: 250, description: 'Admin panel, unlimited' },
      ],
    };
  },
};

// ======================
// WALLET API (MPESA FOCUSED)
// ======================

export const walletAPI = {
  // Record MPESA payment
  recordMpesaPayment: async (amount, phone, reference, description = 'MPESA deposit via STK Push') => {
    try {
      console.log(`💰 Recording MPESA Payment:`, {
        amount: amount,
        phone: phone,
        reference: reference,
        description: description
      });
      
      // Get existing transactions
      const transactions = JSON.parse(localStorage.getItem('mpesa_transactions') || '[]');
      
      const transaction = {
        id: 'MPESA_' + Date.now(),
        type: 'mpesa_deposit',
        amount: amount,
        phone: phone,
        reference: reference,
        status: 'completed',
        date: new Date().toISOString(),
        description: description,
        method: 'MPESA',
        currency: 'KES'
      };
      
      // Add new transaction
      transactions.push(transaction);
      localStorage.setItem('mpesa_transactions', JSON.stringify(transactions));
      
      // Update wallet balance
      const currentBalance = parseFloat(localStorage.getItem('wallet_balance') || '0');
      const newBalance = currentBalance + amount;
      localStorage.setItem('wallet_balance', newBalance.toString());
      
      // Update user wallet
      const userResponse = await authAPI.getUser();
      if (userResponse.success) {
        const updatedUser = {
          ...userResponse.user,
          wallet: newBalance
        };
        localStorage.setItem('current_user', JSON.stringify(updatedUser));
      }
      
      return {
        success: true,
        message: 'MPESA payment recorded successfully',
        transaction: transaction,
        newBalance: newBalance
      };
    } catch (error) {
      console.error('Error recording MPESA payment:', error);
      return {
        success: false,
        message: 'Failed to record payment'
      };
    }
  },

  getMpesaTransactions: async (filters = {}) => {
    try {
      let userEmail = '';
      try {
        const storedUser = localStorage.getItem('current_user');
        if (storedUser) {
          const u = JSON.parse(storedUser);
          userEmail = u.email || '';
        }
      } catch (e) {}

      const emailParam = userEmail ? `&email=${encodeURIComponent(userEmail)}` : '';
      const response = await authFetch(`/api/transactions?perPage=50&status=success${emailParam}`);
      const data = await response.json();

      if (!data.success) {
        return { success: true, transactions: [], summary: { total: 0, deposits: 0, withdrawals: 0, count: 0, average: 0 } };
      }

      const transactions = (data.transactions || []).map(txn => ({
        id: txn.id || txn.reference,
        type: 'mpesa_deposit',
        amount: txn.amount,
        phone: txn.phone,
        reference: txn.reference,
        status: txn.status === 'success' ? 'completed' : txn.status,
        date: txn.paidAt || txn.createdAt,
        description: txn.description || 'M-Pesa deposit',
        method: 'MPESA',
        currency: txn.currency || 'KES'
      }));

      const deposits = transactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);

      return {
        success: true,
        transactions,
        summary: {
          total: deposits,
          deposits,
          withdrawals: 0,
          count: transactions.length,
          average: transactions.length > 0 ? deposits / transactions.length : 0
        }
      };
    } catch (error) {
      console.error('Error fetching transactions from backend:', error);
      return { success: false, transactions: [], summary: {} };
    }
  },

  getBalance: async () => {
    try {
      let userEmail = '';
      try {
        const storedUser = localStorage.getItem('current_user');
        if (storedUser) {
          const u = JSON.parse(storedUser);
          userEmail = u.email || '';
        }
      } catch (e) {}

      const params = userEmail ? `?email=${encodeURIComponent(userEmail)}` : '';
      const response = await authFetch(`/api/transactions/totals${params}`);
      const data = await response.json();

      const balance = data.success ? data.balance : 0;
      const totalDeposits = data.success ? (data.totalDeposits || 0) : 0;
      const totalSpending = data.success ? (data.totalSpending || 0) : 0;

      return {
        success: true,
        balance,
        totalDeposits,
        totalSpending,
        currency: 'KES',
        formatted: `KES ${balance.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      };
    } catch (error) {
      console.error('Error fetching balance:', error);
      return {
        success: true,
        balance: 0,
        currency: 'KES',
        formatted: 'KES 0.00'
      };
    }
  },

  // Update balance (called after successful payment)
  updateBalance: async (amount, reference, phone = '') => {
    return walletAPI.recordMpesaPayment(amount, phone, reference);
  },

  getTransactions: async (limit = 50) => {
    try {
      let userEmail = '';
      try {
        const storedUser = localStorage.getItem('current_user');
        if (storedUser) {
          const u = JSON.parse(storedUser);
          userEmail = u.email || '';
        }
      } catch (e) {}

      const emailParam = userEmail ? `&email=${encodeURIComponent(userEmail)}` : '';
      const response = await authFetch(`/api/transactions?perPage=${limit}${emailParam}`);
      const data = await response.json();

      if (!data.success) {
        return { success: true, transactions: [], summary: { totalDeposits: 0, totalWithdrawals: 0, currentBalance: 0, depositCount: 0, withdrawalCount: 0 } };
      }

      const transactions = (data.transactions || []).map(txn => ({
        id: txn.id || txn.reference,
        type: txn.direction === 'debit' ? 'server_purchase' : txn.amount > 0 ? 'deposit' : 'withdrawal',
        amount: txn.direction === 'debit' ? -txn.amount : txn.amount,
        method: txn.method || 'M-Pesa',
        date: txn.paidAt || txn.createdAt,
        status: txn.status === 'success' ? 'completed' : txn.status,
        reference: txn.reference,
        description: txn.description || 'M-Pesa deposit',
        phone: txn.phone,
        last4: txn.last4 || '',
        currency: txn.currency || 'KES',
        direction: txn.direction || 'credit',
        channel: txn.channel || ''
      }));

      const deposits = transactions.filter(t => t.amount > 0);
      const totalDeposits = deposits.reduce((sum, t) => sum + t.amount, 0);

      const balanceParams = userEmail ? `?email=${encodeURIComponent(userEmail)}` : '';
      const balanceRes = await authFetch(`/api/transactions/totals${balanceParams}`);
      const balanceData = await balanceRes.json();
      const currentBalance = balanceData.success ? balanceData.balance : totalDeposits;

      return {
        success: true,
        transactions,
        summary: {
          totalDeposits,
          totalWithdrawals: 0,
          currentBalance,
          depositCount: deposits.length,
          withdrawalCount: 0,
          averageDeposit: deposits.length > 0 ? totalDeposits / deposits.length : 0,
          averageWithdrawal: 0
        }
      };
    } catch (error) {
      console.error('Error fetching transactions:', error);
      return { success: false, transactions: [], summary: {}, message: 'Failed to fetch transactions' };
    }
  },

  // Update invoice status
  updateInvoiceStatus: async (invoiceId, status) => {
    try {
      console.log(`📄 Mock updating invoice ${invoiceId} to ${status}`);
      await delay(API_DELAY);
      
      return {
        success: true,
        message: `Invoice ${invoiceId} marked as ${status}`
      };
    } catch (error) {
      console.error('Error updating invoice:', error);
      return { 
        success: false, 
        message: 'Failed to update invoice' 
      };
    }
  },

  // Withdraw funds
  withdraw: async (amount, method, phone = '', description = '') => {
    try {
      console.log(`🏧 Mock withdrawal: KES ${amount} via ${method}`, phone ? `to ${phone}` : '');
      await delay(API_DELAY * 2);
      
      // Get current balance
      const currentBalance = parseFloat(localStorage.getItem('wallet_balance') || '0');
      
      if (amount > currentBalance) {
        throw new Error('Insufficient balance');
      }
      
      if (amount <= 0) {
        throw new Error('Invalid amount');
      }
      
      // Update balance
      const newBalance = currentBalance - amount;
      localStorage.setItem('wallet_balance', newBalance.toString());
      
      // Record withdrawal transaction
      const transactions = JSON.parse(localStorage.getItem('mpesa_transactions') || '[]');
      const transaction = {
        id: 'WDR_' + Date.now(),
        type: 'withdrawal',
        amount: -amount,
        phone: phone,
        method: method,
        status: 'pending',
        date: new Date().toISOString(),
        description: description || `Withdrawal to ${method}`,
        currency: 'KES'
      };
      transactions.push(transaction);
      localStorage.setItem('mpesa_transactions', JSON.stringify(transactions));
      
      // Update user wallet
      const userResponse = await authAPI.getUser();
      if (userResponse.success) {
        const updatedUser = {
          ...userResponse.user,
          wallet: newBalance
        };
        localStorage.setItem('current_user', JSON.stringify(updatedUser));
      }
      
      // Simulate processing
      setTimeout(() => {
        transaction.status = 'completed';
        localStorage.setItem('mpesa_transactions', JSON.stringify(transactions));
      }, 5000);
      
      return {
        success: true,
        message: 'Withdrawal request submitted',
        transactionId: transaction.id,
        newBalance: newBalance,
        estimatedCompletion: new Date(Date.now() + 300000).toISOString() // 5 minutes
      };
    } catch (error) {
      console.error('Withdrawal error:', error);
      return { 
        success: false, 
        message: error.message || 'Withdrawal failed' 
      };
    }
  },

  // Get MPESA withdrawal history
  getWithdrawals: async () => {
    try {
      const transactions = JSON.parse(localStorage.getItem('mpesa_transactions') || '[]');
      const withdrawals = transactions.filter(t => t.type === 'withdrawal');
      
      const pending = withdrawals.filter(w => w.status === 'pending');
      const completed = withdrawals.filter(w => w.status === 'completed');
      const failed = withdrawals.filter(w => w.status === 'failed');
      
      return {
        success: true,
        withdrawals: withdrawals,
        summary: {
          totalWithdrawn: Math.abs(completed.reduce((sum, t) => sum + t.amount, 0)),
          pendingAmount: Math.abs(pending.reduce((sum, t) => sum + t.amount, 0)),
          pendingCount: pending.length,
          completedCount: completed.length,
          failedCount: failed.length
        }
      };
    } catch (error) {
      return {
        success: false,
        withdrawals: [],
        summary: {}
      };
    }
  },

  // Get withdrawal methods
  getWithdrawalMethods: async () => {
    try {
      return {
        success: true,
        methods: [
          { 
            id: 'mpesa', 
            name: 'MPESA', 
            description: 'Withdraw to your MPESA wallet',
            minAmount: 10,
            maxAmount: 70000,
            fee: 0,
            processingTime: 'Instant - 5 minutes',
            icon: '📱'
          },
          { 
            id: 'bank', 
            name: 'Bank Transfer', 
            description: 'Transfer to your bank account',
            minAmount: 100,
            maxAmount: 1000000,
            fee: 50,
            processingTime: '1-2 business days',
            icon: '🏦'
          }
        ]
      };
    } catch (error) {
      return { 
        success: false, 
        methods: [] 
      };
    }
  },

  getWalletSummary: async () => {
    try {
      const [totalsRes, txnRes] = await Promise.all([
        authFetch(`/api/transactions/totals`),
        authFetch(`/api/transactions?perPage=50&status=success`)
      ]);
      const totalsData = await totalsRes.json();
      const txnData = await txnRes.json();

      const balance = totalsData.success ? totalsData.balance : 0;
      const transactions = txnData.success ? txnData.transactions : [];
      const lastDeposit = transactions.length > 0 ? (transactions[0].paidAt || transactions[0].createdAt) : null;

      return {
        success: true,
        summary: {
          currentBalance: balance,
          availableBalance: balance,
          totalDeposits: totalsData.success ? totalsData.totalDeposits : 0,
          totalWithdrawals: 0,
          pendingWithdrawals: 0,
          thisMonthDeposits: 0,
          lastDepositDate: lastDeposit,
          currency: 'KES'
        }
      };
    } catch (error) {
      console.error('Error fetching wallet summary:', error);
      return { success: false, summary: {} };
    }
  }
};

// ======================
// SETTINGS API
// ======================

export const settingsAPI = {
  updateProfile: async (profileData) => {
    try {
      console.log('👤 Mock update profile:', profileData);
      await delay(API_DELAY);
      
      const currentUserResponse = await authAPI.getUser();
      if (!currentUserResponse.success) {
        throw new Error('User not found');
      }
      
      const updatedUser = {
        ...currentUserResponse.user,
        ...profileData,
        updatedAt: new Date().toISOString()
      };
      
      localStorage.setItem('current_user', JSON.stringify(updatedUser));
      
      return {
        success: true,
        user: updatedUser,
        message: 'Profile updated successfully'
      };
    } catch (error) {
      console.error('Update profile error:', error);
      return { 
        success: false, 
        message: error.message || 'Failed to update profile' 
      };
    }
  },

  updatePassword: async (passwordData) => {
    try {
      console.log('🔑 Mock update password');
      await delay(API_DELAY);
      
      if (passwordData.newPassword.length < 6) {
        throw new Error('Password must be at least 6 characters');
      }
      
      if (passwordData.newPassword !== passwordData.confirmPassword) {
        throw new Error('Passwords do not match');
      }
      
      return {
        success: true,
        message: 'Password updated successfully'
      };
    } catch (error) {
      console.error('Update password error:', error);
      return { 
        success: false, 
        message: error.message || 'Failed to update password' 
      };
    }
  },

  getNotifications: async () => {
    try {
      await delay(API_DELAY);
      
      // Get from localStorage or default
      const storedNotifications = localStorage.getItem('notifications');
      const notifications = storedNotifications ? JSON.parse(storedNotifications) : [
        { 
          id: '1', 
          type: 'info', 
          title: 'MPESA Integration', 
          message: 'MPESA payments are now live! Top up your wallet easily.',
          read: false, 
          timestamp: '2024-03-12T09:00:00Z',
          priority: 'high'
        },
        { 
          id: '2', 
          type: 'success', 
          title: 'Payment Received', 
          message: 'Your MPESA deposit of KES 2,500 was successful',
          read: true, 
          timestamp: '2024-03-11T14:30:00Z',
          priority: 'medium'
        },
        { 
          id: '3', 
          type: 'warning', 
          title: 'Server Maintenance', 
          message: 'Scheduled maintenance on March 15th, 2:00 AM - 4:00 AM',
          read: false, 
          timestamp: '2024-03-10T10:00:00Z',
          priority: 'medium'
        },
        { 
          id: '4', 
          type: 'info', 
          title: 'New Feature', 
          message: 'Try our new server monitoring dashboard',
          read: true, 
          timestamp: '2024-03-05T16:15:00Z',
          priority: 'low'
        }
      ];
      
      const unreadCount = notifications.filter(n => !n.read).length;
      
      return {
        success: true,
        notifications: notifications,
        unreadCount: unreadCount,
        total: notifications.length
      };
    } catch (error) {
      console.error('Notifications error:', error);
      return { 
        success: false, 
        notifications: [],
        unreadCount: 0
      };
    }
  },

  markNotificationAsRead: async (notificationId) => {
    try {
      const response = await settingsAPI.getNotifications();
      const notifications = response.notifications;
      
      const index = notifications.findIndex(n => n.id === notificationId);
      if (index !== -1) {
        notifications[index].read = true;
        localStorage.setItem('notifications', JSON.stringify(notifications));
      }
      
      return {
        success: true,
        message: 'Notification marked as read'
      };
    } catch (error) {
      return { 
        success: false, 
        message: 'Failed to update notification' 
      };
    }
  },

  markAllNotificationsAsRead: async () => {
    try {
      const response = await settingsAPI.getNotifications();
      const notifications = response.notifications.map(n => ({ ...n, read: true }));
      
      localStorage.setItem('notifications', JSON.stringify(notifications));
      
      return {
        success: true,
        message: 'All notifications marked as read'
      };
    } catch (error) {
      return { 
        success: false, 
        message: 'Failed to update notifications' 
      };
    }
  },

  getPreferences: async () => {
    try {
      const preferences = JSON.parse(localStorage.getItem('user_preferences') || '{}');
      
      const defaultPreferences = {
        theme: 'light',
        notifications: true,
        emailNotifications: true,
        smsNotifications: false,
        currency: 'KES',
        language: 'en',
        timezone: 'Africa/Nairobi',
        twoFactorAuth: false,
        autoPay: false,
        dataRefreshRate: 30
      };
      
      return {
        success: true,
        preferences: { ...defaultPreferences, ...preferences }
      };
    } catch (error) {
      return { 
        success: false, 
        preferences: {} 
      };
    }
  },

  updatePreferences: async (preferences) => {
    try {
      console.log('⚙️ Mock update preferences:', preferences);
      
      const currentPreferences = await settingsAPI.getPreferences();
      const updatedPreferences = {
        ...currentPreferences.preferences,
        ...preferences,
        updatedAt: new Date().toISOString()
      };
      
      localStorage.setItem('user_preferences', JSON.stringify(updatedPreferences));
      
      return {
        success: true,
        preferences: updatedPreferences,
        message: 'Preferences updated successfully'
      };
    } catch (error) {
      return { 
        success: false, 
        message: 'Failed to update preferences' 
      };
    }
  },

  enableTwoFactor: async () => {
    try {
      await delay(API_DELAY);
      
      const currentUserResponse = await authAPI.getUser();
      const currentUser = currentUserResponse.user;
      
      const updatedUser = {
        ...currentUser,
        twoFactorEnabled: true,
        twoFactorEnabledAt: new Date().toISOString()
      };
      
      localStorage.setItem('current_user', JSON.stringify(updatedUser));
      
      return {
        success: true,
        message: 'Two-factor authentication enabled',
        backupCodes: ['123456', '234567', '345678', '456789', '567890']
      };
    } catch (error) {
      return { 
        success: false, 
        message: 'Failed to enable two-factor authentication' 
      };
    }
  },

  disableTwoFactor: async () => {
    try {
      await delay(API_DELAY);
      
      const currentUserResponse = await authAPI.getUser();
      const currentUser = currentUserResponse.user;
      
      const updatedUser = {
        ...currentUser,
        twoFactorEnabled: false
      };
      
      localStorage.setItem('current_user', JSON.stringify(updatedUser));
      
      return {
        success: true,
        message: 'Two-factor authentication disabled'
      };
    } catch (error) {
      return { 
        success: false, 
        message: 'Failed to disable two-factor authentication' 
      };
    }
  },

  getSecurityLogs: async () => {
    try {
      await delay(API_DELAY);
      
      return {
        success: true,
        logs: [
          { 
            id: '1', 
            action: 'login', 
            ip: '192.168.1.1', 
            location: 'Nairobi, Kenya',
            device: 'Chrome on Windows',
            timestamp: '2024-03-12T14:30:00Z',
            status: 'success'
          },
          { 
            id: '2', 
            action: 'password_change', 
            ip: '192.168.1.1', 
            location: 'Nairobi, Kenya',
            device: 'Chrome on Windows',
            timestamp: '2024-03-10T09:15:00Z',
            status: 'success'
          },
          { 
            id: '3', 
            action: 'login', 
            ip: '41.90.12.34', 
            location: 'Mombasa, Kenya',
            device: 'Safari on iPhone',
            timestamp: '2024-03-08T20:45:00Z',
            status: 'success'
          }
        ]
      };
    } catch (error) {
      return { 
        success: false, 
        logs: [] 
      };
    }
  }
};

// ======================
// BILLING API (KES FOCUSED)
// ======================

export const billingAPI = {
  getInvoices: async () => {
    try {
      await delay(API_DELAY);
      
      // Get balance for invoice amounts
      const balance = parseFloat(localStorage.getItem('wallet_balance') || '0');
      
      return {
        success: true,
        invoices: [
          { 
            id: 'INV-001', 
            date: '2024-03-01', 
            amount: 1250.00,
            status: 'paid', 
            description: 'Pro Server - Production',
            dueDate: '2024-03-01',
            paidDate: '2024-03-01',
            paymentMethod: 'Wallet',
            currency: 'KES'
          },
          { 
            id: 'INV-002', 
            date: '2024-03-01', 
            amount: 500.00,
            status: 'paid', 
            description: 'Basic Server - Development',
            dueDate: '2024-03-01',
            paidDate: '2024-03-01',
            paymentMethod: 'Wallet',
            currency: 'KES'
          },
          { 
            id: 'INV-003', 
            date: '2024-04-01', 
            amount: 1250.00,
            status: balance >= 1250 ? 'paid' : 'pending', 
            description: 'Pro Server - Production',
            dueDate: '2024-04-05',
            paidDate: balance >= 1250 ? '2024-03-15' : null,
            paymentMethod: balance >= 1250 ? 'MPESA' : null,
            currency: 'KES'
          },
          { 
            id: 'INV-004', 
            date: '2024-04-01', 
            amount: 2500.00,
            status: balance >= 2500 ? 'paid' : 'pending', 
            description: 'Enterprise Server - Database',
            dueDate: '2024-04-05',
            paidDate: balance >= 2500 ? '2024-03-15' : null,
            paymentMethod: balance >= 2500 ? 'MPESA' : null,
            currency: 'KES'
          },
        ],
        summary: {
          total: 5500.00,
          paid: balance >= 3750 ? 3750.00 : 1750.00,
          pending: balance >= 3750 ? 1750.00 : 3750.00,
          overdue: 0,
          currency: 'KES'
        }
      };
    } catch (error) {
      console.error('Invoices error:', error);
      return { 
        success: false, 
        invoices: [],
        summary: {}
      };
    }
  },

  payInvoice: async (invoiceId, amount, phone = '', method = 'MPESA') => {
    try {
      console.log('💳 Mock paying invoice:', invoiceId, 'Amount:', amount, 'Phone:', phone, 'Method:', method);
      await delay(API_DELAY * 2);
      
      // Check if enough balance for wallet payment
      if (method === 'wallet') {
        const balanceResponse = await walletAPI.getBalance();
        if (balanceResponse.balance < amount) {
          throw new Error('Insufficient wallet balance');
        }
      }
      
      // Record payment
      if (method === 'MPESA' && phone) {
        await walletAPI.recordMpesaPayment(amount, phone, `INV_${invoiceId}`, `Payment for invoice ${invoiceId}`);
      } else if (method === 'wallet') {
        // Deduct from wallet
        const currentBalance = parseFloat(localStorage.getItem('wallet_balance') || '0');
        const newBalance = currentBalance - amount;
        localStorage.setItem('wallet_balance', newBalance.toString());
        
        // Record transaction
        const transactions = JSON.parse(localStorage.getItem('mpesa_transactions') || '[]');
        transactions.push({
          id: 'INVPAY_' + Date.now(),
          type: 'invoice_payment',
          amount: -amount,
          reference: `INV_${invoiceId}`,
          status: 'completed',
          date: new Date().toISOString(),
          description: `Payment for invoice ${invoiceId}`,
          method: 'Wallet',
          currency: 'KES'
        });
        localStorage.setItem('mpesa_transactions', JSON.stringify(transactions));
      }
      
      return {
        success: true,
        message: `Invoice ${invoiceId} paid successfully via ${method}`,
        invoiceId: invoiceId,
        amount: amount,
        paymentMethod: method
      };
    } catch (error) {
      console.error('Pay invoice error:', error);
      return { 
        success: false, 
        message: error.message || 'Failed to pay invoice' 
      };
    }
  },

  // Get billing summary
  getBillingSummary: async () => {
    try {
      const balance = parseFloat(localStorage.getItem('wallet_balance') || '0');
      const transactions = JSON.parse(localStorage.getItem('mpesa_transactions') || '[]');
      const mpesaTotal = transactions
        .filter(txn => txn.amount > 0)
        .reduce((sum, txn) => sum + txn.amount, 0);
      
      const invoicesResponse = await billingAPI.getInvoices();
      
      return {
        success: true,
        summary: {
          currentBalance: balance,
          totalDeposits: mpesaTotal,
          totalWithdrawals: 0,
          pendingInvoices: invoicesResponse.summary.pending,
          nextBillingDate: '2024-04-05',
          autoPayEnabled: false,
          monthlySpending: 1750.00,
          projectedNextMonth: 2000.00,
          currency: 'KES'
        }
      };
    } catch (error) {
      return {
        success: false,
        summary: {}
      };
    }
  },

  // Get payment methods
  getPaymentMethods: async () => {
    try {
      await delay(API_DELAY);
      
      return {
        success: true,
        methods: [
          {
            id: 'mpesa',
            name: 'MPESA',
            type: 'mobile',
            lastFour: '6789',
            isDefault: true,
            added: '2024-01-15'
          },
          {
            id: 'wallet',
            name: 'Wallet Balance',
            type: 'wallet',
            balance: parseFloat(localStorage.getItem('wallet_balance') || '0'),
            isDefault: false,
            added: '2024-01-01'
          }
        ]
      };
    } catch (error) {
      return { 
        success: false, 
        methods: [] 
      };
    }
  },

  // Get billing history
  getBillingHistory: async () => {
    try {
      const transactions = await walletAPI.getTransactions();
      const invoices = await billingAPI.getInvoices();
      
      // Combine transactions and invoices
      const history = [
        ...transactions.transactions.map(t => ({
          ...t,
          itemType: 'transaction'
        })),
        ...invoices.invoices.map(i => ({
          id: i.id,
          type: 'invoice',
          amount: -i.amount,
          method: i.paymentMethod || 'Pending',
          date: i.paidDate || i.dueDate,
          status: i.status,
          reference: i.id,
          description: i.description,
          itemType: 'invoice',
          currency: 'KES'
        }))
      ].sort((a, b) => new Date(b.date) - new Date(a.date));
      
      return {
        success: true,
        history: history.slice(0, 20),
        total: history.length
      };
    } catch (error) {
      return { 
        success: false, 
        history: [] 
      };
    }
  },

  // Download invoice
  downloadInvoice: async (invoiceId) => {
    try {
      console.log('📥 Mock downloading invoice:', invoiceId);
      await delay(API_DELAY * 2);
      
      // In a real app, this would generate/download a PDF
      // For mock, return a blob URL
      const invoiceData = `Invoice: ${invoiceId}\nAmount: KES 1,250.00\nStatus: Paid\nDate: 2024-03-01`;
      const blob = new Blob([invoiceData], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      
      return {
        success: true,
        url: url,
        filename: `invoice-${invoiceId}.txt`
      };
    } catch (error) {
      return { 
        success: false, 
        message: 'Failed to download invoice' 
      };
    }
  }
};

// ======================
// MPESA SPECIFIC API
// ======================

export const mpesaAPI = {
  // Initiate STK Push
  stkPush: async (phone, amount, description = 'Wallet top-up') => {
    try {
      console.log('📲 Mock STK Push:', { phone, amount, description });
      await delay(API_DELAY * 3); // Simulate MPESA delay
      
      // Validate phone number (Kenyan format)
      const phoneRegex = /^(?:254|\+254|0)?(7\d{8})$/;
      if (!phoneRegex.test(phone)) {
        throw new Error('Please enter a valid Kenyan phone number');
      }
      
      // Validate amount
      if (amount < 10) {
        throw new Error('Minimum amount is KES 10');
      }
      
      if (amount > 70000) {
        throw new Error('Maximum amount is KES 70,000');
      }
      
      // Simulate successful STK Push
      const reference = 'MPESA_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      
      // Store pending transaction
      const pendingTransactions = JSON.parse(localStorage.getItem('pending_mpesa') || '[]');
      pendingTransactions.push({
        phone: phone,
        amount: amount,
        reference: reference,
        description: description,
        initiated: new Date().toISOString(),
        status: 'pending'
      });
      localStorage.setItem('pending_mpesa', JSON.stringify(pendingTransactions));
      
      // Simulate payment completion after delay
      setTimeout(async () => {
        // 90% success rate for demo
        const success = Math.random() < 0.9;
        
        if (success) {
          await walletAPI.recordMpesaPayment(amount, phone, reference, description);
          
          // Remove from pending
          const updatedPending = pendingTransactions.filter(p => p.reference !== reference);
          localStorage.setItem('pending_mpesa', JSON.stringify(updatedPending));
          
          console.log(`✅ Mock MPESA payment completed: ${reference}`);
        }
      }, 10000); // 10 seconds
      
      return {
        success: true,
        message: 'STK Push initiated. Please check your phone to enter PIN.',
        reference: reference,
        checkoutRequestID: reference,
        merchantRequestID: 'MR_' + reference,
        instructions: 'You will receive an MPESA prompt on your phone. Enter your PIN to complete the payment.'
      };
    } catch (error) {
      console.error('STK Push error:', error);
      return {
        success: false,
        message: error.message || 'Failed to initiate STK Push. Please try again.'
      };
    }
  },

  // Query transaction status
  queryTransaction: async (reference) => {
    try {
      console.log('🔍 Mock query transaction:', reference);
      await delay(API_DELAY);
      
      // Check if transaction exists in localStorage (completed)
      const transactions = JSON.parse(localStorage.getItem('mpesa_transactions') || '[]');
      const transaction = transactions.find(t => t.reference === reference);
      
      if (transaction) {
        return {
          success: true,
          status: 'completed',
          transaction: transaction,
          message: 'Transaction completed successfully'
        };
      }
      
      // Check pending transactions
      const pendingTransactions = JSON.parse(localStorage.getItem('pending_mpesa') || '[]');
      const pending = pendingTransactions.find(p => p.reference === reference);
      
      if (pending) {
        // Simulate different states
        const timeSince = Date.now() - new Date(pending.initiated).getTime();
        let status = 'pending';
        let message = 'Waiting for payment confirmation';
        
        if (timeSince > 30000) { // 30 seconds
          status = 'failed';
          message = 'Payment timeout. Please try again.';
        } else if (timeSince > 15000) { // 15 seconds
          status = 'processing';
          message = 'Processing your payment...';
        }
        
        return {
          success: true,
          status: status,
          transaction: pending,
          message: message
        };
      }
      
      return {
        success: false,
        status: 'not_found',
        message: 'Transaction not found'
      };
    } catch (error) {
      return {
        success: false,
        status: 'error',
        message: 'Failed to query transaction'
      };
    }
  },

  // Get MPESA transaction history
  getTransactionHistory: async (filters = {}) => {
    try {
      const transactions = JSON.parse(localStorage.getItem('mpesa_transactions') || '[]');
      
      let filteredTransactions = transactions;
      
      if (filters.phone) {
        filteredTransactions = transactions.filter(t => t.phone === filters.phone);
      }
      
      if (filters.type) {
        filteredTransactions = transactions.filter(t => t.type === filters.type);
      }
      
      if (filters.startDate) {
        filteredTransactions = transactions.filter(t => new Date(t.date) >= new Date(filters.startDate));
      }
      
      if (filters.endDate) {
        filteredTransactions = transactions.filter(t => new Date(t.date) <= new Date(filters.endDate));
      }
      
      if (filters.status) {
        filteredTransactions = transactions.filter(t => t.status === filters.status);
      }
      
      // Sort by date (newest first)
      filteredTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));
      
      // Calculate totals
      const totals = filteredTransactions.reduce((acc, txn) => {
        if (txn.amount > 0) {
          acc.deposits += txn.amount;
        } else {
          acc.withdrawals += Math.abs(txn.amount);
        }
        acc.total += txn.amount;
        return acc;
      }, { deposits: 0, withdrawals: 0, total: 0 });
      
      return {
        success: true,
        transactions: filteredTransactions,
        summary: {
          totalCount: filteredTransactions.length,
          totalAmount: totals.total,
          totalDeposits: totals.deposits,
          totalWithdrawals: totals.withdrawals,
          averageTransaction: filteredTransactions.length > 0 ? totals.total / filteredTransactions.length : 0
        },
        filters: filters
      };
    } catch (error) {
      return {
        success: false,
        transactions: [],
        summary: {}
      };
    }
  },

  // Get MPESA charges
  getCharges: async (amount) => {
    try {
      // MPESA charges structure (approximate)
      let charge = 0;
      
      if (amount <= 100) charge = 0;
      else if (amount <= 500) charge = 5;
      else if (amount <= 1000) charge = 10;
      else if (amount <= 1500) charge = 15;
      else if (amount <= 2500) charge = 25;
      else if (amount <= 3500) charge = 35;
      else if (amount <= 5000) charge = 45;
      else if (amount <= 7500) charge = 60;
      else if (amount <= 10000) charge = 75;
      else if (amount <= 15000) charge = 85;
      else if (amount <= 20000) charge = 95;
      else charge = amount * 0.005; // 0.5% for amounts above 20,000
      
      const total = amount + charge;
      
      return {
        success: true,
        amount: amount,
        charge: charge,
        total: total,
        breakdown: {
          amount: amount,
          transactionFee: charge,
          total: total
        },
        note: 'Charges are estimates and may vary slightly'
      };
    } catch (error) {
      return {
        success: false,
        amount: amount,
        charge: 0,
        total: amount
      };
    }
  },

  // Get supported phone companies
  getSupportedNetworks: async () => {
    try {
      return {
        success: true,
        networks: [
          { id: 'safaricom', name: 'Safaricom', icon: '📱', supported: true },
          { id: 'airtel', name: 'Airtel Kenya', icon: '📶', supported: true },
          { id: 'telkom', name: 'Telkom Kenya', icon: '📞', supported: false }
        ]
      };
    } catch (error) {
      return { 
        success: false, 
        networks: [] 
      };
    }
  },

  // Get transaction limits
  getLimits: async () => {
    try {
      return {
        success: true,
        limits: {
          minDeposit: 10,
          maxDeposit: 70000,
          minWithdrawal: 10,
          maxWithdrawal: 70000,
          dailyLimit: 150000,
          transactionCountLimit: 10,
          currency: 'KES'
        }
      };
    } catch (error) {
      return { 
        success: false, 
        limits: {} 
      };
    }
  }
};

// ======================
// SUPPORT API
// ======================

export const supportAPI = {
  // Get support tickets
  getTickets: async () => {
    try {
      await delay(API_DELAY);
      
      const storedTickets = localStorage.getItem('support_tickets');
      const tickets = storedTickets ? JSON.parse(storedTickets) : [
        {
          id: 'TICKET-001',
          subject: 'MPESA Payment Issue',
          description: 'My MPESA payment is not reflecting in my wallet',
          status: 'open',
          priority: 'high',
          category: 'billing',
          createdAt: '2024-03-12T10:30:00Z',
          updatedAt: '2024-03-12T10:30:00Z',
          lastMessage: 'Waiting for support response'
        },
        {
          id: 'TICKET-002',
          subject: 'Server Configuration Help',
          description: 'Need help setting up my new server',
          status: 'resolved',
          priority: 'medium',
          category: 'servers',
          createdAt: '2024-03-10T14:15:00Z',
          updatedAt: '2024-03-11T09:45:00Z',
          lastMessage: 'Issue resolved by support team'
        }
      ];
      
      return {
        success: true,
        tickets: tickets,
        summary: {
          open: tickets.filter(t => t.status === 'open').length,
          inProgress: tickets.filter(t => t.status === 'in_progress').length,
          resolved: tickets.filter(t => t.status === 'resolved').length,
          total: tickets.length
        }
      };
    } catch (error) {
      return { 
        success: false, 
        tickets: [] 
      };
    }
  },

  // Create support ticket
  createTicket: async (ticketData) => {
    try {
      console.log('🎫 Mock creating support ticket:', ticketData);
      await delay(API_DELAY);
      
      const newTicket = {
        id: 'TICKET-' + Date.now(),
        subject: ticketData.subject,
        description: ticketData.description,
        status: 'open',
        priority: ticketData.priority || 'medium',
        category: ticketData.category || 'general',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastMessage: 'Ticket created, waiting for support response'
      };
      
      const response = await supportAPI.getTickets();
      const tickets = response.tickets;
      tickets.push(newTicket);
      
      localStorage.setItem('support_tickets', JSON.stringify(tickets));
      
      return {
        success: true,
        ticket: newTicket,
        message: 'Support ticket created successfully'
      };
    } catch (error) {
      return { 
        success: false, 
        message: 'Failed to create support ticket' 
      };
    }
  },

  // Get ticket messages
  getTicketMessages: async (ticketId) => {
    try {
      await delay(API_DELAY);
      
      const storedMessages = localStorage.getItem(`ticket_messages_${ticketId}`);
      const messages = storedMessages ? JSON.parse(storedMessages) : [
        {
          id: '1',
          ticketId: ticketId,
          sender: 'user',
          message: 'Hello, I need help with my MPESA payment',
          timestamp: '2024-03-12T10:30:00Z'
        },
        {
          id: '2',
          ticketId: ticketId,
          sender: 'support',
          message: 'Hello! We\'re looking into your MPESA payment issue. Can you share the transaction reference?',
          timestamp: '2024-03-12T11:15:00Z'
        }
      ];
      
      return {
        success: true,
        messages: messages,
        ticketId: ticketId
      };
    } catch (error) {
      return { 
        success: false, 
        messages: [] 
      };
    }
  },

  // Send message to ticket
  sendMessage: async (ticketId, message) => {
    try {
      console.log('💬 Mock sending message to ticket:', ticketId);
      await delay(API_DELAY);
      
      const response = await supportAPI.getTicketMessages(ticketId);
      const messages = response.messages;
      
      const newMessage = {
        id: Date.now().toString(),
        ticketId: ticketId,
        sender: 'user',
        message: message,
        timestamp: new Date().toISOString()
      };
      
      messages.push(newMessage);
      localStorage.setItem(`ticket_messages_${ticketId}`, JSON.stringify(messages));
      
      // Update ticket last message and timestamp
      const ticketsResponse = await supportAPI.getTickets();
      const tickets = ticketsResponse.tickets;
      const ticketIndex = tickets.findIndex(t => t.id === ticketId);
      
      if (ticketIndex !== -1) {
        tickets[ticketIndex].updatedAt = new Date().toISOString();
        tickets[ticketIndex].lastMessage = 'New message from user';
        localStorage.setItem('support_tickets', JSON.stringify(tickets));
      }
      
      return {
        success: true,
        message: newMessage,
        ticketId: ticketId
      };
    } catch (error) {
      return { 
        success: false, 
        message: 'Failed to send message' 
      };
    }
  },

  // Get FAQ categories
  getFAQs: async () => {
    try {
      await delay(API_DELAY);
      
      return {
        success: true,
        categories: [
          {
            id: 'billing',
            name: 'Billing & Payments',
            faqs: [
              {
                id: '1',
                question: 'How do I top up my wallet using MPESA?',
                answer: 'Go to the Wallet page, click "Deposit", select MPESA, enter amount and phone number, then confirm. You\'ll receive an MPESA prompt on your phone.'
              },
              {
                id: '2',
                question: 'What are the MPESA charges?',
                answer: 'MPESA charges vary based on amount. We show you the exact charges before you confirm any payment.'
              }
            ]
          },
          {
            id: 'servers',
            name: 'Servers & Hosting',
            faqs: [
              {
                id: '3',
                question: 'How do I create a new server?',
                answer: 'Go to Servers page, click "Create Server", choose your configuration, and confirm. Your server will be ready in a few minutes.'
              }
            ]
          }
        ]
      };
    } catch (error) {
      return { 
        success: false, 
        categories: [] 
      };
    }
  }
};

// ======================
// EXPORT ALL APIs
// ======================

// Default export for backward compatibility
export default {
  authAPI,
  statsAPI,
  activityAPI,
  referralAPI,
  serverAPI,
  walletAPI,
  settingsAPI,
  billingAPI,
  mpesaAPI,
  supportAPI,
  
  // For backward compatibility
  API_BASE_URL,
  
  // Utility function to reset all mock data
  resetMockData: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('mpesa_transactions');
      localStorage.removeItem('wallet_balance');
      localStorage.removeItem('current_user');
      localStorage.removeItem('auth_token');
      localStorage.removeItem('servers');
      localStorage.removeItem('referral_code');
      localStorage.removeItem('notifications');
      localStorage.removeItem('support_tickets');
      localStorage.removeItem('user_preferences');
      localStorage.removeItem('pending_mpesa');
      
      // Reinitialize
      initializeLocalStorage();
      
      console.log('✅ Mock data reset successfully');
      return { success: true, message: 'Mock data reset' };
    }
    return { success: false, message: 'Not in browser environment' };
  },
  
  // Utility function to export all data
  exportData: () => {
    if (typeof window !== 'undefined') {
      const data = {
        mpesa_transactions: JSON.parse(localStorage.getItem('mpesa_transactions') || '[]'),
        wallet_balance: localStorage.getItem('wallet_balance'),
        current_user: JSON.parse(localStorage.getItem('current_user') || 'null'),
        servers: JSON.parse(localStorage.getItem('servers') || '[]'),
        notifications: JSON.parse(localStorage.getItem('notifications') || '[]'),
        support_tickets: JSON.parse(localStorage.getItem('support_tickets') || '[]'),
        user_preferences: JSON.parse(localStorage.getItem('user_preferences') || '{}')
      };
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      return {
        success: true,
        url: url,
        filename: `neonhost-backup-${new Date().toISOString().split('T')[0]}.json`,
        data: data
      };
    }
    return { success: false, message: 'Not in browser environment' };
  },
  
  // Utility function to import data
  importData: (data) => {
    if (typeof window !== 'undefined' && data) {
      try {
        if (data.mpesa_transactions) localStorage.setItem('mpesa_transactions', JSON.stringify(data.mpesa_transactions));
        if (data.wallet_balance) localStorage.setItem('wallet_balance', data.wallet_balance);
        if (data.current_user) localStorage.setItem('current_user', JSON.stringify(data.current_user));
        if (data.servers) localStorage.setItem('servers', JSON.stringify(data.servers));
        if (data.notifications) localStorage.setItem('notifications', JSON.stringify(data.notifications));
        if (data.support_tickets) localStorage.setItem('support_tickets', JSON.stringify(data.support_tickets));
        if (data.user_preferences) localStorage.setItem('user_preferences', JSON.stringify(data.user_preferences));
        
        return { success: true, message: 'Data imported successfully' };
      } catch (error) {
        return { success: false, message: 'Failed to import data' };
      }
    }
    return { success: false, message: 'No data provided or not in browser environment' };
  }
};