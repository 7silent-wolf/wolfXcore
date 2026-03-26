import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertCircle, RefreshCw, ExternalLink, Download } from 'lucide-react';
import { paystackAPI } from '../services/paystack';
import { walletAPI } from '../services/api';
import LoadingSpinner from './LoadingSpinner';

const VerifyPayment = ({ isOpen, reference, onClose, onSuccess }) => {
  const [status, setStatus] = useState('verifying');
  const [paymentData, setPaymentData] = useState(null);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (reference && isOpen) {
      verifyPayment();
    }
  }, [reference, isOpen]);

  const verifyPayment = async () => {
    try {
      const result = await paystackAPI.verifyCardPayment(reference);
      
      if (result.success && result.data?.status === 'success') {
        setStatus('success');
        setPaymentData(result.data);
        
        const amount = result.data.amount / 100;
        try {
          await walletAPI.updateBalance(amount, result.data.reference);
        } catch (walletError) {
          console.error('Wallet update error:', walletError);
        }
        
        if (onSuccess) {
          onSuccess(result.data);
        }
      } else {
        setStatus('failed');
        setError(result.message || 'Payment verification failed');
      }
    } catch (err) {
      console.error('Verification error:', err);
      setStatus('failed');
      setError(err.message || 'Network error. Please check your connection.');
    }
  };

  const handleRetry = () => {
    if (retryCount < 3) {
      setStatus('verifying');
      setError(null);
      setRetryCount(prev => prev + 1);
      setTimeout(() => verifyPayment(), 1000); // Retry after 1 second
    }
  };

  const handleClose = () => {
    setStatus('verifying');
    setPaymentData(null);
    setError(null);
    setRetryCount(0);
    onClose();
  };

  const downloadReceipt = () => {
    if (!paymentData) return;
    
    const receiptData = {
      transactionId: paymentData.reference,
      amount: `${paymentData.currency || 'KES'} ${(paymentData.amount / 100).toFixed(2)}`,
      date: new Date(paymentData.paid_at).toLocaleString(),
      status: 'Successful',
      channel: paymentData.channel,
      email: paymentData.customer?.email || 'N/A',
      authorizationCode: paymentData.authorization?.authorization_code || 'N/A',
    };
    
    const receiptText = `
      PAYMENT RECEIPT
      ========================
      Transaction ID: ${receiptData.transactionId}
      Amount: ${receiptData.amount}
      Date: ${receiptData.date}
      Status: ${receiptData.status}
      Payment Method: ${receiptData.channel}
      Customer Email: ${receiptData.email}
      Authorization: ${receiptData.authorizationCode}
      
      Thank you for your payment!
    `;
    
    const blob = new Blob([receiptText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receipt-${paymentData.reference}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

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
          className="bg-gray-900 rounded-2xl border border-primary/30 p-6 w-full max-w-md"
          onClick={(e) => e.stopPropagation()}
        >
          {status === 'verifying' && (
            <div className="py-8 text-center">
              <LoadingSpinner size="lg" text="Verifying payment..." />
              <div className="mt-6 space-y-3">
                <p className="text-gray-400 text-sm font-mono">
                  Transaction Reference: 
                  <span className="block text-primary font-bold mt-1">{reference}</span>
                </p>
                <p className="text-xs text-gray-500">
                  Please wait while we confirm your payment...
                </p>
                <div className="flex justify-center gap-2 mt-4">
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse delay-150"></div>
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse delay-300"></div>
                </div>
              </div>
            </div>
          )}

          {status === 'success' && paymentData && (
            <div className="py-6 text-center">
              <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={32} className="text-green-400" />
              </div>
              <h3 className="text-xl font-bold mb-2">Payment Successful!</h3>
              <p className="text-gray-400 mb-6">
                Your payment has been processed successfully.
              </p>
              
              <div className="bg-black/50 rounded-lg p-4 mb-6 text-left space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Amount:</span>
                  <span className="font-bold text-primary text-lg">
                    {paymentData.currency || 'KES'} {(paymentData.amount / 100).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Reference:</span>
                  <span className="font-mono text-sm bg-primary/10 px-2 py-1 rounded">
                    {paymentData.reference}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Method:</span>
                  <span className="font-mono text-sm capitalize">
                    {paymentData.channel || 'Card'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Date:</span>
                  <span className="font-mono text-sm">
                    {new Date(paymentData.paid_at).toLocaleDateString()}
                  </span>
                </div>
                {paymentData.customer?.email && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Email:</span>
                    <span className="font-mono text-sm">
                      {paymentData.customer.email}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={downloadReceipt}
                  className="px-4 py-3 bg-primary/10 border border-primary/30 text-primary rounded-lg hover:bg-primary/20 transition-colors flex items-center justify-center gap-2"
                >
                  <Download size={16} />
                  Download Receipt
                </button>
                <button
                  onClick={handleClose}
                  className="px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary/80 transition-colors flex items-center justify-center gap-2"
                >
                  <CheckCircle size={16} />
                  Continue to Dashboard
                </button>
                <button
                  onClick={() => window.open('https://paystack.com/docs/payments/verify', '_blank')}
                  className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors flex items-center justify-center gap-1"
                >
                  View transaction details
                  <ExternalLink size={14} />
                </button>
              </div>
            </div>
          )}

          {status === 'failed' && (
            <div className="py-8 text-center">
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle size={32} className="text-red-400" />
              </div>
              <h3 className="text-xl font-bold mb-2">Payment Verification Failed</h3>
              <p className="text-gray-400 mb-4">
                {error || 'Unable to verify your payment at this time.'}
              </p>
              
              <div className="bg-black/50 rounded-lg p-4 mb-6 text-left">
                <p className="text-gray-400 text-sm mb-2">Reference:</p>
                <p className="font-mono text-sm text-primary">{reference}</p>
                {retryCount > 0 && (
                  <p className="text-xs text-yellow-400 mt-2">
                    Attempt {retryCount} of 3
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-3">
                {retryCount < 3 ? (
                  <button
                    onClick={handleRetry}
                    className="px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary/80 transition-colors flex items-center justify-center gap-2"
                  >
                    <RefreshCw size={16} />
                    Retry Verification
                  </button>
                ) : (
                  <p className="text-red-400 text-sm mb-2">
                    Maximum retry attempts reached
                  </p>
                )}
                
                <button
                  onClick={handleClose}
                  className="px-4 py-3 border border-gray-700 text-gray-300 rounded-lg hover:bg-gray-800 transition-colors"
                >
                  Close
                </button>
                
                <div className="mt-4 text-xs text-gray-500 space-y-1">
                  <p>Need help?</p>
                  <button
                    onClick={() => window.open('mailto:support@yourdomain.com?subject=Payment Verification Failed', '_blank')}
                    className="text-primary hover:underline"
                  >
                    Contact Support
                  </button>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default VerifyPayment;