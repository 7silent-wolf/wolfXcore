import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';
import { getCountryByCode, DEFAULT_COUNTRY } from '../lib/currencyConfig';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const getUserCountryKey = (userId) => `user_country_${userId}`;

  const loadUserCountry = (userId) => {
    if (!userId) return DEFAULT_COUNTRY;
    const perUser = localStorage.getItem(getUserCountryKey(userId));
    if (perUser) return perUser;
    const legacy = localStorage.getItem('user_country');
    if (legacy) {
      localStorage.setItem(getUserCountryKey(userId), legacy);
      return legacy;
    }
    return DEFAULT_COUNTRY;
  };

  const checkAuth = async () => {
    try {
      const result = await authAPI.getUser();
      if (result.success) {
        const userId = result.user.id || result.user.pterodactyl_id || result.user.username;
        const savedCountry = loadUserCountry(userId);
        setUser({ ...result.user, countryCode: savedCountry, country: savedCountry });
      }
    } catch (err) {
      console.error('Auth check failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const login = async (credentials) => {
    setError(null);
    try {
      const result = await authAPI.login(credentials);
      if (result.success) {
        const userId = result.user.id || result.user.pterodactyl_id || result.user.username;
        const savedCountry = loadUserCountry(userId);
        setUser({ ...result.user, countryCode: savedCountry, country: savedCountry });
        return { success: true };
      } else {
        setError(result.error);
        return { success: false, error: result.error };
      }
    } catch (err) {
      const errorMsg = 'Login failed. Please try again.';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  const register = async (userData) => {
    setError(null);
    try {
      const result = await authAPI.register(userData);
      if (result.success) {
        const userId = result.user.id || result.user.pterodactyl_id || result.user.username;
        const savedCountry = loadUserCountry(userId);
        setUser({ ...result.user, countryCode: savedCountry, country: savedCountry });
        return { success: true };
      } else {
        setError(result.error);
        return { success: false, error: result.error };
      }
    } catch (err) {
      const errorMsg = 'Registration failed. Please try again.';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  const logout = async () => {
    await authAPI.logout();
    setUser(null);
  };

  const updateUser = async (updates) => {
    try {
      const result = await authAPI.updateUser(updates);
      if (result.success) {
        setUser(result.user);
        return { success: true };
      }
      return { success: false, error: result.error };
    } catch (err) {
      return { success: false, error: 'Update failed' };
    }
  };

  const setCountry = (countryCode) => {
    const userId = user?.id || user?.pterodactyl_id || user?.username;
    if (userId) {
      localStorage.setItem(getUserCountryKey(userId), countryCode);
    }
    localStorage.setItem('user_country', countryCode);
    const updatedUser = { ...user, countryCode, country: countryCode };
    setUser(updatedUser);
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('current_user');
      if (stored) {
        const parsed = JSON.parse(stored);
        parsed.countryCode = countryCode;
        parsed.country = countryCode;
        localStorage.setItem('current_user', JSON.stringify(parsed));
      }
    }
  };

  const value = {
    user,
    loading,
    error,
    login,
    register,
    logout,
    updateUser,
    setCountry,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
