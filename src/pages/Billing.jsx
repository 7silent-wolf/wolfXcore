// import { useState, useEffect } from 'react';
// import { motion } from 'framer-motion';
// import { 
//   Receipt, 
//   CreditCard, 
//   Download, 
//   FileText,
//   AlertCircle,
//   CheckCircle,
//   Clock,
//   DollarSign,
//   TrendingUp,
//   Wallet
// } from 'lucide-react';
// import { useAuth } from '../context/AuthContext';
// import { walletAPI } from '../services/api';
// import LoadingSpinner from '../components/LoadingSpinner';

// const Billing = () => {
//   const { user } = useAuth();
//   const [transactions, setTransactions] = useState([]);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     fetchTransactions();
//   }, []);

//   const fetchTransactions = async () => {
//     try {
//       const result = await walletAPI.getTransactions();
//       if (result.success) {
//         setTransactions(result.transactions);
//       }
//     } catch (err) {
//       console.error('Error fetching transactions:', err);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const invoices = [
//     { id: 'INV-001', date: '2024-03-01', amount: 25.00, status: 'paid', description: 'Pro Server - Production' },
//     { id: 'INV-002', date: '2024-03-01', amount: 5.00, status: 'paid', description: 'Basic Server - Development' },
//     { id: 'INV-003', date: '2024-04-01', amount: 25.00, status: 'pending', description: 'Pro Server - Production' },
//     { id: 'INV-004', date: '2024-04-01', amount: 50.00, status: 'pending', description: 'Enterprise Server - Database' },
//   ];

//   const isAdmin = (user?.referrals || 0) >= 10;

//   if (loading) {
//     return (
//       <div className="flex items-center justify-center h-[60vh]">
//         <LoadingSpinner size="lg" text="Loading billing..." />
//       </div>
//     );
//   }

//   return (
//     <div className="space-y-8 p-4">
//       {/* Header */}
//       <div className="flex justify-between items-end">
//         <div>
//           <h1 className="text-3xl font-bold mb-2">Billing & Invoices</h1>
//           <p className="text-gray-400 font-mono">
//             Manage your payments and view invoices
//             <span className="text-primary ml-4">
//               Balance: <span className="text-primary font-mono">${(user?.wallet || 0).toFixed(2)}</span>
//             </span>
//           </p>
//         </div>
//         <div className="flex items-center gap-2">
//           <span className="text-sm font-mono text-gray-400">Invoices:</span>
//           <span className="text-primary font-mono text-lg">{invoices.length}</span>
//         </div>
//       </div>

//       {/* Stats Grid */}
//       <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
//         <motion.div
//           initial={{ opacity: 0, y: 20 }}
//           animate={{ opacity: 1, y: 0 }}
//           transition={{ delay: 0.1 }}
//         >
//           <div className="p-6 rounded-xl border border-primary/20 bg-black/30 backdrop-blur-sm hover:border-primary/40 transition-all hover:scale-[1.02] group">
//             <div className="flex justify-between items-start">
//               <div>
//                 <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">
//                   Current Balance
//                 </p>
//                 <h3 className="text-3xl font-display font-bold text-white">
//                   ${(user?.wallet || 0).toFixed(2)}
//                 </h3>
//               </div>
//               <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
//                 <Wallet className="w-5 h-5 text-primary" />
//               </div>
//             </div>
//             <div className="mt-4 text-xs text-gray-500 font-mono">
//               Available funds
//             </div>
//           </div>
//         </motion.div>

