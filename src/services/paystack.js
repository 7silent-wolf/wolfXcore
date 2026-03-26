console.log('Paystack MPESA Service Loaded');

const COUNTRY_PHONE_CONFIG = {
  KE: { prefix: '254', length: 12, strip: ['+254', '0'] },
  GH: { prefix: '233', length: 12, strip: ['+233', '0'] },
  CI: { prefix: '225', length: 12, strip: ['+225', '0'] },
  NG: { prefix: '234', length: 13, strip: ['+234', '0'] },
  ZA: { prefix: '27', length: 11, strip: ['+27', '0'] },
  UG: { prefix: '256', length: 12, strip: ['+256', '0'] },
  TZ: { prefix: '255', length: 12, strip: ['+255', '0'] },
  ZW: { prefix: '263', length: 12, strip: ['+263', '0'] },
  IN: { prefix: '91', length: 12, strip: ['+91', '0'] },
  RW: { prefix: '250', length: 12, strip: ['+250', '0'] },
  ET: { prefix: '251', length: 12, strip: ['+251', '0'] },
};

export const paystackAPI = {
  initializeMpesaPayment: async (phone, amount, metadata = {}) => {
    try {
      let userEmail = '';
      try {
        const storedUser = localStorage.getItem('current_user');
        if (storedUser) {
          const u = JSON.parse(storedUser);
          userEmail = u.email || '';
        }
      } catch (e) {}

      console.log('Initiating MPESA Payment:', { phone, amount, userEmail });

      const token = localStorage.getItem('jwt_token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch('/api/mpesa/charge', {
        method: 'POST',
        headers,
        body: JSON.stringify({ phone, amount, metadata, userEmail }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to initiate M-Pesa payment');
      }

      return {
        success: true,
        data: data.data,
        message: data.message,
        reference: data.reference,
      };
    } catch (error) {
      console.error('MPESA Payment Error:', error);
      return {
        success: false,
        message: error.message || 'Failed to initiate M-Pesa payment. Please try again.',
        error: error.message,
      };
    }
  },

  initializeMobileMoneyPayment: async (phone, amount, countryCode, provider, metadata = {}) => {
    try {
      let userEmail = '';
      try {
        const storedUser = localStorage.getItem('current_user');
        if (storedUser) {
          const u = JSON.parse(storedUser);
          userEmail = u.email || '';
        }
      } catch (e) {}

      console.log('Initiating Mobile Money Payment:', { phone, amount, countryCode, provider, userEmail });

      const token = localStorage.getItem('jwt_token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch('/api/mobile-money/charge', {
        method: 'POST',
        headers,
        body: JSON.stringify({ phone, amount, countryCode, provider, metadata, userEmail }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to initiate mobile money payment');
      }

      return {
        success: true,
        data: data.data,
        message: data.message,
        reference: data.reference,
      };
    } catch (error) {
      console.error('Mobile Money Payment Error:', error);
      return {
        success: false,
        message: error.message || 'Failed to initiate mobile money payment. Please try again.',
        error: error.message,
      };
    }
  },

  verifyMobileMoneyPayment: async (reference, userId) => {
    try {
      const url = userId ? `/api/mobile-money/verify/${encodeURIComponent(reference)}?userId=${userId}` : `/api/mobile-money/verify/${encodeURIComponent(reference)}`;
      const token = localStorage.getItem('jwt_token');
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const response = await fetch(url, { headers });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Verification failed');
      }

      return {
        success: data.success,
        data: data.data,
        message: data.message,
      };
    } catch (error) {
      console.error('Mobile Money Verification Error:', error);
      return {
        success: false,
        message: error.message,
      };
    }
  },

  verifyPayment: async (reference, userId) => {
    try {
      const url = userId ? `/api/mpesa/verify/${encodeURIComponent(reference)}?userId=${userId}` : `/api/mpesa/verify/${encodeURIComponent(reference)}`;
      const token = localStorage.getItem('jwt_token');
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const response = await fetch(url, { headers });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Verification failed');
      }

      return {
        success: data.success,
        data: data.data,
        message: data.message,
      };
    } catch (error) {
      console.error('Verification Error:', error);
      return {
        success: false,
        message: error.message,
      };
    }
  },

  initializeCardPayment: async (email, amount, callbackUrl, metadata = {}) => {
    try {
      console.log('Initiating Card Payment:', { email, amount });

      const token = localStorage.getItem('jwt_token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch('/api/card/initialize', {
        method: 'POST',
        headers,
        body: JSON.stringify({ email, amount, callbackUrl, metadata }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to initialize card payment');
      }

      return {
        success: true,
        data: data.data,
        message: data.message,
        authorizationUrl: data.authorizationUrl,
        reference: data.reference,
        accessCode: data.accessCode,
      };
    } catch (error) {
      console.error('Card Payment Error:', error);
      return {
        success: false,
        message: error.message || 'Failed to initialize card payment. Please try again.',
        error: error.message,
      };
    }
  },

  verifyCardPayment: async (reference, userId) => {
    try {
      const url = userId ? `/api/card/verify/${encodeURIComponent(reference)}?userId=${userId}` : `/api/card/verify/${encodeURIComponent(reference)}`;
      const token = localStorage.getItem('jwt_token');
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const response = await fetch(url, { headers });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Verification failed');
      }

      return {
        success: data.success,
        data: data.data,
        message: data.message,
      };
    } catch (error) {
      console.error('Card Verification Error:', error);
      return {
        success: false,
        message: error.message,
      };
    }
  },

  initializeBankTransfer: async (email, amount, metadata = {}) => {
    try {
      console.log('Initiating Bank Transfer Payment:', { email, amount });

      const token = localStorage.getItem('jwt_token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch('/api/bank-transfer/charge', {
        method: 'POST',
        headers,
        body: JSON.stringify({ email, amount, metadata }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to initiate bank transfer');
      }

      return {
        success: true,
        data: data.data,
        message: data.message,
        reference: data.reference,
      };
    } catch (error) {
      console.error('Bank Transfer Payment Error:', error);
      return {
        success: false,
        message: error.message || 'Failed to initiate bank transfer. Please try again.',
        error: error.message,
      };
    }
  },

  verifyBankTransfer: async (reference, userId) => {
    try {
      const url = userId ? `/api/bank-transfer/verify/${encodeURIComponent(reference)}?userId=${userId}` : `/api/bank-transfer/verify/${encodeURIComponent(reference)}`;
      const token = localStorage.getItem('jwt_token');
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const response = await fetch(url, { headers });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Verification failed');
      }

      return {
        success: data.success,
        data: data.data,
        message: data.message,
      };
    } catch (error) {
      console.error('Bank Transfer Verification Error:', error);
      return {
        success: false,
        message: error.message,
      };
    }
  },

  initializeUSSDPayment: async (email, amount, bankCode, metadata = {}) => {
    try {
      console.log('Initiating USSD Payment:', { email, amount, bankCode });

      const token = localStorage.getItem('jwt_token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch('/api/ussd/charge', {
        method: 'POST',
        headers,
        body: JSON.stringify({ email, amount, bankCode, metadata }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to initiate USSD payment');
      }

      return {
        success: true,
        data: data.data,
        message: data.message,
        reference: data.reference,
      };
    } catch (error) {
      console.error('USSD Payment Error:', error);
      return {
        success: false,
        message: error.message || 'Failed to initiate USSD payment. Please try again.',
        error: error.message,
      };
    }
  },

  verifyUSSDPayment: async (reference, userId) => {
    try {
      const url = userId ? `/api/ussd/verify/${encodeURIComponent(reference)}?userId=${userId}` : `/api/ussd/verify/${encodeURIComponent(reference)}`;
      const token = localStorage.getItem('jwt_token');
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const response = await fetch(url, { headers });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Verification failed');
      }

      return {
        success: data.success,
        data: data.data,
        message: data.message,
      };
    } catch (error) {
      console.error('USSD Verification Error:', error);
      return {
        success: false,
        message: error.message,
      };
    }
  },

  submitOtp: async (otp, reference) => {
    try {
      const token = localStorage.getItem('jwt_token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch('/api/mpesa/submit-otp', {
        method: 'POST',
        headers,
        body: JSON.stringify({ otp, reference }),
      });

      const data = await response.json();

      return {
        success: data.success,
        data: data.data,
        message: data.message,
      };
    } catch (error) {
      console.error('OTP Submit Error:', error);
      return {
        success: false,
        message: error.message,
      };
    }
  },
};

export const formatPhoneNumber = (phone, countryCode = 'KE') => {
  let formatted = phone.toString().replace(/\D/g, '');
  const config = COUNTRY_PHONE_CONFIG[countryCode] || COUNTRY_PHONE_CONFIG.KE;

  if (formatted.startsWith('+')) {
    formatted = formatted.substring(1);
  }

  if (formatted.startsWith('0')) {
    formatted = config.prefix + formatted.substring(1);
  } else if (!formatted.startsWith(config.prefix)) {
    formatted = config.prefix + formatted;
  }

  return formatted;
};

export const validatePhoneNumber = (phone, countryCode = 'KE') => {
  const config = COUNTRY_PHONE_CONFIG[countryCode];
  if (!config) return true;
  const formatted = formatPhoneNumber(phone, countryCode);
  return formatted.length === config.length && formatted.startsWith(config.prefix);
};
