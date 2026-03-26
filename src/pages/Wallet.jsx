import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Wallet as WalletIcon, 
  ArrowDownToLine, 
  ArrowUpFromLine,
  Smartphone,
  CheckCircle,
  AlertCircle,
  Clock,
  X,
  DollarSign,
  CreditCard,
  Mail,
  Server
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { walletAPI } from '../services/api';
import { paystackAPI, validatePhoneNumber, formatPhoneNumber } from '../services/paystack';
import { COUNTRIES, getCountryByCode, formatCurrency, getMinDeposit, supportsMpesa, supportsMobileMoney, getMobileMoneyProviders, getMobileMoneyLabel, convertFromKES, convertToKES, supportsBankTransfer, supportsUSSD, getUSSDbanks } from '../lib/currencyConfig';
import LoadingSpinner from '../components/LoadingSpinner';
import { Globe, ChevronDown } from 'lucide-react';

const getPaymentMethodsList = (countryCode) => {
  const methods = [{ id: 'Card', name: 'Card', color: 'rgba(59, 130, 246, 0.2)' }];
  if (supportsMpesa(countryCode)) {
    methods.unshift({ id: 'M-Pesa', name: 'M-Pesa', color: 'rgba(76, 175, 80, 0.2)' });
  } else if (supportsMobileMoney(countryCode)) {
    const label = getMobileMoneyLabel(countryCode);
    methods.unshift({ id: 'MobileMoney', name: label, color: 'rgba(255, 193, 7, 0.2)' });
  }
  if (supportsBankTransfer(countryCode)) {
    methods.push({ id: 'BankTransfer', name: 'Bank Transfer', color: 'rgba(16, 185, 129, 0.2)' });
  }
  if (supportsUSSD(countryCode)) {
    methods.push({ id: 'USSD', name: 'USSD', color: 'rgba(168, 85, 247, 0.2)' });
  }
  return methods;
};

