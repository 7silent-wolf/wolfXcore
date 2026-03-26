







// import { useState, useEffect } from 'react';
// import { motion } from 'framer-motion';
// import { 
//   User, 
//   Lock, 
//   Key,
//   Palette,
//   Copy,
//   RefreshCw,
//   CheckCircle,
//   AlertCircle,
//   Eye,
//   EyeOff,
//   Shield,
//   Sun,
//   Moon,
//   Zap,
//   Layout
// } from 'lucide-react';
// import { useAuth } from '../context/AuthContext';
// import LoadingSpinner from '../components/LoadingSpinner';

// const Settings = () => {
//   const { user } = useAuth();
//   const [activeTab, setActiveTab] = useState('account');
//   const [loading, setLoading] = useState(false);
//   const [message, setMessage] = useState({ type: '', text: '' });
//   const [showPassword, setShowPassword] = useState(false);
//   const [theme, setTheme] = useState('dark-tech');
  
//   const [accountForm, setAccountForm] = useState({
//     username: user?.username || '',
//     email: user?.email || ''
//   });
  
//   const [passwordForm, setPasswordForm] = useState({
//     currentPassword: '',
//     newPassword: '',
//     confirmPassword: ''
//   });

//   const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
//   const [apiKeys, setApiKeys] = useState([
//     { id: 1, name: 'Production API Key', key: 'wh_prod_xxxxxxxxxxxxx', created: '2024-03-01', lastUsed: '2 hours ago' },
//     { id: 2, name: 'Development API Key', key: 'wh_dev_xxxxxxxxxxxxx', created: '2024-02-15', lastUsed: '5 days ago' },
//   ]);

//   const showMessage = (type, text) => {
//     setMessage({ type, text });
//     setTimeout(() => setMessage({ type: '', text: '' }), 3000);
//   };

