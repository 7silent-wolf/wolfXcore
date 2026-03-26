import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Smartphone, Wallet, Phone, AlertCircle, CheckCircle, CreditCard, Mail } from 'lucide-react';
import { paystackAPI, validatePhoneNumber, formatPhoneNumber } from '../services/paystack';
import { walletAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { getCountryByCode, formatCurrency, convertFromKES } from '../lib/currencyConfig';
import LoadingSpinner from './LoadingSpinner';

const PaymentModal = ({ isOpen, onClose, invoice, onPaymentSuccess }) => {
  const { user, updateUser } = useAuth();
  const countryConfig = getCountryByCode(user?.countryCode || 'KE');
  const userCurrency = countryConfig.currency;
  const fmt = (amount) => formatCurrency(convertFromKES(amount, userCurrency), userCurrency);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState(user?.email || '');
  const [loading, setLoading] = useState(false);
  const [customAmount, setCustomAmount] = useState(invoice?.amount || 100);
  const [step, setStep] = useState('form');
  const [error, setError] = useState('');
  const [mpesaStatus, setMpesaStatus] = useState('');
  const [paymentRef, setPaymentRef] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('mpesa');
  const [displayText, setDisplayText] = useState('');
  const [accountRef, setAccountRef] = useState('');

  const MIN_AMOUNT = 50;

  const handleMpesaPayment = async () => {
    setError('');

    if (!phoneNumber || phoneNumber.trim().length < 10) {
      setError('Please enter a valid phone number (e.g., 254712345678)');
      return;
    }

    if (!validatePhoneNumber(phoneNumber)) {
      setError('Invalid phone number. Use format: 254712345678');
      return;
    }

    const amount = invoice ? invoice.amount : customAmount;

    if (amount < MIN_AMOUNT) {
      setError(`Minimum deposit is ${fmt(MIN_AMOUNT)}`);
      return;
    }

    setLoading(true);
    setMpesaStatus('Sending STK Push to your phone...');
    setStep('pending');

    try {
      const formattedPhone = formatPhoneNumber(phoneNumber);
      const metadata = {
        invoice_id: invoice?.id || 'wallet_topup',
        phone_number: formattedPhone,
        type: invoice ? 'invoice_payment' : 'wallet_topup',
      };

      const response = await paystackAPI.initializeMpesaPayment(formattedPhone, amount, metadata);

      if (!response.success) {
        throw new Error(response.message || 'Failed to initiate M-Pesa payment');
      }

      setPaymentRef(response.reference || response.data?.reference);
      setDisplayText(response.data?.display_text || '');
      setAccountRef(response.data?.account_reference || '');

      if (response.data?.status === 'pay_offline') {
        setMpesaStatus('Payment initiated! Check your phone for the STK push, or use the manual payment option below.');
      } else {
        setMpesaStatus('STK Push sent! Enter your M-Pesa PIN on your phone.');
      }
      pollForPayment(response.reference || response.data?.reference, amount);
    } catch (err) {
      console.error('M-Pesa payment error:', err);
      setError(err.message || 'Failed to initiate payment. Please try again.');
      setLoading(false);
      setStep('form');
    }
  };

  const handleCardPayment = async () => {
    setError('');

    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    const amount = invoice ? invoice.amount : customAmount;

    if (amount < MIN_AMOUNT) {
      setError(`Minimum deposit is ${fmt(MIN_AMOUNT)}`);
      return;
    }

    setLoading(true);
    setStep('pending');
    setMpesaStatus('Initializing card payment...');

    try {
      const callbackUrl = `${window.location.origin}/wallet?payment=card`;
      const metadata = {
        invoice_id: invoice?.id || 'wallet_topup',
        type: invoice ? 'invoice_payment' : 'wallet_topup',
      };

      const response = await paystackAPI.initializeCardPayment(email, amount, callbackUrl, metadata);

      if (!response.success) {
        throw new Error(response.message || 'Failed to initialize card payment');
      }

      setPaymentRef(response.reference);

      if (response.authorizationUrl) {
        setMpesaStatus('Redirecting to secure checkout...');
        window.open(response.authorizationUrl, '_blank');
        setStep('card_waiting');
        setLoading(false);
      }
    } catch (err) {
      console.error('Card payment error:', err);
      setError(err.message || 'Failed to initiate card payment. Please try again.');
      setLoading(false);
      setStep('form');
    }
  };

  const verifyCardPayment = async () => {
    if (!paymentRef) return;

    setLoading(true);
    setMpesaStatus('Verifying card payment...');

    try {
      const result = await paystackAPI.verifyCardPayment(paymentRef, user?.id);

      if (result.success) {
        const paidAmount = result.data.amount / 100;
        setStep('success');
        setLoading(false);

        try {
          await walletAPI.recordMpesaPayment(paidAmount, email, paymentRef, 'Card deposit via Paystack');
        } catch (walletErr) {
          console.error('Wallet update error:', walletErr);
        }

        if (onPaymentSuccess) {
          onPaymentSuccess({ ...result.data, reference: paymentRef, amount: paidAmount });
        }
      } else {
        setError('Payment not yet completed. Please complete payment in the checkout window, then click "Verify Payment" again.');
        setLoading(false);
      }
    } catch (err) {
      console.error('Card verification error:', err);
      setError('Could not verify payment. Please try again.');
      setLoading(false);
    }
  };

  const pollForPayment = async (reference, amount) => {
    let attempts = 0;
    const maxAttempts = 60;

    const poll = async () => {
      if (attempts >= maxAttempts) {
        setError('Payment timed out. If you entered your PIN, the payment may still process. Check your M-Pesa messages.');
        setLoading(false);
        setStep('form');
        return;
      }

      attempts++;

      try {
        const result = await paystackAPI.verifyPayment(reference, user?.id);

        if (result.success && result.data?.status === 'success') {
          setStep('success');
          setLoading(false);

          const paidAmount = result.data.amount / 100;

          try {
            await walletAPI.recordMpesaPayment(paidAmount, phoneNumber, reference);
          } catch (walletErr) {
            console.error('Wallet update error:', walletErr);
          }

          if (onPaymentSuccess) {
            onPaymentSuccess({ ...result.data, reference, amount: paidAmount });
          }
        } else if (result.data?.status === 'failed') {
          setError('Payment was declined or cancelled. Please try again.');
          setLoading(false);
          setStep('form');
        } else {
          setMpesaStatus(`Waiting for M-Pesa confirmation... (${attempts}s)`);
          setTimeout(poll, 1000);
        }
      } catch (err) {
        console.error('Polling error:', err);
        setTimeout(poll, 2000);
      }
    };

    setTimeout(poll, 3000);
  };

  const handleClose = () => {
    if (!loading) {
      setStep('form');
      setError('');
      setMpesaStatus('');
      setPaymentRef('');
      setPhoneNumber('');
      setEmail(user?.email || '');
      setPaymentMethod('mpesa');
      setCustomAmount(invoice?.amount || 100);
      setDisplayText('');
      setAccountRef('');
      onClose();
    }
  };

  const quickAmounts = [50, 100, 500, 1000, 2000, 5000];

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-gray-900 rounded-2xl border border-primary/30 p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Wallet className="w-5 h-5 text-primary" />
              {invoice ? `Pay Invoice ${invoice.id}` : 'Deposit Funds'}
            </h2>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-primary/10 rounded-lg transition-colors text-gray-400 hover:text-white"
              disabled={loading}
              data-testid="button-close-modal"
            >
              <X size={20} />
            </button>
          </div>

          {step === 'form' && (
            <>
              {!invoice && (
                <div className="mb-6">
                  <label className="block text-sm font-mono text-gray-400 mb-3">
                    Amount (KES) - Minimum {MIN_AMOUNT}
                  </label>
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {quickAmounts.map((amt) => (
                      <button
                        key={amt}
                        onClick={() => setCustomAmount(amt)}
                        data-testid={`button-amount-${amt}`}
                        className={`p-3 rounded-lg border font-mono transition-all ${
                          customAmount === amt
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-gray-700 hover:border-primary/50 hover:bg-primary/5'
                        }`}
                      >
                        {fmt(amt)}
                      </button>
                    ))}
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-3 text-gray-500 font-mono">{countryConfig.currencySymbol}</span>
                    <input
                      type="number"
                      min={MIN_AMOUNT}
                      step="1"
                      value={customAmount}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value);
                        if (!isNaN(value)) {
                          setCustomAmount(value);
                        }
                      }}
                      className="w-full pl-12 p-3 bg-black/50 border border-gray-700 rounded-lg font-mono focus:border-primary focus:outline-none"
                      placeholder="Enter amount"
                      data-testid="input-amount"
                    />
                  </div>
                  {customAmount < MIN_AMOUNT && customAmount > 0 && (
                    <p className="text-xs text-red-400 mt-2 font-mono">
                      Minimum deposit is {fmt(MIN_AMOUNT)}
                    </p>
                  )}
                </div>
              )}

              <div className="mb-6">
                <label className="block text-sm font-mono text-gray-400 mb-3">
                  Payment Method
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('mpesa')}
                    data-testid="button-method-mpesa"
                    className={`p-3 rounded-lg border font-mono text-sm flex items-center gap-2 transition-all ${
                      paymentMethod === 'mpesa'
                        ? 'border-green-500 bg-green-500/10 text-green-400'
                        : 'border-gray-700 hover:border-green-500/50 text-gray-400'
                    }`}
                  >
                    <Smartphone size={18} />
                    M-Pesa
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('card')}
                    data-testid="button-method-card"
                    className={`p-3 rounded-lg border font-mono text-sm flex items-center gap-2 transition-all ${
                      paymentMethod === 'card'
                        ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                        : 'border-gray-700 hover:border-blue-500/50 text-gray-400'
                    }`}
                  >
                    <CreditCard size={18} />
                    Card
                  </button>
                </div>
              </div>

              {paymentMethod === 'mpesa' && (
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3 p-3 rounded-lg border border-green-500/30 bg-green-500/10">
                    <Smartphone size={20} className="text-green-400" />
                    <span className="text-sm font-mono text-green-400">M-Pesa STK Push Payment</span>
                  </div>

                  <label className="block text-sm font-mono text-gray-400 mb-2">
                    M-Pesa Phone Number
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                      <Phone size={20} className="text-green-400" />
                    </div>
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="flex-1 p-3 bg-black/50 border border-gray-700 rounded-lg font-mono focus:border-green-500 focus:outline-none"
                      placeholder="254712345678"
                      data-testid="input-phone"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-2 font-mono">
                    Enter number in 254 format (e.g. 254712345678). You'll receive an STK push.
                  </p>
                </div>
              )}

              {paymentMethod === 'card' && (
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3 p-3 rounded-lg border border-blue-500/30 bg-blue-500/10">
                    <CreditCard size={20} className="text-blue-400" />
                    <span className="text-sm font-mono text-blue-400">Secure Card Payment</span>
                  </div>

                  <label className="block text-sm font-mono text-gray-400 mb-2">
                    Email Address
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                      <Mail size={20} className="text-blue-400" />
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="flex-1 p-3 bg-black/50 border border-gray-700 rounded-lg font-mono focus:border-blue-500 focus:outline-none"
                      placeholder="you@email.com"
                      data-testid="input-email"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-2 font-mono">
                    You'll be redirected to a secure Paystack checkout page to enter your card details.
                  </p>
                </div>
              )}

              {error && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <div className="flex items-center gap-2 text-red-400">
                    <AlertCircle size={16} />
                    <span className="text-sm">{error}</span>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleClose}
                  disabled={loading}
                  className="flex-1 p-3 border border-gray-700 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  data-testid="button-cancel"
                >
                  Cancel
                </button>
                <button
                  onClick={paymentMethod === 'mpesa' ? handleMpesaPayment : handleCardPayment}
                  disabled={loading || (paymentMethod === 'mpesa' && !phoneNumber) || (paymentMethod === 'card' && !email) || (customAmount < MIN_AMOUNT && !invoice)}
                  className={`flex-1 p-3 rounded-lg transition-colors flex items-center justify-center gap-2 text-white disabled:opacity-50 disabled:cursor-not-allowed ${
                    paymentMethod === 'mpesa'
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                  data-testid="button-pay"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      {paymentMethod === 'mpesa' ? <Smartphone size={18} /> : <CreditCard size={18} />}
                      Pay {fmt(invoice?.amount || customAmount)}
                    </>
                  )}
                </button>
              </div>

              <div className={`mt-4 p-3 border rounded-lg ${
                paymentMethod === 'mpesa'
                  ? 'bg-green-500/5 border-green-500/10'
                  : 'bg-blue-500/5 border-blue-500/10'
              }`}>
                <p className={`text-xs text-center font-mono ${
                  paymentMethod === 'mpesa' ? 'text-green-400' : 'text-blue-400'
                }`}>
                  {paymentMethod === 'mpesa'
                    ? "You'll receive an STK push on your phone. Enter your M-Pesa PIN to complete payment."
                    : "You'll be redirected to Paystack's secure checkout to enter your card details."
                  }
                </p>
              </div>
            </>
          )}

          {step === 'pending' && (
            <div className="py-8 text-center">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                paymentMethod === 'mpesa' ? 'bg-green-500/10' : 'bg-blue-500/10'
              }`}>
                {paymentMethod === 'mpesa'
                  ? <Smartphone size={32} className="text-green-400" />
                  : <CreditCard size={32} className="text-blue-400" />
                }
              </div>
              <h3 className="text-xl font-bold mb-2">
                {paymentMethod === 'mpesa' ? 'M-Pesa Payment Initiated' : 'Card Payment Processing'}
              </h3>
              <div className="bg-black/50 rounded-lg p-4 mb-4">
                <p className="text-gray-300 mb-2 font-mono text-sm">{mpesaStatus}</p>
                <p className="text-sm text-gray-400">
                  Amount: <span className={`font-bold text-lg ${paymentMethod === 'mpesa' ? 'text-green-400' : 'text-blue-400'}`}>
                    {fmt(invoice?.amount || customAmount)}
                  </span>
                </p>
                {paymentMethod === 'mpesa' && (
                  <p className="text-sm text-gray-400 mt-1">
                    Phone: <span className="font-mono">{phoneNumber}</span>
                  </p>
                )}
                {paymentRef && (
                  <p className="text-xs text-gray-500 mt-2">
                    Ref: <span className="font-mono">{paymentRef}</span>
                  </p>
                )}
              </div>

              {paymentMethod === 'mpesa' && accountRef && (
                <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-4 mb-4 text-left">
                  <p className="text-sm font-bold text-yellow-400 mb-2">Didn't receive STK push?</p>
                  <ul className="text-xs text-gray-300 space-y-1 font-mono list-disc list-inside">
                    <li>Make sure your phone has network signal</li>
                    <li>Check that M-Pesa is active on your line</li>
                    <li>Try dismissing any pending M-Pesa prompts</li>
                    <li>Cancel and try again in a few seconds</li>
                    <li>Or switch to <span className="text-blue-400">Card payment</span> instead</li>
                  </ul>
                  {displayText && (
                    <p className="text-xs text-gray-400 mt-3 italic">{displayText}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-2">
                    Account Ref: <span className="font-mono select-all">{accountRef}</span>
                  </p>
                </div>
              )}

              <div className="space-y-3">
                <div className="flex items-center justify-center gap-2">
                  <div className={`w-3 h-3 rounded-full animate-pulse ${paymentMethod === 'mpesa' ? 'bg-green-500' : 'bg-blue-500'}`}></div>
                  <div className={`w-3 h-3 rounded-full animate-pulse ${paymentMethod === 'mpesa' ? 'bg-green-500' : 'bg-blue-500'}`} style={{ animationDelay: '150ms' }}></div>
                  <div className={`w-3 h-3 rounded-full animate-pulse ${paymentMethod === 'mpesa' ? 'bg-green-500' : 'bg-blue-500'}`} style={{ animationDelay: '300ms' }}></div>
                </div>
                <p className="text-sm text-gray-500 font-mono">
                  Waiting for payment confirmation...
                </p>
                <button
                  onClick={() => {
                    setStep('form');
                    setLoading(false);
                    setMpesaStatus('');
                  }}
                  className="text-sm text-gray-400 hover:text-white mt-4 font-mono"
                  data-testid="button-cancel-pending"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {step === 'card_waiting' && (
            <div className="py-8 text-center">
              <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <CreditCard size={32} className="text-blue-400" />
              </div>
              <h3 className="text-xl font-bold mb-2">Complete Card Payment</h3>
              <p className="text-gray-400 mb-4 font-mono text-sm">
                A secure checkout window has been opened. Complete your card payment there.
              </p>
              <div className="bg-black/50 rounded-lg p-4 mb-6">
                <p className="text-sm text-gray-400">
                  Amount: <span className="font-bold text-blue-400 text-lg">
                    {fmt(invoice?.amount || customAmount)}
                  </span>
                </p>
                {paymentRef && (
                  <p className="text-xs text-gray-500 mt-2">
                    Ref: <span className="font-mono">{paymentRef}</span>
                  </p>
                )}
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <div className="flex items-center gap-2 text-red-400">
                    <AlertCircle size={16} />
                    <span className="text-sm">{error}</span>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <button
                  onClick={verifyCardPayment}
                  disabled={loading}
                  className="w-full p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-mono text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                  data-testid="button-verify-card"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Verifying...
                    </>
                  ) : (
                    <>
                      <CheckCircle size={18} />
                      I've Completed Payment - Verify
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setStep('form');
                    setError('');
                    setPaymentRef('');
                  }}
                  className="text-sm text-gray-400 hover:text-white font-mono"
                  data-testid="button-cancel-card-waiting"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {step === 'success' && (
            <div className="py-8 text-center">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                paymentMethod === 'mpesa' ? 'bg-green-500/10' : 'bg-blue-500/10'
              }`}>
                <CheckCircle size={32} className={paymentMethod === 'mpesa' ? 'text-green-400' : 'text-blue-400'} />
              </div>
              <h3 className="text-xl font-bold mb-2">Payment Successful!</h3>
              <p className="text-gray-400 mb-6 font-mono text-sm">
                Your {paymentMethod === 'mpesa' ? 'M-Pesa' : 'card'} payment has been confirmed and wallet updated.
              </p>
              <div className="bg-black/50 rounded-lg p-4 mb-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-400">Amount:</span>
                  <span className={`font-bold text-lg ${paymentMethod === 'mpesa' ? 'text-green-400' : 'text-blue-400'}`}>
                    {fmt(invoice?.amount || customAmount)}
                  </span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-400">Method:</span>
                  <span className="font-mono text-sm">{paymentMethod === 'mpesa' ? 'M-Pesa' : 'Card'}</span>
                </div>
                {paymentMethod === 'mpesa' && (
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-400">Phone:</span>
                    <span className="font-mono text-sm">{phoneNumber}</span>
                  </div>
                )}
                {paymentRef && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Ref:</span>
                    <span className="font-mono text-xs text-primary">{paymentRef}</span>
                  </div>
                )}
              </div>
              <button
                onClick={handleClose}
                className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/80 transition-colors w-full"
                data-testid="button-continue"
              >
                Continue
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default PaymentModal;