//         <motion.div
//           initial={{ opacity: 0, y: 20 }}
//           animate={{ opacity: 1, y: 0 }}
//           transition={{ delay: 0.2 }}
//         >
//           <div className="p-6 rounded-xl border border-primary/20 bg-black/30 backdrop-blur-sm hover:border-primary/40 transition-all hover:scale-[1.02] group">
//             <div className="flex justify-between items-start">
//               <div>
//                 <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">
//                   Pending Invoices
//                 </p>
//                 <h3 className="text-3xl font-display font-bold text-white">
//                   {invoices.filter(i => i.status === 'pending').length}
//                 </h3>
//               </div>
//               <div className="p-2 bg-yellow-500/10 rounded-lg group-hover:bg-yellow-500/20 transition-colors">
//                 <Clock className="w-5 h-5 text-yellow-400" />
//               </div>
//             </div>
//             <div className="mt-4 text-xs text-gray-500 font-mono">
//               Awaiting payment
//             </div>
//           </div>
//         </motion.div>

//         <motion.div
//           initial={{ opacity: 0, y: 20 }}
//           animate={{ opacity: 1, y: 0 }}
//           transition={{ delay: 0.3 }}
//         >
//           <div className="p-6 rounded-xl border border-primary/20 bg-black/30 backdrop-blur-sm hover:border-primary/40 transition-all hover:scale-[1.02] group">
//             <div className="flex justify-between items-start">
//               <div>
//                 <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">
//                   Total Due
//                 </p>
//                 <h3 className="text-3xl font-display font-bold text-white">
//                   ${invoices.filter(i => i.status === 'pending').reduce((a, b) => a + b.amount, 0).toFixed(2)}
//                 </h3>
//               </div>
//               <div className="p-2 bg-red-500/10 rounded-lg group-hover:bg-red-500/20 transition-colors">
//                 <DollarSign className="w-5 h-5 text-red-400" />
//               </div>
//             </div>
//             <div className="mt-4 text-xs text-gray-500 font-mono">
//               Outstanding balance
//             </div>
//           </div>
//         </motion.div>
//       </div>

//       {/* Quick Actions */}
//       <motion.div
//         initial={{ opacity: 0, y: 20 }}
//         animate={{ opacity: 1, y: 0 }}
//         transition={{ delay: 0.4 }}
//         className="p-6 rounded-xl border border-primary/20 bg-black/30 backdrop-blur-sm"
//       >
//         <h2 className="text-xl font-bold mb-4 flex items-center">
//           <CreditCard className="w-5 h-5 mr-2 text-primary" /> Quick Actions
//         </h2>
//         <div className="flex flex-wrap gap-3">
//           <motion.a
//             href="/wallet"
//             className="px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 rounded-lg flex items-center gap-2 transition-all font-mono"
//             whileHover={{ scale: 1.02 }}
//             whileTap={{ scale: 0.98 }}
//           >
//             <DollarSign size={16} />
//             Add Funds
//           </motion.a>
//           <motion.button
//             className="px-4 py-2 bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/30 rounded-lg flex items-center gap-2 transition-all font-mono"
//             whileHover={{ scale: 1.02 }}
//             whileTap={{ scale: 0.98 }}
//             onClick={() => alert('Auto-pay settings coming soon!')}
//           >
//             <CreditCard size={16} />
//             Setup Auto-Pay
//           </motion.button>
//           <motion.button
//             className="px-4 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg flex items-center gap-2 transition-all font-mono"
//             whileHover={{ scale: 1.02 }}
//             whileTap={{ scale: 0.98 }}
//             onClick={() => alert('Downloading statement...')}
//           >
//             <Download size={16} />
//             Download Statement
//           </motion.button>
//         </div>
//       </motion.div>

//       {/* Invoices Table */}
//       <motion.div
//         initial={{ opacity: 0, y: 20 }}
//         animate={{ opacity: 1, y: 0 }}
//         transition={{ delay: 0.5 }}
//         className="p-6 rounded-xl border border-primary/20 bg-black/30 backdrop-blur-sm"
//       >
//         <div className="flex items-center justify-between mb-6">
//           <h2 className="text-xl font-bold flex items-center">
//             <Receipt className="w-5 h-5 mr-2 text-primary" /> Invoices
//           </h2>
//           <span className="text-sm text-gray-400 font-mono">
//             {invoices.length} total invoices
//           </span>
//         </div>
        