//   const handleAccountUpdate = async (e) => {
//     e.preventDefault();
//     setLoading(true);
//     try {
//       await new Promise(resolve => setTimeout(resolve, 1000));
//       showMessage('success', 'Account updated successfully!');
//     } catch (err) {
//       showMessage('error', 'Failed to update account');
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handlePasswordUpdate = async (e) => {
//     e.preventDefault();
//     if (passwordForm.newPassword !== passwordForm.confirmPassword) {
//       showMessage('error', 'Passwords do not match');
//       return;
//     }
//     if (passwordForm.newPassword.length < 6) {
//       showMessage('error', 'Password must be at least 6 characters');
//       return;
//     }

//     setLoading(true);
//     try {
//       await new Promise(resolve => setTimeout(resolve, 1000));
//       showMessage('success', 'Password updated successfully!');
//       setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
//     } catch (err) {
//       showMessage('error', 'Failed to update password');
//     } finally {
//       setLoading(false);
//     }
//   };

//   const generateApiKey = () => {
//     const newKey = {
//       id: apiKeys.length + 1,
//       name: `New API Key ${apiKeys.length + 1}`,
//       key: `wh_key_${Math.random().toString(36).substring(2, 15)}`,
//       created: new Date().toISOString().split('T')[0],
//       lastUsed: 'Never'
//     };
//     setApiKeys([...apiKeys, newKey]);
//     showMessage('success', 'New API key generated!');
//   };

//   const copyToClipboard = (text) => {
//     navigator.clipboard.writeText(text);
//     showMessage('success', 'Copied to clipboard!');
//   };

//   const tabs = [
//     { id: 'account', label: 'Account', icon: User },
//     { id: 'security', label: 'Security', icon: Lock },
//     { id: 'api', label: 'API Keys', icon: Key },
//     { id: 'appearance', label: 'Appearance', icon: Palette },
//   ];

//   const renderContent = () => {
//     switch(activeTab) {
//       case 'account':
//         return (
//           <div className="p-6 rounded-xl border border-primary/20 bg-black/30 backdrop-blur-sm">
//             <h2 className="text-xl font-bold mb-6 flex items-center">
//               <User className="w-5 h-5 mr-2 text-primary" /> Account Information
//             </h2>
//             <form onSubmit={handleAccountUpdate} className="space-y-4">
//               <div>
//                 <label className="block text-sm text-gray-400 mb-2 font-mono">
//                   Username
//                 </label>
//                 <input
//                   type="text"
//                   value={accountForm.username}
//                   onChange={(e) => setAccountForm({ ...accountForm, username: e.target.value })}
//                   className="w-full bg-black/40 border border-primary/20 rounded-lg px-3 py-2 text-sm font-mono placeholder-gray-500 focus:outline-none focus:border-primary/40 transition-colors"
//                 />
//               </div>
//               <div>
//                 <label className="block text-sm text-gray-400 mb-2 font-mono">
//                   Email Address
//                 </label>
//                 <input
//                   type="email"
//                   value={accountForm.email}
//                   onChange={(e) => setAccountForm({ ...accountForm, email: e.target.value })}
//                   className="w-full bg-black/40 border border-primary/20 rounded-lg px-3 py-2 text-sm font-mono placeholder-gray-500 focus:outline-none focus:border-primary/40 transition-colors"
//                 />
//               </div>
//               <motion.button
//                 type="submit"
//                 className="px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 rounded-lg flex items-center gap-2 transition-all font-mono"
//                 disabled={loading}
//                 whileHover={{ scale: 1.02 }}
//                 whileTap={{ scale: 0.98 }}
//               >
//                 {loading ? <LoadingSpinner size="sm" /> : 'Save Changes'}
//               </motion.button>
//             </form>
//           </div>
//         );

//       case 'security':
//         return (
//           <div className="space-y-6">
//             <div className="p-6 rounded-xl border border-primary/20 bg-black/30 backdrop-blur-sm">
//               <h2 className="text-xl font-bold mb-6 flex items-center">
//                 <Lock className="w-5 h-5 mr-2 text-primary" /> Change Password
//               </h2>
//               <form onSubmit={handlePasswordUpdate} className="space-y-4">
//                 <div>
//                   <label className="block text-sm text-gray-400 mb-2 font-mono">
//                     Current Password
//                   </label>
//                   <div className="relative">
//                     <input
//                       type={showPassword ? 'text' : 'password'}
//                       value={passwordForm.currentPassword}
//                       onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
//                       className="w-full bg-black/40 border border-primary/20 rounded-lg px-3 py-2 pr-10 text-sm font-mono placeholder-gray-500 focus:outline-none focus:border-primary/40 transition-colors"
//                     />
//                     <button
//                       type="button"
//                       onClick={() => setShowPassword(!showPassword)}
//                       className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
//                     >
//                       {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
//                     </button>
//                   </div>
//                 </div>
//                 <div>
//                   <label className="block text-sm text-gray-400 mb-2 font-mono">
//                     New Password
//                   </label>
//                   <input
//                     type={showPassword ? 'text' : 'password'}
//                     value={passwordForm.newPassword}
//                     onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
//                     className="w-full bg-black/40 border border-primary/20 rounded-lg px-3 py-2 text-sm font-mono placeholder-gray-500 focus:outline-none focus:border-primary/40 transition-colors"
//                   />
//                 </div>
//                 <div>
//                   <label className="block text-sm text-gray-400 mb-2 font-mono">
//                     Confirm New Password
//                   </label>
//                   <input
//                     type={showPassword ? 'text' : 'password'}
//                     value={passwordForm.confirmPassword}
//                     onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
//                     className="w-full bg-black/40 border border-primary/20 rounded-lg px-3 py-2 text-sm font-mono placeholder-gray-500 focus:outline-none focus:border-primary/40 transition-colors"
//                   />
//                 </div>
//                 <motion.button
//                   type="submit"
//                   className="px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 rounded-lg flex items-center gap-2 transition-all font-mono"
//                   disabled={loading}
//                   whileHover={{ scale: 1.02 }}
//                   whileTap={{ scale: 0.98 }}
//                 >
//                   {loading ? <LoadingSpinner size="sm" /> : 'Update Password'}
//                 </motion.button>
//               </form>
//             </div>
//             <div className="p-6 rounded-xl border border-primary/20 bg-black/30 backdrop-blur-sm">
//               <div className="flex items-center justify-between">
//                 <div className="flex items-center gap-4">
//                   <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
//                     <Shield size={24} className="text-primary" />
//                   </div>
//                   <div>
//                     <h3 className="font-bold">Two-Factor Authentication</h3>
//                     <p className="text-sm text-gray-400 font-mono">
//                       Add an extra layer of security to your account
//                     </p>
//                   </div>
//                 </div>
//                 <motion.button
//                   className={`px-4 py-2 rounded-lg font-mono text-sm transition-all ${
//                     twoFactorEnabled 
//                       ? 'bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400'
//                       : 'bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary'
//                   }`}
//                   onClick={() => {
//                     setTwoFactorEnabled(!twoFactorEnabled);
//                     showMessage('success', twoFactorEnabled ? '2FA disabled' : '2FA enabled');
//                   }}
//                   whileHover={{ scale: 1.02 }}
//                   whileTap={{ scale: 0.98 }}
//                 >
//                   {twoFactorEnabled ? 'Disable' : 'Enable'}
//                 </motion.button>
//               </div>
//             </div>
//           </div>
//         );

//       case 'api':
//         return (
//           <div className="p-6 rounded-xl border border-primary/20 bg-black/30 backdrop-blur-sm">
//             <div className="flex items-center justify-between mb-6">
//               <h2 className="text-xl font-bold flex items-center">
//                 <Key className="w-5 h-5 mr-2 text-primary" /> API Keys
//               </h2>
//               <motion.button
//                 className="px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 rounded-lg flex items-center gap-2 transition-all font-mono"
//                 onClick={generateApiKey}
//                 whileHover={{ scale: 1.02 }}
//                 whileTap={{ scale: 0.98 }}
//               >
//                 <RefreshCw size={16} />
//                 Generate New Key
//               </motion.button>
//             </div>
//             <div className="space-y-4">
//               {apiKeys.map((apiKey, index) => (
//                 <motion.div
//                   key={apiKey.id}
//                   className="p-4 rounded-lg border border-primary/10 hover:border-primary/30 transition-colors bg-black/20"
//                   initial={{ opacity: 0, y: 10 }}
//                   animate={{ opacity: 1, y: 0 }}
//                   transition={{ delay: index * 0.1 }}
//                 >
//                   <div className="flex items-center justify-between mb-2">
//                     <h3 className="font-mono font-medium">{apiKey.name}</h3>
//                     <button
//                       onClick={() => copyToClipboard(apiKey.key)}
//                       className="p-2 hover:bg-primary/10 rounded-lg transition-colors text-gray-400 hover:text-white"
//                     >
//                       <Copy size={16} />
//                     </button>
//                   </div>
//                   <div className="flex items-center gap-2 mb-2">
//                     <code className="text-sm bg-primary/10 px-3 py-1 rounded font-mono text-primary">
//                       {apiKey.key}
//                     </code>
//                   </div>
//                   <div className="flex items-center gap-4 text-xs text-gray-500 font-mono">
//                     <span>Created: {apiKey.created}</span>
//                     <span>Last used: {apiKey.lastUsed}</span>
//                   </div>
//                 </motion.div>
//               ))}
//             </div>
//             <div className="mt-6 p-4 rounded-lg bg-primary/5 border border-primary/20">
//               <p className="text-sm text-gray-400 font-mono">
//                 <strong className="text-primary">Note:</strong> API keys provide full access to your account. 
//                 Keep them secure and never share them publicly.
//               </p>
//             </div>
//           </div>
//         );

//       case 'appearance':
//         return (
//           <div className="p-6 rounded-xl border border-primary/20 bg-black/30 backdrop-blur-sm">
//             <h2 className="text-xl font-bold mb-6 flex items-center">
//               <Palette className="w-5 h-5 mr-2 text-primary" /> Theme Selection
//             </h2>
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//               <motion.button
//                 onClick={() => setTheme('dark-tech')}
//                 className={`p-4 rounded-xl border transition-all text-left ${
//                   theme === 'dark-tech' ? 'border-primary bg-primary/10' : 'border-primary/20 hover:border-primary/30'
//                 }`}
//                 whileHover={{ scale: 1.02 }}
//                 whileTap={{ scale: 0.98 }}
//               >
//                 <div className="flex items-center gap-3 mb-3">
//                   <div className={`p-2 rounded-lg ${theme === 'dark-tech' ? 'bg-primary/20' : 'bg-black/30'}`}>
//                     <Zap size={20} className={theme === 'dark-tech' ? 'text-primary' : 'text-gray-400'} />
//                   </div>
//                   <div>
//                     <h3 className="font-bold">Dark Tech</h3>
//                     <p className="text-xs text-gray-400 font-mono">Default dark theme with cyberpunk elements</p>
//                   </div>
//                 </div>
//                 {theme === 'dark-tech' && (
//                   <div className="flex items-center gap-1 text-primary text-xs font-mono">
//                     <CheckCircle size={12} />
//                     <span>Active</span>
//                   </div>
//                 )}
//               </motion.button>
//               <motion.button
//                 onClick={() => setTheme('glassmorphic')}
//                 className={`p-4 rounded-xl border transition-all text-left ${
//                   theme === 'glassmorphic' ? 'border-primary bg-primary/10' : 'border-primary/20 hover:border-primary/30'
//                 }`}
//                 whileHover={{ scale: 1.02 }}
//                 whileTap={{ scale: 0.98 }}
//               >
//                 <div className="flex items-center gap-3 mb-3">
//                   <div className={`p-2 rounded-lg ${theme === 'glassmorphic' ? 'bg-primary/20' : 'bg-black/30'}`}>
//                     <Layout size={20} className={theme === 'glassmorphic' ? 'text-primary' : 'text-gray-400'} />
//                   </div>
//                   <div>
//                     <h3 className="font-bold">Glassmorphic</h3>
//                     <p className="text-xs text-gray-400 font-mono">Frosted glass effect with blur</p>
//                   </div>
//                 </div>
//                 {theme === 'glassmorphic' && (
//                   <div className="flex items-center gap-1 text-primary text-xs font-mono">
//                     <CheckCircle size={12} />
//                     <span>Active</span>
//                   </div>
//                 )}
//               </motion.button>
//               <motion.button
//                 onClick={() => setTheme('light-mode')}
//                 className={`p-4 rounded-xl border transition-all text-left ${
//                   theme === 'light-mode' ? 'border-primary bg-primary/10' : 'border-primary/20 hover:border-primary/30'
//                 }`}
//                 whileHover={{ scale: 1.02 }}
//                 whileTap={{ scale: 0.98 }}
//               >
//                 <div className="flex items-center gap-3 mb-3">
//                   <div className={`p-2 rounded-lg ${theme === 'light-mode' ? 'bg-primary/20' : 'bg-black/30'}`}>
//                     <Sun size={20} className={theme === 'light-mode' ? 'text-primary' : 'text-gray-400'} />
//                   </div>
//                   <div>
//                     <h3 className="font-bold">Light Mode</h3>
//                     <p className="text-xs text-gray-400 font-mono">Clean light theme</p>
//                   </div>
//                 </div>
//                 {theme === 'light-mode' && (
//                   <div className="flex items-center gap-1 text-primary text-xs font-mono">
//                     <CheckCircle size={12} />
//                     <span>Active</span>
//                   </div>
//                 )}
//               </motion.button>
//               <motion.button
//                 onClick={() => setTheme('midnight')}
//                 className={`p-4 rounded-xl border transition-all text-left ${
//                   theme === 'midnight' ? 'border-primary bg-primary/10' : 'border-primary/20 hover:border-primary/30'
//                 }`}
//                 whileHover={{ scale: 1.02 }}
//                 whileTap={{ scale: 0.98 }}
//               >
//                 <div className="flex items-center gap-3 mb-3">
//                   <div className={`p-2 rounded-lg ${theme === 'midnight' ? 'bg-primary/20' : 'bg-black/30'}`}>
//                     <Moon size={20} className={theme === 'midnight' ? 'text-primary' : 'text-gray-400'} />
//                   </div>
//                   <div>
//                     <h3 className="font-bold">Midnight</h3>
//                     <p className="text-xs text-gray-400 font-mono">Deep blue dark theme</p>
//                   </div>
//                 </div>
//                 {theme === 'midnight' && (
//                   <div className="flex items-center gap-1 text-primary text-xs font-mono">
//                     <CheckCircle size={12} />
//                     <span>Active</span>
//                   </div>
//                 )}
//               </motion.button>
//             </div>
//           </div>
//         );

//       default:
//         return null;
//     }
//   };

//   return (
//     <div className="space-y-8 p-4">
//       {/* Header */}
//       <div className="flex justify-between items-end">
//         <div>
//           <h1 className="text-3xl font-bold mb-2">Settings</h1>
//           <p className="text-gray-400 font-mono">
//             Manage your account and preferences
//             <span className="text-primary ml-4">
//               Theme: <span className="text-primary font-mono">{theme.replace('-', ' ')}</span>
//             </span>
//           </p>
//         </div>
//       </div>

//       {/* Message Toast */}
//       {message.text && (
//         <motion.div
//           className={`
//             fixed top-20 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl
//             ${message.type === 'success' ? 'bg-primary/5 border border-primary/30 text-primary' : ''}
//             ${message.type === 'error' ? 'bg-red-500/5 border border-red-500/30 text-red-400' : ''}
//           `}
//           initial={{ opacity: 0, x: 100 }}
//           animate={{ opacity: 1, x: 0 }}
//           exit={{ opacity: 0, x: 100 }}
//         >
//           {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
//           <span className="text-sm font-mono">{message.text}</span>
//         </motion.div>
//       )}

//       <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
//         {/* Sidebar Tabs */}
//         <div className="p-6 rounded-xl border border-primary/20 bg-black/30 backdrop-blur-sm lg:col-span-1 h-fit">
//           <nav className="space-y-1">
//             {tabs.map((tab) => {
//               const Icon = tab.icon;
//               return (
//                 <motion.button
//                   key={tab.id}
//                   onClick={() => setActiveTab(tab.id)}
//                   className={`
//                     w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all
//                     ${activeTab === tab.id 
//                       ? 'bg-primary/10 border border-primary/30 text-primary' 
//                       : 'hover:bg-primary/5 border border-transparent text-gray-400 hover:text-gray-300'
//                     }
//                   `}
//                   whileHover={{ x: 4 }}
//                 >
//                   <Icon size={18} />
//                   <span className="font-mono text-sm">{tab.label}</span>
//                 </motion.button>
//               );
//             })}
//           </nav>
//         </div>

//         {/* Content Area */}
//         <div className="lg:col-span-3">
//           <motion.div
//             key={activeTab}
//             initial={{ opacity: 0, x: 20 }}
//             animate={{ opacity: 1, x: 0 }}
//             transition={{ duration: 0.3 }}
//           >
//             {renderContent()}
//           </motion.div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default Settings;


















import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  User, 
  Lock, 
  Key,
  Palette,
  Copy,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff,
  Shield,
  Sun,
  Moon,
  Zap,
  Layout,
  Monitor,
  Smartphone,
  Tablet,
  Droplets,
  Sparkles,
  Contrast,
  Paintbrush
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { COUNTRIES, getCountryByCode } from '../lib/currencyConfig';
import LoadingSpinner from '../components/LoadingSpinner';

const Settings = () => {
  const { user, setCountry } = useAuth();
  const currentCountry = getCountryByCode(user?.countryCode || 'KE');
  const [activeTab, setActiveTab] = useState('account');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [showPassword, setShowPassword] = useState(false);
  
  // Load theme from localStorage or use default
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('user-theme') || 'default';
    }
    return 'default';
  });

  // Load layout preferences
  const [layout, setLayout] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('user-layout') || 'default';
    }
    return 'default';
  });

  // Load font size preference
  const [fontSize, setFontSize] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('user-font-size') || 'medium';
    }
    return 'medium';
  });

  // Load animations preference
  const [animations, setAnimations] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('user-animations') === 'true';
    }
    return true;
  });

  const [accountForm, setAccountForm] = useState({
    username: user?.username || '',
    email: user?.email || ''
  });
  
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [apiKeys, setApiKeys] = useState([
    { id: 1, name: 'Production API Key', key: 'wh_prod_xxxxxxxxxxxxx', created: '2024-03-01', lastUsed: '2 hours ago' },
    { id: 2, name: 'Development API Key', key: 'wh_dev_xxxxxxxxxxxxx', created: '2024-02-15', lastUsed: '5 days ago' },
  ]);

  // Apply theme when component mounts or theme changes
  useEffect(() => {
    applyTheme(theme);
    applyLayout(layout);
    applyFontSize(fontSize);
    applyAnimations(animations);
  }, [theme, layout, fontSize, animations]);

  const applyTheme = (themeName) => {
    // Remove all theme classes
    document.documentElement.className = document.documentElement.className
      .replace(/theme-\S+/g, '')
      .replace(/default|dark-tech|glassmorphic|light-mode|midnight|cyberpunk/g, '');
    
    // Add new theme class
    document.documentElement.classList.add(`theme-${themeName}`);
    
    // Save to localStorage
    localStorage.setItem('user-theme', themeName);
    
    // Only set CSS variables for custom themes
    const root = document.documentElement;
    
    // Clear all CSS variables first
    root.style.removeProperty('--primary-color');
    root.style.removeProperty('--secondary-color');
    root.style.removeProperty('--background-color');
    root.style.removeProperty('--surface-color');
    root.style.removeProperty('--text-color');
    root.style.removeProperty('--border-color');
    root.style.removeProperty('--backdrop-blur');
    
    // Set CSS variables only for non-default themes
    if (themeName !== 'default') {
      switch(themeName) {
        case 'dark-tech':
          root.style.setProperty('--primary-color', 'rgb(59 130 246)'); // blue-500
          root.style.setProperty('--secondary-color', 'rgb(139 92 246)'); // purple-500
          root.style.setProperty('--background-color', 'rgb(10 10 10)');
          root.style.setProperty('--surface-color', 'rgba(30, 30, 30, 0.7)');
          root.style.setProperty('--text-color', 'rgb(229 231 235)');
          root.style.setProperty('--border-color', 'rgba(59, 130, 246, 0.2)');
          break;
        case 'glassmorphic':
          root.style.setProperty('--primary-color', 'rgb(168 85 247)'); // purple-500
          root.style.setProperty('--secondary-color', 'rgb(236 72 153)'); // pink-500
          root.style.setProperty('--background-color', 'rgb(15 23 42)'); // slate-900
          root.style.setProperty('--surface-color', 'rgba(255, 255, 255, 0.08)'); // Very transparent
          root.style.setProperty('--text-color', 'rgb(226 232 240)');
          root.style.setProperty('--border-color', 'rgba(255, 255, 255, 0.12)'); // Light border
          root.style.setProperty('--backdrop-blur', '20px'); // Strong blur
          break;
        case 'light-mode':
          root.style.setProperty('--primary-color', 'rgb(37 99 235)'); // blue-600
          root.style.setProperty('--secondary-color', 'rgb(239 68 68)'); // red-500
          root.style.setProperty('--background-color', 'rgb(249 250 251)'); // gray-50
          root.style.setProperty('--surface-color', 'rgba(255, 255, 255, 0.9)');
          root.style.setProperty('--text-color', 'rgb(31 41 55)'); // gray-800
          root.style.setProperty('--border-color', 'rgba(209, 213, 219, 0.5)'); // gray-300
          break;
        case 'midnight':
          root.style.setProperty('--primary-color', 'rgb(14 165 233)'); // sky-500
          root.style.setProperty('--secondary-color', 'rgb(34 211 238)'); // cyan-400
          root.style.setProperty('--background-color', 'rgb(3 7 18)'); // gray-950
          root.style.setProperty('--surface-color', 'rgba(17, 24, 39, 0.8)');
          root.style.setProperty('--text-color', 'rgb(209 213 219)'); // gray-300
          root.style.setProperty('--border-color', 'rgba(14, 165, 233, 0.3)');
          break;
        case 'cyberpunk':
          root.style.setProperty('--primary-color', 'rgb(16 185 129)'); // emerald-500
          root.style.setProperty('--secondary-color', 'rgb(245 158 11)'); // amber-500
          root.style.setProperty('--background-color', 'rgb(15 23 42)'); // slate-900
          root.style.setProperty('--surface-color', 'rgba(30, 41, 59, 0.7)');
          root.style.setProperty('--text-color', 'rgb(226 232 240)');
          root.style.setProperty('--border-color', 'rgba(16, 185, 129, 0.3)');
          break;
      }
    }
  };

  const applyLayout = (layoutName) => {
    // Remove all layout classes
    document.documentElement.className = document.documentElement.className
      .replace(/layout-\S+/g, '')
      .replace(/default|compact|spacious|sidebar-left|sidebar-right/g, '');
    
    // Add new layout class
    if (layoutName !== 'default') {
      document.documentElement.classList.add(`layout-${layoutName}`);
    }
    
    // Save to localStorage
    localStorage.setItem('user-layout', layoutName);
  };

  const applyFontSize = (size) => {
    // Remove all font size classes
    document.documentElement.className = document.documentElement.className
      .replace(/font-\S+/g, '')
      .replace(/small|medium|large|x-large/g, '');
    
    // Add new font size class only if not medium
    if (size !== 'medium') {
      document.documentElement.classList.add(`font-${size}`);
    }
    
    // Save to localStorage
    localStorage.setItem('user-font-size', size);
  };

  const applyAnimations = (enabled) => {
    if (enabled) {
      document.documentElement.classList.remove('no-animations');
    } else {
      document.documentElement.classList.add('no-animations');
    }
    localStorage.setItem('user-animations', enabled.toString());
  };

  const resetToDefaults = () => {
    setTheme('default');
    setLayout('default');
    setFontSize('medium');
    setAnimations(true);
    showMessage('success', 'Settings reset to defaults');
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  const handleAccountUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      showMessage('success', 'Account updated successfully!');
    } catch (err) {
      showMessage('error', 'Failed to update account');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showMessage('error', 'Passwords do not match');
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      showMessage('error', 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      showMessage('success', 'Password updated successfully!');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      showMessage('error', 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  const generateApiKey = () => {
    const newKey = {
      id: apiKeys.length + 1,
      name: `New API Key ${apiKeys.length + 1}`,
      key: `wh_key_${Math.random().toString(36).substring(2, 15)}`,
      created: new Date().toISOString().split('T')[0],
      lastUsed: 'Never'
    };
    setApiKeys([...apiKeys, newKey]);
    showMessage('success', 'New API key generated!');
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    showMessage('success', 'Copied to clipboard!');
  };

  const themes = [
    { 
      id: 'default', 
      name: 'Default', 
      description: 'Original website theme (Tailwind dark)',
      icon: Paintbrush,
      colors: ['#3B82F6', '#8B5CF6', '#0A0A0A']
    },
    { 
      id: 'dark-tech', 
      name: 'Dark Tech', 
      description: 'Cyberpunk dark theme with blue accents',
      icon: Zap,
      colors: ['#3B82F6', '#8B5CF6', '#0A0A0A']
    },
    { 
      id: 'glassmorphic', 
      name: 'Glassmorphic', 
      description: 'Glass-like transparent effect with blur',
      icon: Droplets,
      colors: ['#A855F7', '#EC4899', '#0F172A']
    },
    { 
      id: 'light-mode', 
      name: 'Light Mode', 
      description: 'Clean light theme',
      icon: Sun,
      colors: ['#2563EB', '#EF4444', '#F9FAFB']
    },
    { 
      id: 'midnight', 
      name: 'Midnight', 
      description: 'Deep blue dark theme',
      icon: Moon,
      colors: ['#0EA5E9', '#22D3EE', '#030712']
    },
    { 
      id: 'cyberpunk', 
      name: 'Cyberpunk', 
      description: 'Neon green and orange theme',
      icon: Sparkles,
      colors: ['#10B981', '#F59E0B', '#0F172A']
    },
  ];

  const layouts = [
    { id: 'default', name: 'Default', icon: Monitor, description: 'Standard layout' },
    { id: 'compact', name: 'Compact', icon: Smartphone, description: 'Dense information layout' },
    { id: 'spacious', name: 'Spacious', icon: Tablet, description: 'More whitespace between elements' },
  ];

  const fontSizes = [
    { id: 'small', name: 'Small', description: '90% of default size' },
    { id: 'medium', name: 'Medium', description: 'Default size' },
    { id: 'large', name: 'Large', description: '112% of default size' },
    { id: 'x-large', name: 'Extra Large', description: '125% of default size' },
  ];

  const tabs = [
    { id: 'account', label: 'Account', icon: User },
    { id: 'security', label: 'Security', icon: Lock },
    { id: 'api', label: 'API Keys', icon: Key },
    { id: 'appearance', label: 'Appearance', icon: Palette },
  ];

  const renderContent = () => {
    switch(activeTab) {
      case 'account':
        return (
          <div className="p-6 rounded-xl border border-primary/20 bg-black/30 backdrop-blur-sm">
            <h2 className="text-xl font-bold mb-6 flex items-center">
              <User className="w-5 h-5 mr-2 text-primary" /> Account Information
            </h2>
            <form onSubmit={handleAccountUpdate} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2 font-mono">
                  Username
                </label>
                <input
                  type="text"
                  value={accountForm.username}
                  onChange={(e) => setAccountForm({ ...accountForm, username: e.target.value })}
                  className="w-full bg-black/40 border border-primary/20 rounded-lg px-3 py-2 text-sm font-mono placeholder-gray-500 focus:outline-none focus:border-primary/40 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2 font-mono">
                  Email Address
                </label>
                <input
                  type="email"
                  value={accountForm.email}
                  onChange={(e) => setAccountForm({ ...accountForm, email: e.target.value })}
                  className="w-full bg-black/40 border border-primary/20 rounded-lg px-3 py-2 text-sm font-mono placeholder-gray-500 focus:outline-none focus:border-primary/40 transition-colors"
                />
              </div>
              <motion.button
                type="submit"
                className="px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 rounded-lg flex items-center gap-2 transition-all font-mono"
                disabled={loading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {loading ? <LoadingSpinner size="sm" /> : 'Save Changes'}
              </motion.button>
            </form>

            <div className="mt-6 pt-6 border-t border-primary/10">
              <h3 className="text-lg font-bold mb-1 flex items-center gap-2">
                <span className="text-xl">{currentCountry.flag}</span> Display Currency
              </h3>
              <p className="text-sm text-gray-400 font-mono mb-4">
                Choose your country to display all prices in your local currency
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {Object.entries(COUNTRIES)
                  .filter(([code]) => code !== 'OTHER')
                  .sort(([, a], [, b]) => a.name.localeCompare(b.name))
                  .map(([code, country]) => (
                    <motion.button
                      key={code}
                      onClick={() => {
                        setCountry(code);
                        showMessage('success', `Currency changed to ${country.currency} (${country.currencyName})`);
                      }}
                      className={`p-3 rounded-lg border text-left transition-all flex items-center gap-3 ${
                        (user?.countryCode || 'KE') === code
                          ? 'border-primary bg-primary/10 ring-1 ring-primary/30'
                          : 'border-primary/20 hover:border-primary/40 hover:bg-primary/5'
                      }`}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <span className="text-2xl">{country.flag}</span>
                      <div className="min-w-0">
                        <div className="font-mono text-sm font-medium truncate">{country.name}</div>
                        <div className="text-xs text-gray-400 font-mono">{country.currencySymbol} ({country.currency})</div>
                      </div>
                      {(user?.countryCode || 'KE') === code && (
                        <CheckCircle size={16} className="text-primary ml-auto flex-shrink-0" />
                      )}
                    </motion.button>
                  ))}
              </div>
            </div>
          </div>
        );

      case 'security':
        return (
          <div className="space-y-6">
            <div className="p-6 rounded-xl border border-primary/20 bg-black/30 backdrop-blur-sm">
              <h2 className="text-xl font-bold mb-6 flex items-center">
                <Lock className="w-5 h-5 mr-2 text-primary" /> Change Password
              </h2>
              <form onSubmit={handlePasswordUpdate} className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2 font-mono">
                    Current Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                      className="w-full bg-black/40 border border-primary/20 rounded-lg px-3 py-2 pr-10 text-sm font-mono placeholder-gray-500 focus:outline-none focus:border-primary/40 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2 font-mono">
                    New Password
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    className="w-full bg-black/40 border border-primary/20 rounded-lg px-3 py-2 text-sm font-mono placeholder-gray-500 focus:outline-none focus:border-primary/40 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2 font-mono">
                    Confirm New Password
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    className="w-full bg-black/40 border border-primary/20 rounded-lg px-3 py-2 text-sm font-mono placeholder-gray-500 focus:outline-none focus:border-primary/40 transition-colors"
                  />
                </div>
                <motion.button
                  type="submit"
                  className="px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 rounded-lg flex items-center gap-2 transition-all font-mono"
                  disabled={loading}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {loading ? <LoadingSpinner size="sm" /> : 'Update Password'}
                </motion.button>
              </form>
            </div>
            <div className="p-6 rounded-xl border border-primary/20 bg-black/30 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                    <Shield size={24} className="text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold">Two-Factor Authentication</h3>
                    <p className="text-sm text-gray-400 font-mono">
                      Add an extra layer of security to your account
                    </p>
                  </div>
                </div>
                <motion.button
                  className={`px-4 py-2 rounded-lg font-mono text-sm transition-all ${
                    twoFactorEnabled 
                      ? 'bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400'
                      : 'bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary'
                  }`}
                  onClick={() => {
                    setTwoFactorEnabled(!twoFactorEnabled);
                    showMessage('success', twoFactorEnabled ? '2FA disabled' : '2FA enabled');
                  }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {twoFactorEnabled ? 'Disable' : 'Enable'}
                </motion.button>
              </div>
            </div>
          </div>
        );

      case 'api':
        return (
          <div className="p-6 rounded-xl border border-primary/20 bg-black/30 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold flex items-center">
                <Key className="w-5 h-5 mr-2 text-primary" /> API Keys
              </h2>
              <motion.button
                className="px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 rounded-lg flex items-center gap-2 transition-all font-mono"
                onClick={generateApiKey}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <RefreshCw size={16} />
                Generate New Key
              </motion.button>
            </div>
            <div className="space-y-4">
              {apiKeys.map((apiKey, index) => (
                <motion.div
                  key={apiKey.id}
                  className="p-4 rounded-lg border border-primary/10 hover:border-primary/30 transition-colors bg-black/20"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-mono font-medium">{apiKey.name}</h3>
                    <button
                      onClick={() => copyToClipboard(apiKey.key)}
                      className="p-2 hover:bg-primary/10 rounded-lg transition-colors text-gray-400 hover:text-white"
                    >
                      <Copy size={16} />
                    </button>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <code className="text-sm bg-primary/10 px-3 py-1 rounded font-mono text-primary">
                      {apiKey.key}
                    </code>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500 font-mono">
                    <span>Created: {apiKey.created}</span>
                    <span>Last used: {apiKey.lastUsed}</span>
                  </div>
                </motion.div>
              ))}
            </div>
            <div className="mt-6 p-4 rounded-lg bg-primary/5 border border-primary/20">
              <p className="text-sm text-gray-400 font-mono">
                <strong className="text-primary">Note:</strong> API keys provide full access to your account. 
                Keep them secure and never share them publicly.
              </p>
            </div>
          </div>
        );

      case 'appearance':
        return (
          <div className="space-y-6">
            {/* Theme Selection */}
            <div className="p-6 rounded-xl border border-primary/20 bg-black/30 backdrop-blur-sm">
              <h2 className="text-xl font-bold mb-6 flex items-center">
                <Palette className="w-5 h-5 mr-2 text-primary" /> Theme Selection
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                {themes.map((themeItem) => {
                  const Icon = themeItem.icon;
                  return (
                    <motion.button
                      key={themeItem.id}
                      onClick={() => setTheme(themeItem.id)}
                      className={`p-4 rounded-xl border transition-all text-left ${
                        theme === themeItem.id ? 'border-primary bg-primary/10' : 'border-primary/20 hover:border-primary/30'
                      }`}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`p-2 rounded-lg ${theme === themeItem.id ? 'bg-primary/20' : 'bg-black/30'}`}>
                          <Icon size={20} className={theme === themeItem.id ? 'text-primary' : 'text-gray-400'} />
                        </div>
                        <div>
                          <h3 className="font-bold">{themeItem.name}</h3>
                          <p className="text-xs text-gray-400 font-mono">{themeItem.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        {themeItem.colors.map((color, index) => (
                          <div
                            key={index}
                            className="w-6 h-6 rounded-full border border-white/10"
                            style={{ backgroundColor: color }}
                            title={`Color ${index + 1}`}
                          />
                        ))}
                      </div>
                      {theme === themeItem.id && (
                        <div className="flex items-center gap-1 text-primary text-xs font-mono">
                          <CheckCircle size={12} />
                          <span>Active</span>
                        </div>
                      )}
                    </motion.button>
                  );
                })}
              </div>
              
              {/* Theme Preview */}
              <div className="mt-6 p-4 rounded-lg border border-primary/10 bg-black/20">
                <h3 className="text-sm font-bold mb-2 text-gray-400 font-mono">THEME PREVIEW</h3>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-lg bg-primary/20 flex items-center justify-center border border-primary/20">
                    <div className="text-primary font-bold">A</div>
                  </div>
                  <div className="flex-1">
                    <div className="h-2 bg-primary/30 rounded-full mb-2"></div>
                    <div className="h-2 bg-primary/20 rounded-full mb-2 w-3/4"></div>
                    <div className="h-2 bg-primary/10 rounded-full w-1/2"></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Layout Preferences */}
            <div className="p-6 rounded-xl border border-primary/20 bg-black/30 backdrop-blur-sm">
              <h2 className="text-xl font-bold mb-6 flex items-center">
                <Layout className="w-5 h-5 mr-2 text-primary" /> Layout Preferences
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {layouts.map((layoutItem) => {
                  const Icon = layoutItem.icon;
                  return (
                    <motion.button
                      key={layoutItem.id}
                      onClick={() => setLayout(layoutItem.id)}
                      className={`p-4 rounded-xl border transition-all text-left ${
                        layout === layoutItem.id ? 'border-primary bg-primary/10' : 'border-primary/20 hover:border-primary/30'
                      }`}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`p-2 rounded-lg ${layout === layoutItem.id ? 'bg-primary/20' : 'bg-black/30'}`}>
                          <Icon size={20} className={layout === layoutItem.id ? 'text-primary' : 'text-gray-400'} />
                        </div>
                        <div>
                          <h3 className="font-bold">{layoutItem.name}</h3>
                          <p className="text-xs text-gray-400 font-mono">{layoutItem.description}</p>
                        </div>
                      </div>
                      {layout === layoutItem.id && (
                        <div className="flex items-center gap-1 text-primary text-xs font-mono">
                          <CheckCircle size={12} />
                          <span>Active</span>
                        </div>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Font Size */}
            <div className="p-6 rounded-xl border border-primary/20 bg-black/30 backdrop-blur-sm">
              <h2 className="text-xl font-bold mb-6">Font Size</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                {fontSizes.map((sizeItem) => (
                  <motion.button
                    key={sizeItem.id}
                    onClick={() => setFontSize(sizeItem.id)}
                    className={`p-3 rounded-lg border transition-all text-center ${
                      fontSize === sizeItem.id ? 'border-primary bg-primary/10 text-primary' : 'border-primary/20 hover:border-primary/30 text-gray-400'
                    }`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className={`font-mono ${fontSize === sizeItem.id ? 'text-primary' : 'text-gray-400'}`}>
                      {sizeItem.name}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{sizeItem.description}</div>
                  </motion.button>
                ))}
              </div>
              
              <div className="p-4 rounded-lg border border-primary/10 bg-black/20">
                <div className={`font-mono ${fontSize === 'small' ? 'text-sm' : fontSize === 'large' ? 'text-lg' : fontSize === 'x-large' ? 'text-xl' : ''}`}>
                  This is how text will appear with your selected font size. The quick brown fox jumps over the lazy dog.
                </div>
              </div>
            </div>

            {/* Animations */}
            <div className="p-6 rounded-xl border border-primary/20 bg-black/30 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold mb-1">Animations</h3>
                  <p className="text-sm text-gray-400 font-mono">
                    Enable or disable interface animations
                  </p>
                </div>
                <button
                  onClick={() => setAnimations(!animations)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    animations ? 'bg-primary' : 'bg-gray-700'
                  }`}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                      animations ? 'left-7' : 'left-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Reset Button */}
            <div className="flex justify-end">
              <motion.button
                onClick={resetToDefaults}
                className="px-4 py-2 bg-gray-800/50 hover:bg-gray-800 border border-gray-700 rounded-lg font-mono text-sm flex items-center gap-2 transition-all"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <RefreshCw size={16} />
                Reset to Defaults
              </motion.button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-8 p-4">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold mb-2">Settings</h1>
          <p className="text-gray-400 font-mono">
            Manage your account and preferences
            <span className="text-primary ml-4">
              Theme: <span className="text-primary font-mono capitalize">{theme.replace('-', ' ')}</span>
            </span>
          </p>
        </div>
      </div>

      {/* Message Toast */}
      {message.text && (
        <motion.div
          className={`
            fixed top-20 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl
            ${message.type === 'success' ? 'bg-primary/5 border border-primary/30 text-primary' : ''}
            ${message.type === 'error' ? 'bg-red-500/5 border border-red-500/30 text-red-400' : ''}
          `}
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 100 }}
        >
          {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <span className="text-sm font-mono">{message.text}</span>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Tabs */}
        <div className="p-6 rounded-xl border border-primary/20 bg-black/30 backdrop-blur-sm lg:col-span-1 h-fit">
          <nav className="space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <motion.button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all
                    ${activeTab === tab.id 
                      ? 'bg-primary/10 border border-primary/30 text-primary' 
                      : 'hover:bg-primary/5 border border-transparent text-gray-400 hover:text-gray-300'
                    }
                  `}
                  whileHover={{ x: 4 }}
                >
                  <Icon size={18} />
                  <span className="font-mono text-sm">{tab.label}</span>
                </motion.button>
              );
            })}
          </nav>
        </div>

        {/* Content Area */}
        <div className="lg:col-span-3">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            {renderContent()}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Settings;