const ModalContent = ({ title, form, setForm, onSubmit, type, onClose, processing, stkStatus, user, walletBalance = 0, cardWaiting = false, onVerifyCard, userCurrency, countryConfig, paymentMethods }) => (
  <motion.div
    className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-sm"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    onClick={onClose}
  >
    <motion.div
      className="w-[calc(100%-1.5rem)] max-w-[380px] max-h-[85vh] overflow-y-auto bg-black/90 backdrop-blur-sm border border-primary/20 rounded-xl shadow-2xl"
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.9, opacity: 0 }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="p-3 sm:p-5">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h2 className="text-base sm:text-xl font-bold flex items-center gap-2">
            {type === 'deposit' ? <ArrowDownToLine className="w-4 h-4 sm:w-5 sm:h-5 text-primary" /> : <ArrowUpFromLine className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />}
            {title}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-primary/10 rounded-lg transition-colors text-gray-400 hover:text-white"
            disabled={processing}
            data-testid="button-close-wallet-modal"
          >
            <X size={18} />
          </button>
        </div>

        <AnimatePresence>
          {stkStatus.show && (
            <motion.div
              className={`flex items-center gap-2 p-3 rounded-lg mb-4 ${
                stkStatus.status === 'success' ? 'bg-primary/5 border border-primary/30 text-primary' :
                stkStatus.status === 'error' ? 'bg-red-500/5 border border-red-500/30 text-red-400' :
                'bg-gray-800/50 border border-gray-700/50 text-gray-400'
              }`}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {stkStatus.status === 'success' && <CheckCircle size={18} />}
              {stkStatus.status === 'error' && <AlertCircle size={18} />}
              {stkStatus.status === 'pending' && (
                <motion.div
                  className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                />
              )}
              <span className="text-sm font-mono">{stkStatus.message}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2 font-mono">
              Amount ({countryConfig.currencySymbol}) - Min {formatCurrency(getMinDeposit(userCurrency), userCurrency)}
            </label>
            <input
              type="number"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              className="w-full bg-black/40 border border-primary/20 rounded-lg px-3 py-2 text-sm font-mono placeholder-gray-500 focus:outline-none focus:border-primary/40 transition-colors"
              placeholder={`Enter amount (min ${getMinDeposit(userCurrency)})`}
              min={getMinDeposit(userCurrency)}
              disabled={processing}
              data-testid="input-wallet-amount"
            />
            {type === 'withdraw' && (
              <p className="text-xs text-gray-500 font-mono mt-1">
                Available: {formatCurrency(convertFromKES(walletBalance, userCurrency), userCurrency)}
              </p>
            )}
          </div>

          {(form.method === 'M-Pesa' || form.method === 'MobileMoney') && (
            <div className="space-y-3">
              {form.method === 'MobileMoney' && countryConfig.mobileMoneyProviders && countryConfig.mobileMoneyProviders.length > 1 && (
                <div>
                  <label className="block text-sm text-gray-400 mb-2 font-mono">
                    Provider
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {countryConfig.mobileMoneyProviders.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setForm({ ...form, mobileProvider: p.provider })}
                        disabled={processing}
                        className={`p-2 rounded-lg border text-center text-xs font-mono transition-all ${
                          form.mobileProvider === p.provider
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-primary/20 hover:border-primary/40 text-gray-400 hover:text-gray-300'
                        }`}
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <label className="block text-sm text-gray-400 mb-2 font-mono">
                  Phone Number
                </label>
                <div className="relative">
                  <Smartphone size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full bg-black/40 border border-primary/20 rounded-lg px-3 py-2 pl-10 text-sm font-mono placeholder-gray-500 focus:outline-none focus:border-primary/40 transition-colors"
                    placeholder={countryConfig.phonePlaceholder}
                    disabled={processing}
                    data-testid="input-wallet-phone"
                  />
                </div>
                <p className="text-xs text-gray-500 font-mono mt-1">
                  {countryConfig.phonePrefix} format (e.g. {countryConfig.phonePlaceholder})
                </p>
              </div>
            </div>
          )}

          {form.method === 'Card' && (
            <div>
              <label className="block text-sm text-gray-400 mb-2 font-mono">
                Email Address
              </label>
              <div className="relative">
                <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  value={form.email || ''}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full bg-black/40 border border-primary/20 rounded-lg px-3 py-2 pl-10 text-sm font-mono placeholder-gray-500 focus:outline-none focus:border-primary/40 transition-colors"
                  placeholder="you@email.com"
                  disabled={processing}
                  data-testid="input-wallet-email"
                />
              </div>
              <p className="text-xs text-gray-500 font-mono mt-1">
                You'll be redirected to secure checkout to enter card details
              </p>
            </div>
          )}

          {form.method === 'BankTransfer' && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-400 mb-2 font-mono">
                  Email Address
                </label>
                <div className="relative">
                  <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    value={form.email || ''}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full bg-black/40 border border-primary/20 rounded-lg px-3 py-2 pl-10 text-sm font-mono placeholder-gray-500 focus:outline-none focus:border-primary/40 transition-colors"
                    placeholder="you@email.com"
                    disabled={processing}
                  />
                </div>
                <p className="text-xs text-gray-500 font-mono mt-1">
                  A virtual account will be generated for you to transfer to. OPay transfers supported.
                </p>
              </div>
              {form.bankTransferInfo && (
                <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 space-y-2">
                  <p className="text-xs font-mono text-emerald-400 font-semibold">Transfer to this account:</p>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-gray-400">Bank:</span>
                      <span className="text-white">{form.bankTransferInfo.bankName}</span>
                    </div>
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-gray-400">Account No:</span>
                      <span className="text-white font-bold tracking-wider">{form.bankTransferInfo.accountNumber}</span>
                    </div>
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-gray-400">Account Name:</span>
                      <span className="text-white">{form.bankTransferInfo.accountName || 'Paystack'}</span>
                    </div>
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-gray-400">Amount:</span>
                      <span className="text-emerald-400 font-bold">{form.bankTransferInfo.amount}</span>
                    </div>
                  </div>
                  <p className="text-[10px] font-mono text-gray-500 mt-2">
                    Transfer the exact amount. Account expires in ~30 minutes.
                  </p>
                </div>
              )}
            </div>
          )}

          {form.method === 'USSD' && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-400 mb-2 font-mono">
                  Email Address
                </label>
                <div className="relative">
                  <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    value={form.email || ''}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full bg-black/40 border border-primary/20 rounded-lg px-3 py-2 pl-10 text-sm font-mono placeholder-gray-500 focus:outline-none focus:border-primary/40 transition-colors"
                    placeholder="you@email.com"
                    disabled={processing}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2 font-mono">
                  Select Your Bank
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(countryConfig.ussdBanks || []).map((bank) => (
                    <button
                      key={bank.code}
                      type="button"
                      onClick={() => setForm({ ...form, ussdBank: bank.code })}
                      disabled={processing}
                      className={`p-2 rounded-lg border text-center text-xs font-mono transition-all ${
                        form.ussdBank === bank.code
                          ? 'border-purple-500 bg-purple-500/10 text-purple-400'
                          : 'border-primary/20 hover:border-primary/40 text-gray-400 hover:text-gray-300'
                      }`}
                    >
                      {bank.name}
                    </button>
                  ))}
                </div>
              </div>
              {form.ussdCode && (
                <div className="p-3 rounded-lg border border-purple-500/30 bg-purple-500/5 space-y-2">
                  <p className="text-xs font-mono text-purple-400 font-semibold">Dial this code on your phone:</p>
                  <p className="text-lg font-mono text-white text-center font-bold tracking-wider py-2">
                    {form.ussdCode}
                  </p>
                  <p className="text-[10px] font-mono text-gray-500 text-center">
                    Follow the prompts to complete payment
                  </p>
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm text-gray-400 mb-2 font-mono">
              Payment Method
            </label>
            <div className={`grid gap-2 ${paymentMethods.length > 3 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3'}`}>
              {paymentMethods.map((method) => (
                <button
                  key={method.id}
                  type="button"
                  onClick={() => setForm({ ...form, method: method.id })}
                  disabled={processing}
                  data-testid={`button-method-${method.id}`}
                  className={`
                    p-3 rounded-lg border text-center text-sm font-mono transition-all
                    ${form.method === method.id 
                      ? 'border-primary bg-primary/10 text-primary' 
                      : 'border-primary/20 hover:border-primary/40 text-gray-400 hover:text-gray-300'
                    }
                  `}
                >
                  {method.name}
                </button>
              ))}
            </div>
          </div>

          {cardWaiting ? (
            <div className="space-y-3 pt-4">
              <button
                type="button"
                onClick={onVerifyCard}
                disabled={processing}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-mono text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                data-testid="button-verify-card"
              >
                {processing ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <>
                    <CheckCircle size={16} />
                    I've Completed Payment - Verify
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-full px-4 py-2 text-gray-400 hover:text-white hover:bg-white/5 border border-gray-700 rounded-lg font-mono text-sm transition-all"
                data-testid="button-wallet-cancel"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 text-gray-400 hover:text-white hover:bg-white/5 border border-gray-700 rounded-lg font-mono text-sm transition-all"
                disabled={processing}
                data-testid="button-wallet-cancel"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 rounded-lg font-mono text-sm flex items-center justify-center gap-2 transition-all"
                disabled={processing}
                data-testid="button-wallet-submit"
              >
                {processing ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <>
                    {type === 'deposit' ? <ArrowDownToLine size={16} /> : <ArrowUpFromLine size={16} />}
                    {type === 'deposit' ? 'Deposit' : 'Withdraw'}
                  </>
                )}
              </button>
            </div>
          )}
        </form>
      </div>
    </motion.div>
  </motion.div>
);

const Wallet = () => {
  const { user, updateUser, setCountry } = useAuth();
  const selectedCountry = user?.countryCode || 'KE';
  const countryConfig = getCountryByCode(selectedCountry);
  const userCurrency = countryConfig.currency;
  const paymentMethods = getPaymentMethodsList(selectedCountry);
  const defaultMethod = supportsMpesa(selectedCountry) ? 'M-Pesa' : supportsMobileMoney(selectedCountry) ? 'MobileMoney' : 'Card';

  const [transactions, setTransactions] = useState([]);
  const [walletBalance, setWalletBalance] = useState(0);
  const [totalDeposited, setTotalDeposited] = useState(0);
  const [totalSpent, setTotalSpent] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [stkStatus, setStkStatus] = useState({ show: false, status: '', message: '' });
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);

  const defaultProvider = getMobileMoneyProviders(selectedCountry)?.[0]?.provider || '';
  const defaultUssdBank = getUSSDbanks(selectedCountry)?.[0]?.code || '';
  const [depositForm, setDepositForm] = useState({ amount: '', phone: '', email: user?.email || '', method: defaultMethod, mobileProvider: defaultProvider, ussdBank: defaultUssdBank, bankTransferInfo: null, ussdCode: '' });
  const [withdrawForm, setWithdrawForm] = useState({ amount: '', phone: '', method: defaultMethod, mobileProvider: defaultProvider });
  const [cardWaiting, setCardWaiting] = useState(false);
  const [cardRef, setCardRef] = useState('');

  const handleCountryChange = (code) => {
    setCountry(code);
    setShowCountryDropdown(false);
    const newConfig = getCountryByCode(code);
    const newDefaultMethod = supportsMpesa(code) ? 'M-Pesa' : supportsMobileMoney(code) ? 'MobileMoney' : 'Card';
    const newDefaultProvider = getMobileMoneyProviders(code)?.[0]?.provider || '';
    const newUssdBank = getUSSDbanks(code)?.[0]?.code || '';
    setDepositForm(prev => ({ ...prev, method: newDefaultMethod, mobileProvider: newDefaultProvider, phone: '', ussdBank: newUssdBank, bankTransferInfo: null, ussdCode: '' }));
    setWithdrawForm(prev => ({ ...prev, method: newDefaultMethod, mobileProvider: newDefaultProvider, phone: '' }));
  };

  useEffect(() => {
    fetchTransactions();
    fetchBalance();
  }, []);

  const fetchBalance = async () => {
    try {
      const result = await walletAPI.getBalance();
      if (result.success) {
        setWalletBalance(result.balance);
        setTotalDeposited(result.totalDeposits || 0);
        setTotalSpent(result.totalSpending || 0);
      }
    } catch (err) {
      console.error('Error fetching balance:', err);
    }
  };

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

  const handleDeposit = async (e) => {
    e.preventDefault();
    const amount = parseFloat(depositForm.amount);

    if (!depositForm.amount) {
      setStkStatus({ show: true, status: 'error', message: 'Please enter an amount' });
      return;
    }

    const minDeposit = getMinDeposit(userCurrency);
    if (amount < minDeposit) {
      setStkStatus({ show: true, status: 'error', message: `Minimum deposit is ${formatCurrency(minDeposit, userCurrency)}` });
      return;
    }

    const amountInKES = convertToKES(amount, userCurrency);

    if (depositForm.method === 'M-Pesa') {
      if (!depositForm.phone) {
        setStkStatus({ show: true, status: 'error', message: 'Please enter your phone number' });
        return;
      }
      if (!validatePhoneNumber(depositForm.phone, user?.countryCode || 'KE')) {
        setStkStatus({ show: true, status: 'error', message: `Invalid phone number. Use format: ${countryConfig.phonePlaceholder}` });
        return;
      }
      await handleMpesaDeposit(amountInKES);
    } else if (depositForm.method === 'MobileMoney') {
      if (!depositForm.phone) {
        setStkStatus({ show: true, status: 'error', message: 'Please enter your phone number' });
        return;
      }
      if (!validatePhoneNumber(depositForm.phone, user?.countryCode)) {
        setStkStatus({ show: true, status: 'error', message: `Invalid phone number. Use format: ${countryConfig.phonePlaceholder}` });
        return;
      }
      if (!depositForm.mobileProvider) {
        setStkStatus({ show: true, status: 'error', message: 'Please select a mobile money provider' });
        return;
      }
      await handleMobileMoneyDeposit(amountInKES);
    } else if (depositForm.method === 'Card') {
      if (!depositForm.email || !depositForm.email.includes('@')) {
        setStkStatus({ show: true, status: 'error', message: 'Please enter a valid email address' });
        return;
      }
      await handleCardDeposit(amountInKES);
    } else if (depositForm.method === 'BankTransfer') {
      if (!depositForm.email || !depositForm.email.includes('@')) {
        setStkStatus({ show: true, status: 'error', message: 'Please enter a valid email address' });
        return;
      }
      await handleBankTransferDeposit(amountInKES);
    } else if (depositForm.method === 'USSD') {
      if (!depositForm.email || !depositForm.email.includes('@')) {
        setStkStatus({ show: true, status: 'error', message: 'Please enter a valid email address' });
        return;
      }
      if (!depositForm.ussdBank) {
        setStkStatus({ show: true, status: 'error', message: 'Please select your bank' });
        return;
      }
      await handleUSSDDeposit(amountInKES);
    }
  };

  const handleMpesaDeposit = async (amount) => {
    setProcessing(true);
    setStkStatus({ show: true, status: 'pending', message: 'Sending M-Pesa STK Push to your phone...' });

    try {
      const formattedPhone = formatPhoneNumber(depositForm.phone);
      const response = await paystackAPI.initializeMpesaPayment(formattedPhone, amount, {
        type: 'wallet_topup',
        phone_number: formattedPhone,
      });

      if (!response.success) {
        throw new Error(response.message || 'Failed to initiate M-Pesa payment');
      }

      setStkStatus({ show: true, status: 'pending', message: 'STK Push sent! Enter your M-Pesa PIN on your phone...' });

      const reference = response.reference || response.data?.reference;
      let attempts = 0;
      const maxAttempts = 60;

      const poll = async () => {
        if (attempts >= maxAttempts) {
          setStkStatus({ show: true, status: 'error', message: 'Payment timed out. Check your M-Pesa messages.' });
          setProcessing(false);
          return;
        }
        attempts++;

        try {
          const result = await paystackAPI.verifyPayment(reference, user?.id);

          if (result.success && result.data?.status === 'success') {
            const paidAmount = result.data.amount / 100;
            setStkStatus({ show: true, status: 'success', message: `Successfully deposited ${formatCurrency(convertFromKES(paidAmount, userCurrency), userCurrency)}!` });

            try {
              await walletAPI.recordMpesaPayment(paidAmount, depositForm.phone, reference);
              const balanceResult = await walletAPI.getBalance();
              if (balanceResult.success) {
                await updateUser({ wallet: balanceResult.balance });
              }
            } catch (walletErr) {
              console.error('Wallet update error:', walletErr);
            }

            fetchTransactions();
            fetchBalance();
            setProcessing(false);
            setTimeout(() => {
              setShowDepositModal(false);
              setStkStatus({ show: false, status: '', message: '' });
              setDepositForm({ amount: '', phone: '', email: user?.email || '', method: defaultMethod, mobileProvider: defaultProvider, ussdBank: defaultUssdBank, bankTransferInfo: null, ussdCode: '' });
            }, 2500);
          } else if (result.data?.status === 'failed') {
            setStkStatus({ show: true, status: 'error', message: 'Payment was declined or cancelled.' });
            setProcessing(false);
          } else {
            setStkStatus({ show: true, status: 'pending', message: `Waiting for M-Pesa confirmation... (${attempts}s)` });
            setTimeout(poll, 1000);
          }
        } catch (err) {
          setTimeout(poll, 2000);
        }
      };

      setTimeout(poll, 3000);
    } catch (err) {
      setStkStatus({ show: true, status: 'error', message: err.message || 'Payment failed. Please try again.' });
      setProcessing(false);
    }
  };

  const handleMobileMoneyDeposit = async (amountInKES) => {
    setProcessing(true);
    const providerLabel = getMobileMoneyProviders(user?.countryCode)?.find(p => p.provider === depositForm.mobileProvider)?.name || 'Mobile Money';
    setStkStatus({ show: true, status: 'pending', message: `Sending ${providerLabel} payment request to your phone...` });

    try {
      const formattedPhone = formatPhoneNumber(depositForm.phone, user?.countryCode);
      const localCurrencyAmount = convertFromKES(amountInKES, countryConfig.paystackCurrency || userCurrency);
      const response = await paystackAPI.initializeMobileMoneyPayment(
        formattedPhone,
        localCurrencyAmount,
        user?.countryCode,
        depositForm.mobileProvider,
        { type: 'wallet_topup', phone_number: formattedPhone, amountInKES: amountInKES }
      );

      if (!response.success) {
        throw new Error(response.message || 'Failed to initiate mobile money payment');
      }

      setStkStatus({ show: true, status: 'pending', message: `${providerLabel} request sent! Authorize the payment on your phone...` });

      const reference = response.reference || response.data?.reference;
      let attempts = 0;
      const maxAttempts = 60;

      const poll = async () => {
        if (attempts >= maxAttempts) {
          setStkStatus({ show: true, status: 'error', message: 'Payment timed out. Check your phone messages.' });
          setProcessing(false);
          return;
        }
        attempts++;

        try {
          const result = await paystackAPI.verifyMobileMoneyPayment(reference, user?.id);

          if (result.success && result.data?.status === 'success') {
            const paidAmount = result.data.amount / 100;
            const paidCurrency = result.data.currency || countryConfig.paystackCurrency;
            const paidInKES = convertToKES(paidAmount, paidCurrency);
            setStkStatus({ show: true, status: 'success', message: `Successfully deposited ${formatCurrency(convertFromKES(paidInKES, userCurrency), userCurrency)} via ${providerLabel}!` });

            try {
              await walletAPI.recordMpesaPayment(paidInKES, depositForm.phone, reference);
              const balanceResult = await walletAPI.getBalance();
              if (balanceResult.success) {
                await updateUser({ wallet: balanceResult.balance });
              }
            } catch (walletErr) {
              console.error('Wallet update error:', walletErr);
            }

            fetchTransactions();
            fetchBalance();
            setProcessing(false);
            setTimeout(() => {
              setShowDepositModal(false);
              setStkStatus({ show: false, status: '', message: '' });
              setDepositForm({ amount: '', phone: '', email: user?.email || '', method: defaultMethod, mobileProvider: defaultProvider, ussdBank: defaultUssdBank, bankTransferInfo: null, ussdCode: '' });
            }, 2500);
          } else if (result.data?.status === 'failed') {
            setStkStatus({ show: true, status: 'error', message: 'Payment was declined or cancelled.' });
            setProcessing(false);
          } else {
            setStkStatus({ show: true, status: 'pending', message: `Waiting for ${providerLabel} confirmation... (${attempts}s)` });
            setTimeout(poll, 1000);
          }
        } catch (err) {
          setTimeout(poll, 2000);
        }
      };

      setTimeout(poll, 3000);
    } catch (err) {
      setStkStatus({ show: true, status: 'error', message: err.message || 'Payment failed. Please try again.' });
      setProcessing(false);
    }
  };

  const handleCardDeposit = async (amount) => {
    setProcessing(true);
    setStkStatus({ show: true, status: 'pending', message: 'Initializing card payment...' });

    try {
      const callbackUrl = `${window.location.origin}/wallet?payment=card`;
      const response = await paystackAPI.initializeCardPayment(depositForm.email, amount, callbackUrl, {
        type: 'wallet_topup',
      });

      if (!response.success) {
        throw new Error(response.message || 'Failed to initialize card payment');
      }

      setCardRef(response.reference);

      if (response.authorizationUrl) {
        setStkStatus({ show: true, status: 'pending', message: 'Checkout opened in new tab. Complete payment there, then click "Verify Payment" below.' });
        window.open(response.authorizationUrl, '_blank');
        setCardWaiting(true);
        setProcessing(false);
      }
    } catch (err) {
      setStkStatus({ show: true, status: 'error', message: err.message || 'Card payment failed. Please try again.' });
      setProcessing(false);
    }
  };

  const handleBankTransferDeposit = async (amountInKES) => {
    setProcessing(true);
    setStkStatus({ show: true, status: 'pending', message: 'Generating virtual account for bank transfer...' });

    try {
      const localAmount = convertFromKES(amountInKES, countryConfig.paystackCurrency || userCurrency);
      const response = await paystackAPI.initializeBankTransfer(depositForm.email, localAmount, {
        type: 'wallet_topup',
        amountInKES: amountInKES,
      });

      if (!response.success) {
        throw new Error(response.message || 'Failed to initiate bank transfer');
      }

      const transferData = response.data;
      const bankInfo = {
        bankName: transferData?.bank?.name || 'Paystack-Titan',
        accountNumber: transferData?.account_number || transferData?.bank?.account_number || '',
        accountName: transferData?.account_name || transferData?.bank?.account_name || 'Paystack',
        amount: formatCurrency(localAmount, countryConfig.paystackCurrency || userCurrency),
      };

      setDepositForm(prev => ({ ...prev, bankTransferInfo: bankInfo }));
      setStkStatus({ show: true, status: 'pending', message: 'Transfer the exact amount to the account below. Waiting for confirmation...' });

      const reference = response.reference || transferData?.reference;
      let attempts = 0;
      const maxAttempts = 180;

      const poll = async () => {
        if (attempts >= maxAttempts) {
          setStkStatus({ show: true, status: 'error', message: 'Transfer verification timed out. If you sent the money, it will be credited shortly.' });
          setProcessing(false);
          return;
        }
        attempts++;

        try {
          const result = await paystackAPI.verifyBankTransfer(reference, user?.id);

          if (result.success && result.data?.status === 'success') {
            const paidAmount = result.data.amount / 100;
            const paidCurrency = result.data.currency || countryConfig.paystackCurrency;
            const paidInKES = convertToKES(paidAmount, paidCurrency);
            setStkStatus({ show: true, status: 'success', message: `Successfully deposited ${formatCurrency(convertFromKES(paidInKES, userCurrency), userCurrency)} via bank transfer!` });

            try {
              await walletAPI.recordMpesaPayment(paidInKES, depositForm.email, reference, 'Bank transfer deposit');
              const balanceResult = await walletAPI.getBalance();
              if (balanceResult.success) {
                await updateUser({ wallet: balanceResult.balance });
              }
            } catch (walletErr) {
              console.error('Wallet update error:', walletErr);
            }

            fetchTransactions();
            fetchBalance();
            setProcessing(false);
            setTimeout(() => {
              setShowDepositModal(false);
              setStkStatus({ show: false, status: '', message: '' });
              setDepositForm({ amount: '', phone: '', email: user?.email || '', method: defaultMethod, mobileProvider: defaultProvider, ussdBank: defaultUssdBank, bankTransferInfo: null, ussdCode: '' });
            }, 2500);
          } else if (result.data?.status === 'failed') {
            setStkStatus({ show: true, status: 'error', message: 'Transfer was not received or was declined.' });
            setProcessing(false);
          } else {
            const mins = Math.floor(attempts / 60);
            const secs = attempts % 60;
            const timeStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
            setStkStatus({ show: true, status: 'pending', message: `Waiting for bank transfer confirmation... (${timeStr})` });
            setTimeout(poll, 1000);
          }
        } catch (err) {
          setTimeout(poll, 3000);
        }
      };

      setTimeout(poll, 5000);
    } catch (err) {
      setStkStatus({ show: true, status: 'error', message: err.message || 'Bank transfer failed. Please try again.' });
      setProcessing(false);
    }
  };

  const handleUSSDDeposit = async (amountInKES) => {
    setProcessing(true);
    const bankName = (countryConfig.ussdBanks || []).find(b => b.code === depositForm.ussdBank)?.name || 'your bank';
    setStkStatus({ show: true, status: 'pending', message: `Generating USSD code for ${bankName}...` });

    try {
      const localAmount = convertFromKES(amountInKES, countryConfig.paystackCurrency || userCurrency);
      const response = await paystackAPI.initializeUSSDPayment(depositForm.email, localAmount, depositForm.ussdBank, {
        type: 'wallet_topup',
        amountInKES: amountInKES,
      });

      if (!response.success) {
        throw new Error(response.message || 'Failed to initiate USSD payment');
      }

      const ussdCode = response.data?.ussd_code || response.data?.display_text || '';
      setDepositForm(prev => ({ ...prev, ussdCode }));
      setStkStatus({ show: true, status: 'pending', message: `Dial the USSD code below on your phone to complete payment via ${bankName}` });

      const reference = response.reference || response.data?.reference;
      let attempts = 0;
      const maxAttempts = 120;

      const poll = async () => {
        if (attempts >= maxAttempts) {
          setStkStatus({ show: true, status: 'error', message: 'Payment timed out. If you completed the USSD transaction, it will be credited shortly.' });
          setProcessing(false);
          return;
        }
        attempts++;

        try {
          const result = await paystackAPI.verifyUSSDPayment(reference, user?.id);

          if (result.success && result.data?.status === 'success') {
            const paidAmount = result.data.amount / 100;
            const paidCurrency = result.data.currency || countryConfig.paystackCurrency;
            const paidInKES = convertToKES(paidAmount, paidCurrency);
            setStkStatus({ show: true, status: 'success', message: `Successfully deposited ${formatCurrency(convertFromKES(paidInKES, userCurrency), userCurrency)} via USSD!` });

            try {
              await walletAPI.recordMpesaPayment(paidInKES, depositForm.email, reference, 'USSD deposit');
              const balanceResult = await walletAPI.getBalance();
              if (balanceResult.success) {
                await updateUser({ wallet: balanceResult.balance });
              }
            } catch (walletErr) {
              console.error('Wallet update error:', walletErr);
            }

            fetchTransactions();
            fetchBalance();
            setProcessing(false);
            setTimeout(() => {
              setShowDepositModal(false);
              setStkStatus({ show: false, status: '', message: '' });
              setDepositForm({ amount: '', phone: '', email: user?.email || '', method: defaultMethod, mobileProvider: defaultProvider, ussdBank: defaultUssdBank, bankTransferInfo: null, ussdCode: '' });
            }, 2500);
          } else if (result.data?.status === 'failed') {
            setStkStatus({ show: true, status: 'error', message: 'USSD payment was declined or cancelled.' });
            setProcessing(false);
          } else {
            setStkStatus({ show: true, status: 'pending', message: `Waiting for USSD payment confirmation... (${attempts}s)` });
            setTimeout(poll, 1000);
          }
        } catch (err) {
          setTimeout(poll, 2000);
        }
      };

      setTimeout(poll, 5000);
    } catch (err) {
      setStkStatus({ show: true, status: 'error', message: err.message || 'USSD payment failed. Please try again.' });
      setProcessing(false);
    }
  };

  const verifyCardDeposit = async () => {
    if (!cardRef) return;

    setProcessing(true);
    setStkStatus({ show: true, status: 'pending', message: 'Verifying card payment...' });

    try {
      const result = await paystackAPI.verifyCardPayment(cardRef, user?.id);

      if (result.success) {
        const paidAmount = result.data.amount / 100;
        setStkStatus({ show: true, status: 'success', message: `Successfully deposited ${formatCurrency(convertFromKES(paidAmount, userCurrency), userCurrency)} via card!` });

        try {
          await walletAPI.recordMpesaPayment(paidAmount, depositForm.email, cardRef, 'Card deposit via Paystack');
          const balanceResult = await walletAPI.getBalance();
          if (balanceResult.success) {
            await updateUser({ wallet: balanceResult.balance });
          }
        } catch (walletErr) {
          console.error('Wallet update error:', walletErr);
        }

        fetchTransactions();
        fetchBalance();
        setProcessing(false);
        setCardWaiting(false);
        setCardRef('');
        setTimeout(() => {
          setShowDepositModal(false);
          setStkStatus({ show: false, status: '', message: '' });
          setDepositForm({ amount: '', phone: '', email: user?.email || '', method: defaultMethod, mobileProvider: defaultProvider, ussdBank: defaultUssdBank, bankTransferInfo: null, ussdCode: '' });
        }, 2500);
      } else {
        setStkStatus({ show: true, status: 'error', message: 'Payment not completed yet. Complete payment in the checkout tab, then try verifying again.' });
        setProcessing(false);
      }
    } catch (err) {
      setStkStatus({ show: true, status: 'error', message: 'Could not verify payment. Please try again.' });
      setProcessing(false);
    }
  };

  const handleWithdraw = async (e) => {
    e.preventDefault();
    if (!withdrawForm.amount || !withdrawForm.phone) {
      setStkStatus({ show: true, status: 'error', message: 'Please fill all fields' });
      return;
    }

    const withdrawAmountKES = convertToKES(parseFloat(withdrawForm.amount), userCurrency);
    if (withdrawAmountKES > walletBalance) {
      setStkStatus({ show: true, status: 'error', message: 'Insufficient balance' });
      return;
    }

    setProcessing(true);
    setStkStatus({ show: true, status: 'pending', message: 'Processing withdrawal...' });

    try {
      const result = await walletAPI.withdraw(withdrawAmountKES, withdrawForm.method, withdrawForm.phone);
      
      if (result.success) {
        setStkStatus({ show: true, status: 'success', message: `Successfully withdrew ${formatCurrency(parseFloat(withdrawForm.amount), userCurrency)}!` });
        await updateUser({ wallet: result.newBalance });
        fetchTransactions();
        setTimeout(() => {
          setShowWithdrawModal(false);
          setStkStatus({ show: false, status: '', message: '' });
          setWithdrawForm({ amount: '', phone: '', method: defaultMethod });
        }, 2000);
      } else {
        setStkStatus({ show: true, status: 'error', message: result.error });
      }
    } catch (err) {
      setStkStatus({ show: true, status: 'error', message: 'Withdrawal failed. Please try again.' });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <LoadingSpinner size="lg" text="Loading wallet..." />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-8">
      <div className="flex flex-wrap justify-between items-end gap-3">
        <div>
          <h1 className="text-lg sm:text-3xl font-bold mb-0.5 sm:mb-2">Wallet</h1>
          <p className="text-gray-400 font-mono text-[10px] sm:text-sm">
            Manage your funds and transactions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs sm:text-sm font-mono text-gray-400">Transactions:</span>
          <span className="text-primary font-mono text-sm sm:text-lg">{transactions.length}</span>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="relative z-20"
      >
        <div className="flex items-center justify-between p-3 sm:p-4 rounded-xl border border-primary/20 bg-black/30 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <Globe size={16} className="text-primary" />
            <span className="text-xs sm:text-sm font-mono text-gray-400">Your Region</span>
          </div>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowCountryDropdown(!showCountryDropdown)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-primary/20 bg-black/40 hover:border-primary/40 transition-colors font-mono text-sm"
            >
              <span>{countryConfig.flag}</span>
              <span className="text-gray-200">{countryConfig.name}</span>
              <span className="text-gray-500 text-xs">({userCurrency})</span>
              <ChevronDown size={14} className={`text-gray-400 transition-transform ${showCountryDropdown ? 'rotate-180' : ''}`} />
            </button>
            {showCountryDropdown && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowCountryDropdown(false)} />
                <div className="absolute right-0 top-full mt-1 z-50 w-56 max-h-64 overflow-y-auto rounded-lg border border-primary/20 bg-black/95 backdrop-blur-sm shadow-xl">
                  {Object.entries(COUNTRIES).map(([code, config]) => (
                    <button
                      key={code}
                      type="button"
                      onClick={() => handleCountryChange(code)}
                      className={`w-full text-left px-3 py-2.5 flex items-center gap-2 hover:bg-primary/10 transition-colors font-mono text-sm ${selectedCountry === code ? 'bg-primary/10 text-primary' : 'text-gray-300'}`}
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
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="p-3 sm:p-8 rounded-xl border border-primary/20 bg-black/30 backdrop-blur-sm text-center"
      >
        <div className="w-10 h-10 sm:w-16 sm:h-16 mx-auto rounded-xl bg-primary/10 flex items-center justify-center mb-3 sm:mb-6 border border-primary/20">
          <WalletIcon size={20} className="text-primary sm:hidden" />
          <WalletIcon size={32} className="text-primary hidden sm:block" />
        </div>
        
        <p className="text-[10px] sm:text-sm text-gray-400 mb-1 sm:mb-2 font-mono">Available Balance</p>
        <motion.p 
          className="text-xl sm:text-4xl font-display font-bold text-primary mb-1 sm:mb-2"
          key={walletBalance}
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 300 }}
        >
          {formatCurrency(convertFromKES(walletBalance, userCurrency), userCurrency)}
        </motion.p>
        {userCurrency !== 'KES' && (
          <p className="text-[10px] sm:text-xs text-gray-500 font-mono mb-2 sm:mb-4">Estimated in {countryConfig.currencyName}</p>
        )}
        {userCurrency === 'KES' && <div className="mb-2 sm:mb-4" />}

        <div className="mb-4 sm:mb-8 max-w-xs mx-auto">
          <div className="p-2 sm:p-3 rounded-lg border border-primary/10 bg-black/20">
            <p className="text-[10px] sm:text-xs text-gray-500 font-mono mb-0.5">Total Deposited</p>
            <p className="text-sm sm:text-lg font-mono text-green-400">+{formatCurrency(convertFromKES(totalDeposited, userCurrency), userCurrency)}</p>
          </div>
        </div>

        <div className="flex gap-2 sm:gap-3 justify-center">
          <button
            className="px-3 sm:px-6 py-2 sm:py-3 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 rounded-lg flex items-center justify-center gap-1.5 sm:gap-2 transition-colors font-mono text-xs sm:text-base"
            onClick={() => setShowDepositModal(true)}
            data-testid="button-deposit"
          >
            <ArrowDownToLine size={16} />
            Deposit
          </button>
          <button
            className="px-3 sm:px-6 py-2 sm:py-3 bg-black/20 hover:bg-gray-800/50 text-gray-300 border border-gray-700 rounded-lg flex items-center justify-center gap-1.5 sm:gap-2 transition-colors font-mono text-xs sm:text-base"
            onClick={() => setShowWithdrawModal(true)}
            data-testid="button-withdraw"
          >
            <ArrowUpFromLine size={16} />
            Withdraw
          </button>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="p-3 sm:p-6 rounded-xl border border-primary/20 bg-black/30 backdrop-blur-sm"
      >
        <h2 className="text-base sm:text-xl font-bold mb-3 sm:mb-4 flex items-center">
          <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-primary" /> Quick Deposit
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          {[50, 100, 500, 1000].map((kesAmount) => {
            const displayAmount = convertFromKES(kesAmount, userCurrency);
            return (
              <button
                key={kesAmount}
                className="px-3 sm:px-4 py-2.5 sm:py-3 bg-black/20 hover:bg-primary/10 border border-primary/20 hover:border-primary/30 rounded-lg font-mono text-sm sm:text-lg text-gray-300 hover:text-primary transition-colors"
                onClick={() => {
                  setDepositForm({ ...depositForm, amount: displayAmount.toString() });
                  setShowDepositModal(true);
                }}
                data-testid={`button-quick-deposit-${kesAmount}`}
              >
                {formatCurrency(displayAmount, userCurrency)}
              </button>
            );
          })}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="p-3 sm:p-6 rounded-xl border border-primary/20 bg-black/30 backdrop-blur-sm"
      >
        <h2 className="text-base sm:text-xl font-bold mb-3 sm:mb-4 flex items-center">
          <Clock className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-primary" /> Transaction History
        </h2>
        
        {transactions.length === 0 ? (
          <div className="text-center py-8">
            <WalletIcon size={48} className="mx-auto text-gray-500 mb-4" />
            <p className="text-gray-500 font-mono">No transactions yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.map((transaction, index) => (
              <motion.div
                key={transaction.id}
                className="flex items-center justify-between gap-3 p-3 sm:p-4 rounded-lg border border-gray-800 bg-black/20"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + index * 0.05 }}
              >
                <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
                  <div className={`w-9 h-9 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0 ${
                    transaction.channel === 'server_purchase'
                      ? 'bg-red-500/10 border border-red-500/20'
                      : transaction.method === 'Card'
                      ? 'bg-blue-500/10 border border-blue-500/20'
                      : transaction.direction === 'debit'
                        ? 'bg-red-500/10 border border-red-500/20'
                        : 'bg-primary/10 border border-primary/20'
                  }`}>
                    {transaction.channel === 'server_purchase' ? (
                      <Server size={18} className="text-red-400" />
                    ) : transaction.method === 'Card' ? (
                      <CreditCard size={18} className="text-blue-400" />
                    ) : transaction.direction === 'debit' ? (
                      <ArrowUpFromLine size={18} className="text-red-400" />
                    ) : (
                      <ArrowDownToLine size={18} className="text-primary" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-mono text-xs sm:text-sm truncate">
                      {transaction.channel === 'server_purchase' ? 'Server Purchase' : transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
                    </p>
                    <p className="text-[10px] sm:text-sm text-gray-500 font-mono truncate">
                      {transaction.channel === 'server_purchase'
                        ? transaction.description
                        : transaction.method === 'Card' && transaction.last4
                        ? `Card ****${transaction.last4}`
                        : transaction.method || transaction.description || 'Transaction'}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <p className={`font-mono text-xs sm:text-lg ${
                    transaction.direction === 'debit' ? 'text-red-400' : 'text-primary'
                  }`}>
                    {transaction.direction === 'debit' ? '-' : '+'}{formatCurrency(convertFromKES(Math.abs(transaction.amount), userCurrency), userCurrency)}
                  </p>
                  <p className="text-[10px] sm:text-xs text-gray-500 font-mono">{transaction.date ? new Date(transaction.date).toLocaleDateString('en-KE', { year: 'numeric', month: 'short', day: 'numeric' }) : '-'}</p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      <AnimatePresence>
        {showDepositModal && (
          <ModalContent
            title="Deposit Funds"
            form={depositForm}
            setForm={setDepositForm}
            onSubmit={handleDeposit}
            type="deposit"
            onClose={() => { setShowDepositModal(false); setStkStatus({ show: false, status: '', message: '' }); setCardWaiting(false); setCardRef(''); }}
            processing={processing}
            stkStatus={stkStatus}
            user={user}
            walletBalance={walletBalance}
            cardWaiting={cardWaiting}
            onVerifyCard={verifyCardDeposit}
            userCurrency={userCurrency}
            countryConfig={countryConfig}
            paymentMethods={paymentMethods}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showWithdrawModal && (
          <ModalContent
            title="Withdraw Funds"
            form={withdrawForm}
            setForm={setWithdrawForm}
            onSubmit={handleWithdraw}
            type="withdraw"
            onClose={() => { setShowWithdrawModal(false); setStkStatus({ show: false, status: '', message: '' }); }}
            processing={processing}
            stkStatus={stkStatus}
            user={user}
            walletBalance={walletBalance}
            userCurrency={userCurrency}
            countryConfig={countryConfig}
            paymentMethods={paymentMethods}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Wallet;