//         <div className="overflow-x-auto">
//           <table className="w-full">
//             <thead>
//               <tr className="border-b border-primary/20">
//                 <th className="text-left p-3 text-xs font-mono text-gray-400 uppercase tracking-wider">Invoice ID</th>
//                 <th className="text-left p-3 text-xs font-mono text-gray-400 uppercase tracking-wider hidden md:table-cell">Description</th>
//                 <th className="text-left p-3 text-xs font-mono text-gray-400 uppercase tracking-wider">Date</th>
//                 <th className="text-left p-3 text-xs font-mono text-gray-400 uppercase tracking-wider">Amount</th>
//                 <th className="text-left p-3 text-xs font-mono text-gray-400 uppercase tracking-wider">Status</th>
//                 <th className="text-left p-3 text-xs font-mono text-gray-400 uppercase tracking-wider">Actions</th>
//               </tr>
//             </thead>
//             <tbody>
//               {invoices.map((invoice, index) => (
//                 <motion.tr 
//                   key={invoice.id}
//                   className="border-b border-primary/10 hover:bg-primary/5 transition-colors"
//                   initial={{ opacity: 0, y: 10 }}
//                   animate={{ opacity: 1, y: 0 }}
//                   transition={{ delay: 0.6 + index * 0.05 }}
//                 >
//                   <td className="p-3 font-mono text-sm">{invoice.id}</td>
//                   <td className="p-3 font-mono text-sm text-gray-400 hidden md:table-cell">
//                     {invoice.description}
//                   </td>
//                   <td className="p-3 font-mono text-sm text-gray-400">{invoice.date}</td>
//                   <td className="p-3 font-mono text-sm text-primary">${invoice.amount.toFixed(2)}</td>
//                   <td className="p-3">
//                     <span className={`px-2 py-1 rounded text-xs font-mono ${
//                       invoice.status === 'paid' 
//                         ? 'bg-green-500/10 text-green-400 border border-green-500/20'
//                         : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
//                     }`}>
//                       {invoice.status}
//                     </span>
//                   </td>
//                   <td className="p-3">
//                     <div className="flex items-center gap-1">
//                       <button 
//                         className="p-2 hover:bg-primary/10 rounded-lg transition-colors text-gray-400 hover:text-white"
//                         title="View Invoice"
//                       >
//                         <FileText size={16} />
//                       </button>
//                       <button 
//                         className="p-2 hover:bg-primary/10 rounded-lg transition-colors text-gray-400 hover:text-white"
//                         title="Download"
//                       >
//                         <Download size={16} />
//                       </button>
//                       {invoice.status === 'pending' && (
//                         <button 
//                           className="p-2 hover:bg-primary/10 rounded-lg transition-colors text-primary hover:text-primary/80"
//                           title="Pay Now"
//                           onClick={() => alert(`Paying invoice ${invoice.id}...`)}
//                         >
//                           <DollarSign size={16} />
//                         </button>
//                       )}
//                     </div>
//                   </td>
//                 </motion.tr>
//               ))}
//             </tbody>
//           </table>
//         </div>
//       </motion.div>

//       {/* Staff Info (if admin) */}
//       {isAdmin && (
//         <motion.div
//           initial={{ opacity: 0, y: 20 }}
//           animate={{ opacity: 1, y: 0 }}
//           transition={{ delay: 0.7 }}
//           className="p-6 rounded-xl border border-primary/30 bg-primary/5 backdrop-blur-sm"
//         >
//           <div className="flex items-center gap-2 mb-4">
//             <AlertCircle size={20} className="text-primary" />
//             <h2 className="text-xl font-bold">Staff Panel</h2>
//           </div>
          
//           <p className="text-gray-400 font-mono mb-6">
//             As an admin, you have access to the staff billing panel.
//           </p>

