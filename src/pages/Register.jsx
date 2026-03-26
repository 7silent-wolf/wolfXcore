import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, UserPlus, AlertCircle, CheckCircle, Zap, Globe, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { COUNTRIES } from '../lib/currencyConfig';
import NeonBackground from '../components/NeonBackground';
import LoadingSpinner from '../components/LoadingSpinner';

const Register = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { register, setCountry } = useAuth();

  const searchParams = new URLSearchParams(location.search);
  const referralCode = searchParams.get('ref') || '';
  
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    country: 'KE'
  });
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const validateEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const validateForm = () => {
    if (!formData.email.trim()) {
      setError('Email is required');
      return false;
    }
    if (!validateEmail(formData.email)) {
      setError('Please enter a valid email address');
      return false;
    }
    if (!formData.username.trim()) {
      setError('Username is required');
      return false;
    }
    if (formData.username.length < 3) {
      setError('Username must be at least 3 characters');
      return false;
    }
    if (!formData.password) {
      setError('Password is required');
      return false;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!validateForm()) return;

    setLoading(true);
    try {
      const result = await register({
        email: formData.email,
        username: formData.username,
        password: formData.password,
        referralCode: referralCode || undefined,
      });
      
      if (result.success) {
        setCountry(formData.country);
        setSuccess('Registration successful! Redirecting to claim your free server...');
        localStorage.setItem('is_new_signup', 'true');
        setTimeout(() => navigate('/claim-server'), 1500);
      } else {
        setError(result.error || 'Registration failed');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <NeonBackground intensity={0.6} />
      
      <motion.div
        className="w-full max-w-md relative z-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="text-center mb-8">
          <motion.div
            className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-primary/5 border border-primary/20 mb-4"
            animate={{ boxShadow: ['0 0 10px hsl(120 100% 50% / 0.1)', '0 0 20px hsl(120 100% 50% / 0.2)', '0 0 10px hsl(120 100% 50% / 0.1)'] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <Zap className="w-8 h-8 text-primary" />
          </motion.div>
          <h1 className="text-3xl font-display font-bold mb-2">
            <span className="text-primary">WOLF</span>
            <span className="text-gray-400">HOST</span>
          </h1>
          <p className="text-gray-400">Create your account</p>
        </div>

        <div className="p-6 rounded-xl border border-primary/20 bg-black/30 backdrop-blur-sm">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <motion.div
                className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <AlertCircle size={18} />
                <span className="text-sm">{error}</span>
              </motion.div>
            )}

            {success && (
              <motion.div
                className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/30 text-primary"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <CheckCircle size={18} />
                <span className="text-sm">{success}</span>
              </motion.div>
            )}

            <div>
              <label className="block text-sm font-mono text-gray-400 mb-2">
                Email Address
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-lg bg-black/40 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-primary/50 transition-colors"
                placeholder="your@email.com"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-mono text-gray-400 mb-2">
                Username
              </label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-lg bg-black/40 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-primary/50 transition-colors"
                placeholder="Choose a username"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-mono text-gray-400 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-lg bg-black/40 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-primary/50 transition-colors pr-12"
                  placeholder="Min 6 characters"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-mono text-gray-400 mb-2">
                Confirm Password
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-lg bg-black/40 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-primary/50 transition-colors"
                placeholder="Repeat your password"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-mono text-gray-400 mb-2">
                <Globe size={14} className="inline mr-1.5 -mt-0.5" />
                Your Country
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowCountryDropdown(!showCountryDropdown)}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-lg bg-black/40 border border-gray-700 text-white focus:outline-none focus:border-primary/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span>{COUNTRIES[formData.country]?.flag}</span>
                    <span>{COUNTRIES[formData.country]?.name}</span>
                    <span className="text-gray-500 text-xs">({COUNTRIES[formData.country]?.currency})</span>
                  </div>
                  <ChevronDown size={16} className={`text-gray-400 transition-transform ${showCountryDropdown ? 'rotate-180' : ''}`} />
                </button>
                {showCountryDropdown && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowCountryDropdown(false)} />
                    <div className="absolute left-0 right-0 top-full mt-1 z-50 max-h-48 overflow-y-auto rounded-lg border border-primary/20 bg-black/95 backdrop-blur-sm shadow-xl">
                      {Object.entries(COUNTRIES).map(([code, config]) => (
                        <button
                          key={code}
                          type="button"
                          onClick={() => {
                            setFormData({ ...formData, country: code });
                            setShowCountryDropdown(false);
                          }}
                          className={`w-full text-left px-4 py-2.5 flex items-center gap-2 hover:bg-primary/10 transition-colors text-sm ${formData.country === code ? 'bg-primary/10 text-primary' : 'text-gray-300'}`}
                        >
                          <span>{config.flag}</span>
                          <span className="flex-1">{config.name}</span>
                          <span className="text-xs text-gray-500">{config.currency}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {referralCode && (
              <div className="text-center p-3 rounded-lg bg-primary/5 border border-primary/20">
                <p className="text-xs text-gray-400">
                  Referred by: <span className="text-primary font-mono">{referralCode}</span>
                </p>
              </div>
            )}

            <motion.button
              type="submit"
              className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary font-mono font-semibold transition-colors"
              disabled={loading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {loading ? (
                <LoadingSpinner size="sm" />
              ) : (
                <>
                  <UserPlus size={18} />
                  Create Account
                </>
              )}
            </motion.button>

            <div className="text-center p-3 rounded-lg bg-black/20 border border-gray-800">
              <p className="text-xs text-gray-500">
                By signing up, you agree to our{' '}
                <a href="#" className="text-gray-400 hover:text-white hover:underline">Terms of Service</a>
                {' '}and{' '}
                <a href="#" className="text-gray-400 hover:text-white hover:underline">Privacy Policy</a>
              </p>
            </div>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-800 text-center">
            <p className="text-gray-400">
              Already have an account?{' '}
              <Link 
                to="/login" 
                className="text-primary hover:underline font-mono"
              >
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Register;