//           <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
//             <div className="p-4 rounded-lg border border-primary/10 bg-black/20">
//               <p className="text-sm text-gray-400 mb-1 font-mono">Total Revenue</p>
//               <p className="text-2xl font-display font-bold text-primary">$12,450.00</p>
//             </div>
//             <div className="p-4 rounded-lg border border-primary/10 bg-black/20">
//               <p className="text-sm text-gray-400 mb-1 font-mono">Active Subscriptions</p>
//               <p className="text-2xl font-display font-bold text-primary">248</p>
//             </div>
//             <div className="p-4 rounded-lg border border-primary/10 bg-black/20">
//               <p className="text-sm text-gray-400 mb-1 font-mono">Pending Payouts</p>
//               <p className="text-2xl font-display font-bold text-primary">$2,100.00</p>
//             </div>
//           </div>

//           <motion.button
//             className="px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 rounded-lg flex items-center gap-2 transition-all font-mono"
//             whileHover={{ scale: 1.02 }}
//             whileTap={{ scale: 0.98 }}
//           >
//             View Full Staff Panel
//           </motion.button>
//         </motion.div>
//       )}

//       {/* Transaction History */}
//       <motion.div
//         initial={{ opacity: 0, y: 20 }}
//         animate={{ opacity: 1, y: 0 }}
//         transition={{ delay: 0.8 }}
//         className="p-6 rounded-xl border border-primary/20 bg-black/30 backdrop-blur-sm"
//       >
//         <h2 className="text-xl font-bold mb-4 flex items-center">
//           <TrendingUp className="w-5 h-5 mr-2 text-primary" /> Recent Transactions
//         </h2>
        
//         <div className="space-y-3">
//           {transactions.slice(0, 5).map((transaction, index) => (
//             <motion.div
//               key={transaction.id}
//               className="flex items-center justify-between p-3 rounded-lg border border-primary/10 hover:border-primary/30 transition-colors bg-black/20"
//               initial={{ opacity: 0, x: -20 }}
//               animate={{ opacity: 1, x: 0 }}
//               transition={{ delay: 0.9 + index * 0.05 }}
//             >
//               <div className="flex items-center gap-3">
//                 <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
//                   transaction.amount > 0 ? 'bg-primary/10 border border-primary/20' : 'bg-red-500/10 border border-red-500/20'
//                 }`}>
//                   {transaction.amount > 0 ? (
//                     <CheckCircle size={20} className="text-primary" />
//                   ) : (
//                     <Clock size={20} className="text-red-400" />
//                   )}
//                 </div>
//                 <div>
//                   <p className="font-mono text-sm">
//                     {transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
//                     {transaction.method && ` via ${transaction.method}`}
//                   </p>
//                   <p className="text-xs text-gray-500 font-mono">{transaction.date}</p>
//                 </div>
//               </div>
//               <span className={`font-mono font-bold ${
//                 transaction.amount > 0 ? 'text-primary' : 'text-red-400'
//               }`}>
//                 {transaction.amount > 0 ? '+' : ''}${Math.abs(transaction.amount).toFixed(2)}
//               </span>
//             </motion.div>
//           ))}
//         </div>
//       </motion.div>
//     </div>
//   );
// };

// export default Billing;




















import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Receipt, 
  CreditCard, 
  Download, 
  CheckCircle,
  TrendingUp,
  Wallet,
  Plus
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getCountryByCode, formatCurrency, convertFromKES } from '../lib/currencyConfig';
import { walletAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import PaymentModal from '../components/paymentmodal';
import VerifyPayment from '../components/VerifyPayment';

const Billing = () => {
  const { user } = useAuth();
  const countryConfig = getCountryByCode(user?.countryCode || 'KE');
  const userCurrency = countryConfig.currency;
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showVerifyPayment, setShowVerifyPayment] = useState(false);
  const [paymentReference, setPaymentReference] = useState(null);

  useEffect(() => {
    fetchTransactions();
    // Check for payment verification in URL
    const urlParams = new URLSearchParams(window.location.search);
    const reference = urlParams.get('reference');
    const trxref = urlParams.get('trxref');
    
    if (reference || trxref) {
      setPaymentReference(reference || trxref);
      setShowVerifyPayment(true);
    }
  }, []);

  const fetchTransactions = async () => {
    try {
      const result = await walletAPI.getTransactions();
      if (result.success) {
        setTransactions(result.transactions);
      }
    } catch (err) {
      console.error('Error fetching transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  const [balance, setBalance] = useState(0);

  useEffect(() => {
    const fetchBalance = async () => {
      try {
        const result = await walletAPI.getBalance();
        if (result.success) setBalance(result.balance);
      } catch (e) { console.error(e); }
    };
    fetchBalance();
  }, [transactions]);

  const handlePayInvoice = (invoice) => {
    setSelectedInvoice(invoice);
    setShowPaymentModal(true);
  };

  const handleAddFunds = () => {
    setSelectedInvoice(null);
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = (paymentData) => {
    // Refresh transactions
    fetchTransactions();
    
    // Show success message
    alert(`Payment successful! Transaction ID: ${paymentData.reference}`);
    
    // If paying invoice, update invoice status
    if (selectedInvoice) {
      // Update invoice status in your backend
      walletAPI.updateInvoiceStatus(selectedInvoice.id, 'paid');
    }
  };

  const isAdmin = (user?.referrals || 0) >= 10;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <LoadingSpinner size="lg" text="Loading billing..." />
      </div>
    );
  }

  return (
    <div className="space-y-8 p-4">
      {/* Payment Verification Component */}
      <VerifyPayment 
        isOpen={showVerifyPayment}
        reference={paymentReference}
        onClose={() => {
          setShowVerifyPayment(false);
          // Clean URL
          window.history.replaceState({}, document.title, '/billing');
        }}
        onSuccess={handlePaymentSuccess}
      />

      {/* Payment Modal */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => {
          setShowPaymentModal(false);
          setSelectedInvoice(null);
        }}
        invoice={selectedInvoice}
        onPaymentSuccess={handlePaymentSuccess}
      />

      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold mb-2">Billing & Payments</h1>
          <p className="text-gray-400 font-mono">
            Manage your payments and transaction history
            <span className="text-primary ml-4">
              Balance: <span className="text-primary font-mono">{formatCurrency(convertFromKES(balance, userCurrency), userCurrency)}</span>
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-mono text-gray-400">Transactions:</span>
          <span className="text-primary font-mono text-lg">{transactions.length}</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="p-6 rounded-xl border border-primary/20 bg-black/30 backdrop-blur-sm hover:border-primary/40 transition-all hover:scale-[1.02] group">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">
                  Current Balance
                </p>
                <h3 className="text-3xl font-display font-bold text-white">
                  {formatCurrency(convertFromKES(balance, userCurrency), userCurrency)}
                </h3>
              </div>
              <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                <Wallet className="w-5 h-5 text-primary" />
              </div>
            </div>
            <div className="mt-4 text-xs text-gray-500 font-mono">
              Available funds
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="p-6 rounded-xl border border-primary/20 bg-black/30 backdrop-blur-sm hover:border-primary/40 transition-all hover:scale-[1.02] group">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">
                  Total Transactions
                </p>
                <h3 className="text-3xl font-display font-bold text-white">
                  {transactions.length}
                </h3>
              </div>
              <div className="p-2 bg-blue-500/10 rounded-lg group-hover:bg-blue-500/20 transition-colors">
                <TrendingUp className="w-5 h-5 text-blue-400" />
              </div>
            </div>
            <div className="mt-4 text-xs text-gray-500 font-mono">
              All-time payments
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="p-6 rounded-xl border border-primary/20 bg-black/30 backdrop-blur-sm hover:border-primary/40 transition-all hover:scale-[1.02] group">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">
                  Total Deposited
                </p>
                <h3 className="text-3xl font-display font-bold text-white">
                  {formatCurrency(convertFromKES(transactions.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0), userCurrency), userCurrency)}
                </h3>
              </div>
              <div className="p-2 bg-green-500/10 rounded-lg group-hover:bg-green-500/20 transition-colors">
                <CheckCircle className="w-5 h-5 text-green-400" />
              </div>
            </div>
            <div className="mt-4 text-xs text-gray-500 font-mono">
              Lifetime deposits via M-Pesa & Card
            </div>
          </div>
        </motion.div>
      </div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="p-6 rounded-xl border border-primary/20 bg-black/30 backdrop-blur-sm"
      >
        <h2 className="text-xl font-bold mb-4 flex items-center">
          <CreditCard className="w-5 h-5 mr-2 text-primary" /> Quick Actions
        </h2>
        <div className="flex flex-wrap gap-3">
          <motion.button
            onClick={handleAddFunds}
            className="px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 rounded-lg flex items-center gap-2 transition-all font-mono"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Plus size={16} />
            Add Funds
          </motion.button>
          <motion.button
            className="px-4 py-2 bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/30 rounded-lg flex items-center gap-2 transition-all font-mono"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => alert('Auto-pay settings coming soon!')}
          >
            <CreditCard size={16} />
            Setup Auto-Pay
          </motion.button>
          <motion.button
            className="px-4 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg flex items-center gap-2 transition-all font-mono"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => alert('Downloading statement...')}
          >
            <Download size={16} />
            Download Statement
          </motion.button>
          <motion.button
            className="px-4 py-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-lg flex items-center gap-2 transition-all font-mono"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => window.open('https://paystack.com/pay/direct', '_blank')}
          >
            <Wallet size={16} />
            Direct Pay
          </motion.button>
        </div>
      </motion.div>

      {/* Payment History Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="p-6 rounded-xl border border-primary/20 bg-black/30 backdrop-blur-sm"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold flex items-center">
            <Receipt className="w-5 h-5 mr-2 text-primary" /> Payment History
          </h2>
          <span className="text-sm text-gray-400 font-mono">
            {transactions.length} transactions
          </span>
        </div>
        
        {transactions.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Receipt className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="font-mono">No payment history yet</p>
            <p className="text-sm mt-1">Make your first deposit to see transactions here</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-primary/20">
                  <th className="text-left p-3 text-xs font-mono text-gray-400 uppercase tracking-wider">Reference</th>
                  <th className="text-left p-3 text-xs font-mono text-gray-400 uppercase tracking-wider hidden md:table-cell">Method</th>
                  <th className="text-left p-3 text-xs font-mono text-gray-400 uppercase tracking-wider">Date</th>
                  <th className="text-left p-3 text-xs font-mono text-gray-400 uppercase tracking-wider">Amount</th>
                  <th className="text-left p-3 text-xs font-mono text-gray-400 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((txn, index) => (
                  <motion.tr 
                    key={txn.id || index}
                    className="border-b border-primary/10 hover:bg-primary/5 transition-colors"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 + index * 0.03 }}
                    data-testid={`row-transaction-${txn.id || index}`}
                  >
                    <td className="p-3 font-mono text-sm text-gray-300">{txn.reference || txn.id}</td>
                    <td className="p-3 font-mono text-sm text-gray-400 hidden md:table-cell">
                      {txn.channel === 'server_purchase' ? 'Server Purchase' : txn.method || 'M-Pesa'}
                    </td>
                    <td className="p-3 font-mono text-sm text-gray-400">
                      {txn.date ? new Date(txn.date).toLocaleDateString('en-KE', { year: 'numeric', month: 'short', day: 'numeric' }) : '-'}
                    </td>
                    <td className={`p-3 font-mono text-sm ${txn.direction === 'debit' ? 'text-red-400' : 'text-primary'}`}>
                      {txn.direction === 'debit' ? '-' : '+'}{formatCurrency(convertFromKES(Math.abs(txn.amount), userCurrency), userCurrency)}
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded text-xs font-mono ${
                        txn.status === 'completed' || txn.status === 'success'
                          ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                          : txn.status === 'failed'
                          ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                          : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                      }`}>
                        {txn.status === 'completed' || txn.status === 'success' ? 'completed' : txn.status}
                      </span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default Billing;